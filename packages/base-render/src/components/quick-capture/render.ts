/** quick-capture · **渲染**（纯函数产 HTML；形态 `oneline` 一支）。
 *
 *  —— 形态 `oneline`「一行式录入 ＋ 解析预览」——
 *
 *  三层，**每层一句话都没有多的**：
 *   · **写的那一行**：行首一枚三个字的小签 ＋ 输入框（那一句话本身）＋「分开填」＋「存」；
 *   · **解析预览那一条带**：一句话拆出来的几格，每格读成 `「午饭」＝ 餐饮 改`——
 *     左边是原话那一截，右边是认成的值，整枚是按钮（**哪格认错了点哪格改**）；
 *     原文里没写、由调用方补上的那一格不带引号、边框走虚线（形自己说得出「这格不是认出来的」）；
 *   · **「记过的」那一条带**：点一条＝把那句话填回输入框（**不用打字也能换一句话**）。
 *
 *  点某一格摊开的是**那一格的候选带**（`hidden` 着常渲：一次只摊开一格，其余先收起）——
 *  候选由调用方给（技能自己的词表），运行时段只做「把这一格原地重写、把选中那一枚挪过去」。
 *
 *  原型里的旁白与口径句一句都不上屏（2026-09-25 用户口径：原型里写了好多文字、看起来很混乱）。
 *
 *  五条硬口径（判据断的就是它们）：
 *   · **触屏可达**：每一枚可点件 ≥`QUICK_CAPTURE_TOUCH_PX`、相邻留 `QUICK_CAPTURE_GAP_PX` 缝；
 *   · **状态不只靠颜色**：摊开那一格＝形（描边加粗）＋色（次要面）＋`aria-expanded`；
 *     「补出来的那一格」＝形（虚线）＋结构（不带引号、只有格名）＋色（弱文字）；
 *     候选带里现在那一枚＝形（✓＋槽位固定）＋色（软底＋主色字＋主色描边）＋字（候选名＋字重 700）；
 *   · **读数永不截断**：每一格的读数与候选名没有省略手段，窄档只换行；
 *   · **同一个数只印一次**：每一格的读数只在那一格上印一次；
 *   · **同页多实例**：根上的 `id`、输入框 `id`、每一格候选带的 `id` 与全部 `aria-*` 都按入参 `id` 逐实例派生。
 */
import { esc } from '../shared/escape.js';
import {
  QUICK_CAPTURE_ATTR,
  QUICK_CAPTURE_BOX_ATTR,
  QUICK_CAPTURE_CELL_ATTR,
  QUICK_CAPTURE_CLASS,
  QUICK_CAPTURE_FORM_ATTR,
  QUICK_CAPTURE_KEEP_ATTR,
  QUICK_CAPTURE_PICK_ATTR,
  QUICK_CAPTURE_READ_ATTR,
  QUICK_CAPTURE_RECALL_ATTR,
  QUICK_CAPTURE_SAVE_ATTR,
  QUICK_CAPTURE_SPLIT_ATTR,
  QUICK_CAPTURE_TEXT,
  QUICK_CAPTURE_TEXT_ATTR,
  QUICK_CAPTURE_TRAY_ATTR,
  QUICK_CAPTURE_VALUE_ATTR,
  quickCaptureSlot,
  type QuickCaptureForm,
} from './attrs.js';
import {
  normalizeQuickCapture,
  type QuickCaptureCellRow,
  type QuickCaptureChoiceRow,
  type QuickCaptureModel,
} from './model.js';

/** 写的那一行（签 ＋ 输入框 ＋ 分开填 ＋ 存）。`enterkeyhint="done"`：软键盘右下角那枚写「完成」。 */
function lineHtml(m: QuickCaptureModel): string {
  const T = QUICK_CAPTURE_TEXT;
  return '<div class="' + quickCaptureSlot('line') + '">'
    + '<span class="' + quickCaptureSlot('lead') + '" aria-hidden="true">' + esc(T.lead) + '</span>'
    + '<input class="' + quickCaptureSlot('input') + '" id="' + esc(m.id + '-box') + '" type="text"'
    + ' value="' + esc(m.text) + '" aria-label="' + esc(T.boxLabel) + '"'
    + ' ' + QUICK_CAPTURE_BOX_ATTR + '="' + esc(m.id) + '" autocomplete="off" enterkeyhint="done">'
    + '<button type="button" class="' + quickCaptureSlot('more') + '"'
    + ' ' + QUICK_CAPTURE_SPLIT_ATTR + '="' + esc(m.id) + '">' + esc(T.split) + '</button>'
    + '<button type="button" class="' + quickCaptureSlot('save') + '"'
    + ' ' + QUICK_CAPTURE_SAVE_ATTR + '="' + esc(m.id) + '">' + esc(T.save) + '</button>'
    + '</div>';
}

/** 候选带里的一枚：现在这一格认成的就是它 ⇒ 挂 `is-on` ＋ `aria-current`（勾由样式段补）。 */
function choiceHtml(one: QuickCaptureChoiceRow): string {
  return '<button type="button" class="' + quickCaptureSlot('pick') + (one.on ? ' is-on' : '') + '"'
    + ' ' + QUICK_CAPTURE_PICK_ATTR + '="' + esc(one.key) + '"'
    + (one.on ? ' aria-current="true"' : '') + '>' + esc(one.label) + '</button>';
}

/** 某一格的候选带（**收起时 `hidden`**：一屏只留一层话，一次只摊开一格）。末一枚是「不改」＝取消。 */
function trayHtml(cell: QuickCaptureCellRow, trayId: string): string {
  const T = QUICK_CAPTURE_TEXT;
  return '<div class="' + quickCaptureSlot('tray') + '" id="' + esc(trayId) + '"'
    + ' ' + QUICK_CAPTURE_TRAY_ATTR + '="' + esc(cell.key) + '" role="group"'
    + ' aria-label="' + esc(cell.name + T.trayLead) + '" hidden>'
    + cell.choices.map(choiceHtml).join('')
    + '<button type="button" class="' + quickCaptureSlot('keep') + '"'
    + ' ' + QUICK_CAPTURE_KEEP_ATTR + '="' + esc(cell.key) + '">' + esc(T.keep) + '</button>'
    + '</div>';
}

/** 一格里的一枚：**整枚就是那颗按钮**（命中盒＝整枚），读数住在 `-to` 那一格里（运行时原地重写它）。
 *  左边那一截带上「＝」（与原型同一处切法：`「午饭」＝` 是一个文字节点，`餐饮` 是下一个）。 */
function cellHtml(m: QuickCaptureModel, cell: QuickCaptureCellRow): string {
  const T = QUICK_CAPTURE_TEXT;
  const trayId = m.id + '-tray-' + cell.key;
  const first = cell.added
    ? '<span class="' + quickCaptureSlot('field') + '">' + esc(cell.name + T.eq) + '</span>'
    : '<span class="' + quickCaptureSlot('src') + '">「' + esc(cell.name) + '」' + esc(T.eq) + '</span>';
  return '<button type="button" class="' + quickCaptureSlot('chip') + (cell.added ? ' is-added' : '') + '"'
    + ' ' + QUICK_CAPTURE_CELL_ATTR + '="' + esc(cell.key) + '"'
    + ' ' + QUICK_CAPTURE_VALUE_ATTR + '="' + esc(cell.value) + '"'
    + ' aria-expanded="false" aria-controls="' + esc(trayId) + '">'
    + first
    + '<span class="' + quickCaptureSlot('to') + '"'
    + ' ' + QUICK_CAPTURE_READ_ATTR + '="' + esc(cell.key) + '">' + esc(cell.to) + '</span>'
    + '<span class="' + quickCaptureSlot('pen') + '" aria-hidden="true">' + esc(T.pen) + '</span>'
    + '</button>'
    + trayHtml(cell, trayId);
}

/** 解析预览那一条带（几格夹着各自的候选带；候选带是这一格的下一条，摊开时整条占满一行）。 */
function parseHtml(m: QuickCaptureModel): string {
  return '<div class="' + quickCaptureSlot('parse') + '">'
    + m.cells.map((cell) => cellHtml(m, cell)).join('')
    + '</div>';
}

/** 「记过的」那一条带（0 条＝整条不出）。点一条＝把那句话填回输入框（不用打字也能换一句话）。 */
function recentHtml(m: QuickCaptureModel): string {
  if (m.recent.length === 0) return '';
  return '<div class="' + quickCaptureSlot('recent') + '">'
    + '<span class="' + quickCaptureSlot('lb') + '">' + esc(QUICK_CAPTURE_TEXT.recentLead) + '</span>'
    + m.recent.map((one) => '<button type="button" class="' + quickCaptureSlot('recall') + '"'
      + ' ' + QUICK_CAPTURE_RECALL_ATTR + '="' + esc(m.id) + '">' + esc(one) + '</button>').join('')
    + '</div>';
}

/** 形态 → 骨架（加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<QuickCaptureForm, (m: QuickCaptureModel) => string>> = {
  oneline: (m) => lineHtml(m) + parseHtml(m) + recentHtml(m),
};

/** 渲染快速录入条（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderQuickCapture(input: unknown): string {
  const m = normalizeQuickCapture(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  /* 根**就是宿主**：`-host` 那一枚槽类必须落在根上（卡框与 `container-type` 都挂在它名下；
   *  根上不带它 ⇒ 那一条规则成了永不命中的死声明，`@container` 也永远找不到容器）。 */
  return '<div class="' + QUICK_CAPTURE_CLASS + ' ' + quickCaptureSlot('host') + ' is-' + m.form + extra + '"'
    + ' ' + QUICK_CAPTURE_ATTR + '="' + esc(m.id) + '"'
    + ' ' + QUICK_CAPTURE_FORM_ATTR + '="' + m.form + '"'
    + ' ' + QUICK_CAPTURE_TEXT_ATTR + '="' + esc(m.text) + '">'
    + SKELETONS[m.form](m)
    + '</div>';
}
