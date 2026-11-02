// 穿搭出行能力·出行清单（`home.trip.manage` 的处理函数，#800 从 cmd_read 逐字搬迁，#810 enrich）。
//
// 入参 mode=pack|return；出参 receipt 形（`ok/message` 不变，退出语义不变），
// 加法挂 `trip`（行程类型＋天数＋清单卡片）：pack 未给 ids 时不落库，只给待选
// （种子 2 件旅游中照常列出）；return 先快照再归位，卡片带原位置。
// 加法字段只给 travel_trip 页消费，`renderEnvelopeHtml` 原样忽略。

import type { HomeDb } from '../fetch/db.js';
import { STATUS_AT_HOME, STATUS_TRAVELING } from '../fetch/db.js';
import { setLocationStatus, listLocationsByItem, listTagsByItem } from '../fetch/index.js';
import { toItemCard, buildReceipt } from '../render/index.js';
import { fail } from '../shared/fail.js';
import { m } from '../entries/index.js';

const TRIP_TYPES = ['健身', '出差', '旅行', '超市', '游泳', '爬山', '滑雪', '自定义'];

function tripDays(params: Record<string, unknown>): number {
  const n = Number(params.days ?? params['天数'] ?? 3);
  return Number.isInteger(n) ? Math.min(30, Math.max(1, n)) : 3;
}

function tripType(params: Record<string, unknown>): string {
  const raw = (params.trip_type as string | undefined) ?? (params['行程类型'] as string | undefined);
  // 白名单判定只看用户给的数据值；默认值不在白名单里（译过的默认值会被判成非法），单独走显示兜底。
  if (typeof raw === 'string' && TRIP_TYPES.includes(raw)) return raw;
  return m('skill-home.outfit-trip.c002');
}

function tripCards(handle: HomeDb, status: '旅游中' | '在家', reason: (name: string, loc: string) => string): unknown[] {
  const rows = handle.db.prepare(
    "SELECT i.* FROM items i JOIN item_locations l ON l.item_id=i.id WHERE l.location_status=? GROUP BY i.id ORDER BY i.access_count DESC LIMIT 20",
  ).all(status) as unknown as Parameters<typeof toItemCard>[0][];
  return rows.map((full) => {
    const locs = listLocationsByItem(handle, full.id);
    const tags = listTagsByItem(handle, full.id);
    const card = toItemCard(full, locs, tags);
    return { ...card, reason: reason(card.name, locs[0]?.location ?? ''), registered: true };
  });
}

export function runTripManage(params: Record<string, unknown>, handle: HomeDb): unknown {
  const mode = (params.mode as string | undefined) ?? 'pack';
  if (mode !== 'pack' && mode !== 'return') fail(2, m('skill-home.outfit-trip.c003'));
  const days = tripDays(params);
  const type = tripType(params);

  if (mode === 'return') {
    const hintBack = (name: string, loc: string): string => {
      const place = loc || m('skill-home.outfit-trip.c004');
      return m('skill-home.outfit-trip.c005', { p0: String(name), p1: String(place) });
    };
    const pending = tripCards(handle, STATUS_TRAVELING, hintBack);
    const rows = handle.db.prepare(`SELECT item_id FROM item_locations WHERE location_status='${STATUS_TRAVELING}'`).all() as { item_id: number }[];
    let n = 0;
    for (const r of rows) { setLocationStatus(handle, r.item_id, STATUS_AT_HOME); n++; }
    const message = n ? m('skill-home.outfit-trip.c006', { p0: String(n) }) : m('skill-home.outfit-trip.c007');
    return { ...buildReceipt(message), trip: { mode, tripType: type, days, items: pending } };
  }

  const ids = Array.isArray(params.ids) ? (params.ids as unknown[]).filter((x) => Number.isInteger(x)) as number[] : [];
  for (const id of ids) setLocationStatus(handle, id, STATUS_TRAVELING);
  // 汇总口径：本次带出「ids.length」件，库里处于旅游中的还有先前带出的；inTrip 取真条数，不拿截断行数当总数。
  const inTrip = (handle.db.prepare(`SELECT count(DISTINCT item_id) AS n FROM item_locations WHERE location_status='${STATUS_TRAVELING}'`).get() as { n: number }).n;
  if (ids.length) {
    const hintPack = (name: string, loc: string): string => {
      const place = loc || m('skill-home.outfit-trip.c008');
      return m('skill-home.outfit-trip.c009', { p0: String(name), p1: String(place) });
    };
    const items = tripCards(handle, STATUS_TRAVELING, hintPack);
    return { ...buildReceipt(m('skill-home.outfit-trip.c010', { p0: String(ids.length), p1: String(inTrip) })), trip: { mode, tripType: type, days, items } };
  }
  const hintPack = (name: string, loc: string): string => {
    const place = loc || m('skill-home.outfit-trip.c011');
    return m('skill-home.outfit-trip.c012', { p0: String(name), p1: String(place) });
  };
  const hintTodo = (name: string, loc: string): string => {
    const place = loc || m('skill-home.outfit-trip.c013');
    return m('skill-home.outfit-trip.c014', { p0: String(name), p1: String(place) });
  };
  const marked = tripCards(handle, STATUS_TRAVELING, hintPack);
  const todo = marked.length ? [] : tripCards(handle, STATUS_AT_HOME, hintTodo).slice(0, 8);
  const message = marked.length ? m('skill-home.outfit-trip.c015', { p0: String(inTrip) }) : m('skill-home.outfit-trip.c016');
  return { ...buildReceipt(message), trip: { mode, tripType: type, days, items: [...marked, ...todo] } };
}
