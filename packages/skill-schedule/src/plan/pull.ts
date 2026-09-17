// 日程与计划·三阶段合并拉取（能力内部件）：把某一天的远端事件读全，且读得准。
//
// 老实现的教训（`feishu_sync.py:398-565`）：单用 `+agenda` 有索引延迟（刚建的可能读不到），
// 单用 `+search-event` 既没有 description、一天又只回前 20 条。于是三阶段合并：
//   阶段 1 甲路：`+agenda` 整日（带 description）
//   阶段 1 乙路：`+search-event` 按 6 小时**分片**（索引最新，规避单次返回上限）
//   阶段 2    ：按 event_id 合并去重（甲路优先——它带 description）
//   阶段 3    ：description 仍为空者，逐条 `events get` 补齐（归属锚靠它才判得出）
//
// 有意偏离 D-13（老实现缺陷）：老家分片循环在异常分支里 `continue` 跳过了 `cur = cur_end`，
// 远端一抖就原地转圈、`ThreadPoolExecutor` 退出时 `wait` 等它 → 整条命令挂死
// （`feishu_sync.py:546-550`；实测 25s 超时未返回、同一窗口重复查 472 次）。本实现**游标一定推进**：
// 分片失败只记账并继续下一片；两路全断则上抛，由调用方降级——绝不空转。
import { ScheduleFetchError } from '../fetch/errors.js';
import { larkAgenda, larkSearchEvents, larkGetEvent, type LarkEvent } from '../fetch/feishu.js';
import { dayStartISO, dayEndISO, shardWindows, remoteSlotOf } from './iso.js';

export interface RemoteEvent extends LarkEvent {
  /** 本地口径的时间槽（跨日 00:00 已换成本地 23:59）。 */
  slotStart: string;
  slotEnd: string;
}

export interface PullResult {
  events: RemoteEvent[];
  errors: string[];
  /** 读数原料：两路各发了几次请求（分片合规、阶段 3 补了几条，都由它读）。 */
  calls: { agenda: number; search: number; detail: number };
}

function msg(e: unknown): string { return e instanceof Error ? e.message : String(e); }

function toRemote(e: LarkEvent): RemoteEvent {
  const slot = remoteSlotOf(e.start, e.end);
  return { ...e, slotStart: slot.start, slotEnd: slot.end };
}

export function pullFeishuDate(cli: string, date: string): PullResult {
  const errors: string[] = [];
  const calls = { agenda: 0, search: 0, detail: 0 };

  // 阶段 1 甲路：议程（失败不致命——乙路兜底，与老家同口径）
  let agenda: LarkEvent[] = [];
  let agendaFailed = false;
  calls.agenda++;
  try {
    agenda = larkAgenda(cli, dayStartISO(date), dayEndISO(date));
  } catch (e) {
    agendaFailed = true;
    errors.push('议程拉取失败：' + msg(e));
  }

  // 阶段 1 乙路：分片检索（每片独立成败；失败只记账，游标照推）
  const shards = shardWindows(date);
  const found: LarkEvent[] = [];
  let shardFailed = 0;
  for (const w of shards) {
    calls.search++;
    try {
      found.push(...larkSearchEvents(cli, w.start, w.end));
    } catch (e) {
      shardFailed++;
      errors.push('分片检索失败（' + w.start + '~' + w.end + '）：' + msg(e));
    }
  }
  if (agendaFailed && shardFailed === shards.length) {
    // 两路全断＝远端真的不可达：上抛让调用方降级，不在这里假装「远端没有事件」。
    throw new ScheduleFetchError('LARK_BAD_RESPONSE', '远端不可达：议程与全部 ' + shards.length + ' 个分片都失败（' + errors[0] + '）');
  }

  // 阶段 2：合并去重（甲路优先）
  const byId = new Map<string, LarkEvent>();
  for (const e of agenda) byId.set(e.eventId, e);
  for (const e of found) if (!byId.has(e.eventId)) byId.set(e.eventId, e);

  // 阶段 3：逐条补 description（归属锚只有补齐后才判得准）
  for (const e of byId.values()) {
    if (e.description) continue;
    calls.detail++;
    const full = larkGetEvent(cli, e.eventId);
    if (full) {
      e.description = full.description;
      e.owned = full.owned;
      if (!e.summary) e.summary = full.summary;
    }
  }

  return { events: [...byId.values()].map(toRemote), errors, calls };
}

/** 远端自然键：四元组（日期 ＋ 起 ＋ 止 ＋ 标题）——本地键是三元组，两侧口径不同是既有事实（S-01／S-03）。 */
export function remoteKeyOf(date: string, e: { slotStart: string; slotEnd: string; summary: string }): string {
  return date + '|' + e.slotStart + '|' + e.slotEnd + '|' + e.summary;
}

export function localKeyOf(date: string, timeStart: string, timeEnd: string): string {
  return date + '|' + timeStart + '|' + timeEnd;
}
