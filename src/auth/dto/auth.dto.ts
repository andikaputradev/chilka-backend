import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1, { message: 'Username tidak boleh kosong' })
  username: string;

  @IsString()
  @MinLength(1, { message: 'Password tidak boleh kosong' })
  password: string;
}

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: 'Username minimal 3 karakter' })
  username: string;

  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @IsString()
  @MinLength(1, { message: 'Nama tidak boleh kosong' })
  name: string;

  @IsOptional()
  @IsString()
  @IsIn(['STUDENT', 'TEACHER', 'ADMIN', 'student', 'teacher', 'admin'], {
    message: 'Role harus STUDENT, TEACHER, atau ADMIN',
  })
  role?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Nama tidak boleh kosong' })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username minimal 3 karakter' })
  username?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Password lama tidak boleh kosong' })
  oldPassword: string;

  @IsString()
  @MinLength(6, { message: 'Password baru minimal 6 karakter' })
  newPassword: string;
}
