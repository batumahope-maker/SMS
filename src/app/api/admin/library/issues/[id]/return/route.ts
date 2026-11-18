import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, guardWriter, parseBody, parseId, errorResponse } from '@/lib/admin-write-route';
import { returnBook } from '@/lib/db-writer-transport-library';

/**
 * POST /api/admin/library/issues/:id/return — record a return via
 * sp_return_book. The fine (default 0) is recorded on the issue row and
 * becomes the ONLY amount a later fine posting can charge.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const unwritten = guardWriter();
  if (unwritten) return unwritten;

  const { id } = await params;
  const issueId = parseId(Number(id), 'issue id');
  if (issueId === null) {
    return NextResponse.json({ error: 'Invalid issue id.' }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = await request.json();
    if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
      body = raw as Record<string, unknown>;
    }
  } catch {
    // Empty body is fine — fine defaults to 0.
  }
  if (body.fine !== undefined && body.fine !== null && body.fine !== '') {
    const fine = Number(body.fine);
    if (!Number.isFinite(fine) || fine < 0) {
      return NextResponse.json({ error: 'Fine must be a non-negative amount.' }, { status: 400 });
    }
  }
  const fineValue: number | null =
    body.fine === undefined || body.fine === null || body.fine === ''
      ? null
      : Number(body.fine);

  try {
    const result = await returnBook({ issueId, fine: fineValue });
    return NextResponse.json({ ok: true, issueId: result.issueId });
  } catch (error) {
    return errorResponse(error);
  }
}
