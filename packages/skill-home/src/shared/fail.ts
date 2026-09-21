// 共用位·进程出口：`fail`／`note`／`toast` 的唯一定义地（#800 从 cmd_read 搬出）。
//
// 被 8 个能力目录共用（items／space／outfit／stats／express／receipt／family／setup 经
// 各自 handler 调用参数守卫失败时走这里），故住共用位；本文件不出现任何能力名。
// 语义冻结：`fail` 打 `ERR <码>：<话>` 到 stderr 并 `process.exit(码)`，与搬迁前逐字一致。

export function fail(code: number, msg: string): never {
  console.error('ERR ' + code + ': ' + msg);
  process.exit(code);
}

export function toast(msg: string): void {
  console.error('TOAST: ' + msg);
}

export function note(msg: string): void {
  console.error('NOTE: ' + msg);
}
