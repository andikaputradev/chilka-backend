import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @MinLength(1, { message: 'Pesan tidak boleh kosong' })
  @MaxLength(4000, { message: 'Pesan terlalu panjang (maksimal 4000 karakter)' })
  message: string;
}
