import { Test, TestingModule } from '@nestjs/testing';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';

describe('QuizzesController', () => {
  let controller: QuizzesController;
  const quizzesService = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn(),
    submitResult: jest.fn().mockResolvedValue({ score: 1, total: 2, corrections: [] }),
    getQuizAnalytics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizzesController],
      providers: [{ provide: QuizzesService, useValue: quizzesService }],
    }).compile();

    controller = module.get<QuizzesController>(QuizzesController);
  });

  it('terdefinisi', () => {
    expect(controller).toBeDefined();
  });

  it('mengirim hanya jawaban ke service, bukan skor dari klien', async () => {
    const answers = [{ questionId: 'q1', selectedIndex: 0 }];
    const req = { user: { id: 'u1' } };

    await controller.submitResult('quiz-1', { answers }, req);

    expect(quizzesService.submitResult).toHaveBeenCalledWith('u1', 'quiz-1', answers);
  });
});
