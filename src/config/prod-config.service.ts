import { ConfigService } from './config.service';

export class ProdConfigService extends ConfigService {
  get(key: string): string {
    const config = {
      host: 'prod.example.com',
      port: '80',
    };
    return config[key];
  }
} 