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

以下の通りです。

---

DIの基本（1）、Value Provider（2）、Class Provider（3）の部分は、NestJSの依存性注入の仕組みで利用されているコードであって、明示的に「ログ出力」するような処理が書かれていないため、直接コンソール上のログに現れるものではありません。

つまり：

- **1. DI の基礎**  
  単に`@Injectable()`などでクラスがDIコンテナに登録されるだけなので、これ自体は特定のログ出力を伴う処理ではありません。

- **2. Value Provider (`useValue`)**  
  値をそのまま提供するだけで、特に実行時に何か出力するようなコードは含まれていないため、ログからは確認できません。

- **3. Class Provider (`useClass`)**  
  環境に応じた具体的な実装クラスが選択されますが、こちらも明示的にログを出すコード（例：console.logなど）は用意されていないため、ログ自体からは検証できません。

動作確認としては、これらのプロバイダーが後続の処理（たとえばエンドポイントで利用されるサービス）に正しく注入され、利用されることが実際のアプリケーションの挙動や、テストケース／エンドポイントのレスポンスで間接的に確認されることになります。

---

このため、1,2,3の部分は直接のログ出力では確認できないということになります。

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

```pwsh
[Nest] 22108  - 2025/02/13 23:46:58     LOG [NestFactory] Starting Nest application...
データベース接続を実施: { host: 'localhost', port: 5432 }
[Nest] 22108  - 2025/02/13 23:46:58     LOG [InstanceLoader] AppModule dependencies initialized +28ms
[Nest] 22108  - 2025/02/13 23:46:58     LOG [RoutesResolver] AppController {/}: +10ms
[Nest] 22108  - 2025/02/13 23:46:58     LOG [RouterExplorer] Mapped {/, GET} route +4ms
[Nest] 22108  - 2025/02/13 23:46:58     LOG [NestApplication] Nest application successfully started +5ms
```

このログは、**4. Factory Provider (`useFactory`)** の部分に対応しています。以下に詳細を説明します。

- **Factory Provider (`useFactory`)** セクションのコードでは、`OptionsProvider` を使って接続オプションを取得し、`DatabaseConnection` クラスの `connect()` メソッド内でコンソールにログ (`データベース接続を実施: { host: 'localhost', port: 5432 }`) を出力しています。
- このログ出力によって、ファクトリ関数経由でプロバイダーが初期化され、実際にデータベース接続処理が呼び出されたことが確認できます。

つまり、サーバ起動時にこのログが確認できれば、`useFactory` を利用した Factory Provider の設定が正しく実行されたことを意味します。

以下の3つのログは、NestJS アプリケーションの起動時に自動的に出力される一般的な初期化プロセスの一部です。つまり、**custom-provider.md** の Factory Provider（`useFactory`）の動作確認で出力されたログの中に含まれているものですが、これらそのものは Factory Provider の処理に直接関係するものではありません。

- **[InstanceLoader]**:  
  NestJS の DI コンテナにより、`AppModule` の依存性が正しく初期化されたことを示しています。

- **[RoutesResolver]**:  
  アプリケーション内の `AppController` のルート `{ / }` が解決されたことを示しています。

- **[RouterExplorer]**:  
  実際に `{ / }` パスに対する GET ルートがマッピングされたことを示しています。

つまり、これらのログは NestJS の初期化工程やルーティング設定を反映しており、custom-provider.md の Factory Provider の具体的な処理（データベース接続のログ）とは直接的な関連はありません。

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

このログは、チュートリアルの「6. 動作確認」の部分に対応しています。具体的には、AppController 内の GET エンドポイントで定義された `getHello()` メソッド内で、LoggerService の `log()` メソッドを呼び出している部分です。

このコードでは、DI（依存性注入）を利用してエイリアスプロバイダー (`ALIAS_LOGGER`) から LoggerService を取得し、リクエストが来たときに `getHello()` メソッドを実行しています。結果として、`LOG: getHello() が呼ばれました` というログがコンソールに出力される仕組みになっています。

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
