import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const books = await db.book.findMany({
    where: { schoolId: session.user.schoolId },
    include: { _count: { select: { issues: true } } },
    orderBy: { title: 'asc' },
  });
  return NextResponse.json(books);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { title, author, isbn, category, quantity, location } = body;
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const qty = parseInt(quantity) || 1;
  const book = await db.book.create({
    data: {
      schoolId: session.user.schoolId,
      title, author: author || null, isbn: isbn || null,
      category: category || null, quantity: qty, available: qty,
      location: location || null,
    },
  });
  return NextResponse.json(book);
}
