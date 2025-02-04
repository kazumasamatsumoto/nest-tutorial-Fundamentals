import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from './config/config.service';
import { LoggerService } from './logger/logger.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    @Inject('ALIAS_LOGGER') private readonly logger: LoggerService,
  ) {}

  @Get()
  getHello(): string {
    this.logger.log('getHello() が呼ばれました');
    const host = this.configService.get('host');
    return this.appService.getHello() + ` - Config Host: ${host}`;
  }
}
