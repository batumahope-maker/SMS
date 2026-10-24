import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [received, sent] = await Promise.all([
    db.message.findMany({
      where: { receiverId: session.user.id },
      include: { sender: { select: { username: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.message.findMany({
      where: { senderId: session.user.id },
      include: { receiver: { select: { username: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return NextResponse.json({ received, sent });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { receiverId, subject, content } = await request.json();
  if (!receiverId || !content) {
    return NextResponse.json({ error: 'receiverId and content are required' }, { status: 400 });
  }

  // Verify receiver exists in same school
  const receiver = await db.user.findFirst({
    where: { id: receiverId, schoolId: session.user.schoolId },
  });
  if (!receiver) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });

  const message = await db.message.create({
    data: {
      senderId: session.user.id,
      receiverId,
      subject: subject || null,
      content,
    },
    include: {
      sender: { select: { username: true, role: true } },
      receiver: { select: { username: true, role: true } },
    },
  });

  // Create notification for recipient
  await db.notification.create({
    data: {
      userId: receiverId,
      title: `New message from ${session.user.username || 'user'}`,
      message: subject || content.substring(0, 80),
      type: 'info',
      link: `/${receiver.role}/messages`,
    },
  });

  return NextResponse.json(message, { status: 201 });
}
