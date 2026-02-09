'use client';

import { useState, useEffect } from 'react';
import { CoverLetterForm } from '@/components/cover-letters/CoverLetterForm';
import { CoverLetterCard } from '@/components/cover-letters/CoverLetterCard';

type CoverLetter = {
  id: string;
  title: string;
  preview: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  usageCount: number;
};

type FullCoverLetter = {
  id: string;
  title: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export default function CoverLettersPage() {
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLetter, setEditingLetter] = useState<FullCoverLetter | null>(null);

  const loadLetters = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/cover-letters');
      if (response.ok) {
        const data = await response.json();
        setLetters(data);
      }
    } catch (error) {
      console.error('Failed to load cover letters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLetters();
  }, []);

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingLetter(null);
    loadLetters();
  };

  const handleEdit = async (letter: CoverLetter) => {
    try {
      // Fetch full letter content
      const response = await fetch(`/api/cover-letters/${letter.id}`);
      if (response.ok) {
        const fullLetter = await response.json();
        setEditingLetter(fullLetter);
        setShowForm(true);
      }
    } catch (error) {
      console.error('Failed to load cover letter:', error);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingLetter(null);
  };

  const handleNewLetter = () => {
    setEditingLetter(null);
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cover Letters</h1>
        <p className="text-gray-600 mt-1">
          Create and manage cover letters to use with your job applications
        </p>
      </div>

      {/* New Cover Letter Button */}
      {!showForm && (
        <div className="mb-6">
          <button
            onClick={handleNewLetter}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Cover Letter
          </button>
        </div>
      )}

      {/* Cover Letter Form */}
      {showForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingLetter ? 'Edit Cover Letter' : 'Create Cover Letter'}
          </h2>
          <CoverLetterForm
            letter={editingLetter || undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleCancelForm}
          />
        </div>
      )}

      {/* Cover Letters List */}
      <div className="space-y-4">
        {letters.length > 0 ? (
          letters.map((letter) => (
            <CoverLetterCard
              key={letter.id}
              letter={letter}
              onEdit={() => handleEdit(letter)}
              onDelete={loadLetters}
            />
          ))
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500 mb-4">
              No cover letters yet. Create one to use with your applications.
            </p>
            <button
              onClick={handleNewLetter}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Your First Cover Letter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
