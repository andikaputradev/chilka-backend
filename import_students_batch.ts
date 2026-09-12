import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const dataSiswa = {
  'Kelas XI TKJ 1': [
    "AGUPIN FAUZIAN", "FATINAH FAUZIAH", "GANISA ZATULLINI", "GUNTUR PUTRA GUNAWAN",
    "HAPIS", "IKHRAM AR RIZKY", "ILHAM RAMADHAN", "IMALATUNIL KHAIRA",
    "IRSYAD HABIBURAHMAN", "JEFRI HANDRA", "KEVIN ALBERTO", "KHIRANIA PUTRI SANDRA",
    "M. BAYU PRATAMA", "M. NABIL GUSTIAN", "MUHAMMAD AKBAR", "MUHAMMAD KEVIN",
    "MUHAMMAD RIDWAN", "MUTIA REZEKI", "NAYLA CHINTYA RAHMI", "RAAFID ALFAJRI",
    "RAHMAT ILAHI", "RANGGA MAIPAL PUTRA", "RAZAQ MAHMUDI", "REFINA SARI",
    "SALSABILA NAKEYSHA", "SEPTIAN RAHMADANI", "VERGAN DEWID", "WAHYU FIRMANSYAH",
    "ZIKRI AZHARI"
  ],
  'Kelas XI TKJ 2': [
    "ANDIKA BURNALIS PUTRA", "BAYU KURNIA PRATAMA", "FADLI AFRIANSYAH", "FAIZ ABDILLAH",
    "FAREL ADRIYONDRA", "IKHSAN WAHYU AL FARAS", "IRSYAD KHAIRI", "IRWAN SAPUTRA",
    "JUMATUL RAHMAN", "MARFEL REZEKY", "MISRA PUTRI", "MUHAMMAD FAREL AKBAR",
    "MUHAMMAD SAIFULLAH", "MUHAMMAD ZIKRY", "NABIL ABI BURAHMAN", "OURPHEOUS",
    "RAHMAD DANI", "RASYID MAHMUDI", "RAVAEL ANANDA PUTRA", "REHAN EFENDI",
    "SUCI GUSRI", "YOGA ALDIYANSYAH", "ZUFAIR QISTHI KANNABI"
  ]
};

async function main() {
  const password = await bcrypt.hash('password123', 10);

  console.log('--- MEMULAI PROSES IMPOR SISWA (KOREKSI) ---');

  for (const [className, students] of Object.entries(dataSiswa)) {
    const homeClass = await prisma.homeClass.findUnique({ where: { name: className } });

    if (!homeClass) {
      console.error(`Error: Kelas ${className} tidak ditemukan!`);
      continue;
    }

    console.log(`\nImpor ke ${className} (${students.length} siswa):`);

    for (const name of students) {
      // Create clean username: lower case, spaces to underscore, remove special chars
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
  }

  console.log('\n--- SEMUA DATA BERHASIL DIIMPOR ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
