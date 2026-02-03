'use client';

import Link from 'next/link';
import { StatusBadge } from '@/components/applications/StatusBadge';
import { StatusSelect } from '@/components/applications/StatusSelect';

type ApplicationStatus = 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected';

type JobCardProps = {
  job: {
    id: string;
    title: string;
    company: string;
    location?: string | null;
    applicationId?: string | null;
    applicationStatus?: ApplicationStatus | null;
    isStale?: boolean;
  };
  showStatusDropdown?: boolean;
};

export function JobCard({ job, showStatusDropdown = true }: JobCardProps) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className={`block rounded-lg border ${
        job.isStale ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
      } p-4 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
          <p className="text-sm text-gray-600">{job.company}</p>
          {job.location && (
            <p className="text-sm text-gray-500 mt-1">{job.location}</p>
          )}

          {job.isStale && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                Stale - No update in 14+ days
              </span>
            </div>
          )}
        </div>

        <div className="ml-4 flex flex-col items-end gap-2">
          {job.applicationStatus && (
            <>
              <StatusBadge status={job.applicationStatus} isStale={job.isStale} />
              {showStatusDropdown && job.applicationId && (
                <div onClick={(e) => e.preventDefault()}>
                  <StatusSelect
                    applicationId={job.applicationId}
                    currentStatus={job.applicationStatus}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
