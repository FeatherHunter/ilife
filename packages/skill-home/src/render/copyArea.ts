// 渲染层·复制区共用件：复制数据（三格式菜单）＋复制日志（六段），只接线不重造。
//
// 谁在用（写得出哪两个在用）：全部 8 个页域的 46 个页族模块（`src/<域>/pages/*.ts` 的
// `renderFamilyPage` 尾部的复制区）与降级分节页（`src/cli/cmd_read.ts` 的 `sectionHtml`）。
// 三件东西只接线（base-render 侧改动为零）：
// ① 复制按钮与区块 → `base-paint/blocks` 的 `renderCopyBlock`；
// ② 复制文本 → `base-paint` 的 `buildDataText`／`buildLogText`；
// ③ 复制运行时 → 页面模板 `<!--SHARED-HELPERS-->` 槽的 `buildSharedHelpersJs` 产出（见 `html.ts`）。
//
// 对外 3 个名字（铁律五≤5）：`homeCopyArea`／`homeCopyLog`／`homeNowStamp`。入参类型不导出，调用方传字面量即可。
// 数据位恒出三格式菜单（卡路里 `copyArea.ts:119-122` 定案口径）：`data` 在场即出「复制数据 ＋
// 纯文本／JSON／CSV 三选一」，调用方不用声明开关；无 command 时只出单按钮，不留死按钮。
import { renderCopyBlock, renderEmptyBlock } from 'base-paint/blocks';
import { buildDataText, buildLogText } from 'base-paint';
import type { CopyLogFields, SerializableEnvelope } from 'base-paint';
import type { Envelope } from 'base-link-core';
import { DEFAULT_DB_FILENAME } from '../fetch/index.js';

/** 日志第 2 段（AI 思考链）：本仓页面一律由本地 CLI 渲染，不落占位。 */
const LOG_THINKING = '本页由本地 CLI 渲染，无 AI 链';
/** 日志第 6 段（异常）：正常产出即「无」。 */
const LOG_EXCEPTION = '无';
/** 复制区空态缺省句：三样全没给时出这一句、不出按钮。 */
const COPY_EMPTY_TEXT = '本页没有可复制的数据';

/** 三格式菜单三项的用途提示：本技能一律留空（顺序＝`COPY_FORMATS`），只留三个格式名。 */
const MENU_HINTS: readonly string[] = ['', '', ''];

/** `homeCopyArea` 的可填位：给了什么出什么；`data`＋`log` 都不给＝一句空态、不出按钮。
 *
 * `envelope` 取本仓 `base-link-core` 的 `Envelope`（页模块手里就是这一只）：`base-paint` 的
 * `SerializableEnvelope` 无 `fallback` 形，而页族 envelope 永不取该形（视图键仅 list／detail／
 * receipt／stat；数据族 resultset 不进页族）；收口在本件内转一次，调用方不替公共层做类型体操。运行时 `buildDataText`／
 * `buildLogText` 逐 shape 校验，错形 fail-closed（不返空串）。 */
export interface HomeCopyAreaInput {
  /** 区块标题；不给＝不出标题；与复制按钮同名（「复制数据」）＝不出标题（只留动作）。 */
  readonly title?: string;
  /** 给了就出「复制数据」（三格式菜单），内部走 `buildDataText`。 */
  readonly data?: { readonly envelope: Envelope; readonly title?: string; readonly occurredAt?: string };
  /** 给了就出「复制日志」，内部走 `buildLogText`。 */
  readonly log?: { readonly envelope: Envelope; readonly copyLog?: CopyLogFields };
  /** 三样全没给时的那句话（缺省见 `COPY_EMPTY_TEXT`）。 */
  readonly emptyText?: string;
}

/** 复制日志 2–6 段入参：本次执行的过程证据（第 1 段场景标识由 envelope 派生，不在这里填）。 */
export interface HomeCopyLogInput {
  /** 渲染本页的命令原文，可照抄重跑（含本次 `--params`）。 */
  readonly command: string;
  /** 本次数据来源（第 3 段后半，如 `home.db ｜ 物品与位置聚合只读`）。 */
  readonly source?: string;
  /** 写库回执的整行（第 4 段后半；库里写了哪些字段、影响几行）。 */
  readonly m5Line?: string;
  /** 时间戳（第 5 段）：只读页给渲染时刻，写库页给回执 `actionAt`。必填，本件不自己取时钟。 */
  readonly actionAt: string;
  /** 文档版本（第 5 段后半）；不给则不写这半句。 */
  readonly version?: string;
}

/** 与按钮同名的标题只留按钮（`renderCopyBlock` 侧同口径兜底，直调同样生效）。 */
const COPY_TITLE_DUP_OF_BUTTON = '复制数据';

/** 三格式入参：`data` 位那份数据 → 三种格式各算一份 ＋ 菜单提示（内转 `SerializableEnvelope`，见上）。 */
function formatsOf(data: { readonly envelope: Envelope; readonly title?: string; readonly occurredAt?: string }): {
  readonly text: string;
  readonly json: string;
  readonly csv: string;
  readonly hints: readonly string[];
} {
  const serializable = data.envelope as unknown as SerializableEnvelope;
  const rest = { ...(data.title === undefined ? {} : { title: data.title }), ...(data.occurredAt === undefined ? {} : { occurredAt: data.occurredAt }) };
  return {
    text: buildDataText({ ...rest, envelope: serializable, format: 'text' }),
    json: buildDataText({ ...rest, envelope: serializable, format: 'json' }),
    csv: buildDataText({ ...rest, envelope: serializable, format: 'csv' }),
    hints: MENU_HINTS,
  };
}

/** 本仓唯一的时间戳口径（`YYYY-MM-DD HH:MM:SS` 本地时，与卡路里 `nowStamp` 同形）。 */
export function homeNowStamp(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

/** 复制区：`data`／`log` 给了什么出什么；都不给＝一句空态、不出按钮。 */
export function homeCopyArea(input: HomeCopyAreaInput): string {
  const data = input.data;
  const log = input.log;
  const title = input.title === COPY_TITLE_DUP_OF_BUTTON ? undefined : input.title;
  if (data !== undefined || log !== undefined) {
    return renderCopyBlock({
      ...(title === undefined ? {} : { title }),
      ...(data === undefined ? {} : { dataFormats: formatsOf(data) }),
      ...(log === undefined ? {} : {
        logText: buildLogText({
          envelope: log.envelope as unknown as SerializableEnvelope,
          ...(log.copyLog === undefined ? {} : { copyLog: log.copyLog }),
        }),
      }),
    });
  }
  return renderEmptyBlock({
    ...(title === undefined ? {} : { title }),
    text: input.emptyText ?? COPY_EMPTY_TEXT,
  });
}

/** 复制日志 2–6 段：本页由哪条命令渲染、数据从哪来、写了多少行、什么时候。 */
export function homeCopyLog(input: HomeCopyLogInput): CopyLogFields {
  return {
    thinking: LOG_THINKING,
    dataStructure: DEFAULT_DB_FILENAME + (input.source === undefined || input.source === '' ? '' : ' ｜ ' + input.source),
    callChain: input.m5Line === undefined || input.m5Line === '' ? input.command : input.command + ' ｜ ' + input.m5Line,
    timestamp: input.version === undefined || input.version === '' ? input.actionAt : input.actionAt + ' · 版本 ' + input.version,
    exception: LOG_EXCEPTION,
  };
}
