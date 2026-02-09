'use client';

import { useState } from 'react';

type CoverLetterCardProps = {
  letter: {
    id: string;
    title: string;
    preview: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    usageCount: number;
  };
  onEdit?: () => void;
  onDelete?: () => void;
};

export function CoverLetterCard({ letter, onEdit, onDelete }: CoverLetterCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (letter.usageCount > 0) {
      if (!confirm(
        `This cover letter is used by ${letter.usageCount} application(s). ` +
        `Deleting it will unlink it from those applications. Continue?`
      )) {
        return;
      }
    } else {
      if (!confirm('Are you sure you want to delete this cover letter?')) {
        return;
      }
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/cover-letters/${letter.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete cover letter');
      }

      onDelete?.();
    } catch (error) {
      alert('Failed to delete cover letter');
      setIsDeleting(false);
    }
  };

  const createdDate = new Date(letter.createdAt);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {letter.title}
          </h3>
          {letter.usageCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              Used by {letter.usageCount} application{letter.usageCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
        {letter.preview}
      </p>

      <p className="text-xs text-gray-500">
        Created {createdDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
    </div>
  );
}
