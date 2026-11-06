'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Announcement { id: string; title: string; content: string; audience: string; priority: string; createdAt: Date }
interface AnnouncementsViewClientProps { announcements: Announcement[]; role: string }

const priorityCls: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800 border-red-200', high: 'bg-orange-100 text-orange-800 border-orange-200',
  normal: 'bg-blue-100 text-blue-800 border-blue-200',
};

export function AnnouncementsViewClient({ announcements, role }: AnnouncementsViewClientProps) {
  const [priorityFilter, setPriorityFilter] = useState('all');
  const filtered = priorityFilter === 'all' ? announcements : announcements.filter(a => a.priority === priorityFilter);
  const urgent = announcements.filter(a => a.priority === 'urgent' || a.priority === 'high');

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="w-6 h-6" />Announcements</h1><p className="text-muted-foreground text-sm mt-1">School announcements and notices</p></div>

      {urgent.length > 0 && (
        <div className="space-y-2">
          {urgent.map(a => (
            <div key={a.id} className={`flex items-start gap-3 p-4 rounded-lg border ${priorityCls[a.priority]}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div><p className="font-medium">{a.title}</p><p className="text-sm mt-1">{a.content}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} announcement{filtered.length !== 1 ? 's' : ''}</p>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All priorities</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="normal">Normal</SelectItem></SelectContent>
        </Select>
      </div>

      {filtered.length === 0
        ? <Card><CardContent className="py-16 text-center text-muted-foreground">No announcements yet.</CardContent></Card>
        : <div className="space-y-3">
            {filtered.map(a => (
              <Card key={a.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{a.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityCls[a.priority]}`}>{a.priority}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{a.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0 mt-0.5"><Clock className="w-3 h-3" />{format(new Date(a.createdAt), 'dd MMM yyyy')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>}
    </div>
  );
}
