'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type QuestionnaireData = {
  technicalSkills: string[];
  preferredRoles: string[];
  preferredIndustries: string[];
  yearsExperience: number | null;
  careerGoals: string;
  completionPercentage: number;
  isComplete: boolean;
};

const ROLE_OPTIONS = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Data Engineer',
  'Machine Learning Engineer',
  'Product Manager',
  'UI/UX Designer',
  'QA Engineer',
  'Security Engineer',
  'Cloud Architect',
  'Mobile Developer',
];

const INDUSTRY_OPTIONS = [
  'Technology',
  'Finance',
  'Healthcare',
  'E-commerce',
  'Education',
  'Entertainment',
  'Government',
  'Manufacturing',
  'Consulting',
  'Retail',
  'Telecommunications',
  'Energy',
  'Real Estate',
  'Transportation',
];

export function QuestionnaireForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [technicalSkills, setTechnicalSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [preferredIndustries, setPreferredIndustries] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState<number | null>(null);
  const [careerGoals, setCareerGoals] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Load existing data
  useEffect(() => {
    async function loadQuestionnaire() {
      try {
        const res = await fetch('/api/questionnaire');
        if (res.ok) {
          const data = await res.json();

          // Parse JSON strings back to arrays
          if (data.technicalSkills) {
            try {
              const parsed = JSON.parse(data.technicalSkills);
              setTechnicalSkills(Array.isArray(parsed) ? parsed : []);
            } catch {
              setTechnicalSkills([]);
            }
          }

          if (data.preferredRoles) {
            try {
              const parsed = JSON.parse(data.preferredRoles);
              setPreferredRoles(Array.isArray(parsed) ? parsed : []);
            } catch {
              setPreferredRoles([]);
            }
          }

          if (data.preferredIndustries) {
            try {
              const parsed = JSON.parse(data.preferredIndustries);
              setPreferredIndustries(Array.isArray(parsed) ? parsed : []);
            } catch {
              setPreferredIndustries([]);
            }
          }

          setYearsExperience(data.yearsExperience || null);
          setCareerGoals(data.careerGoals || '');
          setCompletionPercentage(data.completionPercentage || 0);
        }
      } catch (error) {
        console.error('Failed to load questionnaire:', error);
      } finally {
        setLoading(false);
      }
    }

    loadQuestionnaire();
  }, []);

  const handleAddSkill = () => {
    if (skillInput.trim() && !technicalSkills.includes(skillInput.trim())) {
      setTechnicalSkills([...technicalSkills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setTechnicalSkills(technicalSkills.filter((s) => s !== skill));
  };

  const handleRoleToggle = (role: string) => {
    if (preferredRoles.includes(role)) {
      setPreferredRoles(preferredRoles.filter((r) => r !== role));
    } else {
      setPreferredRoles([...preferredRoles, role]);
    }
  };

  const handleIndustryToggle = (industry: string) => {
    if (preferredIndustries.includes(industry)) {
      setPreferredIndustries(preferredIndustries.filter((i) => i !== industry));
    } else {
      setPreferredIndustries([...preferredIndustries, industry]);
    }
  };

  const handleSave = async (markComplete = false) => {
    setSaving(true);
    setSuccessMessage('');

    try {
      const res = await fetch('/api/questionnaire', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicalSkills,
          preferredRoles,
          preferredIndustries,
          yearsExperience,
          careerGoals,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCompletionPercentage(data.completionPercentage || 0);

        if (data.isComplete) {
          setSuccessMessage('Questionnaire completed! Your preferences have been saved.');
          setTimeout(() => router.push('/dashboard'), 2000);
        } else if (markComplete) {
          setSuccessMessage('Please fill in all required fields to complete the questionnaire.');
        } else {
          setSuccessMessage('Progress saved!');
          setTimeout(() => setSuccessMessage(''), 3000);
        }
      } else {
        alert('Failed to save questionnaire');
      }
    } catch (error) {
      console.error('Failed to save questionnaire:', error);
      alert('Failed to save questionnaire');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const canComplete = completionPercentage === 100;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Completion Progress
          </span>
          <span className="text-sm font-medium text-gray-700">
            {completionPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {successMessage}
        </div>
      )}

      <div className="space-y-8">
        {/* Section 1: Technical Skills */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            1. Technical Skills
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Add the technologies, programming languages, and tools you&apos;re proficient in.
          </p>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
              placeholder="e.g., React, Python, AWS"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddSkill}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {technicalSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {skill}
                <button
                  onClick={() => handleRemoveSkill(skill)}
                  className="hover:text-blue-900"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Section 2: Preferred Roles */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            2. Preferred Roles
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Select the types of roles you&apos;re interested in.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {ROLE_OPTIONS.map((role) => (
              <label key={role} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferredRoles.includes(role)}
                  onChange={() => handleRoleToggle(role)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{role}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Section 3: Preferred Industries */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            3. Preferred Industries
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Select the industries you&apos;d like to work in.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {INDUSTRY_OPTIONS.map((industry) => (
              <label key={industry} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferredIndustries.includes(industry)}
                  onChange={() => handleIndustryToggle(industry)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{industry}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Section 4: Years of Experience */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            4. Years of Experience
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            How many years of professional experience do you have?
          </p>

          <select
            value={yearsExperience || ''}
            onChange={(e) => setYearsExperience(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select years</option>
            <option value="0">0-1 years</option>
            <option value="1">1-2 years</option>
            <option value="3">3-5 years</option>
            <option value="5">5-7 years</option>
            <option value="7">7-10 years</option>
            <option value="10">10+ years</option>
          </select>
        </div>

        {/* Section 5: Career Goals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            5. Career Goals
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Tell us about your career aspirations and what you&apos;re looking for in your next role.
          </p>

          <textarea
            value={careerGoals}
            onChange={(e) => setCareerGoals(e.target.value)}
            placeholder="E.g., I'm looking to transition into a senior role where I can mentor junior developers and work on scalable distributed systems..."
            rows={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Progress'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !canComplete}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {canComplete ? (saving ? 'Completing...' : 'Complete') : 'Complete (fill all fields)'}
          </button>
        </div>
      </div>
    </div>
  );
}
