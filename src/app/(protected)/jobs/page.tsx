'use client';

import { useEffect, useState } from 'react';
import { JobCard } from '@/components/jobs/JobCard';
import { SearchFilter, FilterState } from '@/components/dashboard/SearchFilter';
import Link from 'next/link';
import { Plus, Briefcase } from 'lucide-react';

type ApplicationStatus = 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected';

type Job = {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  url?: string | null;
  description?: string | null;
  requirements?: string | null;
  niceToHaves?: string | null;
  salary?: string | null;
  source?: string | null;
  isRemote?: boolean;
  createdAt: Date;
  updatedAt: Date;
  applicationId?: string | null;
  applicationStatus?: ApplicationStatus | null;
  applicationUpdatedAt?: Date | null;
  appliedDate?: Date | null;
  isStale?: boolean;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const response = await fetch('/api/jobs');
        if (!response.ok) throw new Error('Failed to fetch jobs');
        const data = await response.json();
        setJobs(data);
        setFilteredJobs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  const handleFilterChange = (filters: FilterState) => {
    let filtered = [...jobs];

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(searchLower) ||
          job.company.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (filters.status.length > 0) {
      filtered = filtered.filter(
        (job) => job.applicationStatus && filters.status.includes(job.applicationStatus)
      );
    }

    // Filter by location
    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      filtered = filtered.filter(
        (job) => job.location?.toLowerCase().includes(locationLower)
      );
    }

    setFilteredJobs(filtered);
  };

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Jobs</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600 mt-1">
            {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Job
        </Link>
      </div>

      <div className="mb-6">
        <SearchFilter onFilterChange={handleFilterChange} />
      </div>

      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {jobs.length === 0 ? 'No jobs yet' : 'No jobs match your filters'}
          </h3>
          <p className="text-gray-600 mb-6">
            {jobs.length === 0
              ? 'Start tracking your job opportunities by adding your first job.'
              : 'Try adjusting your search or filters to find what you&apos;re looking for.'}
          </p>
          {jobs.length === 0 && (
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Your First Job
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} showStatusDropdown={true} />
          ))}
        </div>
      )}
    </div>
  );
}
