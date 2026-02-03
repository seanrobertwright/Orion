import { JobForm } from '@/components/jobs/JobForm';

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New Job</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add a job opportunity you want to track. Start with the URL if you have it!
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <JobForm />
      </div>
    </div>
  );
}
