import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

interface SMSResult {
  recipient: string;
  name: string;
  status: string;
  messageId?: string;
}

async function sendSMSviaAfricasTalking(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  const senderId = process.env.AT_SENDER_ID || 'ESSJT';

  if (!username || !apiKey) {
    return { success: false, error: 'SMS not configured. Add AT_USERNAME and AT_API_KEY to .env' };
  }

  try {
    const params = new URLSearchParams({ username, to, message, from: senderId });
    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    const recipient = data.SMSMessageData?.Recipients?.[0];
    if (recipient?.statusCode === 101) {
      return { success: true, messageId: recipient.messageId };
    }
    return { success: false, error: recipient?.status || 'Unknown error' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// POST /api/sms  body: { type, classId?, studentId?, message? }
// types: 'absent_today' | 'fees_reminder' | 'results_ready' | 'custom'
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type, classId, studentId, customMessage, term } = await request.json();

  const results: SMSResult[] = [];
  let recipients: { phone: string | null; name: string; guardianPhone: string | null }[] = [];

  if (type === 'absent_today') {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const absentRecords = await db.attendance.findMany({
      where: {
        student: { schoolId: session.user.schoolId, ...(classId ? { classId } : {}) },
        date: { gte: todayStart, lte: todayEnd },
        status: 'absent',
      },
      include: { student: { select: { fullName: true, guardianPhone: true, phone: true } } },
    });
    recipients = absentRecords.map(r => ({
      phone: r.student.guardianPhone || r.student.phone,
      name: r.student.fullName,
      guardianPhone: r.student.guardianPhone,
    }));

  } else if (type === 'fees_reminder') {
    const students = await db.student.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'active',
        feeBalance: { gt: 0 },
        ...(classId ? { classId } : {}),
      },
      select: { fullName: true, guardianPhone: true, phone: true, feeBalance: true },
    });
    recipients = students.map(s => ({
      phone: s.guardianPhone || s.phone,
      name: s.fullName,
      guardianPhone: s.guardianPhone,
    }));

  } else if (type === 'results_ready' || type === 'custom') {
    const query = studentId
      ? await db.student.findMany({ where: { id: studentId, schoolId: session.user.schoolId }, select: { fullName: true, guardianPhone: true, phone: true } })
      : await db.student.findMany({ where: { schoolId: session.user.schoolId, status: 'active', ...(classId ? { classId } : {}) }, select: { fullName: true, guardianPhone: true, phone: true } });
    recipients = query.map(s => ({ phone: s.guardianPhone || s.phone, name: s.fullName, guardianPhone: s.guardianPhone }));
  }

  // Build and send messages
  for (const rec of recipients) {
    const phone = rec.phone;
    if (!phone) {
      results.push({ recipient: 'unknown', name: rec.name, status: 'skipped - no phone number' });
      continue;
    }

    let message = customMessage || '';
    if (type === 'absent_today') {
      message = `Dear parent, your child ${rec.name} was absent from school today. Please contact the school if you need assistance. - ESSJT`;
    } else if (type === 'fees_reminder') {
      message = `Dear parent of ${rec.name}, this is a reminder that there is an outstanding fee balance. Please visit the school to settle. Thank you. - ESSJT`;
    } else if (type === 'results_ready') {
      message = `Dear parent of ${rec.name}, ${term || 'Term'} results are now available. Please visit the school or check the portal. - ESSJT`;
    }

    const result = await sendSMSviaAfricasTalking(phone, message);
    results.push({
      recipient: phone,
      name: rec.name,
      status: result.success ? 'sent' : `failed: ${result.error}`,
      messageId: result.messageId,
    });
  }

  const sent = results.filter(r => r.status === 'sent').length;
  const failed = results.filter(r => r.status.startsWith('failed')).length;
  const skipped = results.filter(r => r.status.startsWith('skipped')).length;

  return NextResponse.json({ sent, failed, skipped, total: results.length, results });
}
