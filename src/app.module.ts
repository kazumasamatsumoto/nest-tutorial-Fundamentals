import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseConnection } from './database/database.connection';
import { OptionsProvider } from './database/options.provider';
import { ConfigService } from './config/config.service';
import { DevConfigService } from './config/dev-config.service';
import { ProdConfigService } from './config/prod-config.service';
import { AppConfig } from './config/app.config';
import { LoggerService } from './logger/logger.service';

// Factory Provider: DatabaseConnection のインスタンス生成
const connectionProvider = {
  provide: 'DATABASE_CONNECTION',
  // useFactory を使って動的にインスタンス生成する実装例
  useFactory: (optionsProvider: OptionsProvider) => {
    const options = optionsProvider.get();
    // ここで、オプションに基づいて DatabaseConnection のインスタンスを作成
    const connection = new DatabaseConnection(options);
    connection.connect(); // 実際に接続処理を呼び出す例
    return connection;
  },
  inject: [OptionsProvider], // 必要な依存性をここで指定
};

// Class Provider: 環境に応じた ConfigService の実装クラスを選択
const configServiceProvider = {
  provide: ConfigService,
  useClass: process.env.NODE_ENV === 'production' ? ProdConfigService : DevConfigService,
};

// Value Provider: 定数オブジェクトをそのまま提供
const appConfigProvider = {
  provide: 'APP_CONFIG',
  useValue: AppConfig,
};

// Alias Provider: LoggerService のエイリアスを作成
const loggerAliasProvider = {
  provide: 'ALIAS_LOGGER',
  useExisting: LoggerService,
};

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    OptionsProvider, // OptionsProvider をプロバイダーとして登録
    connectionProvider,
    configServiceProvider, // Class Provider を登録
    appConfigProvider,     // Value Provider を登録
    LoggerService,         // LoggerService の基本実装
    loggerAliasProvider,   // Alias Provider を登録
  ],
  exports: ['DATABASE_CONNECTION', ConfigService, 'APP_CONFIG', 'ALIAS_LOGGER'],
})
export class AppModule {}
