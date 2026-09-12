/**
 * Mencadangkan seluruh isi database ke satu berkas JSON.
 * Hanya membaca; tidak mengubah apa pun.
 *
 * Jalankan dari folder backend:  node scripts/backup_data.cjs
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    const data = {
      dibuatPada: new Date().toISOString(),
      users: await prisma.user.findMany(),
      homeClasses: await prisma.homeClass.findMany(),
      classes: await prisma.class.findMany({ include: { teachers: { select: { id: true } } } }),
      materials: await prisma.material.findMany(),
      quizzes: await prisma.quiz.findMany(),
      questions: await prisma.question.findMany(),
      quizResults: await prisma.quizResult.findMany(),
      userProgress: await prisma.userProgress.findMany(),
      systemLogs: await prisma.systemLog.findMany(),
      chatMessages: await prisma.chatMessage.findMany(),
    };

    const dir = path.join(process.cwd(), 'backups');
    fs.mkdirSync(dir, { recursive: true });

    const stamp = data.dibuatPada.replace(/[:.]/g, '-');
    const file = path.join(dir, `backup-${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 1), 'utf8');

    console.log('Cadangan tersimpan di:', file);
    console.log('Ringkasan:');
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) console.log(`  ${key.padEnd(14)}: ${value.length}`);
    }
  } finally {
    await prisma.$disconnect();
  }
})();
