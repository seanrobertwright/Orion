'use client';

import { useState } from 'react';

type InterviewType = 'phone_screen' | 'technical' | 'behavioral' | 'system_design' | 'onsite' | 'final' | 'other';
type InterviewOutcome = 'pending' | 'passed' | 'failed' | 'cancelled';

type InterviewFormProps = {
  applicationId: string;
  interview?: {
    id: string;
    scheduledAt: Date | string;
    type: InterviewType;
    notes?: string | null;
    location?: string | null;
    interviewers?: string | null;
    outcome: InterviewOutcome;
    feedback?: string | null;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function InterviewForm({ applicationId, interview, onSuccess, onCancel }: InterviewFormProps) {
  const isEditMode = !!interview;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [scheduledAt, setScheduledAt] = useState(
    interview?.scheduledAt
      ? new Date(interview.scheduledAt).toISOString().slice(0, 16)
      : ''
  );
  const [type, setType] = useState<InterviewType>(interview?.type || 'phone_screen');
  const [notes, setNotes] = useState(interview?.notes || '');
  const [location, setLocation] = useState(interview?.location || '');
  const [interviewers, setInterviewers] = useState(interview?.interviewers || '');
  const [outcome, setOutcome] = useState<InterviewOutcome>(interview?.outcome || 'pending');
  const [feedback, setFeedback] = useState(interview?.feedback || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const payload: any = {
        scheduledAt: new Date(scheduledAt).toISOString(),
        type,
        notes: notes || undefined,
        location: location || undefined,
        interviewers: interviewers || undefined,
      };

      if (isEditMode) {
        payload.outcome = outcome;
        payload.feedback = feedback || undefined;
      } else {
        payload.applicationId = applicationId;
      }

      const url = isEditMode
        ? `/api/interviews/${interview.id}`
        : '/api/interviews';

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save interview');
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Date and Time */}
      <div>
        <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700 mb-1">
          Date & Time <span className="text-red-500">*</span>
        </label>
        <input
          type="datetime-local"
          id="scheduledAt"
          required
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
          Interview Type <span className="text-red-500">*</span>
        </label>
        <select
          id="type"
          required
          value={type}
          onChange={(e) => setType(e.target.value as InterviewType)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="phone_screen">Phone Screen</option>
          <option value="technical">Technical Assessment</option>
          <option value="behavioral">Behavioral Interview</option>
          <option value="system_design">System Design</option>
          <option value="onsite">On-site Interview</option>
          <option value="final">Final Round</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
          Location / Platform
        </label>
        <input
          type="text"
          id="location"
          placeholder="e.g., Zoom, Google Meet, Company Office"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Interviewers */}
      <div>
        <label htmlFor="interviewers" className="block text-sm font-medium text-gray-700 mb-1">
          Interviewers
        </label>
        <input
          type="text"
          id="interviewers"
          placeholder="e.g., John Smith, Jane Doe"
          value={interviewers}
          onChange={(e) => setInterviewers(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          {isEditMode ? 'Interview Notes' : 'Preparation Notes'}
        </label>
        <textarea
          id="notes"
          rows={3}
          placeholder={isEditMode ? 'Notes about the interview...' : 'Prep notes, topics to cover...'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Edit mode only fields */}
      {isEditMode && (
        <>
          {/* Outcome */}
          <div>
            <label htmlFor="outcome" className="block text-sm font-medium text-gray-700 mb-1">
              Outcome
            </label>
            <select
              id="outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as InterviewOutcome)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="passed">Passed / Advanced to Next Round</option>
              <option value="failed">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Feedback */}
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
              Company Feedback / Questions Asked
            </label>
            <textarea
              id="feedback"
              rows={4}
              placeholder="Questions asked, feedback received, areas to improve..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : isEditMode ? 'Update Interview' : 'Schedule Interview'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
