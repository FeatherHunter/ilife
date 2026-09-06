/** T4 #23 · 取数层统一错误：失败抛错（缺失阻断不返空），打印归 CLI（T11）。 */
export class FetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchError';
  }
}
