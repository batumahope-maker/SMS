import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { EventsClient } from '@/components/events/EventsClient';
export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  // Fetch events
  const events = await db.event.findMany({
    where: { schoolId: session.user.schoolId },
    orderBy: { date: 'asc' },
  });

  const today = new Date();
  const upcomingEvents = events.filter(e => new Date(e.date) >= today);
  const pastEvents = events.filter(e => new Date(e.date) < today);

  return (
    <EventsClient
      events={events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        date: e.date,
        endDate: e.endDate,
        time: e.time,
        location: e.location,
        eventType: e.eventType,
        status: e.status,
      }))}
      upcomingCount={upcomingEvents.length}
      pastCount={pastEvents.length}
    />
  );
}
