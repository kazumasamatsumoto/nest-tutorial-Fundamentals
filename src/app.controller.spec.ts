import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigService } from './config/config.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'host' ? 'localhost' : undefined),
          },
        },
        { provide: 'ALIAS_LOGGER', useValue: { log: (msg: string) => {} } },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World! - Config Host: localhost"', () => {
      expect(appController.getHello()).toBe(
        'Hello World! - Config Host: localhost',
      );
    });
  });
});
