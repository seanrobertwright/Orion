import { db } from '@/db';
import { applications, interviews, jobs } from '@/db/schema';
import { auth } from '@/lib/auth';
import { StatusBadge } from '@/components/applications/StatusBadge';
import { StatusSelect } from '@/components/applications/StatusSelect';
import { and, eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

type InterviewItem = {
  id: string;
  type: string;
  scheduledAt: Date | null;
};

async function getJob(userId: string, id: string) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
    .limit(1);

  if (!job) {
    return null;
  }

  const [application] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.jobId, id), eq(applications.userId, userId)))
    .limit(1);

  const jobInterviews = application
    ? await db
        .select()
        .from(interviews)
        .where(eq(interviews.applicationId, application.id))
    : [];

  return {
    ...job,
    application,
    interviews: jobInterviews,
  };
}

export default async function JobDetailPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { id } = await params;
  const job = await getJob(session.user.id, id);

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

        {/* Interviews */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Interviews</h2>
            {job.application && (
              <a
                href={`/jobs/${id}/interviews`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Manage Interviews →
              </a>
            )}
          </div>
          {job.interviews && job.interviews.length > 0 ? (
            <div className="space-y-3">
              {job.interviews.map((interview: InterviewItem) => (
                <div key={interview.id} className="border-l-4 border-blue-500 pl-4">
                  <p className="font-medium text-gray-900">{interview.type}</p>
                  {interview.scheduledAt && (
                    <p className="text-sm text-gray-600">
                      {new Date(interview.scheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
              <a
                href={`/jobs/${id}/interviews`}
                className="inline-block text-sm text-blue-600 hover:text-blue-800 mt-2"
              >
                View all {job.interviews.length} interview{job.interviews.length !== 1 ? 's' : ''} →
              </a>
            </div>
          ) : (
            <div>
              <p className="text-gray-500 italic mb-2">No interviews scheduled</p>
              {job.application && (
                <a
                  href={`/jobs/${id}/interviews`}
                  className="inline-block text-sm text-blue-600 hover:text-blue-800"
                >
                  Schedule an interview →
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
