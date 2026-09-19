/** 复制与提示共用件：复制 prompt 区、复制区（数据位＋日志位）、复制日志的入参。
 *
 * 谁在用（两个能力，指名）：
 *   ① `src/write/`——写入域：过程型采集页（复制 prompt 区 ＋ 复制数据／日志）与结果型回执整页（复制数据／日志）；
 *   ② `src/query/`——查询域：通用查询列表页的复制数据／日志两条通道（不设 prompt 区——查询不写库，没有要交回助手的一句）。
 *  （写域 32 份产物按本件的字面量冻结，查询域只引用、不改这里的任何一句。）
 *
 * 三件东西**只接线、不重造**：
 *   ① 复制按钮与区块 → `base-paint/blocks` 的 `renderPreBlock`（带 `copyText` 自带复制按钮）与 `renderCopyBlock`；
 *   ② 复制文本 → `base-paint` 的 `buildDataText`（数据投影）／`buildLogText`（六段日志）；
 *   ③ 复制成功与失败的提示 → 页面运行时 `buildSharedHelpersJs` 自带（本文件不产第二条提示通道）。
 *
 * 口径出处：照 `packages/skill-calorie/src/shared/copyArea.ts`（照结构，不照文件）。
 *   两处按饼干的情形改了口径：
 *   - 卡路里的 `promptCopyArea` 走它包内的 `render/copy.js`（`copyActionHtml`，缺省文案是卡路里说法）；
 *     本件改走 base 现成组件的 `renderPreBlock({copyText})`——**不新增 base 组件、不动别包**，
 *     复制按钮与逻辑全在 base 侧；
 *   - 日志第 3 段的库文件名**由调用方给**（`CopyLogInput.source`），共用件不取本包文件名
 *     （`docs/skills/skill-bill/t406-共用件依赖与提升改造清单.md` 第二节 `DB_FILENAME` 行）。
 */
import { renderCaliberLine, renderCopyBlock, renderEmptyBlock, renderPreBlock } from 'base-paint/blocks';
import { buildDataText, buildLogText } from 'base-paint';
import type { CopyLogFields, DataTextInput, LogTextInput } from 'base-paint';

/** 日志第 2 段（助手思考链）：本仓页面一律由本地 CLI 渲染，不落 `(未知)` 占位。 */
const LOG_THINKING = '本页由本地渲染，无助手链';
/** 日志第 6 段（异常）：正常产出即「无」。 */
const LOG_EXCEPTION = '无';
/** 复制区空态缺省句（三样全没给时出这一句、不出按钮——点了没反应的死按钮就是问题）。 */
const COPY_EMPTY_TEXT = '本页没有可复制的数据';

/** 本次执行时刻串（页面入参 `actionAt`／回执事实 `actionAt` 的**唯一定义地**）：本地时钟 `YYYY-MM-DD HH:MM:SS`。
 *  写域与查询域两张页都读它——搬迁前它分别是 `src/write/write.ts` 的文件级函数与查询域现取的钟，
 *  第二个用法（查询域列表页，票 #411）长出来之后收成这一处；**取时钟仍在各域处理体那一步调它**，
 *  共用位不自己在模块顶层取时钟（那样一次调用两次读数会不一致）。 */
export function actionStamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}
/** 复制数据三格式菜单里三项的用途提示（纯文本／JSON／CSV，顺序＝`COPY_FORMATS`）。
 *  格式名保留（那是数据格式本来的样子，不是内部标识），只说清它拿去做什么。 */
const MENU_HINTS: readonly string[] = ['纯文本 粘贴给助手或自己看', 'JSON 结构化存档', 'CSV 表格导入'];

/** `copyArea` 的可填位：给了什么出什么，0–3 颗按钮。 */
interface CopyAreaInput {
  /** 给了就出「prompt 预览块 ＋ 复制按钮」。 */
  readonly prompt?: string | { readonly text: string; readonly label?: string };
  /** 给了就出「复制数据」（三格式菜单），内部走 `buildDataText`。 */
  readonly data?: DataTextInput;
  /** 给了就出「复制日志」，内部走 `buildLogText`。 */
  readonly log?: LogTextInput;
  /** 三样全没给时的那句话（缺省也有一句，见 `COPY_EMPTY_TEXT`）。 */
  readonly emptyText?: string;
}

/** 复制日志的入参：本次执行的过程证据（第 1 段「场景标识」由 envelope 派生，不在这里填）。 */
interface CopyLogInput {
  /** 渲染本页（或写库）的命令原文，可照抄重跑。 */
  readonly command: string;
  /** 本次数据来源（第 3 段），如「biscuit_accountant.db · bills（写库回执）」；库文件名由调用方给。 */
  readonly source?: string;
  /** 写库那一行的过程说明（第 4 段后半，如「影响 1 行 · 字段 category」）。 */
  readonly detail?: string;
  /** 时间戳（第 5 段）：**必填，本件不自己取时钟**——共用位不反向依赖页面装配那一层，时间戳由页面层供给。 */
  readonly actionAt: string;
  /** 文档版本（第 5 段后半）；不给则不写这半句。 */
  readonly version?: string;
}

/** 复制 prompt 区那段 prompt 的复制按钮动作号（固定一枚：同页只出一次 prompt 区）。
 *  小标题缺省那句 `复制 prompt（必走）` 里的 `prompt` 不上屏（本轮整改）——改「复制给助手：这一句可以直接复制」
 *  （总则②：写清这块复制走给谁；仍含老字串，护栏不断言全等只认包含）。 */
const PROMPT_COPY_ACTION = 'ilife-copy-prompt';
const PROMPT_COPY_HINT = '复制给助手：这一句可以直接复制';

/** ① 复制 prompt 区：prompt 预览（`renderPreBlock`）＋ 它自带的复制按钮。
 *  **`actionId` 必给**：公共层的 `renderPreBlock` 只在给了 `actionId` 时才渲染复制按钮
 *  （`packages/base-render/src/blocks.ts:729-736`），只给 `copyText` 会出一个「写着复制、其实没有按钮」的
 *  有标签没按钮位——那正是本票线上实测发现的一处，本件补齐。
 *  第二参可选：不给＝小标题「复制给助手：这一句可以直接复制」；`null`＝不出小标题；给字符串就用它。 */
export function promptCopyArea(prompt: string, label?: string | null): string {
  const heading = label === undefined ? PROMPT_COPY_HINT : label;
  return renderPreBlock({
    ...(heading === null ? {} : { label: heading }),
    command: prompt,
    actionId: PROMPT_COPY_ACTION,
    copyText: prompt,
    copyLabel: PROMPT_COPY_HINT,
  });
}

/** ② 复制区：prompt／数据／日志给了什么出什么；三样全不给＝一句空态、**不出按钮**。 */
export function copyArea(input: CopyAreaInput): string {
  const parts: string[] = [];
  const prompt = input.prompt;
  if (typeof prompt === 'string') {
    if (prompt !== '') parts.push(promptCopyArea(prompt));
  } else if (prompt !== undefined && prompt.text !== '') {
    parts.push(promptCopyArea(prompt.text, prompt.label ?? null));
  }
  if (input.data !== undefined || input.log !== undefined) {
    parts.push(renderCopyBlock({
      ...(input.data === undefined ? {} : { dataFormats: formatsOf(input.data) }),
      ...(input.log === undefined ? {} : { logText: buildLogText(input.log) }),
    }));
    return parts.join('');
  }
  if (parts.length > 0) return parts.join('');
  return renderEmptyBlock({ text: input.emptyText ?? COPY_EMPTY_TEXT });
}

/** 数据位的那份数据 → 三种格式各算一份 ＋ 菜单提示（`buildDataText` 是本仓复制文本的唯一出口）。
 *  上级裁定第 2 条：复制载荷头行 `【bill · record.add】` 算上屏一并改——`text` 那份显式给 `title`，
 *  不再让公共层按 `envelope.skill/key` 拼出命令名；`title` 只写用户说法，不带命令名与 `·`。 */
function formatsOf(data: DataTextInput): {
  readonly text: string;
  readonly json: string;
  readonly csv: string;
  readonly hints: readonly string[];
} {
  const title = typeof (data as { title?: unknown }).title === 'string'
    && ((data as { title?: string }).title ?? '').trim() !== ''
    ? (data as { title: string }).title
    : '记账数据';
  return {
    text: buildDataText({ ...data, format: 'text', title }),
    json: buildDataText({ ...data, format: 'json' }),
    csv: buildDataText({ ...data, format: 'csv' }),
    hints: MENU_HINTS,
  };
}

/** ③ 复制日志的第 2–6 段入参：本页由哪条命令渲染、数据从哪来、写了多少行、什么时候。 */
export function copyLog(input: CopyLogInput): CopyLogFields {
  return {
    thinking: LOG_THINKING,
    dataStructure: input.source === undefined || input.source === '' ? COPY_EMPTY_TEXT : input.source,
    callChain: input.detail === undefined || input.detail === '' ? input.command : input.command + ' ｜ ' + input.detail,
    timestamp: input.version === undefined || input.version === '' ? input.actionAt : input.actionAt + ' · 版本 ' + input.version,
    exception: LOG_EXCEPTION,
  };
}

/** 退出口那枚危险色出口标记的动作号。**故意不绑动作**：动作条场景按钮不带 `data-t`，点了不复制也不写库。 */
const EXIT_MARK_ACTION = 'ilife-exit-undo';
/** 退出口的标题与说明（本轮整改：`危险色出口` 是设计自指词，`restore` 是内部词，都不上屏）。 */
const EXIT_TITLE = '想反悔（撤销这一笔）';
const EXIT_NOTE = '要撤销这一笔，点下面那颗「复制数据」，里面带着一句撤销的话；撤销之后记录还在，随时可以恢复。';

/** ④ 回执页退出口：危险色出口标记 ＋ 一句去向说明（t407 根因整改二 D2 去重后）。
 *  改前这里另带一枚「复制数据」（撤销指令直拷，`ilife-exit-undo-copy`）＋ base #336
 *  自动补的一枚置灰「复制日志」，与下面复制区那组「复制数据／复制日志」上下重复。
 *  改后退出口只留标记与说明、不带任何复制按钮与 `data-t`；撤销指令走下面复制区那颗
 *  「复制数据」（复制载荷里仍带可重跑命令，`data-t` 形状不动）。 */
export function undoExit(recordId: number): string {
  return renderCopyBlock({
    title: EXIT_TITLE,
    buttons: [{ label: '↩︎ 撤销这一笔', kind: 'red', actionId: EXIT_MARK_ACTION }],
  }) + renderCaliberLine(EXIT_NOTE + '（记录编号 ' + recordId + '）');
}
