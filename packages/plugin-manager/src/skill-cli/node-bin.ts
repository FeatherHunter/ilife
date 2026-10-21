/** 子进程的执行两件套：用什么二进制当 node、一次取数怎么跑（异步，绝不阻塞宿主事件循环）。
 *
 * 同步 `spawnSync` 会把整个宿主线程钉住——面板首开时六家桥同时被叫起，骨架便要等它们
 * 串行跑完（#1294 实测 31.9 s）。本文件把「起子进程」换成 Promise 版 `spawn`：
 * 子进程在等 I/O 时宿主能继续画屏、继续处理别的电话。
 */
import { spawn } from 'node:child_process';
import { MAX_STDOUT_BYTES } from './contract.js';

/** 子进程一次读数的原始结果（stdout／stderr 已按 utf8 收齐）。 */
export interface CliRunOutcome {
  /** 退出码（被信号杀掉时为 null）。 */
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** 起不来／超时／回执超限：由桥映射成 fetch-failed 的人话。 */
export type CliRunFailure =
  | { readonly kind: 'timeout' }
  | { readonly kind: 'spawn-failed'; readonly message: string }
  | { readonly kind: 'output-too-large' };

/** stderr 只留尾巴：错误文案只用最后一行，不把整段日志搬进内存。 */
const MAX_STDERR_CHARS = 64 * 1024;

/** node 可执行体解析（纯函数，execPath 可注入单测）。
 *
 * execPath 是 node 即直用；否则（Electron 宿主）沿用该二进制但加官方
 * `ELECTRON_RUN_AS_NODE` 语义当 node 用——直起 Electron 会弹出 GUI 子进程永不退出。
 */
export function resolveNodeBin(execPath: string = process.execPath): { readonly bin: string; readonly extraEnv: Record<string, string> } {
  if (/(^|[\\/])node(\.exe)?$/i.test(execPath)) return { bin: execPath, extraEnv: {} };
  return { bin: execPath, extraEnv: { ELECTRON_RUN_AS_NODE: '1' } };
}

/** 跑一次技能出口：`<node> <cli> <key> --params <json>`，收 stdout／stderr，超时杀掉。
 *
 * 失败一律 reject 成 {@link CliRunFailure}（不混进结果值）：调用方据此映射错误码，
 * 正常路径只拿 `CliRunOutcome`。
 */
export function runSkillCli(bin: string, argv: readonly string[], env: NodeJS.ProcessEnv, timeoutMs: number): Promise<CliRunOutcome> {
  return new Promise<CliRunOutcome>((resolve, reject) => {
    const child = spawn(bin, [...argv], { env, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let oversized = false;
    let timedOut = false;
    let settled = false;
    const settle = (action: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      action();
    };
    // 一次性看门狗：只盯「这一个子进程」是否超期，超期即杀掉（不是轮询、不重试）。
    const watchdog: ReturnType<typeof setTimeout> = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    // 不影响宿主退出：宿主关停时不必等这只看门狗。
    watchdog.unref?.();

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      stdoutBytes += Buffer.byteLength(chunk);
      if (stdoutBytes > MAX_STDOUT_BYTES) {
        oversized = true;
        child.kill();
        return;
      }
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk: string) => {
      // 只留尾巴：错误文案用最后一行；超长就丢头部，不无界增长。
      stderr = (stderr + chunk).slice(-MAX_STDERR_CHARS);
    });
    child.on('error', (error: Error) => {
      settle(() => reject({ kind: 'spawn-failed', message: error.message } satisfies CliRunFailure));
    });
    child.on('close', (status: number | null) => {
      settle(() => {
        if (timedOut) return reject({ kind: 'timeout' } satisfies CliRunFailure);
        if (oversized) return reject({ kind: 'output-too-large' } satisfies CliRunFailure);
        resolve({ status, stdout, stderr });
      });
    });
  });
}
