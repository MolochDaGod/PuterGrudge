import { QdrantClient } from "@qdrant/js-client-rest";
import { aiAPIManager } from './ai-api-manager';

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || "gpt-4-turbo-preview";

// Initialize Qdrant client
let qdrantClient: QdrantClient | null = null;

try {
  qdrantClient = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
  });
} catch (error) {
  console.warn("Qdrant client initialization failed. AI features may be limited.", error);
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    in: number;
    out: number;
  };
  timestamp: Date;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  confidence: number;
  reason: string;
  metric: string;
  value: number;
  expectedRange: { min: number; max: number };
}

export interface PredictionResult {
  metric: string;
  predictions: {
    timestamp: Date;
    value: number;
    confidence: number;
  }[];
  trend: "increasing" | "decreasing" | "stable";
}

export interface AIInsight {
  id: string;
  type: "warning" | "info" | "critical";
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  timestamp: Date;
}

/**
 * Analyze system metrics for anomalies
 */
export async function detectAnomalies(metrics: SystemMetrics[]): Promise<AnomalyDetectionResult[]> {
  const anomalies: AnomalyDetectionResult[] = [];
  
  if (metrics.length < 10) {
    return anomalies; // Need more data
  }
  
  // Calculate moving averages and standard deviations
  const recentMetrics = metrics.slice(-20);
  
  // CPU anomaly detection
  const cpuValues = recentMetrics.map(m => m.cpu);
  const cpuMean = cpuValues.reduce((a, b) => a + b) / cpuValues.length;
  const cpuStd = Math.sqrt(
    cpuValues.reduce((sum, val) => sum + Math.pow(val - cpuMean, 2), 0) / cpuValues.length
  );
  
  const latestCpu = metrics[metrics.length - 1].cpu;
  if (Math.abs(latestCpu - cpuMean) > 2 * cpuStd) {
    anomalies.push({
      isAnomaly: true,
      confidence: 0.85,
      reason: `CPU usage (${latestCpu.toFixed(1)}%) is ${latestCpu > cpuMean ? "significantly higher" : "significantly lower"} than normal`,
      metric: "cpu",
      value: latestCpu,
      expectedRange: { min: cpuMean - 2 * cpuStd, max: cpuMean + 2 * cpuStd },
    });
  }
  
  // Memory anomaly detection
  const memValues = recentMetrics.map(m => m.memory);
  const memMean = memValues.reduce((a, b) => a + b) / memValues.length;
  const memStd = Math.sqrt(
    memValues.reduce((sum, val) => sum + Math.pow(val - memMean, 2), 0) / memValues.length
  );
  
  const latestMemory = metrics[metrics.length - 1].memory;
  if (Math.abs(latestMemory - memMean) > 2 * memStd || latestMemory > 90) {
    anomalies.push({
      isAnomaly: true,
      confidence: latestMemory > 90 ? 0.95 : 0.8,
      reason: latestMemory > 90 
        ? `Memory usage critically high at ${latestMemory.toFixed(1)}%`
        : `Memory usage (${latestMemory.toFixed(1)}%) is unusually ${latestMemory > memMean ? "high" : "low"}`,
      metric: "memory",
      value: latestMemory,
      expectedRange: { min: memMean - 2 * memStd, max: memMean + 2 * memStd },
    });
  }
  
  return anomalies;
}

/**
 * Generate predictions for system metrics
 */
export async function predictMetrics(metrics: SystemMetrics[], horizon: number = 12): Promise<PredictionResult[]> {
  if (metrics.length < 20) {
    throw new Error("Insufficient data for prediction (need at least 20 data points)");
  }
  
  const predictions: PredictionResult[] = [];
  
  // Simple linear regression for CPU
  const cpuValues = metrics.map(m => m.cpu);
  const cpuTrend = calculateTrend(cpuValues);
  const cpuPredictions = generatePredictions(cpuValues, horizon);
  
  predictions.push({
    metric: "cpu",
    predictions: cpuPredictions,
    trend: cpuTrend,
  });
  
  // Memory predictions
  const memValues = metrics.map(m => m.memory);
  const memTrend = calculateTrend(memValues);
  const memPredictions = generatePredictions(memValues, horizon);
  
  predictions.push({
    metric: "memory",
    predictions: memPredictions,
    trend: memTrend,
  });
  
  return predictions;
}

/**
 * Generate AI insights from system state
 */
export async function generateInsights(
  metrics: SystemMetrics[],
  anomalies: AnomalyDetectionResult[]
): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];
  
  // Check for critical anomalies
  for (const anomaly of anomalies) {
    if (anomaly.confidence > 0.9) {
      insights.push({
        id: `anomaly-${Date.now()}-${anomaly.metric}`,
        type: "critical",
        title: `Critical ${anomaly.metric.toUpperCase()} Anomaly Detected`,
        description: anomaly.reason,
        recommendation: getRecommendation(anomaly),
        confidence: anomaly.confidence,
        timestamp: new Date(),
      });
    }
  }
  
  // Check for sustained high usage
  const recentMetrics = metrics.slice(-20);
  const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpu, 0) / recentMetrics.length;
  const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memory, 0) / recentMetrics.length;
  
  if (avgCpu > 80) {
    insights.push({
      id: `cpu-high-${Date.now()}`,
      type: "warning",
      title: "Sustained High CPU Usage",
      description: `Average CPU usage over last 20 samples: ${avgCpu.toFixed(1)}%`,
      recommendation: "Consider scaling up compute resources or optimizing running processes.",
      confidence: 0.85,
      timestamp: new Date(),
    });
  }
  
  if (avgMemory > 85) {
    insights.push({
      id: `memory-high-${Date.now()}`,
      type: "warning",
      title: "High Memory Pressure",
      description: `Average memory usage over last 20 samples: ${avgMemory.toFixed(1)}%`,
      recommendation: "Review memory-intensive processes or increase available RAM.",
      confidence: 0.9,
      timestamp: new Date(),
    });
  }
  
  // Positive insights
  if (avgCpu < 50 && avgMemory < 60) {
    insights.push({
      id: `healthy-${Date.now()}`,
      type: "info",
      title: "System Running Optimally",
      description: "Resource utilization is well within healthy ranges.",
      recommendation: "No action required. System is performing well.",
      confidence: 0.95,
      timestamp: new Date(),
    });
  }
  
  return insights;
}

/**
 * Natural language query processing
 */
export async function processNaturalLanguageQuery(query: string, context: any): Promise<string> {
  // In production, this would call OpenAI API
  // For now, return a template response
  
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes("cpu") || lowerQuery.includes("processor")) {
    const latestCpu = context.metrics?.[context.metrics.length - 1]?.cpu || 0;
    return `Current CPU usage is ${latestCpu.toFixed(1)}%. ${
      latestCpu > 80 ? "This is considered high. Consider investigating resource-intensive processes." :
      latestCpu > 50 ? "This is within normal range." :
      "This is low, indicating good performance headroom."
    }`;
  }
  
  if (lowerQuery.includes("memory") || lowerQuery.includes("ram")) {
    const latestMemory = context.metrics?.[context.metrics.length - 1]?.memory || 0;
    return `Current memory usage is ${latestMemory.toFixed(1)}%. ${
      latestMemory > 85 ? "Memory pressure is high. Consider freeing up memory or upgrading RAM." :
      latestMemory > 60 ? "Memory usage is moderate." :
      "Memory usage is healthy with plenty of headroom."
    }`;
  }
  
  if (lowerQuery.includes("anomal") || lowerQuery.includes("issue") || lowerQuery.includes("problem")) {
    const anomalyCount = context.anomalies?.length || 0;
    if (anomalyCount > 0) {
      return `I detected ${anomalyCount} anomal${anomalyCount === 1 ? 'y' : 'ies'} in the system. ${
        context.anomalies.map((a: AnomalyDetectionResult) => a.reason).join(". ")
      }`;
    }
    return "No anomalies detected. System is running normally.";
  }
  
  return `I can help you analyze system metrics, detect anomalies, and provide recommendations. Try asking about CPU usage, memory, or any issues you're experiencing.`;
}

/**
 * Helper: Calculate trend
 */
function calculateTrend(values: number[]): "increasing" | "decreasing" | "stable" {
  if (values.length < 2) return "stable";
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
  
  const diff = secondAvg - firstAvg;
  const threshold = firstAvg * 0.1; // 10% threshold
  
  if (Math.abs(diff) < threshold) return "stable";
  return diff > 0 ? "increasing" : "decreasing";
}

/**
 * Helper: Generate predictions using simple moving average
 */
function generatePredictions(values: number[], horizon: number) {
  const predictions = [];
  const windowSize = Math.min(10, Math.floor(values.length / 2));
  
  let lastValue = values[values.length - 1];
  const recentValues = values.slice(-windowSize);
  const trend = (recentValues[recentValues.length - 1] - recentValues[0]) / windowSize;
  
  for (let i = 0; i < horizon; i++) {
    const predictedValue = Math.max(0, Math.min(100, lastValue + trend));
    const confidence = Math.max(0.5, 0.95 - (i * 0.05)); // Confidence decreases with time
    
    predictions.push({
      timestamp: new Date(Date.now() + (i + 1) * 5000), // 5 seconds intervals
      value: predictedValue,
      confidence,
    });
    
    lastValue = predictedValue;
  }
  
  return predictions;
}

/**
 * Helper: Get recommendation for anomaly
 */
function getRecommendation(anomaly: AnomalyDetectionResult): string {
  switch (anomaly.metric) {
    case "cpu":
      return anomaly.value > 90 
        ? "Investigate high CPU processes immediately. Consider scaling or optimizing workloads."
        : "Monitor CPU usage trends. Check for background processes.";
    
    case "memory":
      return anomaly.value > 90
        ? "Critical memory pressure. Restart memory-intensive applications or upgrade RAM."
        : "Review memory allocation. Clear caches if needed.";
    
    case "disk":
      return "Check disk space. Clean up unnecessary files or expand storage.";
    
    default:
      return "Monitor the situation and investigate if pattern continues.";
  }
}

export const aiService = {
  detectAnomalies,
  predictMetrics,
  generateInsights,
  processNaturalLanguageQuery,
};
