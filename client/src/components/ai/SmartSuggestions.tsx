/**
 * Smart Suggestions Component
 * Displays AI-powered predictive suggestions to the user
 */

import React, { useEffect, useState } from 'react';
import { predictiveUX, Prediction } from '@/services/predictive-ux';
import { X, Lightbulb, AlertTriangle, Info, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SmartSuggestions: React.FC = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = predictiveUX.subscribe((newPredictions) => {
      setPredictions(newPredictions.filter(p => !dismissed.has(p.id)));
    });

    return unsubscribe;
  }, [dismissed]);

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
    predictiveUX.dismissPrediction(id);
  };

  const getIcon = (type: Prediction['type']) => {
    switch (type) {
      case 'suggestion':
        return <Lightbulb className="w-5 h-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'tip':
        return <Info className="w-5 h-5 text-green-500" />;
      case 'shortcut':
        return <Zap className="w-5 h-5 text-purple-500" />;
    }
  };

  const getBackgroundColor = (type: Prediction['type']) => {
    switch (type) {
      case 'suggestion':
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
      case 'tip':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
      case 'shortcut':
        return 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800';
    }
  };

  if (predictions.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 max-w-sm space-y-2">
      <AnimatePresence>
        {predictions.slice(0, 3).map((prediction) => (
          <motion.div
            key={prediction.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`
              p-4 rounded-lg border-2 shadow-lg backdrop-blur-sm
              ${getBackgroundColor(prediction.type)}
            `}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(prediction.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {prediction.title}
                  </h4>
                  <button
                    onClick={() => handleDismiss(prediction.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {prediction.description}
                </p>

                {prediction.action && (
                  <button
                    onClick={() => {
                      prediction.action?.();
                      handleDismiss(prediction.id);
                    }}
                    className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Take Action →
                  </button>
                )}

                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${prediction.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.round(prediction.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {predictions.length > 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-gray-500 dark:text-gray-400"
        >
          +{predictions.length - 3} more suggestions
        </motion.div>
      )}
    </div>
  );
};

