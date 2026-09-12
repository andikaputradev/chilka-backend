import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const youtubeVideos = [
  {
    title: "Konsep Dasar Pemrograman & Logika Koding",
    url: "https://www.youtube.com/watch?v=3QLykOmje_M",
    duration: "20m",
    difficulty: "Beginner",
    colors: "0xFF667eea, 0xFF764ba2"
  },
  {
    title: "Pengenalan Kecerdasan Artifisial (AI) Masa Kini",
    url: "https://www.youtube.com/watch?v=ThCcmEbBLc8",
    duration: "25m",
    difficulty: "Beginner",
    colors: "0xFF42E695, 0xFF3BB2B8"
  },
  {
    title: "Implementasi Koding & AI dalam Industri",
    url: "https://www.youtube.com/watch?v=XvB33t_bXTk",
    duration: "18m",
    difficulty: "Intermediate",
    colors: "0xFFFF6B6B, 0xFFFF8E53"
  }
];

const pdfMaterials = [
  {
    title: "Etika dan Hak Cipta dalam Penggunaan Kecerdasan Artifisial (KA)",
    filename: "etika-dan-hak-cipta-ai.pdf",
    duration: "45m",
    difficulty: "Beginner",
    colors: "0xFF667eea, 0xFF764ba2",
    questions: [{"questionText": "Etika digital adalah...", "options": ["Teknik membuat aplikasi", "Prinsip moral dalam penggunaan teknologi digital", "Cara mempercepat komputer", "Sistem jaringan"], "correctAnswerIndex": 1}, {"questionText": "Prinsip penggunaan KA yang benar adalah...", "options": ["Transparansi", "Menyebarkan informasi tanpa cek", "Mengabaikan privasi", "Menyalin karya orang lain"], "correctAnswerIndex": 0}, {"questionText": "Mengapa hasil KA perlu diverifikasi?", "options": ["Karena KA selalu salah", "Karena KA dapat menghasilkan informasi yang tidak tepat", "Karena KA tidak dapat membuat konten", "Karena KA tidak menggunakan data"], "correctAnswerIndex": 1}, {"questionText": "Hak cipta berfungsi untuk...", "options": ["Melindungi karya pencipta", "Menghapus karya", "Membatasi kreativitas", "Menyebarkan karya bebas"], "correctAnswerIndex": 0}, {"questionText": "Contoh karya yang dilindungi hak cipta adalah...", "options": ["Musik dan video", "Password", "Username", "Jaringan"], "correctAnswerIndex": 0}, {"questionText": "Menggunakan karya orang lain tanpa izin termasuk...", "options": ["Apresiasi", "Pelanggaran hak cipta", "Verifikasi", "Kolaborasi"], "correctAnswerIndex": 1}, {"questionText": "Hoaks merupakan informasi yang...", "options": ["Terverifikasi", "Berdasarkan bukti", "Palsu dan menyesatkan", "Berasal dari ahli"], "correctAnswerIndex": 2}, {"questionText": "Salah satu ciri hoaks adalah...", "options": ["Sumber terpercaya", "Judul provokatif", "Data lengkap", "Referensi jelas"], "correctAnswerIndex": 1}, {"questionText": "Cara mengecek informasi adalah...", "options": ["Langsung membagikan", "Membandingkan sumber", "Menghapus informasi", "Mengabaikan berita"], "correctAnswerIndex": 1}, {"questionText": "Transparansi penggunaan KA berarti...", "options": ["Menyembunyikan penggunaan KA", "Memberitahu penggunaan KA dalam pembuatan konten", "Menghapus sumber", "Menyalin karya"], "correctAnswerIndex": 1}, {"questionText": "Akuntabilitas dalam penggunaan KA berarti...", "options": ["Bertanggung jawab terhadap hasil penggunaan KA", "Menghindari teknologi", "Membuat data palsu", "Menghapus informasi"], "correctAnswerIndex": 0}, {"questionText": "Non-diskriminasi berarti...", "options": ["Menghasilkan keputusan yang adil", "Membuat bias", "Mengabaikan pengguna", "Membatasi akses"], "correctAnswerIndex": 0}, {"questionText": "Atribusi berarti...", "options": ["Memberikan kredit kepada pencipta", "Menghapus nama pencipta", "Menyalin karya", "Mengubah sumber"], "correctAnswerIndex": 0}, {"questionText": "Dataset KA perlu diperhatikan karena berkaitan dengan...", "options": ["Lisensi dan hak cipta", "Kecepatan internet", "Ukuran komputer", "Warna aplikasi"], "correctAnswerIndex": 0}, {"questionText": "Penggunaan KA yang tepat adalah...", "options": ["Sebagai alat bantu manusia", "Menggantikan semua manusia", "Menyebarkan hoaks", "Membagikan data pribadi"], "correctAnswerIndex": 0}, {"questionText": "Data sensitif sebaiknya...", "options": ["Dibagikan ke semua layanan", "Tidak dimasukkan ke layanan KA publik", "Dipublikasikan", "Disebarkan"], "correctAnswerIndex": 1}, {"questionText": "Reverse image search digunakan untuk...", "options": ["Memeriksa sumber gambar", "Menghapus gambar", "Membuat akun", "Mengubah password"], "correctAnswerIndex": 0}, {"questionText": "Verifikasi informasi bertujuan untuk...", "options": ["Menghindari informasi palsu", "Mempercepat hoaks", "Menghapus fakta", "Menyalin berita"], "correctAnswerIndex": 0}, {"questionText": "Keamanan akun dapat dilakukan dengan...", "options": ["Membagikan password", "Menggunakan autentikasi dua faktor", "Membuka semua akses", "Menggunakan data pribadi"], "correctAnswerIndex": 1}, {"questionText": "Menggunakan lagu orang lain tanpa izin merupakan...", "options": ["Pelanggaran hak cipta", "Literasi digital", "Verifikasi", "Edukasi"], "correctAnswerIndex": 0}, {"questionText": "KA dapat menghasilkan...", "options": ["Konten digital", "Hanya angka", "Tidak ada informasi", "Hardware"], "correctAnswerIndex": 0}, {"questionText": "Sikap kritis dalam media digital diperlukan agar...", "options": ["Mudah percaya berita", "Dapat membedakan fakta dan hoaks", "Menghindari teknologi", "Menolak informasi"], "correctAnswerIndex": 1}, {"questionText": "Prinsip keamanan data adalah...", "options": ["Membagikan identitas", "Menjaga privasi pengguna", "Membuka semua informasi", "Mengabaikan kebijakan"], "correctAnswerIndex": 1}, {"questionText": "Penggunaan KA dalam pendidikan harus...", "options": ["Etis dan bertanggung jawab", "Tanpa aturan", "Menyalin semua karya", "Mengabaikan guru"], "correctAnswerIndex": 0}, {"questionText": "Tujuan literasi digital adalah...", "options": ["Menggunakan teknologi secara bijak", "Menghindari teknologi", "Menyebarkan informasi palsu", "Melanggar hak cipta"], "correctAnswerIndex": 0}]
  },
  {
    title: "Seni Rekayasa Prompt: Menguasai AI Generatif",
    filename: "seni-rekayasa-prompt.pdf",
    duration: "30m",
    difficulty: "Intermediate",
    colors: "0xFF42E695, 0xFF3BB2B8",
    questions: [{"questionText": "Etika dalam penggunaan KA bertujuan untuk...", "options": ["Menggunakan teknologi tanpa aturan", "Memastikan teknologi digunakan secara bijak dan bertanggung jawab", "Menggantikan seluruh pekerjaan manusia", "Menyebarkan semua informasi"], "correctAnswerIndex": 1}, {"questionText": "Salah satu prinsip etika penggunaan KA adalah...", "options": ["Transparansi", "Menyembunyikan informasi", "Mengabaikan privasi", "Menyalin karya orang lain"], "correctAnswerIndex": 0}, {"questionText": "Transparansi dalam penggunaan KA berarti...", "options": ["Menyatakan bahwa konten dibuat dengan bantuan KA", "Menghapus identitas pembuat", "Menyembunyikan sumber informasi", "Membagikan data pribadi"], "correctAnswerIndex": 0}, {"questionText": "Akuntabilitas berarti pengguna KA harus...", "options": ["Bertanggung jawab terhadap hasil penggunaan KA", "Membiarkan KA mengambil semua keputusan", "Mengabaikan kesalahan informasi", "Menyebarkan hasil tanpa pemeriksaan"], "correctAnswerIndex": 0}, {"questionText": "Hak cipta merupakan aturan yang melindungi...", "options": ["Perangkat komputer", "Karya intelektual seseorang", "Jaringan internet", "Akun media sosial"], "correctAnswerIndex": 1}, {"questionText": "Contoh karya yang memiliki hak cipta adalah...", "options": ["Musik, gambar, dan video", "Password akun", "Alamat email", "Sistem operasi komputer"], "correctAnswerIndex": 0}, {"questionText": "Menggunakan karya orang lain tanpa izin dapat menyebabkan...", "options": ["Kolaborasi", "Pelanggaran hak cipta", "Inovasi teknologi", "Keamanan data"], "correctAnswerIndex": 1}, {"questionText": "Memberikan kredit kepada pencipta karya disebut...", "options": ["Atribusi", "Manipulasi", "Duplikasi", "Distribusi"], "correctAnswerIndex": 0}, {"questionText": "Menghasilkan gambar KA yang meniru karya orang lain tanpa izin termasuk...", "options": ["Penggunaan etis", "Pelanggaran hak cipta", "Verifikasi informasi", "Pembelajaran digital"], "correctAnswerIndex": 1}, {"questionText": "Sebelum menggunakan konten dari internet, pengguna harus memperhatikan...", "options": ["Lisensi dan izin penggunaan", "Warna gambar", "Ukuran file saja", "Jumlah pengikut"], "correctAnswerIndex": 0}, {"questionText": "Hoaks adalah informasi yang...", "options": ["Sudah diverifikasi", "Tidak benar dan menyesatkan", "Berasal dari sumber resmi", "Berdasarkan penelitian"], "correctAnswerIndex": 1}, {"questionText": "Salah satu cara mengetahui informasi benar adalah...", "options": ["Langsung membagikan", "Membandingkan beberapa sumber", "Mengabaikan sumber", "Mengubah isi informasi"], "correctAnswerIndex": 1}, {"questionText": "Reverse image search digunakan untuk...", "options": ["Memeriksa sumber gambar", "Membuat akun baru", "Menghapus data", "Mengubah gambar menjadi video"], "correctAnswerIndex": 0}, {"questionText": "Data pribadi sebaiknya tidak dimasukkan ke layanan KA publik karena...", "options": ["Dapat membahayakan privasi", "Membuat internet lambat", "Mengurangi ukuran aplikasi", "Menghasilkan gambar buruk"], "correctAnswerIndex": 0}, {"questionText": "Contoh data sensitif adalah...", "options": ["Nomor identitas pribadi", "Judul buku", "Nama mata pelajaran", "Warna desain"], "correctAnswerIndex": 0}, {"questionText": "Penggunaan KA dalam pembelajaran sebaiknya sebagai...", "options": ["Alat bantu belajar", "Pengganti guru sepenuhnya", "Sumber tanpa pengecekan", "Cara menyalin tugas"], "correctAnswerIndex": 0}, {"questionText": "Verifikasi informasi diperlukan agar...", "options": ["Mengurangi penyebaran informasi palsu", "Mempercepat penyebaran hoaks", "Menghapus semua informasi", "Menghindari teknologi"], "correctAnswerIndex": 0}, {"questionText": "Prinsip non-diskriminasi pada KA berarti...", "options": ["Menghasilkan keputusan yang adil", "Membatasi pengguna tertentu", "Membuat informasi palsu", "Mengabaikan pengguna"], "correctAnswerIndex": 0}, {"questionText": "Keamanan akun dapat ditingkatkan dengan...", "options": ["Menggunakan autentikasi dua faktor", "Membagikan password", "Membuka semua akses", "Menyimpan data secara terbuka"], "correctAnswerIndex": 0}, {"questionText": "Media sosial perlu digunakan secara bijak karena...", "options": ["Informasi dapat tersebar dengan cepat", "Tidak memiliki dampak", "Semua informasi pasti benar", "Tidak membutuhkan etika"], "correctAnswerIndex": 0}, {"questionText": "Salah satu dampak negatif penyebaran informasi tanpa verifikasi adalah...", "options": ["Munculnya hoaks", "Bertambahnya keamanan", "Meningkatnya privasi", "Berkurangnya teknologi"], "correctAnswerIndex": 0}, {"questionText": "Lisensi dalam penggunaan karya berfungsi untuk...", "options": ["Mengatur hak penggunaan suatu karya", "Menghapus karya", "Membuat karya menjadi anonim", "Menghilangkan sumber"], "correctAnswerIndex": 0}, {"questionText": "Penggunaan KA yang bertanggung jawab harus memperhatikan...", "options": ["Etika, privasi, dan hak cipta", "Jumlah pengguna saja", "Kecepatan internet", "Tampilan aplikasi saja"], "correctAnswerIndex": 0}, {"questionText": "Sikap kritis dalam literasi digital membantu siswa untuk...", "options": ["Menilai kebenaran informasi", "Menyebarkan semua berita", "Mengabaikan sumber", "Menolak teknologi"], "correctAnswerIndex": 0}, {"questionText": "Tujuan utama memahami etika dan hak cipta dalam penggunaan KA adalah...", "options": ["Menggunakan teknologi secara aman dan bertanggung jawab", "Menghindari semua teknologi", "Menyalin karya orang lain", "Membatasi kreativitas"], "correctAnswerIndex": 0}]
  }
];

const globalCombinedQuizQuestions = [{"questionText": "Rekayasa prompt adalah teknik untuk...", "options": ["Membuat perangkat keras", "Menyusun instruksi agar KA menghasilkan keluaran sesuai kebutuhan", "Menghapus data komputer", "Mengganti sistem operasi"], "correctAnswerIndex": 1}, {"questionText": "Prompt yang baik harus memiliki karakteristik...", "options": ["Tidak jelas", "Singkat tanpa tujuan", "Jelas dan spesifik", "Tidak memiliki konteks"], "correctAnswerIndex": 2}, {"questionText": "Zero-shot prompting dilakukan dengan cara...", "options": ["Memberikan banyak contoh kepada KA", "Memberikan instruksi tanpa contoh sebelumnya", "Menghapus hasil KA", "Menggunakan kode program"], "correctAnswerIndex": 1}, {"questionText": "Few-shot prompting menggunakan...", "options": ["Contoh sebagai panduan bagi KA", "Data pribadi pengguna", "Perangkat tambahan", "Jaringan internet"], "correctAnswerIndex": 0}, {"questionText": "Contoh prompt yang efektif adalah...", "options": ["Buat sesuatu", "Jelaskan", "Buat artikel tentang keamanan digital untuk siswa SMK dengan bahasa sederhana", "Kerjakan tugas"], "correctAnswerIndex": 2}, {"questionText": "Tujuan memberikan konteks dalam prompt adalah...", "options": ["Membuat KA bingung", "Membantu KA memahami tujuan pengguna", "Mengurangi informasi", "Menghapus hasil"], "correctAnswerIndex": 1}, {"questionText": "Salah satu penerapan rekayasa prompt adalah membuat...", "options": ["Konten digital kreatif", "Kerusakan sistem", "Virus komputer", "Password"], "correctAnswerIndex": 0}, {"questionText": "Hasil dari KA tetap harus diperiksa karena...", "options": ["Semua hasil KA selalu benar", "KA dapat menghasilkan informasi yang kurang tepat", "KA tidak dapat membuat konten", "KA tidak menggunakan data"], "correctAnswerIndex": 1}, {"questionText": "Etika penggunaan KA diperlukan agar teknologi digunakan secara...", "options": ["Bebas tanpa aturan", "Bijak dan bertanggung jawab", "Rahasia", "Terbatas"], "correctAnswerIndex": 1}, {"questionText": "Transparansi dalam penggunaan KA berarti...", "options": ["Menyembunyikan penggunaan KA", "Memberikan informasi jika menggunakan bantuan KA", "Menghapus sumber", "Menyalin karya"], "correctAnswerIndex": 1}, {"questionText": "Akuntabilitas berarti...", "options": ["Bertanggung jawab terhadap hasil penggunaan KA", "Menghindari teknologi", "Membagikan data pribadi", "Mengabaikan kesalahan"], "correctAnswerIndex": 0}, {"questionText": "Hak cipta bertujuan untuk melindungi...", "options": ["Koneksi internet", "Karya intelektual pencipta", "Perangkat komputer", "Aplikasi gratis"], "correctAnswerIndex": 1}, {"questionText": "Menggunakan gambar orang lain tanpa izin merupakan...", "options": ["Inovasi", "Pelanggaran hak cipta", "Verifikasi", "Kolaborasi"], "correctAnswerIndex": 1}, {"questionText": "Memberikan kredit kepada pemilik karya disebut...", "options": ["Atribusi", "Manipulasi", "Duplikasi", "Distribusi"], "correctAnswerIndex": 0}, {"questionText": "Hoaks adalah informasi yang...", "options": ["Terverifikasi", "Tidak benar dan menyesatkan", "Berdasarkan penelitian", "Memiliki sumber resmi"], "correctAnswerIndex": 1}, {"questionText": "Cara menghindari penyebaran hoaks adalah...", "options": ["Langsung membagikan", "Melakukan verifikasi informasi", "Menghapus semua berita", "Mengabaikan sumber"], "correctAnswerIndex": 1}, {"questionText": "Penggunaan data pribadi pada layanan KA harus memperhatikan...", "options": ["Privasi dan keamanan data", "Jumlah pengguna", "Tampilan aplikasi", "Kecepatan internet"], "correctAnswerIndex": 0}, {"questionText": "Prompt few-shot lebih efektif ketika...", "options": ["Membutuhkan contoh pola hasil yang diinginkan", "Tidak membutuhkan tujuan", "Tidak ada instruksi", "Semua data dihapus"], "correctAnswerIndex": 0}, {"questionText": "Perbedaan zero-shot dan few-shot adalah...", "options": ["Zero-shot memakai contoh, few-shot tidak", "Zero-shot tanpa contoh, few-shot menggunakan contoh", "Keduanya sama", "Keduanya tidak memakai instruksi"], "correctAnswerIndex": 1}, {"questionText": "Saat membuat konten dengan KA, pengguna harus memperhatikan...", "options": ["Etika dan hak cipta", "Kecepatan internet saja", "Jumlah komentar", "Ukuran file"], "correctAnswerIndex": 0}, {"questionText": "Prompt yang terlalu umum dapat menyebabkan...", "options": ["Hasil kurang sesuai kebutuhan", "Hasil selalu sempurna", "Data lebih aman", "Proses lebih akurat"], "correctAnswerIndex": 0}, {"questionText": "Evaluasi hasil KA dilakukan untuk memastikan...", "options": ["Kebenaran dan kesesuaian informasi", "Semua konten diterima", "Tidak ada aturan", "Semua sumber dihapus"], "correctAnswerIndex": 0}, {"questionText": "Non-diskriminasi dalam KA berarti...", "options": ["Menghasilkan keputusan yang adil", "Membuat bias", "Mengabaikan pengguna", "Membatasi teknologi"], "correctAnswerIndex": 0}, {"questionText": "Lisensi karya digunakan untuk...", "options": ["Mengatur penggunaan suatu karya", "Menghapus pencipta", "Menyalin karya bebas", "Menghilangkan sumber"], "correctAnswerIndex": 0}, {"questionText": "Contoh penggunaan KA yang bertanggung jawab adalah...", "options": ["Membuat konten edukasi dengan tetap mencantumkan sumber", "Menyalin karya tanpa izin", "Menyebarkan berita palsu", "Membagikan data pribadi"], "correctAnswerIndex": 0}, {"questionText": "Dalam membuat prompt untuk poster edukasi, pengguna perlu menjelaskan...", "options": ["Tujuan dan detail desain", "Password akun", "Data pribadi", "Informasi rahasia"], "correctAnswerIndex": 0}, {"questionText": "Reverse image search digunakan untuk...", "options": ["Memeriksa sumber gambar", "Membuat akun", "Menghapus gambar", "Mengubah password"], "correctAnswerIndex": 0}, {"questionText": "Literasi digital membantu pengguna agar...", "options": ["Menggunakan teknologi secara kritis dan bijak", "Menghindari semua teknologi", "Membagikan semua informasi", "Mengabaikan keamanan"], "correctAnswerIndex": 0}, {"questionText": "Penggunaan KA dalam pembelajaran sebaiknya menjadi...", "options": ["Alat bantu untuk meningkatkan proses belajar", "Pengganti seluruh aktivitas manusia", "Sumber tanpa pengecekan", "Media penyebaran hoaks"], "correctAnswerIndex": 0}, {"questionText": "Kesimpulan penggunaan KA yang tepat adalah...", "options": ["Menggunakan KA secara kreatif, etis, dan bertanggung jawab", "Menggunakan tanpa aturan", "Mengabaikan hak cipta", "Menyebarkan informasi tanpa pemeriksaan"], "correctAnswerIndex": 0}];

async function main() {
  const password = await bcrypt.hash('password123', 10);

  console.log('--- STARTING MASTER SYSTEM RESET & GLOBAL SEEDING ---');

  // CLEANUP
  await prisma.systemLog.deleteMany({});
  await prisma.quizResult.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.quiz.deleteMany({});
  await prisma.userProgress.deleteMany({});
  await prisma.material.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.homeClass.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: password,
      name: 'Super Admin SMKN 2 Padang Panjang',
      role: UserRole.ADMIN,
    },
  });

  // 2. Create Teachers
  console.log('Creating Teachers...');
  const teacherData = [
    { name: 'Nova Fitri Yuliza, S.Pd', username: 'nova_fitri' },
    { name: 'Susy Elvina, S.Ag', username: 'susy_elvina' },
    { name: 'Andriza, S.Pd', username: 'andriza' },
    { name: 'Mil Ussamawati RI, S.Pd', username: 'mil_ussamawati' },
    { name: 'Ceci Venesa, S.Pd', username: 'ceci_venesa' },
    { name: 'Suci Vainani, S.Pd', username: 'suci_vainani' },
    { name: 'Neli Yufida, S.Pd', username: 'neli_yufida' },
    { name: 'Ikrar Fardila, S.Sn', username: 'ikrar_fardila' },
    { name: 'Andri Sukarman, S.Pd', username: 'andri_sukarman' },
    { name: 'Erwin R., S.Pd', username: 'erwin_r' },
    { name: 'Fahmi Zain, S.Kom', username: 'fahmi_zain' },
    { name: 'Dipa Adi Martius S.Pd, S.Kom', username: 'dipa_adi' },
    { name: 'Linda Gumanti', username: 'linda_gumanti' },
    { name: 'Uscha Melis', username: 'uscha_melis' },
    { name: 'Afatman Hamid, S.Pd.I', username: 'afatman_hamid' },
    { name: 'Febriyandi', username: 'febriyandi' },
    { name: 'Yetti Fitriani', username: 'yetti_fitriani' },
    { name: 'Vico', username: 'vico' },
  ];

  const teachers: Record<string, any> = {};
  for (const t of teacherData) {
    teachers[t.username] = await prisma.user.create({
      data: { ...t, password, role: UserRole.TEACHER },
    });
  }

  // 3. Create HomeClasses
  console.log('Creating HomeClasses...');
  const homeClassesData = [
    { name: 'Kelas XI RPL 1', waliKelasId: teachers['nova_fitri'].id },
    { name: 'Kelas XI RPL 2', waliKelasId: teachers['susy_elvina'].id },
    { name: 'Kelas XI TKJ 1', waliKelasId: teachers['andriza'].id },
    { name: 'Kelas XI TKJ 2', waliKelasId: teachers['mil_ussamawati'].id },
    { name: 'Kelas XI TKJ 3', waliKelasId: teachers['ceci_venesa'].id },
    { name: 'Kelas XI DKV 1', waliKelasId: teachers['suci_vainani'].id },
    { name: 'Kelas XI DKV 2', waliKelasId: teachers['neli_yufida'].id },
    { name: 'Kelas XI PSPT 1', waliKelasId: teachers['ikrar_fardila'].id },
    { name: 'Kelas XI PSPT 2', waliKelasId: teachers['andri_sukarman'].id },
  ];

  const homeClasses: Record<string, any> = {};
  for (const c of homeClassesData) {
    homeClasses[c.name] = await prisma.homeClass.create({
      data: { name: c.name, waliKelasId: c.waliKelasId },
    });
  }

  // 4. Create Students
  console.log('Importing Students from Excel JSON...');
  const jsonPath = path.join(__dirname, '..', 'scripts', 'siswa_baru.json');
  const usedUsernames = new Set<string>(['admin', ...teacherData.map(t => t.username)]);

  const excelToDbName: Record<string, string> = {
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

  if (fs.existsSync(jsonPath)) {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const dataExcel = JSON.parse(rawData);

    for (const item of dataExcel) {
      const dbClassName = excelToDbName[item.kelas];
      const hc = homeClasses[dbClassName];
      if (!hc) continue;

      for (const s of item.siswa) {
        let username = s.nama.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50);
        if (usedUsernames.has(username)) {
          let counter = 2;
          while (usedUsernames.has(`${username}_${counter}`)) {
            counter++;
          }
          username = `${username}_${counter}`;
        }
        usedUsernames.add(username);

        await prisma.user.create({
          data: {
            username,
            password,
            name: s.nama,
            role: UserRole.STUDENT,
            homeClassId: hc.id
          }
        });
      }
    }
  }

  // 5. Create Subject Classes
  console.log('Creating Subject Classes...');
  const assignments = [
    { homeClassName: 'Kelas XI RPL 1', teachers: [teachers['nova_fitri'].id, teachers['erwin_r'].id] },
    { homeClassName: 'Kelas XI RPL 2', teachers: [teachers['susy_elvina'].id] },
    { homeClassName: 'Kelas XI TKJ 1', teachers: [teachers['andriza'].id, teachers['dipa_adi'].id] },
    { homeClassName: 'Kelas XI TKJ 2', teachers: [teachers['mil_ussamawati'].id, teachers['fahmi_zain'].id] },
    { homeClassName: 'Kelas XI TKJ 3', teachers: [teachers['ceci_venesa'].id] },
    { homeClassName: 'Kelas XI DKV 1', teachers: [teachers['suci_vainani'].id, teachers['linda_gumanti'].id] },
    { homeClassName: 'Kelas XI DKV 2', teachers: [teachers['neli_yufida'].id, teachers['febriyandi'].id] },
    { homeClassName: 'Kelas XI PSPT 1', teachers: [teachers['ikrar_fardila'].id, teachers['vico'].id] },
    { homeClassName: 'Kelas XI PSPT 2', teachers: [teachers['andri_sukarman'].id] },
  ];

  for (const a of assignments) {
    if (!homeClasses[a.homeClassName]) continue;
    await prisma.class.create({
      data: {
        name: 'Koding dan Kecerdasan Artifisial (KKA)',
        classCode: `KKA-${a.homeClassName.replace(/\s+/g, '-')}`.toUpperCase(),
        homeClassId: homeClasses[a.homeClassName].id,
        teachers: { connect: a.teachers.map(id => ({ id })) }
      },
    });
  }

  // 6. Create Global Materials (VIDEOS & PDFs)
  console.log('Seeding Global Materials...');
  const createdTitles = new Set<string>();

  for (const vid of youtubeVideos) {
    if (createdTitles.has(vid.title)) continue;
    
    await prisma.material.create({
      data: {
        title: vid.title,
        subject: 'Koding dan Kecerdasan Artifisial (KKA)',
        type: 'VIDEO',
        content: 'Materi KKA Global untuk seluruh jurusan.',
        videoUrl: vid.url,
        duration: vid.duration,
        difficulty: vid.difficulty,
        gradientColors: vid.colors,
        isGlobal: true,
        teacherId: admin.id,
        classId: null
      }
    });
    createdTitles.add(vid.title);
  }

  for (const pdf of pdfMaterials) {
    if (createdTitles.has(pdf.title)) continue;

    const m = await prisma.material.create({
      data: {
        title: pdf.title,
        subject: 'Koding dan Kecerdasan Artifisial (KKA)',
        type: 'PDF',
        content: `/materials/${pdf.filename}`,
        duration: pdf.duration,
        difficulty: pdf.difficulty,
        gradientColors: pdf.colors,
        isGlobal: true,
        teacherId: admin.id,
        classId: null
      }
    });
    createdTitles.add(pdf.title);

    await prisma.quiz.create({
      data: {
        title: `Tugas & Evaluasi: ${pdf.title}`,
        subject: 'Koding dan Kecerdasan Artifisial (KKA)',
        duration: '35m',
        gradientColors: pdf.colors,
        teacherId: admin.id,
        isGlobal: true,
        classId: null,
        materialId: m.id,
        questions: {
          create: pdf.questions.map((q: any) => ({
            questionText: q.questionText,
            options: JSON.stringify(q.options),
            correctAnswerIndex: q.correctAnswerIndex
          }))
        }
      }
    });
  }

  // Create Global Combined Quiz
  await prisma.quiz.create({
    data: {
      title: 'Kuis Evaluasi Gabungan: Rekayasa Prompt & Etika KA',
      subject: 'Koding dan Kecerdasan Artifisial (KKA)',
      duration: '35m',
      gradientColors: '0xFFFF6B6B, 0xFFFF8E53',
      teacherId: admin.id,
      isGlobal: true,
      classId: null,
      materialId: null,
      questions: {
        create: globalCombinedQuizQuestions.map((q: any) => ({
          questionText: q.questionText,
          options: JSON.stringify(q.options),
          correctAnswerIndex: q.correctAnswerIndex
        }))
      }
    }
  });

  console.log('--- SEEDING COMPLETED WITH UPDATED PDF MATERIALS, QUIZZES & TASKS ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
