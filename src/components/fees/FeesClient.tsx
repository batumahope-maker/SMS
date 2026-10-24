'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CreditCard,
  Loader2,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';

interface FeeStructure {
  id: string;
  name: string;
  amount: number;
  classId: string | null;
  trade: string | null;
  level: string | null;
  term: string | null;
  academicYear: string;
  dueDate: Date | null;
  createdAt: Date;
}

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  receiptNumber: string;
  paidFor: string | null;
  paidAt: Date;
  student: {
    fullName: string;
    studentId: string;
    class: { name: string } | null;
  };
}

interface Defaulter {
  id: string;
  studentId: string;
  fullName: string;
  feeBalance: number;
  feePaid: number;
  class: { name: string } | null;
}

interface FeesClientProps {
  feeStructures: FeeStructure[];
  recentPayments: Payment[];
  totalCollected: number;
  totalBalance: number;
  defaulters: Defaulter[];
}

export function FeesClient({
  feeStructures: initialFeeStructures,
  recentPayments,
  totalCollected,
  totalBalance,
  defaulters,
}: FeesClientProps) {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>(initialFeeStructures);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    term: 'Term 1',
    academicYear: '2024-2025',
    dueDate: '',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredStructures = useMemo(() => {
    return feeStructures.filter((fs) =>
      fs.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [feeStructures, search]);

  const handleCreate = async () => {
    if (!formData.name || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/fee-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create fee structure');
      }

      const newStructure = await response.json();
      setFeeStructures([newStructure, ...feeStructures]);
      setIsCreateOpen(false);
      setFormData({
        name: '',
        amount: '',
        term: 'Term 1',
        academicYear: '2024-2025',
        dueDate: '',
      });
      toast.success('Fee structure created successfully');
    } catch (error) {
      toast.error('Failed to create fee structure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee Management</h1>
          <p className="text-muted-foreground">
            Manage fee structures, payments, and defaulter reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Fee Structure
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalCollected)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(totalBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Fee Structures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feeStructures.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Collection Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCollected + totalBalance > 0
                ? Math.round((totalCollected / (totalCollected + totalBalance)) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="structures" className="space-y-4">
        <TabsList>
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="payments">Recent Payments</TabsTrigger>
          <TabsTrigger value="defaulters">Fee Defaulters</TabsTrigger>
        </TabsList>

        <TabsContent value="structures">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Fee Structures</CardTitle>
                <div className="relative w-full md:w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search fee structures..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStructures.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No fee structures found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStructures.map((fs) => (
                        <TableRow key={fs.id}>
                          <TableCell className="font-medium">{fs.name}</TableCell>
                          <TableCell>{formatCurrency(fs.amount)}</TableCell>
                          <TableCell>{fs.term || '-'}</TableCell>
                          <TableCell>{fs.academicYear}</TableCell>
                          <TableCell>
                            {fs.dueDate ? format(new Date(fs.dueDate), 'MMM d, yyyy') : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Latest fee payments from students</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt No.</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment For</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No payments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.receiptNumber}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payment.student.fullName}</p>
                              <p className="text-xs text-muted-foreground">{payment.student.studentId}</p>
                            </div>
                          </TableCell>
                          <TableCell>{payment.student.class?.name || '-'}</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>{payment.paidFor || '-'}</TableCell>
                          <TableCell>{format(new Date(payment.paidAt), 'MMM d, yyyy')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaulters">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Fee Defaulters
              </CardTitle>
              <CardDescription>Students with outstanding fee balances</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {defaulters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No fee defaulters
                        </TableCell>
                      </TableRow>
                    ) : (
                      defaulters.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.studentId}</TableCell>
                          <TableCell>{d.fullName}</TableCell>
                          <TableCell>{d.class?.name || '-'}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(d.feePaid)}</TableCell>
                          <TableCell className="text-amber-600 font-medium">
                            {formatCurrency(d.feeBalance)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fee Structure</DialogTitle>
            <DialogDescription>
              Create a new fee structure for the school.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Fee Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Tuition Fee"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (RWF) *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="400000"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="term">Term</Label>
                <Select
                  value={formData.term}
                  onValueChange={(value) => setFormData({ ...formData, term: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Term 3">Term 3</SelectItem>
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
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Fee Structure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
