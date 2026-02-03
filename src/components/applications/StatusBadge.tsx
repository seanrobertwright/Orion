'use client';

type ApplicationStatus = 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected';

type StatusBadgeProps = {
  status: ApplicationStatus;
  isStale?: boolean;
};

const statusConfig = {
  saved: {
    label: 'Saved',
    className: 'bg-gray-100 text-gray-800',
  },
  applied: {
    label: 'Applied',
    className: 'bg-blue-100 text-blue-800',
  },
  interviewing: {
    label: 'Interviewing',
    className: 'bg-yellow-100 text-yellow-800',
  },
  offered: {
    label: 'Offered',
    className: 'bg-green-100 text-green-800',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800',
  },
};

export function StatusBadge({ status, isStale }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
      >
        {config.label}
      </span>
      {isStale && (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
          STALE
        </span>
      )}
    </div>
  );
}
