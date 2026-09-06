// HELP 速查：WAKE_TABLE 唯一上游；短语→key/cli/一句话。构建期注入 SKILL.md（scripts/build-help.mjs）。
import { WAKE_TABLE, type HomeKey } from '../policy/index.js';
import { HOME_KEY_SHAPES } from '../render/index.js';

export interface HelpHit { phrase: string; key: HomeKey; shape: string; cli: string; desc: string; }

function exampleParams(e: { key: HomeKey; needs?: string[]; preset?: Record<string, unknown> }): string {
  const p: Record<string, unknown> = { ...(e.preset || {}) };
  for (const n of e.needs || []) {
    if (p[n] === undefined) {
      p[n] = n === 'id' ? 1 : n === 'from' ? '旧' : n === 'to' ? '新' : '<值>';
    }
  }
  const keys = Object.keys(p);
  return keys.length ? ' --params \'' + JSON.stringify(p) + '\'' : '';
}

const DESCS: Record<string, string> = {
  'home.item.search': '搜物品（名称/位置/标签/分类，紧急定位/筛选/图搜/查重复）',
  'home.item.detail': '看单品详情（含历史/照片/照片墙 view 分流，须 id）',
  'home.item.add': '录物品 op=single/batch/backfill（含拍物品一次写入）',
  'home.item.update': '改物品 op=generic/move/qty/status/tags/merge/undo/relate/photo（须 id）',
  'home.tag.query': '看标签（标签总览 + 分类树）',
  'home.tag.write': '管标签/管分类/合标签/整理建议 op 分流',
  'home.inventory.round': '盘点核对 op=round/resolve/move（按位置/分类/全屋）',
  'home.inventory.records': '盘点记录（复查入口）',
  'home.location.query': '位置查 mode=manage/space/suggest/find/storage',
  'home.location.write': '位置改 op=manage/fixed（含固定位锚定）',
  'home.outfit.pick': '穿搭推荐 kind=pick/wardrobe/season/trip-plan',
  'home.trip.manage': '出行清单 mode=pack/return（旅游中↔在家）',
  'home.stats.overview': '总体统计 kind=summary/inventory（状态/分类/价值/高频 TOP）',
  'home.stats.alert': '闲置/过期 kind=idle/expiring',
  'home.shopping.query': '购物查 kind=list/missing/stock/express',
  'home.shopping.write': '购物改 op=list-add/list-check/missing-to-list/stock-threshold/stock-fix/express-confirm',
  'home.ticket.query': '票据查 kind=purchase/warranty/cert/account',
  'home.ticket.write': '票据改 kind+op（购买/保修/证件/账号，账号须 master-key）',
  'home.care.query': '协作查 kind=borrow/member/firstuse-status/lint/backup-list',
  'home.care.write': '协作改 kind=init/backup/export/import/borrow/member（幂等可重试）',
  'home.help.lookup': 'HELP 现找（q 可空，不过滤即全表）',
};

// 全量速查表（WAKE_TABLE 有几条就有几行）。
export function buildHelpLookup(): HelpHit[] {
  return WAKE_TABLE.map((e) => ({
    phrase: e.phrase,
    key: e.key,
    shape: HOME_KEY_SHAPES[e.key] || '??',
    cli: 'home-cmd-read ' + e.key + exampleParams(e),
    desc: DESCS[e.key] || '',
  }));
}

export function lookupHelp(hits: HelpHit[], word: string): HelpHit[] {
  if (!word || !word.trim()) return hits;
  return hits.filter((h) => word.includes(h.phrase) || h.phrase.includes(word.trim()));
}
