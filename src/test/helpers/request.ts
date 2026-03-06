import { NextRequest } from 'next/server';

export function createRequest(
  method: string,
  url: string,
  body?: unknown,
  params?: Record<string, string>
): NextRequest {
  const fullUrl = `http://localhost:3000${url}`;
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(fullUrl, init);
}

export function createRouteContext(params: Record<string, string>) {
  return {
    params: Promise.resolve(params),
  };
}
