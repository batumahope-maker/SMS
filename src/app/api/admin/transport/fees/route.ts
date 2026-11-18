import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, guardWriter, parseBody, parseId, errorResponse } from '@/lib/admin-write-route';
import { postTransportFee } from '@/lib/db-writer-transport-library';

/**
 * POST /api/admin/transport/fees — post one full monthly transport payment
 * via sp_post_transport_fee. Reference 'transport:YYYY-MM'; exactly one
 * posting per student-month (a repeat is DUPLICATE_PAYMENT). The amount is
 * caller-supplied — routes.fare is ADVISORY and no "full amount" validation
 * exists (documented policy limitation).
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
  if (studentId === null) {
    return NextResponse.json({ error: 'A student must be selected.' }, { status: 400 });
  }
  const period = body.period;
  if (typeof period !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    return NextResponse.json({ error: 'Period must be in YYYY-MM format.' }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0.' }, { status: 400 });
  }

  try {
    const result = await postTransportFee({
      studentId,
      period,
      amount,
      paymentMethod: typeof body.paymentMethod === 'string' ? body.paymentMethod : null,
    });
    return NextResponse.json({ ok: true, paymentId: result.paymentId });
  } catch (error) {
    return errorResponse(error);
  }
}
