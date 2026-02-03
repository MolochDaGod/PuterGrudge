/**
 * API Client with Retry Logic and Error Handling
 * Prevents 503 spam on the frontend
 */

export interface APIClientConfig {
  baseURL: string;
  maxRetries: number;
  retryDelay: number;
  retryDelayMultiplier: number;
  maxRetryDelay: number;
  timeout: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  retries?: number;
  timeout?: number;
  priority?: number;
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }

  static isRetryable(status: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  static fromResponse(response: Response, body?: any): APIError {
    const status = response.status;
    const message = body?.message || response.statusText || 'Request failed';
    const code = body?.code;
    const details = body?.details;

    return new APIError(message, status, code, details);
  }
}

export class APIClient {
  private config: APIClientConfig;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: Partial<APIClientConfig> = {}) {
    this.config = {
      baseURL: config.baseURL || '/api',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      retryDelayMultiplier: config.retryDelayMultiplier || 2,
      maxRetryDelay: config.maxRetryDelay || 30000,
      timeout: config.timeout || 30000
    };
  }

  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      retries = this.config.maxRetries,
      timeout = this.config.timeout
    } = options;

    const url = `${this.config.baseURL}${endpoint}`;
    const requestId = `${method}-${endpoint}-${Date.now()}`;
    
    let lastError: APIError | null = null;
    let currentRetryDelay = this.config.retryDelay;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        this.abortControllers.set(requestId, controller);
        
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        this.abortControllers.delete(requestId);

        // Parse response
        let responseData: any;
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        // Handle successful response
        if (response.ok) {
          return responseData.data || responseData;
        }

        // Create error from response
        const error = APIError.fromResponse(response, responseData);

        // Check if error is retryable
        if (attempt < retries && APIError.isRetryable(response.status)) {
          lastError = error;
          
          console.warn(
            `[APIClient] Request failed (attempt ${attempt + 1}/${retries + 1}): ${error.message}. Retrying in ${currentRetryDelay}ms...`,
            { endpoint, status: response.status, attempt }
          );

          // Wait before retry with exponential backoff
          await this.delay(currentRetryDelay);
          currentRetryDelay = Math.min(
            currentRetryDelay * this.config.retryDelayMultiplier,
            this.config.maxRetryDelay
          );
          continue;
        }

        // Non-retryable error or out of retries
        throw error;
      } catch (error: any) {
        this.abortControllers.delete(requestId);

        // Handle network errors
        if (error.name === 'AbortError') {
          lastError = new APIError('Request timeout', 408);
        } else if (error instanceof APIError) {
          lastError = error;
        } else {
          lastError = new APIError(
            error.message || 'Network error',
            0,
            'NETWORK_ERROR'
          );
        }

        // Retry on network errors
        if (attempt < retries && (error.name === 'AbortError' || !(error instanceof APIError))) {
          console.warn(
            `[APIClient] Network error (attempt ${attempt + 1}/${retries + 1}): ${lastError.message}. Retrying in ${currentRetryDelay}ms...`,
            { endpoint, attempt }
          );

          await this.delay(currentRetryDelay);
          currentRetryDelay = Math.min(
            currentRetryDelay * this.config.retryDelayMultiplier,
            this.config.maxRetryDelay
          );
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new APIError('Request failed', 500);
  }

  async get<T = any>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T = any>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async delete<T = any>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async patch<T = any>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  cancelAllRequests(): void {
    for (const [id, controller] of this.abortControllers.entries()) {
      controller.abort();
      this.abortControllers.delete(id);
    }
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// AI-specific API calls with better error handling
export const aiAPI = {
  async sendMessage(sessionId: string, message: any) {
    return apiClient.post('/ai-worker/message', { ...message, sessionId }, {
      retries: 3,
      timeout: 45000 // Longer timeout for AI operations
    });
  },

  async getSession(sessionId: string) {
    return apiClient.get(`/ai-worker/session/${sessionId}`, {
      retries: 2
    });
  },

  async chat(sessionId: string, message: string) {
    return apiClient.post('/ai-worker/chat', { sessionId, message }, {
      retries: 3,
      timeout: 60000 // Even longer for chat
    });
  },

  async getHealth() {
    return apiClient.get('/health/status', {
      retries: 1,
      timeout: 5000
    });
  },

  async getServiceHealth(service: string) {
    return apiClient.get(`/health/service/${service}`, {
      retries: 1,
      timeout: 5000
    });
  }
};

// Export error class for consumer use
export { APIError };
