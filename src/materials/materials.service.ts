import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as fs from 'fs';
import { join, normalize } from 'path';
import { CreateMaterialDto, UpdateMaterialDto } from './dto/material.dto';
import { MATERIALS_UPLOAD_DIR } from './upload.config';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any) {
    const commonInclude = {
      teacher: { select: { name: true } },
      userProgress: {
        where: { userId: user.id },
        select: { progress: true, isCompleted: true },
      },
    };

    if (user.role === UserRole.ADMIN || user.role === UserRole.TEACHER) {
      return this.prisma.material.findMany({ include: commonInclude });
    }

    // Students: only global materials + materials from their home class's subject classes
    const student = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        homeClass: {
          select: { subjectClasses: { select: { id: true } } },
        },
      },
    });

    const classIds = student?.homeClass?.subjectClasses.map(c => c.id) ?? [];

    return this.prisma.material.findMany({
      where: {
        OR: [
          { isGlobal: true },
          ...(classIds.length > 0 ? [{ classId: { in: classIds } }] : []),
        ],
      },
      include: commonInclude,
    });
  }

  async findOne(id: string, userId: string) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: { teacher: { select: { name: true } } },
    });

    if (!material) throw new NotFoundException('Material not found');

    await this.prisma.userProgress.upsert({
      where: { userId_materialId: { userId, materialId: id } },
      update: { lastViewed: new Date() },
      create: { userId, materialId: id, progress: 0 },
    });

    return material;
  }

  /** Field yang boleh ditulis klien, dipisahkan agar body tidak langsung
   * di-spread ke Prisma (mencegah penimpaan kolom seperti id/teacherId). */
  private toMaterialData(data: CreateMaterialDto) {
    return {
      title: data.title,
      subject: data.subject,
      type: data.type,
      content: data.content,
      videoUrl: data.videoUrl ?? null,
      thumbnailUrl: data.thumbnailUrl ?? null,
      duration: data.duration,
      difficulty: data.difficulty,
      gradientColors: data.gradientColors,
    };
  }

  async create(data: CreateMaterialDto, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const base = this.toMaterialData(data);

    // Admin can create Global Materials or any Class Material
    if (user.role === UserRole.ADMIN) {
      return this.prisma.material.create({
        data: {
          ...base,
          isGlobal: data.isGlobal ?? false,
          classId: data.classId ?? null,
          teacherId: userId,
        },
      });
    }

    // Teachers must provide a classId and must be a teacher of that class
    if (!data.classId) {
      throw new ForbiddenException('Teachers must specify a class for materials');
    }

    const classInfo = await this.prisma.class.findUnique({
      where: { id: data.classId },
      include: { teachers: { select: { id: true } } },
    });

    const isTeacherOfClass = classInfo?.teachers.some((t) => t.id === userId);

    if (!classInfo || !isTeacherOfClass) {
      throw new ForbiddenException('You are not authorized to add material to this class');
    }

    return this.prisma.material.create({
      data: {
        ...base,
        classId: data.classId,
        teacherId: userId,
        isGlobal: false,
      },
    });
  }

  async update(id: string, data: UpdateMaterialDto, userId: string, role: UserRole) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Material not found');

    if (role !== UserRole.ADMIN && material.teacherId !== userId) {
      throw new ForbiddenException('You can only update your own materials');
    }

    return this.prisma.material.update({
      where: { id },
      data,
    });
  }

  async updateProgress(userId: string, materialId: string, progress: number) {
    const isCompleted = progress >= 100;
    return this.prisma.userProgress.upsert({
      where: { userId_materialId: { userId, materialId } },
      update: { progress, isCompleted, lastViewed: new Date() },
      create: { userId, materialId, progress, isCompleted },
    });
  }

  /**
   * Menghapus berkas fisik milik sebuah materi bila memang berada di dalam
   * folder unggahan. Pemeriksaan path mencegah penghapusan file di luar folder
   * itu bila kolom `content` berisi nilai yang tidak wajar.
   */
  private removeUploadedFile(content: string) {
    if (!content || content.startsWith('http')) return;

    const relative = content.replace(/^\/?(uploads\/)?(materials\/)?/, '');
    if (!relative) return;

    const target = normalize(join(MATERIALS_UPLOAD_DIR, relative));
    if (!target.startsWith(normalize(MATERIALS_UPLOAD_DIR))) return;

    try {
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        fs.unlinkSync(target);
      }
    } catch {
      // Kegagalan menghapus berkas tidak boleh membatalkan penghapusan data.
    }
  }

  async remove(id: string, teacherId: string, role: UserRole) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Material not found');

    if (role !== UserRole.ADMIN && material.teacherId !== teacherId) {
      throw new ForbiddenException('You can only delete your own materials');
    }

    const deleted = await this.prisma.material.delete({ where: { id } });

    // Berkas hanya dihapus setelah barisnya benar-benar hilang dari database.
    if (material.type === 'PDF') this.removeUploadedFile(material.content);

    return deleted;
  }
}
