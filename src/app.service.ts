import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(userId: string, role: string) {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      return d;
    }).reverse();

    if (role === UserRole.TEACHER) {
      const homeClass = await this.prisma.homeClass.findUnique({
        where: { waliKelasId: userId },
        include: { 
          students: {
            select: {
              id: true,
              name: true,
              results: { take: 1, orderBy: { createdAt: 'desc' } }
            }
          } 
        }
      });

      const subjectClasses = await this.prisma.class.findMany({
        where: { teachers: { some: { id: userId } } },
        include: { 
          homeClass: { include: { _count: { select: { students: true } } } },
          _count: { select: { materials: true, quizzes: true } },
          quizzes: { include: { results: true } }
        }
      });

      const totalGlobalMaterials = await this.prisma.material.count({ where: { isGlobal: true } });
      const totalStudentsInClasses = subjectClasses.reduce((acc, curr) => acc + curr.homeClass._count.students, 0);
      let totalQuizScores = 0;
      let quizCount = 0;
      subjectClasses.forEach(sc => {
        sc.quizzes.forEach(q => {
          q.results.forEach(r => {
            totalQuizScores += (r.score / r.total * 100);
            quizCount++;
          });
        });
      });

      const avgScore = quizCount > 0 ? (totalQuizScores / quizCount).toFixed(1) : '0.0';

      const classIds = subjectClasses.map(sc => sc.id);
      const rangeEnd = new Date(last7Days[last7Days.length - 1]);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
      const teacherActivities = await this.prisma.userProgress.findMany({
        where: {
          material: { classId: { in: classIds } },
          lastViewed: { gte: last7Days[0], lt: rangeEnd },
        },
        select: { lastViewed: true },
      });
      const activityData = last7Days.map(day => {
        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);
        return teacherActivities.filter(a => a.lastViewed >= day && a.lastViewed < nextDay).length;
      });

      return {
        role: 'TEACHER',
        isWaliKelas: !!homeClass,
        homeClassId: homeClass?.id || null, // Added ID
        homeClassName: homeClass?.name || null,
        stats: {
          totalStudents: totalStudentsInClasses,
          avgScore: avgScore,
          totalMaterials: subjectClasses.reduce((acc, curr) => acc + curr._count.materials, 0) + totalGlobalMaterials,
        },
        mySubjects: subjectClasses.map(c => ({
          id: c.id,
          name: c.name,
          targetClass: c.homeClass.name,
          code: c.classCode
        })),
        classSubjects: homeClass ? await this.prisma.class.findMany({
          where: { homeClassId: homeClass.id },
          include: { teachers: { select: { name: true } } }
        }).then(classes => classes.map(c => ({
          name: c.name,
          teachers: c.teachers.map(t => t.name).join(', '),
          code: c.classCode
        }))) : [],
        watchlist: homeClass?.students.slice(0, 5).map(s => ({
          name: s.name,
          score: s.results.length > 0 ? Math.round(s.results[0].score / s.results[0].total * 100).toString() : 'N/A',
          status: s.results.length > 0 && (s.results[0].score / s.results[0].total < 0.6) ? 'Critical' : 'Safe'
        })) || [],
        recentActivity: activityData
      };

    } else if (role === UserRole.STUDENT) {
      const student = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { 
          homeClass: { 
            include: { 
              // Hanya nama yang dipakai; tanpa select, seluruh baris User
              // (termasuk hash password) ikut terambil dari database.
              waliKelas: { select: { name: true } },
              subjectClasses: {
                include: {
                  materials: { select: { id: true } },
                  teachers: { select: { name: true } },
                },
              }
            } 
          },
          progressTrack: true
        }
      });

      const totalGlobalMaterials = await this.prisma.material.count({ where: { isGlobal: true } });
      const totalCompleted = student?.progressTrack.filter(p => p.isCompleted).length || 0;
      const allMaterials = student?.homeClass?.subjectClasses.flatMap(sc => sc.materials) || [];

      const studentRangeEnd = new Date(last7Days[last7Days.length - 1]);
      studentRangeEnd.setDate(studentRangeEnd.getDate() + 1);
      const studentActivities = await this.prisma.userProgress.findMany({
        where: { userId, lastViewed: { gte: last7Days[0], lt: studentRangeEnd } },
        select: { lastViewed: true },
      });
      const activityData = last7Days.map(day => {
        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);
        return studentActivities.filter(a => a.lastViewed >= day && a.lastViewed < nextDay).length;
      });

      return {
        role: 'STUDENT',
        homeClass: student?.homeClass?.name || 'Belum Ada Kelas',
        waliKelas: student?.homeClass?.waliKelas?.name || 'Belum Ada Wali Kelas',
        subjects: student?.homeClass?.subjectClasses.map(sc => ({
          name: sc.name,
          teacher: sc.teachers.map(t => t.name).join(', '),
          code: sc.classCode
        })) || [],
        stats: {
          completedMaterials: totalCompleted,
          totalMaterials: allMaterials.length + totalGlobalMaterials,
        },
        recentActivity: activityData
      };

    } else {
      const [totalUsers, totalStudents, totalTeachers, totalClasses, totalMaterials] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: UserRole.STUDENT } }),
        this.prisma.user.count({ where: { role: UserRole.TEACHER } }),
        this.prisma.class.count(),
        this.prisma.material.count(),
      ]);

      const adminRangeEnd = new Date(last7Days[last7Days.length - 1]);
      adminRangeEnd.setDate(adminRangeEnd.getDate() + 1);
      const adminActivities = await this.prisma.userProgress.findMany({
        where: { lastViewed: { gte: last7Days[0], lt: adminRangeEnd } },
        select: { lastViewed: true },
      });
      const activityData = last7Days.map(day => {
        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);
        return adminActivities.filter(a => a.lastViewed >= day && a.lastViewed < nextDay).length;
      });

      return {
        role: 'ADMIN',
        totalUsers,
        totalStudents,
        totalTeachers,
        totalClasses,
        totalMaterials,
        recentActivity: activityData
      };
    }
  }

  getHello(): string {
    return 'Chilka API is running!';
  }
}
