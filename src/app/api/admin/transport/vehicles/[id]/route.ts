import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, guardWriter, parseBody, parseId, errorResponse } from '@/lib/admin-write-route';
import { updateVehicle, deleteVehicle } from '@/lib/db-writer-transport-library';

/**
 * PUT /api/admin/transport/vehicles/:id — update vehicle details via
 * sp_update_vehicle. Capacity may never drop below currently assigned
 * students (CAPACITY_BELOW_ASSIGNMENTS from the procedure).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const unwritten = guardWriter();
  if (unwritten) return unwritten;

  const { id } = await params;
  const vehicleId = parseId(Number(id), 'vehicle id');
  if (vehicleId === null) {
    return NextResponse.json({ error: 'Invalid vehicle id.' }, { status: 400 });
  }

  const parsed = await parseBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const capacity = parseId(body.capacity, 'capacity');
  if (capacity === null || capacity < 1) {
    return NextResponse.json({ error: 'Capacity must be an integer of at least 1.' }, { status: 400 });
  }
  const driverName = body.driverName;
  if (typeof driverName !== 'string' || driverName.trim() === '') {
    return NextResponse.json({ error: 'Driver name is required.' }, { status: 400 });
  }

  try {
    const result = await updateVehicle({
      vehicleId,
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

/**
 * DELETE /api/admin/transport/vehicles/:id — delete via sp_delete_vehicle.
 * Refused by the procedure while any student is assigned to its routes.
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
  const vehicleId = parseId(Number(id), 'vehicle id');
  if (vehicleId === null) {
    return NextResponse.json({ error: 'Invalid vehicle id.' }, { status: 400 });
  }

  try {
    await deleteVehicle(vehicleId);
    return NextResponse.json({ ok: true, vehicleId });
  } catch (error) {
    return errorResponse(error);
  }
}
