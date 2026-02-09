'use client';

import { useEffect, useState } from 'react';
import {
  Briefcase,
  Send,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

type DashboardStatsData = {
  jobsInQueue: number;
  totalActive: number;
  interviewed: number;
  staleJobs: number;
  totalApplied: number;
  totalResponses: number;
  responseRate: number;
  interviewRate: number;
};

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        {error || 'Failed to load dashboard statistics'}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Jobs in Queue',
      value: stats.jobsInQueue,
      icon: Briefcase,
      color: 'blue',
      description: 'Saved for later'
    },
    {
      label: 'Total Active',
      value: stats.totalActive,
      icon: TrendingUp,
      color: 'green',
      description: 'In progress'
    },
    {
      label: 'Total Applied',
      value: stats.totalApplied,
      icon: Send,
      color: 'purple',
      description: 'Applications sent'
    },
    {
      label: 'Interviews',
      value: stats.interviewed,
      icon: Calendar,
      color: 'orange',
      description: 'Reached interview stage'
    },
    {
      label: 'Responses',
      value: stats.totalResponses,
      icon: CheckCircle,
      color: 'teal',
      description: 'Heard back from companies'
    },
    {
      label: 'Response Rate',
      value: `${stats.responseRate}%`,
      icon: TrendingUp,
      color: 'indigo',
      description: 'Of applications'
    },
    {
      label: 'Interview Rate',
      value: `${stats.interviewRate}%`,
      icon: Calendar,
      color: 'pink',
      description: 'Of applications'
    },
    {
      label: 'Stale Jobs',
      value: stats.staleJobs,
      icon: AlertCircle,
      color: stats.staleJobs > 0 ? 'red' : 'gray',
      description: 'Need follow-up'
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    teal: 'bg-teal-50 text-teal-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    pink: 'bg-pink-50 text-pink-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card) => {
        const Icon = card.icon;
        const colorClass = colorClasses[card.color as keyof typeof colorClasses];

        return (
          <div
            key={card.label}
            className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${colorClass}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              {card.label}
            </h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {card.value}
            </p>
            <p className="text-xs text-gray-500">
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
