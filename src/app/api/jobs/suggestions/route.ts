import { NextResponse } from 'next/server';
import { getJobSearchSuggestions, JobSearchSuggestionField } from '@/server/services/jobs/suggestions';

const MAX_REQUEST_BYTES = 2_048;
const MAX_QUERY_LENGTH = 80;

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ message: 'Suggestion request is too large.' }, { status: 413 });
  }

  let body: unknown;
  try {
    const rawBody = await req.text();
    if (rawBody.length > MAX_REQUEST_BYTES) {
      return NextResponse.json({ message: 'Suggestion request is too large.' }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: 'Invalid suggestion request.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ message: 'Invalid suggestion request.' }, { status: 400 });
  }

  const { field, query } = body as Record<string, unknown>;
  if (field !== 'keywords' && field !== 'location') {
    return NextResponse.json({ message: 'Unsupported suggestion field.' }, { status: 400 });
  }
  if (typeof query !== 'string' || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ message: 'Search text must be 80 characters or fewer.' }, { status: 400 });
  }

  const suggestions = getJobSearchSuggestions(field as JobSearchSuggestionField, query);
  return NextResponse.json(
    { suggestions },
    { headers: { 'Cache-Control': 'private, max-age=60' } }
  );
}
