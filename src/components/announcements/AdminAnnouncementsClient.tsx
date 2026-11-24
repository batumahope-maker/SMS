'use client';

import { useEffect, useState } from 'react';
import { AnnouncementsClient } from '@/components/announcements/AnnouncementsClient';
import type { Announcement } from '@/components/announcements/AnnouncementsClient';

/**
 * Admin announcements page in synthetic demo mode: wires the
 * AnnouncementsClient (create form) to the server API, which posts into the
 * in-memory demo data.
 */
interface ApiAnnouncement {
  id: number;
  title: string;
  content: string;
  priority: string;
  targetAudience: string;
  createdBy: number | null;
  createdAt: Date;
}

export function AdminAnnouncementsClient() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/announcements', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: ApiAnnouncement[]) => {
        if (cancelled) return;
        setAnnouncements(
          (rows ?? []).map((row) => ({
            id: String(row.id),
            title: row.title,
            content: row.content,
            audience: row.targetAudience,
            priority: row.priority,
            imageUrl: null,
            createdAt: row.createdAt,
          }))
        );
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
    return <p className="text-sm text-muted-foreground">Loading announcements…</p>;
  }

  return <AnnouncementsClient announcements={announcements} />;
}
