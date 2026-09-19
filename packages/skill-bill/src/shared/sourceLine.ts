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

/** 并列段之间那条分隔：**公共层的并列分隔符**（`base-paint` 的 `renderCaliberLine` 认的就是它）。
 *  本件给的是「这句脚注有几段并列」，怎么把并列画出来由公共层定——页侧一个分隔符字符都不写。 */
const SEG = '｜';

/** 窗口那一格：起止同值时只说一次（本域回执记的是**一笔**，不是一段）。
 *  「不限」那两端（没给窗口）改说人话，不再印 `— → —`（改前空窗口页逐页印这串）。 */
function windowText(start: string, end: string): string {
  const s = start.trim();
  const e = end.trim();
  const blank = (v: string): boolean => v === '' || v === '—' || v === '-';
  if (blank(s) && blank(e)) return '时间不限';
  if (blank(e)) return '从 ' + s + ' 起';
  if (blank(s)) return '到 ' + e + ' 止';
  return s === e ? '时间 ' + s : '时间 ' + s + ' 到 ' + e;
}

/** 来源脚注：`数据来源 <来源> ｜ <窗口> ｜ 共 N 条`（分隔由版式出，字符不进可见文本）。
 *
 *  t728 改法：改前是先 `join(' · ')` 拼成一整串再交给口径行，于是公共层的拆段器认不出它
 *  （它只认并列分隔符）⇒ 那 32 行 `·` 串原样上屏，正是用户点名的那类「用符号简化 UI」。
 *  现在改成：本件只说「这是三段并列」，`｜` 交给 `renderCaliberLine` 拆成逐段 `<span>`，
 *  段间那条细竖线由公共层 CSS 出（与全仓口径行同一条机制、同一处定义）。 */
export function sourceLine(facts: SourceLineFacts): string {
  const parts: string[] = [];
  const source = facts.source.trim();
  if (source !== '') parts.push('数据来源 ' + source);
  parts.push(windowText(facts.start, facts.end));
  parts.push('共 ' + String(facts.count) + ' 条');
  return renderCaliberLine(parts.join(SEG));
}
