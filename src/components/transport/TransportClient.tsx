'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bus, Users, MapPin, Plus, Phone } from 'lucide-react';

interface Vehicle {
  id: string; vehicleNumber: string; driverName: string; driverPhone: string; capacity: number; vehicleType: string | null;
  routes: { id: string; name: string; fare: number | null; _count: { assignments: number } }[];
}
interface Assignment {
  id: string; pickupPoint: string | null;
  student: { fullName: string; studentId: string };
  route: { name: string };
}

export function TransportClient({ vehicles, assignments }: { vehicles: Vehicle[]; assignments: Assignment[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vehicleNumber: '', driverName: '', driverPhone: '', capacity: '30', vehicleType: 'Bus' });
  const [saving, setSaving] = useState(false);

  const totalCapacity = vehicles.reduce((s, v) => s + v.capacity, 0);
  const totalAssigned = assignments.length;

  async function handleSave() {
    if (!form.vehicleNumber || !form.driverName) return;
    setSaving(true);
    try {
      await fetch('/api/transport/vehicles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, capacity: parseInt(form.capacity) }),
      });
      setOpen(false); window.location.reload();
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bus className="w-6 h-6" />Transport management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage school vehicles, routes and student assignments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Add vehicle</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register vehicle</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Vehicle number *</Label><Input value={form.vehicleNumber} onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value }))} placeholder="e.g. RAB 123A" /></div>
                <div><Label>Type</Label><Input value={form.vehicleType || ''} onChange={e => setForm(p => ({ ...p, vehicleType: e.target.value }))} placeholder="Bus / Van" /></div>
              </div>
              <div><Label>Driver name *</Label><Input value={form.driverName} onChange={e => setForm(p => ({ ...p, driverName: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Driver phone</Label><Input value={form.driverPhone} onChange={e => setForm(p => ({ ...p, driverPhone: e.target.value }))} placeholder="+250 7xx xxx xxx" /></div>
                <div><Label>Capacity (seats)</Label><Input type="number" min="1" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Register vehicle'}</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Vehicles', value: vehicles.length, color: 'text-blue-600', Icon: Bus },
          { label: 'Total capacity', value: totalCapacity, color: 'text-green-600', Icon: Users },
          { label: 'Students assigned', value: totalAssigned, color: 'text-purple-600', Icon: MapPin },
          { label: 'Available seats', value: Math.max(0, totalCapacity - totalAssigned), color: 'text-orange-600', Icon: Bus },
        ].map(({ label, value, color, Icon }) => (
          <Card key={label}><CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-2xl font-bold ${color}`}>{value}</p></div>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Fleet ({vehicles.length} vehicles)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {vehicles.length === 0
              ? <p className="text-center py-8 text-muted-foreground text-sm">No vehicles registered yet</p>
              : vehicles.map(v => (
                <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Bus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{v.vehicleNumber}</span>
                      {v.vehicleType && <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{v.vehicleType}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{v.driverName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{v.driverPhone}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{v.capacity} seats</span>
                    </div>
                    {v.routes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {v.routes.map(r => (
                          <div key={r.id} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" />{r.name}</span>
                            <span className="text-muted-foreground">{r._count.assignments} students · {r.fare ? `${r.fare.toLocaleString()} RWF` : 'Free'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Student assignments ({assignments.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Student</TableHead><TableHead>Route</TableHead><TableHead>Pickup</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.length === 0
                    ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No assignments yet</TableCell></TableRow>
                    : assignments.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{a.student.fullName}</p>
                          <p className="text-xs text-muted-foreground">{a.student.studentId}</p>
                        </TableCell>
                        <TableCell className="text-sm">{a.route.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.pickupPoint || '—'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
