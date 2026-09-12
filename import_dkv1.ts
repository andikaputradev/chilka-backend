import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const students = [
  "ADRIAN MAULANA",
  "AFIF LUQMAN",
  "AHMAD HAFIZD Z",
  "AIZARA ANANDITA PUTRI",
  "FAUZIAH HAYATI PUTRI",
  "FHARISYA AURELLIA MAHARANI.C",
  "HAYATUL NURDINI",
  "LARISA ZURI DERMAWAN",
  "MENTARI RAHMADANI",
  "MUHAMMAD ABDUL LATIF",
  "MUHAMMAD ADRIAN MAULANA PUTRA",
  "MUHAMMAD FAREL FERDIAN",
  "MUHAMMAD RAFA NASRULLAH",
  "MUHAMMAD RAFI",
  "MUHAMMAD RAZQI NURSAL",
  "MUHAMMAD RIZKI",
  "MUHAMMAD SHARUL",
  "QORY ARDYA NOZA",
  "RAMADHANI",
  "RAFLY PERDANA PUTRA",
  "RIDHO FABILLILAH",
  "RISKA FEBRI ANISA",
  "SELIA ANJANI",
  "SYAHRA PUTRI WARDHANI",
  "TIARA TRI RAHAYU"
];

async function main() {
  const password = await bcrypt.hash('password123', 10);
  const className = 'Kelas XI DKV 1';

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

  console.log('--- IMPOR DKV 1 SELESAI ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
