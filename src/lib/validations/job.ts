import { z } from 'zod';

// Job validation schema
export const jobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  company: z.string().min(1, 'Company is required').max(200, 'Company must be less than 200 characters'),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
  location: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  niceToHaves: z.string().optional(),
  salary: z.string().optional(),
  source: z.string().optional(),
  isRemote: z.boolean().optional(),
});

export const createJobSchema = jobSchema;

export const updateJobSchema = jobSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export type JobInput = z.infer<typeof jobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
