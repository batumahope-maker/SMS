'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Bell, Plus, Megaphone } from 'lucide-react';
import { format } from 'date-fns';

interface Message { id: string; subject: string | null; content: string; read: boolean; createdAt: Date; sender?: { username: string; role: string }; receiver?: { username: string; role: string } }
interface Announcement { id: string; title: string; content: string; priority: string; createdAt: Date }
interface Staff { id: string; username: string; role: string }

const priorityColors: Record<string, string> = { urgent: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', normal: 'bg-blue-100 text-blue-800' };
const roleColors: Record<string, string> = { admin: 'bg-purple-100 text-purple-800', teacher: 'bg-blue-100 text-blue-800' };

export function ParentMessagesClient({ received, sent, announcements, staff, userId }: {
  received: Message[]; sent: Message[]; announcements: Announcement[]; staff: Staff[]; userId: string;
}) {
  const [tab, setTab] = useState<'inbox' | 'sent' | 'announcements'>('inbox');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ receiverId: '', subject: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Message | null>(null);

  const unread = received.filter(m => !m.read).length;

  async function handleSend() {
    if (!form.receiverId || !form.content) return;
    setSaving(true);
    try {
      await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setOpen(false);
      setForm({ receiverId: '', subject: '', content: '' });
      window.location.reload();
    } finally { setSaving(false); }
  }

  async function markRead(id: string) {
    await fetch(`/api/messages/${id}/read`, { method: 'PATCH' });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="w-6 h-6" />Messages</h1>
          <p className="text-muted-foreground text-sm mt-1">Communicate with teachers and school administration</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />New message</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Send a message</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label>To</Label>
                <Select value={form.receiverId} onValueChange={v => setForm(p => ({ ...p, receiverId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger>
                  <SelectContent>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.username} ({s.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Question about fees" /></div>
              <div><Label>Message *</Label><Textarea rows={4} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Type your message here..." /></div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSend} disabled={saving || !form.receiverId || !form.content} className="flex-1"><Send className="w-4 h-4 mr-2" />{saving ? 'Sending...' : 'Send message'}</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        {([
          { key: 'inbox', label: `Inbox${unread > 0 ? ` (${unread})` : ''}` },
          { key: 'sent', label: 'Sent' },
          { key: 'announcements', label: `Announcements${announcements.length > 0 ? ` (${announcements.length})` : ''}` },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'inbox' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Inbox ({received.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {received.length === 0
                ? <p className="text-center py-8 text-muted-foreground text-sm">No messages yet</p>
                : received.map(m => (
                  <div key={m.id} onClick={() => { setSelected(m); markRead(m.id); }} className={`flex items-start gap-3 p-4 border-b last:border-b-0 cursor-pointer hover:bg-secondary/50 transition-colors ${!m.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">{m.sender?.username}</span>
                        {m.sender?.role && <span className={`text-xs px-1.5 py-0.5 rounded ${roleColors[m.sender.role]}`}>{m.sender.role}</span>}
                        {!m.read && <span className="w-2 h-2 rounded-full bg-blue-500 ml-auto flex-shrink-0" />}
                      </div>
                      {m.subject && <p className="text-sm font-medium truncate">{m.subject}</p>}
                      <p className="text-xs text-muted-foreground truncate">{m.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(m.createdAt), 'dd MMM, HH:mm')}</p>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Message detail</CardTitle></CardHeader>
            <CardContent>
              {!selected
                ? <div className="py-12 text-center text-muted-foreground text-sm">Select a message to read it</div>
                : <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{selected.sender?.username}</span>
                      {selected.sender?.role && <span className={`text-xs px-1.5 py-0.5 rounded ${roleColors[selected.sender.role]}`}>{selected.sender.role}</span>}
                    </div>
                    {selected.subject && <p className="font-semibold">{selected.subject}</p>}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.content}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(selected.createdAt), 'EEEE dd MMM yyyy, HH:mm')}</p>
                  </div>}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'sent' && (
        <Card>
          <CardContent className="p-0">
            {sent.length === 0
              ? <p className="text-center py-8 text-muted-foreground text-sm">No sent messages</p>
              : sent.map(m => (
                <div key={m.id} className="flex items-start gap-3 p-4 border-b last:border-b-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><span className="text-sm">To: <span className="font-medium">{m.receiver?.username}</span></span></div>
                    {m.subject && <p className="text-sm font-medium">{m.subject}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-2">{m.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(m.createdAt), 'dd MMM, HH:mm')}</p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {tab === 'announcements' && (
        <div className="space-y-4">
          {announcements.length === 0
            ? <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No announcements</CardContent></Card>
            : announcements.map(a => (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${priorityColors[a.priority] || priorityColors.normal}`}>{a.priority}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-3">{format(new Date(a.createdAt), 'EEEE dd MMM yyyy')}</p>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
