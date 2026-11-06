'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Home, Users, BedDouble, Plus, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Room { id: string; roomNumber: string; block: string | null; floor: number | null; capacity: number; gender: string | null; _count: { allocations: number } }
interface Allocation { id: string; bedNumber: string | null; allocatedAt: Date; student: { fullName: string; studentId: string; gender: string }; room: { roomNumber: string; block: string | null } }

export function HostelClient({ rooms, allocations, stats }: { rooms: Room[]; allocations: Allocation[]; stats: { totalRooms: number; totalBeds: number; occupied: number; available: number } }) {
  const [open, setOpen] = useState(false);
  const [genderFilter, setGenderFilter] = useState('all');
  const [form, setForm] = useState({ roomNumber: '', block: '', floor: '', capacity: '4', gender: 'Male' });
  const [saving, setSaving] = useState(false);

  const filteredRooms = genderFilter === 'all' ? rooms : rooms.filter(r => r.gender === genderFilter);

  async function handleSave() {
    if (!form.roomNumber) return;
    setSaving(true);
    try {
      await fetch('/api/hostel/rooms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, capacity: parseInt(form.capacity), floor: form.floor ? parseInt(form.floor) : null }),
      });
      setOpen(false); window.location.reload();
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Home className="w-6 h-6" />Hostel management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage boarding rooms and student allocations</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Add room</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add hostel room</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Room number *</Label><Input value={form.roomNumber} onChange={e => setForm(p => ({ ...p, roomNumber: e.target.value }))} placeholder="e.g. A101" /></div>
                <div><Label>Block</Label><Input value={form.block} onChange={e => setForm(p => ({ ...p, block: e.target.value }))} placeholder="e.g. Block A" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Floor</Label><Input type="number" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))} placeholder="1" /></div>
                <div><Label>Bed capacity</Label><Input type="number" min="1" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} /></div>
              </div>
              <div><Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm(p => ({ ...p, gender: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Mixed">Mixed</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Add room'}</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total rooms', value: stats.totalRooms, color: 'text-blue-600', Icon: Home },
          { label: 'Total beds', value: stats.totalBeds, color: 'text-purple-600', Icon: BedDouble },
          { label: 'Occupied', value: stats.occupied, color: 'text-orange-600', Icon: Users },
          { label: 'Available', value: stats.available, color: 'text-green-600', Icon: CheckCircle },
        ].map(({ label, value, color, Icon }) => (
          <Card key={label}><CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3"><Icon className={`w-5 h-5 ${color}`} /><div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-2xl font-bold ${color}`}>{value}</p></div></div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Rooms ({rooms.length})</CardTitle>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredRooms.length === 0
              ? <p className="text-center py-8 text-muted-foreground text-sm">No rooms found</p>
              : filteredRooms.map(r => {
                const occupied = r._count.allocations;
                const pct = r.capacity > 0 ? Math.round((occupied / r.capacity) * 100) : 0;
                const full = occupied >= r.capacity;
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${full ? 'bg-red-100' : 'bg-green-100'}`}>
                      {full ? <XCircle className="w-5 h-5 text-red-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{r.block ? `${r.block} - ` : ''}{r.roomNumber}</span>
                        <span className={`text-xs font-medium ${full ? 'text-red-600' : 'text-green-600'}`}>{occupied}/{r.capacity}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{r.gender}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Current residents ({allocations.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Room</TableHead><TableHead>Since</TableHead></TableRow></TableHeader>
                <TableBody>
                  {allocations.length === 0
                    ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No residents</TableCell></TableRow>
                    : allocations.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{a.student.fullName}</p>
                          <p className="text-xs text-muted-foreground">{a.student.studentId} · {a.student.gender}</p>
                        </TableCell>
                        <TableCell className="text-sm">{a.room.block ? `${a.room.block} - ` : ''}{a.room.roomNumber}{a.bedNumber ? ` Bed ${a.bedNumber}` : ''}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(a.allocatedAt), 'dd MMM yyyy')}</TableCell>
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
