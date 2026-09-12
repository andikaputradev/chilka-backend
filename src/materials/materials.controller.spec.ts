import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';

describe('MaterialsController', () => {
  let controller: MaterialsController;
  const materialsService = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateProgress: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialsController],
      providers: [{ provide: MaterialsService, useValue: materialsService }],
    }).compile();

    controller = module.get<MaterialsController>(MaterialsController);
  });

  it('terdefinisi', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    it('mengembalikan path relatif berkas yang tersimpan', () => {
      const file = {
        filename: 'modul-koding-1700000000000.pdf',
        originalname: 'Modul Koding.pdf',
        size: 1024,
      } as Express.Multer.File;

      expect(controller.uploadFile(file)).toEqual({
        path: 'materials/modul-koding-1700000000000.pdf',
        originalName: 'Modul Koding.pdf',
        size: 1024,
      });
    });

    it('menolak permintaan tanpa berkas', () => {
      expect(() => controller.uploadFile(undefined as unknown as Express.Multer.File)).toThrow(
        BadRequestException,
      );
    });
  });
});
