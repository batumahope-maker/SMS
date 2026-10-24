const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clean all data
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

  const hash = (pw) => bcrypt.hash(pw, 10);

  // School
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
  console.log('Created school');

  await prisma.license.create({
    data: {
      schoolId: school.id,
      key: 'ESSJT-DEMO-2026-PREMIUM',
      plan: 'premium',
      features: 'students,attendance,marks,fees,reports,library,transport,hostel,sms',
      maxStudents: 2000,
      maxTeachers: 100,
      expiresAt: new Date('2027-12-31'),
      status: 'active',
    },
  });

  // Admin
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
  console.log('Created admin');

  // TVET Classes
  const tvetClassData = [
    { name: 'Software Development L4 A', trade: 'Software Development', level: 'L4', section: 'A' },
    { name: 'Software Development L4 B', trade: 'Software Development', level: 'L4', section: 'B' },
    { name: 'Software Development L3 A', trade: 'Software Development', level: 'L3', section: 'A' },
    { name: 'Electronics L4 A', trade: 'Electronics & Telecommunications', level: 'L4', section: 'A' },
    { name: 'Electricity L3 A', trade: 'Electricity', level: 'L3', section: 'A' },
    { name: 'Mechanics L4 A', trade: 'Mechanics & Automotive', level: 'L4', section: 'A' },
    { name: 'Accounting L4 A', trade: 'Accounting & Finance', level: 'L4', section: 'A' },
  ];

  const tvetClasses = [];
  for (const c of tvetClassData) {
    const cls = await prisma.class.create({
      data: { schoolId: school.id, name: c.name, trade: c.trade, level: c.level, section: c.section, combination: '', systemType: 'tvet', status: 'active' },
    });
    tvetClasses.push(cls);
  }
  console.log('Created', tvetClasses.length, 'TVET classes');

  // REB Classes
  const rebClassData = [
    { name: 'S1 A', level: 'S1', section: 'A', combination: '' },
    { name: 'S2 A', level: 'S2', section: 'A', combination: '' },
    { name: 'S3 A', level: 'S3', section: 'A', combination: '' },
    { name: 'S4 MPC A', level: 'S4', section: 'A', combination: 'MPC' },
    { name: 'S5 MPC A', level: 'S5', section: 'A', combination: 'MPC' },
    { name: 'S6 MPC A', level: 'S6', section: 'A', combination: 'MPC' },
    { name: 'S4 PCB B', level: 'S4', section: 'B', combination: 'PCB' },
    { name: 'S5 PCB B', level: 'S5', section: 'B', combination: 'PCB' },
  ];

  const rebClasses = [];
  for (const c of rebClassData) {
    const cls = await prisma.class.create({
      data: { schoolId: school.id, name: c.name, trade: '', level: c.level, section: c.section, combination: c.combination, systemType: 'reb', status: 'active' },
    });
    rebClasses.push(cls);
  }
  console.log('Created', rebClasses.length, 'REB classes');

  // Teachers
  const teacherData = [
    { username: 'teacher1', fullName: 'Jean Paul Habimana', email: 'jp@essjt.rw' },
    { username: 'teacher2', fullName: 'Marie Claire Uwase', email: 'mc@essjt.rw' },
    { username: 'teacher3', fullName: 'Eric Nkurunziza', email: 'en@essjt.rw' },
    { username: 'teacher4', fullName: 'Alice Mukamana', email: 'am@essjt.rw' },
    { username: 'teacher5', fullName: 'Robert Bizimana', email: 'rb@essjt.rw' },
  ];

  const teachers = [];
  for (let i = 0; i < teacherData.length; i++) {
    const t = teacherData[i];
    const user = await prisma.user.create({
      data: { username: t.username, email: t.email, password: await hash('teacher123'), role: 'teacher', schoolId: school.id, status: 'active' },
    });
    const teacher = await prisma.teacher.create({
      data: {
        userId: user.id, schoolId: school.id,
        teacherId: `TCH${String(i + 1).padStart(4, '0')}`,
        fullName: t.fullName, gender: i % 2 === 0 ? 'Male' : 'Female',
        subjects: 'Mathematics', status: 'active',
        classes: { connect: [{ id: tvetClasses[i % tvetClasses.length].id }] },
      },
    });
    teachers.push(teacher);
  }
  console.log('Created', teachers.length, 'teachers');

  // TVET Students
  const tvetNames = [
    ['Jean Damascene Niyonzima','Male'],['Clarisse Uwimana','Female'],
    ['Patrick Habimana','Male'],['Grace Mukandori','Female'],
    ['Samuel Bizimana','Male'],['Diane Ingabire','Female'],
    ['Claude Nshimiyimana','Male'],['Sandrine Uwase','Female'],
    ['Thierry Kagame','Male'],['Pascaline Mutesi','Female'],
    ['Innocent Rutayisire','Male'],['Solange Nyiraneza','Female'],
    ['Fidele Nsanzimana','Male'],['Vestine Mukandayisenga','Female'],
    ['Celestin Niyongabo','Male'],['Yvonne Uwingabire','Female'],
    ['Olivier Ndayisaba','Male'],['Chantal Uwineza','Female'],
    ['Alexis Hakizimana','Male'],['Josiane Umutesi','Female'],
  ];

  for (let i = 0; i < tvetNames.length; i++) {
    const [fullName, gender] = tvetNames[i];
    const studentId = `stu${String(i + 1).padStart(4, '0')}`;
    const cls = tvetClasses[i % tvetClasses.length];
    const user = await prisma.user.create({
      data: { username: studentId, email: `${studentId}@essjt.rw`, password: await hash('student123'), role: 'student', schoolId: school.id, status: 'active' },
    });
    await prisma.student.create({
      data: {
        userId: user.id, schoolId: school.id, studentId: studentId.toUpperCase(),
        fullName, gender, systemType: 'tvet', trade: cls.trade, combination: '',
        level: cls.level, section: cls.section, classId: cls.id,
        status: 'active', feePaid: 50000 + (i * 2000), feeBalance: i % 4 === 0 ? 30000 : 0,
      },
    });
  }
  console.log('Created 20 TVET students');

  // REB Students
  const rebNames = [
    ['Alice Uwimana','Female'],['Bob Nkurunziza','Male'],
    ['Claire Mukamana','Female'],['David Habimana','Male'],
    ['Eve Ingabire','Female'],['Frank Niyonzima','Male'],
    ['Grace Uwase','Female'],['Henry Bizimana','Male'],
    ['Iris Mukandori','Female'],['James Nshimiyimana','Male'],
    ['Karen Uwizeyimana','Female'],['Leon Habimana','Male'],
    ['Marie Nyiraneza','Female'],['Noah Kagame','Male'],
    ['Olivia Mutesi','Female'],['Peter Rutayisire','Male'],
  ];

  for (let i = 0; i < rebNames.length; i++) {
    const [fullName, gender] = rebNames[i];
    const studentId = `reb${String(i + 1).padStart(4, '0')}`;
    const cls = rebClasses[i % rebClasses.length];
    const user = await prisma.user.create({
      data: { username: studentId, email: `${studentId}@essjt.rw`, password: await hash('student123'), role: 'student', schoolId: school.id, status: 'active' },
    });
    await prisma.student.create({
      data: {
        userId: user.id, schoolId: school.id, studentId: studentId.toUpperCase(),
        fullName, gender, systemType: 'reb', trade: '', combination: cls.combination,
        level: cls.level, section: cls.section, classId: cls.id,
        status: 'active', feePaid: 75000 + (i * 3000), feeBalance: i % 3 === 0 ? 25000 : 0,
      },
    });
  }
  console.log('Created 16 REB students');

  // Parents
  const parentData = [
    { username: 'parent1', fullName: 'Emmanuel Nkurunziza', email: 'p1@essjt.rw', phone: '+250788111001' },
    { username: 'parent2', fullName: 'Josephine Uwase', email: 'p2@essjt.rw', phone: '+250788111002' },
    { username: 'parent3', fullName: 'Augustin Habimana', email: 'p3@essjt.rw', phone: '+250788111003' },
    { username: 'parent4', fullName: 'Therese Mukamana', email: 'p4@essjt.rw', phone: '+250788111004' },
    { username: 'parent5', fullName: 'Francois Bizimana', email: 'p5@essjt.rw', phone: '+250788111005' },
  ];

  const allStudents = await prisma.student.findMany({ where: { schoolId: school.id }, take: 10 });

  for (let i = 0; i < parentData.length; i++) {
    const p = parentData[i];
    const user = await prisma.user.create({
      data: { username: p.username, email: p.email, password: await hash('parent123'), role: 'parent', schoolId: school.id, status: 'active' },
    });
    const parent = await prisma.parent.create({
      data: { userId: user.id, schoolId: school.id, fullName: p.fullName, phone: p.phone },
    });
    if (allStudents[i * 2]) await prisma.parentStudent.create({ data: { parentId: parent.id, studentId: allStudents[i * 2].id, relation: "Parent" } });
    if (allStudents[i * 2 + 1]) await prisma.parentStudent.create({ data: { parentId: parent.id, studentId: allStudents[i * 2 + 1].id, relation: "Parent" } });
  }
  console.log('Created 5 parents');

  // Subjects
  const subjectNames = ['Mathematics','English','Kinyarwanda','French','Physics','Chemistry','Biology','Computer Science','Web Development','Database Systems','Networking','Electronics Basics','Entrepreneurship','Social Studies','ICT'];
  const subjects = [];
  for (const name of subjectNames) {
    const s = await prisma.subject.create({
      data: { schoolId: school.id, name, code: name.substring(0, 4).toUpperCase(), status: 'active' },
    });
    subjects.push(s);
  }
  console.log('Created', subjects.length, 'subjects');

  // Marks
  const allStudentsList = await prisma.student.findMany({ where: { schoolId: school.id }, take: 20 });
  let markCount = 0;
  for (const student of allStudentsList) {
    for (const subject of subjects.slice(0, 5)) {
      for (const term of ['Term 1', 'Term 2']) {
        const score = 45 + Math.floor(Math.random() * 50);
        await prisma.mark.create({
          data: {
            studentId: student.id, subjectId: subject.id,
            marks: score,
            grade: score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F',
            term, examType: 'Exam', academicYear: '2026',
          },
        });
        markCount++;
      }
    }
  }
  console.log('Created', markCount, 'marks');

  // Attendance
  const today = new Date();
  let attCount = 0;
  for (const student of allStudentsList.slice(0, 15)) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      const statuses = ['present','present','present','present','absent','late','present'];
      await prisma.attendance.create({
        data: {
          studentId: student.id,
          classId: student.classId || tvetClasses[0].id,
          date, status: statuses[d], markedBy: teachers[0].id,
        },
      });
      attCount++;
    }
  }
  console.log('Created', attCount, 'attendance records');

  // Payments
  let payCount = 0;
  for (const student of allStudentsList.slice(0, 15)) {
    if (student.feePaid > 0) {
      await prisma.payment.create({
        data: {
          schoolId: school.id, studentId: student.id,
          amount: student.feePaid,
          paymentMethod: payCount % 2 === 0 ? 'Cash' : 'Mobile Money',
          receiptNumber: `RCP${String(payCount + 1).padStart(5, '0')}`,
          paidFor: 'Tuition Fee', term: 'Term 1',
          paidAt: new Date(today.getTime() - (payCount * 2 * 24 * 60 * 60 * 1000)),
        },
      });
      payCount++;
    }
  }
  console.log('Created', payCount, 'payments');

  // Announcements
  await prisma.announcement.create({ data: { schoolId: school.id, title: 'Welcome to 2026 academic year!', content: 'All students should report to their classes by Monday.', audience: 'all', priority: 'high' } });
  await prisma.announcement.create({ data: { schoolId: school.id, title: 'Term 1 exam timetable released', content: 'The Term 1 examination timetable is now available.', audience: 'students', priority: 'normal' } });
  await prisma.announcement.create({ data: { schoolId: school.id, title: 'Staff meeting this Friday', content: 'All teaching staff required at 3:00 PM in the main hall.', audience: 'teachers', priority: 'high' } });
  console.log('Created announcements');

  // Events
  await prisma.event.create({ data: { schoolId: school.id, title: 'Sports Day 2026', description: 'Annual inter-class sports competition.', date: new Date('2026-05-15'), location: 'School Grounds'} });
  await prisma.event.create({ data: { schoolId: school.id, title: 'Parents Open Day', description: 'Parents invited to meet teachers.', date: new Date('2026-04-25'), location: 'Main Hall'} });
  console.log('Created events');

  // Fee structures
  await prisma.feeStructure.create({ data: { schoolId: school.id, name: 'TVET L4 Tuition', amount: 80000, term: 'Term 1', academicYear: '2026', dueDate: new Date('2026-02-01') } });
  await prisma.feeStructure.create({ data: { schoolId: school.id, name: 'REB S4 Tuition', amount: 100000, term: 'Term 1', academicYear: '2026', dueDate: new Date('2026-02-01') } });

  // Settings
  await prisma.setting.create({ data: { schoolId: school.id, key: 'academic_year', value: '2026' } });
  await prisma.setting.create({ data: { schoolId: school.id, key: 'current_term', value: 'Term 1' } });

  console.log('\n========================================');
  console.log('Seed completed successfully!');
  console.log('========================================');
  console.log('\nLogin credentials:');
  console.log('  Admin:    admin     / admin123');
  console.log('  Teacher:  teacher1  / teacher123');
  console.log('  Student:  stu0001   / student123');
  console.log('  Parent:   parent1   / parent123');
}

main()
  .catch((e) => { console.error('Seed error:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });



