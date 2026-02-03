'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type JobFormData = {
  url?: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  requirements?: string;
  niceToHaves?: string;
  salary?: string;
  isRemote?: boolean;
};

export function JobForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<JobFormData>({
    url: '',
    title: '',
    company: '',
    location: '',
    description: '',
    requirements: '',
    niceToHaves: '',
    salary: '',
    isRemote: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.company.trim()) {
      newErrors.company = 'Company is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create job');
      }

      const { job } = await response.json();
      router.push(`/jobs/${job.id}`);
    } catch (error) {
      console.error('Failed to create job:', error);
      setErrors({ submit: 'Failed to create job. Please try again.' });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* URL field first - URL-FIRST WORKFLOW */}
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700">
          Job URL (optional)
        </label>
        <input
          type="url"
          id="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="https://company.com/careers/job-id"
        />
        <p className="mt-1 text-sm text-gray-500">
          Paste the job posting URL for easy reference
        </p>
      </div>

      {/* Title field - REQUIRED */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Job Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={`mt-1 block w-full rounded-md border ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          } px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
          placeholder="Senior Software Engineer"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Company field - REQUIRED */}
      <div>
        <label htmlFor="company" className="block text-sm font-medium text-gray-700">
          Company <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="company"
          required
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          className={`mt-1 block w-full rounded-md border ${
            errors.company ? 'border-red-500' : 'border-gray-300'
          } px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
          placeholder="Acme Corp"
        />
        {errors.company && (
          <p className="mt-1 text-sm text-red-600">{errors.company}</p>
        )}
      </div>

      {/* Location field - optional */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          type="text"
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="San Francisco, CA or Remote"
        />
      </div>

      {/* Remote checkbox */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isRemote"
          checked={formData.isRemote}
          onChange={(e) => setFormData({ ...formData, isRemote: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isRemote" className="ml-2 block text-sm text-gray-900">
          Remote position
        </label>
      </div>

      {/* Description - optional */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Brief job description..."
        />
      </div>

      {/* Requirements - optional */}
      <div>
        <label htmlFor="requirements" className="block text-sm font-medium text-gray-700">
          Requirements
        </label>
        <textarea
          id="requirements"
          rows={4}
          value={formData.requirements}
          onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="5+ years of experience&#10;Proficiency in React, TypeScript&#10;etc."
        />
      </div>

      {/* Nice to Haves - optional */}
      <div>
        <label htmlFor="niceToHaves" className="block text-sm font-medium text-gray-700">
          Nice-to-Haves
        </label>
        <textarea
          id="niceToHaves"
          rows={3}
          value={formData.niceToHaves}
          onChange={(e) => setFormData({ ...formData, niceToHaves: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="GraphQL experience&#10;Open source contributions&#10;etc."
        />
      </div>

      {/* Salary - optional */}
      <div>
        <label htmlFor="salary" className="block text-sm font-medium text-gray-700">
          Salary Range
        </label>
        <input
          type="text"
          id="salary"
          value={formData.salary}
          onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="$120,000 - $180,000"
        />
      </div>

      {/* Submit error */}
      {errors.submit && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}

      {/* Submit button */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !formData.title.trim() || !formData.company.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Job'}
        </button>
      </div>
    </form>
  );
}
