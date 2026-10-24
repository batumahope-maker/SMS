import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // ── Clean existing data (correct order to avoid FK violations) ──
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.reportCard.deleteMany();
  await prisma.examResult.deleteMany();
  await prisma.mark.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.homeworkSubmission.deleteMany();
  await prisma.homework.deleteMany();
  await prisma.lessonPlan.deleteMany();
  await prisma.syllabus.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.bookIssue.deleteMany();
  await prisma.roomAllocation.deleteMany();
  await prisma.transportAssignment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.parentStudent.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.class.deleteMany();
  await prisma.book.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.room.deleteMany();
  await prisma.license.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
  console.log('Cleaned existing data');

  // ── School ──────────────────────────────────────────────────────
  const school = await prisma.school.create({
    data: {
      name: 'ESSJT School',
      slug: 'essjt',
      address: 'Kigali, Rwanda',
      phone: '+250788000000',
      email: 'info@essjt.rw',
      website: 'https://essjt.rw',
      motto: 'Excellence in Education',
      primaryColor: '#10b981',
      secondaryColor: '#059669',
      language: 'en',
      timezone: 'Africa/Kigali',
      academicYear: '2026',
      systemType: 'both',
      licenseStatus: 'active',
      plan: 'premium',
    },
  });
  console.log('Created school:', school.name);

  // ── License ─────────────────────────────────────────────────────
  await prisma.license.create({
    data: {
      schoolId: school.id,
      key: 'ESSJT-DEMO-2026-PREMIUM',
      plan: 'premium',
      maxStudents: 2000,
      maxTeachers: 100,
      expiresAt: new Date('2027-12-31'),
      status: 'active',
    },
  });

  // ── Helper: hash password ────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // ── Admin user ──────────────────────────────────────────────────
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@essjt.rw',
      password: await hash('admin123'),
      role: 'admin',
      schoolId: school.id,
      status: 'active',
    },
  });
  console.log('Created admin user');

  // ── TVET Classes ─────────────────────────────────────────────────
  const tvetClassData = [
    { name: 'Software Development L4 A', trade: 'Software Development', level: 'L4', section: 'A', systemType: 'tvet' },
    { name: 'Software Development L4 B', trade: 'Software Development', level: 'L4', section: 'B', systemType: 'tvet' },
    { name: 'Software Development L3 A', trade: 'Software Development', level: 'L3', section: 'A', systemType: 'tvet' },
    { name: 'Electronics L4 A', trade: 'Electronics & Telecommunications', level: 'L4', section: 'A', systemType: 'tvet' },
    { name: 'Electricity L3 A', trade: 'Electricity', level: 'L3', section: 'A', systemType: 'tvet' },
    { name: 'Mechanics L4 A', trade: 'Mechanics & Automotive', level: 'L4', section: 'A', systemType: 'tvet' },
    { name: 'Accounting L4 A', trade: 'Accounting & Finance', level: 'L4', section: 'A', systemType: 'tvet' },
  ];

  const tvetClasses = await Promise.all(tvetClassData.map(c =>
    prisma.class.create({
      data: { schoolId: school.id, ...c, combination: '', status: 'active' },
    })
  ));
  console.log('Created', tvetClasses.length, 'TVET classes');

  // ── REB Classes ──────────────────────────────────────────────────
  const rebClassData = [
    { name: 'S1 A', level: 'S1', section: 'A', combination: '', systemType: 'reb', trade: '' },
    { name: 'S2 A', level: 'S2', section: 'A', combination: '', systemType: 'reb', trade: '' },
    { name: 'S3 A', level: 'S3', section: 'A', combination: '', systemType: 'reb', trade: '' },
    { name: 'S4 MPC A', level: 'S4', section: 'A', combination: 'MPC', systemType: 'reb', trade: '' },
    { name: 'S5 MPC A', level: 'S5', section: 'A', combination: 'MPC', systemType: 'reb', trade: '' },
    { name: 'S6 MPC A', level: 'S6', section: 'A', combination: 'MPC', systemType: 'reb', trade: '' },
    { name: 'S4 PCB A', level: 'S4', section: 'A', combination: 'PCB', systemType: 'reb', trade: '' },
    { name: 'S5 PCB A', level: 'S5', section: 'A', combination: 'PCB', systemType: 'reb', trade: '' },
  ];

  const rebClasses = await Promise.all(rebClassData.map(c =>
    prisma.class.create({
      data: { schoolId: school.id, ...c, status: 'active' },
    })
  ));
  console.log('Created', rebClasses.length, 'REB classes');

  // ── Teachers ─────────────────────────────────────────────────────
  const teacherData = [
    { username: 'teacher1', fullName: 'Jean Paul Habimana', email: 'jp@essjt.rw', subject: 'Mathematics' },
    { username: 'teacher2', fullName: 'Marie Claire Uwase', email: 'mc@essjt.rw', subject: 'English' },
    { username: 'teacher3', fullName: 'Eric Nkurunziza', email: 'en@essjt.rw', subject: 'Software Development' },
    { username: 'teacher4', fullName: 'Alice Mukamana', email: 'am@essjt.rw', subject: 'Physics' },
    { username: 'teacher5', fullName: 'Robert Bizimana', email: 'rb@essjt.rw', subject: 'Electronics' },
  ];

  const teachers = await Promise.all(teacherData.map(async (t, i) => {
    const user = await prisma.user.create({
      data: {
        username: t.username,
        email: t.email,
        password: await hash('teacher123'),
        role: 'teacher',
        schoolId: school.id,
        status: 'active',
      },
    });
    return prisma.teacher.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        teacherId: `TCH${String(i + 1).padStart(4, '0')}`,
        fullName: t.fullName,
        email: t.email,
        gender: i % 2 === 0 ? 'Male' : 'Female',
        specialization: t.subject,
        status: 'active',
        classes: { connect: [{ id: tvetClasses[i % tvetClasses.length].id }] },
      },
    });
  }));
  console.log('Created', teachers.length, 'teachers');

  // ── TVET Students ────────────────────────────────────────────────
  const tvetStudentNames = [
    ['Jean Damascene Niyonzima', 'Male'], ['Clarisse Uwimana', 'Female'],
    ['Patrick Habimana', 'Male'], ['Grace Mukandori', 'Female'],
    ['Samuel Bizimana', 'Male'], ['Diane Ingabire', 'Female'],
    ['Claude Nshimiyimana', 'Male'], ['Sandrine Uwase', 'Female'],
    ['Thierry Kagame', 'Male'], ['Pascaline Mutesi', 'Female'],
    ['Innocent Rutayisire', 'Male'], ['Solange Nyiraneza', 'Female'],
    ['Fidele Nsanzimana', 'Male'], ['Vestine Mukandayisenga', 'Female'],
    ['Celestin Niyongabo', 'Male'], ['Yvonne Uwingabire', 'Female'],
    ['Olivier Ndayisaba', 'Male'], ['Chantal Uwineza', 'Female'],
    ['Alexis Hakizimana', 'Male'], ['Josiane Umutesi', 'Female'],
  ];

  for (let i = 0; i < tvetStudentNames.length; i++) {
    const [fullName, gender] = tvetStudentNames[i];
    const studentId = `STU${String(i + 1).padStart(4, '0')}`;
    const cls = tvetClasses[i % tvetClasses.length];
    const user = await prisma.user.create({
      data: {
        username: studentId.toLowerCase(),
        email: `${studentId.toLowerCase()}@essjt.rw`,
        password: await hash('student123'),
        role: 'student',
        schoolId: school.id,
        status: 'active',
      },
    });
    await prisma.student.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        studentId,
        fullName,
        gender,
        systemType: 'tvet',
        trade: cls.trade,
        combination: '',
        level: cls.level,
        section: cls.section,
        classId: cls.id,
        status: 'active',
        feePaid: 50000 + (i * 2000),
        feeBalance: i % 4 === 0 ? 30000 : 0,
      },
    });
  }
  console.log('Created', tvetStudentNames.length, 'TVET students');

  // ── REB Students ─────────────────────────────────────────────────
  const rebStudentNames = [
    ['Alice Uwimana', 'Female'], ['Bob Nkurunziza', 'Male'],
    ['Claire Mukamana', 'Female'], ['David Habimana', 'Male'],
    ['Eve Ingabire', 'Female'], ['Frank Niyonzima', 'Male'],
    ['Grace Uwase', 'Female'], ['Henry Bizimana', 'Male'],
    ['Iris Mukandori', 'Female'], ['James Nshimiyimana', 'Male'],
    ['Karen Uwizeyimana', 'Female'], ['Leon Habimana', 'Male'],
    ['Marie Nyiraneza', 'Female'], ['Noah Kagame', 'Male'],
    ['Olivia Mutesi', 'Female'], ['Peter Rutayisire', 'Male'],
  ];

  for (let i = 0; i < rebStudentNames.length; i++) {
    const [fullName, gender] = rebStudentNames[i];
    const studentId = `REB${String(i + 1).padStart(4, '0')}`;
    const cls = rebClasses[i % rebClasses.length];
    const user = await prisma.user.create({
      data: {
        username: studentId.toLowerCase(),
        email: `${studentId.toLowerCase()}@essjt.rw`,
        password: await hash('student123'),
        role: 'student',
        schoolId: school.id,
        status: 'active',
      },
    });
    await prisma.student.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        studentId,
        fullName,
        gender,
        systemType: 'reb',
        trade: '',
        combination: cls.combination,
        level: cls.level,
        section: cls.section,
        classId: cls.id,
        status: 'active',
        feePaid: 75000 + (i * 3000),
        feeBalance: i % 3 === 0 ? 25000 : 0,
      },
    });
  }
  console.log('Created', rebStudentNames.length, 'REB students');

  // ── Parents ──────────────────────────────────────────────────────
  const parentData = [
    { username: 'parent1', fullName: 'Emmanuel Nkurunziza', email: 'p1@essjt.rw', phone: '+250788111001' },
    { username: 'parent2', fullName: 'Josephine Uwase', email: 'p2@essjt.rw', phone: '+250788111002' },
    { username: 'parent3', fullName: 'Augustin Habimana', email: 'p3@essjt.rw', phone: '+250788111003' },
    { username: 'parent4', fullName: 'Therese Mukamana', email: 'p4@essjt.rw', phone: '+250788111004' },
    { username: 'parent5', fullName: 'Francois Bizimana', email: 'p5@essjt.rw', phone: '+250788111005' },
  ];

  const students = await prisma.student.findMany({ where: { schoolId: school.id }, take: 10 });

  for (let i = 0; i < parentData.length; i++) {
    const p = parentData[i];
    const user = await prisma.user.create({
      data: {
        username: p.username,
        email: p.email,
        password: await hash('parent123'),
        role: 'parent',
        schoolId: school.id,
        status: 'active',
      },
    });
    const parent = await prisma.parent.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        gender: i % 2 === 0 ? 'Male' : 'Female',
        status: 'active',
      },
    });
    // Link parent to 2 students each
    const studentA = students[i * 2];
    const studentB = students[i * 2 + 1];
    if (studentA) await prisma.parentStudent.create({ data: { parentId: parent.id, studentId: studentA.id } });
    if (studentB) await prisma.parentStudent.create({ data: { parentId: parent.id, studentId: studentB.id } });
  }
  console.log('Created', parentData.length, 'parents');

  // ── Subjects ─────────────────────────────────────────────────────
  const subjectData = [
    { name: 'Mathematics', code: 'MATH' },
    { name: 'English', code: 'ENG' },
    { name: 'Kinyarwanda', code: 'KIN' },
    { name: 'French', code: 'FRE' },
    { name: 'Physics', code: 'PHY' },
    { name: 'Chemistry', code: 'CHEM' },
    { name: 'Biology', code: 'BIO' },
    { name: 'Computer Science', code: 'CS' },
    { name: 'Web Development', code: 'WEB' },
    { name: 'Database Systems', code: 'DB' },
    { name: 'Networking', code: 'NET' },
    { name: 'Electronics Basics', code: 'ELEC' },
    { name: 'Entrepreneurship', code: 'ENT' },
    { name: 'Social Studies', code: 'SS' },
    { name: 'ICT', code: 'ICT' },
  ];

  const subjects = await Promise.all(subjectData.map(s =>
    prisma.subject.create({
      data: { schoolId: school.id, name: s.name, code: s.code, status: 'active' },
    })
  ));
  console.log('Created', subjects.length, 'subjects');

  // ── Marks ────────────────────────────────────────────────────────
  const allStudents = await prisma.student.findMany({ where: { schoolId: school.id } });
  const coreSubjects = subjects.slice(0, 5);
  let markCount = 0;

  for (const student of allStudents.slice(0, 20)) {
    for (const subject of coreSubjects) {
      for (const term of ['Term 1', 'Term 2']) {
        const score = 45 + Math.floor(Math.random() * 50);
        await prisma.mark.create({
          data: {
            studentId: student.id,
            subjectId: subject.id,
            schoolId: school.id,
            marks: score,
            grade: score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F',
            term,
            examType: 'Exam',
            academicYear: '2026',
          },
        });
        markCount++;
      }
    }
  }
  console.log('Created', markCount, 'marks');

  // ── Attendance ───────────────────────────────────────────────────
  const today = new Date();
  let attCount = 0;
  for (const student of allStudents.slice(0, 15)) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      const statuses = ['present', 'present', 'present', 'present', 'absent', 'late', 'present'];
      await prisma.attendance.create({
        data: {
          studentId: student.id,
          schoolId: school.id,
          classId: student.classId || tvetClasses[0].id,
          date,
          status: statuses[d],
          markedBy: teachers[0].id,
        },
      });
      attCount++;
    }
  }
  console.log('Created', attCount, 'attendance records');

  // ── Payments ─────────────────────────────────────────────────────
  let payCount = 0;
  for (const student of allStudents.slice(0, 15)) {
    if (student.feePaid > 0) {
      await prisma.payment.create({
        data: {
          schoolId: school.id,
          studentId: student.id,
          amount: student.feePaid,
          paymentMethod: payCount % 2 === 0 ? 'Cash' : 'Mobile Money',
          receiptNumber: `RCP${String(payCount + 1).padStart(5, '0')}`,
          paidFor: 'Tuition Fee',
          term: 'Term 1',
          paidAt: new Date(today.getTime() - (payCount * 2 * 24 * 60 * 60 * 1000)),
        },
      });
      payCount++;
    }
  }
  console.log('Created', payCount, 'payments');

  // ── Fee structures ───────────────────────────────────────────────
  await prisma.feeStructure.create({
    data: {
      schoolId: school.id,
      name: 'TVET L4 Tuition',
      amount: 80000,
      term: 'Term 1',
      academicYear: '2026',
      dueDate: new Date('2026-02-01'),
    },
  });
  await prisma.feeStructure.create({
    data: {
      schoolId: school.id,
      name: 'REB S4 Tuition',
      amount: 100000,
      term: 'Term 1',
      academicYear: '2026',
      dueDate: new Date('2026-02-01'),
    },
  });

  // ── Announcements ────────────────────────────────────────────────
  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      title: 'Welcome to the new academic year!',
      content: 'We are excited to start the 2026 academic year. All students should report to their classes by Monday.',
      audience: 'all',
      priority: 'high',
      authorId: adminUser.id,
    },
  });
  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      title: 'Term 1 exam timetable released',
      content: 'The Term 1 examination timetable is now available. Please check with your class teacher for details.',
      audience: 'students',
      priority: 'normal',
      authorId: adminUser.id,
    },
  });
  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      title: 'Staff meeting this Friday',
      content: 'All teaching staff are required to attend a staff meeting this Friday at 3:00 PM in the main hall.',
      audience: 'teachers',
      priority: 'high',
      authorId: adminUser.id,
    },
  });
  console.log('Created announcements');

  // ── Events ───────────────────────────────────────────────────────
  await prisma.event.create({
    data: {
      schoolId: school.id,
      title: 'Sports Day 2026',
      description: 'Annual inter-class sports competition. All students are encouraged to participate.',
      date: new Date('2026-05-15'),
      location: 'School Grounds',
      audience: 'all',
    },
  });
  await prisma.event.create({
    data: {
      schoolId: school.id,
      title: 'Parents Open Day',
      description: 'Parents are invited to visit the school and meet with teachers to discuss student progress.',
      date: new Date('2026-04-25'),
      location: 'Main Hall',
      audience: 'parents',
    },
  });
  console.log('Created events');

  // ── Settings ─────────────────────────────────────────────────────
  await prisma.setting.create({
    data: { schoolId: school.id, key: 'academic_year', value: '2026' },
  });
  await prisma.setting.create({
    data: { schoolId: school.id, key: 'current_term', value: 'Term 1' },
  });
  console.log('Created settings');

  console.log('\n========================================');
  console.log('✅ Seed completed successfully!');
  console.log('========================================');
  console.log('\nLogin credentials:');
  console.log('  Admin:    admin      / admin123');
  console.log('  Teacher:  teacher1   / teacher123');
  console.log('  Student:  stu0001    / student123');
  console.log('  Parent:   parent1    / parent123');
  console.log('\nTVET students: stu0001 to stu0020');
  console.log('REB students:  reb0001 to reb0016');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
