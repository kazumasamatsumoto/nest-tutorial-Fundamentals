export class OptionsProvider {
  get() {
    // 設定値を返す。たとえば、環境変数や設定ファイルから値を取得する処理を実装できます
    return { host: 'localhost', port: 5432 };
  }
} 