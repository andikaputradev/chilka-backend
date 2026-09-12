import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTeacherStats() {
  console.log('--- TEACHER DATA INVESTIGATION ---');
  
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    include: {
      teachingClasses: {
        include: {
          homeClass: {
            include: {
              _count: { select: { students: true } }
            }
          }
        }
      }
    }
  });

  teachers.forEach(t => {
    const totalStudents = t.teachingClasses.reduce((acc, curr) => acc + (curr.homeClass?._count.students || 0), 0);
    console.log(`Guru: ${t.name} (@${t.username})`);
    console.log(`- Jumlah Kelas Diajar: ${t.teachingClasses.length}`);
    console.log(`- Total Siswa Terdeteksi: ${totalStudents}`);
    t.teachingClasses.forEach(sc => {
      console.log(`  * Mapel: ${sc.name} (${sc.classCode}) -> Dari Kelas (HomeClass): ${sc.homeClass?.name} -> Siswa: ${sc.homeClass?._count.students || 0}`);
    });
    console.log('-----------------------------------');
  });
}

checkTeacherStats().finally(() => prisma.$disconnect());
