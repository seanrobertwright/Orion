import { QuestionnaireForm } from '@/components/questionnaire/QuestionnaireForm';

export default function QuestionnairePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Profile Setup
        </h1>
        <p className="text-gray-600">
          Tell us about your skills, experience, and career goals to help tailor your job search.
        </p>
      </div>

      <QuestionnaireForm />
    </div>
  );
}
