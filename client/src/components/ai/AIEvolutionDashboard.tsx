/**
 * AI Evolution Dashboard
 * Displays AI performance metrics, improvements, and learning progress
 */

import React, { useEffect, useState } from 'react';
import { Activity, Brain, TrendingUp, Zap, Database, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface Metrics {
  aiRequests: number;
  aiLatencyAvg: number;
  aiLatencyP95: number;
  aiLatencyP99: number;
  cacheHitRate: number;
  errorRate: number;
  tokensUsed: number;
  costEstimate: number;
}

interface Improvement {
  type: string;
  description: string;
  expectedImprovement: number;
  confidence: number;
}

interface AgentStats {
  id: string;
  role: string;
  model: string;
  performance: {
    tasksCompleted: number;
    averageLatency: number;
    successRate: number;
  };
}

export const AIEvolutionDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [agents, setAgents] = useState<AgentStats[]>([]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const [metricsRes, improvementsRes, agentsRes] = await Promise.all([
        fetch('/api/ai/telemetry/metrics'),
        fetch('/api/ai/evolution/improvements'),
        fetch('/api/ai/orchestrator/agents'),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (improvementsRes.ok) setImprovements(await improvementsRes.json());
      if (agentsRes.ok) setAgents(await agentsRes.json());
    } catch (error) {
      console.error('Failed to fetch AI metrics:', error);
    }
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="w-8 h-8 text-purple-500" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          AI Evolution Dashboard
        </h2>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Activity className="w-5 h-5" />}
          label="Total Requests"
          value={metrics.aiRequests.toLocaleString()}
          color="blue"
        />
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Latency"
          value={`${metrics.aiLatencyAvg}ms`}
          color="green"
        />
        <MetricCard
          icon={<Database className="w-5 h-5" />}
          label="Cache Hit Rate"
          value={`${(metrics.cacheHitRate * 100).toFixed(1)}%`}
          color="purple"
        />
        <MetricCard
          icon={<Zap className="w-5 h-5" />}
          label="Tokens Used"
          value={metrics.tokensUsed.toLocaleString()}
          color="yellow"
        />
      </div>

      {/* Improvements */}
      {improvements.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Suggested Improvements
            </h3>
          </div>
          <div className="space-y-3">
            {improvements.map((improvement, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {improvement.type.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {improvement.description}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                      +{improvement.expectedImprovement}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {(improvement.confidence * 100).toFixed(0)}% confidence
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Performance */}
      {agents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Agent Performance
          </h3>
          <div className="space-y-3">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{agent.role}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{agent.model}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {agent.performance.tasksCompleted} tasks
                  </div>
                  <div className="text-xs text-gray-500">
                    {(agent.performance.successRate * 100).toFixed(1)}% success
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}> = ({ icon, label, value, color }) => {
  const colors = {
    blue: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
    green: 'text-green-500 bg-green-50 dark:bg-green-950',
    purple: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
    yellow: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className={`inline-flex p-2 rounded-lg ${colors[color]}`}>
        {icon}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      </div>
    </div>
  );
};

