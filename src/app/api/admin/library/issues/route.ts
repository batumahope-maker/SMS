import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, guardWriter, parseBody, parseId, errorResponse } from '@/lib/admin-write-route';
import { issueBook } from '@/lib/db-writer-transport-library';

/**
 * POST /api/admin/library/issues — issue a book to an Active student via
 * sp_issue_book (transactional copy decrement; one open issue per
 * student/book pair).
 */
export async function POST(request: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const unwritten = guardWriter();
  if (unwritten) return unwritten;

  const parsed = await parseBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const bookId = parseId(body.bookId, 'book id');
  const studentId = parseId(body.studentId, 'student id');
  if (bookId === null || studentId === null) {
    return NextResponse.json({ error: 'A book and a student must be selected.' }, { status: 400 });
  }
  const dueDate = body.dueDate;
  if (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return NextResponse.json({ error: 'Due date is required (YYYY-MM-DD).' }, { status: 400 });
  }

  try {
    const result = await issueBook({ bookId, studentId, dueDate });
    return NextResponse.json({ ok: true, issueId: result.issueId });
  } catch (error) {
    return errorResponse(error);
  }
}
