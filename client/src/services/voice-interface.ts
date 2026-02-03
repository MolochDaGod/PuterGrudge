/**
 * Voice Interface Service
 * Speech-to-text and text-to-speech for hands-free AI interaction
 */

export interface VoiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  voiceName?: string;
  rate?: number;
  pitch?: number;
}

class VoiceInterfaceService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private listeners: Set<(transcript: string, isFinal: boolean) => void> = new Set();

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }

    // Initialize Speech Synthesis
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      const results = event.results;
      const lastResult = results[results.length - 1];
      const transcript = lastResult[0].transcript;
      const isFinal = lastResult.isFinal;

      this.notifyListeners(transcript, isFinal);
    };

    this.recognition.onerror = (event: any) => {
      console.error('[VoiceInterface] Recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Restart if no speech detected
        this.stopListening();
        setTimeout(() => this.startListening(), 1000);
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Restart if it stops unexpectedly
        this.recognition.start();
      }
    };
  }

  /**
   * Start listening for voice input
   */
  startListening(config?: Partial<VoiceConfig>): boolean {
    if (!this.recognition) {
      console.warn('[VoiceInterface] Speech recognition not supported');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    if (config) {
      if (config.language) this.recognition.lang = config.language;
      if (config.continuous !== undefined) this.recognition.continuous = config.continuous;
      if (config.interimResults !== undefined) this.recognition.interimResults = config.interimResults;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('[VoiceInterface] Failed to start listening:', error);
      return false;
    }
  }

  /**
   * Stop listening for voice input
   */
  stopListening() {
    if (!this.recognition || !this.isListening) return;

    this.isListening = false;
    this.recognition.stop();
  }

  /**
   * Speak text using text-to-speech
   */
  speak(text: string, config?: Partial<VoiceConfig>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      if (config) {
        if (config.rate) utterance.rate = config.rate;
        if (config.pitch) utterance.pitch = config.pitch;
        if (config.voiceName) {
          const voices = this.synthesis.getVoices();
          const voice = voices.find(v => v.name === config.voiceName);
          if (voice) utterance.voice = voice;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      this.synthesis.speak(utterance);
    });
  }

  /**
   * Stop speaking
   */
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * Subscribe to voice input
   */
  subscribe(callback: (transcript: string, isFinal: boolean) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(transcript: string, isFinal: boolean) {
    this.listeners.forEach(listener => listener(transcript, isFinal));
  }

  /**
   * Check if voice features are supported
   */
  isSupported(): { recognition: boolean; synthesis: boolean } {
    return {
      recognition: this.recognition !== null,
      synthesis: this.synthesis !== null,
    };
  }

  /**
   * Get listening status
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}

export const voiceInterface = new VoiceInterfaceService();

