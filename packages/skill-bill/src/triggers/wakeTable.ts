// #721 · 唤醒词表的**汇总件**（触发与路由的机器面）：8 份域声明 → 词表 ＋ 路由 ＋ 三个投影。
//
// 一条唤醒词的事实（怎么说／路由到哪条命令／说完看到哪张卡）只住它所属那份域声明
// （`src/<域>/declaration.ts` ×7 ＋ `src/help/declaration.ts`）；本件是那些声明的**唯一汇总位**：
//   · `WAKE_TABLE`——77 条词序＝各声明按 `order` 拼接的顺序（与今天逐条同序）；
//   · `routeWakeword`——最长匹配优先；无命中/缺槽位 throw（逻辑逐字照旧，只换了上游）；
//   · `projectWakeWord`／`wakeWordOfKind`——「算得出来的不许写」那一半：页面标题、类型徽章、
//     落点表的场景词都由声明算回，别处不再写第二处字面量（判据见 `test/t721-判据与摘要锁.test.mjs`）。
//
// 谁在用（指名）：`src/policy/wakewords.ts`（薄转出，保消费方零改）· `src/help/lookup.ts` ·
//   `src/help/writeWire.ts` · `src/shared/userWording.ts` · `src/shared/collectFrame.ts` ·
//   `src/record/receiptBody.ts` · `src/query/read.ts`。
//
// 域序 fail-closed：8 份声明的 `order` 必须是连续的 0..n-1，缺号／重号即抛（不用中央名单、
// 也不用目录扫描——扫描出的是字母序，与实物的域序七处全不同）。
import { BillPolicyError } from '../fetch/errors.js';
import { ACCOUNT_DECLARATION } from '../account/declaration.js';
import { ANALYSIS_DECLARATION } from '../analysis/declaration.js';
import { GOAL_DECLARATION } from '../goal/declaration.js';
import { HELP_DECLARATION } from '../help/declaration.js';
import { LINK_DECLARATION } from '../link/declaration.js';
import { QUERY_DECLARATION } from '../query/declaration.js';
import { SETUP_DECLARATION } from '../setup/declaration.js';
import { WRITE_DECLARATION } from '../record/declaration.js';
import type { BillKey, DomainDeclaration, WakeEntry, WakeEntryDecl, WakeRoute, WakeScope } from './routeSpec.js';

/** 8 份域声明（每份一件，恰好一个导出）。**声明的清单只有这一处**——目录投影件也从这里取。 */
export const DECLARATIONS: readonly DomainDeclaration[] = [
  HELP_DECLARATION, WRITE_DECLARATION, QUERY_DECLARATION, ANALYSIS_DECLARATION,
  GOAL_DECLARATION, ACCOUNT_DECLARATION, LINK_DECLARATION, SETUP_DECLARATION,
];

/** 按 `order` 排好；缺号／重号即抛（域序是事实，不许靠猜）。 */
function ordered(decls: readonly DomainDeclaration[]): readonly DomainDeclaration[] {
  const sorted = [...decls].sort((a, b) => a.order - b.order);
  const seen = new Set<number>();
  for (const d of sorted) {
    if (!Number.isInteger(d.order) || d.order < 0) throw new Error('[wakeTable] 域声明的 order 不是非负整数：' + d.id + '=' + String(d.order));
    if (seen.has(d.order)) throw new Error('[wakeTable] 域声明的 order 重号：' + d.id + '=' + String(d.order));
    seen.add(d.order);
  }
  for (let i = 0; i < sorted.length; i += 1) {
    if (!seen.has(i)) throw new Error('[wakeTable] 域声明的 order 缺号：没有 ' + String(i) + '（现有 ' + sorted.map((d) => String(d.order)).join('、') + '）');
  }
  return sorted;
}

const ORDERED = ordered(DECLARATIONS);

/** 词条（去掉场景那半；词表消费方读到的形状与今天逐字段相同）。 */
function asEntry(e: WakeEntryDecl): WakeEntry {
  const out: { phrase: string; key: BillKey; preset?: Readonly<Record<string, unknown>>; needs?: readonly string[]; carries?: readonly string[] } = { phrase: e.phrase, key: e.key };
  if (e.preset !== undefined) out.preset = e.preset;
  if (e.needs !== undefined) out.needs = e.needs;
  if (e.carries !== undefined) out.carries = e.carries;
  return out;
}

/** 全量唤醒词表（77 条；HELP 位那 4 条在前，域序照域声明自带的 `order`，词序照声明里 `entries` 的书写顺序）。 */
export const WAKE_TABLE: readonly WakeEntry[] = ORDERED.flatMap((d) => d.entries.map(asEntry));

/** 全部词条（含场景归属），按同一顺序摊平——投影只读它。 */
const ALL_ENTRIES: readonly WakeEntryDecl[] = ORDERED.flatMap((d) => d.entries);

/** 型名 → 词条（`preset.kind` 认得的那些）：**书写顺序先到者胜**。
 *  为什么不是「型名唯一」：`reimburse`／`installment` 在写入域是型名、在查询域是过滤条件（同名不同物），
 *  而写入域的词条排在查询域之前（`order` 1 < 2），先到者胜即写入域那一条——类型徽章要的正是它。 */
const BY_KIND = new Map<string, WakeEntryDecl>();
for (const e of ALL_ENTRIES) {
  const k = e.preset === undefined ? undefined : e.preset['kind'];
  if (typeof k === 'string' && k !== '' && !BY_KIND.has(k)) BY_KIND.set(k, e);
}

/** 最长匹配优先（“看分类对比”不落入“看分类”，“初始化状态”不落入“初始化”，“报销到账”不落入“记报销”）。 */
const SORTED = [...WAKE_TABLE].sort((a, b) => b.phrase.length - a.phrase.length);

/** 自然语言 → 命令名 ＋ 槽位；无命中／缺槽位即抛。 */
export function routeWakeword(text: string, ctx: Record<string, unknown> = {}): WakeRoute {
  if (typeof text !== 'string' || text.length === 0) throw new BillPolicyError('POLICY_NO_MATCH', '唤醒词为空');
  const hit = SORTED.find((e) => text.includes(e.phrase));
  if (!hit) throw new BillPolicyError('POLICY_NO_MATCH', '无命中唤醒词：' + text);
  for (const s of hit.needs || []) {
    if (ctx[s] === undefined || ctx[s] === null || ctx[s] === '') {
      throw new BillPolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + s + '：' + hit.phrase);
    }
  }
  return { key: hit.key, params: { ...(hit.preset || {}), ...pickCtx(ctx, [...(hit.needs || []), ...(hit.carries || [])]) } };
}

function pickCtx(ctx: Record<string, unknown>, names: string[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of names) if (ctx[k] !== undefined) o[k] = ctx[k];
  return o;
}

/** 给一条命令算它那些词里「用户只说命令名」的那一条（**代表唤醒词**）。
 *
 * 规则：同 `key` 下**第一条不带 `preset` 的词条**（＝通用词：`记一笔`／`改记录`／`查今天`／`查区间`／
 *  `搜备注`／`查账单详情`——六条迁移过的命令逐条复现今天的代表词）；该 `key` 每条词都带 `preset` 时
 *  退回第一条词条；**一条词都没有即抛**（US 15：某条命令若一条词都算不出来，当场报「用户到不了它」，
 *  不是静默给一张空卡）。 */
export function projectWakeWord(scope: WakeScope): string {
  const pool = scope.key === undefined ? ALL_ENTRIES : ALL_ENTRIES.filter((e) => e.key === scope.key);
  if (pool.length === 0) {
    throw new BillPolicyError('POLICY_NO_MATCH', '这条命令一条唤醒词都没有（用户到不了它）：' + String(scope.key));
  }
  const clues: Record<string, unknown> = { ...(scope.preset ?? {}) };
  if (scope.kind !== undefined && scope.kind !== '') clues['kind'] = scope.kind;
  if (scope.op !== undefined && scope.op !== '') clues['op'] = scope.op;
  if (Object.keys(clues).length > 0) {
    // ① preset 命中（最具体者胜）：页面标题那一支＋型名／操作名那一支，走的是同一张 `preset`。
    const byPreset = pool
      .filter((e) => e.preset !== undefined && Object.entries(e.preset).every(([k, v]) => clues[k] === v))
      .sort((a, b) => Object.keys(b.preset ?? {}).length - Object.keys(a.preset ?? {}).length);
    if (byPreset.length > 0) return byPreset[0].phrase;
    // ② needs 命中：`查某天`（要 date）／`查区间`（要 start＋end）／`查分类`… 这类词靠必需槽位认。
    const byNeeds = pool.filter((e) => e.needs !== undefined
      && e.needs.every((n) => clues[n] !== undefined && clues[n] !== null && clues[n] !== ''));
    if (byNeeds.length > 0) return byNeeds[0].phrase;
  }
  // ③ 通用词（第一条不带 preset 的词条）；都没有就第一条。
  const generic = pool.find((e) => e.preset === undefined);
  return (generic ?? pool[0]).phrase;
}

/** 内部型名 → 唤醒词（类型徽章与回执页标题那一支）：认得的型名按 `preset.kind` 算，
 *  **认不得的型名与空串都给写入域的通用词**（`记一笔`）——与 `src/record/scene.ts` 的兜底同口径。 */
export function wakeWordOfKind(kind: string): string {
  const k = typeof kind === 'string' ? kind.trim() : '';
  const hit = k === '' ? undefined : BY_KIND.get(k);
  return hit !== undefined ? hit.phrase : projectWakeWord({ key: 'bill.record.add' });
}
