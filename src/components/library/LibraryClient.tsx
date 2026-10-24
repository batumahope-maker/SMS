'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, BookOpen, AlertCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';

interface Book { id: string; title: string; author: string | null; isbn: string | null; category: string | null; quantity: number; available: number; location: string | null; _count: { issues: number } }
interface Issue { id: string; issuedAt: Date; dueDate: Date; book: { title: string }; student: { fullName: string; studentId: string } }
interface LibraryClientProps { books: Book[]; activeIssues: Issue[] }

export function LibraryClient({ books, activeIssues }: LibraryClientProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', category: '', quantity: '1', location: '' });
  const [saving, setSaving] = useState(false);

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.isbn || '').includes(search)
  );

  const overdue = activeIssues.filter(i => isPast(new Date(i.dueDate)));

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    try {
      await fetch('/api/library/books', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, quantity: parseInt(form.quantity) }) });
      setOpen(false);
      window.location.reload();
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Library</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage books, issues, and returns</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Add book</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add new book</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Book title" /></div>
              <div><Label>Author</Label><Input value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} placeholder="Author name" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>ISBN</Label><Input value={form.isbn} onChange={e => setForm(p => ({ ...p, isbn: e.target.value }))} /></div>
                <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Science" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantity</Label><Input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></div>
                <div><Label>Location (shelf)</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. A-12" /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Add book'}</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Total books</p><p className="text-2xl font-bold text-blue-600">{books.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Total copies</p><p className="text-2xl font-bold">{books.reduce((s, b) => s + b.quantity, 0)}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Currently issued</p><p className="text-2xl font-bold text-orange-600">{activeIssues.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground">Overdue</p><p className="text-2xl font-bold text-red-600">{overdue.length}</p></CardContent></Card>
      </div>

      {overdue.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2"><CardTitle className="text-base text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Overdue books ({overdue.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdue.map(i => (
                <div key={i.id} className="flex items-center justify-between text-sm p-2 bg-white rounded border border-red-100">
                  <div><span className="font-medium">{i.student.fullName}</span> <span className="text-muted-foreground">({i.student.studentId})</span></div>
                  <div className="text-center text-muted-foreground">{i.book.title}</div>
                  <div className="text-red-600 font-medium">Due: {format(new Date(i.dueDate), 'dd MMM yyyy')}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4" />Book catalogue</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search title, author, ISBN..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Author</TableHead><TableHead>Category</TableHead><TableHead>Copies</TableHead><TableHead>Available</TableHead><TableHead>Location</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">{books.length === 0 ? 'No books in library yet. Add your first book!' : 'No books match your search.'}</TableCell></TableRow>
                  : filtered.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.author || '—'}</TableCell>
                      <TableCell>{b.category ? <span className="bg-secondary text-xs px-2 py-0.5 rounded">{b.category}</span> : '—'}</TableCell>
                      <TableCell>{b.quantity}</TableCell>
                      <TableCell><span className={`font-medium ${b.available === 0 ? 'text-red-600' : 'text-green-600'}`}>{b.available}</span></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.location || '—'}</TableCell>
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
