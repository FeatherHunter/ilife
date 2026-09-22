/** #833 · init 域（初始化类）· 两页装配（结果页「首次使用」＋ 过程页「首次使用-向导」）。
 *
 * 这一层只做装配：拿一份诊断载荷（`diagnosis.ts` 读过的那份）＋ 两个复制载荷，按**公共层底座**
 * 出一张整页 HTML——形状全用 `base-paint/blocks` 的既有区块（KPI 卡／结论条／表格／行列表／
 * 页内导航／复制区／空态），本域**不写一行自持样式**（#824 §2 的禁令：零字面色值、零新断点；
 * 触摸区与安全区随 `pageUi` 配方生效）。页壳由 `base-paint/docShell` 拼，与账单域同一条装配链。
 *
 * 两页分工（册子 #848 冻的 34 格里的第 30／34 格）：
 *   · `首次使用`（报告族·结果页）：搭完没有、还缺什么 —— 就绪度 KPI ＋ 检查表 ＋ 验证清单；
 *   · `首次使用-向导`（向导族·过程页）：该怎么搭 —— 逐步指引 ＋ 一条可复制的回话指令。
 * 同一份诊断出两页是刻意的：过程页回答「接下来做什么」，报告页回答「现在是什么样」。
 *
 * 对外只给两件：`renderInitReportPage` 与 `renderInitGuidePage`（各吃同一个入参对象）。
 */
import { pageUiCss, renderStatusBadge } from 'base-paint';
import {
  renderConclusionBar,
  renderCopyBlock,
  renderDataTable,
  renderEmptyBlock,
  renderKpiGrid,
  renderListRows,
  renderPageShell,
  renderPreBlock,
  renderTocBlock,
} from 'base-paint/blocks';
import { renderDocShell } from 'base-paint/docShell';
import type { InitCheckItem, InitDiagnosis, InitVerifyEntry } from './diagnosis.js';

/** 两页共用的入参：诊断载荷 ＋ 生成时刻 ＋ 两个复制载荷（数据／日志，由调用方的回执信封序列化）。 */
export interface InitPageInput {
  readonly diagnosis: InitDiagnosis;
  /** 生成时刻（`YYYY-MM-DD HH:MM:SS`，来自信封的 `occurred_at`）。 */
  readonly occurredAt: string;
  /** 复制区「复制数据」那颗按钮的载荷（文字形态）。 */
  readonly dataText: string;
  /** 复制区「复制日志」那颗按钮的载荷。 */
  readonly logText: string;
}

const EYEBROW = '备忘录 ｜ 首次使用';
const REPORT_STEM_TITLE = '初始化报告';
const GUIDE_STEM_TITLE = '首次使用引导';

/** 三态文案（一处定义：检查项与验证清单共用同一套说法）。 */
const STATUS_TEXT: Readonly<Record<string, string>> = {
  ok: '就绪',
  warn: '待补',
  err: '必装缺失',
  skip: '跳过',
  fail: '未通过',
};
const STATUS_KIND: Readonly<Record<string, 'ok' | 'warn' | 'danger' | 'empty'>> = {
  ok: 'ok',
  warn: 'warn',
  err: 'danger',
  skip: 'empty',
  fail: 'danger',
};

function statusText(kind: string): string {
  return STATUS_TEXT[kind] ?? kind;
}

function badgeHtml(kind: string): string {
  return renderStatusBadge({ status: STATUS_KIND[kind] ?? 'empty', text: statusText(kind) });
}

interface Counts {
  readonly items: number;
  readonly ready: number;
  readonly warn: number;
  readonly err: number;
}

function countOf(diagnosis: InitDiagnosis): Counts {
  const items = diagnosis.items;
  return {
    items: items.length,
    ready: items.filter((i) => i.status === 'ok').length,
    warn: items.filter((i) => i.status === 'warn').length,
    err: items.filter((i) => i.status === 'err').length,
  };
}

/** 未就绪的检查项（要处理的那几条：先必装、后待补）。 */
function pendingItems(diagnosis: InitDiagnosis): readonly InitCheckItem[] {
  const rank = (s: InitCheckItem['status']): number => (s === 'err' ? 0 : s === 'warn' ? 1 : 2);
  return diagnosis.items.filter((i) => i.status !== 'ok').sort((a, b) => rank(a.status) - rank(b.status));
}

function verifyRows(verify: readonly InitVerifyEntry[]): { readonly main: string; readonly right?: string }[] {
  return verify.map((v) => (v.status === undefined ? { main: v.text } : { main: v.text, right: statusText(v.status) }));
}

/** 报告页的副标题：**只作页面导语**（这一页有什么），不再把四个数报一遍 ——
 *  那四个数下面有 KPI 卡、结论条里又说了一遍（#820 收尾：同一事实一页三处是冗余）。 */
function reportSubtitle(): string {
  // 用词避免顿号并列：分隔符探针的 R5 档把「A、B、C」当分隔符懒政（实测扣分），故写成一句白话。
  return '这份报告列出检查结果与待办指引';
}

/** 结论条那句话（报告页顶部；同一事实只在这里说一次）。 */
function conclusionOf(counts: Counts): string {
  if (counts.items === 0) return '这次没有拿到检查数据，重跑一次「首次使用」再出报告。';
  if (counts.err > 0) return '环境未就绪：还有 ' + (counts.err + counts.warn) + ' 项没完成，其中必装缺失 ' + counts.err + ' 项。';
  if (counts.warn > 0) return '环境基本就绪：还有 ' + counts.warn + ' 项可选项待补，补完即可完整体验。';
  return '环境就绪：全部 ' + counts.items + ' 项检查通过。';
}

function environmentTable(diagnosis: InitDiagnosis): string {
  const columns = [
    { key: 'name', label: '检查项' },
    { key: 'status', label: '状态', align: 'center' as const },
    { key: 'desc', label: '当前情况' },
    { key: 'action', label: '缺什么怎么办' },
  ];
  const rows = diagnosis.items.map((i) => ({
    name: i.name,
    status: i.status,
    desc: i.desc,
    action: i.action === '' ? '无需处理' : i.action,
  }));
  return renderDataTable({
    columns,
    rows,
    emptyText: '这次没有拿到检查项',
    // 状态列走状态徽章（`ok／warn／err` 三态；值本身是机器档位，不上屏）。
    cellHtml: (key, value) => (key === 'status' ? badgeHtml(String(value)) : undefined),
  });
}

/** 待办表：一条一行，「怎么做」把步骤并成一句（步骤是给人照做的短句，不是命令）。 */
function todoTable(diagnosis: InitDiagnosis): string {
  const rows = diagnosis.todos.map((t) => ({
    title: t.title,
    steps: t.steps.length === 0 ? '按提示补上即可' : t.steps.join('，'),
  }));
  return renderDataTable({
    columns: [
      { key: 'title', label: '待办' },
      { key: 'steps', label: '怎么做' },
    ],
    rows,
    emptyText: '没有待办：环境检查没有需要补的项',
  });
}

function pageContent(input: InitPageInput, counts: Counts, forGuide: boolean): string {
  const { diagnosis } = input;
  const parts: string[] = [];
  const sections: { id: string; text: string }[] = [];

  const pending = pendingItems(diagnosis);
  if (pending.length > 0) sections.push({ id: 'sec-pending', text: forGuide ? '先处理' : '待处理项' });
  if (diagnosis.todos.length > 0) sections.push({ id: 'sec-todo', text: '待办指引' });
  if (diagnosis.verify.length > 0) sections.push({ id: 'sec-verify', text: '验证清单' });

  parts.push(renderKpiGrid(
    forGuide
      ? [
          { label: '要处理', value: String(pending.length), unit: '项' },
          { label: '必装缺失', value: String(counts.err), unit: '项', status: counts.err > 0 ? 'danger' : 'ok', statusText: counts.err > 0 ? '先装' : '无' },
          { label: '待补', value: String(counts.warn), unit: '项' },
        ]
      : [
          { label: '检查', value: String(counts.items), unit: '项' },
          { label: '就绪', value: String(counts.ready), unit: '项', status: 'ok' },
          { label: '待补', value: String(counts.warn), unit: '项', status: counts.warn > 0 ? 'warn' : 'ok' },
          { label: '必装缺失', value: String(counts.err), unit: '项', status: counts.err > 0 ? 'danger' : 'ok' },
        ],
  ));
  parts.push(renderConclusionBar(forGuide
    // #820 收尾：「回来说一声『重新检查』」这句只留一处 —— 页头副标题已经说了，结论条不再复读。
    ? '先处理必装缺失，再补待办项。'
    : conclusionOf(counts)));

  if (sections.length >= 2) parts.push(renderTocBlock({ items: sections }));

  if (pending.length > 0) {
    parts.push('<h2 id="sec-pending">' + (forGuide ? '先处理这些' : '待处理项') + '</h2>');
    // 不带行首状态词：KPI 卡上已经按档位报过同一事实（`必装缺失 N 项`），
    // 行首再挂一枚同名徽章就是「同一事实一页两处」——H3 那一笔债。分档信息由上方
    // KPI 卡与本节标题承担，行内只留「哪一项、怎么办」。
    parts.push(renderListRows({
      items: pending.map((i) => ({
        main: i.name + '：' + (i.action === '' ? i.desc : i.action),
      })),
    }));
  } else {
    parts.push(renderEmptyBlock({ title: '待处理项', text: '没有待处理项', hint: '环境检查的每一项都已就绪' }));
  }

  if (diagnosis.todos.length > 0) {
    parts.push('<h2 id="sec-todo">待办指引</h2>');
    parts.push(todoTable(diagnosis));
  }

  if (diagnosis.verify.length > 0) {
    parts.push('<h2 id="sec-verify">验证清单</h2>');
    parts.push(renderListRows({ items: verifyRows(diagnosis.verify), emptyText: '没有验证清单' }));
  }

  if (forGuide) {
    parts.push('<h2 id="sec-next">做完之后</h2>');
    parts.push(renderPreBlock({
      command: '按上面的步骤做完了，重新检查一次（唤醒词：首次使用）',
      actionId: 'memo-init-next',
      copyLabel: '复制回话',
    }));
  }

  /* 负责人 2026-09-22：这块**不出标题、不出说明行**——与卡路里同形，只剩一行 ghost 按钮
     （公共层 `renderActionBar` 的 `ilife-action-row-ghost`）。`renderCopyBlock` 的 `title`／`hint` 两位都不给。 */
  parts.push(renderCopyBlock({
    dataText: input.dataText,
    logText: input.logText,
  }));

  return parts.join('');
}

/** 页面级补丁样式（#820 收尾 · 视觉审查 H1）：公共层数据表窄档叠成卡片时，
 *  右列那一格的长句会越过卡片右内边距、末字被边框切。这里只补「换行」这一条，不改公共层。 */
const INIT_TABLE_WRAP_FIX = '.ilife-block-data-table-cell-left,.ilife-block-data-table-table td,.ilife-block-data-table-table th{white-space:normal;overflow-wrap:anywhere;word-break:break-word}';

function assemble(title: string, docTitle: string, subtitle: string, content: string): string {
  return renderDocShell({
    docTitle,
    bodyHtml: renderPageShell({ eyebrow: EYEBROW, title, subtitle, content }),
    extraCss: pageUiCss() + INIT_TABLE_WRAP_FIX,
    doctypeCase: 'upper',
    pageUi: true,
  });
}

/** 结果页（报告族）：`首次使用` —— 搭得怎么样。 */
export function renderInitReportPage(input: InitPageInput): string {
  const counts = countOf(input.diagnosis);
  return assemble(REPORT_STEM_TITLE, '备忘录初始化报告', reportSubtitle(), pageContent(input, counts, false));
}

/** 过程页（向导族）：`首次使用-向导` —— 接下来怎么做。 */
export function renderInitGuidePage(input: InitPageInput): string {
  const counts = countOf(input.diagnosis);
  const steps = counts.items === 0 ? 0 : pendingItems(input.diagnosis).length;
  return assemble(
    GUIDE_STEM_TITLE,
    '备忘录首次使用引导',
    steps === 0 ? '没有要处理的项，直接进功能浏览' : '按下面的步骤做完，回来说一声「重新检查」',
    pageContent(input, counts, true),
  );
}
