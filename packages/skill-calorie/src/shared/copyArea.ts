/** #239 · 复制与提示共用件：复制区（prompt／数据／日志）、复制日志的六段入参、静态提示块。
 *
 * 谁在用（写得出哪两个在用）：**基础信息**（`src/profile/` 三文件：预检确认页、两条写命令回执页、
 * 查档案结果页）与**七个页域文档**（`src/render/` 的 `dietDocs`／`sportDocs`／`sportPortDocs`／
 * `nutritionPortDocs`／`trendDocs`／`trendMiscPortDocs`／`wizardPortDocs`）。
 *
 * 三件东西**只接线、不重造**（base-render 侧改动为零，别的技能页面因此不受影响）：
 * ① 复制按钮与区块 → `base-paint/blocks` 的 `renderCopyBlock`（id 与文案取冻结表，卡路里侧不自造）；
 * ② 复制文本 → `base-paint` 的 `buildDataText`（#77 数据投影）／`buildLogText`（#77 六段日志）；
 * ③ 复制成功与失败的提示 → 页面运行时 `buildSharedHelpersJs` 自带（本文件不产第二条提示通道）。
 *
 * 老技能当年也是**一个组件**：`actionBar(payload)` 出「复制数据 ＋ 复制日志」两颗按钮，
 * `copyText` 负责两通道复制与兜底，`toast` 负责三种反馈（`公共组件/assets/base.js`，
 * 见设计 §一）。本文件收的是「50 处各自手写 `dataCopyArea('复制数据', {…})` 调用」这一层重复。
 *
 * 对外 5 个名字：`promptCopyArea`／`dataCopyArea`（#90 起既有，签名不动）＋
 * `copyArea`／`copyLog`／`notice`（#239 新增）。入参类型不导出——调用方传字面量即可
 * （同 `docPage.ts` 的 `DocPageInput`）。
 *
 * **#247（2026-09-12 用户裁定「恢复老仓原样」）**：`copyArea` 的 `data` 位增「三格式」开关
 * （`dataFormats`，缺省关＝逐字节不变；**场景 07 五张页先开**）：开了之后复制数据那颗按钮
 * 变成「复制数据 ▾ ＋ 纯文本／JSON／CSV 三选一菜单」，选中即复制并按所选格式报提示。
 * 菜单的样式与形态全在 base-render（`copyButton` 样式区 ＋ `renderActionBar` 的三格式分支 ＋
 * 页面运行时的菜单委派），本件只把三种格式**序列化好**递进去——序列化仍是 #77 的唯一出口。
 *
 * **今天有调用方的是前 4 个**：`promptCopyArea`／`dataCopyArea` 与场景 07 五张页用的
 * `copyArea`／`copyLog`。`notice` 还没有调用方（场景 07 四张页的反馈面已由页面运行时自带）——
 * 它是整批按域接线与 #238 返修时的提示出口，见 `docs/skills/skill-calorie/t239-delivery.md`。
 */
import { renderCopyBlock, renderEmptyBlock, renderFeedbackBlock, renderPreBlock } from 'base-paint/blocks';
import { buildDataText, buildLogText } from 'base-paint';
import type { CopyLogFields, DataTextInput, LogTextInput, ToastIcon } from 'base-paint';
import { DB_FILENAME } from '../paths.js';
import { copyActionHtml } from '../render/copy.js';

/** 日志第 2 段（AI 思考链）：本仓页面一律由本地 CLI 渲染，不落 `(未知)` 占位。 */
const LOG_THINKING = '本页由本地 CLI 渲染，无 AI 链';
/** 日志第 6 段（异常）：正常产出即「无」。 */
const LOG_EXCEPTION = '无';
/** 复制区空态缺省句（三样全没给时出这一句、不出按钮——点了没反应的死按钮就是问题）。 */
const COPY_EMPTY_TEXT = '本页没有可复制的数据';

/** 三格式菜单里三项的用途提示（**逐字取老仓** `卡路里/templates/crud_receipt.html` 的 `.fmt-menu`
 *  三行：纯文本「粘贴给 AI / 自己看」／JSON「结构化存档」／CSV「表格导入」）。顺序＝`COPY_FORMATS`。 */
const MENU_HINTS: readonly string[] = ['粘贴给 AI / 自己看', '结构化存档', '表格导入'];

/** `copyArea` 的 6 个可填位：给了什么出什么，0–3 颗按钮。 */
interface CopyAreaInput {
  /** 区块标题；不给＝不出标题（同 `renderCopyBlock` 口径）。 */
  readonly title?: string;
  /** 给了就出「prompt 预览块 ＋ 复制指令」（逐字复用今天 `promptCopyArea` 那两件）。 */
  readonly prompt?: string;
  /** 给了就出「复制数据」，内部走 `buildDataText`。 */
  readonly data?: DataTextInput;
  /** **三格式形态**（#247，2026-09-12 用户裁定「取老仓原样」）：**开在 `data` 上**——给了它就出
   *  「复制数据 ▾ ＋ 三选一菜单」（纯文本／JSON／CSV，选中即复制并报所选格式）；不给则照旧单格式。
   *  `true` ＝ 用老仓原样的用途提示；给对象则用它的 `hints`（不给也回落老仓原样）。
   *  序列化仍走 `buildDataText`（#77）：本件把三种格式各算一份递进去，不另立序列化口径。
   *  **`data` 位必须同时给**（菜单是「复制数据」那颗按钮的形态，没有数据就没有可复制的东西）。 */
  readonly dataFormats?: { readonly hints?: readonly string[] } | true;
  /** 给了就出「复制日志」，内部走 `buildLogText`。 */
  readonly log?: LogTextInput;
  /** 三样全没给时的那句话（缺省也有一句，见 `COPY_EMPTY_TEXT`）。 */
  readonly emptyText?: string;
}

/** 复制日志的入参：本次执行的过程证据（第 1 段「场景标识」由 envelope 派生，不在这里填）。 */
interface CopyLogInput {
  /** 渲染本页（或写库）的命令原文，可照抄重跑。 */
  readonly command: string;
  /** 本次数据来源（第 3 段后半，如写库回执的 `receipt.meta.source` ＝ `user_profile (写库回执)`）。 */
  readonly source?: string;
  /** 写库回执的 M5 整行（第 4 段后半；库里写了哪些字段、影响几行）。 */
  readonly m5Line?: string;
  /** 时间戳（第 5 段）：写库页给 `receipt.meta.actionAt`，只读页给渲染时刻 `nowStamp()`。
   *  **必填，本件不自己取时钟**——共用位不反向依赖渲染层，时间戳由页面层供给。 */
  readonly actionAt: string;
  /** 文档版本（第 5 段后半）；不给则不写这半句。 */
  readonly version?: string;
}

/** 静态提示块的入参：一句话 ＋ 可选详情。 */
interface NoticeInput {
  readonly msg: string;
  readonly detail?: string;
  /** 区块标题；不给＝不出标题。 */
  readonly title?: string;
  /** 图标（`renderToast` 的五种之一）；缺省 `info`——提示块不是复制按钮的副产物，
   *  别拿 `renderToast` 的缺省复制图标（📋）顶。 */
  readonly icon?: ToastIcon;
}

/** ① 复制 prompt 区：prompt 预览（`renderPreBlock`）＋复制按钮（旧模板 prompt-box＋btn-copy 的同形）。 */
export function promptCopyArea(prompt: string): string {
  return renderPreBlock({ label: '复制 prompt（必走）', command: prompt }) + copyActionHtml(prompt);
}

/** ② 复制区：prompt／数据／日志给了什么出什么；三样全不给＝一句空态、**不出按钮**。
 *
 *  `copyArea({ title, data })` 与 `dataCopyArea(title, data)` 产物**逐字相同**——其余 46 张页
 *  可以机械替换、字节不动（`test/copy-component-179.test.mjs` 钉住这条）。
 *  `dataFormats` 走**三格式形态**（#247）：三种格式各序列化一次，交给 `renderCopyBlock` 出菜单。
 *  只给 prompt 时不再补空态：prompt 区自己就有可复制的内容。 */
export function copyArea(input: CopyAreaInput): string {
  const data = input.data;
  const log = input.log;
  const parts: string[] = [];
  if (input.prompt !== undefined && input.prompt !== '') parts.push(promptCopyArea(input.prompt));
  if (data !== undefined || log !== undefined) {
    parts.push(renderCopyBlock({
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(data === undefined ? {} : input.dataFormats === undefined
        ? { dataText: buildDataText(data) }
        : { dataFormats: formatsOf(data, input.dataFormats) }),
      ...(log === undefined ? {} : { logText: buildLogText(log) }),
    }));
    return parts.join('');
  }
  if (parts.length > 0) return parts.join('');
  return renderEmptyBlock({
    ...(input.title === undefined ? {} : { title: input.title }),
    text: input.emptyText ?? COPY_EMPTY_TEXT,
  });
}

/** 三格式形态的入参（#247）：`data` 位的那份数据 → 三种格式各算一份 ＋ 菜单提示。
 *  `menu === true` 取老仓原样提示；给对象则用它的 `hints`（不给也回落老仓原样）。
 *  格式是 `DataTextInput.format` 字段（#77 冻结签名的形状），不是第二个实参。 */
function formatsOf(data: DataTextInput, menu: { readonly hints?: readonly string[] } | true): {
  readonly text: string;
  readonly json: string;
  readonly csv: string;
  readonly hints: readonly string[];
} {
  const hints = menu === true ? MENU_HINTS : menu.hints ?? MENU_HINTS;
  return {
    text: buildDataText({ ...data, format: 'text' }),
    json: buildDataText({ ...data, format: 'json' }),
    csv: buildDataText({ ...data, format: 'csv' }),
    hints,
  };
}

/** ③ 复制数据区：`copyArea` 的薄转发（50 处调用点仍走这个名字，产物不变）。 */
export function dataCopyArea(title: string, input: DataTextInput): string {
  return copyArea({ title, data: input });
}

/** ④ 复制日志的第 2–6 段入参：本页由哪条命令渲染、数据从哪来、写了多少行、什么时候。 */
export function copyLog(input: CopyLogInput): CopyLogFields {
  return {
    thinking: LOG_THINKING,
    dataStructure: DB_FILENAME + (input.source === undefined || input.source === '' ? '' : ' ｜ ' + input.source),
    callChain: input.m5Line === undefined || input.m5Line === '' ? input.command : input.command + ' ｜ ' + input.m5Line,
    timestamp: input.version === undefined || input.version === '' ? input.actionAt : input.actionAt + ' · 版本 ' + input.version,
    exception: LOG_EXCEPTION,
  };
}

/** ⑤ 静态提示块：toast 形态的一句话（走 `renderFeedbackBlock` ＋ `renderToast`，不自造提示通道）。 */
export function notice(input: NoticeInput): string {
  return renderFeedbackBlock({
    ...(input.title === undefined ? {} : { title: input.title }),
    toast: {
      icon: input.icon ?? 'info',
      msg: input.msg,
      ...(input.detail === undefined ? {} : { detail: input.detail }),
    },
  });
}
