// 口径层·唤醒词路由：自然语言 → 8 联动 key；最长匹配；废弃词（同步作息/作息计划表等）无命中。
// `WAKE_TABLE` 是生成物 `src/triggers/routes.generated.ts` 的派生（纪律形状二，#780 Layer2 退役手表），
// 唯一定义地＝各能力 `routes.ts`；HELP 速查唯一上游仍是本件导出（`help/lookup.ts` 零改动）。
import { currentRenderLanguage } from 'base-entries';
import { SCHEDULE_ROUTES } from '../triggers/routes.generated.js';
import { WAKE_EN_ROUTES } from '../triggers/routes.en.generated.js';
import { SchedulePolicyError } from '../fetch/errors.js';

export type ScheduleKey =
  | 'schedule.record.today' | 'schedule.record.range' | 'schedule.record.detail'
  | 'schedule.record.write' | 'schedule.record.compare'
  | 'schedule.plan.today' | 'schedule.plan.write'
  | 'schedule.help.lookup';

export interface WakeRoute { key: ScheduleKey; params: Record<string, unknown>; }
export interface WakeEntry { phrase: string; key: ScheduleKey; needs?: string[]; preset?: Record<string, unknown>; }

export const WAKE_TABLE: WakeEntry[] = SCHEDULE_ROUTES.map((e) => ({
  phrase: e.phrase,
  key: e.key as ScheduleKey,
  ...(('needs' in e) === false ? {} : { needs: [...e.needs] }),
  ...(('preset' in e) === false ? {} : { preset: { ...e.preset } }),
}));

/** 英文唤醒词表（票 #1310）：来源 `wake-en.json`，键／槽位／预设照抄中文那条（生成期已校验）。 */
const WAKE_TABLE_EN: WakeEntry[] = WAKE_EN_ROUTES.map((e) => ({
  phrase: e.phrase,
  key: e.key as ScheduleKey,
  ...(('needs' in e) === false || e.needs === undefined ? {} : { needs: [...e.needs] }),
  ...(('preset' in e) === false || e.preset === undefined ? {} : { preset: { ...e.preset } }),
}));

// 最长匹配优先（“查作息时间轴”不落入“查作息”，“复盘今日”不落入“复盘”）。
const SORTED = [...WAKE_TABLE].sort((a, b) => b.phrase.length - a.phrase.length);

/** 英文表同一条最长匹配规则（两张表各自排序，不同时参与匹配）。 */
const SORTED_EN = [...WAKE_TABLE_EN].sort((a, b) => b.phrase.length - a.phrase.length);

/** 渲染语言的主标签（`en`／`zh`；`en-US` 按 `en` 算）。 */
function renderLanguage(): string {
  return currentRenderLanguage().trim().toLowerCase().split('-')[0];
}

/** 按语言单选一张表：en 只查英文表，其余（含未设语言）只查中文表。 */
function sortedFor(): readonly WakeEntry[] {
  return renderLanguage() === 'en' ? SORTED_EN : SORTED;
}

export function routeWakeword(text: string, ctx: Record<string, unknown> = {}): WakeRoute {
  if (typeof text !== 'string' || text.length === 0) {
    throw new SchedulePolicyError('POLICY_NO_MATCH', '唤醒词为空');
  }
  const hit = sortedFor().find((e) => text.includes(e.phrase));
  if (!hit) {
    throw new SchedulePolicyError(
      'POLICY_NO_MATCH',
      '无命中唤醒词：' + text + '（废弃词如同步作息/作息计划表不再路由；定时任务/早睡提醒等出 scope，以外置为准，HELP q 为空看全表）',
    );
  }
  for (const s of hit.needs || []) {
    if (ctx[s] === undefined || ctx[s] === null || ctx[s] === '') {
      throw new SchedulePolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + s + '：' + hit.phrase);
    }
  }
  return { key: hit.key, params: { ...(hit.preset || {}), ...pickCtx(ctx, hit.needs || []) } };
}

function pickCtx(ctx: Record<string, unknown>, needs: string[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of needs) o[k] = ctx[k];
  return o;
}
