// 取数层·飞书平台层：lark-cli 四门（存在+版本+登录+日历写权限）＋ 日历域六条子命令封装。
// 老家对照 scripts/feishu_sync.py：`--version`／`auth status`／`calendar +agenda`／`+search-event`／
// `+create`／`+update`／`events get`／`events delete`。超时 15/30/60 三档。
// 本文件只做「平台怎么调、回什么形状」；三阶段合并拉取、判重、归属清理等编排住 src/plan（能力目录）。
// 本模块不直连 DB。缺依赖即 throw（不返空，避免把「读不到」伪装成「远端没有」）。
import { accessSync, constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ScheduleFetchError } from './errors.js';

export const LARK_TIMEOUT_SHORT_MS = 15000;
export const LARK_TIMEOUT_NORMAL_MS = 30000;
export const LARK_TIMEOUT_LONG_MS = 60000;
export const LARK_CALENDAR_SCOPE = 'calendar';
/** 日历域一律走主日历（老家每条子命令都带 `--calendar-id primary`）。 */
export const LARK_CALENDAR_ID = 'primary';
/** 归属锚：写进远端事件描述的前缀（口径唯一处）。判断「这条远端对象是不是我管的」只看它。老出处 `schedule_db.py:1137`。 */
export const FEISHU_OWNER_MARK = '作息管家自动同步';
/** 自检留下的远端对象前缀（D-03：用户可据此识别并手工清掉；默认不跑，只走显式 op=check）。 */
export const FEISHU_SENTINEL_MARK = '[作息管家测试]';

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

// ── 归属锚的读写（唯一口径处）────────────────────────────────────────────────
export function composeFeishuDescription(notes?: string | null): string {
  const n = typeof notes === 'string' ? notes.trim() : '';
  return n ? FEISHU_OWNER_MARK + ' · ' + n : FEISHU_OWNER_MARK;
}

export function isOwnedDescription(description: unknown): boolean {
  return typeof description === 'string' && description.includes(FEISHU_OWNER_MARK);
}

// ── 事件形状（平台回包 → 中性结构）──────────────────────────────────────────
export interface LarkEvent {
  eventId: string;
  summary: string;
  /** ISO 8601，形如 `2026-09-20T09:00:00+08:00`。 */
  start: string;
  end: string;
  description: string;
  /** 判「这条远端对象是不是我管的」的唯一依据＝描述里的归属锚。 */
  owned: boolean;
}

function str(v: unknown): string { return typeof v === 'string' ? v : ''; }

function eventOf(raw: Record<string, unknown>): LarkEvent {
  const desc = str(raw.description);
  return {
    eventId: str(raw.event_id),
    summary: str(raw.summary),
    start: str((raw.start_time as Record<string, unknown> | undefined)?.datetime),
    end: str((raw.end_time as Record<string, unknown> | undefined)?.datetime),
    description: desc,
    owned: isOwnedDescription(desc),
  };
}

function searchItemOf(raw: Record<string, unknown>): LarkEvent {
  // `+search-event` 不返回 description（老家注释 `feishu_sync.py:414`），故owned 当刻一律 false，
  // 由阶段 3 单条补齐后再判。
  return {
    eventId: str(raw.event_id),
    summary: str(raw.summary),
    start: str((raw.start as Record<string, unknown> | undefined)?.date_time),
    end: str((raw.end as Record<string, unknown> | undefined)?.date_time),
    description: '',
    owned: false,
  };
}

function mustJson(cli: string, args: string[], what: string): Record<string, unknown> {
  const r = runLark(cli, args, LARK_TIMEOUT_LONG_MS);
  if (!r.ok) throw new ScheduleFetchError('LARK_BAD_RESPONSE', '飞书' + what + '失败：' + r.stderr.slice(0, 200));
  try { return JSON.parse(r.stdout) as Record<string, unknown>; }
  catch { throw new ScheduleFetchError('LARK_BAD_RESPONSE', '飞书' + what + '返回非 JSON'); }
}

/** 阶段 1 甲路：`+agenda`（带 description，但有索引延迟）。 */
export function larkAgenda(cli: string, startISO: string, endISO: string): LarkEvent[] {
  const j = mustJson(cli, ['calendar', '+agenda', '--calendar-id', LARK_CALENDAR_ID, '--start', startISO, '--end', endISO], '议程拉取');
  const payload = j.data;
  if (!Array.isArray(payload)) return [];
  return payload.map((it) => eventOf(it as Record<string, unknown>)).filter((e) => e.eventId !== '');
}

/** 阶段 1 乙路：`+search-event` 单窗（索引最新，但无 description、单次有返回上限）。 */
export function larkSearchEvents(cli: string, startISO: string, endISO: string): LarkEvent[] {
  const j = mustJson(cli, ['calendar', '+search-event', '--calendar-id', LARK_CALENDAR_ID, '--start', startISO, '--end', endISO], '检索');
  const data = j.data as Record<string, unknown> | undefined;
  const items = data && Array.isArray(data.items) ? data.items : [];
  return items.map((it) => searchItemOf(it as Record<string, unknown>)).filter((e) => e.eventId !== '');
}

/** 阶段 3：单条 `events get`（补 description）。读不到返 null，不抛。 */
export function larkGetEvent(cli: string, eventId: string): LarkEvent | null {
  let j: Record<string, unknown>;
  try {
    j = mustJson(cli, ['calendar', 'events', 'get', '--calendar-id', LARK_CALENDAR_ID, '--event-id', eventId], '单条读取');
  } catch { return null; }
  const data = j.data as Record<string, unknown> | undefined;
  const ev = data?.event as Record<string, unknown> | undefined;
  if (!ev) return null;
  const out = eventOf(ev);
  return { ...out, eventId: out.eventId || eventId };
}

/** 建远端对象：拿不到标识即 throw（D-11：绝不「建了却把空标识写回本地」）。 */
export function larkCreateEvent(cli: string, startISO: string, endISO: string, summary: string, description: string): LarkEvent {
  const args = [
    'calendar', '+create', '--calendar-id', LARK_CALENDAR_ID,
    '--start', startISO, '--end', endISO, '--summary', summary,
  ];
  if (description) args.push('--description', description);
  const j = mustJson(cli, args, '创建');
  const data = (j.data || {}) as Record<string, unknown>;
  const id = str(data.event_id);
  if (!id) {
    throw new ScheduleFetchError('LARK_NO_EVENT_ID', '飞书建事件成功但没给出标识（不写空标识回本地）：' + JSON.stringify(j).slice(0, 200));
  }
  return {
    eventId: id,
    summary: str(data.summary) || summary,
    start: str((data.start_time as Record<string, unknown> | undefined)?.datetime) || startISO,
    end: str((data.end_time as Record<string, unknown> | undefined)?.datetime) || endISO,
    description: str(data.description) || description,
    owned: isOwnedDescription(str(data.description) || description),
  };
}

/** 改远端对象：`--start`/`--end` 互锁（给一个必须给另一个，由调用方保证）。 */
export function larkUpdateEvent(
  cli: string, eventId: string,
  patch: { start?: string; end?: string; summary?: string; description?: string },
): LarkEvent {
  const args = ['calendar', '+update', '--calendar-id', LARK_CALENDAR_ID, '--event-id', eventId];
  if (patch.start !== undefined && patch.end !== undefined) args.push('--start', patch.start, '--end', patch.end);
  if (patch.summary !== undefined) args.push('--summary', patch.summary);
  if (patch.description !== undefined) args.push('--description', patch.description);
  const j = mustJson(cli, args, '更新');
  const data = (j.data || {}) as Record<string, unknown>;
  const desc = str(data.description) || patch.description || '';
  return {
    eventId,
    summary: str(data.summary) || patch.summary || '',
    start: str((data.start_time as Record<string, unknown> | undefined)?.datetime) || patch.start || '',
    end: str((data.end_time as Record<string, unknown> | undefined)?.datetime) || patch.end || '',
    description: desc,
    owned: isOwnedDescription(desc),
  };
}

/** 删远端对象：失败即 throw（同槽清理与孤儿清理都靠它，不许静默）。 */
export function larkDeleteEvent(cli: string, eventId: string, calendarId: string = LARK_CALENDAR_ID): void {
  const r = runLark(
    cli,
    ['calendar', 'events', 'delete', '--calendar-id', calendarId, '--event-id', eventId],
    LARK_TIMEOUT_LONG_MS,
  );
  if (!r.ok) throw new ScheduleFetchError('LARK_BAD_RESPONSE', '飞书删除失败：' + eventId + ' ' + r.stderr.slice(0, 200));
}
