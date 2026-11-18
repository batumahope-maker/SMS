import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, guardWriter, parseBody, parseId, errorResponse } from '@/lib/admin-write-route';
import { addVehicle } from '@/lib/db-writer-transport-library';

/**
 * POST /api/admin/transport/vehicles — create a vehicle via sp_add_vehicle.
 * Admin-only. Returns the new vehicle id.
 */
export async function POST(request: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const unwritten = guardWriter();
  if (unwritten) return unwritten;

  const parsed = await parseBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const capacity = parseId(body.capacity, 'capacity');
  if (capacity === null || capacity < 1) {
    return NextResponse.json({ error: 'Capacity must be an integer of at least 1.' }, { status: 400 });
  }
  const vehicleNumber = body.vehicleNumber;
  if (typeof vehicleNumber !== 'string' || vehicleNumber.trim() === '') {
    return NextResponse.json({ error: 'Vehicle number is required.' }, { status: 400 });
  }
  const driverName = body.driverName;
  if (typeof driverName !== 'string' || driverName.trim() === '') {
    return NextResponse.json({ error: 'Driver name is required.' }, { status: 400 });
  }

  try {
    const result = await addVehicle({
      vehicleNumber: vehicleNumber.trim(),
      vehicleType: typeof body.vehicleType === 'string' ? body.vehicleType : null,
      capacity,
      driverName: driverName.trim(),
      driverPhone: typeof body.driverPhone === 'string' ? body.driverPhone : null,
    });
    return NextResponse.json({ ok: true, vehicleId: result.vehicleId });
  } catch (error) {
    return errorResponse(error);
  }
}
