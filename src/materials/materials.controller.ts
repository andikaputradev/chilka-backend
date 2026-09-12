import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Patch,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MaterialsService } from './materials.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateMaterialDto, UpdateMaterialDto, UpdateProgressDto } from './dto/material.dto';
import { materialUploadOptions, MATERIALS_PUBLIC_PREFIX } from './upload.config';

@ApiTags('materials')
@ApiBearerAuth()
@Controller('materials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  findAll(@Request() req) {
    return this.materialsService.findAll(req.user);
  }

  /**
   * Mengunggah berkas materi. Path yang dikembalikan dipakai sebagai `content`
   * saat membuat materi bertipe PDF.
   */
  @Post('upload')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Unggah berkas materi (PDF/DOC/DOCX)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', materialUploadOptions))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Tidak ada berkas yang diunggah');
    return {
      path: `${MATERIALS_PUBLIC_PREFIX}/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.materialsService.findOne(id, req.user.id);
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(@Body() data: CreateMaterialDto, @Request() req) {
    return this.materialsService.create(data, req.user.id);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() data: UpdateMaterialDto, @Request() req) {
    return this.materialsService.update(id, data, req.user.id, req.user.role);
  }

  @Patch(':id/progress')
  @Roles(UserRole.STUDENT)
  updateProgress(
    @Param('id') materialId: string,
    @Body() body: UpdateProgressDto,
    @Request() req,
  ) {
    return this.materialsService.updateProgress(req.user.id, materialId, body.progress);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  remove(@Param('id') id: string, @Request() req) {
    return this.materialsService.remove(id, req.user.id, req.user.role);
  }
}
