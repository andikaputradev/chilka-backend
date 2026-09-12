import { Controller, Get, Post, Body, UseGuards, Param, Patch, Delete, Request } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateHomeClassDto,
  CreateSubjectClassDto,
  UpdateHomeClassDto,
  UpdateSubjectClassDto,
} from './dto/academic.dto';

@ApiTags('academic')
@ApiBearerAuth()
@Controller('academic')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  @Get('home-classes')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAllHomeClasses() {
    return this.academicService.findAllHomeClasses();
  }

  @Get('subject-classes')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAllSubjectClasses() {
    return this.academicService.findAllSubjectClasses();
  }

  @Post('home-classes')
  @Roles(UserRole.ADMIN)
  createHomeClass(@Body() data: CreateHomeClassDto) {
    return this.academicService.createHomeClass(data);
  }

  @Post('subject-classes')
  @Roles(UserRole.ADMIN)
  createSubjectClass(@Body() data: CreateSubjectClassDto) {
    return this.academicService.createSubjectClass(data);
  }

  @Patch('home-classes/:id')
  @Roles(UserRole.ADMIN)
  updateHomeClass(@Param('id') id: string, @Body() data: UpdateHomeClassDto) {
    return this.academicService.updateHomeClass(id, data);
  }

  @Patch('subject-classes/:id')
  @Roles(UserRole.ADMIN)
  updateSubjectClass(@Param('id') id: string, @Body() data: UpdateSubjectClassDto) {
    return this.academicService.updateSubjectClass(id, data);
  }

  @Delete('home-classes/:id')
  @Roles(UserRole.ADMIN)
  removeHomeClass(@Param('id') id: string) {
    return this.academicService.removeHomeClass(id);
  }

  @Delete('subject-classes/:id')
  @Roles(UserRole.ADMIN)
  removeSubjectClass(@Param('id') id: string) {
    return this.academicService.removeSubjectClass(id);
  }

  /** Rapor milik siswa yang sedang login. */
  @Get('my-report')
  @Roles(UserRole.STUDENT)
  getMyReport(@Request() req) {
    return this.academicService.getMyReport(req.user.id);
  }

  @Get('class/:id/performance')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getClassPerformance(@Param('id') id: string) {
    return this.academicService.getClassPerformance(id);
  }

  @Get('student/:id/results')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getStudentResults(@Param('id') id: string) {
    return this.academicService.getStudentResults(id);
  }

  @Get('home-class/:id/performance')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getHomeClassPerformance(@Param('id') id: string) {
    return this.academicService.getHomeClassPerformance(id);
  }
}
