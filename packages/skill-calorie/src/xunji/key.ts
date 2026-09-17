/** 训记 KEY 管理（老 `xunji_bridge/auth.py:35-55／110-184`，代码新写）。
 *
 * 口径（逐条对老）：
 * - 只读环境变量：`XUNJI_TRAINS_KEY` 优先，空时回退 `XUNJI_API_KEY`（老 `get_key` 同序）；
 *   **没有密钥文件**（老机器同述）；
 * - `status` 只回「前 4 字＋末 2 字」预览（老 `auth.py:177`），全串永不进读数／回执／日志；
 * - `set` 写用户级系统环境：Windows 走 PowerShell 写 `HKCU\Environment`
 *   （值走 base64 进子进程，无注入风险；老 `winreg` 直写同位），成功后同步当前进程；
 * - `clear` 删用户级变量（本来没设即幂等成功，老 `clear_key` 同述）；
 * - 值校验：空拒绝／超 1024 字符拒绝（老 `set_key` 同值）。
 *
 * 本件是 KEY 两名＋缺省读法的**唯一定义地**（`upsert.ts`／`fetch.ts` 经由本件，
 * 前者薄转出保既有引用不断；#607 §八·6／#608 §八·7 的暂住到此收口）。
 * 短 KEY（< 7 字）不套预览公式（公式会把全串漏出来），只回等长星号。
 */

import { execFile } from 'node:child_process';
import { XUNJI_EXIT_CODES } from './subcommands.js';
import type { XunjiSubcommand } from './subcommands.js';
import type { XunjiRun } from './run.js';

/** KEY 环境变量两名（老 `auth.py:35-36` 同名同序；全模块只此一处）。 */
export const XUNJI_KEY_ENV = {
  primary: 'XUNJI_TRAINS_KEY',
  legacy: 'XUNJI_API_KEY',
} as const;

/** 当前生效的 KEY 是从哪个名读到的（null＝都没配）。 */
export type XunjiKeySource = 'XUNJI_TRAINS_KEY' | 'XUNJI_API_KEY' | null;

/** KEY 存取的注入缝（测试挡板从这里进；生产全缺省＝真环境＋真 PowerShell）。 */
export interface KeyStoreDeps {
  /** 环境表（缺省 `process.env`；测 `set／clear` 的落点时传假表，**不碰真系统**）。 */
  readonly env?: Record<string, string | undefined>;
  /** 平台（缺省 `process.platform`；测分发时覆盖）。 */
  readonly platform?: string;
  /** 跑一条 PowerShell（缺省真跑；测试给挡板，**不写真系统环境**）。 */
  readonly execPs?: (command: string) => Promise<void>;
}

/** 缺省 KEY 读法（老 `get_key`，`auth.py:47-55`；空串当没配）。 */
export function readKeyFromEnv(env: Record<string, string | undefined> = process.env): string | null {
  const primary = (env[XUNJI_KEY_ENV.primary] ?? '').trim();
  if (primary !== '') return primary;
  const legacy = (env[XUNJI_KEY_ENV.legacy] ?? '').trim();
  return legacy !== '' ? legacy : null;
}

/** 当前生效的 KEY 来自哪个名（老 `which`，`auth.py:58-66`；用于提示与状态）。 */
export function whichKey(env: Record<string, string | undefined> = process.env): XunjiKeySource {
  if ((env[XUNJI_KEY_ENV.primary] ?? '').trim() !== '') return XUNJI_KEY_ENV.primary;
  if ((env[XUNJI_KEY_ENV.legacy] ?? '').trim() !== '') return XUNJI_KEY_ENV.legacy;
  return null;
}

/** 预览：前 4 字＋`...`＋末 2 字（老 `auth.py:177` 原样）；短串只回等长星号，不漏全串。 */
export function previewKey(key: string): string | null {
  if (key === '') return null;
  if (key.length < 7) return '*'.repeat(key.length);
  return key.slice(0, 4) + '...' + key.slice(-2);
}

/** `status` 的读数（老 `auth.py:166-184` 七键；**无全串位**——全串永不进读数）。 */
export interface KeyStatus {
  readonly primary_name: string;
  readonly legacy_name: string;
  readonly primary_set: boolean;
  readonly legacy_set: boolean;
  readonly active_source: XunjiKeySource;
  readonly active_key_preview: string | null;
  readonly recommendation: string;
}

/** 状态报告（老 `status`；只读环境，不调网不落盘）。 */
export function keyStatus(deps: KeyStoreDeps = {}): KeyStatus {
  const env = deps.env ?? process.env;
  const primarySet = (env[XUNJI_KEY_ENV.primary] ?? '') !== '';
  const legacySet = (env[XUNJI_KEY_ENV.legacy] ?? '') !== '';
  const active = readKeyFromEnv(env);
  return {
    primary_name: XUNJI_KEY_ENV.primary,
    legacy_name: XUNJI_KEY_ENV.legacy,
    primary_set: primarySet,
    legacy_set: legacySet,
    active_source: whichKey(env),
    active_key_preview: active === null ? null : previewKey(active),
    recommendation: primarySet
      ? 'OK'
      : legacySet
        ? '建议把 XUNJI_API_KEY 迁移到 XUNJI_TRAINS_KEY（用 key set）'
        : '未配置，需用 key set <KEY> 设置',
  };
}

/** 缺省 PowerShell 跑法（老 `_set_key_powershell` 的形状：值走 base64，无注入风险）。 */
function defaultExecPs(command: string): Promise<void> {
  const bin = process.platform === 'win32' ? 'powershell.exe' : 'powershell';
  return new Promise<void>((resolve, reject) => {
    execFile(bin, ['-NoProfile', '-Command', command], { windowsHide: true }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function setCommand(name: string, value: string): string {
  const b64 = Buffer.from(value, 'utf8').toString('base64');
  return (
    `$v = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64}')); ` +
    `[Environment]::SetEnvironmentVariable('${name}', $v, 'User')`
  );
}

/** 写入用户级系统环境（老 `set_key`；成功同步当前进程，`set` 完立即可用）。 */
export async function setKey(
  value: string,
  opts: { readonly legacy?: boolean } = {},
  deps: KeyStoreDeps = {},
): Promise<{ readonly ok: true; readonly name: string } | { readonly ok: false; readonly error: string }> {
  const trimmed = (value ?? '').trim();
  if (trimmed === '') return { ok: false, error: 'KEY 不能为空' };
  if (trimmed.length > 1024) return { ok: false, error: 'KEY 过长（> 1024 字符），疑似输入错误' };
  const name = opts.legacy === true ? XUNJI_KEY_ENV.legacy : XUNJI_KEY_ENV.primary;
  try {
    await (deps.execPs ?? defaultExecPs)(setCommand(name, trimmed));
  } catch (e) {
    return { ok: false, error: '写入系统环境失败：' + (e instanceof Error ? e.message : String(e)) };
  }
  (deps.env ?? process.env)[name] = trimmed;
  return { ok: true, name };
}

/** 删除用户级系统环境变量（老 `clear_key`；本来没设即幂等成功）。 */
export async function clearKey(
  opts: { readonly legacy?: boolean } = {},
  deps: KeyStoreDeps = {},
): Promise<{ readonly ok: true; readonly name: string; readonly had: boolean } | { readonly ok: false; readonly error: string }> {
  const name = opts.legacy === true ? XUNJI_KEY_ENV.legacy : XUNJI_KEY_ENV.primary;
  try {
    await (deps.execPs ?? defaultExecPs)(`[Environment]::SetEnvironmentVariable('${name}', $null, 'User')`);
  } catch (e) {
    return { ok: false, error: '删除系统环境变量失败：' + (e instanceof Error ? e.message : String(e)) };
  }
  const env = deps.env ?? process.env;
  const had = (env[name] ?? '') !== '';
  delete env[name];
  return { ok: true, name, had };
}

type Values = Readonly<Record<string, string | boolean | readonly string[]>>;

/** `key` 子命令的分派（`run.ts` 调；`status` 无 KEY 退 2，`set／clear` 走 0／1）。 */
export async function runKeyCommand(sub: XunjiSubcommand, values: Values, store: KeyStoreDeps = {}): Promise<XunjiRun> {
  const refuse = (why: string, data: unknown): XunjiRun => ({
    subcommand: 'key', code: XUNJI_EXIT_CODES.error, message: why, data, stderr: why + '（用法：' + sub.usage + '）',
  });
  const action = values['<子动作>'];
  const legacy = values['--legacy'] === true;
  if (action !== 'status' && action !== 'set' && action !== 'clear') {
    return refuse('用法：key 的子动作只能是 status|set|clear（实际：' + String(action ?? '缺失') + '）', { usage: sub.usage });
  }
  if (action === 'status') {
    const s = keyStatus(store);
    if (s.active_source === null) {
      const line = '未配置训记 KEY（权威名 ' + s.primary_name + '，兼容名 ' + s.legacy_name + '；用 key set <KEY> 设置）';
      return { subcommand: 'key', code: XUNJI_EXIT_CODES.auth, message: line, data: s, stderr: line };
    }
    return {
      subcommand: 'key', code: XUNJI_EXIT_CODES.ok,
      message: 'KEY 已配置（' + s.active_source + '，预览 ' + String(s.active_key_preview) + '）',
      data: s, stderr: null,
    };
  }
  if (action === 'set') {
    const v = values['<KEY 值>'];
    if (typeof v !== 'string') return refuse('用法：key set <KEY 值>（KEY 值缺失；KEY 值不回显、不进仓）', { usage: sub.usage });
    const r = await setKey(v, { legacy }, store);
    if (!r.ok) return { subcommand: 'key', code: XUNJI_EXIT_CODES.error, message: r.error, data: { error: r.error }, stderr: r.error };
    return {
      subcommand: 'key', code: XUNJI_EXIT_CODES.ok,
      message: '已写入 ' + r.name + '（用户级，新开终端生效）',
      data: { name: r.name, legacy }, stderr: null,
    };
  }
  const r = await clearKey({ legacy }, store);
  if (!r.ok) return { subcommand: 'key', code: XUNJI_EXIT_CODES.error, message: r.error, data: { error: r.error }, stderr: r.error };
  const name = r.name;
  return {
    subcommand: 'key', code: XUNJI_EXIT_CODES.ok,
    message: r.had ? '已删除 ' + name : name + ' 未设置，无需删除',
    data: { name, had: r.had }, stderr: null,
  };
}
