import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: RegisterDto) {
    const { username, password, name, role } = data;

    const existingUser = await this.prisma.user.findUnique({ where: { username } });
    if (existingUser) throw new ConflictException('Username sudah terdaftar');

    const hashedPassword = await bcrypt.hash(password, 10);

    let userRole: UserRole = UserRole.STUDENT;
    const normalizedRole = role?.toUpperCase();
    if (normalizedRole === UserRole.TEACHER) userRole = UserRole.TEACHER;
    if (normalizedRole === UserRole.ADMIN) userRole = UserRole.ADMIN;

    return this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: userRole,
      },
      select: { id: true, username: true, name: true, role: true }
    });
  }

  async login(data: LoginDto) {
    const { username, password } = data;
    
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new UnauthorizedException('Username tidak ditemukan atau kata sandi salah');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Kata sandi salah, silakan periksa kembali');

    const payload = { sub: user.id, username: user.username, role: user.role };
    
    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
