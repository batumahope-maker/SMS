'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bus, Users, MapPin, Plus, Phone, Loader2, Pencil, Trash2, Wallet } from 'lucide-react';
import { tlWrite } from '@/lib/tl-write-client';
import type {
  AssignmentRow,
  RouteRow,
  StudentRow,
  VehicleRow,
} from '@/lib/tl-reads';

type Message = { kind: 'success' | 'error'; text: string } | null;

interface VehicleForm {
  vehicleNumber: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  capacity: string;
}
interface RouteForm {
  vehicleId: string;
  name: string;
  stops: string;
  morningTime: string;
  eveningTime: string;
  fare: string;
}

const EMPTY_VEHICLE: VehicleForm = {
  vehicleNumber: '',
  vehicleType: '',
  driverName: '',
  driverPhone: '',
  capacity: '30',
};
const EMPTY_ROUTE: RouteForm = {
  vehicleId: '',
  name: '',
  stops: '',
  morningTime: '',
  eveningTime: '',
  fare: '',
};

/**
 * Admin Transport management, wired to the verified admin-only routes:
 *   POST/PUT/DELETE /api/admin/transport/vehicles[/id]
 *   POST/PUT/DELETE /api/admin/transport/routes[/id]
 *   POST/DELETE     /api/admin/transport/assignments[/id]
 *   POST            /api/admin/transport/fees
 * The routes enforce the admin session and all business rules (capacity,
 * duplicates, append-only payments); this UI only renders their verdicts.
 */
export function TransportClient({
  vehicles,
  routes,
  assignments,
  students,
  canWrite,
}: {
  vehicles: VehicleRow[];
  routes: RouteRow[];
  assignments: AssignmentRow[];
  students: StudentRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);

  // vehicle dialog (create + edit)
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(EMPTY_VEHICLE);

  // route dialog (create + edit)
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [routeForm, setRouteForm] = useState<RouteForm>(EMPTY_ROUTE);

  // assignment dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignRouteId, setAssignRouteId] = useState('');
  const [assignPickup, setAssignPickup] = useState('');

  // fee dialog
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [feeStudentId, setFeeStudentId] = useState('');
  const [feePeriod, setFeePeriod] = useState(() => format(new Date(), 'yyyy-MM'));
  const [feeAmount, setFeeAmount] = useState('');
  const [feeMethod, setFeeMethod] = useState('');

  // pending delete target for the confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: 'vehicle' | 'route'; id: number; label: string } | null
  >(null);

  const routesByVehicle = useMemo(() => {
    const map = new Map<number, RouteRow[]>();
    for (const route of routes) {
      const list = map.get(route.vehicleId) ?? [];
      list.push(route);
      map.set(route.vehicleId, list);
    }
    return map;
  }, [routes]);

  const routeLabel = (routeId: number) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return `Route #${routeId}`;
    const vehicle = vehicles.find((v) => v.id === route.vehicleId);
    return vehicle ? `${route.name} (${vehicle.vehicleNumber})` : route.name;
  };

  async function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, successText: string) {
    setBusy(true);
    setMessage(null);
    const result = await action();
    setBusy(false);
    if (result.ok) {
      setMessage({ kind: 'success', text: successText });
      router.refresh();
      return true;
    }
    setMessage({ kind: 'error', text: result.error });
    return false;
  }

  async function saveVehicle() {
    const payload = {
      vehicleNumber: vehicleForm.vehicleNumber.trim(),
      vehicleType: vehicleForm.vehicleType.trim() || null,
      capacity: Number(vehicleForm.capacity),
      driverName: vehicleForm.driverName.trim(),
      driverPhone: vehicleForm.driverPhone.trim() || null,
    };
    if (!payload.vehicleNumber || !payload.driverName || !Number.isInteger(payload.capacity) || payload.capacity < 1) {
      setMessage({ kind: 'error', text: 'Vehicle number, driver name and a seat capacity of at least 1 are required.' });
      return;
    }
    const ok = await run(
      () =>
        editingVehicleId === null
          ? tlWrite('/api/admin/transport/vehicles', 'POST', payload)
          : tlWrite(`/api/admin/transport/vehicles/${editingVehicleId}`, 'PUT', payload),
      editingVehicleId === null ? 'Vehicle registered.' : 'Vehicle updated.'
    );
    if (ok) {
      setVehicleDialogOpen(false);
      setVehicleForm(EMPTY_VEHICLE);
      setEditingVehicleId(null);
    }
  }

  async function saveRoute() {
    const payload = {
      vehicleId: Number(routeForm.vehicleId),
      name: routeForm.name.trim(),
      stops: routeForm.stops.trim() || null,
      morningTime: routeForm.morningTime || null,
      eveningTime: routeForm.eveningTime || null,
      fare: routeForm.fare === '' ? null : Number(routeForm.fare),
    };
    if (!payload.vehicleId || !payload.name) {
      setMessage({ kind: 'error', text: 'A vehicle and a route name are required.' });
      return;
    }
    const ok = await run(
      () =>
        editingRouteId === null
          ? tlWrite('/api/admin/transport/routes', 'POST', payload)
          : tlWrite(`/api/admin/transport/routes/${editingRouteId}`, 'PUT', payload),
      editingRouteId === null ? 'Route created.' : 'Route updated.'
    );
    if (ok) {
      setRouteDialogOpen(false);
      setRouteForm(EMPTY_ROUTE);
      setEditingRouteId(null);
    }
  }

  async function saveAssignment() {
    if (!assignStudentId || !assignRouteId) {
      setMessage({ kind: 'error', text: 'Select a student and a route.' });
      return;
    }
    const ok = await run(
      () =>
        tlWrite('/api/admin/transport/assignments', 'POST', {
          studentId: Number(assignStudentId),
          routeId: Number(assignRouteId),
          pickupPoint: assignPickup.trim() || null,
        }),
      'Student assigned to the route.'
    );
    if (ok) {
      setAssignDialogOpen(false);
      setAssignStudentId('');
      setAssignRouteId('');
      setAssignPickup('');
    }
  }

  async function saveFee() {
    if (!feeStudentId || !feePeriod || !feeAmount) {
      setMessage({ kind: 'error', text: 'Select a student and enter the period and amount.' });
      return;
    }
    const ok = await run(
      () =>
        tlWrite('/api/admin/transport/fees', 'POST', {
          studentId: Number(feeStudentId),
          period: feePeriod,
          amount: Number(feeAmount),
          paymentMethod: feeMethod.trim() || null,
        }),
      'Transport fee posted.'
    );
    if (ok) {
      setFeeDialogOpen(false);
      setFeeStudentId('');
      setFeeAmount('');
      setFeeMethod('');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await run(
      () =>
        target.kind === 'vehicle'
          ? tlWrite(`/api/admin/transport/vehicles/${target.id}`, 'DELETE')
          : tlWrite(`/api/admin/transport/routes/${target.id}`, 'DELETE'),
      target.kind === 'vehicle' ? 'Vehicle deleted (its routes went with it).' : 'Route deleted.'
    );
  }

  if (!canWrite) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Writes are temporarily unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The transport write service is not configured on this deployment, so
          vehicles, routes, assignments and fee postings cannot be changed right
          now. The read-only lists below still show the current records.
        </CardContent>
      </Card>
    );
  }

  const totalCapacity = vehicles.reduce((s, v) => s + v.capacity, 0);
  const totalAssigned = assignments.length;

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.kind === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bus className="h-5 w-5" /> Transport management
          </h2>
          <p className="text-sm text-muted-foreground">
            Vehicles, routes, student assignments and monthly fee postings
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setAssignDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Assign student
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setFeeDialogOpen(true)}>
            <Wallet className="mr-2 h-4 w-4" /> Post monthly fee
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={() => {
              setEditingVehicleId(null);
              setVehicleForm(EMPTY_VEHICLE);
              setVehicleDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add vehicle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Vehicles', value: vehicles.length, color: 'text-blue-600', Icon: Bus },
          { label: 'Total capacity', value: totalCapacity, color: 'text-green-600', Icon: Users },
          { label: 'Students assigned', value: totalAssigned, color: 'text-purple-600', Icon: MapPin },
          { label: 'Available seats', value: Math.max(0, totalCapacity - totalAssigned), color: 'text-orange-600', Icon: Bus },
        ].map(({ label, value, color, Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fleet ({vehicles.length} vehicles)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicles.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No vehicles registered yet
              </p>
            ) : (
              vehicles.map((v) => {
                const vehicleRoutes = routesByVehicle.get(v.id) ?? [];
                return (
                  <div key={v.id} className="rounded-lg bg-secondary/50 p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                        <Bus className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{v.vehicleNumber}</span>
                          {v.vehicleType && (
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">{v.vehicleType}</span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {v.capacity} seats
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{v.driverName}</p>
                        {v.driverPhone && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {v.driverPhone}
                          </p>
                        )}
                        <div className="mt-2 space-y-2">
                          {vehicleRoutes.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No routes on this vehicle yet</p>
                          ) : (
                            vehicleRoutes.map((r) => (
                              <div key={r.id} className="rounded border bg-background px-2 py-1.5 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <span className="flex items-center gap-1 font-medium">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    {r.name}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {r.assignmentCount} students ·{' '}
                                    {r.fare != null ? `${r.fare.toLocaleString()} RWF` : 'no fare set'}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-muted-foreground">
                                  {r.stops && <span>Stops: {r.stops}</span>}
                                  {r.morningTime && <span>Morning {r.morningTime}</span>}
                                  {r.eveningTime && <span>Evening {r.eveningTime}</span>}
                                  <span className="ml-auto flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs"
                                      disabled={busy}
                                      onClick={() => {
                                        setEditingRouteId(r.id);
                                        setRouteForm({
                                          vehicleId: String(r.vehicleId),
                                          name: r.name,
                                          stops: r.stops ?? '',
                                          morningTime: r.morningTime ?? '',
                                          eveningTime: r.eveningTime ?? '',
                                          fare: r.fare == null ? '' : String(r.fare),
                                        });
                                        setRouteDialogOpen(true);
                                      }}
                                    >
                                      <Pencil className="mr-1 h-3 w-3" /> Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs text-destructive"
                                      disabled={busy}
                                      onClick={() =>
                                        setDeleteTarget({ kind: 'route', id: r.id, label: r.name })
                                      }
                                    >
                                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                                    </Button>
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 flex-col gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={busy}
                          onClick={() => {
                            setEditingRouteId(null);
                            setRouteForm({ ...EMPTY_ROUTE, vehicleId: String(v.id) });
                            setRouteDialogOpen(true);
                          }}
                        >
                          <Plus className="mr-1 h-3 w-3" /> Route
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={busy}
                          onClick={() => {
                            setEditingVehicleId(v.id);
                            setVehicleForm({
                              vehicleNumber: v.vehicleNumber,
                              vehicleType: v.vehicleType ?? '',
                              driverName: v.driverName,
                              driverPhone: v.driverPhone ?? '',
                              capacity: String(v.capacity),
                            });
                            setVehicleDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs text-destructive"
                          disabled={busy}
                          onClick={() =>
                            setDeleteTarget({ kind: 'vehicle', id: v.id, label: v.vehicleNumber })
                          }
                        >
                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Student assignments ({assignments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No assignments yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((a) => (
                      <TableRow key={a.studentId}>
                        <TableCell>
                          <p className="text-sm font-medium">{a.studentName}</p>
                          {a.studentCode && (
                            <p className="text-xs text-muted-foreground">{a.studentCode}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{routeLabel(a.routeId)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.pickupPoint || '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-destructive"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                () => tlWrite(`/api/admin/transport/assignments/${a.studentId}`, 'DELETE'),
                                'Student unassigned.'
                              )
                            }
                          >
                            Unassign
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* vehicle create/edit dialog */}
      <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVehicleId === null ? 'Register vehicle' : `Edit vehicle`}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vehicle number *</Label>
                <Input
                  value={vehicleForm.vehicleNumber}
                  maxLength={20}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, vehicleNumber: e.target.value }))}
                  placeholder="e.g. RAB 123A"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Input
                  value={vehicleForm.vehicleType}
                  maxLength={50}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, vehicleType: e.target.value }))}
                  placeholder="Bus / Van"
                />
              </div>
            </div>
            <div>
              <Label>Driver name *</Label>
              <Input
                value={vehicleForm.driverName}
                maxLength={100}
                onChange={(e) => setVehicleForm((p) => ({ ...p, driverName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Driver phone</Label>
                <Input
                  value={vehicleForm.driverPhone}
                  maxLength={20}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, driverPhone: e.target.value }))}
                  placeholder="+250 7xx xxx xxx"
                />
              </div>
              <div>
                <Label>Capacity (seats) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={vehicleForm.capacity}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, capacity: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => void saveVehicle()} disabled={busy} className="flex-1">
                {busy ? 'Saving…' : editingVehicleId === null ? 'Register vehicle' : 'Save changes'}
              </Button>
              <Button variant="outline" onClick={() => setVehicleDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* route create/edit dialog */}
      <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRouteId === null ? 'Add route' : 'Edit route'}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div>
              <Label>Vehicle *</Label>
              <Select value={routeForm.vehicleId} onValueChange={(v) => setRouteForm((p) => ({ ...p, vehicleId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.vehicleNumber} — {v.capacity} seats
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Route name *</Label>
              <Input
                value={routeForm.name}
                maxLength={100}
                onChange={(e) => setRouteForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Kimihurura loop"
              />
            </div>
            <div>
              <Label>Stops</Label>
              <Input
                value={routeForm.stops}
                onChange={(e) => setRouteForm((p) => ({ ...p, stops: e.target.value }))}
                placeholder="Stop A, Stop B, …"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Morning time</Label>
                <Input
                  type="time"
                  value={routeForm.morningTime}
                  onChange={(e) => setRouteForm((p) => ({ ...p, morningTime: e.target.value }))}
                />
              </div>
              <div>
                <Label>Evening time</Label>
                <Input
                  type="time"
                  value={routeForm.eveningTime}
                  onChange={(e) => setRouteForm((p) => ({ ...p, eveningTime: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Advertised fare (RWF)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={routeForm.fare}
                onChange={(e) => setRouteForm((p) => ({ ...p, fare: e.target.value }))}
                placeholder="Advisory only — fee postings are entered separately"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The fare shown here is advisory; monthly fee postings are entered
                on each payment and are never inferred from it.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => void saveRoute()} disabled={busy} className="flex-1">
                {busy ? 'Saving…' : editingRouteId === null ? 'Add route' : 'Save changes'}
              </Button>
              <Button variant="outline" onClick={() => setRouteDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* assign student dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign student to a route</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div>
              <Label>Student *</Label>
              <Select value={assignStudentId} onValueChange={setAssignStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select active student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.userId} value={String(s.userId)}>
                      {s.studentName}
                      {s.studentCode ? ` (${s.studentCode})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                One assignment per student; a student already assigned elsewhere is refused.
              </p>
            </div>
            <div>
              <Label>Route *</Label>
              <Select value={assignRouteId} onValueChange={setAssignRouteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {routeLabel(r.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pickup point</Label>
              <Input
                value={assignPickup}
                maxLength={100}
                onChange={(e) => setAssignPickup(e.target.value)}
                placeholder="e.g. Stop A"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => void saveAssignment()} disabled={busy} className="flex-1">
                {busy ? 'Saving…' : 'Assign student'}
              </Button>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* post monthly fee dialog */}
      <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post monthly transport fee</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div>
              <Label>Student *</Label>
              <Select value={feeStudentId} onValueChange={setFeeStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select active student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.userId} value={String(s.userId)}>
                      {s.studentName}
                      {s.studentCode ? ` (${s.studentCode})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Period (month) *</Label>
                <Input
                  type="month"
                  value={feePeriod}
                  onChange={(e) => setFeePeriod(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  One posting per student per month; a repeat is refused.
                </p>
              </div>
              <div>
                <Label>Amount (RWF) *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Payment method</Label>
              <Input
                value={feeMethod}
                maxLength={50}
                onChange={(e) => setFeeMethod(e.target.value)}
                placeholder="cash / MoMo / bank"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Fee postings are append-only: they are never edited or deleted.
            </p>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => void saveFee()} disabled={busy} className="flex-1">
                {busy ? 'Posting…' : 'Post fee'}
              </Button>
              <Button variant="outline" onClick={() => setFeeDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.kind === 'vehicle' ? 'vehicle' : 'route'} “{deleteTarget?.label}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === 'vehicle'
                ? 'Its routes are removed with it. Vehicles with students still assigned are refused.'
                : 'Routes with students still assigned are refused.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {busy ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
