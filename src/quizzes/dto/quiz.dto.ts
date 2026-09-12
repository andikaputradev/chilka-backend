import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @MinLength(1, { message: 'Teks pertanyaan tidak boleh kosong' })
  questionText: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'Setiap soal minimal punya 2 pilihan jawaban' })
  @IsString({ each: true })
  options: string[];

  @IsInt()
  @Min(0)
  correctAnswerIndex: number;
}

export class CreateQuizDto {
  @IsString()
  @MinLength(1, { message: 'Judul kuis tidak boleh kosong' })
  title: string;

  @IsString()
  @MinLength(1, { message: 'Mata pelajaran tidak boleh kosong' })
  subject: string;

  @IsString()
  duration: string;

  @IsString()
  gradientColors: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Kuis harus memiliki minimal satu soal' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}

export class QuizAnswerDto {
  @IsString()
  questionId: string;

  @IsInt()
  @Min(0)
  selectedIndex: number;
}

/**
 * Siswa hanya mengirim jawaban yang dipilih. Skor dihitung di server agar
 * nilai tidak bisa dikarang dari sisi aplikasi.
 */
export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];
}
