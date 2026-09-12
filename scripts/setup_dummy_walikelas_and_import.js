const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { PrismaClient, UserRole } = require('@prisma/client');

const prisma = new PrismaClient();
const PASSWORD_AWAL = 'password123';
const SUMBER = path.join(__dirname, 'siswa_baru.json');

function buatSlug(nama) {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

function usernameUnik(dasar, terpakai) {
  let calon = dasar || 'siswa';
  let n = 2;
  while (terpakai.has(calon)) {
    calon = `${dasar}_${n}`;
    n += 1;
  }
  terpakai.add(calon);
  return calon;
}

async function main() {
  const hash = await bcrypt.hash(PASSWORD_AWAL, 10);

  // 1. Definisikan Wali Kelas Dummy untuk kelas yang belum punya
  const dummyWalikelasData = [
    { username: 'wali_tkj3', name: 'Wali Kelas XI TKJ 3 (Dummy)', kelas: 'Kelas XI TKJ 3' },
    { username: 'wali_rpl2', name: 'Wali Kelas XI RPL 2 (Dummy)', kelas: 'Kelas XI RPL 2' },
    { username: 'wali_pspt2', name: 'Wali Kelas XI PSPT 2 (Dummy)', kelas: 'Kelas XI PSPT 2' },
  ];

  console.log('--- 1. MERAPIKAN/MEMBUAT WALI KELAS DUMMY ---');
  const dummyWaliMap = {};
  for (const d of dummyWalikelasData) {
    let user = await prisma.user.findUnique({ where: { username: d.username } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: d.username,
          name: d.name,
          password: hash,
          role: UserRole.TEACHER,
        },
      });
      console.log(`[DUMMY CREATED] ${d.name} (${d.username})`);
    } else {
      console.log(`[DUMMY EXISTS] ${d.name} (${d.username})`);
    }
    dummyWaliMap[d.kelas] = user;
  }

  // 2. Pemetaan nama kelas Excel -> HomeClass DB
  const existingRenames = [
    { oldName: 'Kelas XI PRL', newName: 'Kelas XI RPL 1' },
    { oldName: 'Kelas XI PSPT', newName: 'Kelas XI PSPT 1' },
  ];
  for (const r of existingRenames) {
    const existing = await prisma.homeClass.findUnique({ where: { name: r.oldName } });
    if (existing) {
      await prisma.homeClass.update({
        where: { id: existing.id },
        data: { name: r.newName },
      });
      console.log(`[RENAME CLASS] ${r.oldName} -> ${r.newName}`);
    }
  }

  // Ensure all 9 HomeClasses exist in DB
  const allHomeClassDefs = [
    { name: 'Kelas XI TKJ 1', defaultWaliUsername: 'yastati' },
    { name: 'Kelas XI TKJ 2', defaultWaliUsername: 'fahmi_zain' },
    { name: 'Kelas XI TKJ 3', defaultWaliUsername: 'wali_tkj3' },
    { name: 'Kelas XI RPL 1', defaultWaliUsername: 'andriza' },
    { name: 'Kelas XI RPL 2', defaultWaliUsername: 'wali_rpl2' },
    { name: 'Kelas XI DKV 1', defaultWaliUsername: 'nova_fitri' },
    { name: 'Kelas XI DKV 2', defaultWaliUsername: 'afatman_hamid' },
    { name: 'Kelas XI PSPT 1', defaultWaliUsername: 'susy_elvina' },
    { name: 'Kelas XI PSPT 2', defaultWaliUsername: 'wali_pspt2' },
  ];

  console.log('\n--- 2. MEMASTIKAN 9 HOMECLASS & KELAS KKA ADA DI DATABASE ---');
  const homeClassMap = {};

  for (const hcDef of allHomeClassDefs) {
    let hc = await prisma.homeClass.findUnique({ where: { name: hcDef.name } });
    if (!hc) {
      const waliUser = await prisma.user.findUnique({ where: { username: hcDef.defaultWaliUsername } });
      if (!waliUser) throw new Error(`Wali user ${hcDef.defaultWaliUsername} not found!`);
      hc = await prisma.homeClass.create({
        data: {
          name: hcDef.name,
          waliKelasId: waliUser.id,
        },
      });
      console.log(`[HOMECLASS CREATED] ${hcDef.name} dengan Wali: ${waliUser.name}`);
    } else {
      console.log(`[HOMECLASS EXISTS] ${hcDef.name}`);
    }
    homeClassMap[hcDef.name] = hc;

    // Check / Create Subject Class KKA
    let subClass = await prisma.class.findFirst({ where: { homeClassId: hc.id } });
    if (!subClass) {
      const code = `KKA-${hcDef.name.replace(/\s+/g, '-')}`.toUpperCase();
      let teacherUsername = hcDef.defaultWaliUsername;
      const teacherUser = await prisma.user.findUnique({ where: { username: teacherUsername } });
      await prisma.class.create({
        data: {
          name: 'Koding dan Kecerdasan Artifisial (KKA)',
          classCode: code,
          homeClassId: hc.id,
          teachers: teacherUser ? { connect: [{ id: teacherUser.id }] } : undefined,
        },
      });
      console.log(`[KKA SUBJECT CLASS CREATED] untuk ${hcDef.name}`);
    }
  }

  // 3. Import Siswa dari siswa_baru.json ke 9 Kelas
  console.log('\n--- 3. IMPORT SISWA UNTUK 9 KELAS ---');
  const dataExcel = JSON.parse(fs.readFileSync(SUMBER, 'utf8'));

  const excelToDbName = {
    'XI TKJ 1': 'Kelas XI TKJ 1',
    'XI TKJ 2': 'Kelas XI TKJ 2',
    'XI TKJ 3': 'Kelas XI TKJ 3',
    'XI RPL 1': 'Kelas XI RPL 1',
    'XI RPL 2': 'Kelas XI RPL 2',
    'XI DKV 1': 'Kelas XI DKV 1',
    'XI DKV 2': 'Kelas XI DKV 2',
    'XI PSPT 1': 'Kelas XI PSPT 1',
    'XI PSPT 2': 'Kelas XI PSPT 2',
  };

  const semuaUser = await prisma.user.findMany({ select: { id: true, username: true, role: true } });
  const terpakai = new Set(semuaUser.filter((u) => u.role !== 'STUDENT').map((u) => u.username));

  await prisma.$transaction(
    async (tx) => {
      // Hapus seluruh siswa lama di ke-9 kelas
      for (const targetName of Object.values(excelToDbName)) {
        const hc = homeClassMap[targetName];
        await tx.user.deleteMany({ where: { homeClassId: hc.id, role: 'STUDENT' } });
      }

      // Buat akun siswa baru
      for (const item of dataExcel) {
        const dbClassName = excelToDbName[item.kelas];
        const hc = homeClassMap[dbClassName];
        if (!hc) {
          console.warn(`Warning: HomeClass ${dbClassName} not found in map!`);
          continue;
        }

        const studentData = item.siswa.map((s) => {
          const dasar = buatSlug(s.nama);
          const username = usernameUnik(dasar, terpakai);
          return {
            username,
            password: hash,
            name: s.nama,
            role: UserRole.STUDENT,
            homeClassId: hc.id,
          };
        });

        await tx.user.createMany({ data: studentData });
        console.log(`[IMPORTED] ${studentData.length} siswa -> ${dbClassName}`);
      }
    },
    { timeout: 120000 }
  );

  console.log('\n--- 4. VERIFIKASI AKHIR DATABASE ---');
  const finalClasses = await prisma.homeClass.findMany({
    include: {
      waliKelas: true,
      _count: { select: { students: true } },
    },
  });

  for (const fc of finalClasses) {
    console.log(`  ${fc.name.padEnd(20)} | Wali: ${fc.waliKelas.name.padEnd(35)} | Total: ${fc._count.students} siswa`);
  }
}

main()
  .catch((err) => {
    console.error('Error during setup:', err);
  })
  .finally(() => prisma.$disconnect());
