/** 触发位 · **运行期路由**（票 #855）：唤醒词 → 键 → 参数。
 *
 * 只剩逻辑：从生成物 `routes.generated.ts` 的 `WAKE_ROUTES` 里按**最长匹配**找词、
 * 校验缺槽位、合并 `preset` 与调用方给的槽位值。语义与旧 `policy/wakewords.ts` 逐字一致：
 * 空串按缺槽位计、两类错（`POLICY_NO_MATCH`／`POLICY_MISSING_SLOT`）与报文格式都不变
 * （差分回归见 `.scratch/t855/diff-routes.mjs`：旧表 31 词逐条同结果）。
 *
 * 加／删唤醒词改的是各域 `routes.ts`，别改本件——本件不在生成器 targets 里，
 * 改它 `pnpm gen:check` 不报红（兜住它的只有路由测试与差分回归）。
 */
import { currentRenderLanguage } from 'base-entries';
import { MemoPolicyError } from '../shared/errors.js';
import type { MemoKey } from '../cli/keys.js';
import { WAKE_ROUTES } from './routes.generated.js';
import { WAKE_EN_ROUTES } from './routes.en.generated.js';
import type { WakeRoute } from './routeSpec.js';

export interface ResolvedRoute {
  readonly key: MemoKey;
  readonly params: Record<string, unknown>;
}

/** 最长匹配优先（与旧实现同序规则；同长并列的胜出者由 `order` 升序决定——旧表是建表序，新表是声明序，
 *  差分回归覆盖全部已测输入，并列歧义输入不在任一测试与探针的语料里）。 */
const SORTED: readonly WakeRoute[] = [...WAKE_ROUTES].sort((a, b) => b.wakeWord.length - a.wakeWord.length);

/** 英文唤醒词表（票 #1310）：来源 `wake-en.json`，键／场景／CLI／槽位／预设照抄中文那条。 */
const WAKE_ROUTES_EN: readonly WakeRoute[] = WAKE_EN_ROUTES.map((e) => ({
  wakeWord: e.wakeWord,
  scene: e.scene ?? '',
  key: e.key as MemoKey,
  cli: e.cli ?? '',
  ...(e.needs === undefined ? {} : { needs: [...e.needs] }),
  ...(e.preset === undefined ? {} : { preset: { ...e.preset } }),
}));

/** 英文表同一条最长匹配规则（两张表各自排序，不同时参与匹配）。 */
const SORTED_EN: readonly WakeRoute[] = [...WAKE_ROUTES_EN].sort((a, b) => b.wakeWord.length - a.wakeWord.length);

/** 渲染语言的主标签（`en`／`zh`；`en-US` 按 `en` 算）。 */
function renderLanguage(): string {
  return currentRenderLanguage().trim().toLowerCase().split('-')[0];
}

/** 按语言单选一张表：en 只查英文表，其余（含未设语言）只查中文表。 */
function sortedFor(): readonly WakeRoute[] {
  return renderLanguage() === 'en' ? SORTED_EN : SORTED;
}

export function routeWakeword(text: string, ctx: Record<string, unknown> = {}): ResolvedRoute {
  if (typeof text !== 'string' || text.length === 0) throw new MemoPolicyError('POLICY_NO_MATCH', '唤醒词为空');
  const hit = sortedFor().find((e) => text.includes(e.wakeWord));
  if (!hit) throw new MemoPolicyError('POLICY_NO_MATCH', '无命中唤醒词：' + text);
  for (const s of hit.needs ?? []) {
    if (ctx[s] === undefined || ctx[s] === null || ctx[s] === '') {
      throw new MemoPolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + s + '：' + hit.wakeWord);
    }
  }
  return { key: hit.key, params: { ...(hit.preset ?? {}), ...pickCtx(ctx, hit.needs ?? []) } };
}

function pickCtx(ctx: Record<string, unknown>, needs: readonly string[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of needs) o[k] = ctx[k];
  return o;
}
