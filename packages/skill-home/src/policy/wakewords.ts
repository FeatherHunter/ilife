// 口径层·唤醒词路由：自然语言 → 21 联动 key；最长匹配；联动 3 词废弃不路由。
// HELP 速查唯一上游；改这里，HELP 构建期跟进。
// #800 起路由记录面住派生件 `routes.generated.ts`（各能力 `routes.ts` 声明组装），
// 本文件只做运行期适配（类型收窄＋最长匹配），不再手写词表：加词改它那个能力的
// `routes.ts`，跑 `pnpm gen` 重生成。
import { ROUTES_GENERATED } from './routes.generated.js';
import { HomePolicyError } from '../fetch/errors.js';

export type HomeKey =
  | 'home.item.search' | 'home.item.detail' | 'home.item.add' | 'home.item.update'
  | 'home.tag.query' | 'home.tag.write'
  | 'home.inventory.round' | 'home.inventory.records'
  | 'home.location.query' | 'home.location.write'
  | 'home.outfit.pick' | 'home.trip.manage'
  | 'home.stats.overview' | 'home.stats.alert'
  | 'home.shopping.query' | 'home.shopping.write'
  | 'home.ticket.query' | 'home.ticket.write'
  | 'home.care.query' | 'home.care.write'
  | 'home.help.lookup';

export interface WakeRoute { key: HomeKey; params: Record<string, unknown>; }
export interface WakeEntry { phrase: string; key: HomeKey; needs?: string[]; preset?: Record<string, unknown>; }

/** 运行期路由表（派生件的运行期形态；词增删走能力声明＋`pnpm gen`）。 */
export const WAKE_TABLE: WakeEntry[] = ROUTES_GENERATED.map((e) => ({
  phrase: e.phrase,
  key: e.key as HomeKey,
  needs: e.needs ? [...e.needs] : undefined,
  preset: e.preset ? { ...e.preset } : undefined,
}));

// 废弃词（SM9 外联动 3 词，本技能不路由；combos 登记走后续票）。
export const DEPRECATED_PHRASES = ['联动总览', '记到卡路里', '记到记账'];

const SORTED = [...WAKE_TABLE].sort((a, b) => b.phrase.length - a.phrase.length);

export function routeWakeword(text: string, ctx: Record<string, unknown> = {}): WakeRoute {
  if (typeof text !== 'string' || text.length === 0) throw new HomePolicyError('POLICY_NO_MATCH', '唤醒词为空');
  const hit = SORTED.find((e) => text.includes(e.phrase));
  if (!hit) {
    throw new HomePolicyError('POLICY_NO_MATCH', '无命中唤醒词：' + text + '（联动 3 词走后续票）');
  }
  for (const s of hit.needs || []) {
    if (ctx[s] === undefined || ctx[s] === null || ctx[s] === '') {
      throw new HomePolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + s + '：' + hit.phrase);
    }
  }
  return { key: hit.key, params: { ...(hit.preset || {}), ...pickCtx(ctx, hit.needs || []) } };
}

function pickCtx(ctx: Record<string, unknown>, needs: string[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of needs) o[k] = ctx[k];
  return o;
}
