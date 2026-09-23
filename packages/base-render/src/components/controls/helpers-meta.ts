/** controls · helpers-meta
 *
 *  自 `src/controls.ts` 原样切出。
 *
 *  **住址**：目录化批次⑤把 `src/controls.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（五个渲染器 ＋ 共享 helpers JS ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { CONTROL_STYLE_SECTIONS, DEFAULT_DATA_ATTR, HELP_SHELL_ID, SharedHelpersInput } from '../../spec/index.js';
import { STYLE_PREFIX } from '../../style.js';

/* ── 共享 JS 文本的唯一产出者（FX-2③／FX-18；#74 只消费） ─────────────── */

/** JS 字符串字面量（产出文本里嵌值唯一出口）。 */
export function jsStr(value: string): string {
  return JSON.stringify(value);
}

export function helpersPrefix(input?: SharedHelpersInput): string {
  const prefix = input === undefined || input === null ? undefined : input.prefix;
  return typeof prefix === 'string' && prefix !== '' ? prefix : STYLE_PREFIX;
}

export function helpersDataAttr(input?: SharedHelpersInput): string {
  const attr = input === undefined || input === null ? undefined : input.dataAttr;
  return typeof attr === 'string' && attr !== '' ? attr : DEFAULT_DATA_ATTR;
}

/* ── #88 S4：HELP 速查台运行时增强的类名来源（**不引 `src/help.ts`**） ────────────
 *  helpers 运行时注入的元素必须与 `src/help.ts` 的 `cls()` 同一命名空间，否则样式落空。
 *  这里**不** `import` help.ts：help.ts 已 `import { STYLE_PREFIX } from './style.js'`，
 *  controls.ts 再引 help.ts 会形成 `controls → help → template` 的潜在模块环；改为
 *  「`CONTROL_STYLE_SECTIONS` 闭集里 kebab 后与 `HELP_SHELL_ID` 同值者」这条**与 help.ts:87-93
 *  逐条同构**的派生式，闭集漂移即在此 fail-fast（不静默换命名空间）。两侧一致性由
 *  `test/help-center-js-88.test.mjs` 机读钉死（对照 `renderHelpShell` 的真实产出类名）。 */

/** 样式区名 kebab（`helpShell` → `help-shell`）：与 `src/help.ts:81-83` 同一映射。 */
function styleSectionSlug(section: string): string {
  return section.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
}

/** HELP模板类名命名空间 kebab 后缀（`help-shell`；缺省前缀下根 = `ilife-help-shell`）。
 *  **延迟求值**（不在模块顶层）：`style.ts → charts.ts → controls.ts → style.ts` 存在模块环，
 *  顶层读 `STYLE_PREFIX` 会在 `style.js` 初始化完成前触发 TDZ（实测 `ReferenceError`），
 *  故派生式只在 `buildSharedHelpersJs()` **调用时**执行（此时全部模块已初始化）。 */
export function helpShellSlug(): string {
  const section = CONTROL_STYLE_SECTIONS.find(
    (name) => STYLE_PREFIX + styleSectionSlug(name) === HELP_SHELL_ID,
  );
  if (section === undefined) {
    throw new Error('base-paint/controls：CONTROL_STYLE_SECTIONS 闭集缺与 HELP_SHELL_ID 同 kebab 的区名（'
      + HELP_SHELL_ID + '）');
  }
  return styleSectionSlug(section);
}

/** 回到顶部按钮的 `id`（视觉尺 H-19 逐字点名 `#backTop`；`backTop` 是**冻结规格值**）。 */
export const HELP_BACKTOP_ID = 'backTop';
/** H-19：`scrollY > 400` 才出现（阈值逐字取规格）。 */
export const HELP_BACKTOP_MIN_Y = 400;
/** H-19：按钮字形 `↑`（18px／600 由 CSS 承担）。 */
export const HELP_BACKTOP_LABEL = '↑';
/** 无障碍名（文档未规定 → 本票取值，与 `TOAST_CLOSE_LABEL` 同口径记账）。 */
export const HELP_BACKTOP_ARIA = '回到顶部';
/** 搜索框占位文案（F3 `卡路里.html` 的 `#sB` 逐字：`搜索全部场景`）。 */
export const HELP_SEARCH_PLACEHOLDER = '搜索全部场景';
/** 搜索框无障碍名（文档未规定 → 本票取值）。 */
export const HELP_SEARCH_ARIA = '搜索全部场景';
/** 清空按钮字形（F3 `#sClear` 逐字：`✕`）与无障碍名。 */
export const HELP_CLEAR_LABEL = '✕';
export const HELP_CLEAR_ARIA = '清空搜索';
/** H-16 双反馈的**按钮通道**类名（#121；规格逐字 `copied`，**非** `ilife-` 前缀 → 不占样式区命名空间）。
 *  CSS 侧两处已就位：`style.ts` 的 `copyButton` 区（`.ilife-copy-btn.copied`，#75）与本区追加的
 *  helpShell 复制按钮 `.copied`（#121）；本常量只供运行时**加类**，不产第二份样式真相。 */
export const HELP_COPY_COPIED_CLASS = 'copied';
/** 复制成功态停留时长 = 弹簧动画时长 **450ms**（`docs/visual-spec-help.md:195,197`「按钮变绿进入
 *  `copied` 态并跑 450ms 弹簧动画」）。与 `style.ts` 的 `transition: transform .45s …` 同源数值，
 *  由 `test/copy-copied-121.test.mjs` 跨文件交叉钉死（改一侧不改另一侧即红）。 */
export const HELP_COPY_COPIED_MS = 450;
/** 命中计数文案（F3 `#hitC` 逐字：`匹配 N 个场景`）。 */
export const HELP_HIT_PREFIX = '匹配 ';
export const HELP_HIT_SUFFIX = ' 个场景';
/** 零命中文案（F3 `#emptyC` 逐字）。 */
export const HELP_HIT_EMPTY = '没有找到相关场景,换个词试试～';

/** 冻结签名：`buildSharedHelpersJs(input?: SharedHelpersInput): string`。
 *
 *  产出恒为**非空**、**经典 script** 作用域可跑的 IIFE（无 `import`／`export`／顶层 `await`），
 *  逐项满足 `SHARED_HELPERS_JS_RULE`：自包含（不依赖其它脚本或既有全局）／幂等（判据**只落 DOM**：
 *  标记属性 ＋ `querySelector` 早退，**不**用全局哨兵）／允许页面侧 DOM（`document.*` 读取与事件绑定）／
 *  不向 `window.<id>`／`globalThis.<id>` 赋值／不引 `node:`。
 *
 *  功能面（文档无规定，本文记账）：① 幂等挂载点标记；② 事件委派 `[ACTION_ID_ATTR]` 点击 →
 *  读 `dataAttr` 文本 → 复制（`navigator.clipboard` → `execCommand` 兜底）；③ 反馈块
 *  **与 `renderToast` 同构**（`.toast` > `.toast-icon` ＋ `.toast-body` > `.toast-title-row` ＋ 可选
 *  `.toast-title-detail`，`.toast-close` 在 body 之外；W1 根因修 ＋ F-c 图标），`prefix` 命名空间类，
 *  `maxStack`／`timeoutMs`／移动端收窄取冻结常量；④ 关闭按钮。
 *  产出文本里的文案／数值**全部**取自冻结常量（不产第二份真相）。
 *  注：`execCommand` 兜底用临时 textarea 的两个内联定位属性（`position`／`left`），属临时节点
 *  定位而非控件样式，不构成第二份样式常量。
 *
 *  **#88 S4 追加（HELP 速查台运行时增强；文档无规定 → 本文记账）**：全部挂进**既有 `boot()`**、
 *  共用**既有幂等 marker**（`MARKER_SEL` ＋ `querySelector` 早退），**不新增第二个标记**；每一项都
 *  先判 HELP模板是否在页面（helpers 被所有技能页面共享，非 HELP 页逐项早退、零副作用）：
 *  - **卡级复制按钮**（`card-copy`）：每张场景卡的**卡头**注入 1 个按钮，`actionId`／文案恒读
 *    `HELP_COPY_ACTIONS.prompt`，`dataAttr` 取同卡 `<pre class="prompt">` 的原文（＝该卡 prompt 逐字；
 *    #88 S5 起改以 `<pre>` 为**主源**，读不到才回落 Sheet 内 prompt 按钮的 data-t），
 *    复用上面的 `[ACTION_ID_ATTR]` 委派（零新增监听、零契约变更）；卡内已有该类即跳过（幂等）。
 *  - **搜索**（`tab-search` ＋ `tab-search-input` ＋ `tab-search-clear` ＋ `page-hitcount`）：跨分组过滤卡片、
 *    `<mark class="card-mark">` 高亮命中、自动展开命中卡片的 Sheet 与子功能组、命中计数、
 *    清空复原、`Enter` 在命中分组页间跳页（自动跳第一个命中页）。
 *  - **Sheet 参数实时预览**：`editable_fields` 的静态值换成输入框，输入即重组
 *    「prompt ＋ 空行 ＋ `label: value` 行」（F3 `buildPrompt` 语义），并同步 prompt／params 复制按钮的
 *    `dataAttr`（否则复制到的是编辑前的旧文本）。
 *  - **回到顶部**（`btn-backtop`，`id="backTop"`，H-19）：`scrollTop > 400` 加 `-show`，点击平滑回顶。
 *  纯度：只用 `document.*`（含只读 `document.scrollingElement`）＋ 既有只读 `window.matchMedia`；
 *  不向 `window.<id>`／`globalThis.<id>` 赋值、不引 `node:`、不用 `classList`（类名走 `className` 字符串
 *  增删，兼容 `style.test.mjs` T28 的「动效纯 CSS」断言）、不产内联 `on*`。
 *
 *  **#121 追加（H-16 双反馈的按钮通道；文档 `docs/visual-spec-help.md:195,197`）**：复制**成功**时给
 *  **被点击的那个按钮**加 `copied` 类（`HELP_COPY_COPIED_CLASS`，规格逐字、无 `ilife-` 前缀），
 *  `HELP_COPY_COPIED_MS`（450ms）后移除；失败路径**不**加类（不静默变绿）。落点仍在**既有
 *  `boot()`／既有委派**内：`onClick` 把命中的按钮一并传给 `copy()` → 两条成功通道
 *  （`navigator.clipboard`／`execCommand` 兜底）各自在成功分支调 `markCopied(btn)`，零新增监听、
 *  零新增 marker、零新签名；类名增删复用既有 `addClass`／`removeClass`（`className` 字符串口径）。 */
