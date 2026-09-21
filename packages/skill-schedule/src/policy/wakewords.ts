// 口径层·唤醒词路由：自然语言 → 8 联动 key；最长匹配；废弃词（同步作息/作息计划表等）无命中。
// `WAKE_TABLE` 是生成物 `src/triggers/routes.generated.ts` 的派生（纪律形状二，#780 Layer2 退役手表），
// 唯一定义地＝各能力 `routes.ts`；HELP 速查唯一上游仍是本件导出（`help/lookup.ts` 零改动）。
import { SCHEDULE_ROUTES } from '../triggers/routes.generated.js';
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

// 最长匹配优先（“查作息时间轴”不落入“查作息”，“复盘今日”不落入“复盘”）。
const SORTED = [...WAKE_TABLE].sort((a, b) => b.phrase.length - a.phrase.length);

export function routeWakeword(text: string, ctx: Record<string, unknown> = {}): WakeRoute {
  if (typeof text !== 'string' || text.length === 0) {
    throw new SchedulePolicyError('POLICY_NO_MATCH', '唤醒词为空');
  }
  const hit = SORTED.find((e) => text.includes(e.phrase));
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
