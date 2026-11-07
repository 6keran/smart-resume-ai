import { NextResponse } from 'next/server';
import { parseNaturalLanguageJobQuery } from '@/server/services/careerIntelligence';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { query } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ message: 'Search query is required.' }, { status: 400 });
    }

    const parsed = await parseNaturalLanguageJobQuery(query);
    return NextResponse.json({ success: true, parsed });
  } catch (err: any) {
    console.error('[API /api/jobs/nlp-search] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to parse search query',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

