import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const students = [
  "ADAM ARRAHMAN",
  "AHMAD HABIBULLAH",
  "AIRHA RAHAYU",
  "ALDO SAPUTRA",
  "ALFI RAHMAT KHAIRAN",
  "AUFAA TURRAHMAH",
  "BAHIR APTA FARAND",
  "DEWI ANDINI",
  "FAHQREL HADI FIRANSYAH",
  "FAHRI APRILIO",
  "FAUZAN ANUGRAH",
  "FURQON SHALIHAT",
  "HUDALIL ABI",
  "ISMAIL MUBARAQ",
  "LAURA PUTRI RIANA",
  "MARVEL ADITYA BUSRA",
  "MUHAMMAD EFMI FATTAN",
  "MUHAMMAD FUJI FORTUNA",
  "MUHAMMAD RAKA RIFALDO",
  "NIA RAMADANI",
  "PUTRI BALQIS BINERVA",
  "PUTRI KEYSHA",
  "RAKA NOFENDRA",
  "RASYAD SAPUTRA",
  "RATU HAYYUDE MAHARANI",
  "SERILA FIFIYANA",
  "TIARA PUTRI RAMADANI",
  "VIKY WINATA",
  "WANGI CAHAYU PUTRI",
  "ZAKY ABIYAN FADENI"
];

async function main() {
  const password = await bcrypt.hash('password123', 10);
  const oldName = 'Kelas XI PDPT';
  const newName = 'Kelas XI PSPT';

  console.log(`--- MENGOREKSI NAMA KELAS: ${oldName} -> ${newName} ---`);

  // Update Nama Kelas terlebih dahulu
  let homeClass = await prisma.homeClass.findUnique({ where: { name: oldName } });
  
  if (homeClass) {
    homeClass = await prisma.homeClass.update({
      where: { id: homeClass.id },
      data: { name: newName }
    });
    console.log(`[OK] Nama kelas berhasil diperbarui.`);
  } else {
    homeClass = await prisma.homeClass.findUnique({ where: { name: newName } });
  }

  if (!homeClass) {
    console.error(`Error: Kelas tidak ditemukan!`);
    return;
  }

  console.log(`--- MEMULAI IMPOR SISWA ${newName} ---`);

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

  console.log(`--- IMPOR ${newName} SELESAI ---`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
