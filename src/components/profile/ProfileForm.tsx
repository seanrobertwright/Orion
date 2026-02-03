'use client';

import { useState } from 'react';

interface ProfileData {
  name: string | null;
  email: string;
  salaryMin: number | null;
  salaryMax: number | null;
  workPreference: string | null;
}

interface ProfileFormProps {
  initialData: ProfileData;
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    salaryMin: initialData.salaryMin?.toString() || '',
    salaryMax: initialData.salaryMax?.toString() || '',
    workPreference: initialData.workPreference || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || null,
          salaryMin: formData.salaryMin ? parseInt(formData.salaryMin, 10) : null,
          salaryMax: formData.salaryMax ? parseInt(formData.salaryMax, 10) : null,
          workPreference: formData.workPreference || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update profile',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={initialData.email}
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
        />
        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="salaryMin" className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Salary ($)
          </label>
          <input
            type="number"
            id="salaryMin"
            value={formData.salaryMin}
            onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
            min="0"
            step="1000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="salaryMax" className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Salary ($)
          </label>
          <input
            type="number"
            id="salaryMax"
            value={formData.salaryMax}
            onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
            min="0"
            step="1000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label htmlFor="workPreference" className="block text-sm font-medium text-gray-700 mb-2">
          Work Preference
        </label>
        <select
          id="workPreference"
          value={formData.workPreference}
          onChange={(e) => setFormData({ ...formData, workPreference: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select preference</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">Onsite</option>
          <option value="flexible">Flexible</option>
        </select>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
