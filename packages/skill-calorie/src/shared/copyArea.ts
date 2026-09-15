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

/** 三格式菜单里三项的用途提示：**本技能一律留空**（顺序＝`COPY_FORMATS`）。
 *
 *  老仓 `卡路里/templates/crud_receipt.html` 的 `.fmt-menu` 三行当年写「粘贴给 AI / 自己看」
 *  「结构化存档」「表格导入」——#247 逐字搬过来之后，四份文本审查（`.scratch/t155o/text-review-P0.md`
 *  的 20／44 条）逐页点到它：一行塞四个动作、读者看不懂「结构化存档」。作者 2026-09-14 裁定
 *  「删掉这类动作与用途说明」⇒ 菜单只留三个格式名（纯文本／JSON／CSV），由选中的格式自己说明用途。
 *
 *  传空串而非撤掉 `hints` 位：公共层的三格式菜单对空串是**不渲染那行小字**（`controls.ts:1335`），
 *  形状与「不给 hints」一致，但不依赖公共层那一支的缺省值。 */
const MENU_HINTS: readonly string[] = ['', '', ''];

/** `copyArea` 的 6 个可填位：给了什么出什么，0–3 颗按钮。 */
interface CopyAreaInput {
  /** 区块标题；不给＝不出标题（同 `renderCopyBlock` 口径）。
   *  与复制按钮同名（「复制数据」）＝不出标题（只留动作不留说明文本）。 */
  readonly title?: string;
  /** 给了就出「prompt 预览块 ＋ 复制指令」（逐字复用今天 `promptCopyArea` 那两件）。
   *  给对象时 `label` 决定预览块的小标题：不给／`null` ＝ **不出小标题**（#238 场景 07 预检确认页：
   *  那里与复制按钮同一个叫法，不再多一行小标题）。 */
  readonly prompt?: string | { readonly text: string; readonly label?: string | null };
  /** 给了就出「复制数据」（**三格式菜单**，见下），内部走 `buildDataText`。 */
  readonly data?: DataTextInput;
  /** **只用来换菜单里的用途提示**（#247）：数据位**恒**出「复制数据 ▾ ＋ 三选一菜单」
   *  （纯文本／JSON／CSV，选中即复制并报所选格式），不声明也一样——故这一位不再当开关用。
   *  给对象则用它的 `hints`（三项，顺序同 `COPY_FORMATS`）；不给／给 `true` 都取老仓原样提示。 */
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

/** 复制区口径：只留动作不留说明文本——`title` 与复制按钮同名时只留按钮、不出标题。
 *  （`dataCopyArea('复制数据', …)` 的 40 余处调用因此不再产出与按钮同字的 `<h2>`；
 *  与按钮不同名的标题如「复制榜单」保持原样。） */
const COPY_TITLE_DUP_OF_BUTTON = '复制数据';

/** ① 复制 prompt 区：prompt 预览（`renderPreBlock`）＋复制按钮（旧模板 prompt-box＋btn-copy 的同形）。
 *  第二参可选：不给 ＝ 老样子（小标题「复制 prompt（必走）」）；`null` ＝ 不出小标题；给字符串就用它。 */
export function promptCopyArea(prompt: string, label?: string | null): string {
  const heading = label === undefined ? '复制 prompt（必走）' : label;
  const pre = heading === null
    ? renderPreBlock({ command: prompt })
    : renderPreBlock({ label: heading, command: prompt });
  return pre + copyActionHtml(prompt);
}

/** ② 复制区：prompt／数据／日志给了什么出什么；三样全不给＝一句空态、**不出按钮**。
 *
 *  **数据位恒出三格式菜单**（#247 定案 ＋ 本票收口）：`data` 在场就出「复制数据 ▾ ＋ 三选一菜单」，
 *  调用方**不需要**声明——数据页恒需要它（同一份数据的三种合法表示），留一个每页都要写 `true` 的开关
 *  只是假自由度（新增一页还会忘写）。`dataFormats` 只剩「换菜单里的用途提示」这一个用途。
 *  `copyArea({ title, data })` 与 `dataCopyArea(title, data)` 产物仍**逐字相同**（两者走同一条路）。
 *  只给 prompt 时不再补空态：prompt 区自己就有可复制的内容。 */
export function copyArea(input: CopyAreaInput): string {
  const data = input.data;
  const log = input.log;
  const parts: string[] = [];
  const prompt = input.prompt;
  if (typeof prompt === 'string') {
    if (prompt !== '') parts.push(promptCopyArea(prompt));
  } else if (prompt !== undefined && prompt.text !== '') {
    parts.push(promptCopyArea(prompt.text, prompt.label ?? null));
  }
  // 口径：与按钮同名的标题只留按钮（`renderCopyBlock` 不见该标题，按钮与逻辑不变）。
  const title = input.title === COPY_TITLE_DUP_OF_BUTTON ? undefined : input.title;
  if (data !== undefined || log !== undefined) {
    parts.push(renderCopyBlock({
      ...(title === undefined ? {} : { title }),
      ...(data === undefined ? {} : { dataFormats: formatsOf(data, input.dataFormats) }),
      ...(log === undefined ? {} : { logText: buildLogText(log) }),
    }));
    return parts.join('');
  }
  if (parts.length > 0) return parts.join('');
  return renderEmptyBlock({
    ...(title === undefined ? {} : { title }),
    text: input.emptyText ?? COPY_EMPTY_TEXT,
  });
}

/** 三格式形态的入参（#247）：`data` 位的那份数据 → 三种格式各算一份 ＋ 菜单提示。
 *  `menu` 缺席／`true` 都取老仓原样提示；给对象则用它的 `hints`（不给也回落老仓原样）。
 *  格式是 `DataTextInput.format` 字段（#77 冻结签名的形状），不是第二个实参。 */
function formatsOf(data: DataTextInput, menu?: { readonly hints?: readonly string[] } | true): {
  readonly text: string;
  readonly json: string;
  readonly csv: string;
  readonly hints: readonly string[];
} {
  const hints = menu === undefined || menu === true ? MENU_HINTS : menu.hints ?? MENU_HINTS;
  return {
    text: buildDataText({ ...data, format: 'text' }),
    json: buildDataText({ ...data, format: 'json' }),
    csv: buildDataText({ ...data, format: 'csv' }),
    hints,
  };
}

/** ③ 复制数据区：`copyArea` 的薄转发（46 处调用点仍走这个名字；形态随数据位自动是菜单）。 */
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

/** ⑤ 静态提示块：**浅色页内提示**（走 `renderFeedbackBlock` ＋ `staticNotice: true` 的静态形态，不自造提示通道）。
 *
 *  `staticNotice` 是公共层 #154 新加的形态开关：浅底＋细描边、**不出「知道了」按钮**
 *  （静态提示不该能被点掉——那颗按钮在 helpers 里是文档级委派，点了会把整块从页面移除）。
 *  复制成功／失败的**瞬时反馈**仍走深色 toast（那是用户 2026-09-12 亲自裁定的卡面），本函数不碰它。 */
export function notice(input: NoticeInput): string {
  return renderFeedbackBlock({
    ...(input.title === undefined ? {} : { title: input.title }),
    staticNotice: true,
    toast: {
      icon: input.icon ?? 'info',
      msg: input.msg,
      ...(input.detail === undefined ? {} : { detail: input.detail }),
    },
  });
}
