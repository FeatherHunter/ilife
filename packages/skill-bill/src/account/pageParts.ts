/** 账户域页内共件：**本域眉标**、**两张页型共用的页框**、**几处取值口径**（金额文本、状态说法、
 *  字段卡的格子、缺项折叠区、复制区与来源脚注）。
 *
 * 谁在用（三个调用点，指名）：
 *   ① `src/account/template-form.ts`——账户表单页型（采集页 ＋ 回执页）四个调用点；
 *   ② `src/account/template-update.ts`——改账户页型（采集页 ＋ 回执页）两个调用点；
 *   ③ `src/account/template-summary.ts`——账户汇总页型（结果型 ⑥）。
 *
 * 本件**不含块位序列**（那是三份模板件的活），也不碰库与文件：只把普通数据加工成普通数据／
 *  把公共层区块接成一串。分家理由与写入域同：块序的变化频率与取值口径不同，抄三份就会改一处漏两处。
 *
 * 口径（一处定义，别处不许再写第二份）：
 *   - **眉标**＝`记账 · 账户域`（`shared/pageShell.ts` 不持「域名 → 取值」表，照 #688 §二 A1「域自报眉标」）；
 *   - **缺值一律 `—`**（#688 裁定 4；数字 0 是真实读数，照实写 0）；
 *   - **金额两位小数**（`toFixed(2)`，与查询域列表页同一口径；老侧的千分位分隔符不照抄——
 *     本仓的数值格式统一由公共层读数卡与表格承载，页面本地不另造一套格式化）；
 *   - **内部标识不上屏**（#688 裁定 1）：页面上不出现 `bill.`、库文件名、脚本路径、参数名。
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

/** 账户域各页的眉标：**只在本域写一次**（共用位不持「域名→取值」表）。 */
export const EYEBROW = '记账｜账户域';

/** 本域各页统一走它：补上眉标再转共用位的 `pageShell`；调用点写法 `pageShell({…})` 不变。 */
export function accountPageShell(input: Omit<PageShellInput, 'eyebrow'>): string {
  return pageShell({ ...input, eyebrow: EYEBROW });
}

/** 写命令两页的页面内置 envelope（采集页 `ok:false`、回执页 `ok:true`；两页同一形状 `receipt`）。 */
export function envelopeOf(key: string, ok: boolean, message: string): SerializableEnvelope {
  return { version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key), data: { ok, message } };
}

/** 读命令那一页的 envelope（形状 `list`：`items` 是账户卡，与搬迁前同一形状、只加不改）。
 *  形状那一格按 `base-link-core` 的 `list` 形收窄（`items` 必有、`total` 可选）——
 *  判据不许宽过公共层，故不写 `Record<string, unknown>`。 */
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

/** 带方向的金额文本（流水那一列）：正数带 `+`、负数带 `-`，零不带符号。 */
export function signedMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return MISSING;
  if (n > 0) return '+' + n.toFixed(2);
  return n.toFixed(2);
}

/** 一个值写成上屏文本：空白串与缺值一律 `—`（不写 `undefined`、不留空）。 */
export function textOrDash(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : v === null || v === undefined ? '' : String(v);
  return s === '' ? MISSING : s;
}

/** 类型徽章那一串（唤醒词 ＋ 口径 ＋ 状态徽章 ＋ 下一步动作）：四枚形状各自独立，不拼分隔符串。
 *  形状照写入域 `../write/typeBadge.js` 的同一套（那里是五个域的页面先例），本件只喂账户自己的取值。 */
export function badgeOf(input: {
  readonly word: string;
  /** 第二枚胶囊那句话（账户域的页面口径；空串＝只出唤醒词那一枚）。 */
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

/** 字段卡的一格（普通数据：参数名／中文名／怎么给／是否必需／候选）。 */
export interface AccountField {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly required: boolean;
  /** 选中即填的候选项（给了即渲染下拉）。 */
  readonly options?: readonly string[];
}

/** 字段卡的格子：一律由 `renderParamForm` 出（标签与控件配对、每格带 `name`）。
 *  值一律取本次参数——这一页不做「从历史顶值」那套（账户域没有可顶的历史：账户名与类型都是用户当下说的）。 */
export function slotFieldsOf(params: Record<string, unknown>, fields: readonly AccountField[]): ParamFieldInput[] {
  return fields.map((f) => {
    const raw = params[f.name];
    const value = raw === true ? '是' : raw === false || raw === undefined || raw === null ? '' : String(raw).trim();
    return {
      name: f.name,
      label: f.label,
      hint: f.hint,
      ...(f.options === undefined || f.options.length === 0 ? {} : { options: f.options }),
      ...(f.required ? { required: true } : {}),
      ...(value === '' ? {} : { value }),
    };
  });
}

/** 缺项阻断条：**收进折叠区**（点开才看得见），里面是「还缺什么」表 ＋ 只读的口令原文 ＋ 一句口径。
 *  铁口径（照 #688 裁定 9）：缺项时**不出**可复制的写库指令——页面上那条口令只给看不给复制。 */
export function blockedFoldOf(input: {
  readonly blocked: readonly { readonly name: string; readonly label: string; readonly why: string }[];
  /** 补齐后照抄的那条命令原文（缺的值留成尖括号占位符）。 */
  readonly command: string;
}): string {
  if (input.blocked.length === 0) return '';
  const items = input.blocked.map((b) => ({ text: b.label }));
  return renderChips({ items })
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

/** 复制指令块（过程型页的「照这句跟助手说一遍」）：走公共层 `renderPreBlock` 的自带复制按钮。
 *  查询域那种结果型页不出这一块——查询不写库，没有要交回助手的一句。 */
export function promptBlockOf(prompt: string, label = '复制给助手：这一句可以直接复制'): string {
  return renderPreBlock({
    label,
    command: prompt,
    actionId: 'ilife-account-prompt',
    copyText: prompt,
    copyLabel: label,
  });
}

/** 复制区（数据位 ＋ 日志位；三格式与双按钮由共用件给）。
 *  复制文本那一行的抬头由调用方给的 `title` 决定（`copyArea` 的 `title` 位）——**不往 envelope 里塞标题**：
 *  envelope 是机器契约（形状与载荷一对一），往里加一个只为上屏用的字段就把它撑成两种用法。 */
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

/** 空态（含「接下来怎么办」那一句）：账户表为空、流水为空两处共用。 */
export function emptyOf(input: { readonly title?: string; readonly text: string; readonly next: string }): string {
  return renderEmptyBlock({ ...(input.title === undefined ? {} : { title: input.title }), text: input.text, hint: input.next });
}

/** 来源脚注（结果型与过程型每张页恒出，照 #688 §五 5.2 第 26 行）：三样值由调用方给。 */
export function sourceNoteOf(input: {
  readonly sourceText: string;
  readonly start: string;
  readonly end: string;
  readonly count: number;
}): string {
  return sourceLine({ source: input.sourceText, start: input.start, end: input.end, count: input.count });
}

/** 缺项时那条口令原文：缺的值留成尖括号占位符，**只给看不给复制**（复制按钮由 `blockedFoldOf` 拿掉）。
 *  「改成什么」那一格不是一个参数名（它对应 `new-name`／`disable`／`enable` 三个口子），故单给一条映射。 */
export function blockedCommandOf(
  key: string,
  params: Record<string, unknown>,
  blocked: readonly { readonly name: string; readonly label: string }[],
): string {
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) {
    if (b.name === 'change') filled['new-name'] = '<' + b.label + '>';
    else filled[b.name] = '<' + b.label + '>';
  }
  return commandLine(key, filled);
}

/** 回执页的状态卡：无改动／已改动 ＋ 一句写入去向的说明（形状照写入域同件，措辞由调用方给）。 */
export function receiptStatusCard(noChange: boolean, sameText: string, writtenText: string): KpiCardInput {
  return statusCard(noChange ? '无改动' : '已改动', noChange ? sameText : writtenText);
}

/** 一格的状态值：值 ＋ 一句说明。 */
export function statusCard(value: string, detail: string): KpiCardInput {
  return { label: '状态', value, detail };
}

/** 页尾「对账信息」折叠区：本次写入的**可核对信息**（改了几处／什么时候写的／怎么核对）。
 *  这次记了几笔与写进去的项已在上方卡片与明细表上，这里不重写。 */
export function reconcileOf(input: { readonly actionAt: string; readonly changed: number; readonly note: string }): string {
  return renderDisclosure({
    title: '对账信息',
    contentHtml: renderDataTable({
      columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
      rows: [
        { k: '改了账本里几处', v: String(input.changed) + ' 处' },
        { k: '写入时间', v: input.actionAt },
        { k: '怎么核对', v: input.note },
      ],
    }),
  });
}

/** 复制日志第 3 段的两句来源：给机器看的那句可带载体名，上屏（来源脚注）的那句只写人话
 *  （照 #688 裁定 1：库文件名、命令名与脚本路径一律不上屏）。 */
export const SOURCE_COLLECT = '账户表与账本（只读：这一页先不写库，只采集）';
export const SOURCE_WRITE = '账户表与账本（写库回执）';
export const SOURCE_READ = '账户表与账本（只读：算余额与流水）';
export const SOURCE_COLLECT_TEXT = '账户表与账本（只读）';
export const SOURCE_WRITE_TEXT = '账户表与账本（写入）';
export const SOURCE_READ_TEXT = '账户表与账本（只读）';

/** 这一笔的时间（来源脚注的窗口起止都读它；参数没给就退回这一页的执行时刻）。 */
export function timeOf(params: Record<string, unknown>, fallback: string): string {
  const t = params['time'];
  return typeof t === 'string' && t.trim() !== '' ? t.trim() : fallback;
}

/** 采集页／确认页复制口令那一段（「照这句跟助手说一遍」）：说清是哪条词、每一格填什么。
 *  空着的格写 `____`（必填）或 `____（选填）`，与老侧复制文本的占位写法同义（老侧写 `____`）。 */
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

/** 已有账户表（采集页与汇总页共用的一张只读表）：账户／类型／状态。 */
export function accountsTableOf(rows: readonly { readonly name: string; readonly type: string; readonly disabled: boolean }[], caption: string): string {
  const columns: readonly DataTableColumn[] = [
    { key: 'name', label: '账户' },
    { key: 'type', label: '类型' },
    { key: 'state', label: '状态' },
  ];
  const body: readonly DataTableRow[] = rows.map((a) => ({
    name: a.name,
    type: textOrDash(a.type),
    state: a.disabled ? '已停用' : '使用中',
  }));
  return renderDataTable({ columns, rows: body, caption, emptyText: '账户表里还没有账户' });
}
