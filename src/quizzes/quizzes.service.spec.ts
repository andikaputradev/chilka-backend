import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { QuizzesService } from './quizzes.service';
import { PrismaService } from '../prisma/prisma.service';

const question = (id: string, correctAnswerIndex: number) => ({
  id,
  quizId: 'quiz-1',
  questionText: `Soal ${id}`,
  options: JSON.stringify(['A', 'B', 'C']),
  correctAnswerIndex,
});

describe('QuizzesService', () => {
  let service: QuizzesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      quiz: { findMany: jest.fn(), findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      quizResult: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [QuizzesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<QuizzesService>(QuizzesService);
  });

  it('terdefinisi', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('menyembunyikan kunci jawaban dari siswa', async () => {
      prisma.user.findUnique.mockResolvedValue({ homeClassId: 'hc-1' });
      prisma.quiz.findMany.mockResolvedValue([
        { id: 'quiz-1', title: 'Kuis', questions: [question('q1', 2)] },
      ]);

      const result: any = await service.findAll({ id: 'u1', role: UserRole.STUDENT });

      expect(result[0].questions[0]).not.toHaveProperty('correctAnswerIndex');
      expect(result[0].questions[0].questionText).toBe('Soal q1');
    });

    it('tetap mengirim kunci jawaban kepada guru', async () => {
      prisma.quiz.findMany.mockResolvedValue([
        { id: 'quiz-1', title: 'Kuis', questions: [question('q1', 2)] },
      ]);

      const result: any = await service.findAll({ id: 't1', role: UserRole.TEACHER });

      expect(result[0].questions[0].correctAnswerIndex).toBe(2);
    });
  });

  describe('submitResult', () => {
    const quiz = {
      id: 'quiz-1',
      isGlobal: true,
      classId: null,
      class: null,
      questions: [question('q1', 0), question('q2', 1), question('q3', 2)],
    };

    it('menghitung skor di server berdasarkan jawaban yang dikirim', async () => {
      prisma.quiz.findUnique.mockResolvedValue(quiz);
      prisma.quizResult.findFirst.mockResolvedValue(null);
      prisma.quizResult.create.mockImplementation(({ data }: any) => Promise.resolve(data));

      const result = await service.submitResult('u1', 'quiz-1', [
        { questionId: 'q1', selectedIndex: 0 }, // benar
        { questionId: 'q2', selectedIndex: 0 }, // salah
      ]);

      // q3 tidak dijawab sehingga dihitung salah, tetapi tetap masuk total.
      expect(result.score).toBe(1);
      expect(result.total).toBe(3);
      expect(result.corrections).toHaveLength(3);
      expect(result.corrections[2].selectedIndex).toBeNull();
      expect(result.corrections[2].isCorrect).toBe(false);
    });

    it('mempertahankan nilai terbaik dari percobaan sebelumnya', async () => {
      prisma.quiz.findUnique.mockResolvedValue(quiz);
      prisma.quizResult.findFirst.mockResolvedValue({ id: 'r1', score: 3, total: 3 });

      const result = await service.submitResult('u1', 'quiz-1', [
        { questionId: 'q1', selectedIndex: 0 },
      ]);

      expect(result.score).toBe(1);
      expect(result.savedScore).toBe(3);
      expect(prisma.quizResult.update).not.toHaveBeenCalled();
    });

    it('menolak siswa yang bukan anggota kelas kuis', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        ...quiz,
        isGlobal: false,
        classId: 'c-1',
        class: { homeClass: { students: [{ id: 'siswa-lain' }] } },
      });
      prisma.user.findUnique.mockResolvedValue({ role: UserRole.STUDENT });

      await expect(
        service.submitResult('u1', 'quiz-1', [{ questionId: 'q1', selectedIndex: 0 }]),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getQuizAnalytics', () => {
    beforeEach(() => {
      prisma.quiz.findUnique.mockResolvedValue({
        id: 'quiz-1',
        teacherId: 'guru-pemilik',
        results: [{ id: 'r1', score: 2, total: 3 }],
      });
    });

    it('mengizinkan admin melihat analitik kuis milik guru lain', async () => {
      const results = await service.getQuizAnalytics('quiz-1', {
        id: 'admin-1',
        role: UserRole.ADMIN,
      });
      expect(results).toHaveLength(1);
    });

    it('menolak guru yang bukan pemilik kuis', async () => {
      await expect(
        service.getQuizAnalytics('quiz-1', { id: 'guru-lain', role: UserRole.TEACHER }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
