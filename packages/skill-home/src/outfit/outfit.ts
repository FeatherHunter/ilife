// 穿搭出行能力·穿搭推荐（`home.outfit.pick` 的处理函数，#800 从 cmd_read 逐字搬迁，#810 按册子 enrich）。
//
// 出参 list 形（`items/total` 不变，搬迁前行为一致），按 `kind` 加法挂场景数据：
// pick→`outfit`（拼贴套装）、wardrobe→`wardrobe`（构成＋闲置＋建议）、
// season→`season`（季节清单＋候选位置）、trip-plan→`tripPlan`（逐日计划＋冲突＋行李）。
// 加法字段只给新页族消费，`renderEnvelopeHtml` 原样忽略，旧链路不受影响。
// 空库不抛：候选为 0 即 note ＋ 空场景（页面走空态，见各页族模板）。

import type { HomeDb, HomeItem } from '../fetch/db.js';
import { STATUS_AT_HOME } from '../fetch/db.js';

/** 衣物判据里的单字（**数据**：分类名／品名里的布料与品类字，不译）。 */
const FABRIC_CLOTH = '衣';
const FABRIC_SHOE = '鞋';
const FABRIC_WEAR = '穿';
const FABRIC_HAT = '帽';
/** 衣物筛选的 LIKE 模式（**数据**：分类／品名里的字，不译）。 */
const LIKE_CLOTH = '%衣%';
const LIKE_WEAR = '%穿%';
const LIKE_SHOES = '%鞋%';
import {
  listLocationsByItem, listTagsByItem, idleItems, listLocationNodes, getItemById,
} from '../fetch/index.js';
import { fail, note } from '../shared/fail.js';
import { toItemCard, buildOutfitList } from '../render/index.js';
import type { ItemCard } from '../render/index.js';
import { m } from '../entries/index.js';

type SlotKey = 'outer' | 'inner' | 'bottom' | 'shoes' | 'hat' | 'acce';

/** 槽位显示名（渲染期取词：模块级常量表会把语言固化在加载时，故改成函数）。 */
function slotLabels(): Record<SlotKey, string> {
  return {
    outer: m('skill-home.outfit-outfit.c027'),
    inner: m('skill-home.outfit-outfit.c028'),
    bottom: m('skill-home.outfit-outfit.c029'),
    shoes: m('skill-home.outfit-outfit.c030'),
    hat: m('skill-home.outfit-outfit.c031'),
    acce: m('skill-home.outfit-outfit.c032'),
  };
}

function slotLabel(k: SlotKey | 'other'): string {
  if (k === 'other') return m('skill-home.outfit-outfit.c026');
  return slotLabels()[k];
}
const SLOT_ORDER: SlotKey[] = ['outer', 'inner', 'bottom', 'shoes', 'hat', 'acce'];
const OCCASIONS = ['上班', '约会', '运动', '家居', '正式', '自定义'];
const SEASONS = ['夏季', '冬季', '春秋'];
/** 收纳态标签（**数据**：物品标签取值，不译；判据位只认它）。 */
const STORED_TAG = '已收纳';
/** 季节清单的动作名（**数据**：与页面/命令词汇一致，不译；判据位只认它）。 */
const ACTION_TAKE_OUT = '拿出';
const ACTION_STORE = '收纳';

function isClothing(it: HomeItem): boolean {
  // #927：老库无 items.category 列时 it.category 为空，分类名以 category_id 为准的调用方已在 clothingRows 里回填；
  // 这里仍只做内存判断（名里带衣/鞋等即算），不碰 SQL。
  const s = (it.category ?? '') + ' ' + it.name;
  // 判据位只认**数据**里的字（分类名／品名里的布料与品类字），不拿译文当判据。
  return s.includes(FABRIC_CLOTH) || s.includes(FABRIC_SHOE) || s.includes(FABRIC_WEAR) || s.includes(FABRIC_HAT);
}

function clothingRows(handle: HomeDb, limit: number): HomeItem[] {
  // #927：衣物筛选走 categories JOIN（老库无 i.category 列）；返回行把 JOIN 到的分类名回填到 category，
  // 保证下游 isClothing/slot 在新老库上口径一致。
  const rows = handle.db.prepare(
    `SELECT i.*, c.name AS _joined_category FROM items i LEFT JOIN categories c ON c.id=i.category_id WHERE (c.name LIKE '${LIKE_CLOTH}' OR c.name LIKE '${LIKE_WEAR}' OR i.name LIKE '${LIKE_CLOTH}' OR i.name LIKE '${LIKE_SHOES}') ORDER BY i.access_count DESC LIMIT ?`,
  ).all(limit) as unknown as (HomeItem & { _joined_category?: string | null })[];
  return rows.map((r) => ({ ...r, category: (r._joined_category ?? r.category ?? null) as string | null }));
}

function slotOf(name: string, tags: string[]): SlotKey | null {
  const s = name + ' ' + tags.join(' ');
  if (/外套|风衣|羽绒|大衣|冲锋衣|夹克|薄外衣/.test(s)) return 'outer';
  if (/T恤|衬衫|卫衣|毛衣|内搭|背心|针织|短袖|汗衫/.test(s)) return 'inner';
  if (/裤|裙|下装|打底/.test(s)) return 'bottom';
  if (/鞋|靴/.test(s)) return 'shoes';
  if (/帽/.test(s)) return 'hat';
  if (/围巾|配饰|皮带|包/.test(s)) return 'acce';
  return null;
}

function pickSets(handle: HomeDb, cards: ItemCard[], rows: HomeItem[]): {
  sets: { style: string; reason: string; slots: Partial<Record<SlotKey, ItemCard>> }[];
  gap: string[];
} {
  const bySlot = new Map<SlotKey, ItemCard[]>();
  rows.forEach((row, i) => {
    const slot = slotOf(row.name, listTagsByItem(handle, row.id));
    if (!slot) return;
    const list = bySlot.get(slot) ?? [];
    if (cards[i]) list.push(cards[i]);
    bySlot.set(slot, list);
  });
  const gap = SLOT_ORDER.filter((k) => (bySlot.get(k) ?? []).length === 0).map((k) => slotLabel(k));
  const n = Math.max(0, ...[...bySlot.values()].map((l) => l.length));
  const sets = [];
  for (let i = 0; i < Math.min(3, n); i++) {
    const slots: Partial<Record<SlotKey, ItemCard>> = {};
    for (const k of SLOT_ORDER) {
      const list = bySlot.get(k) ?? [];
      if (list.length) slots[k] = list[i % list.length];
    }
    const tags = Object.values(slots).flatMap((c) => String(c?.tags ?? '').split(',').filter(Boolean));
    const style = tags.includes('正式') ? m('skill-home.outfit-outfit.c001') : tags.includes('运动') ? m('skill-home.outfit-outfit.c002') : m('skill-home.outfit-outfit.c003');
    sets.push({ style, reason: m('skill-home.outfit-outfit.c004', { p0: String(style) }), slots }); // 理由不列部件名：上面槽位行已逐件写过名字。
  }
  return { sets, gap };
}

export function runOutfitPick(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'pick';
  // 候选池取满上限 20（与接口约束一致）：只取前 5 件时，排在访问次数榜外的内搭／鞋会整档缺位。
  const limit = params.limit !== undefined ? Number(params.limit) : 20;
  if (!Number.isInteger(limit) || limit <= 0 || limit > 20) fail(2, m('skill-home.outfit-outfit.c005'));
  const rows = clothingRows(handle, limit);
  const cards = rows.map((it) => toItemCard(it, listLocationsByItem(handle, it.id), listTagsByItem(handle, it.id)));
  const base = buildOutfitList(cards, kind);
  if (!cards.length) note(m('skill-home.outfit-outfit.c006'));

  if (kind === 'wardrobe') return { ...base, wardrobe: buildWardrobe(handle, rows, cards) };
  if (kind === 'season') return { ...base, season: buildSeason(handle, params, rows) };
  if (kind === 'trip-plan') return { ...base, tripPlan: buildTripPlan(handle, params, rows, cards) };
  const occasion = typeof params.occasion === 'string' && OCCASIONS.includes(params.occasion) ? params.occasion : '';
  const weather = typeof params.weather === 'string' ? params.weather.slice(0, 20) : '';
  return { ...base, outfit: { ...pickSets(handle, cards, rows), occasion, weather } };
}

function buildWardrobe(handle: HomeDb, rows: HomeItem[], cards: ItemCard[]): unknown {
  const counts = new Map<SlotKey | 'other', number>(); // 按槽位**码**计数（判据位不取译文）；显示名在出页时才取。
  rows.forEach((row, i) => {
    const slot = slotOf(row.name, listTagsByItem(handle, row.id));
    const key: SlotKey | 'other' = slot ?? 'other';
    counts.set(key, (counts.get(key) ?? 0) + (cards[i]?.quantity || 1));
  });
  const pieces = [...counts.values()].reduce((a, b) => a + b, 0); const total = Math.max(1, pieces); // 汇总与构成同按件数。
  const distribution = [...counts.entries()].map(([key, count]) => ({
    label: slotLabel(key), count, pct: Math.round((count * 100) / total),
  }));
  const dormant = idleItems(handle, 90)
    .map((r) => { try { return getItemById(handle, r.id); } catch { return null; } })
    .filter((it): it is HomeItem => !!it && isClothing(it))
    .slice(0, 20)
    .map((it) => {
      const tags = listTagsByItem(handle, it.id);
      const locs = listLocationsByItem(handle, it.id);
      const daysIdle = it.last_accessed_at
        ? Math.max(0, Math.floor((Date.now() - Date.parse(it.last_accessed_at)) / 86400000)) : null;
      return {
        id: it.id, name: it.name, slot: slotOf(it.name, tags) ? slotLabel(slotOf(it.name, tags) as SlotKey) : m('skill-home.outfit-outfit.c008'),
        daysIdle, lastUsed: it.last_accessed_at ? it.last_accessed_at.slice(0, 10) : m('skill-home.outfit-outfit.c009'),
        location: locs[0]?.location ?? '', estimated: it.last_accessed_at === null,
      };
    });
  const scarcest = [...counts.entries()].filter(([key]) => key !== 'other').sort((a, b) => a[1] - b[1])[0]; // 「other」是兜底桶，不是部位。
  const advice = (scarcest ? m('skill-home.outfit-outfit.c010', { p0: slotLabel(scarcest[0]), p1: String(scarcest[1]) }) : m('skill-home.outfit-outfit.c011'))
    + (dormant.length ? m('skill-home.outfit-outfit.c012', { p0: String(dormant.length) }) : m('skill-home.outfit-outfit.c013'));
  return {
    distribution, dormant, advice,
    summary: [
      { label: m('skill-home.outfit-outfit.c014'), value: String(pieces) },
      { label: m('skill-home.outfit-outfit.c015'), value: String(dormant.length) },
      { label: m('skill-home.outfit-outfit.c016'), value: scarcest ? slotLabel(scarcest[0]) : m('skill-home.outfit-outfit.c017') },
    ],
  };
}

function buildSeason(handle: HomeDb, params: Record<string, unknown>, rows: HomeItem[]): unknown {
  // 判据位用**码**（用户数据值），显示名另取：season/action 进筛选条件，不能拿译文去比。
  const seasonGiven = typeof params.season === 'string' && SEASONS.includes(params.season);
  const seasonCode = seasonGiven ? (params.season as string) : SEASONS[1];
  const takeOut = params.action === ACTION_TAKE_OUT;
  const actionCode = takeOut ? ACTION_TAKE_OUT : ACTION_STORE;
  const items = rows
    .map((it) => ({ it, tags: listTagsByItem(handle, it.id), locs: listLocationsByItem(handle, it.id) }))
    .filter(({ it, tags, locs }) => {
      const home = (locs[0]?.location_status ?? '') === STATUS_AT_HOME;
      return actionCode === ACTION_STORE
        ? home && tags.includes(seasonCode)
        : tags.includes(STORED_TAG) && (tags.includes(seasonCode) || it.name.includes(seasonCode));
    })
    .map(({ it, tags, locs }) => ({
      id: it.id, name: it.name, categoryName: it.category ?? '',
      tags, location: locs[0]?.location ?? '',
    }));
  const places = [...new Set(listLocationNodes(handle).map((p) => String(p).split('/')[0]).filter(Boolean))]; // 不截断：截了「阳台」这类真位置就选不到，「候选位置 N 处」也会报截断数。
  return { season: seasonGiven ? seasonCode : m('skill-home.outfit-outfit.c018'), action: takeOut ? m('skill-home.outfit-outfit.c019') : m('skill-home.outfit-outfit.c020'), items, places };
}

function buildTripPlan(handle: HomeDb, params: Record<string, unknown>, rows: HomeItem[], cards: ItemCard[]): unknown {
  const days = Number.isInteger(Number(params.days)) ? Math.min(7, Math.max(1, Number(params.days))) : 3;
  const destination = typeof params.destination === 'string' && params.destination.trim()
    ? params.destination.trim().slice(0, 20) : m('skill-home.outfit-outfit.c021');
  const { sets } = pickSets(handle, cards, rows);
  const base = sets.length ? sets : [{ style: m('skill-home.outfit-outfit.c022'), reason: m('skill-home.outfit-outfit.c023'), slots: {} }];
  const plans = Array.from({ length: days }, (_, d) => {
    const set = base[d % base.length];
    return { day: d + 1, style: set.style, reason: set.reason, slots: set.slots }; // 温度无外部来源：不给占位说明句，页上温度位留「—」。
  });
  const seen = new Map<number, number[]>();
  plans.forEach((p) => Object.values(p.slots).forEach((c) => {
    if (!c) return;
    seen.set(c.id, [...(seen.get(c.id) ?? []), p.day]);
  }));
  const conflicts = [...seen.entries()]
    .filter(([, ds]) => ds.length > 1)
    .map(([id, ds]) => {
      const name = cards.find((c) => c.id === id)?.name;
      const sep = m('skill-home.outfit-outfit.c024');
      return { hint: m('skill-home.outfit-outfit.c025', { p0: String(name), p1: String(ds.join(sep)) }) };
    });
  const luggageMap = new Map<number, { name: string; days: number }>();
  plans.forEach((p) => Object.values(p.slots).forEach((c) => {
    if (!c) return;
    const hit = luggageMap.get(c.id);
    if (hit) hit.days += 1;
    else luggageMap.set(c.id, { name: c.name, days: 1 });
  }));
  return {
    destination, days, plans, conflicts,
    luggage: [...luggageMap.entries()].map(([id, v]) => ({ id, name: v.name, days: v.days })),
  };
}
