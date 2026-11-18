import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, guardWriter, parseId, errorResponse } from '@/lib/admin-write-route';
import { unassignStudent } from '@/lib/db-writer-transport-library';

/**
 * DELETE /api/admin/transport/assignments/:id — :id is the student's
 * users.id; sp_unassign_student removes their single assignment row.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const unwritten = guardWriter();
  if (unwritten) return unwritten;

  const { id } = await params;
  const studentId = parseId(Number(id), 'student id');
  if (studentId === null) {
    return NextResponse.json({ error: 'Invalid student id.' }, { status: 400 });
  }

  try {
    await unassignStudent(studentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
