import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const students = [
  "ADRYAN JOVALYN",
  "AKHIIH KIRAAMIN BARARAH",
  "ALDI RAHMAD",
  "ALDILLA FRESHY",
  "ALDO DIALI PUTRA",
  "ANNISA MAHARANI AZ ZAHRA",
  "ANUGERAH PRATAMA PUTRA",
  "BINTANG BILAWAL ADAM",
  "DAFFA FEBRIAN SAPUTRA",
  "FATHAN ARYA BUANA LEANDRO",
  "FATIHA NURUL AHYA",
  "FILDZA THAHIRAH",
  "FINA HASAN",
  "FIRZA SYAPUTRA",
  "INDAH PURNAMA AZZURA",
  "KEVIN GUTAMA",
  "M. KHALIFAH BADAWI",
  "MARVEL ARIK VIRDAUS",
  "MUHAMMAD ALIF AL BUKHARI",
  "MUHAMMAD TAHMID",
  "MUHAMMAD YUDHA KURNIADIV",
  "NABILA KUMAIRAH",
  "NABILA LAILATUL QADHAR",
  "NABILLA",
  "NAZHWA HUMAYRA",
  "RAIHAN AQIL MASTI",
  "RAIHAN NIKMATURRAHMAN",
  "REFFALDI",
  "SITI",
  "YOWALDA RAHMADHANI"
];

async function main() {
  const password = await bcrypt.hash('password123', 10);
  // Menggunakan nama 'Kelas XI PRL' sesuai yang ada di database
  const className = 'Kelas XI PRL';

  const homeClass = await prisma.homeClass.findUnique({
    where: { name: className }
  });

  if (!homeClass) {
    console.error(`Error: Kelas ${className} tidak ditemukan!`);
    return;
  }

  console.log(`--- MEMULAI IMPOR SISWA ${className} (RPL) ---`);

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

  console.log('--- IMPOR RPL SELESAI ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
