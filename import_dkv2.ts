import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const students = [
  "ANDIKA",
  "ANDRE HADHISWARA",
  "DARUL WASIGANI MUHRIF",
  "FHAREL PUTRA RUFIALDI",
  "GUFRAN SAPUTRA",
  "HABIB BULLAH",
  "HANIYA PUTRI KYANA",
  "HAYATUL NURDINA",
  "HERLINO FAHREL PUTRA",
  "ILHAM ZULTANUL FITRAH",
  "ILYAS GANI",
  "INTAN PERMATA BUNDA",
  "IRFAN HIDAYAT",
  "KHAIRANI FADILLA",
  "M. FADLI",
  "MEILINDA PUTRI",
  "MUHAMMAD ARIL",
  "NABIL IVANDER SABIAN",
  "RAFA PRINCE YURI",
  "RAHMAT MAUFIK",
  "RANGGA JANUWARDI",
  "RIDHO ZALIANDRA",
  "TEGUH HIDAYATULLAH"
];

async function main() {
  const password = await bcrypt.hash('password123', 10);
  const className = 'Kelas XI DKV 2';

  const homeClass = await prisma.homeClass.findUnique({
    where: { name: className }
  });

  if (!homeClass) {
    console.error(`Error: Kelas ${className} tidak ditemukan!`);
    return;
  }

  console.log(`--- MEMULAI IMPOR SISWA ${className} ---`);

  for (const name of students) {
    const username = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    try {
      await prisma.user.upsert({
        where: { username },
        update: {
          name,
          homeClassId: homeClass.id,
          role: UserRole.STUDENT
        },
        create: {
          username,
          password,
          name,
          role: UserRole.STUDENT,
          homeClassId: homeClass.id
        }
      });
      console.log(`[OK] ${name} -> ${username}`);
    } catch (e) {
      console.error(`[GAGAL] ${name}:`, e);
    }
  }

  console.log('--- IMPOR DKV 2 SELESAI ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
