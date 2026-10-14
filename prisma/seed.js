const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Демо-данные BILgrade.
 *
 * Значения «перечислений» дублируют src/lib/constants.ts (seed не умеет
 * импортировать TypeScript): FORMATIVE|SAS|SAT, DRAFT|PUBLISHED,
 * POSITIVE|NEGATIVE|NEUTRAL, PENDING|ACCEPTED|REJECTED.
 */

// Детерминированный ПСЧ — чтобы при повторном сиде цифры были те же.
function makeRandom(seed) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(20261014);
const scoreFor = (max) => Math.round(max * (0.55 + random() * 0.45));

const STUDENTS = [
  ["Арман Қайрат", "student@bil.edu.kz"],
  ["Диас Сәдуақас", "dias@bil.edu.kz"],
  ["Айсұлу Мұрат", "aisulu@bil.edu.kz"],
  ["Нұрсұлтан Ербол", "nursultan@bil.edu.kz"],
  ["Аружан Серік", "aruzhan@bil.edu.kz"],
  ["Ерасыл Тимур", "erasyl@bil.edu.kz"],
  ["Мадина Қуаныш", "madina@bil.edu.kz"],
  ["Саңжар Асқар", "sanzhar@bil.edu.kz"],
  ["Дана Ерлан", "dana@bil.edu.kz"],
  ["Әлихан Нұрлан", "alikhan@bil.edu.kz"],
  ["Томирис Бауыржан", "tomiris@bil.edu.kz"],
  ["Жаннұр Азамат", "zhannur@bil.edu.kz"],
];

async function clearAll() {
  await prisma.attendance.deleteMany();
  await prisma.proposedGrade.deleteMany();
  await prisma.behaviorRecord.deleteMany();
  await prisma.activityScore.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.section.deleteMany();
  await prisma.classSettings.deleteMany();
  await prisma.teaching.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.klass.deleteMany();
  await prisma.user.deleteMany();
}

async function createUsers() {
  const admin = await prisma.user.create({
    data: { fullName: "Серік Ахметов", email: "admin@bil.edu.kz", role: "ADMIN" },
  });
  const mathTeacher = await prisma.user.create({
    data: { fullName: "Бақыт Нұрлан", email: "teacher@bil.edu.kz", role: "TEACHER" },
  });
  const csTeacher = await prisma.user.create({
    data: { fullName: "Ержан Смағұл", email: "teacher2@bil.edu.kz", role: "TEACHER" },
  });

  const students = [];
  for (const [fullName, email] of STUDENTS) {
    students.push(
      await prisma.user.create({ data: { fullName, email, role: "STUDENT" } }),
    );
  }

  return { admin, mathTeacher, csTeacher, students };
}

async function createClass(curatorId) {
  const klass = await prisma.klass.create({
    data: {
      name: "10А",
      year: "2025/2026",
      curatorId,
      settings: {
        create: {
          sasWeight: 50,
          satWeight: 50,
          formativeWeight: 0,
          thresholdThree: 40,
          thresholdFour: 65,
          thresholdFive: 85,
          maxSasPerQuarter: 4,
          maxSatPerQuarter: 1,
          rounding: "HALF_UP",
        },
      },
    },
  });
  return klass;
}

async function createSubjects() {
  const math = await prisma.subject.create({
    data: { name: "Алгебра және анализ бастамалары", code: "MATH-10" },
  });
  const physics = await prisma.subject.create({
    data: { name: "Физика", code: "PHYS-10" },
  });
  const cs = await prisma.subject.create({
    data: { name: "Информатика", code: "CS-10" },
  });
  return { math, physics, cs };
}

async function createSections(mathId) {
  const section1 = await prisma.section.create({
    data: { subjectId: mathId, quarter: 1, order: 1, title: "Тригонометриялық функциялар" },
  });
  const section2 = await prisma.section.create({
    data: { subjectId: mathId, quarter: 1, order: 2, title: "Туынды және оны қолдану" },
  });
  return { section1, section2 };
}

async function createTeachings(klassId, mathTeacherId, csTeacherId, subjects) {
  await prisma.teaching.create({
    data: { teacherId: mathTeacherId, subjectId: subjects.math.id, classId: klassId },
  });
  await prisma.teaching.create({
    data: { teacherId: mathTeacherId, subjectId: subjects.physics.id, classId: klassId },
  });
  await prisma.teaching.create({
    data: { teacherId: csTeacherId, subjectId: subjects.cs.id, classId: klassId },
  });
}

async function createAssessments({ klassId, subjects, sections, mathTeacherId }) {
  const base = { classId: klassId, teacherId: mathTeacherId, quarter: 1 };

  const formative = await prisma.assessment.create({
    data: {
      ...base,
      type: "FORMATIVE",
      status: "PUBLISHED",
      title: "Формативті: функциялар мен қасиеттер",
      subjectId: subjects.math.id,
      maxScore: 10,
    },
  });
  const sas1 = await prisma.assessment.create({
    data: {
      ...base,
      type: "SAS",
      status: "PUBLISHED",
      sectionId: sections.section1.id,
      title: "1-SAS: Тригонометриялық теңдеулер",
      subjectId: subjects.math.id,
      maxScore: 20,
    },
  });
  const sas2 = await prisma.assessment.create({
    data: {
      ...base,
      type: "SAS",
      status: "DRAFT",
      sectionId: sections.section2.id,
      title: "2-SAS: Туынды есептері",
      subjectId: subjects.math.id,
      maxScore: 20,
    },
  });
  const sat = await prisma.assessment.create({
    data: {
      ...base,
      type: "SAT",
      status: "PUBLISHED",
      title: "1-SAT: тоқсандық жиынтық",
      subjectId: subjects.math.id,
      maxScore: 30,
    },
  });

  return { formative, sas1, sas2, sat };
}

async function createGrades(assessments, students) {
  // Оценки ставим только по опубликованным работам — черновик пустой.
  const published = [assessments.formative, assessments.sas1, assessments.sat];
  for (const assessment of published) {
    for (const student of students) {
      await prisma.grade.create({
        data: {
          assessmentId: assessment.id,
          studentId: student.id,
          score: scoreFor(assessment.maxScore),
        },
      });
    }
  }
}

async function createActivity(students, mathId, teacherId) {
  const comments = [
    "Сабақ бойы белсенді болды",
    "Топтық жұмыста көшбасшылық танытты",
    "Қосымша сұрақтар қойды",
    "Тақтада есеп шығарды",
  ];
  const studentsToRate = students.slice(0, 6);
  for (const student of studentsToRate) {
    const entries = 2 + Math.floor(random() * 2);
    for (let i = 0; i < entries; i += 1) {
      await prisma.activityScore.create({
        data: {
          studentId: student.id,
          subjectId: mathId,
          teacherId,
          value: 6 + Math.floor(random() * 5), // 6..10
          comment: comments[Math.floor(random() * comments.length)],
          date: new Date(2026, 8, 5 + i),
        },
      });
    }
  }
}

async function createBehavior(students, klassId, teacherId) {
  const events = [
    { student: students[0], kind: "POSITIVE", points: 5, comment: "Олимпиадаға қатысушыларға көмектесті" },
    { student: students[0], kind: "POSITIVE", points: 3, comment: "Кабинет тазалығын ұйымдастырды" },
    { student: students[1], kind: "NEGATIVE", points: 2, comment: "Сабаққа кешікті" },
    { student: students[2], kind: "POSITIVE", points: 4, comment: "Мұғалімге материал дайындауға көмектесті" },
    { student: students[3], kind: "NEUTRAL", points: 0, comment: "Сынып жиналысында белсенді болды" },
  ];
  for (const event of events) {
    await prisma.behaviorRecord.create({
      data: {
        studentId: event.student.id,
        classId: klassId,
        teacherId,
        kind: event.kind,
        points: event.points,
        comment: event.comment,
        date: new Date(2026, 8, 10),
      },
    });
  }
}

async function createAttendance(students, klassId, subjectId, teacherId) {
  // Три учебных дня сентября 2026 — чтобы вкладка посещаемости была не пустой.
  // Дата — начало суток UTC: так выборка совпадает с уникальным ключом.
  const days = [
    new Date(Date.UTC(2026, 8, 22)),
    new Date(Date.UTC(2026, 8, 24)),
    new Date(Date.UTC(2026, 8, 26)),
  ];
  const spread = ["PRESENT", "PRESENT", "PRESENT", "PRESENT", "LATE", "ABSENT", "EXCUSED"];
  for (const date of days) {
    for (const student of students) {
      await prisma.attendance.create({
        data: {
          studentId: student.id,
          classId: klassId,
          subjectId,
          teacherId,
          date,
          status: spread[Math.floor(random() * spread.length)],
        },
      });
    }
  }
}

async function createProposals(students, mathId, klassId, teacherId) {
  // Принятое предложение — влияет на итог; висящее — ждёт решения учителя.
  await prisma.proposedGrade.create({
    data: {
      studentId: students[0].id,
      subjectId: mathId,
      classId: klassId,
      quarter: 1,
      value: 5,
      basis: "activity",
      status: "ACCEPTED",
      createdById: teacherId,
    },
  });
  await prisma.proposedGrade.create({
    data: {
      studentId: students[1].id,
      subjectId: mathId,
      classId: klassId,
      quarter: 1,
      value: 4,
      basis: "behavior",
      status: "PENDING",
      createdById: teacherId,
    },
  });
}

async function main() {
  console.log("🌱 Деректер базасын толтыру (seeding)...");
  await clearAll();

  const { mathTeacher, csTeacher, students } = await createUsers();
  const klass = await createClass(mathTeacher.id);
  const subjects = await createSubjects();
  const sections = await createSections(subjects.math.id);

  for (const student of students) {
    await prisma.enrollment.create({
      data: { studentId: student.id, classId: klass.id },
    });
  }

  await createTeachings(klass.id, mathTeacher.id, csTeacher.id, subjects);
  const assessments = await createAssessments({
    klassId: klass.id,
    subjects,
    sections,
    mathTeacherId: mathTeacher.id,
  });

  await createGrades(assessments, students);
  await createActivity(students, subjects.math.id, mathTeacher.id);
  await createBehavior(students, klass.id, mathTeacher.id);
  await createAttendance(students, klass.id, subjects.math.id, mathTeacher.id);
  await createProposals(students, subjects.math.id, klass.id, mathTeacher.id);

  console.log(`✅ Дайын: ${students.length} оқушы, 1 сынып, 4 жұмыс (1 черновик).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
