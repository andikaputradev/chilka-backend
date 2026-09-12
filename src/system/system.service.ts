import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  async getLogs() {
    return this.prisma.systemLog.findMany({
      include: { admin: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createLog(adminId: string, action: string, details: string) {
    return this.prisma.systemLog.create({
      data: { adminId, action, details },
    });
  }
}
