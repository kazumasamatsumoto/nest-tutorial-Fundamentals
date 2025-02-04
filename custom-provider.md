# NestJS カスタムプロバイダー チュートリアル

このチュートリアルでは、NestJS におけるカスタムプロバイダーの4種類を紹介します。
以下のプロバイダーを利用して、依存性注入 (DI) を柔軟に設定する方法を説明します。

---

## 1. DI の基礎

NestJS では、`@Injectable()` を用いてクラスを DI コンテナに登録します。
例えば、通常のプロバイダーは以下のように実装します。

```ts
// 通常のプロバイダー例
import { Injectable } from '@nestjs/common';

@Injectable()
export class CatsService {
  // 実装内容
}
```

---

## 2. Value Provider (`useValue`)

定数や既存オブジェクトをそのまま提供する場合に使用します。

**例:**

```ts
// src/config/app.config.ts
export const AppConfig = {
  port: 3000,
  host: 'localhost',
  apiEndpoint: '/api',
};
```

モジュールでは次のように利用します。

```ts
import { Module } from '@nestjs/common';
import { AppConfig } from './config/app.config';

@Module({
  providers: [{ provide: 'APP_CONFIG', useValue: AppConfig }],
  exports: ['APP_CONFIG'],
})
export class AppModule {}
```

---

## 3. Class Provider (`useClass`)

環境や条件に応じたクラスの実装を動的に選択する場合に利用します。  
抽象クラスとその実装クラスの例を示します。

```ts
// src/config/config.service.ts
export abstract class ConfigService {
  abstract get(key: string): string;
}
```

```ts
// src/config/dev-config.service.ts
import { ConfigService } from './config.service';

export class DevConfigService extends ConfigService {
  get(key: string): string {
    const config = { host: 'localhost', port: '3000' };
    return config[key];
  }
}
```

```ts
// src/config/prod-config.service.ts
import { ConfigService } from './config.service';

export class ProdConfigService extends ConfigService {
  get(key: string): string {
    const config = { host: 'prod.example.com', port: '80' };
    return config[key];
  }
}
```

モジュールでの設定例:

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from './config/config.service';
import { DevConfigService } from './config/dev-config.service';
import { ProdConfigService } from './config/prod-config.service';

const configServiceProvider = {
  provide: ConfigService,
  useClass:
    process.env.NODE_ENV === 'production'
      ? ProdConfigService
      : DevConfigService,
};

@Module({
  providers: [configServiceProvider],
  exports: [ConfigService],
})
export class AppModule {}
```

---

## 4. Factory Provider (`useFactory`)

動的にインスタンスを生成するために、ファクトリ関数を利用します。  
複雑な初期化処理や外部ライブラリの利用時に便利です。

```ts
// src/database/database.connection.ts
export class DatabaseConnection {
  constructor(private options: any) {}

  connect() {
    console.log('データベース接続を実施:', this.options);
    // 接続処理の実装
    return true;
  }
}
```

```ts
// src/database/options.provider.ts
export class OptionsProvider {
  get() {
    // 外部ソースや環境変数から設定を取得する例
    return { host: 'localhost', port: 5432 };
  }
}
```

モジュールでの設定は次のとおりです。

```ts
import { Module } from '@nestjs/common';
import { DatabaseConnection } from './database/database.connection';
import { OptionsProvider } from './database/options.provider';

const connectionProvider = {
  provide: 'DATABASE_CONNECTION',
  useFactory: (optionsProvider: OptionsProvider) => {
    const options = optionsProvider.get();
    const connection = new DatabaseConnection(options);
    connection.connect();
    return connection;
  },
  inject: [OptionsProvider],
};

@Module({
  providers: [OptionsProvider, connectionProvider],
  exports: ['DATABASE_CONNECTION'],
})
export class AppModule {}
```

---

## 5. Alias Provider (`useExisting`)

既存のプロバイダーに対する別名（エイリアス）を作成し、同一インスタンスを複数のトークンから参照する場合に利用します。

```ts
// src/logger/logger.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggerService {
  log(message: string) {
    console.log('LOG:', message);
  }
}
```

モジュールでのエイリアス設定例:

```ts
import { Module } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';

const loggerAliasProvider = {
  provide: 'ALIAS_LOGGER',
  useExisting: LoggerService,
};

@Module({
  providers: [LoggerService, loggerAliasProvider],
  exports: [LoggerService, 'ALIAS_LOGGER'],
})
export class AppModule {}
```

---

## 6. 動作確認

プロバイダーが正しく導入されているかは、

- アプリ起動時のコンソール出力（例：ファクトリプロバイダーの場合「データベース接続を実施: …」が表示される）
- API エンドポイント（例：`AppController` で DI されたプロバイダーを利用して出力内容を確認）  
  などで確認できます。

例えば、`AppController` に以下のように実装すると、

```ts
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
```

`curl` や `Invoke-RestMethod` でリクエストすることで、応答に設定値が反映されているのが確認できます。

---

## 7. まとめ

このチュートリアルでは、NestJS のカスタムプロバイダーとして下記の4種類を解説しました。

- **Value Provider (`useValue`)**: 定数オブジェクトや既存の値を提供する
- **Class Provider (`useClass`)**: 環境に応じたクラスの実装を選択する
- **Factory Provider (`useFactory`)**: ファクトリ関数により動的に値やインスタンスを生成する
- **Alias Provider (`useExisting`)**: 既存のプロバイダーのエイリアスを作成する

これにより、各シナリオに応じた DI 設計が可能になります。

以上、NestJS のカスタムプロバイダーのチュートリアルでした。

```

このファイルをプロジェクト内に配置し、内容を参照することで、カスタムプロバイダーの実装方法と動作確認方法を学ぶことができます。
```
