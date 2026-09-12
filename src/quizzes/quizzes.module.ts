import { Module } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';

@Module({
  providers: [QuizzesService],
  controllers: [QuizzesController]
})
export class QuizzesModule {}
