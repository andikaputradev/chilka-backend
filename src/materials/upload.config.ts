import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { Request } from 'express';
import { diskStorage, FileFilterCallback } from 'multer';
import { basename, extname, join } from 'path';

/** Folder fisik tempat berkas materi disimpan. */
export const MATERIALS_UPLOAD_DIR = join(process.cwd(), 'uploads', 'materials');

/** Path relatif yang disimpan di kolom `content` dan dipakai klien. */
export const MATERIALS_PUBLIC_PREFIX = 'materials';

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * Nama berkas dari klien tidak dipercaya: hanya huruf, angka, dan strip yang
 * dipertahankan, lalu diberi stempel waktu supaya tidak saling menimpa.
 */
function safeFileName(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  const stem = basename(originalName, extname(originalName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${stem || 'materi'}-${Date.now()}${ext}`;
}

export const materialUploadOptions = {
  storage: diskStorage({
    destination: (
      _req: Request,
      _file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void,
    ) => {
      if (!existsSync(MATERIALS_UPLOAD_DIR)) {
        mkdirSync(MATERIALS_UPLOAD_DIR, { recursive: true });
      }
      cb(null, MATERIALS_UPLOAD_DIR);
    },
    filename: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => {
      cb(null, safeFileName(file.originalname));
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      cb(new BadRequestException('Hanya berkas PDF, DOC, atau DOCX yang diperbolehkan'));
      return;
    }
    cb(null, true);
  },
};
