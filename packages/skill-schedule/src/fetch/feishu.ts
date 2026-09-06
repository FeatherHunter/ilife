// 取数层·飞书同步点：lark-cli 四门（存在+版本+登录+日历写权限），缺失即 throw。
// 老家对照 scripts/feishu_sync.py：7 条子命令（--version/auth status/calendar +create/+update/+search-event/+agenda/events delete）。
// 超时 15/30/60 三档；本模块不直连 DB（diff 编排在 cli 层）。
import { accessSync, constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ScheduleFetchError } from './errors.js';

export const LARK_TIMEOUT_SHORT_MS = 15000;
export const LARK_TIMEOUT_NORMAL_MS = 30000;
export const LARK_TIMEOUT_LONG_MS = 60000;
export const LARK_CALENDAR_SCOPE = 'calendar';

// 跨平台定位：显式覆盖 → Windows npm 全局 → where/which → 固定路径；找不到返 null。
export function findLarkCli(): string | null {
  const over = process.env.LARK_CLI_PATH;
  if (over) {
    try { accessSync(over, constants.X_OK); return over; }
    catch { throw new ScheduleFetchError('LARK_UNAVAILABLE', 'LARK_CLI_PATH 不可用：' + over); }
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

// 调 lark-cli：超时/缺失 throw；非 0 退出返 ok:false（供权限判定），不抛。
export function runLark(cli: string, args: string[], timeoutMs = LARK_TIMEOUT_NORMAL_MS): LarkRunOk | LarkRunDenied {
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
    if (err.code === 'ENOENT') throw new ScheduleFetchError('LARK_UNAVAILABLE', 'lark-cli 不可用：' + cli);
    if (err.code === 'ETIMEDOUT') throw new ScheduleFetchError('LARK_TIMEOUT', 'lark-cli 超时：' + args.join(' '));
    return { ok: false, exit: err.status ?? null, stderr: String(err.stderr ?? err.message ?? e) };
  }
}

export function larkVersion(cli: string): string {
  const r = runLark(cli, ['--version'], LARK_TIMEOUT_SHORT_MS);
  if (!r.ok) return 'unknown';
  return r.stdout.trim().split('\n')[0] || 'unknown';
}

// 身份真值源：auth status 输出 identities.user.openId；无 openId 即未登录 throw。
export function authOpenId(cli: string): string {
  const r = runLark(cli, ['auth', 'status'], LARK_TIMEOUT_SHORT_MS);
  if (!r.ok) throw new ScheduleFetchError('LARK_NOT_LOGGED_IN', 'lark-cli auth status 失败（未登录？）');
  let j: unknown = null;
  try { j = JSON.parse(r.stdout); }
  catch { throw new ScheduleFetchError('LARK_BAD_RESPONSE', 'lark-cli auth status 非 JSON'); }
  const id = (j as { identities?: { user?: { openId?: unknown } } }).identities?.user?.openId;
  if (typeof id !== 'string' || id.length === 0) {
    throw new ScheduleFetchError('LARK_NOT_LOGGED_IN', 'lark-cli 未登录（无 openId，先 auth login）');
  }
  return id;
}

// 日历写权限门：+agenda 可调即认为日历可达（老家 _probe_calendar_writable 对应）。
export function checkCalendar(cli: string): boolean {
  return runLark(cli, ['calendar', '+agenda'], LARK_TIMEOUT_NORMAL_MS).ok;
}

export interface LarkReady { cliPath: string; version: string; openId: string; }

// 四门全绿才取数/同步：存在→版本→登录→日历；任一红 throw（调用方阻断，不返空）。
export function larkReady(): LarkReady {
  const cli = findLarkCli();
  if (!cli) throw new ScheduleFetchError('LARK_UNAVAILABLE', 'lark-cli 未找到：缺失阻断同步');
  const version = larkVersion(cli);
  const openId = authOpenId(cli);
  if (!checkCalendar(cli)) throw new ScheduleFetchError('LARK_DENIED', '日历不可达（缺授权？先 lark-cli auth login）');
  return { cliPath: cli, version, openId };
}

export interface FeishuEvent { eventId?: string; summary?: string; start?: string; end?: string; raw: unknown; }

function mustJson(cli: string, args: string[], what: string): unknown {
  const r = runLark(cli, args, LARK_TIMEOUT_LONG_MS);
  if (!r.ok) throw new ScheduleFetchError('LARK_BAD_RESPONSE', '飞书' + what + '失败：' + r.stderr.slice(0, 200));
  try { return JSON.parse(r.stdout); }
  catch { throw new ScheduleFetchError('LARK_BAD_RESPONSE', '飞书' + what + '返回非 JSON'); }
}

export function searchFeishuEvents(cli: string, start: string, end: string): unknown {
  return mustJson(cli, ['calendar', '+search-event', '--start', start, '--end', end], '查询');
}

export function createFeishuEvent(cli: string, start: string, end: string, summary: string, description: string): unknown {
  return mustJson(
    cli,
    ['calendar', '+create', '--start', start, '--end', end, '--summary', summary, '--description', description],
    '创建',
  );
}

export function updateFeishuEvent(cli: string, eventId: string, start: string, end: string, summary: string): unknown {
  return mustJson(
    cli,
    ['calendar', '+update', '--event-id', eventId, '--start', start, '--end', end, '--summary', summary],
    '更新',
  );
}

export function deleteFeishuEvent(cli: string, calendarId: string, eventId: string): unknown {
  return mustJson(cli, ['calendar', 'events', 'delete', '--calendar-id', calendarId, '--event-id', eventId], '删除');
}
