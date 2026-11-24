'use client';

import { useEffect, useState } from 'react';
import { EventsClient, Event, ApiEventRow, toEvent } from '@/components/events/EventsClient';

/**
 * Admin events page in synthetic demo mode: wires the EventsClient (create
 * form) to the server API, which posts into the in-memory demo data.
 */
export function AdminEventsClient() {
  const [events, setEvents] = useState<Event[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/events', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: ApiEventRow[]) => {
        if (cancelled) return;
        setEvents((rows ?? []).map(toEvent));
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Loading events…</p>;
  }

  const today = new Date();
  const upcomingCount = events.filter((event) => new Date(event.date) >= today).length;
  const pastCount = events.length - upcomingCount;

  return <EventsClient events={events} upcomingCount={upcomingCount} pastCount={pastCount} />;
}
