import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const bulk = searchParams.get('bulk'); // classId for bulk printing
  const classId = searchParams.get('classId');

  let students;

  if (bulk && classId) {
    if (!['admin', 'teacher'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    students = await db.student.findMany({
      where: { classId, schoolId: session.user.schoolId, status: 'active' },
      include: { class: { select: { name: true } }, school: { select: { name: true, logo: true } } },
      orderBy: { fullName: 'asc' },
    });
  } else if (studentId) {
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { class: { select: { name: true } }, school: { select: { name: true, logo: true } } },
    });
    if (!student || student.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    students = [student];
  } else {
    return NextResponse.json({ error: 'studentId or bulk+classId required' }, { status: 400 });
  }

  const cardHTML = (s: typeof students[0]) => `
    <div class="card" style="page-break-inside: avoid; margin: 8px; display: inline-block; vertical-align: top;">
      <div class="card-inner">
        <div class="header">
          <div class="school-logo">
            <div class="logo-circle">E</div>
          </div>
          <div class="school-name">
            <div class="school-title">${s.school.name.toUpperCase()}</div>
            <div class="card-type">STUDENT ID CARD</div>
          </div>
        </div>
        <div class="body">
          <div class="photo-section">
            <div class="photo-placeholder">${s.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}</div>
          </div>
          <div class="info-section">
            <div class="student-name">${s.fullName}</div>
            <div class="info-row"><span class="label">ID</span><span class="value">${s.studentId}</span></div>
            <div class="info-row"><span class="label">Class</span><span class="value">${s.class?.name || `${s.trade} ${s.level}${s.section}`}</span></div>
            <div class="info-row"><span class="label">Year</span><span class="value">${new Date().getFullYear()}</span></div>
          </div>
          <div class="qr-section">
            <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`ESSJT:${s.studentId}:${s.fullName}`)}" alt="QR" />
            <div class="qr-label">Scan to verify</div>
          </div>
        </div>
        <div class="footer">
          <span>${s.phone || 'Contact school'}</span>
          <span>Valid: ${new Date().getFullYear()}</span>
        </div>
      </div>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Student ID Cards</title>
<style>
  @media print { .no-print { display: none !important; } body { margin: 0; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #f0f0f0; padding: 20px; }
  .controls { background: white; padding: 16px; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 12px; align-items: center; }
  button { padding: 10px 24px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; }
  .card { width: 242px; height: 153px; background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); overflow: hidden; }
  .card-inner { height: 100%; display: flex; flex-direction: column; }
  .header { background: linear-gradient(135deg, #10b981, #059669); padding: 8px 10px; display: flex; align-items: center; gap: 8px; }
  .logo-circle { width: 28px; height: 28px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #059669; font-size: 14px; flex-shrink: 0; }
  .school-title { color: white; font-size: 7.5px; font-weight: bold; letter-spacing: 0.3px; line-height: 1.3; }
  .card-type { color: rgba(255,255,255,0.85); font-size: 6.5px; letter-spacing: 1px; text-transform: uppercase; }
  .body { display: flex; flex: 1; padding: 8px; gap: 8px; }
  .photo-placeholder { width: 44px; height: 54px; background: #e5e7eb; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; color: #6b7280; flex-shrink: 0; }
  .info-section { flex: 1; }
  .student-name { font-size: 9px; font-weight: bold; color: #111; margin-bottom: 5px; line-height: 1.2; }
  .info-row { display: flex; gap: 4px; margin-bottom: 2px; }
  .label { font-size: 7px; color: #6b7280; width: 26px; flex-shrink: 0; }
  .value { font-size: 7px; font-weight: 600; color: #111; }
  .qr-section { display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .qr { width: 50px; height: 50px; border: 1px solid #e5e7eb; border-radius: 3px; }
  .qr-label { font-size: 6px; color: #9ca3af; margin-top: 2px; text-align: center; }
  .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 4px 10px; display: flex; justify-content: space-between; font-size: 6.5px; color: #6b7280; }
</style>
</head>
<body>
<div class="no-print controls">
  <button onclick="window.print()">🖨️ Print all cards (${students.length})</button>
  <span style="color:#6b7280; font-size:13px">${students.length} card${students.length !== 1 ? 's' : ''} — set printer to A4, landscape for best results</span>
</div>
${students.map(cardHTML).join('\n')}
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': bulk ? 'inline; filename="id-cards-bulk.html"' : `inline; filename="id-card-${students[0].studentId}.html"`,
    },
  });
}
