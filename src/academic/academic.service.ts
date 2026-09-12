import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateHomeClassDto,
  CreateSubjectClassDto,
  UpdateHomeClassDto,
  UpdateSubjectClassDto,
} from './dto/academic.dto';

@Injectable()
export class AcademicService {
  constructor(private prisma: PrismaService) {}

  async findAllHomeClasses() {
    return this.prisma.homeClass.findMany({
      include: {
        waliKelas: { select: { name: true } },
        _count: { select: { students: true } },
      },
    });
  }

  async findAllSubjectClasses() {
    return this.prisma.class.findMany({
      include: {
        teachers: { select: { name: true } },
        homeClass: { select: { name: true } },
      },
    });
  }

  async createHomeClass(data: CreateHomeClassDto) {
    return this.prisma.homeClass.create({
      data: { name: data.name, waliKelasId: data.waliKelasId },
    });
  }

  async createSubjectClass(data: CreateSubjectClassDto) {
    return this.prisma.class.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        homeClassId: data.homeClassId,
        teachers: data.teacherId ? { connect: { id: data.teacherId } } : undefined,
      },
    });
  }

  async updateSubjectClass(id: string, data: UpdateSubjectClassDto) {
    return this.prisma.class.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        homeClassId: data.homeClassId,
        teachers: data.teacherId ? { set: [{ id: data.teacherId }] } : undefined,
      },
    });
  }

  async updateHomeClass(id: string, data: UpdateHomeClassDto) {
    return this.prisma.homeClass.update({
      where: { id },
      data: { name: data.name, waliKelasId: data.waliKelasId },
    });
  }

  async removeHomeClass(id: string) {
    const studentCount = await this.prisma.user.count({ where: { homeClassId: id } });
    if (studentCount > 0) {
      throw new BadRequestException('Kelas perwalian tidak dapat dihapus karena masih memiliki siswa terdaftar');
    }
    const subjectCount = await this.prisma.class.count({ where: { homeClassId: id } });
    if (subjectCount > 0) {
      throw new BadRequestException('Kelas perwalian tidak dapat dihapus karena masih memiliki mata pelajaran');
    }
    return this.prisma.homeClass.delete({ where: { id } });
  }

  /**
   * Materi dan kuis punya relasi ke Class tanpa cascade, jadi penghapusan
   * langsung akan gagal dengan error Prisma mentah. Dicek dulu agar pesannya
   * bisa dimengerti pengguna.
   */
  async removeSubjectClass(id: string) {
    const subjectClass = await this.prisma.class.findUnique({ where: { id } });
    if (!subjectClass) throw new NotFoundException('Mata pelajaran tidak ditemukan');

    const [materialCount, quizCount] = await Promise.all([
      this.prisma.material.count({ where: { classId: id } }),
      this.prisma.quiz.count({ where: { classId: id } }),
    ]);

    if (materialCount > 0 || quizCount > 0) {
      const parts: string[] = [];
      if (materialCount > 0) parts.push(`${materialCount} materi`);
      if (quizCount > 0) parts.push(`${quizCount} kuis`);
      throw new BadRequestException(
        `Mata pelajaran tidak dapat dihapus karena masih memiliki ${parts.join(' dan ')}. Hapus atau pindahkan dulu isinya.`,
      );
    }

    return this.prisma.class.delete({ where: { id } });
  }

  async getClassPerformance(classId: string) {
    const classInfo = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        homeClass: {
          include: {
            students: {
              select: {
                id: true,
                name: true,
                username: true,
                progressTrack: {
                  where: { material: { classId } },
                },
                results: {
                  where: { quiz: { classId } },
                },
              },
            },
          },
        },
      },
    });

    if (!classInfo) throw new NotFoundException('Class not found');

    return classInfo.homeClass.students.map((student) => {
      const totalMaterials = student.progressTrack.length;
      const avgProgress = totalMaterials > 0 
        ? student.progressTrack.reduce((sum, p) => sum + p.progress, 0) / totalMaterials 
        : 0;

      const totalQuizzes = student.results.length;
      const avgScore = totalQuizzes > 0 
        ? student.results.reduce((sum, r) => sum + (r.score / r.total * 100), 0) / totalQuizzes 
        : 0;

      return {
        id: student.id,
        name: student.name,
        username: student.username,
        avgProgress,
        avgScore,
        quizCount: totalQuizzes,
      };
    });
  }

  /**
   * Rapor ringkas milik siswa sendiri: nilai kuis, progres materi, dan
   * rata-ratanya. Dipakai layar "Statistik Saya".
   */
  async getMyReport(userId: string) {
    const [results, progress] = await Promise.all([
      this.prisma.quizResult.findMany({
        where: { userId },
        include: { quiz: { select: { title: true, subject: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userProgress.findMany({
        where: { userId },
        include: { material: { select: { title: true, subject: true, type: true } } },
        orderBy: { lastViewed: 'desc' },
      }),
    ]);

    const averageScore =
      results.length > 0
        ? results.reduce((sum, r) => sum + (r.total > 0 ? (r.score / r.total) * 100 : 0), 0) /
          results.length
        : 0;

    const completedMaterials = progress.filter((p) => p.isCompleted).length;
    const averageProgress =
      progress.length > 0
        ? progress.reduce((sum, p) => sum + p.progress, 0) / progress.length
        : 0;

    return {
      stats: {
        quizCount: results.length,
        averageScore: Number(averageScore.toFixed(1)),
        completedMaterials,
        trackedMaterials: progress.length,
        averageProgress: Number(averageProgress.toFixed(1)),
      },
      results: results.map((r) => ({
        id: r.id,
        title: r.quiz.title,
        subject: r.quiz.subject,
        score: r.score,
        total: r.total,
        percentage: r.total > 0 ? Math.round((r.score / r.total) * 100) : 0,
        createdAt: r.createdAt,
      })),
      progress: progress.map((p) => ({
        id: p.id,
        title: p.material.title,
        subject: p.material.subject,
        type: p.material.type,
        progress: p.progress,
        isCompleted: p.isCompleted,
        lastViewed: p.lastViewed,
      })),
    };
  }

  async getStudentResults(userId: string) {
    return this.prisma.quizResult.findMany({
      where: { userId },
      include: {
        quiz: {
          select: {
            title: true,
            subject: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getHomeClassPerformance(homeClassId: string) {

    const homeClass = await this.prisma.homeClass.findUnique({
      where: { id: homeClassId },
      include: {
        students: {
          include: {
            progressTrack: true,
            results: true
          }
        }
      }
    });

    if (!homeClass) throw new NotFoundException('HomeClass not found');

    return homeClass.students.map(student => {
      const totalMaterials = student.progressTrack.length;
      const avgProgress = totalMaterials > 0 
        ? student.progressTrack.reduce((sum, p) => sum + p.progress, 0) / totalMaterials 
        : 0;

      const totalQuizzes = student.results.length;
      const avgScore = totalQuizzes > 0 
        ? student.results.reduce((sum, r) => sum + (r.score / r.total * 100), 0) / totalQuizzes 
        : 0;

      return {
        id: student.id,
        name: student.name,
        username: student.username,
        avgProgress,
        avgScore,
        quizCount: totalQuizzes,
        isHolistic: true
      };
    });
  }
}
