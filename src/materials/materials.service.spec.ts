import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MaterialsService } from './materials.service';
import { PrismaService } from '../prisma/prisma.service';

const baseMaterial = {
  title: 'Modul Koding',
  subject: 'KKA',
  type: 'PDF',
  content: 'materials/modul-koding.pdf',
  duration: '30m',
  difficulty: 'Beginner',
  gradientColors: '0xFF667eea, 0xFF764ba2',
};

describe('MaterialsService', () => {
  let service: MaterialsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      class: { findUnique: jest.fn() },
      material: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue({ id: 'm1' }),
      },
      userProgress: { upsert: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MaterialsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
  });

  it('terdefinisi', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('menolak guru yang menambah materi ke kelas yang tidak diampunya', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'guru-1', role: UserRole.TEACHER });
      prisma.class.findUnique.mockResolvedValue({ id: 'c1', teachers: [{ id: 'guru-lain' }] });

      await expect(
        service.create({ ...baseMaterial, classId: 'c1' }, 'guru-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('mewajibkan guru memilih kelas', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'guru-1', role: UserRole.TEACHER });

      await expect(service.create({ ...baseMaterial }, 'guru-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('memaksa isGlobal false untuk materi buatan guru', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'guru-1', role: UserRole.TEACHER });
      prisma.class.findUnique.mockResolvedValue({ id: 'c1', teachers: [{ id: 'guru-1' }] });

      const created: any = await service.create(
        { ...baseMaterial, classId: 'c1', isGlobal: true },
        'guru-1',
      );

      expect(created.isGlobal).toBe(false);
      expect(created.teacherId).toBe('guru-1');
    });

    it('tidak menyalin field asing dari body ke database', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: UserRole.ADMIN });

      const created: any = await service.create(
        { ...baseMaterial, id: 'id-palsu', teacherId: 'orang-lain' } as any,
        'admin-1',
      );

      expect(created.id).toBeUndefined();
      expect(created.teacherId).toBe('admin-1');
    });
  });

  describe('remove', () => {
    it('menolak guru yang menghapus materi milik orang lain', async () => {
      prisma.material.findUnique.mockResolvedValue({ id: 'm1', teacherId: 'guru-lain', type: 'PDF' });

      await expect(service.remove('m1', 'guru-1', UserRole.TEACHER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('mengizinkan admin menghapus materi milik siapa pun', async () => {
      prisma.material.findUnique.mockResolvedValue({
        id: 'm1',
        teacherId: 'guru-lain',
        type: 'TEXT',
        content: 'isi teks',
      });

      await expect(service.remove('m1', 'admin-1', UserRole.ADMIN)).resolves.toEqual({ id: 'm1' });
    });

    it('melempar NotFound bila materi tidak ada', async () => {
      prisma.material.findUnique.mockResolvedValue(null);

      await expect(service.remove('hilang', 'admin-1', UserRole.ADMIN)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
