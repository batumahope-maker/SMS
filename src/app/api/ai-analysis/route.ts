import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { studentId, classId, type } = await request.json();
  // type: 'student' | 'class' | 'school'

  let analysisData = '';

  if (type === 'student' && studentId) {
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        marks: { include: { subject: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        class: { select: { name: true } },
      },
    });
    if (!student || student.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const avgMark = student.marks.length > 0
      ? Math.round(student.marks.reduce((s, m) => s + m.marks, 0) / student.marks.length) : 0;
    const attendanceRate = student.attendance.length > 0
      ? Math.round((student.attendance.filter(a => a.status === 'present').length / student.attendance.length) * 100) : 0;
    const subjectBreakdown = Object.entries(
      student.marks.reduce((acc: Record<string, number[]>, m) => {
        const name = m.subject.name;
        acc[name] = acc[name] || [];
        acc[name].push(m.marks);
        return acc;
      }, {})
    ).map(([sub, marks]) => `${sub}: avg ${Math.round(marks.reduce((a, b) => a + b, 0) / marks.length)}%`).join(', ');

    analysisData = `Student: ${student.fullName} | Class: ${student.class?.name || 'N/A'} | Overall average: ${avgMark}% | Attendance: ${attendanceRate}% (last 30 days) | Subjects: ${subjectBreakdown || 'No marks yet'} | Fee balance: ${student.feeBalance} RWF`;

  } else if (type === 'class' && classId) {
    const cls = await db.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: {
            marks: { include: { subject: { select: { name: true } } } },
            attendance: { take: 30 },
          },
          where: { status: 'active' },
        },
      },
    });
    if (!cls || cls.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const studentStats = cls.students.map(s => {
      const avg = s.marks.length > 0 ? Math.round(s.marks.reduce((a, m) => a + m.marks, 0) / s.marks.length) : 0;
      const att = s.attendance.length > 0 ? Math.round((s.attendance.filter(a => a.status === 'present').length / s.attendance.length) * 100) : 0;
      return { name: s.fullName, avg, att };
    });

    const classAvg = studentStats.length > 0 ? Math.round(studentStats.reduce((a, s) => a + s.avg, 0) / studentStats.length) : 0;
    const atRisk = studentStats.filter(s => s.avg < 50 || s.att < 70);
    const topPerformers = [...studentStats].sort((a, b) => b.avg - a.avg).slice(0, 3);

    analysisData = `Class: ${cls.name} | Total students: ${cls.students.length} | Class average: ${classAvg}% | Students at risk (avg<50% or attendance<70%): ${atRisk.map(s => `${s.name}(${s.avg}%,${s.att}%att)`).join(', ') || 'None'} | Top performers: ${topPerformers.map(s => `${s.name}(${s.avg}%)`).join(', ')}`;

  } else if (type === 'school') {
    const [totalStudents, marks, attendance] = await Promise.all([
      db.student.count({ where: { schoolId: session.user.schoolId, status: 'active' } }),
      db.mark.findMany({ where: { student: { schoolId: session.user.schoolId } }, select: { marks: true } }),
      db.attendance.findMany({ where: { student: { schoolId: session.user.schoolId } }, select: { status: true } }),
    ]);

    const schoolAvg = marks.length > 0 ? Math.round(marks.reduce((s, m) => s + m.marks, 0) / marks.length) : 0;
    const attRate = attendance.length > 0 ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0;
    const passRate = marks.length > 0 ? Math.round((marks.filter(m => m.marks >= 50).length / marks.length) * 100) : 0;

    analysisData = `School overview | Total active students: ${totalStudents} | Overall mark average: ${schoolAvg}% | Pass rate: ${passRate}% | Attendance rate: ${attRate}%`;
  } else {
    return NextResponse.json({ error: 'Invalid type or missing ID' }, { status: 400 });
  }

  // Call Claude API for analysis
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are an educational analyst for a Rwandan school management system. Analyze the following data and provide actionable insights in 3-4 sentences. Be specific and practical. Focus on: 1) Key strengths, 2) Areas needing attention, 3) Specific actionable recommendations for teachers/admin. Keep language professional but accessible. Data: ${analysisData}`,
        }],
      }),
    });

    if (!response.ok) throw new Error('AI API error');
    const data = await response.json();
    const analysis = data.content?.[0]?.text || 'Analysis unavailable.';

    // Generate quick stats summary
    const stats: Record<string, string> = {};
    if (analysisData.includes('Overall average:')) {
      const match = analysisData.match(/Overall average: (\d+)%/);
      if (match) stats['Average'] = `${match[1]}%`;
    }
    if (analysisData.includes('Attendance:')) {
      const match = analysisData.match(/Attendance: (\d+)%/);
      if (match) stats['Attendance'] = `${match[1]}%`;
    }

    return NextResponse.json({ analysis, stats, raw: analysisData });
  } catch {
    return NextResponse.json({ error: 'AI analysis failed. Check API configuration.' }, { status: 500 });
  }
}
