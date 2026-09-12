import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    login: jest.fn().mockResolvedValue({ access_token: 'token-uji', user: { id: 'u1' } }),
    register: jest.fn().mockResolvedValue({ id: 'u2' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('terdefinisi', () => {
    expect(controller).toBeDefined();
  });

  it('meneruskan kredensial login ke AuthService', async () => {
    const body = { username: 'admin', password: 'password123' };
    await expect(controller.login(body)).resolves.toHaveProperty('access_token', 'token-uji');
    expect(authService.login).toHaveBeenCalledWith(body);
  });
});
