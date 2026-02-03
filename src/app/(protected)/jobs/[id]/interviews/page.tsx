'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { InterviewForm } from '@/components/interviews/InterviewForm';
import { InterviewCard } from '@/components/interviews/InterviewCard';

type Interview = {
  id: string;
  scheduledAt: Date | string;
  type: 'phone_screen' | 'technical' | 'behavioral' | 'system_design' | 'onsite' | 'final' | 'other';
  notes?: string | null;
  location?: string | null;
  interviewers?: string | null;
  outcome: 'pending' | 'passed' | 'failed' | 'cancelled';
  feedback?: string | null;
};

type Job = {
  id: string;
  title: string;
  company: string;
  application?: {
    id: string;
  };
};

export default function InterviewsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Fetch job details
      const jobResponse = await fetch(`/api/jobs/${jobId}`);
      if (!jobResponse.ok) {
        throw new Error('Failed to fetch job');
      }
      const jobData = await jobResponse.json();
      setJob(jobData);

      // Fetch interviews if application exists
      if (jobData.application?.id) {
        const interviewsResponse = await fetch(
          `/api/interviews?applicationId=${jobData.application.id}`
        );
        if (interviewsResponse.ok) {
          const interviewsData = await interviewsResponse.json();
          setInterviews(interviewsData);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [jobId]);

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingInterview(null);
    loadData();
  };

  const handleEdit = (interview: Interview) => {
    setEditingInterview(interview);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingInterview(null);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-gray-500">Job not found</p>
      </div>
    );
  }

  if (!job.application) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-4">
          <button
            onClick={() => router.push(`/jobs/${jobId}`)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to Job
          </button>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-gray-700">
            No application exists for this job. Create an application first to schedule interviews.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/jobs/${jobId}`)}
          className="text-sm text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Back to Job
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
        <p className="text-gray-600 mt-1">
          {job.title} at {job.company}
        </p>
      </div>

      {/* Schedule Interview Button */}
      {!showForm && (
        <div className="mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Schedule Interview
          </button>
        </div>
      )}

      {/* Interview Form */}
      {showForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingInterview ? 'Edit Interview' : 'Schedule New Interview'}
          </h2>
          <InterviewForm
            applicationId={job.application.id}
            interview={editingInterview || undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleCancelForm}
          />
        </div>
      )}

      {/* Interviews Timeline */}
      <div className="space-y-4">
        {interviews.length > 0 ? (
          <>
            <h2 className="text-lg font-semibold text-gray-900">Interview Timeline</h2>
            {interviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                onEdit={() => handleEdit(interview)}
                onDelete={loadData}
              />
            ))}
          </>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-gray-500 italic">No interviews scheduled yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
