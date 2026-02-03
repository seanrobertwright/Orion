'use client';

import { useState } from 'react';

type InterviewType = 'phone_screen' | 'technical' | 'behavioral' | 'system_design' | 'onsite' | 'final' | 'other';
type InterviewOutcome = 'pending' | 'passed' | 'failed' | 'cancelled';

type InterviewCardProps = {
  interview: {
    id: string;
    scheduledAt: Date | string;
    type: InterviewType;
    notes?: string | null;
    location?: string | null;
    interviewers?: string | null;
    outcome: InterviewOutcome;
    feedback?: string | null;
  };
  onEdit?: () => void;
  onDelete?: () => void;
};

const typeLabels: Record<InterviewType, string> = {
  phone_screen: 'Phone Screen',
  technical: 'Technical Assessment',
  behavioral: 'Behavioral Interview',
  system_design: 'System Design',
  onsite: 'On-site Interview',
  final: 'Final Round',
  other: 'Other',
};

const outcomeColors: Record<InterviewOutcome, string> = {
  pending: 'bg-gray-100 text-gray-800 border-gray-300',
  passed: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-300',
};

const outcomeLabels: Record<InterviewOutcome, string> = {
  pending: 'Pending',
  passed: 'Passed',
  failed: 'Rejected',
  cancelled: 'Cancelled',
};

const cardBorderColors: Record<InterviewOutcome, string> = {
  pending: 'border-gray-300',
  passed: 'border-green-400',
  failed: 'border-red-400',
  cancelled: 'border-gray-300',
};

export function InterviewCard({ interview, onEdit, onDelete }: InterviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this interview?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/interviews/${interview.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete interview');
      }

      onDelete?.();
    } catch (error) {
      alert('Failed to delete interview');
      setIsDeleting(false);
    }
  };

  const scheduledDate = new Date(interview.scheduledAt);
  const isPast = scheduledDate < new Date();

  return (
    <div
      className={`rounded-lg border-2 ${cardBorderColors[interview.outcome]} bg-white overflow-hidden`}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">
                {typeLabels[interview.type]}
              </h3>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  outcomeColors[interview.outcome]
                }`}
              >
                {outcomeLabels[interview.outcome]}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {scheduledDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {' at '}
              {scheduledDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
            {interview.location && (
              <p className="text-sm text-gray-500 mt-1">
                {interview.location}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
          {interview.interviewers && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Interviewers</p>
              <p className="text-sm text-gray-900">{interview.interviewers}</p>
            </div>
          )}

          {interview.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{interview.notes}</p>
            </div>
          )}

          {interview.feedback && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Feedback / Questions Asked
              </p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{interview.feedback}</p>
            </div>
          )}

          {!interview.interviewers && !interview.notes && !interview.feedback && (
            <p className="text-sm text-gray-500 italic">No additional details</p>
          )}
        </div>
      )}
    </div>
  );
}
