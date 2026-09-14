/** #330 · 唯一出口 cmd_read 的 CLI 前置（纯搬，行为不变）。
 *
 * 参数解析（`parseArgs`／`parseReadArgs`）＋ 启动预检（`preflight`：node 版本与库路径）＋
 * 超时提示（`toast`）。变化频率与交付装配不同，故与 `delivery.ts` 分件（结构标准：按变化频率分）。
 * 对外 4 件（铁律五）：`toast`／`preflight`／`parseReadArgs`／`USAGE`。
 */
import { fail } from '../shared/params.js';

const DEFAULT_TIMEOUT_MS = 30000;

function toast(msg: string): void {
  console.error('TOAST: ' + msg);
}

function preflight(): string {
  const v = process.versions.node.split('.').map(Number);
  const major = v[0] as number;
  const minor = v[1] as number;
  if (!(major > 22 || (major === 22 && minor >= 13))) fail(1, 'node 低于 22.13：' + process.versions.node);
  const p = process.env.SKILLS_DB_PATH;
  if (!p) fail(1, 'SKILLS_DB_PATH 未设置（无默认值，必设）');
  return p as string;
}

interface ReadArgs {
  key: string | undefined;
  params: string | undefined;
  html: string | undefined;
  timeout: number;
}

const USAGE = '用法：cmd_read <calorie.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]';

function parseArgs(a: string[]): ReadArgs {
  const o: ReadArgs = {
    key: a[0], params: undefined, html: undefined, timeout: DEFAULT_TIMEOUT_MS,
  };
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--params' && i + 1 < a.length) o.params = a[++i] as string;
    else if (a[i] === '--html' && i + 1 < a.length) o.html = a[++i] as string;
    else if (a[i] === '--timeout' && i + 1 < a.length) {
      o.timeout = Number(a[++i]);
      if (!Number.isFinite(o.timeout) || (o.timeout as number) <= 0) fail(2, '--timeout 须为正数毫秒');
    } else fail(2, '未知参数：' + a[i] + '（' + USAGE + '）');
  }
  return o;
}

function parseReadArgs(a: string[]): ReadArgs {
  return parseArgs(a);
}

export { parseReadArgs, preflight, toast, USAGE };
