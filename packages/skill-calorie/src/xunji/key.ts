/** 训记 KEY 管理（老 `xunji_bridge/auth.py:35-55／110-184`，代码新写）。
 *
 * #676 · KEY 的**唯一真相是配置文件**里的 `xunji.key`（原先读两个环境变量 `XUNJI_TRAINS_KEY`／
 * `XUNJI_API_KEY`，`key set` 还写**用户级系统环境变量**——那正是裁定点名的「存了不生效」反例：
 * 已经跑着的宿主与它 spawn 出去的子进程都拿不到刚写的用户级变量）。现在：
 * - 读：`readKey()`（空串＝没配）；`status` 只回「前 4 字＋末 2 字」预览，**全串永不进读数／回执／日志**；
 * - 写：`setKey()` 用 `saveCalorieConfig` 写配置文件，下一次调用（含子进程）立即读得到；
 * - 删：`clearKey()` 把 `xunji.key` 写成空串（本来就空即幂等成功，老 `clear_key` 同述）；
 * - 值校验：空拒绝／超 1024 字符拒绝（老 `set_key` 同值）；短 KEY（< 7 字）不套预览公式（公式会把
 *   全串漏出来），只回等长星号。
 *
 * 本件是 KEY 读法与人话的**唯一定义地**（`upsert.ts`／`fetch.ts` 经由本件）。
 */
import type { ConfigRecord } from 'base-link-core';
import { loadCalorieConfig, saveCalorieConfig } from '../config.js';
import { XUNJI_EXIT_CODES } from './subcommands.js';
import type { XunjiSubcommand } from './subcommands.js';
import type { XunjiRun } from './run.js';

/** KEY 在配置文件里的落点（全模块只此一处；设置页的行名与它同源）。 */
export const XUNJI_KEY_FIELD = 'xunji.key';

/** 当前生效的 KEY（配置文件里的那一项，空串当没配）。 */
export function readKey(): string | null {
  const value = loadCalorieConfig().values.xunji.key.trim();
  return value !== '' ? value : null;
}

/** 预览：前 4 字＋`...`＋末 2 字（老 `auth.py:177` 原样）；短串只回等长星号，不漏全串。 */
export function previewKey(key: string): string | null {
  if (key === '') return null;
  if (key.length < 7) return '*'.repeat(key.length);
  return key.slice(0, 4) + '...' + key.slice(-2);
}

/** `status` 的读数（**无全串位**——全串永不进读数）。 */
export interface KeyStatus {
  readonly key_field: string;
  readonly configured: boolean;
  readonly active_key_preview: string | null;
  readonly recommendation: string;
}

/** 状态报告（老 `status`；只读配置，不调网不落盘）。 */
export function keyStatus(): KeyStatus {
  const active = readKey();
  return {
    key_field: XUNJI_KEY_FIELD,
    configured: active !== null,
    active_key_preview: active === null ? null : previewKey(active),
    recommendation: active !== null
      ? 'OK'
      : '未配置，请在卡路里设置页里填「训记 KEY」，或用 key set <KEY> 写进配置文件',
  };
}

/** 把 KEY 写进配置文件（写给的是**完整一份**：没给的项由配置件按默认值补齐）。 */
function writeKey(value: string): { readonly ok: true } | { readonly ok: false; readonly error: string } {
  try {
    const values = loadCalorieConfig().values;
    const next = { ...values, xunji: { ...values.xunji, key: value } } as unknown as ConfigRecord;
    saveCalorieConfig(next);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: '写配置文件失败：' + (e instanceof Error ? e.message : String(e)) };
  }
}

/** 设置 KEY（空／超长拒绝；成功即写盘，下次调用（含子进程）生效）。 */
export function setKey(
  value: string,
): { readonly ok: true } | { readonly ok: false; readonly error: string } {
  const trimmed = (value ?? '').trim();
  if (trimmed === '') return { ok: false, error: 'KEY 不能为空' };
  if (trimmed.length > 1024) return { ok: false, error: 'KEY 过长（> 1024 字符），疑似输入错误' };
  return writeKey(trimmed);
}

/** 删除 KEY（写回空串；本来没配即幂等成功）。 */
export function clearKey(): { readonly ok: true; readonly had: boolean } | { readonly ok: false; readonly error: string } {
  const had = readKey() !== null;
  const r = writeKey('');
  return r.ok ? { ok: true, had } : r;
}

type Values = Readonly<Record<string, string | boolean | readonly string[]>>;

/** `key` 子命令的分派（`run.ts` 调；`status` 无 KEY 退 2，`set／clear` 走 0／1）。 */
export async function runKeyCommand(sub: XunjiSubcommand, values: Values): Promise<XunjiRun> {
  const refuse = (why: string, data: unknown): XunjiRun => ({
    subcommand: 'key', code: XUNJI_EXIT_CODES.error, message: why, data, stderr: why + '（用法：' + sub.usage + '）',
  });
  const action = values['<子动作>'];
  if (action !== 'status' && action !== 'set' && action !== 'clear') {
    return refuse('用法：key 的子动作只能是 status|set|clear（实际：' + String(action ?? '缺失') + '）', { usage: sub.usage });
  }
  if (action === 'status') {
    const s = keyStatus();
    if (!s.configured) {
      const line = '未配置训记 KEY（配置项 ' + s.key_field + '；用 key set <KEY> 或设置页写进配置文件）';
      return { subcommand: 'key', code: XUNJI_EXIT_CODES.auth, message: line, data: s, stderr: line };
    }
    return {
      subcommand: 'key', code: XUNJI_EXIT_CODES.ok,
      message: 'KEY 已配置（' + s.key_field + '，预览 ' + String(s.active_key_preview) + '）',
      data: s, stderr: null,
    };
  }
  if (action === 'set') {
    const v = values['<KEY 值>'];
    if (typeof v !== 'string') return refuse('用法：key set <KEY 值>（KEY 值缺失；KEY 值不回显、不进仓）', { usage: sub.usage });
    const r = setKey(v);
    if (!r.ok) return { subcommand: 'key', code: XUNJI_EXIT_CODES.error, message: r.error, data: { error: r.error }, stderr: r.error };
    return {
      subcommand: 'key', code: XUNJI_EXIT_CODES.ok,
      message: '已写入配置文件（' + XUNJI_KEY_FIELD + '）：下次调用即生效',
      data: { key_field: XUNJI_KEY_FIELD }, stderr: null,
    };
  }
  const r = clearKey();
  if (!r.ok) return { subcommand: 'key', code: XUNJI_EXIT_CODES.error, message: r.error, data: { error: r.error }, stderr: r.error };
  return {
    subcommand: 'key', code: XUNJI_EXIT_CODES.ok,
    message: r.had ? '已删除配置里的 KEY' : 'KEY 未配置，无需删除',
    data: { key_field: XUNJI_KEY_FIELD, had: r.had }, stderr: null,
  };
}
