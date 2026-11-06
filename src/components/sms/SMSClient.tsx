'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Loader2, CheckCircle, AlertCircle, Users, XCircle, DollarSign } from 'lucide-react';

interface SMSClientProps {
  classes: { id: string; name: string; _count: { students: number } }[];
  stats: { absentToday: number; studentsWithPhone: number; feeDefaulters: number };
  configured: boolean;
}

interface SendResult { sent: number; failed: number; skipped: number; total: number }

const quickTemplates = [
  { type: 'absent_today', label: 'Absence alert', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200 dark:bg-red-950/20', desc: 'Notify parents whose child was absent today' },
  { type: 'fees_reminder', label: 'Fee reminder', icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20', desc: 'Remind parents with outstanding fee balances' },
  { type: 'results_ready', label: 'Results available', icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20', desc: 'Tell parents that term results are ready' },
  { type: 'custom', label: 'Custom message', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/20', desc: 'Write your own message to all parents' },
];

export function SMSClient({ classes, stats, configured }: SMSClientProps) {
  const [type, setType] = useState('');
  const [classId, setClassId] = useState('all');
  const [term, setTerm] = useState('Term 1');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState('');

  async function handleSend() {
    if (!type) return;
    if (type === 'custom' && !customMessage.trim()) return;
    setSending(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          classId: classId !== 'all' ? classId : undefined,
          term: type === 'results_ready' ? term : undefined,
          customMessage: type === 'custom' ? customMessage : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-green-600" />SMS notifications
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send SMS messages to parents via Africa&apos;s Talking — works for all Rwandan networks (+250)
        </p>
      </div>

      {!configured && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">SMS not configured</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              Add <code className="bg-amber-100 px-1 rounded text-xs">AT_USERNAME</code> and <code className="bg-amber-100 px-1 rounded text-xs">AT_API_KEY</code> to your <code className="bg-amber-100 px-1 rounded text-xs">.env</code> file.
              Sign up free at <strong>africastalking.com</strong> — costs about 25 RWF per SMS in Rwanda.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3"><Users className="w-5 h-5 text-green-600" /><div><p className="text-xs text-muted-foreground">Parents with phone numbers</p><p className="text-2xl font-bold text-green-600">{stats.studentsWithPhone}</p></div></div>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3"><XCircle className="w-5 h-5 text-red-600" /><div><p className="text-xs text-muted-foreground">Absent today</p><p className="text-2xl font-bold text-red-600">{stats.absentToday}</p></div></div>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3"><DollarSign className="w-5 h-5 text-orange-600" /><div><p className="text-xs text-muted-foreground">Fee defaulters</p><p className="text-2xl font-bold text-orange-600">{stats.feeDefaulters}</p></div></div>
        </CardContent></Card>
      </div>

      <div>
        <p className="text-sm font-medium mb-3">1. Choose message type</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickTemplates.map(t => (
            <button key={t.type} onClick={() => setType(t.type)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${type === t.type ? 'border-current ' + t.bg : 'border-border hover:border-muted-foreground/30'}`}>
              <t.icon className={`w-5 h-5 mb-1.5 ${type === t.type ? t.color : 'text-muted-foreground'}`} style={{ fontSize: 16 }} />
              <p className={`font-medium text-sm ${type === t.type ? t.color : ''}`}>{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {type && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Configure &amp; send</CardTitle>
            <CardDescription>Optionally filter by class, then click Send</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">Class filter</label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes ({stats.studentsWithPhone} parents)</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c._count.students} students)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {type === 'results_ready' && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Term</label>
                  <Select value={term} onValueChange={setTerm}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Term 1">Term 1</SelectItem>
                      <SelectItem value="Term 2">Term 2</SelectItem>
                      <SelectItem value="Term 3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {type === 'custom' && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Your message</label>
                <Textarea
                  rows={3}
                  maxLength={160}
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Type your message here (max 160 characters for 1 SMS)..."
                />
                <p className="text-xs text-muted-foreground mt-1">{customMessage.length}/160 characters</p>
              </div>
            )}

            {type !== 'custom' && (
              <div className="rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Message preview</p>
                {type === 'absent_today' && <p>Dear parent, your child [name] was absent from school today. Please contact the school if you need assistance. - ESSJT</p>}
                {type === 'fees_reminder' && <p>Dear parent of [name], this is a reminder that there is an outstanding fee balance. Please visit the school to settle. Thank you. - ESSJT</p>}
                {type === 'results_ready' && <p>Dear parent of [name], {term} results are now available. Please visit the school or check the portal. - ESSJT</p>}
              </div>
            )}

            <Button onClick={handleSend} disabled={sending || !configured || (type === 'custom' && !customMessage.trim())}
              className="bg-green-600 hover:bg-green-700 text-white">
              {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send SMS</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <p className="font-semibold text-green-800 dark:text-green-300">SMS batch complete</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white dark:bg-background rounded-lg p-3 border">
                <p className="text-2xl font-bold text-green-600">{result.sent}</p>
                <p className="text-xs text-muted-foreground">Sent</p>
              </div>
              <div className="bg-white dark:bg-background rounded-lg p-3 border">
                <p className="text-2xl font-bold text-orange-600">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped (no phone)</p>
              </div>
              <div className="bg-white dark:bg-background rounded-lg p-3 border">
                <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
