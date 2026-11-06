'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Search, Users } from 'lucide-react';
import { format } from 'date-fns';

interface User { id: string; username: string; email: string; role: string; status: string; lastLogin: Date | null; createdAt: Date; phone: string | null; }
interface UsersClientProps { users: User[]; counts: Record<string, number>; }

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800', teacher: 'bg-blue-100 text-blue-800',
  student: 'bg-green-100 text-green-800', parent: 'bg-orange-100 text-orange-800',
};
const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800', inactive: 'bg-gray-100 text-gray-800', suspended: 'bg-red-100 text-red-800',
};

export function UsersClient({ users, counts }: UsersClientProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filtered = users.filter(u => {
    const ms = u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const mr = roleFilter === 'all' || u.role === roleFilter;
    return ms && mr;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" />User management</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage all system user accounts and access</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Admins', key: 'admin', color: 'text-purple-600' },
          { label: 'Teachers', key: 'teacher', color: 'text-blue-600' },
          { label: 'Students', key: 'student', color: 'text-green-600' },
          { label: 'Parents', key: 'parent', color: 'text-orange-600' },
        ].map(({ label, key, color }) => (
          <Card key={key}><CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{counts[key] || 0}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" />All users ({users.length})</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search username or email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All roles</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="student">Student</SelectItem><SelectItem value="parent">Parent</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Username</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last login</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0
                  ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No users found</TableCell></TableRow>
                  : filtered.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium font-mono text-sm">{u.username}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[u.role] || ''}`}>{u.role}</span></TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[u.status] || ''}`}>{u.status}</span></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.lastLogin ? format(new Date(u.lastLogin), 'dd MMM yyyy HH:mm') : 'Never'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(u.createdAt), 'dd MMM yyyy')}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {users.length} users</p>
        </CardContent>
      </Card>
    </div>
  );
}
