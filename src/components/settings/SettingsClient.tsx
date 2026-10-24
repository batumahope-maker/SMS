'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings, School, Shield, Globe, CheckCircle } from 'lucide-react';

interface School {
  id: string; name: string; slug: string; logo: string | null; address: string | null;
  phone: string | null; email: string | null; website: string | null; motto: string | null;
  primaryColor: string; secondaryColor: string; language: string; timezone: string;
  academicYear: string; licenseStatus: string; plan: string;
}
interface License {
  key: string; plan: string; maxStudents: number; maxTeachers: number; expiresAt: Date; status: string;
}
interface SettingsClientProps { school: School; license: License | null; }

export function SettingsClient({ school, license }: SettingsClientProps) {
  const [form, setForm] = useState({ ...school });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  const planColors: Record<string, string> = { basic: 'bg-gray-100 text-gray-800', standard: 'bg-blue-100 text-blue-800', premium: 'bg-purple-100 text-purple-800' };
  const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-800', expired: 'bg-red-100 text-red-800', trial: 'bg-yellow-100 text-yellow-800' };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6" />Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your school profile and system configuration</p>
      </div>

      {/* School Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><School className="w-4 h-4" />School information</CardTitle>
          <CardDescription>Update your school's profile and contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>School name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>School slug (URL)</Label><Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} /></div>
            <div className="sm:col-span-2">
              <Label>School logo URL</Label>
              <div className="flex gap-2 items-center mt-1">
                {form.logo && <img src={form.logo} alt="Preview" className="w-10 h-10 rounded-lg object-contain border flex-shrink-0" />}
                <Input value={form.logo || ''} onChange={e => setForm(p => ({ ...p, logo: e.target.value }))} placeholder="https://example.com/your-school-logo.png" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Upload your logo anywhere (Google Drive, Imgur, Cloudinary) and paste the direct image link here. It will appear on all pages and the login screen.</p>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div><Label>Website</Label><Input value={form.website || ''} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} /></div>
            <div><Label>Motto</Label><Input value={form.motto || ''} onChange={e => setForm(p => ({ ...p, motto: e.target.value }))} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" />Academic & regional settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Language</Label>
              <Select value={form.language} onValueChange={v => setForm(p => ({ ...p, language: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="rw">Kinyarwanda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Timezone</Label>
              <Select value={form.timezone} onValueChange={v => setForm(p => ({ ...p, timezone: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Kigali">Africa/Kigali (UTC+2)</SelectItem>
                  <SelectItem value="Africa/Nairobi">Africa/Nairobi (UTC+3)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Academic year</Label><Input value={form.academicYear} onChange={e => setForm(p => ({ ...p, academicYear: e.target.value }))} placeholder="2026" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Primary colour</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.primaryColor} onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={form.primaryColor} onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))} className="flex-1" />
              </div>
            </div>
            <div><Label>Secondary colour</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.secondaryColor} onChange={e => setForm(p => ({ ...p, secondaryColor: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={form.secondaryColor} onChange={e => setForm(p => ({ ...p, secondaryColor: e.target.value }))} className="flex-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* License */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" />License & plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${planColors[school.plan] || planColors.basic}`}>{school.plan.charAt(0).toUpperCase() + school.plan.slice(1)} plan</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[school.licenseStatus] || statusColors.trial}`}>{school.licenseStatus}</span>
          </div>
          {license ? (
            <div className="rounded-lg bg-secondary/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">License key</span><span className="font-mono text-xs">{license.key.substring(0, 20)}...</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Max students</span><span>{license.maxStudents}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Max teachers</span><span>{license.maxTeachers}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Expires</span><span>{new Date(license.expiresAt).toLocaleDateString()}</span></div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground text-center">
              No license key configured. Contact support to activate your license.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</Button>
        {saved && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="w-4 h-4" />Saved successfully</span>}
      </div>
    </div>
  );
}
