import { config } from 'dotenv';
import { join } from 'path';

// Dimuat sekali di awal, sebelum modul lain membaca process.env.
config({ path: join(process.cwd(), '.env') });

function read(name: string): string | null {
  const raw = process.env[name];
  if (raw === undefined) return null;
  const value = raw.trim();
  // Nilai placeholder yang sering tertinggal di .env dianggap kosong.
  if (value === '' || value === 'null' || value === 'undefined') return null;
  return value;
}

function required(name: string): string {
  const value = read(name);
  if (!value) {
    throw new Error(
      `[CONFIG] Variabel ${name} belum diisi. Lengkapi backend/.env (lihat backend/.env.example).`,
    );
  }
  return value;
}

const corsRaw = read('CORS_ORIGINS');

export const env = {
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  port: Number(read('PORT') ?? 3000),
  geminiApiKey: read('GEMINI_API_KEY'),
  groqApiKey: read('GROQ_API_KEY'),
  groqModel: read('GROQ_MODEL') ?? 'openai/gpt-oss-120b',
  /**
   * Daftar origin yang diizinkan, dipisah koma. Kosongkan untuk hanya
   * mengizinkan localhost (mode pengembangan). Isi '*' untuk mengizinkan semua.
   */
  corsOrigins: corsRaw ? corsRaw.split(',').map((o) => o.trim()).filter(Boolean) : null,
};
