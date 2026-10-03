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
  // base 变体（多钮行左起）：包裹层不再铺满格子，跟着内容走（`width: auto` ＋ 左起横排）——
  // ghost 行已改 flex 左起，两颗宽高不再强制一致；窄档／`copy-btn-wide`／`copied`／禁用／44px 不动。
  '  position: relative;',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: flex-start;',
  '  width: auto;',
  '}',
  // 开合器跟着内容走：不再铺满格子（`width: auto`），与包裹层同口径左起。
  '.' + p + 'copy-menu-wrap > .' + p + 'copy-btn {',
  '  width: auto;',
  '}',
  // base 变体·字面 `▾` 常显：`::after` 不再用 `border` 画三角，直接打字面 `▾`（常显，不随开合旋转）——
  // 开着（`.copy-menu-open`）不旋转；日志按钮不在 `copy-menu-wrap` 内故无符。
  // **用户 2026-10-03 口径**：`▾` 贴在**文字右侧**（不是按钮最右缘），且**文字本身居中**。
  // 做法＝`::after` 行内紧跟文字（间距仍取基础 gap 6px），左侧再放一枚**同字同宽、`visibility: hidden`
  // 的镜像**：两枚箭头等宽 ⇒ 居中算出来的中心落在文字上，箭头自然贴文字右缘。
  // （与两钮左缘对齐那处用的是同一条「隐形占位」手法，不新造取值。）
  '.' + p + 'copy-menu-wrap > .' + p + 'copy-btn::before {',
  '  content: "▾";',
  '  visibility: hidden;',
  '  margin-right: 6px;',
  '}',
  '.' + p + 'copy-menu-wrap > .' + p + 'copy-btn::after {',
  '  content: "▾";',
  '  margin-left: 6px;',
  '}',
  // 复制完成后按钮文字换成「已复制 ✓」，符要收掉（否则两枚记号并排）——从查询域上浮到 base，
  // 仍是唯一一处定义，页面侧不再各写一条。
  '.' + p + 'copy-btn.copied::after {',
  '  content: none;',
  '}',
  '.copy-menu-open.' + p + 'copy-menu-wrap > .' + p + 'copy-btn::after {',
  '  transform: none;',
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
  // ── 票据纸档（规格 §6「按钮与复制菜单形态」）────────────────────────────────
  // 为什么住公共层：这一族的形状票据纸的**每一页**都要（采集页复制区、查询页动作区、设置页退出口），
  // 页面侧各写一遍就是「共用件从第二个用法长出来」要收的那笔账（#1082 公共化）。
  // 为什么挂两枚祖先类：`.copy-btn` 是全技能共用件，票据纸这套形状换到别的皮肤上会改别的技能的观感
  // ⇒ 选择器写 `.ilife-page-ui .ilife-skin-ticket`，别的皮肤零命中；三枚类也压过页面侧那份
  // `.ilife-bill-sheet-page .ilife-copy-btn`（同一套形状，页面那份成为死规则，交 #1082 收）。
  // 出处＝`proto/style-spec/style-tokens.md` §6 第 85–90 行 ＋ 判地 w01 实测盒（`.btn` 46.3px）。
  '.' + p + 'page-ui .' + p + 'skin-ticket ' + ' .' + p + 'copy-btn {',
  '  width: 100%;',
  '  min-height: 44px;',
  '  padding: 12px 14px;',
  '  border: 1.5px solid #ddd0b6; /* 规格 §6 授权照抄：次按钮 1.5px 暖边 #ddd0b6 */',
  '  border-radius: 13px; /* 规格 §6 授权照抄：radius 13px（主/次按钮同档） */',
  '  background: #fff; /* 规格 §6 授权照抄：次按钮白底 #fff */',
  '  color: #4a4236; /* 判地字面 · 授权照抄：#4a4236（次按钮字色） */',
  '  font-size: 14.5px; /* 规格 §6 授权照抄：14.5px／w800 */',
  '  font-weight: 800;',
  '  letter-spacing: .5px;',
  // 判地 `.btn` 不写行高：46.3px ＝ 12+12 内距 ＋ 1.5+1.5 边 ＋ 19.3（14.5px 的 normal 行盒）。
  // 基础档写死 `line-height:1`（其余皮肤沿用）⇒ 这一档必须显式收回 normal，否则整颗矮 1.3px。
  '  line-height: 1.4; /* 判地字面 · 授权照抄：行高 1.4（判地按钮标签住 .btn-in，行盒 20.3px） */',
  '}',
  '.' + p + 'page-ui .' + p + 'skin-ticket ' + ' .' + p + 'copy-menu {',
  '  left: 0;',
  '  right: 0;',
  '  min-width: 0;',
  '  max-width: none;',
  '  padding: 6px;',
  '  border: 1.5px solid #ddd0b6; /* 规格 §6 授权照抄：菜单 1.5px 暖边 #ddd0b6 */',
  '  border-radius: 12px; /* 规格 §6 授权照抄：复制菜单圆角 12px */',
  '  background: #fff; /* 规格 §6 授权照抄：浮层白底 #fff */',
  '  box-shadow: var(--ilife-shadow-pop); /* 规格 §2 授权照抄：浮层投影 shadow-pop */',
  '}',
  '.' + p + 'page-ui .' + p + 'skin-ticket ' + ' .' + p + 'copy-menu-item {',
  '  min-height: 44px;',
  '  padding: 10px 12px;',
  '  border-radius: 8px;',
  '  font-size: 13.5px; /* 规格 §6 授权照抄：菜项 13.5px／w700 */',
  '  font-weight: 700;',
  '}',
  '.' + p + 'page-ui .' + p + 'skin-ticket ' + ' .' + p + 'copy-menu-item:hover {',
  '  background: #faf5e9; /* 判地字面 · 授权照抄：#faf5e9（菜项悬停底） */',
  '}',
  '.' + p + 'page-ui .' + p + 'skin-ticket ' + ' .' + p + 'copy-menu-item > .' + p + 'copy-menu-label {',
  '  font-size: 13.5px;',
  '  font-weight: 700;',
  '  color: var(--ilife-ink);',
  '}',
  '.' + p + 'page-ui .' + p + 'skin-ticket ' + ' .' + p + 'copy-menu-item > .' + p + 'copy-menu-hint {',
  '  font-size: 11.5px; /* 规格 §6 授权照抄：右注 11.5px／w600 */',
  '  font-weight: 600;',
  '  color: var(--ilife-ink-2);',
  '}',
  focusRing('.' + p + 'copy-btn'),
].join(LF)
