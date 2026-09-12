import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateQuizDto, SubmitQuizDto } from './dto/quiz.dto';

@ApiTags('quizzes')
@ApiBearerAuth()
@Controller('quizzes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get()
  findAll(@Request() req) {
    return this.quizzesService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.quizzesService.findOne(id, req.user);
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(@Body() data: CreateQuizDto, @Request() req) {
    return this.quizzesService.create(data, req.user.id);
  }

  /**
   * Body hanya berisi jawaban yang dipilih; skor dihitung server.
   */
  @Post(':id/submit')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN)
  submitResult(
    @Param('id') quizId: string,
    @Body() body: SubmitQuizDto,
    @Request() req,
  ) {
    return this.quizzesService.submitResult(req.user.id, quizId, body.answers);
  }

  @Get(':id/analytics')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getAnalytics(@Param('id') id: string, @Request() req) {
    return this.quizzesService.getQuizAnalytics(id, req.user);
  }
}
