import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// GET - preview what promotion would do
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');

  const students = await db.student.findMany({
    where: {
      schoolId: session.user.schoolId,
      status: 'active',
      ...(classId ? { classId } : {}),
    },
    include: {
      class: { select: { name: true, level: true, trade: true } },
      marks: { select: { marks: true } },
      _count: { select: { marks: true } },
    },
    orderBy: { fullName: 'asc' },
  });

  const preview = students.map(s => {
    const avg = s.marks.length > 0
      ? Math.round(s.marks.reduce((a, m) => a + m.marks, 0) / s.marks.length) : null;
    const passed = avg !== null ? avg >= 50 : null;
    return {
      id: s.id,
      studentId: s.studentId,
      fullName: s.fullName,
      currentClass: s.class?.name || `${s.trade} ${s.level}${s.section}`,
      currentLevel: s.level,
      currentTrade: s.trade,
      currentSection: s.section,
      average: avg,
      passed,
      marksCount: s._count.marks,
      recommendation: passed === null ? 'no_data' : passed ? 'promote' : 'repeat',
    };
  });

  return NextResponse.json({
    total: preview.length,
    toPromote: preview.filter(s => s.recommendation === 'promote').length,
    toRepeat: preview.filter(s => s.recommendation === 'repeat').length,
    noData: preview.filter(s => s.recommendation === 'no_data').length,
    students: preview,
  });
}

// POST - execute promotion
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { actions } = await request.json();
  // actions: [{ studentId, action: 'promote'|'repeat'|'graduate'|'withdraw', newClassId? }]

  if (!Array.isArray(actions) || actions.length === 0) {
    return NextResponse.json({ error: 'actions array required' }, { status: 400 });
  }

  const results = [];

  for (const action of actions) {
    const { studentId, action: act, newClassId } = action;
    try {
      if (act === 'promote' && newClassId) {
        // Move to new class
        const newClass = await db.class.findUnique({ where: { id: newClassId } });
        if (!newClass || newClass.schoolId !== session.user.schoolId) {
          results.push({ studentId, success: false, error: 'New class not found' });
          continue;
        }
        await db.student.update({
          where: { id: studentId },
          data: {
            classId: newClassId,
            level: newClass.level,
            trade: newClass.trade,
            section: newClass.section,
          },
        });
        results.push({ studentId, success: true, action: 'promoted', newClass: newClass.name });

      } else if (act === 'graduate') {
        await db.student.update({
          where: { id: studentId },
          data: { status: 'graduated' },
        });
        results.push({ studentId, success: true, action: 'graduated' });

      } else if (act === 'repeat') {
        // Keep same class, just log it
        results.push({ studentId, success: true, action: 'repeating' });

      } else if (act === 'withdraw') {
        await db.student.update({
          where: { id: studentId },
          data: { status: 'inactive' },
        });
        results.push({ studentId, success: true, action: 'withdrawn' });
      } else {
        results.push({ studentId, success: false, error: 'Unknown action' });
      }

      // Log activity
      await db.activityLog.create({
        data: {
          schoolId: session.user.schoolId,
          userId: session.user.id,
          action: `student_${act}`,
          details: `Student ${studentId} ${act}d${newClassId ? ' to class ' + newClassId : ''}`,
        },
      });
    } catch (err) {
      results.push({ studentId, success: false, error: String(err) });
    }
  }

  const succeeded = results.filter(r => r.success).length;
  return NextResponse.json({
    processed: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  });
}
