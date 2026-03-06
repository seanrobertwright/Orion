'use client';

import { useEffect, useMemo, useState } from 'react';
import { InterviewCard } from '@/components/interviews/InterviewCard';
import { Calendar, Plus } from 'lucide-react';

type InterviewType = 'phone_screen' | 'technical' | 'behavioral' | 'system_design' | 'onsite' | 'final' | 'other';
type InterviewOutcome = 'pending' | 'passed' | 'failed' | 'cancelled';

type Interview = {
  id: string;
  applicationId: string;
  scheduledAt: Date;
  type: InterviewType;
  notes?: string | null;
  location?: string | null;
  interviewers?: string | null;
  outcome: InterviewOutcome;
  feedback?: string | null;
  application: {
    id: string;
    jobId: string;
    status: string;
  };
};

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInterviews() {
      try {
        const response = await fetch('/api/interviews');
        if (!response.ok) throw new Error('Failed to fetch interviews');
        const payload = await response.json();
        const data = Array.isArray(payload) ? payload : payload.data || [];
        setInterviews(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load interviews');
      } finally {
        setLoading(false);
      }
    }

    fetchInterviews();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Interviews</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Interviews</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  // Group interviews by upcoming vs past
  const { upcomingInterviews, pastInterviews } = useMemo(() => {
    const cutoff = new Date();
    return {
      upcomingInterviews: interviews.filter(i => new Date(i.scheduledAt) >= cutoff),
      pastInterviews: interviews.filter(i => new Date(i.scheduledAt) < cutoff),
    };
  }, [interviews]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Interviews</h1>
          <p className="text-gray-600 mt-1">
            {interviews.length} total interview{interviews.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {interviews.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No interviews scheduled
          </h3>
          <p className="text-gray-600">
            Interviews will appear here once you schedule them for your job applications.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcomingInterviews.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Upcoming ({upcomingInterviews.length})
              </h2>
              <div className="space-y-4">
                {upcomingInterviews.map((interview) => (
                  <InterviewCard key={interview.id} interview={interview} />
                ))}
              </div>
            </div>
          )}

          {pastInterviews.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Past ({pastInterviews.length})
              </h2>
              <div className="space-y-4">
                {pastInterviews.map((interview) => (
                  <InterviewCard key={interview.id} interview={interview} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
