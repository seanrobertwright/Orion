import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applicationStatusValues } from './application';

const uuidSchema = z.string().uuid();
const applicationStatusSchema = z.enum(applicationStatusValues);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function validateUuidParam(value: string, paramName = 'id') {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) {
    return badRequest(`Invalid ${paramName} format`);
  }
  return null;
}

export function parseOptionalUuid(value: string | null, paramName: string) {
  if (value === null) {
    return { value: null, error: null as NextResponse | null };
  }

  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) {
    return { value: null, error: badRequest(`Invalid ${paramName} format`) };
  }

  return { value: parsed.data, error: null as NextResponse | null };
}

export function parseOptionalApplicationStatus(value: string | null) {
  if (value === null) {
    return { value: null, error: null as NextResponse | null };
  }

  const parsed = applicationStatusSchema.safeParse(value);
  if (!parsed.success) {
    return {
      value: null,
      error: badRequest(
        `Invalid status value. Expected one of: ${applicationStatusValues.join(', ')}`
      ),
    };
  }

  return { value: parsed.data, error: null as NextResponse | null };
}

export function parsePaginationParams(
  pageRaw: string | null,
  limitRaw: string | null,
  config?: { defaultLimit?: number; maxLimit?: number }
) {
  const defaultLimit = config?.defaultLimit ?? 20;
  const maxLimit = config?.maxLimit ?? 100;

  const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : defaultLimit;

  if (!Number.isInteger(page) || page < 1) {
    return { value: null, error: badRequest('Invalid page value. Must be a positive integer.') };
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return {
      value: null,
      error: badRequest(`Invalid limit value. Must be an integer between 1 and ${maxLimit}.`),
    };
  }

  return {
    value: {
      page,
      limit,
      offset: (page - 1) * limit,
    },
    error: null as NextResponse | null,
  };
}
