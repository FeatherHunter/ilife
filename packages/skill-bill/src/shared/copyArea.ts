/** 复制与提示共用件：复制 prompt 区、复制区（数据位＋日志位）、复制日志的入参。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/collect.ts`——过程型采集页：`promptCopyArea`（复制 prompt 区）＋ `copyArea`（复制数据／日志）；
 *   ② `src/record/receipt.ts`——结果型回执整页：`copyArea`（复制数据／日志）＋ `copyLog`。
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
import { renderCopyBlock, renderEmptyBlock, renderPreBlock } from 'base-paint/blocks';
import { buildDataText, buildLogText } from 'base-paint';
import type { CopyLogFields, DataTextInput, LogTextInput } from 'base-paint';

/** 日志第 2 段（AI 思考链）：本仓页面一律由本地 CLI 渲染，不落 `(未知)` 占位。 */
const LOG_THINKING = '本页由本地 CLI 渲染，无 AI 链';
/** 日志第 6 段（异常）：正常产出即「无」。 */
const LOG_EXCEPTION = '无';
/** 复制区空态缺省句（三样全没给时出这一句、不出按钮——点了没反应的死按钮就是问题）。 */
const COPY_EMPTY_TEXT = '本页没有可复制的数据';
/** 复制数据三格式菜单里三项的用途提示（纯文本／JSON／CSV，顺序＝`COPY_FORMATS`）。 */
const MENU_HINTS: readonly string[] = ['粘贴给 AI / 自己看', '结构化存档', '表格导入'];

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
  /** 时间戳（第 5 段）：**必填，本件不自己取时钟**——共用位不反向依赖渲染层，时间戳由页面层供给。 */
  readonly actionAt: string;
  /** 文档版本（第 5 段后半）；不给则不写这半句。 */
  readonly version?: string;
}

/** ① 复制 prompt 区：prompt 预览（`renderPreBlock`）＋ 它自带的复制按钮。
 *  第二参可选：不给＝小标题「复制 prompt（必走）」；`null`＝不出小标题；给字符串就用它。 */
export function promptCopyArea(prompt: string, label?: string | null): string {
  const heading = label === undefined ? '复制 prompt（必走）' : label;
  return renderPreBlock({
    ...(heading === null ? {} : { label: heading }),
    command: prompt,
    copyText: prompt,
    copyLabel: '复制 prompt',
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

/** 数据位的那份数据 → 三种格式各算一份 ＋ 菜单提示（`buildDataText` 是本仓复制文本的唯一出口）。 */
function formatsOf(data: DataTextInput): {
  readonly text: string;
  readonly json: string;
  readonly csv: string;
  readonly hints: readonly string[];
} {
  return {
    text: buildDataText({ ...data, format: 'text' }),
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
