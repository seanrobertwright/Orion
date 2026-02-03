import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/applications/StatusBadge';
import { StatusSelect } from '@/components/applications/StatusSelect';

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getJob(id: string) {
  // In a real app, this would use the authenticated API
  // For now, we'll return a mock structure
  // The actual API call will work once auth is integrated
  try {
    const response = await fetch(`http://localhost:3000/api/jobs/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch job:', error);
    return null;
  }
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
            <p className="mt-2 text-xl text-gray-600">{job.company}</p>
            {job.location && (
              <p className="mt-1 text-sm text-gray-500">{job.location}</p>
            )}
          </div>

          {job.application && (
            <div className="flex flex-col gap-2 items-end">
              <StatusBadge status={job.application.status} />
              <StatusSelect
                applicationId={job.application.id}
                currentStatus={job.application.status}
              />
            </div>
          )}
        </div>

        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            View Job Posting →
          </a>
        )}
      </div>

      {/* Job Details */}
      <div className="space-y-6">
        {/* Description */}
        {job.description && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
          </div>
        )}

        {/* Requirements */}
        {job.requirements && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{job.requirements}</p>
          </div>
        )}

        {/* Nice-to-Haves */}
        {job.niceToHaves && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Nice-to-Haves</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{job.niceToHaves}</p>
          </div>
        )}

        {/* Salary */}
        {job.salary && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Salary Range</h2>
            <p className="text-gray-700">{job.salary}</p>
          </div>
        )}

        {/* Application Notes */}
        {job.application && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Application Notes</h2>
            {job.application.notes ? (
              <p className="text-gray-700 whitespace-pre-wrap">{job.application.notes}</p>
            ) : (
              <p className="text-gray-500 italic">No notes yet</p>
            )}
          </div>
        )}

        {/* Interviews Placeholder */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Interviews</h2>
          {job.interviews && job.interviews.length > 0 ? (
            <div className="space-y-3">
              {job.interviews.map((interview: any) => (
                <div key={interview.id} className="border-l-4 border-blue-500 pl-4">
                  <p className="font-medium text-gray-900">{interview.type}</p>
                  {interview.scheduledAt && (
                    <p className="text-sm text-gray-600">
                      {new Date(interview.scheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No interviews scheduled</p>
          )}
        </div>
      </div>
    </div>
  );
}
