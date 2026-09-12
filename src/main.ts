import { env } from './config/env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as express from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Security Headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  
  // Origin dibatasi lewat CORS_ORIGINS di .env. Tanpa konfigurasi hanya
  // localhost yang diizinkan (aplikasi Flutter native tidak mengirim Origin,
  // jadi tidak terpengaruh aturan ini).
  const allowAllOrigins = env.corsOrigins?.includes('*') ?? false;
  app.enableCors({
    origin: allowAllOrigins
      ? true
      : (env.corsOrigins ?? [
          /^http:\/\/localhost(:\d+)?$/,
          /^http:\/\/127\.0\.0\.1(:\d+)?$/,
        ]),
    credentials: true,
  });

  // Global Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Chilka API')
    .setDescription('Dokumentasi API untuk ekosistem belajar SMKN 2 Padang Panjang')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  const uploadsPath = join(process.cwd(), 'uploads');
  console.log(`[SYSTEM] Static assets folder: ${uploadsPath}`);

  // Logging Middleware + File Debugger (hanya saat pengembangan)
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      if (req.url.startsWith('/uploads/')) {
        const relativePath = req.url.replace('/uploads/', '');
        const filePath = join(uploadsPath, relativePath);
        const exists = fs.existsSync(filePath);
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        console.log(`  DEBUG: Physical path: ${filePath} (Exists: ${exists})`);
      }
      next();
    });
  }
  
  // Direct Express Static Middleware
  const materialsPath = join(uploadsPath, 'materials');
  app.use('/materials', express.static(materialsPath, {
    setHeaders: (res, path) => {
      if (path.toLowerCase().endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Accept-Ranges', 'bytes');
      }
    }
  }));

  app.use('/uploads', express.static(uploadsPath, {
    setHeaders: (res, path) => {
      if (path.toLowerCase().endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Accept-Ranges', 'bytes');
      }
    }
  }));

  await app.listen(env.port);
}
bootstrap();
