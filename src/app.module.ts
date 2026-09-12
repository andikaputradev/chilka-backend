import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MaterialsModule } from './materials/materials.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { UsersModule } from './users/users.module';
import { AcademicModule } from './academic/academic.module';
import { SystemModule } from './system/system.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    PrismaModule, 
    AuthModule, 
    MaterialsModule, 
    QuizzesModule, 
    UsersModule,
    AcademicModule,
    SystemModule,
    AiModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
