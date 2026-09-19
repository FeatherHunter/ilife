/** 目标域页内共件：**本域眉标**、**两张页型共用的页框**、**几处取值口径**（金额文本、状态说法、
 *  进度百分比夹取、字段卡的格子、缺项折叠区、复制区与来源脚注）。
 *
 * 谁在用（三个调用点，指名）：
 *   ① `src/goal/template-form.ts`——设定表单页型（采集页 ＋ 回执页）两个调用点；
 *   ② `src/goal/template-progress.ts`——进度视图页型（结果型 ⑥）两个调用点（预算／目标各一张）；
 *   ③ `src/goal/scene-{set-budget,set-saving,budget,saving}.ts`——四件场景件取文案与取值口径。
 *
 * 本件**不含块位序列**（那是两份模板件的活），也不碰库与文件：只把普通数据加工成普通数据／
 *  把公共层区块接成一串。分家理由与写入域、账户域同：块序的变化频率与取值口径不同，抄多份就会改一处漏几处。
 *
 * 口径（一处定义，别处不许再写第二份）：
 *   - **眉标**＝`记账 · 目标域`（`shared/pageShell.ts` 不持「域名 → 取值」表，照 #688 §二 A1「域自报眉标」）；
 *   - **缺值一律 `—`**（#688 裁定 4；数字 0 是真实读数，照实写 0）；
 *   - **金额两位小数**（`toFixed(2)`，与查询域／账户域同一口径；老侧的千分位分隔符不照抄——
 *     数值格式统一由公共层读数卡与表格承载，页面本地不另造一套格式化）；
 *   - **进度百分比双端夹取 `0 ≤ pct ≤ 100`**（#688 §二 C13：老侧 `budget_view.html:209` 只有上界
 *     `Math.min(pct,100)`、负值会画负宽度且 `:228` 显示负百分比，而同域 `saving_view.html:208` 是双端——
 *     **同域两套下界口径，新侧取双端**；公共层读数卡的 `bar.pct` 本来就是 0–100 的闭区间，
 *     夹取必须在进条之前完成，故这里是唯一一处）；
 *   - **内部标识不上屏**（#688 裁定 1）：页面上不出现 `bill.`、库文件名、脚本路径、参数名——
 *     唯一例外是复制载荷区与两处「口令原文」块（复制指令块、缺项折叠里的明文），那两处是给助手照抄的原文。
 */
import { renderStatusBadge } from 'base-paint';
import type { SerializableEnvelope, StatusKind } from 'base-paint';
import { renderCaliberLine, renderChips, renderDataTable, renderDisclosure, renderEmptyBlock, renderPreBlock } from 'base-paint/blocks';
import type { DataTableColumn, DataTableRow, KpiCardInput, ParamFieldInput } from 'base-paint/blocks';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import type { PageShellInput } from '../shared/pageShell.js';
import { sourceLine } from '../shared/sourceLine.js';
import { commandLine } from '../shared/writeParts.js';
import type { GoalBudgetStatus, GoalSavingStatus } from './goalData.js';

/** 目标域各页的眉标：**只在本域写一次**（共用位不持「域名→取值」表）。 */
export const EYEBROW = '记账 · 目标域';

/** 本域各页统一走它：补上眉标再转共用位的 `pageShell`；调用点写法 `pageShell({…})` 不变。 */
export function goalPageShell(input: Omit<PageShellInput, 'eyebrow'>): string {
  return pageShell({ ...input, eyebrow: EYEBROW });
}

/** 写命令两页的页面内置 envelope（采集页 `ok:false`、回执页 `ok:true`；两页同一形状 `receipt`）。 */
export function envelopeOf(key: string, ok: boolean, message: string): SerializableEnvelope {
  return { version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key), data: { ok, message } };
}

/** 读命令那一页的 envelope（形状 `list`，`items` 必有、`total` 可选；判据不许宽过公共层）。 */
export function listEnvelopeOf(key: string, data: { readonly items: unknown[]; readonly total?: number }): SerializableEnvelope {
  return { version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: sceneKeyOf(key), data };
}

/** 缺值占位（裁定 4）。 */
export const MISSING = '—';

/** 金额文本：两位小数。数字照实写（含 0）；不是有限数就写缺值占位。 */
export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return MISSING;
  return n.toFixed(2);
}

/** 进度百分比的双端夹取（**唯一定义地**，见件头口径）：条长与上屏的百分数同取一份。 */
export function clampPct(n: number | null | undefined): number {
  if (n === null || n === undefined || !Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 100);
}

/** 百分比文本：一位小数（老侧 `fmtPct` 同口径），值已双端夹取。 */
export function pctText(n: number | null | undefined): string {
  return clampPct(n).toFixed(1) + '%';
}

/** 月底预测那一句（**唯一定义地**；#688 §二 C13 的三态）。
 *
 *  三态判据与阈值逐字照老侧 `目标/budget_view.html:214-219`：`diff > 0.01` 预计超、
 *  `diff < -0.01` 预计省、其间预计持平。**空预测＝空串**（`month_end_proj` 为 `null` 是「这一月没有预测可给」，
 *  老侧那一支同样是空串——它靠 `b.month_end_proj != null && b.days_elapsed` 两个假值反查，新侧只判一处）。 */
export function monthEndHintOf(item: {
  readonly month_end_proj: number | null;
  readonly daily_avg: number | null;
  readonly amount: number;
}): string {
  if (item.month_end_proj === null || item.daily_avg === null) return '';
  const diff = item.month_end_proj - item.amount;
  const hint = diff > 0.01 ? '预计超 ' + money(diff) + ' 元'
    : diff < -0.01 ? '预计省 ' + money(Math.abs(diff)) + ' 元' : '预计持平';
  return '日均 ' + money(item.daily_avg) + ' 元 · 按此节奏月底预计 ' + money(item.month_end_proj) + ' 元（' + hint + '）';
}

/** 一个值写成上屏文本：空白串与缺值一律 `—`（不写 `undefined`、不留空）。 */
export function textOrDash(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : v === null || v === undefined ? '' : String(v);
  return s === '' ? MISSING : s;
}

/** 预算状态的说法（老侧 `budget_view.html:101-105` 的 `STATUS_META` 逐字）。 */
export const BUDGET_STATUS_META: Readonly<Record<GoalBudgetStatus, { readonly kind: StatusKind; readonly label: string }>> = {
  ok: { kind: 'ok', label: '预算内' },
  warn: { kind: 'warn', label: '接近上限' },
  over: { kind: 'danger', label: '已超支' },
};

/** 目标状态的说法（老侧 `saving_view.html:99-104` 的 `STATUS_META` 逐字；档位照老侧 `:220` 的映射）。 */
export const SAVING_STATUS_META: Readonly<Record<GoalSavingStatus, { readonly kind: StatusKind; readonly label: string }>> = {
  done: { kind: 'ok', label: '已达成' },
  on_track: { kind: 'ok', label: '进行中' },
  behind: { kind: 'warn', label: '进度落后' },
  na: { kind: 'empty', label: '暂无进度' },
};

/** 类型徽章那一串（唤醒词 ＋ 口径 ＋ 状态徽章 ＋ 下一步动作）：四枚形状各自独立，不拼分隔符串。
 *  形状照写入域 `../write/typeBadge.js` 与账户域 `../account/pageParts.js` 的同一套，本件只喂目标自己的取值。 */
export function badgeOf(input: {
  readonly word: string;
  /** 第二枚胶囊那句话（本域页面的口径；空串＝只出唤醒词那一枚）。 */
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

/** 字段卡的一格（普通数据：参数名／中文名／怎么给／是否必需）。 */
export interface GoalField {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly required: boolean;
}

/** 字段卡的格子：一律由 `renderParamForm` 出（标签与控件配对、每格带 `name`）。
 *  值一律取本次参数——老侧表单页也是把 AI 解析出的字段透传回来回显（`render.py:126-127` 那一类）。 */
export function slotFieldsOf(params: Record<string, unknown>, fields: readonly GoalField[]): ParamFieldInput[] {
  return fields.map((f) => {
    const raw = params[f.name];
    const value = raw === true ? '是' : raw === false || raw === undefined || raw === null ? '' : String(raw).trim();
    return {
      name: f.name,
      label: f.label,
      hint: f.hint,
      ...(f.required ? { required: true } : {}),
      ...(value === '' ? {} : { value }),
    };
  });
}

/** 缺项阻断条：**收进折叠区**（点开才看得见），里面是「还缺什么」表 ＋ 只读的口令原文 ＋ 一句口径。
 *  铁口径（照 #688 裁定 9）：缺项时**不出**可复制的写库指令——页面上那条口令只给看不给复制。 */
export function blockedFoldOf(input: {
  readonly blocked: readonly { readonly name: string; readonly label: string; readonly why: string }[];
  /** 补齐后照抄的那条命令原文（缺的值留成尖括号占位符；「确认覆盖」那一格写 `true`）。 */
  readonly command: string;
}): string {
  if (input.blocked.length === 0) return '';
  return renderChips({ items: input.blocked.map((b) => ({ text: b.label })) })
    + renderDisclosure({
      title: '还缺什么（点开看补齐后照抄的那条）',
      contentHtml: renderDataTable({
        columns: [
          { key: 'label', label: '还缺哪一项' },
          { key: 'why', label: '为什么进不去' },
        ],
        rows: input.blocked.map((b) => ({ label: b.label, why: b.why === '没给' ? '这一项没给' : b.why })),
        caption: '缺一项就先不写进去',
      }) + renderPreBlock({ command: input.command, label: '口令原文（只给看不给复制）' })
        + renderCaliberLine('这一页先不写库；补齐之后照上面那句跟助手说一遍才会写。'),
    });
}

/** 复制指令块（过程型页的「照这句跟助手说一遍」）：走公共层 `renderPreBlock` 的自带复制按钮。 */
export function promptBlockOf(prompt: string, label = '复制给助手：这一句可以直接复制'): string {
  return renderPreBlock({
    label,
    command: prompt,
    actionId: 'ilife-goal-prompt',
    copyText: prompt,
    copyLabel: label,
  });
}

/** 复制区（数据位 ＋ 日志位；三格式与双按钮由共用件给）。 */
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

/** 空态（含「接下来怎么办」那一句）：预算表为空、目标表为空、当月无记录几处共用。 */
export function emptyOf(input: { readonly title?: string; readonly text: string; readonly next: string }): string {
  return renderEmptyBlock({ ...(input.title === undefined ? {} : { title: input.title }), text: input.text, hint: input.next });
}

/** 来源脚注（结果型页恒出，照 #688 §五 5.2 第 26 行）：三样值由调用方给。 */
export function sourceNoteOf(input: {
  readonly sourceText: string;
  readonly start: string;
  readonly end: string;
  readonly count: number;
}): string {
  return sourceLine({ source: input.sourceText, start: input.start, end: input.end, count: input.count });
}

/** 缺项时那条口令原文：缺的值留成尖括号占位符，**只给看不给复制**。
 *  两处与账户域不同：①「确认覆盖」那一格映射成 `true`（它不是用户填的槽位，是「覆盖掉那一条」这个意图）；
 *  ②其余格按参数名映射。 */
export function blockedCommandOf(
  key: string,
  params: Record<string, unknown>,
  blocked: readonly { readonly name: string; readonly label: string }[],
): string {
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) {
    filled[b.name] = b.name === 'force' ? true : '<' + b.label + '>';
  }
  return commandLine(key, filled);
}

/** 回执页的状态卡：新设／覆盖了旧的 ＋ 一句写入去向的说明。 */
export function receiptStatusCard(overwritten: boolean): KpiCardInput {
  return statusCard(overwritten ? '覆盖了旧的' : '新设的', overwritten ? '同月同类那一条已按新值改写' : '这一条是这次新加的');
}

/** 一格的状态值：值 ＋ 一句说明。 */
export function statusCard(value: string, detail: string): KpiCardInput {
  return { label: '状态', value, detail };
}

/** 页尾「对账信息」折叠区：本次写入的**可核对信息**（改了几处／什么时候写的／怎么核对）。 */
export function reconcileOf(input: { readonly actionAt: string; readonly changed: number; readonly note: string }): string {
  return renderDisclosure({
    title: '对账信息',
    contentHtml: renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
      rows: [
        { k: '改了目标表里几处', v: String(input.changed) + ' 处' },
        { k: '写入时间', v: input.actionAt },
        { k: '怎么核对', v: input.note },
      ],
    }),
  });
}

/** 采集页／回执页明细表的列（**这一族页型唯一定义地**：表头文本与每格 `data-label` 同源）。 */
export const DETAIL_COLUMNS: readonly DataTableColumn[] = [
  { key: 'k', label: '哪一项' },
  { key: 'v', label: '记成什么' },
];

/** 明细表的行：普通数据，按面量接口给（`renderDataTable` 收 `Record<string, unknown>`）。 */
export function detailRows(rows: readonly { readonly k: string; readonly v: string }[]): readonly DataTableRow[] {
  return rows.map((r) => ({ ...r }));
}

/** 复制日志第 3 段的三句来源：给机器看的那句可带载体名，上屏（来源脚注）的那句只写人话
 *  （照 #688 裁定 1：库文件名、命令名与脚本路径一律不上屏）。 */
export const SOURCE_COLLECT = '目标表（只读：这一页先不写库，只采集）';
export const SOURCE_WRITE = '目标表（写库回执）';
export const SOURCE_COLLECT_TEXT = '目标表（只读）';
export const SOURCE_WRITE_TEXT = '目标表（写入）';

/** 采集页／回执页复制口令那一段（「照这句跟助手说一遍」）：说清是哪条词、每一格填什么。
 *  空着的格写 `____`（必填）或 `____（选填）`，与老侧复制文本的占位写法同义（老侧写 `__如:3000__`）。 */
export function promptOf(
  word: string,
  slots: readonly { readonly name: string; readonly label: string; readonly required: boolean }[],
  params: Record<string, unknown>,
): string {
  const lines = slots.map((s) => {
    const raw = params[s.name];
    const v = raw === true ? '是' : raw === false || raw === undefined || raw === null ? '' : String(raw).trim();
    const blank = s.required ? '____' : '____（选填）';
    return '  ' + s.label + ': ' + (v === '' ? blank : v);
  });
  return '请加载「饼干记账」技能，帮我' + word + '：\n\n' + lines.join('\n');
}
