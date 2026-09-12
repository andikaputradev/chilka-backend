const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { PrismaClient, UserRole } = require('@prisma/client');

const prisma = new PrismaClient();
const PASSWORD_AWAL = 'password123';

/** Real Wali Kelas Data from Ketua GOODLIKE */
const REAL_WALI_KELAS = [
  { kelas: 'Kelas XI RPL 1',  name: 'Nova Fitri Yuliza, S.Pd',  username: 'nova_fitri' },
  { kelas: 'Kelas XI RPL 2',  name: 'Susy Elvina, S.Ag',       username: 'susy_elvina' },
  { kelas: 'Kelas XI TKJ 1',  name: 'Andriza, S.Pd',           username: 'andriza' },
  { kelas: 'Kelas XI TKJ 2',  name: 'Mil Ussamawati RI, S.Pd', username: 'mil_ussamawati' },
  { kelas: 'Kelas XI TKJ 3',  name: 'Ceci Venesa, S.Pd',        username: 'ceci_venesa' },
  { kelas: 'Kelas XI DKV 1',  name: 'Suci Vainani, S.Pd',       username: 'suci_vainani' },
  { kelas: 'Kelas XI DKV 2',  name: 'Neli Yufida, S.Pd',        username: 'neli_yufida' },
  { kelas: 'Kelas XI PSPT 1', name: 'Ikrar Fardila, S.Sn',      username: 'ikrar_fardila' },
  { kelas: 'Kelas XI PSPT 2', name: 'Andri Sukarman, S.Pd',     username: 'andri_sukarman' },
];

async function main() {
  const hash = await bcrypt.hash(PASSWORD_AWAL, 10);

  console.log('--- UPDATING REAL WALI KELAS IN DATABASE ---');

  // 1. Create or Update all Teacher users first
  const teacherMap = {};
  for (const item of REAL_WALI_KELAS) {
    let teacher = await prisma.user.findUnique({ where: { username: item.username } });
    if (!teacher) {
      teacher = await prisma.user.create({
        data: {
          username: item.username,
          name: item.name,
          password: hash,
          role: UserRole.TEACHER,
        },
      });
      console.log(`[TEACHER CREATED] ${item.name} (${item.username})`);
    } else {
      teacher = await prisma.user.update({
        where: { id: teacher.id },
        data: { name: item.name, role: UserRole.TEACHER },
      });
      console.log(`[TEACHER UPDATED] ${item.name} (${item.username})`);
    }
    teacherMap[item.kelas] = teacher;
  }

  // 2. Clear old dummy users if present
  const dummyUsernames = ['wali_tkj3', 'wali_rpl2', 'wali_pspt2'];
  for (const dUser of dummyUsernames) {
    const dummy = await prisma.user.findUnique({ where: { username: dUser } });
    if (dummy) {
      // Find homeclass referencing dummy and detach
      const hc = await prisma.homeClass.findFirst({ where: { waliKelasId: dummy.id } });
      if (!hc) {
        await prisma.user.delete({ where: { id: dummy.id } });
        console.log(`[CLEANUP DUMMY USER] ${dUser} removed.`);
      }
    }
  }

  // 3. Update each HomeClass with its real Wali Kelas ID
  for (const item of REAL_WALI_KELAS) {
    const teacher = teacherMap[item.kelas];
    let hc = await prisma.homeClass.findUnique({ where: { name: item.kelas } });

    if (hc) {
      // If teacher is currently linked to another class, update that class first or exchange
      const otherHc = await prisma.homeClass.findFirst({
        where: { waliKelasId: teacher.id, NOT: { id: hc.id } }
      });
      if (otherHc) {
        // Temporarily assign a placeholder to otherHc if needed, or we can handle order
      }
    }
  }

  // To cleanly avoid unique constraint error, let's update using transaction with temporary IDs or delete/recreate HomeClasses
  // Simple clean approach: delete all HomeClasses and recreate them with exact real Wali Kelas IDs!
  await prisma.$transaction(async (tx) => {
    // Save student assignments
    const existingHomeClasses = await tx.homeClass.findMany({ include: { students: true, subjectClasses: true } });
    const classStudentMap = {};
    for (const hc of existingHomeClasses) {
      classStudentMap[hc.name] = hc.students.map(s => s.id);
    }

    // Delete existing HomeClasses
    await tx.class.deleteMany({});
    await tx.homeClass.deleteMany({});

    // Create 9 HomeClasses cleanly
    for (const item of REAL_WALI_KELAS) {
      const teacher = teacherMap[item.kelas];
      const newHc = await tx.homeClass.create({
        data: {
          name: item.kelas,
          waliKelasId: teacher.id,
        },
      });

      // Re-link students if any exist
      if (classStudentMap[item.kelas] && classStudentMap[item.kelas].length > 0) {
        await tx.user.updateMany({
          where: { id: { in: classStudentMap[item.kelas] } },
          data: { homeClassId: newHc.id },
        });
      }

      // Recreate Subject Class KKA
      await tx.class.create({
        data: {
          name: 'Koding dan Kecerdasan Artifisial (KKA)',
          classCode: `KKA-${item.kelas.replace(/\s+/g, '-')}`.toUpperCase(),
          homeClassId: newHc.id,
          teachers: { connect: [{ id: teacher.id }] },
        },
      });
    }

    // Remove old dummy users if any remain
    for (const dUser of dummyUsernames) {
      await tx.user.deleteMany({ where: { username: dUser } });
    }
  });

  console.log('\n--- VERIFIKASI AKHIR REAL WALI KELAS DATABASE ---');
  const finalClasses = await prisma.homeClass.findMany({
    include: {
      waliKelas: true,
      _count: { select: { students: true } },
    },
  });

  for (const fc of finalClasses) {
    console.log(`  ${fc.name.padEnd(20)} | Wali: ${fc.waliKelas.name.padEnd(35)} (${fc.waliKelas.username.padEnd(16)}) | Total: ${fc._count.students} siswa`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
