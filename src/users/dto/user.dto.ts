import { IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @MinLength(3, { message: 'Username minimal 3 karakter' })
  username: string;

  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @IsString()
  @MinLength(1, { message: 'Nama tidak boleh kosong' })
  name: string;

  @IsEnum(UserRole, { message: 'Role harus STUDENT, TEACHER, atau ADMIN' })
  role: UserRole;

  @IsOptional()
  @IsString()
  homeClassId?: string | null;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username minimal 3 karakter' })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Nama tidak boleh kosong' })
  name?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role harus STUDENT, TEACHER, atau ADMIN' })
  role?: UserRole;

  @IsOptional()
  @IsString()
  homeClassId?: string | null;

  /** String kosong berarti "password tidak diubah". */
  @IsOptional()
  @ValidateIf((_o, value) => typeof value === 'string' && value.trim() !== '')
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password?: string;
}
