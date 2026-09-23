/** controls · action-bar
 *
 *  自 `src/controls.ts` 原样切出。
 *
 *  **住址**：目录化批次⑤把 `src/controls.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（五个渲染器 ＋ 共享 helpers JS ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { assertActionId, assertNoInlineHandler, assertPlainObject, badInput, esc } from './shared.js';
import { ACTION_BAR_DEFAULTS, ACTION_BAR_KINDS, ACTION_ID_ATTR, ActionBarButton, ActionBarInput, ActionBarKind, COPY_FORMATS, CopyButtonInput, CopyFormatTexts, DEFAULT_DATA_ATTR, RenderActionBar } from '../../spec/index.js';
import { STYLE_PREFIX } from '../../style.js';

/* ── actionBar（复制三件套） ──────────────────────────────────────────── */

interface NormalizedCopyButton {
  readonly label: string;
  readonly actionId: string;
  readonly text: string | undefined;
  /** 三格式形态（#247）：给了就出「菜单开合器 ＋ 格式菜单」，`text` 恒缺。 */
  readonly formats?: { readonly texts: readonly string[]; readonly hints: readonly string[] };
  /** #336 缺位占位：有数据位无日志位时自动补的禁用态（无 `data-t`、点不动，只占 ghost 行第二格）。 */
  readonly disabled?: boolean;
}

function normalizeButtons(buttons: ActionBarInput['buttons']): ActionBarButton[] {
  if (buttons === undefined || buttons === null) return [];
  if (!Array.isArray(buttons)) badInput('renderActionBar: input.buttons 必须是数组');
  return buttons.map((button, i) => {
    const field = 'renderActionBar: input.buttons[' + i + ']';
    assertPlainObject(button, field);
    assertNoInlineHandler(button, field);
    if (typeof button.label !== 'string' || button.label === '') badInput(field + '.label 必须是非空字符串');
    if (!(ACTION_BAR_KINDS as readonly string[]).includes(button.kind)) {
      badInput(field + '.kind 必须是 ' + ACTION_BAR_KINDS.join('／'));
    }
    return {
      label: button.label,
      kind: button.kind as ActionBarKind,
      actionId: assertActionId(button.actionId, field + '.actionId'),
      // #733：只在**真给 true** 时带这一位；不给／给假 ⇒ 产物与改前逐字节相同（旧调用方零影响）。
      ...(button.disabled === true ? { disabled: true } : {}),
    };
  });
}

/** 菜单形态的标记属性（#247；运行时委派据它分辨「开合菜单的按钮」与「直接复制的按钮」）。
 *  该按钮**不写** `data-action-id`：它不是复制目标、也不是复制动作——点击的效果是开合菜单。
 *  `CopyActionHostPort.listActionIds()` 与 `bindCopyAction` 因此天然不碰它（无需为此改冻结签名）。 */
export const COPY_MENU_OPEN_ATTR = 'data-fmt-open';
/** 菜单项的**格式键**承载属性（三格式形态里唯一分辨三项的东西——值取 `COPY_FORMATS`）。
 *  与老仓逐字同名：老仓 `.fmt-item` 就是靠 `data-fmt` 分辨纯文本／JSON／CSV。 */
export const COPY_MENU_FMT_ATTR = 'data-fmt';
/** 格式菜单容器与按钮的共同父节点类名（运行时据**最近的这个父节点**开合／收起菜单）。 */
export const COPY_MENU_WRAP_CLASS = 'copy-menu-wrap';
/** 菜单容器自身的类名（浮动那一层）。 */
export const COPY_MENU_CLASS = 'copy-menu';
/** 菜单项的类名。 */
const COPY_MENU_ITEM_CLASS = 'copy-menu-item';
/** 菜单项**标签**文本的类名（`data-fmt` 只放格式键；标签是给人看的中文名，见 `COPY_FORMAT_LABELS`）。 */
export const COPY_MENU_LABEL_CLASS = 'copy-menu-label';
/** 菜单项**可见标签**：格式键 → 中文名（#496）。
 *
 *  `data-fmt` 是机器面（键值恒为 `COPY_FORMATS` 成员，运行时与测试都按它分辨三项），
 *  **上屏的是这张表的中文名**——原先是把格式键直接印给用户看，菜单点开是 `text` / `json` / `csv`
 *  三个小写英文词，读不懂（`.scratch/t155o/text-review-P0.md` 第 20／44 条，卡路里 81 页 ＋
 *  饼干记账的复制区页同形）。`JSON` 与 `CSV` 是这个仓既有写法里的通用缩写，保留原样。
 *  运行时「数据复制成功（〈标签〉）」那条提示读回的就是这里的值，故它跟着一起变中文。 */
const COPY_FORMAT_LABELS: Record<string, string> = { text: '纯文本', json: 'JSON', csv: 'CSV' };
/** 菜单项**用途提示**（老仓原样：`粘贴给 AI / 自己看`／`结构化存档`／`表格导入`）的类名。
 *  老仓靠 `.fmt-item span`（后代选择器）收这行灰小字；本仓**显式给类名**——一是不用后代选择器
 *  把标签也一并染成 11px 灰（`.copy-menu-item span` 会连窗口里两个 span 一起命中），
 *  二是 CSS 里每个类名都要指得出产出者（`style.test.mjs` T10）。 */
const COPY_MENU_HINT_CLASS = 'copy-menu-hint';
/** 菜单**开着**时加在容器上的类（`opacity` / `visibility` 的开合开关；`aria-expanded` 同步）。 */
export const COPY_MENU_OPEN_CLASS = 'copy-menu-open';
/** 开合器 `aria-label` 的后半句（**#525 第二轮**：可见文字里的 `▾` 已删，那句「可以选格式」改住这里）。
 *
 *  为什么删那个字符：用户裁定第 5 条逐字「该问题是用这些符号简化了 UI 展示的设计」——
 *  `复制数据 ▾` 里的三角是「这里能展开」的纯装饰，用一个字形顶替了一次设计。现在三角由
 *  `style.ts` copyButton 区的 `::after` 用 `border` ＋ `rotate` 画出来（零字符），
 *  而**语义不留白**：这句写进 `aria-label`，读屏与抓取器仍读得出「这颗按钮要选格式」。 */
const COPY_MENU_OPENER_ARIA = '（点开选格式）';
/** 选中某个格式后的成功提示词干（老仓 `.fmt-menu` 那张菜单当年报的是「…数据复制成功(格式)」；
 *  本仓句头沿用既有「已复制」以外的**独立**一句，避免与单格式提示混同）。格式名由运行时从菜单项
 *  标签读回（即 `COPY_FORMAT_LABELS` 的中文名），不在运行时另立第二张表。 */
export const COPY_FORMAT_OK_MSG = '数据复制成功';

/** 三格式形态的校验 ＋ 归一（#247）：与 `text` 互斥；三格式恒齐、值恒为串；`hints` 恒三串。 */
function normalizeFormats(
  formats: CopyFormatTexts | undefined,
  field: string,
  hasText: boolean,
): { readonly texts: readonly string[]; readonly hints: readonly string[] } | undefined {
  if (formats === undefined || formats === null) return undefined;
  assertPlainObject(formats, 'renderActionBar: input.' + field + '.formats');
  if (hasText) badInput('renderActionBar: input.' + field + '.formats 与 .text 只能给一个');
  const texts: string[] = [];
  for (const key of COPY_FORMATS) {
    const value: unknown = (formats as unknown as Record<string, unknown>)[key];
    if (typeof value !== 'string') badInput('renderActionBar: input.' + field + '.formats.' + key + ' 必须是字符串');
    texts.push(value);
  }
  const rawHints: unknown = formats.hints;
  if (rawHints === undefined || rawHints === null) return { texts, hints: [] };
  if (!Array.isArray(rawHints) || rawHints.length !== COPY_FORMATS.length) {
    badInput('renderActionBar: input.' + field + '.formats.hints 必须是 ' + COPY_FORMATS.length + ' 个字符串');
  }
  const hints: string[] = [];
  for (const hint of rawHints as readonly unknown[]) {
    if (typeof hint !== 'string') badInput('renderActionBar: input.' + field + '.formats.hints 必须是字符串');
    hints.push(hint);
  }
  return { texts, hints };
}

function normalizeCopyButton(input: CopyButtonInput | undefined, fallbackLabel: string, field: string): NormalizedCopyButton | null {
  if (input === undefined || input === null) return null;
  assertPlainObject(input, 'renderActionBar: input.' + field);
  assertNoInlineHandler(input, 'renderActionBar: input.' + field);
  const button = input as CopyButtonInput;
  const formats = normalizeFormats(button.formats, field, typeof button.text === 'string');
  return {
    label: typeof button.label === 'string' && button.label !== '' ? button.label : fallbackLabel,
    actionId: assertActionId(button.actionId, 'renderActionBar: input.' + field + '.actionId'),
    text: typeof button.text === 'string' ? button.text : undefined,
    // 三格式形态的按钮是**菜单开合器**，不是复制目标：`data-t` 恒缺（点了不直接复制）。
    ...(formats === undefined ? {} : { formats }),
  };
}

function sceneButtonHtml(button: ActionBarButton): string {
  // #733：`disabled: true` ⇒ 落 `disabled` ＋ `aria-disabled`（「标记」而非「可点控件」）。
  //   动作条按钮没有 `data-t` 载荷位 ⇒ 凡是「该由宿主来做、这一页做不到」的动作，
  //   不给这一位就会渲染成「看着能点、点了没反应」（记账写入域实测两颗）。
  const disabledAttr = button.disabled === true ? ' disabled aria-disabled="true"' : '';
  return '<button type="button" class="' + STYLE_PREFIX + 'action-btn ' + STYLE_PREFIX + 'action-btn-' + button.kind + '"'
    + disabledAttr + ' ' + ACTION_ID_ATTR + '="' + esc(button.actionId) + '">' + esc(button.label) + '</button>';
}

function copyButtonHtml(button: NormalizedCopyButton): string {
  const textAttr = button.text === undefined ? '' : ' ' + DEFAULT_DATA_ATTR + '="' + esc(button.text) + '"';
  const disabledAttr = button.disabled === true ? ' disabled' : '';
  return '<button type="button" class="' + STYLE_PREFIX + 'copy-btn ' + STYLE_PREFIX + 'copy-btn-ghost" '
    + ACTION_ID_ATTR + '="' + esc(button.actionId) + '"' + textAttr + disabledAttr + '>' + esc(button.label) + '</button>';
}

/** 复制数据的**三格式形态**（#247）：`<div class="ilife-copy-menu-wrap">` 里一颗开合器 ＋ 一个菜单。
 *
 *  按钮：`data-fmt-open` 是**开合标记**（不是 `data-action-id`——见 `COPY_MENU_OPEN_ATTR` 注释），
 *  带 `aria-haspopup`／`aria-expanded`（`aria-expanded` 由运行时翻转）；
 *  菜单：三个格式项，每项 `data-fmt="键"`（键取 `COPY_FORMATS`）＋ 自己的 `data-t`（该格式文本），
 *  标签与用途提示取 `formats.hints`（对应位）。零内联脚本：开合与选中一律归 helpers 运行时的委派。
 *  菜单容器**不加 `hidden`**：它是浮层，用 CSS 的 `opacity` 开合（`hidden` 的 `display:none` 会让浏览器
 *  把 `opacity` 过渡整个跳过，且开合时重排整页——手机档上会看到内容跳一下）。 */
function copyMenuHtml(button: NormalizedCopyButton, formats: { readonly texts: readonly string[]; readonly hints: readonly string[] }): string {
  // #525 第二轮：开合器**不再把 `▾` 打上屏**（用户裁定第 5 条「用符号简化了 UI 展示的设计」是债）。
  // 这颗三角是「这里可以展开」的纯装饰，可见文字里删掉、改由 CSS 画（`style.ts` 的 copyButton 区
  // `.ilife-copy-menu-wrap > .ilife-copy-btn::after`，`border` ＋ `transform: rotate`，一个字符都不打）。
  // 删字符不能删语义：`aria-label` 里把那句「可以选格式」写成文字（读屏与无图形环境仍读得出）。
  const openLabel = button.label;
  const items: string[] = [];
  for (let i = 0; i < COPY_FORMATS.length; i += 1) {
    const key = COPY_FORMATS[i] as string;
    const hint = formats.hints[i];
    const hintHtml = hint === undefined || hint === '' ? '' : '<span class="' + STYLE_PREFIX + COPY_MENU_HINT_CLASS + '">' + esc(hint) + '</span>';
    items.push('<button type="button" class="' + STYLE_PREFIX + COPY_MENU_ITEM_CLASS + '" ' + COPY_MENU_FMT_ATTR + '="' + esc(key) + '" '
      + DEFAULT_DATA_ATTR + '="' + esc(formats.texts[i] as string) + '">'
      + '<span class="' + STYLE_PREFIX + COPY_MENU_LABEL_CLASS + '">' + esc(COPY_FORMAT_LABELS[key] ?? key) + '</span>' + hintHtml + '</button>');
  }
  const opener = '<button type="button" class="' + STYLE_PREFIX + 'copy-btn ' + STYLE_PREFIX + 'copy-btn-ghost" '
    + COPY_MENU_OPEN_ATTR + '="1" aria-haspopup="menu" aria-expanded="false" '
    + 'aria-label="' + esc(openLabel + COPY_MENU_OPENER_ARIA) + '">' + esc(openLabel) + '</button>';
  return '<div class="' + STYLE_PREFIX + COPY_MENU_WRAP_CLASS + '">' + opener
    + '<div class="' + STYLE_PREFIX + COPY_MENU_CLASS + '" role="menu">' + items.join('') + '</div></div>';
}

/** 一颗复制按钮：单格式＝普通按钮（`actionId` ＋ 可选 `data-t`）；三格式＝菜单形态（见 `copyMenuHtml`）。 */
function copyControlHtml(button: NormalizedCopyButton): string {
  return button.formats === undefined ? copyButtonHtml(button) : copyMenuHtml(button, button.formats);
}

/** 冻结签名：`renderActionBar(input: ActionBarInput): string`。
 *
 *  场景按钮（`primary`／`red`／`ghost`）一行；复制数据／复制日志 ghost 按钮**独立一行**
 *  （`ACTION_BAR_DEFAULTS.ghostOwnRow`）；复制文本渲染期写入 `DEFAULT_DATA_ATTR`、id 写入 `ACTION_ID_ATTR`，
 *  零内联脚本。缺 `actionId`／空串／同次渲染内重复 → `ControlsError` code `bad-input`。
 *  逐区尺寸（`minHeightPx`／`fontSizePx`／`fontWeight`／`ghostBorderAlpha`／`evenRowPairs`）由 #75 的
 *  共享样式区消费（本文件不产样式常量）。
 *
 *  #654（负责人 2026-09-16 验收打回，**口径变更**）：**不再补**那颗禁用态「复制日志」占位。
 *  动作条只渲染**真存在**的动作；ghost 行的几何改由「列数跟着颗数走」保——只有一颗时挂
 *  `action-row-ghost-single`（`style.ts` 让它在整行轨道铺满），两颗真位时照 #247 两列平分。
 *  两边都在场／都不在场／仅日志位在场照旧；仅日志位在场不补数据位。 */
export const renderActionBar: RenderActionBar = (input) => {
  assertPlainObject(input, 'renderActionBar: input');
  const bar = input as ActionBarInput;
  const buttons = normalizeButtons(bar.buttons);
  const copyData = normalizeCopyButton(bar.copyData, ACTION_BAR_DEFAULTS.copyDataLabel, 'copyData');
  const copyLog = normalizeCopyButton(bar.copyLog, ACTION_BAR_DEFAULTS.copyLogLabel, 'copyLog');

  const ids = new Set<string>();
  for (const button of buttons) {
    if (ids.has(button.actionId)) badInput('renderActionBar: actionId 同次渲染内重复：' + button.actionId);
    ids.add(button.actionId);
  }
  for (const copy of [copyData, copyLog]) {
    if (copy === null) continue;
    if (ids.has(copy.actionId)) badInput('renderActionBar: actionId 同次渲染内重复：' + copy.actionId);
    ids.add(copy.actionId);
  }

  const sceneHtml = buttons.map(sceneButtonHtml).join('');
  const ghostList = [copyData, copyLog].filter((copy): copy is NormalizedCopyButton => copy !== null);
  const ghostHtml = ghostList.map(copyControlHtml).join('');
  const rowClass = STYLE_PREFIX + 'action-row';
  // #654：ghost 行**只有一颗**时挂单颗修饰类——`style.ts` 让它铺满整行轨道（既不占半格、
  // 也不缩成内容宽）；两颗真位时不挂，#247 的两列平分口径一字不动。
  const ghostRowClass = rowClass + ' ' + STYLE_PREFIX + 'action-row-ghost'
    + (ghostList.length === 1 ? ' ' + STYLE_PREFIX + 'action-row-ghost-single' : '');
  const rows: string[] = [];
  if (sceneHtml !== '' && ghostHtml !== '' && !ACTION_BAR_DEFAULTS.ghostOwnRow) {
    rows.push('<div class="' + rowClass + '">' + sceneHtml + ghostHtml + '</div>');
  } else {
    if (sceneHtml !== '') rows.push('<div class="' + rowClass + '">' + sceneHtml + '</div>');
    if (ghostHtml !== '') rows.push('<div class="' + ghostRowClass + '">' + ghostHtml + '</div>');
  }
  return '<div class="' + STYLE_PREFIX + 'action-bar">' + rows.join('') + '</div>';
};

