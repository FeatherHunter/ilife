/** #384 · 报告子形态页渲染·公共原语（1 个多态底座共用的区块件）。
 *
 * 为什么另立一件：8 个形态若各写一份 KPI／折线／表格／页脚，同一套原语就复制 8 遍
 * （违反「概念唯一」）；本件是那**唯一一份**，`reportDoc.ts` 与它三个分片都从这里取。
 *
 * 纪律：颜色字面量 0（走 `base-paint` 令牌，主色既有 `--blue`）；样式一律经
 * `assembleDocPage`（内部＝`buildStyleSheet().css + blocksCss()`，不走 `extraCss`）。
 * 折线量程贴着数据（给宽了曲线就是平线，读不出走势）——与 `multiTrendPage` 同取向，各自域内独立。
 *
 * ── #519（场景 10 · 报告族 8 页重排）在本件加了什么 ─────────────────────────────
 * 报告族此前**一处没接**公共层的形状件（`conclusion`／`toc`／`caliber`／`chip`／`empty` 计数全 0），
 * 且页框散在 `reportDoc.ts` 里、逐形态各拼各的。本票把**页框**（区块锚点外壳／页内导航／页头胶囊／
 * 口径行／来源脚注／结论条）也收进本件——八个形态共用**同一份**，这是「多态底座不许拆成 8 份页面」
 * 那条硬指标在代码面的落点：底座仍是一个（`reportDoc.ts` 的 `buildReportDoc`），分片仍按「同一批改动
 * 一起改」切三件（BMI／目标追踪／评分趋势对比），页框**只有一份**住这里。
 *
 * 形状依据：`docs/skills/skill-calorie/t516-场景10-视觉整改基准.md` §3.1 的六种形状词表（页面本地
 * 不许自造第七种）＋ §一 J2／J8／J9（结论条／页内导航／口径行＋来源脚注三条恒出）。
 */
import { renderCaliberLine, renderChartBlock, renderChips, renderDataTable, renderTocBlock } from 'base-paint/blocks';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DB_FILENAME } from '../paths.js';
import type { ReportPlate } from './reportPlate.js';

export const DOC_VERSION = '0.1.0' as const;
export const DOC_SKILL = 'calorie' as const;

/* ── 页框（#519）：区块锚点／导航／页头胶囊／来源脚注 —— 八个形态共用这一份 ───────────── */

/** 一个页内区块：`id`＋导航项文案＋区块 HTML **同源**（J8 要求导航与锚点双向自洽、
 *  多一个孤儿锚点即红 ⇒ 三者不许各写一份，必须从同一个对象派生）。 */
export interface ReportSection {
  readonly id: string;
  /** 页内导航里那一格的字（读者语；不是命令名、不是英文）。 */
  readonly text: string;
  /** 已组合好的区块 HTML。 */
  readonly html: string;
}

/** 区块构造器：`id`／`text`／`html` 一次性绑死（调用方不再有机会让三者走散）。 */
export function sec(id: string, text: string, html: string): ReportSection {
  return { id, text, html };
}

/** 区块锚点外壳：`renderTocBlock` 只认 `id`、区块产出器本身不带 `id` ⇒ 由调用方在外面套一层
 *  （同族先例 `analysis/reportDoc.ts` 的姊妹件 `render/trendPredictDocs.ts:55` 的 `pageSection`）。
 *  **只加锚点，不写任何样式**——版面单源住 `packages/base-render/`，页面本地一行色值、一个字号都不写。
 *  这一层还是 J6 的落点：内容容器（`.ilife-block-page-shell-body`）的直接子件因此都是 1080 宽的
 *  `<section>`，公共层 `renderDataTable` 自带的 `max-width:680px`（#512 的设计，归 #567）不再
 *  在「区块铺满内容列」这一问上把读数带偏。 */
export function sectionsHtml(list: readonly ReportSection[]): string {
  return list.map((s) => '<section id="' + s.id + '">' + s.html + '</section>').join('');
}

/** 页内导航（J2／J9 三条恒出之一）：项与区块同源同一份 `list` ⇒ 双向自洽不可能破。 */
export function navOf(list: readonly ReportSection[]): string {
  return renderTocBlock({ items: list.map((s) => ({ id: s.id, text: s.text })) });
}

/** 页头胶囊（#516 §3.2 D01／D02／D04）：归属词与页型**不拿 `·` 串进题名**，改走徽章件。
 *  同族先例＝`render/trendPredictDocs.ts:275` 的 `predictChips`（预测族与报告族共用同一套形状语言）。 */
export function reportChips(topic: string): string {
  return renderChips({ items: [{ text: '卡路里' }, { text: topic }, { text: '健康报告' }] });
}

/** 来源脚注（J9 第三条恒出；同族写法见缺口页与 `diet/sourceStatsDocs.ts`）：走普通小字行，不走深底块。
 *  区间写「至」（#516 判据 R6：`~` 顶替「至」判债）。 */
export function sourceFootnoteOf(plate: ReportPlate): string {
  return renderCaliberLine('📊 数据来源：本机' + plate.base.start + ' 至 ' + plate.base.end + ' 的体重与饮食记录');
}

export function fmt(v: number | null | undefined, unit = ''): string {
  if (v === null || v === undefined) return '—';
  return String(v) + unit;
}

export function fmtInt(v: number | null | undefined, unit = ''): string {
  if (v === null || v === undefined) return '—';
  return String(Math.round(v)) + unit;
}

/** 逐日点 → 折线（`label` 带月日；`value` 缺即断点，不补 0）；全空走表格空态。 */
export function lineOf(
  points: readonly { readonly date: string; readonly value: number | null }[],
  title: string,
  opts: { readonly format?: (v: number) => string; readonly target?: number | null } = {},
): string {
  const items = points.map((p) => ({ label: p.date.slice(5), value: p.value }));
  const target = opts.target === null || opts.target === undefined ? null : opts.target;
  if (items.every((i) => i.value === null)) {
    return renderDataTable({
      columns: [{ key: 'note', label: '说明' }],
      rows: [{ note: '这段时间还没有可画的数据' }],
      caption: title,
    });
  }
  const values = items.map((i) => i.value).filter((v): v is number => v !== null);
  const lo = Math.min(...values, ...(target === null ? [] : [target]));
  const hi = Math.max(...values, ...(target === null ? [] : [target]));
  const pad = Math.max((hi - lo) * 0.12, hi === lo ? Math.max(Math.abs(hi) * 0.05, 1) : 0);
  return renderChartBlock({
    kind: 'line',
    title,
    input: {
      items,
      options: {
        yTicks: 3,
        labels: 'select',
        yMin: Math.max(0, Math.floor(lo - pad)),
        yMax: Math.ceil(hi + pad),
        connectNulls: true,
        highlightLast: true,
        ...(opts.format === undefined ? {} : { format: opts.format }),
        ...(target === null ? {} : { markLine: { value: target, label: '目标' } }),
      },
    },
  });
}

/** 逐日明细表（日期 ＋ 一列数值 ＋ 可选附加列）：表题与单位由形态给。 */
export function tableOf(
  points: readonly { readonly date: string; readonly value: number | null }[],
  valueLabel: string,
  caption: string,
  extra?: readonly { readonly label: string; readonly values: readonly (string | number | null)[] }[],
): string {
  const columns = [
    { key: 'date', label: '日期' },
    { key: 'value', label: valueLabel, align: 'right' as const },
    ...(extra ?? []).map((e) => ({ key: e.label, label: e.label, align: 'right' as const })),
  ];
  const rows = points.map((p, i) => {
    const row: Record<string, string | number | null> = { date: p.date, value: p.value === null ? null : p.value };
    for (const e of extra ?? []) row[e.label] = e.values[i] ?? null;
    return row;
  });
  return renderDataTable({ columns, rows, caption, emptyText: '这段时间还没有逐日记录' });
}

/** 键值两列表（口径说明／计算假设／分项表共用一份，不各写一遍）。
 *
 *  **#519 的口径**：`k` 一列一格写一条事实——「身高／年龄／性别」那种拿斜杠把三件事串进一格
 *  的写法（#516 判据 R3：≥3 段并列）改由**多行**承担，调用方逐条给行，本件不再合并。 */
export function kvTable(caption: string, rows: readonly { readonly k: string; readonly v: string | number | null }[]): string {
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '取值' }],
    rows: rows.map((r) => ({ k: r.k, v: r.v })),
    caption,
  });
}

/** 页脚：数据三格式 ＋ 日志两格式（既有 actionBar 能力；本图不新增场景按钮契约）。
 *
 *  **#519 与「命令回执行」的关系**：页面上原来另有一格写着命令原文（`calorie-cmd-read
 *  calorie.report.bmi --params …`）——那是 #516 §3.2 D07 的债（内部标识符上屏，判据 R7）。
 *  命令原文**只进复制载荷**（副本住 `data-t` 属性、不上屏），且这里改用**调用方传进来的当次命令原文**
 *  （带 `--params`），读者要重跑照底部那颗「复制日志」抄即可，比原先上屏那一格更准。
 *  `command` 缺省（空串）时回落成按键名派生的那条规范化命令，老调用方不受影响。 */
export function footerOf(plate: ReportPlate, kindLabel: string, command = ''): string {
  const envelope = {
    version: DOC_VERSION,
    skill: DOC_SKILL,
    shape: 'stat' as const,
    key: 'calorie.report.' + plate.base.kind,
    data: {
      metrics: {
        days: plate.base.days,
      },
    },
  };
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command: command === '' ? 'calorie-cmd-read calorie.report.' + plate.base.kind : command,
        source: DB_FILENAME + ' ｜ 报告子形态 ' + kindLabel,
        actionAt: plate.base.end,
        version: DOC_VERSION,
      }),
    },
  });
}

/** 页头左格：区间与天数。区间写「至」（#516 判据 R6）、天数进全角括号（判据 R1 的 `·` 串撤掉）。 */
export function metaLeftOf(plate: ReportPlate): string {
  return plate.base.start + ' 至 ' + plate.base.end + '（共 ' + plate.base.days + ' 天）';
}
