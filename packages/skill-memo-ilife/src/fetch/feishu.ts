// 取数层·飞书同步点（M2）：lark-cli 四门（存在+登录+写权限scope+端到端由调用方验收），缺失即 throw。
// 老家对照 script/feishu_sync.py：auth status 为身份真值源；auth check --scope 判授权；task 域同步心愿。
import { accessSync, constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { MemoFetchError } from './errors.js';

export const LARK_DEFAULT_TIMEOUT_MS = 30000;
export const LARK_WISH_SCOPE = 'task';

// 跨平台定位：显式覆盖 → Windows npm 全局 → where/which → 固定路径；找不到返 null（不抛，larkReady 抛）。
export function findLarkCli(): string | null {
  const over = process.env.LARK_CLI_PATH;
  if (over) {
    try { accessSync(over, constants.X_OK); return over; }
    catch { throw new MemoFetchError('LARK_UNAVAILABLE', 'LARK_CLI_PATH 不可用：' + over); }
  }
  if (process.platform === 'win32') {
    const appdata = process.env.APPDATA;
    if (appdata) {
      const cand = join(appdata, 'npm', 'lark-cli.cmd');
      try { accessSync(cand, constants.X_OK); return cand; } catch { /* 继续 */ }
    }
    try {
      const out = execFileSync('where', ['lark-cli'], { stdio: 'pipe', encoding: 'utf8' }).split(/\r?\n/)[0].trim();
      if (out) return out;
    } catch { /* 继续 */ }
  } else {
    try {
      const out = execFileSync('which', ['lark-cli'], { stdio: 'pipe', encoding: 'utf8' }).trim();
      if (out) return out.split('\n')[0];
    } catch { /* 继续 */ }
  }
  for (const cand of ['/usr/local/bin/lark-cli', '/usr/bin/lark-cli']) {
    try { accessSync(cand, constants.X_OK); return cand; } catch { /* 继续 */ }
  }
  return null;
}

export interface LarkRunOk { ok: true; stdout: string; }
export interface LarkRunDenied { ok: false; exit: number | null; stderr: string; }

// 调 lark-cli：超时/缺失 throw；非 0 退出返 ok:false（供 scope 判定），不抛。
// Windows 的 lark-cli 本体即 .cmd（老家实证 %APPDATA%/npm/lark-cli.cmd），直 spawn 报 EINVAL，故经 cmd.exe /c 中转。
export function runLark(cli: string, args: string[], timeoutMs = LARK_DEFAULT_TIMEOUT_MS): LarkRunOk | LarkRunDenied {
  let file = cli;
  let argv = args;
  if (process.platform === 'win32' && /\.cmd$/i.test(cli)) {
    file = 'cmd.exe';
    argv = ['/d', '/s', '/c', cli, ...args];
  }
  try {
    const out = execFileSync(file, argv, { stdio: 'pipe', encoding: 'utf8', timeout: timeoutMs });
    return { ok: true, stdout: out };
  } catch (e) {
    const err = e as { code?: unknown; status?: number | null; stderr?: unknown; message?: string };
    if (err.code === 'ENOENT') throw new MemoFetchError('LARK_UNAVAILABLE', 'lark-cli 不可用：' + cli);
    if (err.code === 'ETIMEDOUT') throw new MemoFetchError('LARK_TIMEOUT', 'lark-cli 超时：' + args.join(' '));
    return { ok: false, exit: err.status ?? null, stderr: String(err.stderr ?? err.message ?? e) };
  }
}

export function larkVersion(cli: string): string {
  const r = runLark(cli, ['--version'], 10000);
  if (!r.ok) return 'unknown';
  return r.stdout.trim().split('\n')[0] || 'unknown';
}

// 身份真值源：auth status 输出 identities.user.openId；无 openId 即未登录 throw。
export function authOpenId(cli: string): string {
  const r = runLark(cli, ['auth', 'status']);
  if (!r.ok) throw new MemoFetchError('LARK_NOT_LOGGED_IN', 'lark-cli auth status 失败（未登录？）');
  let j: unknown = null;
  try { j = JSON.parse(r.stdout); }
  catch { throw new MemoFetchError('LARK_BAD_RESPONSE', 'lark-cli auth status 非 JSON'); }
  const id = (j as { identities?: { user?: { openId?: unknown } } }).identities?.user?.openId;
  if (typeof id !== 'string' || id.length === 0) {
    throw new MemoFetchError('LARK_NOT_LOGGED_IN', 'lark-cli 未登录（无 openId，先 auth login）');
  }
  return id;
}

// 写权限门：auth check --scope exit 0=已授权。
export function checkScope(cli: string, scope: string): boolean {
  return runLark(cli, ['auth', 'check', '--scope', scope]).ok;
}

export interface LarkReady { cliPath: string; version: string; openId: string; }

// 四门全绿才取数：存在→版本→登录→scope；任一红 throw（调用方阻断，不返空）。
export function larkReady(scope = LARK_WISH_SCOPE): LarkReady {
  const cli = findLarkCli();
  if (!cli) throw new MemoFetchError('LARK_UNAVAILABLE', 'lark-cli 未找到：缺失阻断取数');
  const version = larkVersion(cli);
  const openId = authOpenId(cli);
  if (!checkScope(cli, scope)) throw new MemoFetchError('LARK_DENIED', '缺 scope 授权：' + scope);
  return { cliPath: cli, version, openId };
}

export function fetchIndex(): string[] { return ['db', 'feishu']; }
