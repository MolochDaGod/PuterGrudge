/**
 * useAIEvolution Hook
 * Unified hook for accessing all AI evolution features
 */

import { useState, useEffect, useCallback } from 'react';
import { predictiveUX, Prediction } from '@/services/predictive-ux';
import { voiceInterface } from '@/services/voice-interface';

interface AIMetrics {
  aiRequests: number;
  aiLatencyAvg: number;
  cacheHitRate: number;
  tokensUsed: number;
  costEstimate: number;
}

interface Improvement {
  type: string;
  description: string;
  expectedImprovement: number;
  confidence: number;
}

export function useAIEvolution() {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/telemetry/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  }, []);

  // Fetch improvements
  const fetchImprovements = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/evolution/improvements');
      if (response.ok) {
        const data = await response.json();
        setImprovements(data);
      }
    } catch (error) {
      console.error('Failed to fetch improvements:', error);
    }
  }, []);

  // Record interaction for learning
  const recordInteraction = useCallback(async (
    input: string,
    output: string,
    feedback?: 'positive' | 'negative' | 'neutral',
    context?: Record<string, any>
  ) => {
    try {
      await fetch('/api/ai/evolution/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          output,
          feedback,
          context,
          modelUsed: 'gpt-4o',
          latency: 0,
          tokensUsed: 0,
        }),
      });
    } catch (error) {
      console.error('Failed to record interaction:', error);
    }
  }, []);

  // Store in memory with semantic search
  const storeMemory = useCallback(async (
    content: string,
    metadata: Record<string, any>,
    type: 'conversation' | 'code' | 'error' | 'solution' | 'context'
  ) => {
    try {
      await fetch('/api/ai/memory/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, metadata, type }),
      });
    } catch (error) {
      console.error('Failed to store memory:', error);
    }
  }, []);

  // Search memory semantically
  const searchMemory = useCallback(async (
    query: string,
    type?: 'conversation' | 'code' | 'error' | 'solution' | 'context',
    limit: number = 10
  ) => {
    try {
      const response = await fetch('/api/ai/memory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type, limit }),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to search memory:', error);
    }
    return [];
  }, []);

  // Voice interface controls
  const startVoiceInput = useCallback(() => {
    const success = voiceInterface.startListening();
    setIsListening(success);
  }, []);

  const stopVoiceInput = useCallback(() => {
    voiceInterface.stopListening();
    setIsListening(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    try {
      await voiceInterface.speak(text);
    } catch (error) {
      console.error('Failed to speak:', error);
    }
  }, []);

  // Track user action for predictions
  const trackAction = useCallback((action: string, context: string[] = []) => {
    predictiveUX.trackAction(action, context);
  }, []);

  // Initialize
  useEffect(() => {
    fetchMetrics();
    fetchImprovements();

    const metricsInterval = setInterval(fetchMetrics, 5000);
    const improvementsInterval = setInterval(fetchImprovements, 60000);

    // Subscribe to predictions
    const unsubscribePredictions = predictiveUX.subscribe(setPredictions);

    // Subscribe to voice transcripts
    const unsubscribeVoice = voiceInterface.subscribe((text, isFinal) => {
      setTranscript(text);
    });

    return () => {
      clearInterval(metricsInterval);
      clearInterval(improvementsInterval);
      unsubscribePredictions();
      unsubscribeVoice();
    };
  }, [fetchMetrics, fetchImprovements]);

  return {
    // Metrics
    metrics,
    improvements,
    predictions,
    
    // Actions
    recordInteraction,
    storeMemory,
    searchMemory,
    trackAction,
    
    // Voice
    isListening,
    transcript,
    startVoiceInput,
    stopVoiceInput,
    speak,
    
    // Refresh
    refreshMetrics: fetchMetrics,
    refreshImprovements: fetchImprovements,
  };
}

