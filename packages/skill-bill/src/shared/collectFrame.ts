/** 采集页通用架形状件（只加形状，不改行为口径）。
 *
 * 谁在用（指名，多处）：
 *   ① `src/record/collectBody.ts`——通用采集页（记支出走本件）；
 *   ② `src/record/scene-*.ts` 的 16 件场景件采集分支——各件在 `typeBadge` 之后调本件。
 * 共用理由：16 页同一套架子只写一遍，别处引用；行为判定（`blockedItems`／`findDuplicates`／信封）
 * 一处不动，本件只读唤醒词与缺项数做展示。
 *
 * 只许加的五种形状（派单原话）：
 *   分段标题／徽章／缺项标签／进度／按钮层级。各一函数，对外五个，不多给。
 * 文案纪律：纯中文加数字，不含 `·`／`|`／英文标识（机审版式位与区外内部话两列保持零命中）；
 * 每句带唤醒词或段号，页内不重句。
 */
import { renderCaliberLine, renderChips, renderConclusionBar } from 'base-paint/blocks';

/** 架头：分段标题兼徽章——这一页是采集通用架，哪条词补齐中。 */
export function collectFrameHead(input: { readonly wakeWord: string }): string {
  const word = input.wakeWord.trim() === '' ? '记一笔' : input.wakeWord.trim();
  return renderConclusionBar('采集通用架 ' + word + '补齐中')
    + renderChips({ items: [{ text: '采集页' }, { text: word }] });
}

/** 进度：还差几项，补齐就能记（只读数，不判定）。 */
export function collectProgress(input: { readonly wakeWord: string; readonly missing: number }): string {
  const word = input.wakeWord.trim() === '' ? '记一笔' : input.wakeWord.trim();
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

/** 按钮层级说明：先补齐再复制，复制区分数据与日志（只说明，不改按钮）。 */
export function collectButtonHint(input: { readonly wakeWord: string }): string {
  const word = input.wakeWord.trim() === '' ? '记一笔' : input.wakeWord.trim();
  return renderCaliberLine(word + '按钮分两层，先补齐再复制，复制区分数据与日志');
}
