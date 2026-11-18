'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isPast, format } from 'date-fns';
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
import { Search, Plus, BookOpen, AlertCircle, Loader2, Pencil, Trash2, RotateCcw, Wallet } from 'lucide-react';
import { tlWrite } from '@/lib/tl-write-client';
import type { BookRow, IssueRow, StudentRow } from '@/lib/tl-reads';

type Message = { kind: 'success' | 'error'; text: string } | null;

interface BookForm {
  title: string;
  author: string;
  isbn: string;
  category: string;
  publisher: string;
  publishedYear: string;
  quantity: string;
  location: string;
}

const EMPTY_BOOK: BookForm = {
  title: '',
  author: '',
  isbn: '',
  category: '',
  publisher: '',
  publishedYear: '',
  quantity: '1',
  location: '',
};

function defaultDueDate(): string {
  return format(new Date(Date.now() + 7 * 24 * 3600 * 1000), 'yyyy-MM-dd');
}

/**
 * Admin Library management, wired to the verified admin-only routes:
 *   POST/PUT/DELETE /api/admin/library/books[/id]
 *   POST            /api/admin/library/issues
 *   POST            /api/admin/library/issues/:id/return
 *   POST            /api/admin/library/fines
 * The routes enforce the admin session and every business rule (copy
 * inventory, duplicate ISBN, one fine posting per issue); this UI only
 * renders their verdicts. Fine postings stay append-only.
 */
export function LibraryClient({
  books,
  issues,
  students,
  canWrite,
}: {
  books: BookRow[];
  issues: IssueRow[];
  students: StudentRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  // book dialog (create + edit)
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [bookForm, setBookForm] = useState<BookForm>(EMPTY_BOOK);

  // issue dialog
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueBookId, setIssueBookId] = useState('');
  const [issueStudentId, setIssueStudentId] = useState('');
  const [issueDueDate, setIssueDueDate] = useState<string>(defaultDueDate);

  // return dialog
  const [returnTarget, setReturnTarget] = useState<IssueRow | null>(null);
  const [returnFine, setReturnFine] = useState('');

  // pending book delete
  const [deleteBook, setDeleteBook] = useState<BookRow | null>(null);

  const activeIssues = useMemo(() => issues.filter((i) => !i.returned), [issues]);
  const unpaidFines = useMemo(() => issues.filter((i) => i.returned), [issues]);
  const overdue = useMemo(
    () => activeIssues.filter((i) => isPast(new Date(`${i.dueDate}T23:59:59`))),
    [activeIssues]
  );
  const filtered = useMemo(
    () =>
      books.filter(
        (b) =>
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          (b.author ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (b.isbn ?? '').includes(search)
      ),
    [books, search]
  );

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

  async function saveBook() {
    const quantity = Number(bookForm.quantity);
    const year = bookForm.publishedYear.trim();
    const payload = {
      title: bookForm.title.trim(),
      author: bookForm.author.trim() || null,
      isbn: bookForm.isbn.trim() || null,
      category: bookForm.category.trim() || null,
      publisher: bookForm.publisher.trim() || null,
      publishedYear: year === '' ? null : Number(year),
      quantity,
      location: bookForm.location.trim() || null,
    };
    if (!payload.title || !Number.isInteger(quantity) || quantity < 0) {
      setMessage({ kind: 'error', text: 'A title and a copy quantity of at least 0 are required.' });
      return;
    }
    if (year !== '' && (!/^\d+$/.test(year) || Number(year) < 0)) {
      setMessage({ kind: 'error', text: 'Published year must be a non-negative number.' });
      return;
    }
    const ok = await run(
      () =>
        editingBookId === null
          ? tlWrite('/api/admin/library/books', 'POST', payload)
          : tlWrite(`/api/admin/library/books/${editingBookId}`, 'PUT', payload),
      editingBookId === null ? 'Book added to the catalogue.' : 'Book updated.'
    );
    if (ok) {
      setBookDialogOpen(false);
      setBookForm(EMPTY_BOOK);
      setEditingBookId(null);
    }
  }

  async function saveIssue() {
    if (!issueBookId || !issueStudentId || !issueDueDate) {
      setMessage({ kind: 'error', text: 'Select a book and a student, and choose a due date.' });
      return;
    }
    const ok = await run(
      () =>
        tlWrite('/api/admin/library/issues', 'POST', {
          bookId: Number(issueBookId),
          studentId: Number(issueStudentId),
          dueDate: issueDueDate,
        }),
      'Book issued.'
    );
    if (ok) {
      setIssueDialogOpen(false);
      setIssueBookId('');
      setIssueStudentId('');
      setIssueDueDate(defaultDueDate());
    }
  }

  async function saveReturn() {
    if (!returnTarget) return;
    const target = returnTarget;
    setReturnTarget(null);
    const fine = returnFine.trim() === '' ? null : Number(returnFine);
    setReturnFine('');
    await run(
      () => tlWrite(`/api/admin/library/issues/${target.id}/return`, 'POST', { fine }),
      'Book returned. Any fine entered is recorded on the issue.'
    );
  }

  async function confirmDelete() {
    if (!deleteBook) return;
    const target = deleteBook;
    setDeleteBook(null);
    await run(() => tlWrite(`/api/admin/library/books/${target.id}`, 'DELETE'), 'Book deleted.');
  }

  if (!canWrite) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Writes are temporarily unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The library write service is not configured on this deployment, so the
          catalogue and issue records cannot be changed right now. The read-only
          lists below still show the current records.
        </CardContent>
      </Card>
    );
  }

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
            <BookOpen className="h-5 w-5" /> Library management
          </h2>
          <p className="text-sm text-muted-foreground">Catalogue, issues, returns and fine postings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setIssueDialogOpen(true)}>
            <BookOpen className="mr-2 h-4 w-4" /> Issue book
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={() => {
              setEditingBookId(null);
              setBookForm(EMPTY_BOOK);
              setBookDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add book
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Titles', value: books.length, color: 'text-blue-600' },
          { label: 'Total copies', value: books.reduce((s, b) => s + b.quantity, 0), color: '' },
          { label: 'Currently issued', value: activeIssues.length, color: 'text-orange-600' },
          { label: 'Overdue', value: overdue.length, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {overdue.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4" /> Overdue books ({overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdue.map((i) => (
                <div
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-red-100 bg-white p-2 text-sm dark:border-red-900 dark:bg-background"
                >
                  <div>
                    <span className="font-medium">{i.studentName}</span>{' '}
                    <span className="text-muted-foreground">
                      {i.studentCode ? `(${i.studentCode})` : ''}
                    </span>
                  </div>
                  <div className="text-muted-foreground">{i.bookTitle}</div>
                  <div className="font-medium text-red-600 dark:text-red-400">
                    Due: {format(new Date(`${i.dueDate}T00:00:00`), 'dd MMM yyyy')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" /> Book catalogue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, author, ISBN..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                        {books.length === 0
                          ? 'No books in library yet. Add your first book!'
                          : 'No books match your search.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <p className="font-medium">{b.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {b.author || 'Unknown author'}
                            {b.category ? ` · ${b.category}` : ''}
                            {b.isbn ? ` · ISBN ${b.isbn}` : ''}
                            {b.location ? ` · ${b.location}` : ''}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${b.available === 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {b.available}
                          </span>
                          <span className="text-xs text-muted-foreground"> / {b.quantity}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={busy}
                              onClick={() => {
                                setIssueBookId(String(b.id));
                                setIssueDialogOpen(true);
                              }}
                            >
                              Issue
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              disabled={busy}
                              onClick={() => {
                                setEditingBookId(b.id);
                                setBookForm({
                                  title: b.title,
                                  author: b.author ?? '',
                                  isbn: b.isbn ?? '',
                                  category: b.category ?? '',
                                  publisher: b.publisher ?? '',
                                  publishedYear: b.publishedYear == null ? '' : String(b.publishedYear),
                                  quantity: String(b.quantity),
                                  location: b.location ?? '',
                                });
                                setBookDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-destructive"
                              disabled={busy}
                              onClick={() => setDeleteBook(b)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Currently issued ({activeIssues.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeIssues.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          No open issues
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeIssues.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell>
                            <p className="text-sm font-medium">{i.studentName}</p>
                            {i.studentCode && (
                              <p className="text-xs text-muted-foreground">{i.studentCode}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{i.bookTitle}</TableCell>
                          <TableCell className={`text-sm ${isPast(new Date(`${i.dueDate}T23:59:59`)) ? 'font-medium text-red-600' : ''}`}>
                            {format(new Date(`${i.dueDate}T00:00:00`), 'dd MMM')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={busy}
                              onClick={() => {
                                setReturnFine('');
                                setReturnTarget(i);
                              }}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" /> Return
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Unpaid fines ({unpaidFines.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead>Fine</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidFines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          No unpaid fines
                        </TableCell>
                      </TableRow>
                    ) : (
                      unpaidFines.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="text-sm font-medium">{i.studentName}</TableCell>
                          <TableCell className="text-sm">{i.bookTitle}</TableCell>
                          <TableCell className="text-sm font-semibold">
                            {i.fine.toLocaleString()} RWF
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={busy}
                              onClick={() =>
                                void run(
                                  () => tlWrite('/api/admin/library/fines', 'POST', { issueId: i.id }),
                                  'Fine payment posted.'
                                )
                              }
                            >
                              <Wallet className="mr-1 h-3 w-3" /> Post
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                The fine amount is the one recorded when the book was returned; it
                cannot be changed here. Postings are append-only.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* book create/edit dialog */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBookId === null ? 'Add new book' : 'Edit book'}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={bookForm.title}
                maxLength={200}
                onChange={(e) => setBookForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Book title"
              />
            </div>
            <div>
              <Label>Author</Label>
              <Input
                value={bookForm.author}
                maxLength={200}
                onChange={(e) => setBookForm((p) => ({ ...p, author: e.target.value }))}
                placeholder="Author name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ISBN</Label>
                <Input
                  value={bookForm.isbn}
                  maxLength={20}
                  onChange={(e) => setBookForm((p) => ({ ...p, isbn: e.target.value }))}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  value={bookForm.category}
                  maxLength={100}
                  onChange={(e) => setBookForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="e.g. Science"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Publisher</Label>
                <Input
                  value={bookForm.publisher}
                  maxLength={100}
                  onChange={(e) => setBookForm((p) => ({ ...p, publisher: e.target.value }))}
                />
              </div>
              <div>
                <Label>Published year</Label>
                <Input
                  type="number"
                  min="0"
                  value={bookForm.publishedYear}
                  onChange={(e) => setBookForm((p) => ({ ...p, publishedYear: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Copies *</Label>
                <Input
                  type="number"
                  min="0"
                  value={bookForm.quantity}
                  onChange={(e) => setBookForm((p) => ({ ...p, quantity: e.target.value }))}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Never below the copies currently issued.
                </p>
              </div>
              <div>
                <Label>Location (shelf)</Label>
                <Input
                  value={bookForm.location}
                  maxLength={100}
                  onChange={(e) => setBookForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. A-12"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => void saveBook()} disabled={busy} className="flex-1">
                {busy ? 'Saving…' : editingBookId === null ? 'Add book' : 'Save changes'}
              </Button>
              <Button variant="outline" onClick={() => setBookDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* issue dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue a book</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div>
              <Label>Book *</Label>
              <Select value={issueBookId} onValueChange={setIssueBookId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select book" />
                </SelectTrigger>
                <SelectContent>
                  {books.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.title} ({b.available}/{b.quantity} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student *</Label>
              <Select value={issueStudentId} onValueChange={setIssueStudentId}>
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
                One open copy of a given book per student.
              </p>
            </div>
            <div>
              <Label>Due date *</Label>
              <Input
                type="date"
                value={issueDueDate}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setIssueDueDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => void saveIssue()} disabled={busy} className="flex-1">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Issue book'}
              </Button>
              <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* return dialog */}
      <Dialog
        open={returnTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReturnTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return “{returnTarget?.bookTitle}”</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Issued to {returnTarget?.studentName} · due{' '}
              {returnTarget ? format(new Date(`${returnTarget.dueDate}T00:00:00`), 'dd MMM yyyy') : ''}
            </p>
            <div>
              <Label>Fine (RWF)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={returnFine}
                onChange={(e) => setReturnFine(e.target.value)}
                placeholder="0 for an on-time return"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The fine recorded here is the exact amount the fine payment will
                post later — it cannot be changed afterwards.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => void saveReturn()} disabled={busy} className="flex-1">
                {busy ? 'Saving…' : 'Confirm return'}
              </Button>
              <Button variant="outline" onClick={() => setReturnTarget(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* delete confirmation */}
      <AlertDialog open={deleteBook !== null} onOpenChange={(open) => !open && setDeleteBook(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteBook?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Books with any issue history are refused by the system.
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
