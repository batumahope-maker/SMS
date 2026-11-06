'use client';

import { useState, useMemo } from 'react';
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
  Users,
  BookOpen,
  School,
  Loader2,
} from 'lucide-react';

interface Teacher {
  id: string;
  fullName: string;
  teacherId: string;
}

interface ClassItem {
  id: string;
  name: string;
  trade: string;
  level: string;
  section: string;
  status: string;
  academicYear: string | null;
  teacher: { fullName: string; teacherId: string } | null;
  studentCount: number;
  subjectCount: number;
}

interface ClassesClientProps {
  classes: ClassItem[];
  teachers: Teacher[];
}

export function ClassesClient({ classes: initialClasses, teachers }: ClassesClientProps) {
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    trade: '',
    level: 'L3',
    section: 'A',
    teacherId: '',
    academicYear: '2024-2025',
  });

  // Filter classes
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchesSearch =
        search === '' ||
        cls.name.toLowerCase().includes(search.toLowerCase()) ||
        cls.trade.toLowerCase().includes(search.toLowerCase());

      const matchesLevel = filterLevel === 'all' || cls.level === filterLevel;

      return matchesSearch && matchesLevel;
    });
  }, [classes, search, filterLevel]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.trade || !formData.level) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create class');
      }

      const newClass = await response.json();
      setClasses([newClass, ...classes]);
      setIsCreateOpen(false);
      setFormData({
        name: '',
        trade: '',
        level: 'L3',
        section: 'A',
        teacherId: '',
        academicYear: '2024-2025',
      });
      toast.success('Class created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">
            Manage classes and their assignments
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Class
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {classes.filter((c) => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classes.reduce((sum, c) => sum + c.studentCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Subjects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classes.reduce((sum, c) => sum + c.subjectCount, 0)}
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
                placeholder="Search classes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="L3">L3</SelectItem>
                <SelectItem value="L4">L4</SelectItem>
                <SelectItem value="L5">L5</SelectItem>
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
                  <TableHead>Class Name</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Trade / Combination</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Class Teacher</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <School className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      No classes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClasses.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(cls as any).systemType === 'reb' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {(cls as any).systemType === 'reb' ? 'REB' : 'TVET'}
                        </span>
                      </TableCell>
                      <TableCell>{(cls as any).combination || cls.trade || '—'}</TableCell>
                      <TableCell>{cls.level}</TableCell>
                      <TableCell>{cls.section}</TableCell>
                      <TableCell>
                        {cls.teacher ? (
                          <span>{cls.teacher.fullName}</span>
                        ) : (
                          <span className="text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Users className="w-3 h-3" />
                          {cls.studentCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <BookOpen className="w-3 h-3" />
                          {cls.subjectCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(cls.status)}>
                          {cls.status}
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
                                setSelectedClass(cls);
                                setIsViewOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Class</DialogTitle>
            <DialogDescription>
              Create a new class for the school.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Class Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Software Development L3 A"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trade">Trade *</Label>
                <Select
                  value={formData.trade}
                  onValueChange={(value) => setFormData({ ...formData, trade: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Software Development">Software Dev</SelectItem>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Mechanics">Mechanics</SelectItem>
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level *</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => setFormData({ ...formData, level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L3">L3</SelectItem>
                    <SelectItem value="L4">L4</SelectItem>
                    <SelectItem value="L5">L5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Select
                  value={formData.section}
                  onValueChange={(value) => setFormData({ ...formData, section: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacherId">Class Teacher</Label>
              <Select
                value={formData.teacherId}
                onValueChange={(value) => setFormData({ ...formData, teacherId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                placeholder="2024-2025"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Class Details</DialogTitle>
          </DialogHeader>
          {selectedClass && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Class Name</p>
                  <p className="font-medium">{selectedClass.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trade</p>
                  <p className="font-medium">{selectedClass.trade}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Level</p>
                  <p className="font-medium">{selectedClass.level}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Section</p>
                  <p className="font-medium">{selectedClass.section}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Class Teacher</p>
                  <p className="font-medium">{selectedClass.teacher?.fullName || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Students</p>
                  <p className="font-medium">{selectedClass.studentCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subjects</p>
                  <p className="font-medium">{selectedClass.subjectCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedClass.status)}>
                    {selectedClass.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
