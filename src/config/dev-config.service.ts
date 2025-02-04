import { ConfigService } from './config.service';

export class DevConfigService extends ConfigService {
  get(key: string): string {
    const config = {
      host: 'localhost',
      port: '3000',
    };
    return config[key];
  }
} 