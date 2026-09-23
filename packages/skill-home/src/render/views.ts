// 渲染层·视图数据装配：DB 行 → 21 key 的 envelope data（全字段，不返空冒充由调用方缺失阻断）。
import type { HomeItem, HomeLocation } from '../fetch/db.js';

export interface ItemCard {
  id: number; name: string; location: string; quantity: number;
  status: string; category: string; tags: string;
}

export function toItemCard(item: HomeItem, locations: HomeLocation[], tags: string[]): ItemCard {
  const first = locations[0];
  const qty = locations.reduce((a, l) => a + (l.quantity || 0), 0);
  return {
    id: item.id, name: item.name,
    location: locations.map((l) => l.location + '×' + l.quantity + '[' + l.location_status + ']').join('；') || '(无位置)',
    quantity: qty, status: first?.location_status ?? '',
    category: item.category ?? '', tags: tags.join(','),
  };
}

/** `toItemCard` 那个复合串的逆：`客厅/阳台柜×1[在家]` → `客厅/阳台柜`。
 *
 *  为什么跟 `toItemCard` 住一个文件：复合串的格式只由上面那一个 `map` 定义（`位置×件数[状态]`，
 *  多位置用 `；` 连），它的解析规则只有跟定义住一起才不会走散（铁律二）。
 *
 *  为什么需要它：页面把「位置／数量／状态」当三个独立字段位渲染时（#890 seq 22 查看照片、
 *  seq 7 紧急定位的置顶与其余候选），直接印复合串会让同一个值位同时带 `/`、`×`、`[]` 三套符号，
 *  且件数与状态跟旁边的独立字段位说两遍。本函数只吃 `toItemCard` 产出的形状——位置路径里
 *  不含 `×` 与 `[]`，故按段剥；`(无位置)` 这类没有复合尾巴的原样返回。 */
export function locationPath(location: string): string {
  return String(location ?? '')
    .split('；')
    .map((seg) => seg.replace(/\s*×\s*\d+\s*/g, '').replace(/\[[^\]]*\]/g, '').trim())
    .filter((seg) => seg !== '')
    .join('；');
}

export function buildSearchList(cards: ItemCard[]): { items: ItemCard[]; total: number } {
  return { items: cards, total: cards.length };
}

export function buildDetail(card: ItemCard, extra?: Record<string, unknown>): { item: Record<string, unknown> } {
  return { item: { ...card, ...(extra ?? {}) } as Record<string, unknown> };
}

/** 写库回执（#890 起可带「本次写入字段」）：`message` 仍是那一句人话（对话里读的就是它）；
 *  `fields` 是本次真写进去的字段逐行（键名与值都由命令层给中文，页面与渲染层不翻译英文键）。
 *  不给 `fields` 时载荷形状与本改动之前逐字节同形——旧调用方不受影响。 */
export function buildReceipt(message: string, fields?: readonly { readonly k: string; readonly v: string }[]): { ok: boolean; message: string; detail?: { fields: readonly { readonly k: string; readonly v: string }[] } } {
  return fields === undefined || fields.length === 0
    ? { ok: true, message }
    : { ok: true, message, detail: { fields } };
}

export function buildTagList(tags: { tag: string; count: number }[], categories?: { id: number; name: string }[]): { items: unknown[]; total: number } {
  const items: unknown[] = tags.map((t) => ({ name: t.tag, count: t.count }));
  if (categories) for (const c of categories) items.push({ name: '分类:' + c.name, count: c.id });
  return { items, total: items.length };
}

export function buildInventoryRecords(rows: { id: number; scope: string; total: number }[]): { items: unknown[]; total: number } {
  return { items: rows.map((r) => ({ name: '盘点#' + r.id + ' ' + r.scope, count: r.total })), total: rows.length };
}

export function buildLocationList(paths: string[]): { items: unknown[]; total: number } {
  return { items: paths.map((p) => ({ name: p })), total: paths.length };
}

export function buildOutfitList(cards: ItemCard[], note: string): { items: ItemCard[]; total: number; note?: string } {
  void note;
  return { items: cards, total: cards.length };
}

export function buildStatsOverview(metrics: Record<string, number>): { metrics: Record<string, number> } {
  return { metrics };
}

export function buildStatsAlert(items: ItemCard[]): { items: ItemCard[]; total: number } {
  return { items, total: items.length };
}

export function buildShoppingList(items: { name: string; quantity?: number }[]): { items: unknown[]; total: number } {
  return { items, total: items.length };
}

/** 清单载荷（#890 起可带「本次查询条件」）：`extra` 里的键原样并到 `data` 上，页面据此回显
 *  「这一次查的是谁」（查退货窗口这类按物品查、又可能 0 命中的场景）。不给即与改动前同形。 */
export function buildTicketList(items: Record<string, unknown>[], extra?: Record<string, unknown>): { items: Record<string, unknown>[]; total: number } & Record<string, unknown> {
  return { ...(extra ?? {}), items, total: items.length };
}

export function buildCareList(items: Record<string, unknown>[]): { items: Record<string, unknown>[]; total: number } {
  return { items, total: items.length };
}

// HELP 现找：list（短语→key/cli/一句话，构建期快照进 SKILL.md，运行时按需过滤）。
export interface HelpItem { phrase: string; key: string; shape: string; cli: string; desc: string; }

export function buildHelpItems(all: HelpItem[], q?: string): { items: HelpItem[]; total: number } {
  const items = !q || !q.trim() ? all : all.filter((h) => q.includes(h.phrase) || h.phrase.includes(q.trim()));
  return { items, total: items.length };
}
