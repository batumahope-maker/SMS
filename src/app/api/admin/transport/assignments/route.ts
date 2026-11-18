import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, guardWriter, parseBody, parseId, errorResponse } from '@/lib/admin-write-route';
import { assignStudent } from '@/lib/db-writer-transport-library';

/**
 * POST /api/admin/transport/assignments — assign one Active student to a
 * route via sp_assign_student. One assignment per student (unique key);
 * capacity is enforced inside the procedure under the canonical lock order.
 */
export async function POST(request: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const unwritten = guardWriter();
  if (unwritten) return unwritten;

  const parsed = await parseBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const studentId = parseId(body.studentId, 'student id');
  const routeId = parseId(body.routeId, 'route id');
  if (studentId === null || routeId === null) {
    return NextResponse.json({ error: 'A student and a route must be selected.' }, { status: 400 });
  }

  try {
    await assignStudent({
      studentId,
      routeId,
      pickupPoint: typeof body.pickupPoint === 'string' ? body.pickupPoint : null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
