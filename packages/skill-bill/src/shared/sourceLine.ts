/** 来源脚注（技能层共用件）：结果型每张页**恒出**的一句
 *  「数据来源 · <来源> · 起 → 止 · 共 N 条」。
 *
 * 出处：`docs/skills/skill-bill/688-融合基准.md` §四 裁定 2（结果型页恒出三条之一：
 *  页内导航 ＋ 口径说明行 ＋ 来源脚注）与 §八 A5（**新建共用位件**，落第一张用它的页面票；
 *  形状照卡路里 `packages/skill-calorie/src/shared/sourceLine.ts:24`）。本件即 §八 A5 那一行。
 *
 * 老侧反面**不照抄**（裁定 1）：老页脚把源脚本路径印成字面（`query_view.html:217` 恒印
 *  `scripts/record_bill.py {type} --json`，`分析/analysis_view.html:254` 恒印 `scripts/analysis/cli.py`），
 *  既与实际分域路由对不上（缺陷 D6／D16），对用户也无意义——所以来源那一段写**人话**，
 *  由调用方给（本件不认库名、不认命令名，不把内部标识符带上屏）。
 *
 * 版面：走公共层 #420 的口径说明行 `renderCaliberLine`（`ilife-block-caliber`，12px `--fg2`）；
 *  本件不写色、不写字号、不写断点——版面单源住 `packages/base-render/`（裁定 7）。
 *
 * 分工：本件是**纯排版**，不做校验、不查库、不算窗口。三分不符即算不清：条数由取数处给、
 *  窗口由参数解析处给、来源那句话由调用方按域给（照本包 `shared/` 既有件的分工：装配件不校验）。
 */
import { renderCaliberLine } from 'base-paint/blocks';

/** 来源脚注的三个事实（全部由调用方算好；空串来源＝不写来源那一段）。 */
export interface SourceLineFacts {
  /** 人话来源（如「记账库（只读）」）；空串＝这一页不报来源，只印窗口与条数。 */
  readonly source: string;
  /** 窗口起点（日期或「不限」）。 */
  readonly start: string;
  /** 窗口终点（日期或「不限」）。 */
  readonly end: string;
  /** 本窗条数（非负整数）。 */
  readonly count: number;
}

/** 来源脚注：`数据来源 · 来源 · 起 → 止 · 共 N 条`。 */
export function sourceLine(facts: SourceLineFacts): string {
  const parts: string[] = ['数据来源'];
  if (facts.source.trim() !== '') parts.push(facts.source);
  parts.push(facts.start + ' → ' + facts.end);
  parts.push('共 ' + String(facts.count) + ' 条');
  return renderCaliberLine(parts.join(' · '));
}
