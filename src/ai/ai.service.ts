import { Injectable, InternalServerErrorException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../config/env';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private static readonly HISTORY_LIMIT = 20;

  constructor(private prisma: PrismaService) {
    const key = env.groqApiKey || env.geminiApiKey;
    if (!key) {
      this.logger.warn('API Key AI (GROQ_API_KEY / GEMINI_API_KEY) belum diisi di backend/.env');
    } else {
      this.logger.log(`Fitur Asisten AI (Groq: ${env.groqModel || 'openai/gpt-oss-120b'}) aktif 100%!`);
    }
  }

  private get apiKey(): string {
    const key = env.groqApiKey || env.geminiApiKey;
    if (!key) {
      throw new ServiceUnavailableException('Fitur asisten AI belum aktif. Admin perlu mengisi GROQ_API_KEY di backend/.env.');
    }
    return key;
  }

  async sendMessage(userId: string, message: string): Promise<string> {
    const apiKey = this.apiKey;

    try {
      const history = await this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: AiService.HISTORY_LIMIT,
      });

      const ordered = history.reverse();

      const messages = [
        {
          role: 'system',
          content: 'Anda adalah Simulasi AI, asisten belajar pintar di aplikasi SMKN 2 Padang Panjang. Bantu siswa memahami materi, jawab pertanyaan kuis, dan beri motivasi. Bahasa: Indonesia, ramah, edukatif.',
        },
        ...ordered.map((m) => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.content,
        })),
        { role: 'user', content: message },
      ];

      await this.prisma.chatMessage.create({
        data: { userId, role: 'user', content: message },
      });

      const modelToUse = env.groqModel || 'openai/gpt-oss-120b';
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          messages,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`Groq API Error (${res.status}): ${errorText}`);
        throw new Error(`Groq API Status ${res.status}`);
      }

      const data: any = await res.json();
      const aiReply = data.choices?.[0]?.message?.content ?? 'Maaf, saya sedang kehilangan kata-kata. Coba tanya lagi ya!';

      await this.prisma.chatMessage.create({
        data: { userId, role: 'model', content: aiReply },
      });

      return aiReply;
    } catch (error: any) {
      this.logger.error(`Gagal memproses pesan AI: ${error?.message ?? error}`);
      throw new InternalServerErrorException(
        error?.message?.includes('401')
          ? 'Akses API Key ditolak. Pastikan GROQ_API_KEY valid.'
          : 'Terjadi kesalahan saat menghubungi server AI.'
      );
    }
  }

  async resetChat(userId: string) {
    await this.prisma.chatMessage.deleteMany({ where: { userId } });
  }
}
