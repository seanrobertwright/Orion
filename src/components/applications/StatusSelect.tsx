'use client';

import { useState } from 'react';

type ApplicationStatus = 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected';

type StatusSelectProps = {
  applicationId: string;
  currentStatus: ApplicationStatus;
  onStatusChange?: (newStatus: ApplicationStatus) => void;
};

const statusOptions: { value: ApplicationStatus; label: string }[] = [
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offered', label: 'Offered' },
  { value: 'rejected', label: 'Rejected' },
];

export function StatusSelect({ applicationId, currentStatus, onStatusChange }: StatusSelectProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (newStatus: ApplicationStatus) => {
    if (newStatus === status) return;

    setIsChanging(true);
    setError(null);

    // Optimistic update
    const oldStatus = status;
    setStatus(newStatus);

    try {
      const response = await fetch(`/api/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      onStatusChange?.(newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
      // Rollback on error
      setStatus(oldStatus);
      setError('Failed to update status');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div>
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value as ApplicationStatus)}
        disabled={isChanging}
        className="block rounded-md border-gray-300 py-1.5 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
