/** 分析域页内共件：**本域眉标**、**五族共用的页框**、**几处取值口径**（金额／百分比文本、页头徽章、
 *  复制区与来源脚注、两个形状的页面内置 envelope）。
 *
 * 谁在用（六个调用点，指名）：
 *   ① `./template-bars.ts`；② `./template-charts.ts`；③ `./template-tables.ts`；
 *   ④ `./template-compare.ts`；⑤ `./template-insight.ts`——五族模板各自拼页；
 *   ⑥ `./read.ts`——处理体拼复制区与页脚要的那几句取数文本。
 *
 * 本件**不含块位序列**（那是五份模板件的活），也不碰库与文件：只把普通数据加工成上屏文本／
 *  把公共层区块接成页头那几枚。
 *
 * 口径（一处定义，别处不许再写第二份）：
 *   - **眉标**＝`记账 · 分析域`（`shared/pageShell.ts` 不持「域名→取值」表，照 #688 §二 A1「域自报眉标」）；
 *   - **缺值一律 `—`**（#688 裁定 4；数字 0 是真实读数，照实写 0）；**不许渲染 `undefined`／`NaN`**；
 *   - **金额两位小数、百分比一位小数**（#688 §二 A5 的「格式统一」：格式由公共层读数卡与表格承载，
 *     页面只把数转成文本，不自己加千分位、不自己造第二套格式）；
 *   - **内部标识不上屏**（#688 裁定 1）：页面上不出现 `bill.`、库文件名、脚本路径、参数名、`_` 形态的英文标识；
 *   - **页脚不出按钮、不出深底浮动块**（#688 裁定 11）：本域是查看型页，没有退出口。
 */
import { renderStatusBadge } from 'base-paint';
import type { SerializableEnvelope, StatusKind } from 'base-paint';
import { renderCaliberLine, renderChips, renderConclusionBar, renderEmptyBlock } from 'base-paint/blocks';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { navBlock, pageBody, pageNav } from '../shared/pageSections.js';
import type { PageBlock } from '../shared/pageSections.js';
import { pageShell } from '../shared/pageShell.js';
import type { PageShellInput } from '../shared/pageShell.js';
import { sourceLine } from '../shared/sourceLine.js';
import { commandLine } from '../shared/writeParts.js';

/** 分析域各页的眉标：**只在本域写一次**（共用位不持「域名→取值」表）。 */
export const EYEBROW = '记账 · 分析域';

/** 本域各页统一走它：补上眉标再转共用位的 `pageShell`；调用点写法 `pageShell({…})` 不变。 */
export function analysisPageShell(input: Omit<PageShellInput, 'eyebrow'>): string {
  return pageShell({ ...input, eyebrow: EYEBROW });
}

/** 本域页面文档标题的后缀（`DOC_TITLE` 是技能名，后缀是这一页是什么）。 */
export function docTitleOf(what: string): string { return DOC_TITLE + '·' + what; }

/** 缺值占位（裁定 4）。 */
export const MISSING = '—';

/** 金额文本：两位小数。数字照实写（含 0）；不是有限数就写缺值占位。 */
export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return MISSING;
  return n.toFixed(2);
}

/** 百分比文本：一位小数 ＋ `%`。不是有限数就写缺值占位。 */
export function pctText(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return MISSING;
  return n.toFixed(1) + '%';
}

/** 带方向的金额文本（`+12.00`／`-12.00`／`0.00`）：流水行与差异行用它。 */
export function signedMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return MISSING;
  return n > 0 ? '+' + n.toFixed(2) : n.toFixed(2);
}

/** 一个值写成上屏文本：空白串与缺值一律 `—`（不写 `undefined`、不留空）。 */
export function textOrDash(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : v === null || v === undefined ? '' : String(v);
  return s === '' ? MISSING : s;
}

/** 页头那一串：唤醒词胶囊 ＋（第二枚口径胶囊）＋ 状态徽章 ＋（下一步那几句）。 */
export function badgeOf(input: {
  readonly word: string;
  /** 第二枚胶囊那句话（本域的页面口径；空串＝只出唤醒词那一枚）。 */
  readonly caliber: string;
  readonly status: StatusKind;
  readonly statusText: string;
  /** 下一步动作（整句；空串＝不出）。按句号分行，一句一行口径。 */
  readonly next: string;
}): string {
  const items = input.caliber === '' ? [{ text: input.word }] : [{ text: input.word }, { text: input.caliber }];
  const parts = [renderChips({ items }), renderStatusBadge({ status: input.status, text: input.statusText })];
  const next = input.next.trim();
  if (next !== '') {
    for (const line of next.split('。').map((s) => s.trim()).filter((s) => s !== '')) {
      parts.push(renderCaliberLine(line + '。'));
    }
  }
  return parts.join('');
}

/** 空态（含「接下来怎么办」那一句）：没有记录可看时每族共用。 */
export function emptyOf(input: { readonly title?: string; readonly text: string; readonly next: string }): string {
  return renderEmptyBlock({ ...(input.title === undefined ? {} : { title: input.title }), text: input.text, hint: input.next });
}

/** 来源脚注（结果型每张页恒出，照 #688 裁定 2）：三样值由调用方给。 */
export function sourceNoteOf(input: {
  readonly sourceText: string;
  readonly start: string;
  readonly end: string;
  readonly count: number;
}): string {
  return sourceLine({ source: input.sourceText, start: input.start, end: input.end, count: input.count });
}

/** `stat` 形的页面内置 envelope（`bill.analysis.overview`）：`metrics` 全 number，与出口载荷同源同形。 */
export function statEnvelopeOf(key: string, metrics: Readonly<Record<string, number>>): SerializableEnvelope {
  return { version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: sceneKeyOf(key), data: { metrics } };
}

/** `analysis` 形的页面内置 envelope（另两条命令）：`summary` 非空串。 */
export function analysisEnvelopeOf(key: string, summary: string): SerializableEnvelope {
  return { version: DOC_VERSION, skill: DOC_SKILL, shape: 'analysis', key: sceneKeyOf(key), data: { summary } };
}

/** 复制区（数据位 ＋ 日志位；三格式与双按钮由共用件给，日志第 4 段＝本次命令原文，可照抄重跑）。 */
export function copyZoneOf(input: {
  readonly envelope: SerializableEnvelope;
  readonly title: string;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly source: string;
  readonly detail: string;
  readonly actionAt: string;
}): string {
  return copyArea({
    data: { envelope: input.envelope, title: input.title },
    log: {
      envelope: input.envelope,
      copyLog: copyLog({
        command: commandLine(input.key, input.params),
        source: input.source,
        detail: input.detail,
        actionAt: input.actionAt,
        version: DOC_VERSION,
      }),
    },
  });
}

/** 复制日志第 3 段那句**给机器看**的来源（可带载体名）；上屏的来源脚注另一句（只写人话，裁定 1）。 */
export const SOURCE_READ = '记账库 · bills（只读：只取数与聚合，不改库）';
export const SOURCE_READ_TEXT = '记账库（只读）';

/** 没有时间窗的查法（看借贷／看分期／看活跃／做统计）在来源脚注起止位写的那两个字——留空会读成缺值。 */
export const NO_WINDOW = '不限';

/** 一条窗口的时间范围写成人话：同一天不写两个端点。 */
export function windowLabel(from: string, to: string): string {
  if (from === '' || to === '') return NO_WINDOW;
  return from === to ? from : from + ' ~ ' + to;
}

/** 期间取值那一枚胶囊（老侧各页头部的 `<span class="filter-chip">📅 …` 换成公共组件承载）。 */
export function periodChip(label: string): string {
  return label === '' ? MISSING : label;
}

/** 一整页的**页框**（五族共用：页头那一串、结论句、页内导航、正文块、口径说明行、复制区、来源脚注）。
 *
 * 为什么单出这一件：五族的差异**只在正文块的先后**（那是各族模板件的活），页框这六段是同一套
 *  （照 #688 §五 5.2 的 ⑦ 列：眉标 ●／标题 ●／结论句 ●／页内导航 ●／口径说明行 ●／复制区 ●／来源脚注 ●）。
 * 本件按调用方给的**块清单**拼正文，并**从同一份清单派生页内导航**（`pageSections.ts` 的口径：
 *  锚点与条目各写一份就会走散）；口径说明行与来源脚注在**复制区之前**、正文之后，位置对五族一致。
 */
export function analysisDocOf(input: {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly wakeWord: string;
  /** head 的 `<title>` 文本（`docTitleOf(这一页是什么)`）。 */
  readonly docTitle: string;
  /** 副标题：这一页看的是哪一段（期间标签）。 */
  readonly subtitle: string;
  /** 本次 envelope 的形状（`stat`／`analysis`；页面 `<section>` 上的那一枚与它同值）。 */
  readonly shape: string;
  /** 页头第二枚胶囊那句话（本页的口径；空串＝只出唤醒词那一枚）。 */
  readonly wordCaliber: string;
  readonly status: StatusKind;
  readonly statusText: string;
  /** 下一步动作整句（空串＝不出）。 */
  readonly next: string;
  /** 结论句一行。 */
  readonly conclusion: string;
  /** 口径说明行（怎么算的）。 */
  readonly caliber: string;
  /** 正文块清单（**次序由各族的模板件给**，本件原样按序拼）。 */
  readonly blocks: readonly PageBlock[];
  readonly envelope: SerializableEnvelope;
  readonly source: string;
  readonly detail: string;
  readonly actionAt: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly count: number;
}): string {
  const blocks: readonly PageBlock[] = [
    ...input.blocks,
    { html: renderCaliberLine(input.caliber) },
    navBlock(copyZoneOf({
      envelope: input.envelope, title: input.wakeWord, key: input.key, params: input.params,
      source: input.source, detail: input.detail, actionAt: input.actionAt,
    }), 'sec-copy', '复制'),
  ];
  const content = badgeOf({
    word: input.wakeWord,
    caliber: input.wordCaliber,
    status: input.status,
    statusText: input.statusText,
    next: input.next,
  }) + renderConclusionBar(input.conclusion)
    + pageNav(blocks) + pageBody(blocks)
    + sourceNoteOf({
      sourceText: SOURCE_READ_TEXT, start: input.windowStart, end: input.windowEnd, count: input.count,
    });
  return analysisPageShell({
    docTitle: input.docTitle,
    title: input.wakeWord,
    subtitle: input.subtitle,
    slot: 'list',
    page: 'list',
    shape: input.shape,
    key: input.key,
    content,
  });
}
