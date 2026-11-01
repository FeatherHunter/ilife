/** 开始使用域页内共件：**本域眉标**、**三片页型共用的页框**、**步骤条两件**、几处取值口径
 *  （缺值、字节、复制区、来源脚注、缺项阻断）。
 *
 * 谁在用（四个调用点，指名）：
 *   ① `src/setup/template-wizard.ts`——向导页型（初始化／恢复／导入三个场景）；
 *   ② `src/setup/template-receipt.ts`——结果回执页型（一键备份）；
 *   ③ `src/setup/template-list.ts`——记录列表／状态页型（查看备份／初始化状态）；
 *   ④ `src/setup/run.ts`——六种 op 的处理体（页壳与复制区都从这里取）。
 *
 * 本件**不含块位序列**（那是三份模板件的活），也不碰库与文件：只把普通数据加工成普通数据／
 *   把公共层区块接成一串（与账户域 `../account/pageParts.js` 同形）。
 *
 * **步骤状态怎么表达**（#731 走完本域要留下的那一条口径）：本仓公共层**没有**步骤条这一件，
 *   按「共用件从第二个用法里长出来」这一条，本域**先落域内件**两枚——
 *   ① 徽章列（`renderChips`）承载**进度**：一枚 `共 N 步` ＋ 每步一枚 `第 N 步 · 步骤名 · 状态`；
 *   ② 小表（`renderDataTable`）承载**每一步的现状说明**（一句一句写清「现在什么情况」）。
 *   两枚都只是把 `./steps.js` 算好的 `WizardStep[]` 摊开，**不含任何算式**——编号与状态都算在 `steps.ts`
 *   那一处（老侧 restore 把 `2`／`3` 写死在 HTML 里，就是从这里漏出去的）。
 *   若将来第二个域也要出步骤条，再照这一枚立公共层增量票（本域不提前上浮）。
 */
import { escapeHtml, renderStatusBadge } from 'base-paint';
import type { SerializableEnvelope, StatusKind } from 'base-paint';
import { renderCaliberLine, renderChips, renderDataTable, renderEmptyBlock, renderPreBlock } from 'base-paint/blocks';
import type { DataTableColumn, DataTableRow, ParamFieldInput } from 'base-paint/blocks';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import type { PageShellInput } from '../shared/pageShell.js';
import { sourceLine } from '../shared/sourceLine.js';
import { commandLine } from '../shared/writeParts.js';
import { humanBytes } from './backups.js';
import type { SetupCopy } from './copyTextSetup.js';
import { stepStateText } from './steps.js';
import type { WizardStep } from './steps.js';
import type { SetupBlocked, SetupSlot } from './params.js';
import { m } from '../entries/index.js';

/** 开始使用域各页的眉标：**只在本域写一次**（共用位不持「域名→取值」表；老侧 `init_wizard.html:60` 同句）。
 *  `#1214`：改成**函数**按语言取词——模块级常量会在加载期取词，语言一旦出口就被固化成 zh。 */
export function setupEyebrow(): string {
  return m('skill-bill.setup-pageParts.c001');
}

/** 本域各页统一走它：补上眉标再转共用位的 `pageShell`。 */
export function setupPageShell(input: Omit<PageShellInput, 'eyebrow'>): string {
  return pageShell({ ...input, eyebrow: setupEyebrow() });
}

/** 六种 op 同走 `receipt` 形（本域只有一条命令、一个形状；`receipt` 形只校验 `ok`／`message` 两格，
 *  其余字段是各 op 自己的事实，照 `../shared/commandSpec.js` 的写入域口径办）。 */
export function receiptEnvelopeOf(key: string, data: { readonly ok: boolean; readonly message: string } & Record<string, unknown>): SerializableEnvelope {
  return { version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: sceneKeyOf(key), data };
}

/** 缺值占位（`#688` 裁定 4）。 */
export const MISSING = '—';

/** 一个值写成上屏文本：空白串与缺值一律 `—`（不写 `undefined`、不留空）。 */
export function textOrDash(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : v === null || v === undefined ? '' : String(v);
  return s === '' ? MISSING : s;
}

/** 字节数写成人话（列表页与回执页共用 `./backups.js` 那一处算式，本件只转出）。 */
export { humanBytes };

/** 类型徽章那一串（唤醒词 ＋ 口径 ＋ 状态徽章 ＋ 下一步动作）：形状照写入域／账户域同一套。 */
export function badgeOf(input: {
  readonly word: string;
  readonly caliber: string;
  readonly status: StatusKind;
  readonly statusText: string;
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

/** 步骤条的**进度面**：一枚 `共 N 步` ＋ 每步一枚 `第 N 步 · 步骤名 · 状态`。
 *  空数组＝不出（「没内容不留空块」）；**不在这里判全部通过**——状态是 `./steps.js` 算好的事实。 */
export function stepChipsOf(steps: readonly WizardStep[]): string {
  if (steps.length === 0) return '';
  return renderChips({
    items: [{ text: m('skill-bill.setup-pageParts.c002', { p0: String(String(steps.length)) }) }].concat(
      steps.map((s) => ({ text: m('skill-bill.setup-pageParts.c003', {
        p0: String(String(s.no)),
        p1: String(s.label),
        p2: String(stepStateText(s.state)),
      }) })),
    ),
  });
}

/** 步骤条的**说明面**：每一步一行（第几步／步骤名／现在什么情况／状态）。
 *  这一张表是「徽章列承载不了的不足处」的域内落点，见本件头注释那条口径。 */
export function stepTableOf(steps: readonly WizardStep[]): string {
  if (steps.length === 0) {
    return renderEmptyBlock({ text: m('skill-bill.setup-pageParts.c004'), hint: m('skill-bill.setup-pageParts.c005') });
  }
  const columns: readonly DataTableColumn[] = [
    { key: 'step', label: m('skill-bill.setup-pageParts.c006') },
    { key: 'label', label: m('skill-bill.setup-pageParts.c007') },
    { key: 'state', label: m('skill-bill.setup-pageParts.c008') },
    { key: 'detail', label: m('skill-bill.setup-pageParts.c009') },
  ];
  const rows: readonly DataTableRow[] = steps.map((s) => ({
    step: m('skill-bill.setup-pageParts.c010', { p0: String(String(s.no)), p1: String(String(steps.length)) }),
    label: s.label,
    state: stepStateText(s.state),
    detail: s.detail,
  }));
  return renderDataTable({ columns, rows, caption: m('skill-bill.setup-pageParts.c011') });
}

/** 环境检测那一格：老侧 `init_wizard.html:155` 空 `env.checks` 时回落渲染绿色「✓ 全部通过」＝**假绿**
 *  （`#688` §二 D7／`.scratch/t731/old-setup.md` §7(c)）——**不照抄**：
 *  本件对「一项都没检测到」和「检测项都过了」出**两句不同的话**，且前者不给绿灯。 */
export function envChecksOf(checks: readonly { readonly label: string; readonly ok: boolean; readonly detail: string }[]): string {
  if (checks.length === 0) {
    return renderCaliberLine(m('skill-bill.setup-pageParts.c012'));
  }
  const columns: readonly DataTableColumn[] = [
    { key: 'label', label: m('skill-bill.setup-pageParts.c013') },
    { key: 'ok', label: m('skill-bill.setup-pageParts.c014') },
    { key: 'detail', label: m('skill-bill.setup-pageParts.c015') },
  ];
  const rows: readonly DataTableRow[] = checks.map((c) => ({
    label: c.label,
    ok: c.ok ? m('skill-bill.setup-pageParts.c016') : m('skill-bill.setup-pageParts.c017'),
    detail: c.detail,
  }));
  return renderDataTable({ columns, rows, caption: m('skill-bill.setup-pageParts.c018') });
}

/** 字段卡的一格（普通数据：参数名／中文名／怎么给／是否必需）。 */
export function slotFieldsOf(params: Record<string, unknown>, fields: readonly SetupSlot[]): ParamFieldInput[] {
  return fields.map((f) => {
    const raw = params[f.name];
    const value = raw === true ? m('skill-bill.setup-pageParts.c019') : raw === false || raw === undefined || raw === null ? '' : String(raw).trim();
    return {
      name: f.name,
      label: f.label,
      hint: f.hint,
      ...(f.required ? { required: true } : {}),
      ...(value === '' ? {} : { value }),
    };
  });
}

/** 缺项阻断条（照 `#688` 裁定 9 的同一条判法：缺什么就不给复制）：一边点名缺哪几项，
 *  一边给只读的补齐口令（不给复制按钮——页面上那条口令只给看不给复制，与账户域同形）。 */
export function blockedOf(input: {
  readonly blocked: readonly SetupBlocked[];
  readonly command: string;
}): string {
  if (input.blocked.length === 0) return '';
  return renderChips({ items: input.blocked.map((b) => ({ text: b.label })) })
    + renderDataTable({
      columns: [{ key: 'label', label: m('skill-bill.setup-pageParts.c020') }, { key: 'why', label: m('skill-bill.setup-pageParts.c021') }],
      rows: input.blocked.map((b) => ({ label: b.label, why: b.why })),
      caption: m('skill-bill.setup-pageParts.c022'),
    })
    + renderPreBlock({ command: input.command, label: m('skill-bill.setup-pageParts.c023') })
    + renderCaliberLine(m('skill-bill.setup-pageParts.c024'));
}

/** 复制指令块（过程型页的「照这句跟助手说一遍」）：走公共层 `renderPreBlock` 自带复制按钮。 */
export function promptBlockOf(prompt: string, label = m('skill-bill.setup-pageParts.c025')): string {
  return renderPreBlock({
    label,
    command: prompt,
    actionId: 'ilife-setup-prompt',
    copyText: prompt,
    copyLabel: label,
  });
}

/** 复制区（数据位 ＋ 日志位；三格式与双按钮由共用件给）。人话三份＋提示由调用方经 `copy` 单对象透传（照分析域范例；缺省走薄信封）。 */
export function copyZoneOf(input: {
  readonly envelope: SerializableEnvelope;
  readonly title: string;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly source: string;
  readonly detail: string;
  readonly actionAt: string;
  /** 人话三份＋提示单对象（给了即覆写；不给＝旧投影）。 */
  readonly copy?: SetupCopy;
}): string {
  return copyArea({
    ...(input.copy?.hints === undefined ? {} : { hints: input.copy.hints }),
    data: { envelope: input.envelope, title: input.title },
    ...(input.copy?.text === undefined ? {} : { dataText: input.copy.text }),
    ...(input.copy?.json === undefined ? {} : { dataJson: input.copy.json }),
    ...(input.copy?.csv === undefined ? {} : { dataCsv: input.copy.csv }),
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

/** 空态（含「接下来怎么办」那一句）。 */
export function emptyOf(input: { readonly title?: string; readonly text: string; readonly next: string }): string {
  return renderEmptyBlock({ ...(input.title === undefined ? {} : { title: input.title }), text: input.text, hint: input.next });
}

/** 来源脚注（三片页型的每张页恒出，照 `#688` §五 5.2 第 26 行）。 */
export function sourceNoteOf(input: {
  readonly sourceText: string;
  readonly start: string;
  readonly end: string;
  readonly count: number;
}): string {
  return sourceLine({ source: input.sourceText, start: input.start, end: input.end, count: input.count });
}

/** 补齐口令：缺的值留成尖括号占位符（照账户域同件；`state` 那一格不是参数名，单给一条映射）。 */
export function blockedCommandOf(
  key: string,
  params: Record<string, unknown>,
  blocked: readonly { readonly name: string; readonly label: string }[],
): string {
  const filled: Record<string, unknown> = { ...params };
  for (const b of blocked) filled[b.name] = '<' + b.label + '>';
  return commandLine(key, filled);
}

/** 场景口令（过程型页复制的那一段）：说清是哪条词、每一格填什么。
 *  空着的格写 `____`（必填）或 `____（选填）`，与老侧复制文本的占位写法同义。 */
export function promptOf(
  word: string,
  slots: readonly SetupSlot[],
  params: Record<string, unknown>,
): string {
  const lines = slots.map((s) => {
    const raw = params[s.name];
    const v = raw === true ? m('skill-bill.setup-pageParts.c026') : raw === false || raw === undefined || raw === null ? '' : String(raw).trim();
    const blank = s.required ? '____' : m('skill-bill.setup-pageParts.c027');
    return '  ' + s.label + ': ' + (v === '' ? blank : v);
  });
  return m('skill-bill.setup-pageParts.c028', { p0: String(word), p1: String(lines.join('\n')) });
}

/** 复制日志第 3 段／来源脚注那两句来源（给机器看的可带载体名，上屏的只写人话——`#688` 裁定 1）。
 *  `#1214`：六个都改成**函数**按语言取词（模块级常量会把语言固化成 zh）。 */
export function sourceRead(): string { return m('skill-bill.setup-pageParts.c029'); }
export function sourceReadText(): string { return m('skill-bill.setup-pageParts.c030'); }
export function sourceWrite(): string { return m('skill-bill.setup-pageParts.c031'); }
export function sourceWriteText(): string { return m('skill-bill.setup-pageParts.c032'); }
export function sourceFile(): string { return m('skill-bill.setup-pageParts.c033'); }
export function sourceFileText(): string { return m('skill-bill.setup-pageParts.c034'); }

/** 四步／明细行的一条（原型 `li > .idx + .entry-text + small`）。 */
export interface SetupRowInput {
  /** 编号胶囊里的字（原型是步号；查看备份那一页是 `★`）。 */
  readonly no: string;
  /** 主行文本。 */
  readonly text: string;
  /** 次行小字（缺省不出）。 */
  readonly sub?: string;
  /** 胶囊状态（缺省＝原型无色档 `.idx`）。 */
  readonly tone?: 'done' | 'now' | 'todo' | 'ok' | 'bad';
  /** 整行走实付高亮档（原型 `li.pay`，查看备份那一页用）。 */
  readonly pay?: boolean;
  /** 胶囊里画星不画序号（原型 `.idx` 里那颗 `★`）。 */
  readonly star?: boolean;
}

/** 一张明细卡（原型 `.entry-card > ol.entry-rows`）：编号胶囊 ＋ 主行 ＋ 可选次行。 */
export function setupEntryCard(rows: readonly SetupRowInput[]): string {
  if (rows.length === 0) return '';
  const items = rows.map((r) => {
    const cls = r.pay === true ? 'is-pay' : r.tone === undefined ? '' : 'is-' + r.tone;
    const withStar = r.star === true ? (cls === '' ? 'is-star' : cls + ' is-star') : cls;
    return '<li' + (withStar === '' ? '' : ' class="' + withStar + '"') + '>'
    + '<span class="ilife-ticket-entry-text">' + escapeHtml(r.text)
    + (r.sub === undefined ? '' : '<span class="ilife-ticket-entry-sub">' + escapeHtml(r.sub) + '</span>')
    + '</span></li>';
  }).join('');
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">' + items + '</ol></div>';
}

/** 对账小结行（原型 `.check-mini`）：常档绿、`is-warn` 黄、`is-danger` 红。 */
export function setupCheck(text: string, tone?: 'warn' | 'danger'): string {
  return '<div class="ilife-ticket-check' + (tone === undefined ? '' : ' is-' + tone) + '">'
    + '<span class="ilife-ticket-check-dot" aria-hidden="true"></span><span>' + escapeHtml(text) + '</span></div>';
}

/** 口令框（原型 `.prompt-box`）：一句引导 ＋ 一行等宽口令。 */
export function setupPromptBox(lead: string, mono: string): string {
  return '<div class="ilife-ticket-prompt">' + escapeHtml(lead) + '<br>'
    + '<span class="ilife-ticket-prompt-mono">' + escapeHtml(mono) + '</span></div>';
}
