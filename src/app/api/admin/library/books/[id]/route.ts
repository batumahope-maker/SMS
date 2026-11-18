import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, guardWriter, parseBody, parseId, errorResponse } from '@/lib/admin-write-route';
import { updateBook, deleteBook } from '@/lib/db-writer-transport-library';

/** Validates an optional non-negative integer (e.g. published year). */
function parseOptionalInt(value: unknown): { value: number | null; invalid: boolean } {
  if (value === undefined || value === null || value === '') return { value: null, invalid: false };
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) return { value: null, invalid: true };
  return { value: n, invalid: false };
}

/**
 * PUT /api/admin/library/books/:id — update a book via sp_update_book.
 * Quantity may never drop below currently issued copies; available is
 * recomputed transactionally inside the procedure.
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
  const bookId = parseId(Number(id), 'book id');
  if (bookId === null) {
    return NextResponse.json({ error: 'Invalid book id.' }, { status: 400 });
  }

  const parsed = await parseBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const title = body.title;
  if (typeof title !== 'string' || title.trim() === '') {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }
  const quantity = parseId(body.quantity, 'quantity');
  if (quantity === null || quantity < 0) {
    return NextResponse.json({ error: 'Quantity must be an integer of at least 0.' }, { status: 400 });
  }
  if (body.isbn !== undefined && body.isbn !== null && typeof body.isbn !== 'string') {
    return NextResponse.json({ error: 'Invalid ISBN.' }, { status: 400 });
  }
  const publishedYear = parseOptionalInt(body.publishedYear);
  if (publishedYear.invalid) {
    return NextResponse.json({ error: 'Published year must be a non-negative integer.' }, { status: 400 });
  }

  try {
    const result = await updateBook({
      bookId,
      title: title.trim(),
      author: typeof body.author === 'string' ? body.author : null,
      isbn: typeof body.isbn === 'string' && body.isbn.trim() !== '' ? body.isbn.trim() : null,
      category: typeof body.category === 'string' ? body.category : null,
      publisher: typeof body.publisher === 'string' ? body.publisher : null,
      publishedYear: publishedYear.value,
      quantity,
      location: typeof body.location === 'string' ? body.location : null,
    });
    return NextResponse.json({ ok: true, bookId: result.bookId });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * DELETE /api/admin/library/books/:id — delete via sp_delete_book.
 * Refused by the procedure when any issue history exists.
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
  const bookId = parseId(Number(id), 'book id');
  if (bookId === null) {
    return NextResponse.json({ error: 'Invalid book id.' }, { status: 400 });
  }

  try {
    await deleteBook(bookId);
    return NextResponse.json({ ok: true, bookId });
  } catch (error) {
    return errorResponse(error);
  }
}
