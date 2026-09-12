import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('token-uji') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('terdefinisi', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('mengembalikan token dan data user tanpa password bila kredensial benar', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        username: 'admin',
        name: 'Super Admin',
        role: UserRole.ADMIN,
        password: await bcrypt.hash('password123', 10),
      });

      const result: any = await service.login({ username: 'admin', password: 'password123' });

      expect(result.access_token).toBe('token-uji');
      expect(result.user.role).toBe(UserRole.ADMIN);
      expect(result.user).not.toHaveProperty('password');
    });

    it('menolak password yang salah', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        username: 'admin',
        name: 'Super Admin',
        role: UserRole.ADMIN,
        password: await bcrypt.hash('password123', 10),
      });

      await expect(
        service.login({ username: 'admin', password: 'salah' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('menolak username yang tidak terdaftar', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ username: 'hantu', password: 'apa saja' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('menyimpan password dalam bentuk hash, bukan teks polos', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: any) => Promise.resolve(data));

      await service.register({
        username: 'guru_baru',
        password: 'rahasia123',
        name: 'Guru Baru',
        role: 'TEACHER',
      });

      const saved = prisma.user.create.mock.calls[0][0].data;
      expect(saved.password).not.toBe('rahasia123');
      expect(await bcrypt.compare('rahasia123', saved.password)).toBe(true);
      expect(saved.role).toBe(UserRole.TEACHER);
    });

    it('membaca role tanpa peduli besar kecil huruf', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: any) => Promise.resolve(data));

      await service.register({
        username: 'admin2',
        password: 'rahasia123',
        name: 'Admin Dua',
        role: 'admin',
      });

      expect(prisma.user.create.mock.calls[0][0].data.role).toBe(UserRole.ADMIN);
    });

    it('menjadikan STUDENT sebagai role bawaan', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: any) => Promise.resolve(data));

      await service.register({ username: 'siswa', password: 'rahasia123', name: 'Siswa' });

      expect(prisma.user.create.mock.calls[0][0].data.role).toBe(UserRole.STUDENT);
    });

    it('menolak username yang sudah dipakai', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', username: 'admin' });

      await expect(
        service.register({ username: 'admin', password: 'rahasia123', name: 'Admin' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
