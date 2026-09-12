import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateHomeClassDto {
  @IsString()
  @MinLength(1, { message: 'Nama kelas tidak boleh kosong' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'Wali kelas wajib dipilih' })
  waliKelasId: string;
}

export class UpdateHomeClassDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  waliKelasId?: string;
}

export class CreateSubjectClassDto {
  @IsString()
  @MinLength(1, { message: 'Nama mata pelajaran tidak boleh kosong' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MinLength(1, { message: 'Kelas perwalian wajib dipilih' })
  homeClassId: string;

  @IsOptional()
  @IsString()
  teacherId?: string;
}

export class UpdateSubjectClassDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  homeClassId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;
}
