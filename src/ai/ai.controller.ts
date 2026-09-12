import { Controller, Post, Body, Request, UseGuards, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatMessageDto } from './dto/ai.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Request() req, @Body() body: ChatMessageDto) {
    const response = await this.aiService.sendMessage(req.user.id, body.message);
    return { response };
  }

  @Delete('chat')
  async resetChat(@Request() req) {
    // Ditunggu sampai selesai; sebelumnya balasan sukses dikirim lebih dulu
    // sehingga penghapusan riwayat bisa gagal tanpa diketahui klien.
    await this.aiService.resetChat(req.user.id);
    return { success: true, message: 'Chat reset successfully' };
  }
}
