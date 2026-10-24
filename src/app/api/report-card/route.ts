import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

function calcGrade(m: number): string {
  if (m >= 90) return 'A+'; if (m >= 80) return 'A'; if (m >= 70) return 'B';
  if (m >= 60) return 'C'; if (m >= 50) return 'D'; return 'F';
}

function calcRemarks(avg: number): string {
  if (avg >= 85) return 'Excellent performance. Keep it up!';
  if (avg >= 70) return 'Good performance. There is room for improvement.';
  if (avg >= 55) return 'Satisfactory. Put in more effort in weaker subjects.';
  return 'Needs significant improvement. Please consult your teachers.';
}

// Generates an HTML-based report card that browsers can print to PDF
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const term = searchParams.get('term') || 'Term 1';

  if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      class: { select: { name: true } },
      school: { select: { name: true, address: true, phone: true, email: true, logo: true, motto: true } },
    },
  });
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  if (student.schoolId !== session.user.schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const marks = await db.mark.findMany({
    where: { studentId, term },
    include: { subject: { select: { name: true, code: true } } },
    orderBy: { subject: { name: 'asc' } },
  });

  const avg = marks.length > 0 ? Math.round(marks.reduce((s, m) => s + m.marks, 0) / marks.length) : 0;
  const overallGrade = calcGrade(avg);
  const remarks = calcRemarks(avg);
  const passed = marks.filter(m => m.marks >= 50).length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Report Card - ${student.fullName}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; background: #f5f5f5; padding: 20px; color: #1a1a1a; }
  .card { background: white; max-width: 750px; margin: 0 auto; border: 2px solid #10b981; border-radius: 8px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 24px 32px; text-align: center; }
  .header h1 { font-size: 22px; font-weight: bold; letter-spacing: 1px; margin-bottom: 4px; }
  .header p { font-size: 13px; opacity: 0.9; }
  .header .motto { font-style: italic; margin-top: 4px; opacity: 0.85; }
  .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 1px solid #e5e7eb; }
  .info-block { padding: 16px 24px; }
  .info-block.right { border-left: 1px solid #e5e7eb; }
  .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 2px; }
  .info-value { font-size: 14px; font-weight: 600; color: #111; }
  .section-title { background: #f9fafb; padding: 10px 24px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; border-bottom: 1px solid #e5e7eb; border-top: 1px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f3f4f6; padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
  td { padding: 10px 16px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
  tr:last-child td { border-bottom: none; }
  .grade-pill { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .grade-A\\+ { background: #d1fae5; color: #065f46; }
  .grade-A  { background: #d1fae5; color: #065f46; }
  .grade-B  { background: #dbeafe; color: #1e40af; }
  .grade-C  { background: #fef3c7; color: #92400e; }
  .grade-D  { background: #fed7aa; color: #9a3412; }
  .grade-F  { background: #fee2e2; color: #991b1b; }
  .mark-pass { color: #059669; font-weight: 700; }
  .mark-fail { color: #dc2626; font-weight: 700; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-top: 1px solid #e5e7eb; }
  .summary-item { text-align: center; padding: 16px 8px; border-right: 1px solid #e5e7eb; }
  .summary-item:last-child { border-right: none; }
  .summary-num { font-size: 24px; font-weight: bold; color: #10b981; }
  .summary-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .remarks-section { padding: 16px 24px; border-top: 1px solid #e5e7eb; }
  .remarks-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; margin-bottom: 8px; }
  .remarks-text { font-size: 13px; color: #4b5563; font-style: italic; line-height: 1.5; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; padding: 24px 32px; border-top: 1px solid #e5e7eb; }
  .sig-line { border-top: 1px solid #374151; padding-top: 6px; font-size: 11px; color: #6b7280; text-align: center; margin-top: 40px; }
  .print-btn { display: block; text-align: center; margin: 16px auto; padding: 10px 32px; background: #10b981; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>
<button class="no-print print-btn" onclick="window.print()">Print / Save as PDF</button>
<div class="card">
  <div class="header">
    <h1>${student.school.name.toUpperCase()}</h1>
    <p>${student.school.address || ''} ${student.school.phone ? '· ' + student.school.phone : ''}</p>
    ${student.school.motto ? `<p class="motto">"${student.school.motto}"</p>` : ''}
    <p style="margin-top:12px; font-size:16px; font-weight:bold; letter-spacing:2px;">ACADEMIC REPORT CARD</p>
    <p style="font-size:13px; margin-top:4px;">${term} · Academic Year ${new Date().getFullYear()}</p>
  </div>

  <div class="student-info">
    <div class="info-block">
      <div class="info-label">Student name</div>
      <div class="info-value">${student.fullName}</div>
    </div>
    <div class="info-block right">
      <div class="info-label">Student ID</div>
      <div class="info-value">${student.studentId}</div>
    </div>
    <div class="info-block">
      <div class="info-label">Class</div>
      <div class="info-value">${student.class?.name || `${student.level} ${student.section}`}</div>
    </div>
    <div class="info-block right">
      <div class="info-label">Gender</div>
      <div class="info-value">${student.gender}</div>
    </div>
    ${student.systemType === 'reb' ? `
    <div class="info-block">
      <div class="info-label">Level</div>
      <div class="info-value">${['S1','S2','S3'].includes(student.level) ? student.level + " — O\'Level" : student.level + " — A\'Level"}</div>
    </div>
    <div class="info-block right">
      <div class="info-label">Combination</div>
      <div class="info-value">${student.combination || '—'}</div>
    </div>` : `
    <div class="info-block">
      <div class="info-label">Trade / Programme</div>
      <div class="info-value">${student.trade || '—'}</div>
    </div>
    <div class="info-block right">
      <div class="info-label">Level</div>
      <div class="info-value">${student.level || '—'}</div>
    </div>`}
  </div>

  <div class="section-title">Academic Performance</div>
  <table>
    <thead>
      <tr><th>Subject</th><th>Code</th><th>Marks (%)</th><th>Grade</th><th>Remarks</th></tr>
    </thead>
    <tbody>
      ${marks.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding: 24px; color: #9ca3af;">No marks recorded for this term</td></tr>' :
        marks.map(m => {
          const g = m.grade || calcGrade(m.marks);
          const pass = m.marks >= 50;
          return `<tr>
            <td style="font-weight:600">${m.subject.name}</td>
            <td style="color:#6b7280; font-size:12px">${m.subject.code || '—'}</td>
            <td class="${pass ? 'mark-pass' : 'mark-fail'}">${m.marks}%</td>
            <td><span class="grade-pill grade-${g.replace('+', '\\+')}">${g}</span></td>
            <td style="color:#6b7280; font-size:12px">${pass ? 'Pass' : 'Fail'}</td>
          </tr>`;
        }).join('')}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-item"><div class="summary-num">${avg}%</div><div class="summary-label">Average</div></div>
    <div class="summary-item"><div class="summary-num" style="color:${overallGrade.startsWith('A') ? '#059669' : overallGrade === 'F' ? '#dc2626' : '#f59e0b'}">${overallGrade}</div><div class="summary-label">Overall grade</div></div>
    <div class="summary-item"><div class="summary-num">${passed}</div><div class="summary-label">Passed</div></div>
    <div class="summary-item"><div class="summary-num" style="color:#dc2626">${marks.length - passed}</div><div class="summary-label">Failed</div></div>
  </div>

  <div class="remarks-section">
    <div class="remarks-title">Class teacher's remarks</div>
    <div class="remarks-text">${remarks}</div>
  </div>

  <div class="signatures">
    <div><div class="sig-line">Class Teacher</div></div>
    <div><div class="sig-line">Head Teacher / Principal</div></div>
    <div><div class="sig-line">Parent / Guardian</div></div>
  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="report-card-${student.studentId}-${term.replace(' ', '-')}.html"`,
    },
  });
}
