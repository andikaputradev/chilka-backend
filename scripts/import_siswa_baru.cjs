/**
 * Mengganti daftar siswa pada seluruh 9 kelas dari berkas "Absen Baru TP.2026-2027 Final.xlsx".
 *
 * Pemakaian (dari folder backend):
 *   node scripts/import_siswa_baru.cjs            -> simulasi, tidak mengubah data
 *   node scripts/import_siswa_baru.cjs --tulis    -> benar-benar menulis ke database
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const TULIS = process.argv.includes('--tulis');

/** Berkas JSON hasil ekstraksi Excel: [{ kelas, jurusan, siswa: [{no,nis,nama,jk}] }] */
const SUMBER = process.env.SUMBER_SISWA || path.join(process.cwd(), 'scripts', 'siswa_baru.json');

/** kelas di Excel -> nama HomeClass di database. */
const PEMETAAN = {
  'XI TKJ 1': { dbLama: 'Kelas XI TKJ 1', dbBaru: 'Kelas XI TKJ 1' },
  'XI TKJ 2': { dbLama: 'Kelas XI TKJ 2', dbBaru: 'Kelas XI TKJ 2' },
  'XI TKJ 3': { dbLama: 'Kelas XI TKJ 3', dbBaru: 'Kelas XI TKJ 3' },
  'XI RPL 1': { dbLama: 'Kelas XI RPL 1', dbBaru: 'Kelas XI RPL 1' },
  'XI RPL 2': { dbLama: 'Kelas XI RPL 2', dbBaru: 'Kelas XI RPL 2' },
  'XI DKV 1': { dbLama: 'Kelas XI DKV 1', dbBaru: 'Kelas XI DKV 1' },
  'XI DKV 2': { dbLama: 'Kelas XI DKV 2', dbBaru: 'Kelas XI DKV 2' },
  'XI PSPT 1': { dbLama: 'Kelas XI PSPT 1', dbBaru: 'Kelas XI PSPT 1' },
  'XI PSPT 2': { dbLama: 'Kelas XI PSPT 2', dbBaru: 'Kelas XI PSPT 2' },
};

const PASSWORD_AWAL = 'password123';

/** Mengubah nama menjadi username: huruf kecil, spasi/tanda baca jadi garis bawah. */
function buatSlug(nama) {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

/** Menambah akhiran angka bila username sudah terpakai. */
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

(async () => {
  try {
    if (!fs.existsSync(SUMBER)) {
      throw new Error(`Berkas sumber tidak ditemukan: ${SUMBER}`);
    }
    const dataExcel = JSON.parse(fs.readFileSync(SUMBER, 'utf8'));

    console.log(TULIS ? '*** MODE TULIS: database akan diubah ***' : '*** MODE SIMULASI: tidak ada perubahan ***');
    console.log('');

    // --- Validasi: semua kelas tujuan harus ada dan punya wali kelas ---
    const rencana = [];
    for (const [kelasExcel, target] of Object.entries(PEMETAAN)) {
      const sumber = dataExcel.find((d) => d.kelas === kelasExcel);
      if (!sumber) throw new Error(`Kelas "${kelasExcel}" tidak ada di berkas Excel`);

      const homeClass = await prisma.homeClass.findFirst({
        where: { name: target.dbLama },
        include: { waliKelas: { select: { name: true } }, students: { select: { id: true, username: true } } },
      });
      if (!homeClass) throw new Error(`Kelas "${target.dbLama}" tidak ada di database`);

      rencana.push({ kelasExcel, target, homeClass, siswaBaru: sumber.siswa });
    }

    const dilewati = dataExcel
      .filter((d) => !PEMETAAN[d.kelas])
      .map((d) => `${d.kelas} (${d.siswa.length} siswa)`);

    console.log('KELAS YANG DIPERBARUI:');
    for (const r of rencana) {
      const ganti = r.target.dbLama !== r.target.dbBaru ? `  [nama diubah -> "${r.target.dbBaru}"]` : '';
      console.log(
        `  ${r.target.dbLama.padEnd(20)} | wali: ${r.homeClass.waliKelas.name.padEnd(35)} | ` +
          `${String(r.homeClass.students.length).padStart(2)} siswa lama -> ${String(r.siswaBaru.length).padStart(2)} siswa baru${ganti}`,
      );
    }
    if (dilewati.length > 0) {
      console.log('\nKELAS YANG DILEWATI:');
      dilewati.forEach((d) => console.log(`  - ${d}`));
    }

    // --- Hitung data ikutan yang akan terhapus bersama siswa lama ---
    const idSiswaLama = rencana.flatMap((r) => r.homeClass.students.map((s) => s.id));
    const [nilai, progres, chat] = await Promise.all([
      prisma.quizResult.count({ where: { userId: { in: idSiswaLama } } }),
      prisma.userProgress.count({ where: { userId: { in: idSiswaLama } } }),
      prisma.chatMessage.count({ where: { userId: { in: idSiswaLama } } }),
    ]);
    console.log('\nDATA YANG IKUT TERHAPUS BERSAMA SISWA LAMA:');
    console.log(`  siswa lama dihapus : ${idSiswaLama.length}`);
    console.log(`  nilai kuis         : ${nilai}`);
    console.log(`  progres materi     : ${progres}`);
    console.log(`  riwayat chat AI    : ${chat}`);

    // --- Susun username, hindari bentrok dengan user yang tetap ada ---
    const idHapus = new Set(idSiswaLama);
    const semuaUser = await prisma.user.findMany({ select: { id: true, username: true } });
    const terpakai = new Set(semuaUser.filter((u) => !idHapus.has(u.id)).map((u) => u.username));

    const bentrok = [];
    for (const r of rencana) {
      r.akun = r.siswaBaru.map((s) => {
        const dasar = buatSlug(s.nama);
        const username = usernameUnik(dasar, terpakai);
        if (username !== dasar) bentrok.push({ nama: s.nama, kelas: r.kelasExcel, username });
        return { nama: s.nama, nis: s.nis, username };
      });
    }

    const totalBaru = rencana.reduce((a, r) => a + r.akun.length, 0);
    console.log(`\nAKUN BARU DIBUAT   : ${totalBaru}`);
    console.log(`USERNAME DISESUAIKAN KARENA BENTROK: ${bentrok.length}`);
    bentrok.forEach((b) => console.log(`  - ${b.nama} (${b.kelas}) -> ${b.username}`));

    console.log('\nCONTOH AKUN (3 pertama tiap kelas):');
    for (const r of rencana) {
      console.log(`  ${r.target.dbBaru}`);
      r.akun.slice(0, 3).forEach((a) => console.log(`     ${a.nama.padEnd(32)} -> ${a.username}`));
    }

    if (!TULIS) {
      console.log('\nSimulasi selesai. Jalankan ulang dengan --tulis untuk menerapkan.');
      return;
    }

    // --- Eksekusi ---
    const hash = await bcrypt.hash(PASSWORD_AWAL, 10);

    await prisma.$transaction(async (tx) => {
      for (const r of rencana) {
        await tx.user.deleteMany({ where: { homeClassId: r.homeClass.id, role: 'STUDENT' } });
      }

      for (const r of rencana) {
        await tx.user.createMany({
          data: r.akun.map((a) => ({
            username: a.username,
            password: hash,
            name: a.nama,
            role: 'STUDENT',
            homeClassId: r.homeClass.id,
          })),
        });

        if (r.target.dbLama !== r.target.dbBaru) {
          await tx.homeClass.update({ where: { id: r.homeClass.id }, data: { name: r.target.dbBaru } });
        }
      }
    }, { timeout: 120000 });

    console.log('\nSelesai. Verifikasi:');
    for (const r of rencana) {
      const jumlah = await prisma.user.count({ where: { homeClassId: r.homeClass.id, role: 'STUDENT' } });
      const nama = (await prisma.homeClass.findUnique({ where: { id: r.homeClass.id } })).name;
      console.log(`  ${nama.padEnd(20)} : ${jumlah} siswa`);
    }
  } finally {
    await prisma.$disconnect();
  }
})();
