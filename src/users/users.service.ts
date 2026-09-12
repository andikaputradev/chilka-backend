import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma, UserRole } from '@prisma/client';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { ChangePasswordDto } from '../auth/dto/auth.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        homeClass: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { role: 'asc' },
    });
  }

  async getStats() {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      return d;
    }).reverse();

    const [totalUsers, totalStudents, totalTeachers, totalClasses, totalMaterials] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.STUDENT } }),
      this.prisma.user.count({ where: { role: UserRole.TEACHER } }),
      this.prisma.class.count(),
      this.prisma.material.count(),
    ]);

    const activityData = await Promise.all(last7Days.map(async (date) => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      const count = await this.prisma.userProgress.count({
        where: { lastViewed: { gte: date, lt: nextDay } }
      });
      return count;
    }));

    return {
      totalUsers,
      totalStudents,
      totalTeachers,
      totalClasses,
      totalMaterials,
      recentActivity: activityData,
    };
  }

  async create(data: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { username: data.username } });
    if (existingUser) {
      throw new ConflictException('Username sudah digunakan');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        homeClassId: data.homeClassId || null,
      },
      select: { id: true, username: true, name: true, role: true },
    });
  }

  async update(id: string, data: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    // Partial Update Logic
    const updateData: Prisma.UserUpdateInput = {};
    if (data.username) updateData.username = data.username;
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (data.homeClassId !== undefined) {
      updateData.homeClass = data.homeClassId
        ? { connect: { id: data.homeClassId } }
        : { disconnect: true };
    }

    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, username: true, name: true, role: true },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Username sudah digunakan oleh user lain');
      }
      throw new BadRequestException('Gagal memperbarui data user');
    }
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, name: true, role: true, homeClassId: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }

  async changePassword(userId: string, data: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const isMatch = await bcrypt.compare(data.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Password lama tidak sesuai');
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: { id: true, username: true, name: true, role: true },
    });
  }

  /**
   * Beberapa relasi ke User tidak memakai cascade (materi, kuis, log, dan
   * kelas perwalian), sehingga penghapusan langsung akan gagal dengan error
   * constraint mentah. Semuanya diperiksa lebih dulu agar pesannya jelas.
   */
  async remove(id: string, requesterId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    if (requesterId && requesterId === id) {
      throw new BadRequestException('Anda tidak dapat menghapus akun Anda sendiri');
    }

    const [managedHomeClass, materialCount, quizCount, logCount] = await Promise.all([
      this.prisma.homeClass.findUnique({ where: { waliKelasId: id }, select: { name: true } }),
      this.prisma.material.count({ where: { teacherId: id } }),
      this.prisma.quiz.count({ where: { teacherId: id } }),
      this.prisma.systemLog.count({ where: { adminId: id } }),
    ]);

    const blockers: string[] = [];
    if (managedHomeClass) blockers.push(`masih menjadi wali kelas ${managedHomeClass.name}`);
    if (materialCount > 0) blockers.push(`memiliki ${materialCount} materi`);
    if (quizCount > 0) blockers.push(`memiliki ${quizCount} kuis`);
    if (logCount > 0) blockers.push(`memiliki ${logCount} catatan log sistem`);

    if (blockers.length > 0) {
      throw new BadRequestException(
        `User tidak dapat dihapus karena ${blockers.join(', ')}. Pindahkan tanggung jawab tersebut terlebih dahulu.`,
      );
    }

    // `select` wajib: tanpa ini Prisma mengembalikan seluruh baris termasuk
    // hash password ke klien.
    return this.prisma.user.delete({
      where: { id },
      select: { id: true, username: true, name: true, role: true },
    });
  }
}
