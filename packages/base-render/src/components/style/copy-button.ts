/** style 区 · copyButton
 *
 *  自 `src/style.ts` 的 `SECTION_BUILDERS[copyButton]` **连它上面那段注释一起**原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/style.ts` 切成「一份令牌 ＋ 一个区一件 ＋ 一个组装器」，
 *  正文原样搬来；搬迁判据＝产物逐字节相同（`buildStyleSheet()` 的 css 全文 ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { BLUE_RGB, LF, focusRing } from './parts.js';
import { ACTION_BAR_DEFAULTS, TOAST_DEFAULTS } from '../../spec/index.js';

export const copyButtonSection: (prefix: string) => string = (p) => [
  '.' + p + 'copy-btn {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  gap: 6px;',
  '  min-height: ' + ACTION_BAR_DEFAULTS.minHeightPx + 'px;',
  '  padding: 0 14px;',
  '  border: 1px solid transparent;',
  '  border-radius: 999px;',
  '  background: var(--blue);',
  '  color: var(--card);',
  '  font-family: inherit;',
  '  font-size: ' + ACTION_BAR_DEFAULTS.fontSizePx + 'px;',
  '  font-weight: ' + ACTION_BAR_DEFAULTS.fontWeight + ';',
  '  line-height: 1;',
  '  cursor: pointer;',
  '  -webkit-tap-highlight-color: transparent;',
  '  touch-action: manipulation;',
  '  transition: transform .45s cubic-bezier(.34, 1.56, .64, 1), background-color .2s ease;',
  '}',
  '.' + p + 'copy-btn-primary {',
  '  background: var(--blue);',
  '  color: var(--card);',
  '}',
  '.' + p + 'copy-btn-ghost {',
  '  border-color: rgba(' + BLUE_RGB + ', ' + ACTION_BAR_DEFAULTS.ghostBorderAlpha + ');',
  '  background: var(--card);',
  // #179 对比度：ghost 按钮是 12px 小字，`--blue` 在白底上 4.02:1 不到 AA 的 4.5:1
  // → 换同族深一档的 `--blue2`（5.6:1）。实心按钮（白字压 `--blue`）不在本页，另账见交付报告。
  '  color: var(--blue2);',
  '}',
  '.' + p + 'copy-btn-wide {',
  '  width: 100%;',
  '}',
  '.' + p + 'copy-btn:active {',
  '  transform: scale(.96);',
  '}',
  // W3（H-16 双反馈的 CSS 侧）：复制成功态变绿。规格 `docs/visual-spec-help.md:195,197`
  // 「按钮变绿进入 `copied` 态并跑 450ms 弹簧动画」；弹簧 = 基础 `transition: transform .45s
  // cubic-bezier(.34, 1.56, .64, 1)`（B1 `benchmark-visual-spec.md:279,645`），本节只补**变绿**。
  // 类名由**运行时**添加（`copied`，非 `ilife-` 前缀 → 不占样式区命名空间）；
  // 本票**不改** helpers 的复制反馈行为，移交落点见契约 §8.11.1 FX-75-11。
  '.' + p + 'copy-btn.copied {',
  '  border-color: var(--ok);',
  '  background: var(--ok);',
  '  color: var(--card);',
  '}',
  // **禁用态必须看得出来**（#525 收口 · 两处公共债之一）：读页面没有写库日志，复制区按 #336
  // 自动补的那颗「复制日志」带 `disabled` 属性、可**从 #336 起就没有任何置灰规则**——看着与
  // 旁边那颗能点的按钮一模一样（`t524-改前读数.md` §7.1 第 3 条只核了属性、没核观感）。
  //
  // **#525 第二轮返修（禁用态只看得见、读不清）**：上一版照 HELP 页 `button.copy:disabled`
  // 取 `opacity:.45` 压**整颗**按钮，实测有效文字色被混成 `#91b9e9` 压白底，对比度只有
  // **2.03:1**（`.scratch/t525c/before.json`；读法＝把 opacity 混进底色后按 WCAG 相对亮度算）——
  // 连 AA 大字的 3:1 都不到，等于把「禁用」写成了「看不清」。
  // 改法＝**不压整颗**，改三处、各自都是一个信号：① 文字色换 `--fg3`；② 底压成 `--soft`；
  // ③ 描边降到 `--line`（「蓝＝可点」这条信号只留在可点态）。`opacity` 恒 1（不继承、不叠乘）。
  // 2.03 → 3.47 的两行读数落 `.scratch/t525c/disabled-contrast.json`，探针 `.scratch/t525c/probe.mjs` 可复跑。
  '.' + p + 'copy-btn[disabled],',
  '.' + p + 'copy-btn:disabled {',
  '  opacity: 1;',
  '  border-color: var(--line);',
  '  background: var(--soft);',
  '  color: var(--fg3);',
  '  cursor: not-allowed;',
  '}',
  '.' + p + 'copy-btn[disabled]:active,',
  '.' + p + 'copy-btn:disabled:active {',
  '  transform: none;',
  '}',
  // #179 触控目标：窄屏按钮抬到 44px。**#525 起这条在两个宽档上是同一个值**（`minHeightPx`
  // 由 40 提到 44，见 `spec/controls.ts`）——留在这里是为了不动既有选择器与既有媒体查询；
  // 桌面档不再是 40px。
  '@media (max-width: ' + TOAST_DEFAULTS.mobileMaxPx + 'px) {',
  '  .' + p + 'copy-btn {',
  '    min-height: 44px;',
  '  }',
  '}',
  // ── 复制数据的三格式菜单（#247，2026-09-12 用户裁定「恢复老仓原样」）───────────────
  // 逐值取自老仓 `卡路里/templates/crud_receipt.html`（可点版本 `2262fee1~1`）的 `.fmt-menu`／
  // `.fmt-item`／`.fmt-item:hover`／`.fmt-item span` 四串；老仓的 `--border`／`--soft` 分别
  // 对到本仓的 `--line`／`--soft`。**复用本区命名空间**（`CONTROL_STYLE_SECTIONS` 是冻结闭集，
  // 不新增第 9 个区）；类名不对 `copy-btn` 用前缀相似的名字（`.copy-menu-btn` 会被
  // `.copy-btn` 的规则一并命中，多出一圈胶囊底），故开合器只带 `copy-btn copy-btn-ghost` 两颗类。
  // **偏离 1 处（记账）**：菜单圆角取 **14px**（老仓是 12px）——#89 R-9 的 H-10 把
  // 全部非图表 CSS 的 `border-radius` 钉在 `{8px,14px,20px,999px,50%}`，12px 会让你越出闭集；
  // 14px 是本仓既有卡片圆角（toast 同值），几何其余逐值不动（`bottom`／`right`／`min-width`／
  // `max-width`／`padding`／投影／项内距与字号全取老仓）。
  '.' + p + 'copy-menu-wrap {',
  // 宽度**跟着轨道走**（#247 用户 2026-09-12 返修）：复制数据与复制日志在 ghost 行里**平分整行**
  // （各占一格，见 `.action-row-ghost` 的两列），两颗宽高一致——不再出现「一颗铺满一行、一颗缩成
  // 内容宽」的一胖一瘦。故这里**不写** `justify-self: start`（那会让本层缩成内容宽、连带按钮也缩）。
  '  position: relative;',
  '  display: flex;',
  '  align-items: center;',
  '  width: 100%;',
  '}',
  // 开合器按钮铺满自己那一格：菜单的 `right: 0` 才贴着按钮右缘（== 格子右缘），两格时居中偏右。
  '.' + p + 'copy-menu-wrap > .' + p + 'copy-btn {',
  '  width: 100%;',
  '}',
  // **#525 第二轮·三角用 CSS 画**（用户裁定第 5 条：符号顶替了设计）：
  // 可见文字里的 `▾` 已从 `controls.ts` 的 `copyMenuHtml` 删掉（那句「可以选格式」改住 `aria-label`），
  // 这里用 `border` 拼一个向下的小三角 ＋ `rotate(180deg)` 做开合态——**一个字符都不打**，
  // 也就不会被字体／读屏／抓取器当成内容。画的规矩：零宽零高的盒子靠 `border-top` 出形，
  // `margin-left: 6px` 与基础的 `gap: 6px` 同值（文字与三角的间距连两处取值都不新造）。
  // 开合态由运行时加的 `.copy-menu-open` 落色（与菜单同一个类，不新增第二个开关）。
  '.' + p + 'copy-menu-wrap > .' + p + 'copy-btn::after {',
  '  content: "";',
  '  width: 0;',
  '  height: 0;',
  '  margin-left: 6px;',
  '  border-left: 4px solid transparent;',
  '  border-right: 4px solid transparent;',
  '  border-top: 5px solid currentColor;',
  '  transition: transform .16s ease-out;',
  '}',
  '.copy-menu-open.' + p + 'copy-menu-wrap > .' + p + 'copy-btn::after {',
  '  transform: rotate(180deg);',
  '}',
  '.' + p + 'copy-menu {',
  '  position: absolute;',
  '  bottom: calc(100% + 8px);',
  '  right: 0;',
  '  z-index: 20;',
  '  min-width: 200px;',
  // 浮层开合走 opacity（不是 `display`／`hidden`）：一是 CSS 过渡不被跳过，二是开合不重排整页。
  // 关着时同时收掉命中，免得看不见的菜单项还能被点到；`visibility` 可过渡 ⇒ 收起仍有淡出。
  '  box-sizing: border-box;',
  '  max-width: calc(100vw - 32px);',
  '  padding: 6px;',
  '  border: 1px solid var(--line);',
  '  border-radius: 14px;',
  '  background: var(--card);',
  '  box-shadow: 0 8px 24px rgba(0, 0, 0, .14);',
  '  opacity: 0;',
  '  visibility: hidden;',
  '  pointer-events: none;',
  '  transition: opacity .16s ease-out, visibility .16s ease-out;',
  '}',
  // 开着的那条：`copy-menu-open` 是**运行时**加的类（与 #121 的 `copied` 同口径——类名不加
  // `ilife-` 前缀，故不占样式区命名空间，也不作为 `ilife-` 类名进跨文件检查）；选择器把裸类
  // 排在**前**面，这样从 CSS 里扫出来的 `ilife-` 类名仍只有 `ilife-copy-menu`（T10 ② 认得出产出者）。
  '.copy-menu-open.' + p + 'copy-menu {',
  '  opacity: 1;',
  '  visibility: visible;',
  '  pointer-events: auto;',
  '}',
  '.' + p + 'copy-menu-item {',
  // #152 返修：补最小高——老仓 `.fmt-item` 只写 `padding:10px 12px` ＋ 13px 字，算出来 37px，
  // 低于本仓同区复制按钮的冻结最小值（`spec/controls.ts:308` 的 44px，#525 由 40 改到 44）。44 不另写一个数，
  // 引用同一个定义地；窄屏那档仍由下面的 `min-height:44px` 托底（老仓 `.fmt-item` 是 36px）。
  '  min-height: ' + ACTION_BAR_DEFAULTS.minHeightPx + 'px;',
  '  display: flex;',
  '  justify-content: space-between;',
  '  gap: 14px;',
  '  width: 100%;',
  '  padding: 10px 12px;',
  '  border: none;',
  '  border-radius: 8px;',
  '  background: none;',
  '  color: var(--fg);',
  '  font-family: inherit;',
  '  font-size: 13px;',
  '  text-align: left;',
  '  cursor: pointer;',
  '  -webkit-tap-highlight-color: transparent;',
  '  touch-action: manipulation;',
  '}',
  '.' + p + 'copy-menu-item:hover {',
  '  background: var(--soft);',
  '}',
  // 标签（格式键）：显式一条——省得继承菜单项的既有值，也让「CSS 里每个类名都有产出者、
  // 每个产出类名都有 CSS」这条跨文件检查两面都成立（`style.test.mjs` T10）。
  '.' + p + 'copy-menu-item > .' + p + 'copy-menu-label {',
  '  color: var(--fg);',
  '  font-size: 13px;',
  '}',
  // 用途提示：老仓是 `.fmt-item span`（后代选择器，两项 span 都染 11px 灰）；本仓显式给类名，
  // 标签那半仍取 13px／`--fg`（上一条）。选择器用 `>` ——本仓跨文件交叉检查按**整段选择器**比对。
  // **返修**：字色由 `--fg3`（#86868b）改为 `--fg2`（#6e6e73）——11px 属正文，AA 要 4.5:1，
  // 前者对白卡片仅 3.62:1、后者 5.07:1；与同批「12px ＋ `--fg3`」那 7 处改用的是同一个做法（#152）。
  '.' + p + 'copy-menu-item > .' + p + 'copy-menu-hint {',
  '  color: var(--fg2);',
  '  font-size: 11px;',
  '  white-space: nowrap;',
  '}',
  // #179 触控目标：窄屏菜单项抬到 44px（与复制按钮同一口径；老仓 `.fmt-item` 是 36px 上下）。
  '@media (max-width: ' + TOAST_DEFAULTS.mobileMaxPx + 'px) {',
  '  .' + p + 'copy-menu-item {',
  '    min-height: 44px;',
  '  }',
  // 窄屏改**贴按钮算**（老仓那句「右对齐视口内,手机不超界」的落法）：桌面档按钮靠左，200px 的菜单
  // 贴按钮会有一半越到屏幕左外；窄屏按钮在右半格，故改成
  // 「宽 = 视口 − 左右各 16px、右缘贴按钮右缘」——既恒在视口内，又跟着按钮（滚动时不漂、不挡按钮），
  // 也不会像 `position: fixed` 那样把浮层钉在视口底、压住别的正文。
  //
  // **#249 修正**：原先「宽 = 视口 − 32px ＋ 右缘贴按钮」只在按钮位于**右格**时成立；复制数据排在
  // 复制日志前头（`renderActionBar` 的 ghost 行顺序），窄屏上它在**左格**，菜单右缘贴左格右缘 ⇒
  // 菜单左缘跑到视口外 167px（390 实测 x=-167，三项的格式名全看不见）。修法：窄屏把锚点从**包裹层**
  // 换成**整行**（行在这一档挂 `position: relative`，见 `actionBar` 区）；菜单 `left:0; right:0`
  // 就落在行盒（＝内容宽 358）里，按钮在哪一格都在视口内，且仍是「跟着按钮走」的绝对定位浮层。
  '  .' + p + 'copy-menu-wrap {',
  '    position: static;',
  '  }',
  '  .' + p + 'copy-menu {',
  '    left: 0;',
  '    right: 0;',
  '    width: auto;',
  '    min-width: 0;',
  '    max-width: none;',
  '  }',
  '}',
  focusRing('.' + p + 'copy-btn'),
].join(LF)
