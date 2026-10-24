'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Download,
  Filter,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

interface Student {
  id: string;
  studentId: string;
  fullName: string;
  gender: string;
  dateOfBirth: Date | null;
  phone: string | null;
  address: string | null;
  trade: string;
  level: string;
  section: string;
  classId: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  feePaid: number;
  feeBalance: number;
  status: string;
  enrollmentDate: Date;
  createdAt: Date;
  class: { id: string; name: string; trade: string; level: string; section: string } | null;
  user: { email: string | null; phone: string | null } | null;
}

interface Class {
  id: string;
  name: string;
  trade: string;
  level: string;
  section: string;
}

interface StudentsClientProps {
  students: Student[];
  classes: Class[];
}

export function StudentsClient({ students: initialStudents, classes }: StudentsClientProps) {
  const { data: session } = useSession();
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    fullName: '',
    gender: 'Male',
    dateOfBirth: '',
    phone: '',
    address: '',
    systemType: 'tvet',
    trade: '',
    combination: '',
    level: '',
    section: '',
    classId: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    email: '',
  });

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        search === '' ||
        student.fullName.toLowerCase().includes(search.toLowerCase()) ||
        student.studentId.toLowerCase().includes(search.toLowerCase()) ||
        (student.guardianName?.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchesClass = filterClass === 'all' || student.classId === filterClass;
      const matchesGender = filterGender === 'all' || student.gender === filterGender;
      const matchesStatus = filterStatus === 'all' || student.status === filterStatus;

      return matchesSearch && matchesClass && matchesGender && matchesStatus;
    });
  }, [students, search, filterClass, filterGender, filterStatus]);

  const resetForm = () => {
    setFormData({
      studentId: '',
      fullName: '',
      gender: 'Male',
      dateOfBirth: '',
      phone: '',
      address: '',
      trade: '',
      level: '',
      section: '',
      classId: '',
      guardianName: '',
      guardianPhone: '',
      guardianEmail: '',
      email: '',
    });
  };

  const handleCreate = async () => {
    if (!formData.studentId || !formData.fullName || !formData.gender) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create student');
      }

      const newStudent = await response.json();
      setStudents([newStudent, ...students]);
      setIsCreateOpen(false);
      resetForm();
      toast.success('Student created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create student');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedStudent || !formData.fullName || !formData.gender) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update student');
      }

      const updatedStudent = await response.json();
      setStudents(
        students.map((s) => (s.id === selectedStudent.id ? updatedStudent : s))
      );
      setIsEditOpen(false);
      setSelectedStudent(null);
      resetForm();
      toast.success('Student updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update student');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/students/${selectedStudent.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete student');
      }

      setStudents(students.filter((s) => s.id !== selectedStudent.id));
      setIsDeleteOpen(false);
      setSelectedStudent(null);
      toast.success('Student deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete student');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      studentId: student.studentId,
      fullName: student.fullName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth ? format(new Date(student.dateOfBirth), 'yyyy-MM-dd') : '',
      phone: student.phone || '',
      address: student.address || '',
      systemType: (student as any).systemType || 'tvet',
      trade: student.trade || '',
      combination: (student as any).combination || '',
      level: student.level || '',
      section: student.section || '',
      classId: student.classId || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      guardianEmail: student.guardianEmail || '',
      email: student.user?.email || '',
    });
    setIsEditOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'graduated':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">
            Manage student records and information
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Male Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter((s) => s.gender === 'Male').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Female Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter((s) => s.gender === 'Female').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Fee Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(students.reduce((sum, s) => sum + s.feeBalance, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterGender} onValueChange={setFilterGender}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gender</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Trade / Combination</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Fee Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.studentId}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{student.fullName}</p>
                          <p className="text-xs text-muted-foreground">{student.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{student.gender}</TableCell>
                      <TableCell>{student.class?.name || '-'}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(student as any).systemType === 'reb' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {(student as any).systemType === 'reb' ? 'REB' : 'TVET'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{(student as any).combination || student.trade || '—'}</TableCell>
                      <TableCell className="text-sm">{student.level || '—'}</TableCell>
                      <TableCell>
                        <span className={student.feeBalance > 0 ? 'text-amber-600 font-medium' : ''}>
                          {formatCurrency(student.feeBalance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(student.status)}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStudent(student);
                                setIsViewOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(student)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStudent(student);
                                setIsDeleteOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Enter the student information below. An account will be created automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID *</Label>
                <Input
                  id="studentId"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="STU0001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@school.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+250 7XX XXX XXX"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Kigali, Rwanda"
              />
            </div>
            {/* System type toggle */}
            <div className="space-y-2">
              <Label>School system</Label>
              <div className="flex gap-2">
                {[{ v: 'tvet', label: 'TVET (L3/L4/L5)' }, { v: 'reb', label: "REB (S1–S6)" }].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setFormData({ ...formData, systemType: opt.v, trade: '', combination: '', level: '' })}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${formData.systemType === opt.v ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30' : 'border-border text-muted-foreground hover:border-emerald-300'}`}
                  >{opt.label}</button>
                ))}
              </div>
            </div>

            {formData.systemType === 'tvet' ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Trade / Programme</Label>
                  <Select value={formData.trade} onValueChange={v => setFormData({ ...formData, trade: v })}>
                    <SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {['Software Development','Electronics & Telecommunications','Electricity','Mechanics & Automotive','Civil & Construction','Carpentry & Joinery','Plumbing & Sanitation','Welding & Metal Fabrication','Tailoring & Fashion Design','Catering & Food Processing','Agriculture & Food Science','Accounting & Finance','Business Management','Hairdressing & Beauty'].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select value={formData.level} onValueChange={v => setFormData({ ...formData, level: v })}>
                    <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L3">L3</SelectItem>
                      <SelectItem value="L4">L4</SelectItem>
                      <SelectItem value="L5">L5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={formData.section} onValueChange={v => setFormData({ ...formData, section: v })}>
                    <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                    <SelectContent>
                      {['A','B','C','D'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select value={formData.level} onValueChange={v => setFormData({ ...formData, level: v })}>
                    <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S1" disabled>— O&apos;Level —</SelectItem>
                      {['S1','S2','S3'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      <SelectItem value="S4" disabled>— A&apos;Level —</SelectItem>
                      {['S4','S5','S6'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Combination</Label>
                  <Select value={formData.combination} onValueChange={v => setFormData({ ...formData, combination: v })}>
                    <SelectTrigger><SelectValue placeholder="Combination" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {(['S4','S5','S6'].includes(formData.level)
                        ? ['MPC','MPG','MCB','MEG','HEG','HGL','HPE','PCB','PCM','ECS','HKL','BCG']
                        : ['MCE','MPC','MEG','HEG','HGL','HPE','PCB','PCM','HKL','ECS']
                      ).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={formData.section} onValueChange={v => setFormData({ ...formData, section: v })}>
                    <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                    <SelectContent>
                      {['A','B','C','D'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="classId">Class</Label>
              <Select
                value={formData.classId}
                onValueChange={(value) => setFormData({ ...formData, classId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Guardian Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guardianName">Guardian Name</Label>
                  <Input
                    id="guardianName"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    placeholder="Parent/Guardian Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianPhone">Guardian Phone</Label>
                  <Input
                    id="guardianPhone"
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                    placeholder="+250 7XX XXX XXX"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="guardianEmail">Guardian Email</Label>
                <Input
                  id="guardianEmail"
                  type="email"
                  value={formData.guardianEmail}
                  onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                  placeholder="guardian@email.com"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-studentId">Student ID</Label>
                <Input
                  id="edit-studentId"
                  value={formData.studentId}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Full Name *</Label>
                <Input
                  id="edit-fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-gender">Gender *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dateOfBirth">Date of Birth</Label>
                <Input
                  id="edit-dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-classId">Class</Label>
              <Select
                value={formData.classId}
                onValueChange={(value) => setFormData({ ...formData, classId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-guardianName">Guardian Name</Label>
                <Input
                  id="edit-guardianName"
                  value={formData.guardianName}
                  onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-guardianPhone">Guardian Phone</Label>
                <Input
                  id="edit-guardianPhone"
                  value={formData.guardianPhone}
                  onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Student ID</p>
                  <p className="font-medium">{selectedStudent.studentId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedStudent.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium">{selectedStudent.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {selectedStudent.dateOfBirth
                      ? format(new Date(selectedStudent.dateOfBirth), 'PPP')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedStudent.user?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedStudent.phone || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{selectedStudent.address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-medium">{selectedStudent.class?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trade</p>
                  <p className="font-medium">{selectedStudent.trade || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Level</p>
                  <p className="font-medium">{selectedStudent.level || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Section</p>
                  <p className="font-medium">{selectedStudent.section || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fee Paid</p>
                  <p className="font-medium text-green-600">
                    {formatCurrency(selectedStudent.feePaid)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fee Balance</p>
                  <p className="font-medium text-amber-600">
                    {formatCurrency(selectedStudent.feeBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedStudent.status)}>
                    {selectedStudent.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enrollment Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedStudent.enrollmentDate), 'PPP')}
                  </p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Guardian Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Guardian Name</p>
                    <p className="font-medium">{selectedStudent.guardianName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Guardian Phone</p>
                    <p className="font-medium">{selectedStudent.guardianPhone || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Guardian Email</p>
                    <p className="font-medium">{selectedStudent.guardianEmail || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            {selectedStudent && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/qr-card?studentId=${selectedStudent.id}`} target="_blank" rel="noreferrer">
                    ID Card
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/report-card?studentId=${selectedStudent.id}&term=Term 1`} target="_blank" rel="noreferrer">
                    Report Card
                  </a>
                </Button>
              </>
            )}
            <Button onClick={() => { setIsViewOpen(false); openEdit(selectedStudent!); }}>
              Edit Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedStudent?.fullName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
