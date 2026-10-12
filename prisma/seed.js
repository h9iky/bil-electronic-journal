const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Деректер базасын толтыру (Seeding database)...");

  // Очистка перед заполнением
  await prisma.proposedGrade.deleteMany();
  await prisma.behaviorRecord.deleteMany();
  await prisma.activityScore.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.teaching.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.klass.deleteMany();
  await prisma.user.deleteMany();

  // 1. Пайдаланушылар (Users)
  const admin = await prisma.user.create({
    data: {
      fullName: "Серік Ахметов",
      email: "admin@bil.edu.kz",
      role: "ADMIN",
    },
  });

  const teacher = await prisma.user.create({
    data: {
      fullName: "Бақыт Нұрлан",
      email: "teacher@bil.edu.kz",
      role: "TEACHER",
    },
  });

  const student1 = await prisma.user.create({
    data: {
      fullName: "Арман Қайрат",
      email: "student@bil.edu.kz",
      role: "STUDENT",
    },
  });

  const student2 = await prisma.user.create({
    data: {
      fullName: "Диас Сәдуақас",
      email: "dias@bil.edu.kz",
      role: "STUDENT",
    },
  });

  const student3 = await prisma.user.create({
    data: {
      fullName: "Айсұлу Мұрат",
      email: "aisulu@bil.edu.kz",
      role: "STUDENT",
    },
  });

  // 2. Сынып (Class)
  const klass10A = await prisma.klass.create({
    data: {
      name: "10А",
      year: "2025/2026",
      curatorId: teacher.id,
    },
  });

  // 3. Пәндер (Subjects)
  const math = await prisma.subject.create({
    data: {
      name: "Алгебра және анализ бастамалары",
      code: "MATH-10",
    },
  });

  const physics = await prisma.subject.create({
    data: {
      name: "Физика",
      code: "PHYS-10",
    },
  });

  const cs = await prisma.subject.create({
    data: {
      name: "Информатика",
      code: "CS-10",
    },
  });

  // 4. Оқушыларды сыныпқа тіркеу (Enrollments)
  for (const st of [student1, student2, student3]) {
    await prisma.enrollment.create({
      data: {
        studentId: st.id,
        classId: klass10A.id,
      },
    });
  }

  // 5. Мұғалімді сабаққа бекіту (Teaching)
  await prisma.teaching.create({
    data: {
      teacherId: teacher.id,
      subjectId: math.id,
      classId: klass10A.id,
    },
  });

  // 6. Бағалау жұмыстары (Assessments: Формативті, БЖБ, ТЖБ)
  const assessmentFA = await prisma.assessment.create({
    data: {
      title: "Формативті бағалау: Функциялар мен олардың қасиеттері",
      type: "FORMATIVE",
      maxScore: 10,
      quarter: 1,
      classId: klass10A.id,
      subjectId: math.id,
      teacherId: teacher.id,
    },
  });

  const assessmentSOR = await prisma.assessment.create({
    data: {
      title: "1-БЖБ (СОР): Тригонометриялық функциялар",
      type: "SOR",
      maxScore: 20,
      quarter: 1,
      classId: klass10A.id,
      subjectId: math.id,
      teacherId: teacher.id,
    },
  });

  const assessmentSOCH = await prisma.assessment.create({
    data: {
      title: "1-ТЖБ (СОЧ): 1-тоқсандық жиынтық бағалау",
      type: "SOCH",
      maxScore: 30,
      quarter: 1,
      classId: klass10A.id,
      subjectId: math.id,
      teacherId: teacher.id,
    },
  });

  // 7. Бағалар (Grades)
  await prisma.grade.create({
    data: {
      assessmentId: assessmentFA.id,
      studentId: student1.id,
      score: 10,
      comment: "Өте жақсы нәтиже!",
    },
  });

  await prisma.grade.create({
    data: {
      assessmentId: assessmentSOR.id,
      studentId: student1.id,
      score: 19,
      comment: "Теоремаларды мінсіз дәлелдеді",
    },
  });

  await prisma.grade.create({
    data: {
      assessmentId: assessmentSOCH.id,
      studentId: student1.id,
      score: 28,
      comment: "Барлық күрделі деңгейдегі есептер шығарылды",
    },
  });

  // 8. 🔥 Белсенділік (ActivityScore 1..10)
  await prisma.activityScore.create({
    data: {
      studentId: student1.id,
      subjectId: math.id,
      teacherId: teacher.id,
      value: 10,
      comment: "Сабақ бойы белсенді сұрақ қойып, тақтада есеп шығарды",
    },
  });

  await prisma.activityScore.create({
    data: {
      studentId: student1.id,
      subjectId: math.id,
      teacherId: teacher.id,
      value: 9,
      comment: "Топтық жұмыста көшбасшылық танытты",
    },
  });

  // 9. 🔥 Тәртіп (BehaviorRecord: бөлек санат)
  await prisma.behaviorRecord.create({
    data: {
      studentId: student1.id,
      classId: klass10A.id,
      teacherId: teacher.id,
      kind: "POSITIVE",
      points: 5,
      comment: "Мектепішілік олимпиадаға қатысушыларға көмек көрсетті",
    },
  });

  await prisma.behaviorRecord.create({
    data: {
      studentId: student1.id,
      classId: klass10A.id,
      teacherId: teacher.id,
      kind: "POSITIVE",
      points: 3,
      comment: "Кабинет тазалығын ұйымдастыруға белсенді атсалысты",
    },
  });

  // 10. 🔥 Потенциалды баға (ProposedGrade)
  await prisma.proposedGrade.create({
    data: {
      studentId: student1.id,
      subjectId: math.id,
      quarter: 1,
      value: 5,
      basis: "activity",
      status: "ACCEPTED",
      createdById: teacher.id,
    },
  });

  console.log("✅ База сәтті толтырылды (Database seeded successfully)!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
