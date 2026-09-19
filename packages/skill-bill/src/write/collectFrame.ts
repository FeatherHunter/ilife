/** 采集页通用架形状件（只加形状，不改行为口径）。
 *
 * 谁在用（指名，多处）：
 *   ① `src/write/collectBody.ts`——通用采集页（记支出走本件）；
 *   ② `src/write/scene-*.ts` 的 16 件场景件采集分支——各件在 `typeBadge` 之后调本件。
 * 共用理由：16 页同一套架子只写一遍，别处引用；行为判定（`blockedItems`／`findDuplicates`／信封）
 * 一处不动，本件只读唤醒词与缺项数做展示。
 *
 * 只许加的三种形状（t410 终审后收口为三）：
 *   缺项标签／进度／分段标题。各一函数，对外三个，不多给。
 * 文案纪律：纯中文加数字，不含 `·`／`|`／英文标识（机审版式位与区外内部话两列保持零命中）；
 * 每句带唤醒词或段号，页内不重句。
 */
import { renderCaliberLine, renderChips, renderConclusionBar } from 'base-paint/blocks';
import { wakeWordOfKind } from '../triggers/wakeTable.js';

/** 进度：还差几项，补齐就能记（只读数，不判定）。
 *  空唤醒词＝调用方没有这一条事实，退回**写入域的通用词**（从域声明算，不在本件写字面量）。 */
export function collectProgress(input: { readonly wakeWord: string; readonly missing: number }): string {
  const word = input.wakeWord.trim() === '' ? wakeWordOfKind('') : input.wakeWord.trim();
  const n = Number.isFinite(input.missing) && input.missing > 0 ? Math.floor(input.missing) : 0;
  return renderCaliberLine(word + '还差 ' + n + ' 项，补齐就能记');
}

/** 缺项标签：缺的格逐枚成标签（空即不出块）。 */
export function collectMissingTags(input: { readonly labels: readonly string[] }): string {
  const items = input.labels.map((s) => s.trim()).filter((s) => s !== '');
  if (items.length === 0) return '';
  return renderChips({ items: items.map((text) => ({ text })) });
}

/** 分段标题：第几段加一句中文标题（黑块前后分段用）。 */
export function collectSectionTitle(input: { readonly no: number; readonly title: string }): string {
  const no = Number.isFinite(input.no) && input.no > 0 ? Math.floor(input.no) : 1;
  const title = input.title.trim() === '' ? '继续往下看' : input.title.trim();
  return renderConclusionBar('第 ' + no + ' 段 ' + title);
}
