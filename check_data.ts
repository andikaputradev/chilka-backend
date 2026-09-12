import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const materials = await prisma.material.findMany({
    select: {
      id: true,
      title: true,
      type: true,
      isGlobal: true,
      classId: true
    }
  });
  console.log('--- Materials ---');
  console.log(`Total: ${materials.length}`);
  materials.forEach(m => {
    console.log(`ID: ${m.id} | Title: ${m.title} | Type: ${m.type} | Global: ${m.isGlobal} | ClassId: ${m.classId}`);
  });

  const subjectClasses = await prisma.class.findMany({
    select: {
      id: true,
      name: true,
      classCode: true
    }
  });
  console.log('\n--- Subject Classes (KKA) ---');
  subjectClasses.forEach(sc => {
    console.log(`ID: ${sc.id} | Name: ${sc.name} | Code: ${sc.classCode}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
