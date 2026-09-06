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

export function buildSearchList(cards: ItemCard[]): { items: ItemCard[]; total: number } {
  return { items: cards, total: cards.length };
}

export function buildDetail(card: ItemCard, extra?: Record<string, unknown>): { item: Record<string, unknown> } {
  return { item: { ...card, ...(extra ?? {}) } as Record<string, unknown> };
}

export function buildReceipt(message: string): { ok: boolean; message: string } {
  return { ok: true, message };
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

export function buildTicketList(items: Record<string, unknown>[]): { items: Record<string, unknown>[]; total: number } {
  return { items, total: items.length };
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
