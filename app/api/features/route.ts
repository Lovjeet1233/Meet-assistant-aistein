import { NextResponse } from 'next/server';

/** Public feature flags for the client (no secrets). */
export async function GET() {
  return NextResponse.json({
    success: true,
    openaiSummaries: Boolean(process.env.OPENAI_API_KEY),
  });
}
