'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, Download, DollarSign, CreditCard, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface Payment {
  id: string; amount: number; paymentMethod: string; receiptNumber: string; paidFor: string;
  term: string | null; paidAt: Date;
  student: { fullName: string; studentId: string; class: { name: string } | null };
}
interface PaymentsClientProps {
  payments: Payment[];
  students: { id: string; fullName: string; studentId: string }[];
  totalCollected: number;
  thisMonth: number;
}

const methodColors: Record<string, string> = {
  Cash: 'bg-green-100 text-green-800', 'Mobile Money': 'bg-blue-100 text-blue-800',
  Bank: 'bg-purple-100 text-purple-800', Card: 'bg-orange-100 text-orange-800',
};

export function PaymentsClient({ payments, students, totalCollected, thisMonth }: PaymentsClientProps) {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ studentId: '', amount: '', paymentMethod: 'Cash', paidFor: 'Tuition', term: 'Term 1', notes: '' });
  const [saving, setSaving] = useState(false);

  const filtered = payments.filter(p => {
    const ms = p.student.fullName.toLowerCase().includes(search.toLowerCase()) || p.receiptNumber.toLowerCase().includes(search.toLowerCase());
    const mm = methodFilter === 'all' || p.paymentMethod === methodFilter;
    return ms && mm;
  });

  async function handleSave() {
    if (!form.studentId || !form.amount) return;
    setSaving(true);
    try {
      await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }) });
      setOpen(false);
      window.location.reload();
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground text-sm mt-1">Track all student fee payments and receipts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Record payment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record new payment</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Student *</Label>
                  <Select value={form.studentId} onValueChange={v => setForm(p => ({ ...p, studentId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName} ({s.studentId})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Amount (RWF) *</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 50000" /></div>
                  <div><Label>Payment method</Label>
                    <Select value={form.paymentMethod} onValueChange={v => setForm(p => ({ ...p, paymentMethod: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Mobile Money">Mobile Money</SelectItem><SelectItem value="Bank">Bank transfer</SelectItem><SelectItem value="Card">Card</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Paid for</Label>
                    <Select value={form.paidFor} onValueChange={v => setForm(p => ({ ...p, paidFor: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Tuition">Tuition</SelectItem><SelectItem value="Lab Fee">Lab fee</SelectItem><SelectItem value="Library">Library</SelectItem><SelectItem value="Sports">Sports</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Term</Label>
                    <Select value={form.term} onValueChange={v => setForm(p => ({ ...p, term: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Term 1">Term 1</SelectItem><SelectItem value="Term 2">Term 2</SelectItem><SelectItem value="Term 3">Term 3</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" /></div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Record payment'}</Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-3"><DollarSign className="w-5 h-5 text-green-600" /><div><p className="text-xs text-muted-foreground">Total collected</p><p className="text-xl font-bold text-green-600">{totalCollected.toLocaleString()} RWF</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-3"><TrendingUp className="w-5 h-5 text-blue-600" /><div><p className="text-xs text-muted-foreground">This month</p><p className="text-xl font-bold text-blue-600">{thisMonth.toLocaleString()} RWF</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-3"><CreditCard className="w-5 h-5 text-purple-600" /><div><p className="text-xs text-muted-foreground">Total transactions</p><p className="text-xl font-bold text-purple-600">{payments.length}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Payment records</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search student or receipt..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All methods</SelectItem><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Mobile Money">Mobile Money</SelectItem><SelectItem value="Bank">Bank</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Receipt #</TableHead><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>For</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No payments found</TableCell></TableRow>
                  : filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.receiptNumber}</TableCell>
                      <TableCell className="font-medium">{p.student.fullName}<p className="text-xs text-muted-foreground">{p.student.studentId}</p></TableCell>
                      <TableCell>{p.student.class?.name || '—'}</TableCell>
                      <TableCell className="font-bold text-green-600">{p.amount.toLocaleString()}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${methodColors[p.paymentMethod] || 'bg-gray-100 text-gray-800'}`}>{p.paymentMethod}</span></TableCell>
                      <TableCell className="text-sm">{p.paidFor}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(p.paidAt), 'dd MMM yyyy')}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
