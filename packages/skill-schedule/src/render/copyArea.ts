// 渲染层·复制区共用件：复制数据（三格式菜单）＋复制日志（六段），只接线不重造。
//
// 谁在用（写得出哪两个在用）：① 六张页型的复制区——`src/shared/dayPage.ts`（今天总结）、
// `detailPage.ts`（作息详情）、`overviewPage.ts`（24h 概览／查多日计划）、`planPage.ts`（查日程）、
// `rangePage.ts`（汇总作息）、`weekPage.ts`（周视图）；② 各能力目录自己装配的页——
// `src/write/writeDocs.ts`（四张写库回执）、`src/plan/*Docs.ts`（回执／商量／复盘／飞书）、
// `src/analyze/analyzeDocs.ts`（三张分析页）、`src/admin/adminDocs.ts`（两张辅助与管理页）。
// 三件东西只接线（技能侧不重造、公共层侧一字不动）：
// ① 复制按钮与区块 → `base-paint/blocks` 的 `renderCopyBlock`（三格式走它的 `dataFormats` 分支）；
// ② 复制文本 → `base-paint` 的 `buildDataText`／`buildLogText`；
// ③ 复制运行时 → 页面模板 `<!--SHARED-HELPERS-->` 槽的 `buildSharedHelpersJs` 产出（见 `html.ts`）。
//
// 对外 3 个名字（铁律五≤5）：`scheduleCopyArea`／`scheduleCopyLog`／`scheduleNowStamp`
// （入参两个类型随件导出，与居家那份同口径）。与居家那份的唯一区别：作息这一侧的 envelope 由
// **本包自己的** `buildScheduleEnvelope(key, payload)` 建（`./envelope.ts`，形状表读生成的
// `src/cli/keys.ts`），所以调用方给的是**真命令的 key ＋ 载荷**——八个 key 的形状都落在可序列化
// 五形里（list／detail／stat／receipt／analysis），本件不手写信封、也不在技能侧搓按钮。
import { renderCopyBlock } from 'base-paint/blocks';
import { buildDataText, buildLogText } from 'base-paint';
import type { CopyLogFields, SerializableEnvelope } from 'base-paint';
import type { EnvelopeDataByShape, EnvelopeShape } from 'base-link-core';
import { buildScheduleEnvelope } from './envelope.js';
import { DEFAULT_DB_FILENAME } from '../fetch/index.js';

/** 日志第 2 段（AI 思考链）：本仓页面一律由本地 CLI 渲染，不落占位。 */
const LOG_THINKING = '本页由本地 CLI 渲染，无 AI 链';
/** 日志第 6 段（异常）：正常产出即「无」。 */
const LOG_EXCEPTION = '无';

/** 三格式菜单三项的用途提示：本技能一律留空（顺序＝`COPY_FORMATS`），只留三个格式名。 */
const MENU_HINTS: readonly string[] = ['', '', ''];

/** 一张页复制区的载荷：数据位＝一条真命令的 key ＋ 该 key 形状的载荷（本件建 envelope 出三份文本）。
 *
 *  `key` 是 `SCHEDULE_KEY_SHAPES` 里那八个之一（形状由它定：`list`／`detail`／`stat`／`receipt`／
 *  `analysis`），`payload` 就是这条命令 `data` 位那一份（`EnvelopeDataByShape[shape]`）——错形在
 *  `buildScheduleEnvelope` 里当场 throw（fail-closed，不返空串冒充）。
 *  页型函数负责补 `title`（复制区里装的是哪一份文本，**声明位、不上屏**，见 `scheduleCopyArea` 件头）
 *  与两个 actionId：那是**页的常量**，不是调用方的口径。 */
export interface ScheduleCopyAreaInput {
  /** 这一页是哪条命令出的（八键之一）。数据位与日志位共用这一个场景。 */
  readonly key: string;
  /** 该 key 形状的载荷（页上正在讲的那一份数据）。 */
  readonly payload: EnvelopeDataByShape[EnvelopeShape];
  /** 日志位第 2–6 段（走 `scheduleCopyLog` 建）：给了就出「复制日志」六段（不给＝只出数据位那颗按钮）。
   *  第 1 段场景标识与数据位同源（同一个 key／载荷），本件不另要一份。 */
  readonly log?: CopyLogFields;
  /** 复制区标题（**声明位，不上屏**，见 `scheduleCopyArea` 的件头）：说的是「这一区装的是哪一份文本」；
   *  页型函数给的固定句如「复制与留档」／「复制初始化结果」／「复制初始化 prompt」／「复制给 AI」。
   *  #906 之前它被透传成按钮上方那行 `<h2>`，与紧挨着的「复制数据」按钮重复，现不再渲染。 */
  readonly title?: string;
  /** 数据位输出头覆盖；不给＝公共层缺省头（`【schedule · <key>】`）。 */
  readonly dataTitle?: string;
  /** 数据位的时间行（给了才出）；缺省不出。 */
  readonly occurredAt?: string;
  /** 数据位按钮的 id（页内唯一；页型函数给）。 */
  readonly dataActionId?: string;
  /** 日志位按钮的 id（页内唯一；页型函数给）。 */
  readonly logActionId?: string;
}

/** 复制日志 2–6 段入参：本次执行的过程证据（第 1 段场景标识由 envelope 派生，不在这里填）。 */
export interface ScheduleCopyLogInput {
  /** 渲染本页的命令原文，可照抄重跑（含本次 `--params`）。 */
  readonly command: string;
  /** 本次数据来源（第 3 段后半，如 `作息记录表`）。 */
  readonly source?: string;
  /** 写库回执的整行（第 4 段后半；库里写了哪些字段、影响几行）。 */
  readonly m5Line?: string;
  /** 时间戳（第 5 段）：只读页给渲染时刻，写库页给回执时刻。必填，本件不自己取时钟。 */
  readonly actionAt: string;
  /** 文档版本（第 5 段后半）；不给则不写这半句。 */
  readonly version?: string;
}

/** 本仓唯一的时间戳口径（`YYYY-MM-DD HH:MM:SS` 本地时，与卡路里／居家两份同形）。 */
export function scheduleNowStamp(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

/** 复制日志 2–6 段：本页由哪条命令渲染、数据从哪来、写了多少行、什么时候。 */
export function scheduleCopyLog(input: ScheduleCopyLogInput): CopyLogFields {
  return {
    thinking: LOG_THINKING,
    dataStructure: DEFAULT_DB_FILENAME + (input.source === undefined || input.source === '' ? '' : ' ｜ ' + input.source),
    callChain: input.m5Line === undefined || input.m5Line === '' ? input.command : input.command + ' ｜ ' + input.m5Line,
    timestamp: input.version === undefined || input.version === '' ? input.actionAt : input.actionAt + ' · 版本 ' + input.version,
    exception: LOG_EXCEPTION,
  };
}

/** 三格式入参：`payload` 那一份数据 → 三种格式各算一份 ＋ 菜单提示（envelope 由本件建，见件头）。 */
function formatsOf(input: ScheduleCopyAreaInput, envelope: SerializableEnvelope): {
  readonly text: string;
  readonly json: string;
  readonly csv: string;
  readonly hints: readonly string[];
} {
  const rest = {
    ...(input.dataTitle === undefined ? {} : { title: input.dataTitle }),
    ...(input.occurredAt === undefined ? {} : { occurredAt: input.occurredAt }),
  };
  return {
    text: buildDataText({ ...rest, envelope, format: 'text' }),
    json: buildDataText({ ...rest, envelope, format: 'json' }),
    csv: buildDataText({ ...rest, envelope, format: 'csv' }),
    hints: MENU_HINTS,
  };
}

/** 复制区：数据位恒出三格式菜单（纯文本／JSON／CSV 三选一）；日志位给了就出六段。
 *
 *  **本区不落屏 `title`**（#906，2026-09-22 人滚墙后裁）：`title` 说的是「这一区装的是哪一份文本」
 *  （`复制与留档`／`复制初始化结果`／`复制初始化 prompt`／`复制给 AI` 四种字面），原先透传给公共层，
 *  由 `renderCopyBlock` 渲染成按钮**正上方**那行 `<h2 class="ilife-block-copy-block-title">`。
 *  实测那样等于同一件事印两遍：紧挨着的按钮自己写着「复制数据」／「复制日志」，
 *  页内导航（`.ilife-block-toc`）也拿同一串字当锚点名（61 页里 50 页如此）。
 *  故这里**只收声明、不上屏**：`title` 字段与 30 处调用点原样保留，将来公共层若要把它渲染到别处
 *  （如页头或工具条的说明位），一处接线即生效。
 *
 *  为什么不在公共层 `renderCopyBlock` 上删：那一支是六家技能共用的件（卡路里／备忘录／居家都印这行标题），
 *  删它会顺带改掉别家的产物；本票只治作息这一家，公共层一字不动。 */
export function scheduleCopyArea(input: ScheduleCopyAreaInput): string {
  const envelope = buildScheduleEnvelope(input.key, input.payload) as unknown as SerializableEnvelope;
  const log = input.log;
  return renderCopyBlock({
    dataFormats: formatsOf(input, envelope),
    ...(input.dataActionId === undefined ? {} : { dataActionId: input.dataActionId }),
    ...(log === undefined ? {} : {
      logText: buildLogText({ envelope, copyLog: log }),
      ...(input.logActionId === undefined ? {} : { logActionId: input.logActionId }),
    }),
  });
}
