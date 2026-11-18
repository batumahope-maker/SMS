import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, guardWriter, parseBody, parseId, errorResponse } from '@/lib/admin-write-route';
import { addRoute } from '@/lib/db-writer-transport-library';

/** Validates an optional non-negative decimal; 400 on a malformed value. */
function parseOptionalFare(body: Record<string, unknown>): { value: number | string | null; invalid: boolean } {
  const v = body.fare;
  if (v === undefined || v === null || v === '') return { value: null, invalid: false };
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return { value: null, invalid: true };
  return { value: n, invalid: false };
}

/**
 * POST /api/admin/transport/routes — create a route via sp_add_route.
 * fare is ADVISORY only and is never used to validate fee postings.
 */
export async function POST(request: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const unwritten = guardWriter();
  if (unwritten) return unwritten;

  const parsed = await parseBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const vehicleId = parseId(body.vehicleId, 'vehicle id');
  if (vehicleId === null) {
    return NextResponse.json({ error: 'A vehicle must be selected.' }, { status: 400 });
  }
  const name = body.name;
  if (typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'Route name is required.' }, { status: 400 });
  }
  const fare = parseOptionalFare(body);
  if (fare.invalid) {
    return NextResponse.json({ error: 'Fare must be a non-negative number.' }, { status: 400 });
  }

  try {
    const result = await addRoute({
      vehicleId,
      name: name.trim(),
      stops: typeof body.stops === 'string' ? body.stops : null,
      morningTime: typeof body.morningTime === 'string' ? body.morningTime : null,
      eveningTime: typeof body.eveningTime === 'string' ? body.eveningTime : null,
      fare: fare.value,
    });
    return NextResponse.json({ ok: true, routeId: result.routeId });
  } catch (error) {
    return errorResponse(error);
  }
}
