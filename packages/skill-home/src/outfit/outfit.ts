// 穿搭出行能力·穿搭推荐（`home.outfit.pick` 的处理函数，#800 从 cmd_read 逐字搬迁，#810 按册子 enrich）。
//
// 出参 list 形（`items/total` 不变，搬迁前行为一致），按 `kind` 加法挂场景数据：
// pick→`outfit`（拼贴套装）、wardrobe→`wardrobe`（构成＋闲置＋建议）、
// season→`season`（季节清单＋候选位置）、trip-plan→`tripPlan`（逐日计划＋冲突＋行李）。
// 加法字段只给新页族消费，`renderEnvelopeHtml` 原样忽略，旧链路不受影响。
// 空库不抛：候选为 0 即 note ＋ 空场景（页面走空态，见各页族模板）。

import type { HomeDb, HomeItem } from '../fetch/db.js';
import {
  listLocationsByItem, listTagsByItem, idleItems, listLocationNodes, getItemById,
} from '../fetch/index.js';
import { fail, note } from '../shared/fail.js';
import { toItemCard, buildOutfitList } from '../render/index.js';
import type { ItemCard } from '../render/index.js';

type SlotKey = 'outer' | 'inner' | 'bottom' | 'shoes' | 'hat' | 'acce';

const SLOT_NAMES: Record<SlotKey, string> = {
  outer: '外套', inner: '内搭', bottom: '下装', shoes: '鞋', hat: '帽子', acce: '配饰',
};
const SLOT_ORDER: SlotKey[] = ['outer', 'inner', 'bottom', 'shoes', 'hat', 'acce'];
const OCCASIONS = ['上班', '约会', '运动', '家居', '正式', '自定义'];
const SEASONS = ['夏季', '冬季', '春秋'];

function isClothing(it: HomeItem): boolean {
  const s = (it.category ?? '') + ' ' + it.name;
  return s.includes('衣') || s.includes('鞋') || s.includes('穿') || s.includes('帽');
}

function clothingRows(handle: HomeDb, limit: number): HomeItem[] {
  return handle.db.prepare(
    "SELECT i.* FROM items i WHERE (i.category LIKE '%衣%' OR i.category LIKE '%穿%' OR i.name LIKE '%衣%' OR i.name LIKE '%鞋%') ORDER BY i.access_count DESC LIMIT ?",
  ).all(limit) as unknown as HomeItem[];
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
  const gap = SLOT_ORDER.filter((k) => (bySlot.get(k) ?? []).length === 0).map((k) => SLOT_NAMES[k]);
  const n = Math.max(0, ...[...bySlot.values()].map((l) => l.length));
  const sets = [];
  for (let i = 0; i < Math.min(3, n); i++) {
    const slots: Partial<Record<SlotKey, ItemCard>> = {};
    for (const k of SLOT_ORDER) {
      const list = bySlot.get(k) ?? [];
      if (list.length) slots[k] = list[i % list.length];
    }
    const tags = Object.values(slots).flatMap((c) => String(c?.tags ?? '').split(',').filter(Boolean));
    const style = tags.includes('正式') ? '正式' : tags.includes('运动') ? '运动' : '日常';
    const parts = SLOT_ORDER.map((k) => slots[k]?.name).filter(Boolean);
    sets.push({ style, reason: style + '场合适配，' + parts.join('配') + '，色系相近好搭', slots });
  }
  return { sets, gap };
}

export function runOutfitPick(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'pick';
  // 穿搭只取前 5 候选做套装；分析类默认看全衣橱（上限 20，与接口约束一致）。
  const limit = params.limit !== undefined ? Number(params.limit) : (kind === 'pick' ? 5 : 20);
  if (!Number.isInteger(limit) || limit <= 0 || limit > 20) fail(2, 'limit 须为 1~20 正整数');
  const rows = clothingRows(handle, limit);
  const cards = rows.map((it) => toItemCard(it, listLocationsByItem(handle, it.id), listTagsByItem(handle, it.id)));
  const base = buildOutfitList(cards, kind);
  if (!cards.length) note('衣橱空：真实无候选（非故障）');

  if (kind === 'wardrobe') return { ...base, wardrobe: buildWardrobe(handle, rows, cards) };
  if (kind === 'season') return { ...base, season: buildSeason(handle, params, rows) };
  if (kind === 'trip-plan') return { ...base, tripPlan: buildTripPlan(handle, params, rows, cards) };
  const occasion = typeof params.occasion === 'string' && OCCASIONS.includes(params.occasion) ? params.occasion : '';
  const weather = typeof params.weather === 'string' ? params.weather.slice(0, 20) : '';
  return { ...base, outfit: { ...pickSets(handle, cards, rows), occasion, weather } };
}

function buildWardrobe(handle: HomeDb, rows: HomeItem[], cards: ItemCard[]): unknown {
  const counts = new Map<string, number>();
  rows.forEach((row, i) => {
    const slot = slotOf(row.name, listTagsByItem(handle, row.id));
    const label = slot ? SLOT_NAMES[slot] : '其他';
    counts.set(label, (counts.get(label) ?? 0) + (cards[i]?.quantity || 1));
  });
  const total = Math.max(1, [...counts.values()].reduce((a, b) => a + b, 0));
  const distribution = [...counts.entries()].map(([label, count]) => ({
    label, count, pct: Math.round((count * 100) / total),
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
        id: it.id, name: it.name, slot: SLOT_NAMES[slotOf(it.name, tags) ?? 'acce'] ?? '衣物',
        daysIdle, lastUsed: it.last_accessed_at ? it.last_accessed_at.slice(0, 10) : '从未使用',
        location: locs[0]?.location ?? '', estimated: it.last_accessed_at === null,
      };
    });
  const scarcest = [...counts.entries()].sort((a, b) => a[1] - b[1])[0];
  const advice = (scarcest ? '衣橱里' + scarcest[0] + '最少（' + scarcest[1] + '件），可优先补充。' : '衣橱暂无可分析衣物，先录入几件。')
    + (dormant.length ? '有' + dormant.length + '件久未穿，先处理再买新衣。' : '件件常穿，继续保持。');
  return {
    distribution, dormant, advice,
    summary: [
      { label: '在穿衣物', value: String(rows.length) },
      { label: '闲置', value: String(dormant.length) },
      { label: '部位最缺', value: scarcest ? scarcest[0] : '待录入' },
    ],
  };
}

function buildSeason(handle: HomeDb, params: Record<string, unknown>, rows: HomeItem[]): unknown {
  const season = typeof params.season === 'string' && SEASONS.includes(params.season) ? params.season : '冬季';
  const action = params.action === '拿出' ? '拿出' : '收纳';
  const items = rows
    .map((it) => ({ it, tags: listTagsByItem(handle, it.id), locs: listLocationsByItem(handle, it.id) }))
    .filter(({ it, tags, locs }) => {
      const home = (locs[0]?.location_status ?? '') === '在家';
      return action === '收纳' ? home && tags.includes(season) : tags.includes('已收纳') && (tags.includes(season) || it.name.includes(season));
    })
    .map(({ it, tags, locs }) => ({
      id: it.id, name: it.name, categoryName: it.category ?? '',
      tags, location: locs[0]?.location ?? '',
    }));
  const places = [...new Set(listLocationNodes(handle).map((p) => String(p).split('/')[0]).filter(Boolean))].slice(0, 12);
  return { season, action, items, places };
}

function buildTripPlan(handle: HomeDb, params: Record<string, unknown>, rows: HomeItem[], cards: ItemCard[]): unknown {
  const days = Number.isInteger(Number(params.days)) ? Math.min(7, Math.max(1, Number(params.days))) : 3;
  const destination = typeof params.destination === 'string' && params.destination.trim()
    ? params.destination.trim().slice(0, 20) : '远行';
  const { sets } = pickSets(handle, cards, rows);
  const base = sets.length ? sets : [{ style: '日常', reason: '衣橱暂无候选，先录入再计划', slots: {} }];
  const plans = Array.from({ length: days }, (_, d) => {
    const set = base[d % base.length];
    return { day: d + 1, tempDesc: '按季节估算', style: set.style, reason: set.reason, slots: set.slots };
  });
  const seen = new Map<number, number[]>();
  plans.forEach((p) => Object.values(p.slots).forEach((c) => {
    if (!c) return;
    seen.set(c.id, [...(seen.get(c.id) ?? []), p.day]);
  }));
  const conflicts = [...seen.entries()]
    .filter(([, ds]) => ds.length > 1)
    .map(([id, ds]) => ({ hint: cards.find((c) => c.id === id)?.name + '在第' + ds.join('天与第') + '天重复' }));
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
