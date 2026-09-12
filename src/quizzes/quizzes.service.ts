import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Question, UserRole } from '@prisma/client';
import { CreateQuizDto, QuizAnswerDto } from './dto/quiz.dto';

type QuizWithQuestions = { questions: Question[] };

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Membuang `correctAnswerIndex` dari daftar soal. Dipakai untuk semua
   * response yang bisa dibaca siswa supaya kunci jawaban tidak bocor lewat API.
   */
  private hideAnswerKey<T extends QuizWithQuestions>(quiz: T) {
    return {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        quizId: q.quizId,
        questionText: q.questionText,
        options: q.options,
      })),
    };
  }

  async findAll(user: any) {
    const commonInclude = {
      questions: true,
      teacher: { select: { name: true } },
      class: { select: { name: true } },
    };

    if (user.role === UserRole.STUDENT) {
      const student = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { homeClassId: true },
      });

      const quizzes = await this.prisma.quiz.findMany({
        where: {
          OR: [
            ...(student?.homeClassId
              ? [{ class: { homeClassId: student.homeClassId } }]
              : []),
            { isGlobal: true }
          ]
        },
        include: commonInclude,
      });

      return quizzes.map((quiz) => this.hideAnswerKey(quiz));
    }

    return this.prisma.quiz.findMany({
      include: commonInclude,
    });
  }

  async findOne(id: string, user: any) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: true,
        teacher: { select: { name: true } },
        class: { select: { name: true } },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    if (user?.role === UserRole.STUDENT) return this.hideAnswerKey(quiz);
    return quiz;
  }

  async create(data: CreateQuizDto, teacherId: string) {
    const { questions, ...quizData } = data;

    // Validation for non-global quizzes
    if (!quizData.isGlobal) {
      if (!quizData.classId) {
        throw new ForbiddenException('Class ID is required for non-global quizzes');
      }

      const classInfo = await this.prisma.class.findUnique({
        where: { id: quizData.classId },
        include: { teachers: { select: { id: true } } },
      });

      const isTeacherOfClass = classInfo?.teachers.some((t) => t.id === teacherId);

      if (!classInfo || !isTeacherOfClass) {
        throw new ForbiddenException('Unauthorized to create quiz for this class');
      }
    }

    questions.forEach((q, i) => {
      if (q.correctAnswerIndex >= q.options.length) {
        throw new BadRequestException(
          `Soal nomor ${i + 1}: kunci jawaban menunjuk pilihan yang tidak ada`,
        );
      }
    });

    return this.prisma.quiz.create({
      data: {
        title: quizData.title,
        subject: quizData.subject,
        duration: quizData.duration,
        gradientColors: quizData.gradientColors,
        isGlobal: quizData.isGlobal ?? false,
        classId: quizData.classId ?? null,
        materialId: quizData.materialId ?? null,
        teacherId,
        questions: {
          create: questions.map((q) => ({
            questionText: q.questionText,
            correctAnswerIndex: q.correctAnswerIndex,
            options: JSON.stringify(q.options),
          })),
        },
      },
    });
  }

  /**
   * Menerima jawaban siswa lalu menghitung skor di server. Nilai yang disimpan
   * tetap yang tertinggi antara percobaan sebelumnya dan percobaan ini.
   */
  async submitResult(userId: string, quizId: string, answers: QuizAnswerDto[]) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        class: {
          include: { homeClass: { include: { students: { select: { id: true } } } } },
        },
      },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.questions.length === 0) {
      throw new BadRequestException('Kuis ini belum memiliki soal');
    }

    if (!quiz.isGlobal && quiz.classId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      const isStudentOfClass = quiz.class?.homeClass?.students.some((s) => s.id === userId);
      if (user?.role === UserRole.STUDENT && !isStudentOfClass) {
        throw new ForbiddenException('Kamu tidak terdaftar di kelas untuk kuis ini');
      }
    }

    const answerMap = new Map(answers.map((a) => [a.questionId, a.selectedIndex]));
    let score = 0;
    const corrections = quiz.questions.map((q) => {
      const selectedIndex = answerMap.has(q.id) ? answerMap.get(q.id)! : null;
      const isCorrect = selectedIndex === q.correctAnswerIndex;
      if (isCorrect) score++;
      return {
        questionId: q.id,
        correctAnswerIndex: q.correctAnswerIndex,
        selectedIndex,
        isCorrect,
      };
    });
    const total = quiz.questions.length;

    const saved = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.quizResult.findFirst({ where: { userId, quizId } });
      if (existing) {
        if (score > existing.score) {
          return tx.quizResult.update({
            where: { id: existing.id },
            data: { score, total },
          });
        }
        return existing;
      }
      return tx.quizResult.create({ data: { userId, quizId, score, total } });
    });

    return {
      score,
      total,
      // Nilai terbaik yang tersimpan (bisa berasal dari percobaan sebelumnya).
      savedScore: saved.score,
      savedTotal: saved.total,
      corrections,
    };
  }

  async getQuizAnalytics(quizId: string, user: any) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        results: {
          include: { user: { select: { name: true, username: true } } },
          orderBy: { score: 'desc' },
        },
      },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');

    // Admin boleh melihat analitik kuis siapa pun, guru hanya kuis miliknya.
    if (user?.role !== UserRole.ADMIN && quiz.teacherId !== user?.id) {
      throw new ForbiddenException('Anda tidak berhak melihat analitik kuis ini');
    }

    return quiz.results;
  }
}
