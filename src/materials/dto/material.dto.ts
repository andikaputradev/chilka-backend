import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @MinLength(1, { message: 'Judul materi tidak boleh kosong' })
  title: string;

  @IsString()
  @MinLength(1, { message: 'Mata pelajaran tidak boleh kosong' })
  subject: string;

  @IsString()
  @IsIn(['TEXT', 'VIDEO', 'PDF'], { message: 'Tipe materi harus TEXT, VIDEO, atau PDF' })
  type: string;

  /** Isi materi: teks, atau path berkas hasil unggah untuk tipe PDF. */
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsString()
  duration: string;

  @IsString()
  difficulty: string;

  @IsString()
  gradientColors: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsString()
  classId?: string | null;
}

export class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  subject?: string;

  @IsOptional()
  @IsString()
  @IsIn(['TEXT', 'VIDEO', 'PDF'])
  type?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  gradientColors?: string;
}

export class UpdateProgressDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;
}
