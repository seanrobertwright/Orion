import { z } from 'zod';

// Application status enum matching database
export const applicationStatusValues = [
  'saved',
  'applied',
  'interviewing',
  'offered',
  'rejected',
] as const;

// Update application schema
export const updateApplicationSchema = z.object({
  notes: z.string().optional(),
  appliedDate: z.string().datetime().optional(),
  coverLetterId: z.string().uuid().optional(),
  resumeUsed: z.string().optional(),
  contactPerson: z.string().optional(),
  referral: z.string().optional(),
});

// Change status schema
export const changeStatusSchema = z.object({
  status: z.enum(applicationStatusValues),
});

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
