import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, guardWriter, parseBody, parseId, errorResponse } from '@/lib/admin-write-route';
import { postLibraryFine } from '@/lib/db-writer-transport-library';

/**
 * POST /api/admin/library/fines — post a library fine payment via
 * sp_post_library_fine. The amount is the fine recorded at return time; it
 * cannot be overridden. Reference 'library-fine:<issue_id>'; one payment
 * per issue (a repeat is DUPLICATE_PAYMENT).
 */
export async function POST(request: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const unwritten = guardWriter();
  if (unwritten) return unwritten;

  const parsed = await parseBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const issueId = parseId(body.issueId, 'issue id');
  if (issueId === null) {
    return NextResponse.json({ error: 'An issue record must be selected.' }, { status: 400 });
  }

  try {
    const result = await postLibraryFine({
      issueId,
      paymentMethod: typeof body.paymentMethod === 'string' ? body.paymentMethod : null,
    });
    return NextResponse.json({ ok: true, paymentId: result.paymentId });
  } catch (error) {
    return errorResponse(error);
  }
}
