# #75 视觉取证（代理证据）— 输出快照

> 可复跑：`node docs/research/t75-visual-evidence.mjs`（需先 `pnpm build`）。无浏览器 → **显式 exit 1**；`DSH_BROWSER` 显式指向不存在的路径 → **显式 exit 1**（返修⑦）；未测量计 FAIL；末行 `RESULT: n/m`。
> 第一轮返修：② 圆角严格集；⑥ 渐变／圆角取证覆盖**除 charts 段外全部文本**（含 helpShell）；⑧ 新增**契约外部 oracle**（doc:276-288 的 `:root` 块逐字／逐字节）；①／⑤ 新增浏览器实测（运行时 toast 分层、errorReceipt 两行 grid）。
> 第二轮返修：**W1** 判据升级为「关闭按钮与标题同行」`rt_close_top === rt_title_top` ＋ 高度**结构判据**；**W2** statusBadge 四态逐值（外部 oracle 旧 `base.css:225-228`）；**W3** `copied` 变绿；**W4** 入场动效（computed `animationName` ＋ reduced-motion 归零 ＋ 无动画时可见）；**W5** errorReceipt 逐值（520 居中／row-gap 14px）；**W8** 窄屏改 **iframe 宽 375**（`--window-size=375` 实测 innerWidth=526）。

```
# #75 视觉取证（代理证据 · 合成模板 ＋ 真实产出）

- 浏览器：`C:\Program Files\Google\Chrome\Application\chrome.exe`
- 共享 CSS：`buildStyleSheet().css`（17452 B）；helpers：`buildSharedHelpersJs()`
- 载体：`fillTemplate` 合成内容页（6 控件 ＋ charts ＋ 撞车负控）＋ `renderHelpShell` 内置壳（合成 sceneData）
- 窄屏（W8）：同一张控制页嵌 **iframe 宽 375**（`--window-size=375` 实测 innerWidth=526，`≤400px` 断点覆盖不到）；`H-12f` 自证内层 innerWidth=375
- 外部 oracle：契约 `docs/base-paint-contract.md:276-288` 的 `:root` 块逐字比对（返修项⑧，不引用 `CSS_VAR_TOKENS` 自身）；statusBadge 逐值取旧 `base.css:225-228`
- W1 判据：`rt_close_top === rt_title_top`（关闭按钮与标题同行）＋ 高度结构判据（`toast_h − body_h ≤ 30px`）＋ 结构 `.toast-body`／`.toast-title-row` 命中
- 口径：**未测量计 FAIL**；任一条 FAIL → exit 1；无浏览器 → exit 1；`DSH_BROWSER` 不存在 → exit 1（不静默变绿）

| 判据 | 项 | 结果 | 实测 |
|---|---|---|---|
| H-01a | 主色 --blue 逐字（外部 oracle：契约 doc:283） | PASS | 实测=true 期望=true |
| H-01c | 产出含契约 doc:276-288 的 `:root` 块**逐字**（外部 oracle，不引用被测量常量） | PASS | 实测=true 期望=true |
| H-01d | 产出 `:root` 块与契约块**逐字节相等** | PASS | 实测=":root {\n  --fg: #1d1d1f;\n  --fg2: #6e6e73;\n  --fg3: #86868b;\n  --bg: #f5f5f7;\n  --card: #ffffff;\n  --line: #d2d2d7;\n  --blue: #007aff;\n  --blue2: #0a63ce;\n  --soft: #f5f8ff;\n  --ok: #34c759;\n  --shadow: 0 1px 2px rgba(0,0,0,.04), 0 12px 36px rgba(0,0,0,.06);\n}" 期望=":root {\n  --fg: #1d1d1f;\n  --fg2: #6e6e73;\n  --fg3: #86868b;\n  --bg: #f5f5f7;\n  --card: #ffffff;\n  --line: #d2d2d7;\n  --blue: #007aff;\n  --blue2: #0a63ce;\n  --soft: #f5f8ff;\n  --ok: #34c759;\n  --shadow: 0 1px 2px rgba(0,0,0,.04), 0 12px 36px rgba(0,0,0,.06);\n}" |
| H-01e | 契约块每一行逐字命中产出（逐 token 外部锚点） | PASS | 实测=0 期望=0 |
| H-01b | B1 其它候选主色命中 0 | PASS | 实测=0 期望=0 |
| H-04 | 非 charts 段渐变命中 0（含 helpShell 段；charts 段 1 处为复用的虚线图例） | PASS | 实测=0 期望=0 |
| H-04b | nonCharts 切片覆盖 charts 之后的 helpShell 段（返修⑥自证） | PASS | 实测=true 期望=true |
| H-07 | font-feature-settings:"tnum" 命中 ≥1 | PASS | 实测=true 期望=true |
| H-10a | 非 charts 段圆角集 ⊆ {8,14,20,999,50%}（严格集，无 2px／6px 豁免） | PASS | 实测=0 期望=0 |
| H-10a2 | charts 段圆角只额外豁免 2px（#78 图例色块） | PASS | 实测=0 期望=0 |
| H-10c | 全表不得出现 6px 圆角（返修项②：原 `.ilife-toast-count`） | PASS | 实测=false 期望=false |
| H-10b | 阴影只取冻结单条 --shadow | PASS | 实测=true 期望=true |
| H-20a | :focus-visible 命中 ≥1 | PASS | 实测=true 期望=true |
| H-20b | @media (prefers-reduced-motion: reduce) 命中 ≥1 | PASS | 实测=true 期望=true |
| Q14a | 禁入 token 命中 0 | PASS | 实测=0 期望=0 |
| Q14b | 深色区命中 0（[data-theme / prefers-color-scheme: dark） | PASS | 实测=false 期望=false |
| C-19 | 资产裸文本（无 <style> 包裹） | PASS | 实测=false 期望=false |
| C-6 | 8 个样式区全命中 | PASS | 实测=8 期望=8 |
| H-18a | 空态 padding 48px 20px | PASS | 实测="48px 20px" 期望="48px 20px" |
| H-18b | 空态图标 40px | PASS | 实测="40px" 期望="40px" |
| H-18c | 空态图标 opacity .5 | PASS | 实测="0.5" 期望="0.5" |
| H-18d | 空态标题 17px/600 | PASS | 实测="17px/600" 期望="17px/600" |
| H-18e | 空态说明 13px | PASS | 实测="13px" 期望="13px" |
| H-15a | 命令板 <pre> 字号 12px | PASS | 实测="12px" 期望="12px" |
| H-15b | 命令板 line-height 1.55 | PASS | 实测="18.6px" 期望="18.6px" |
| H-15c | 命令板 white-space pre-wrap | PASS | 实测="pre-wrap" 期望="pre-wrap" |
| H-15d | 命令板 overflow-x auto | PASS | 实测="auto" 期望="auto" |
| H-15e | 命令板圆角 8px | PASS | 实测="8px" 期望="8px" |
| H-11a | 列表首行无边框 | PASS | 实测="0px" 期望="0px" |
| H-11b | 列表后续行 1px 分隔线 | PASS | 实测="1px" 期望="1px" |
| H-09 | HELP 内容列 max-width 960px ＋ 内距 32px 20px 80px | PASS | 实测="960px / 32px 20px 80px" 期望="960px / 32px 20px 80px" |
| H-07 | HELP 根 tnum | PASS | 实测="\"tnum\"" 期望="\"tnum\"" |
| H-10 | HELP 卡圆角 14px | PASS | 实测="14px" 期望="14px" |
| H-12 | toast 栈桌面居中（left 为视口半宽，非 12px） | PASS | 实测=true 期望=true |
| H-12f | 窄屏判据跑在**真 375px** 视口（iframe 内层 innerWidth === 375，W8） | PASS | 实测=375 期望=375 |
| H-12 | toast 栈窄屏 left:12px / right:12px | PASS | 实测="12px/12px" 期望="12px/12px" |
| B-12a | toast 栈 position fixed ＋ 间距取 TOAST_DEFAULTS.gapPx | PASS | 实测="fixed/8px" 期望="fixed/8px" |
| B-12b | toast 卡面 = var(--card) | PASS | 实测="rgb(255, 255, 255)" 期望="rgb(255, 255, 255)" |
| B-12c | toast 圆角 14px | PASS | 实测="14px" 期望="14px" |
| B-11a | action-row 两列（evenRowPairs） | PASS | 实测=2 期望=2 |
| B-11b | ghost 行独占一列 | PASS | 实测=1 期望=1 |
| B-11c | 按钮 min-height/字号/字重取 ACTION_BAR_DEFAULTS | PASS | 实测="40px/12px/600" 期望="40px/12px/600" |
| B-11d | copy-btn ghost 描边 = --blue 38% alpha | PASS | 实测="rgba(0, 122, 255, 0.38)" 期望="rgba(0, 122, 255, 0.38)" |
| B-12d0 | statusBadge 四态底色可区分（弱判据，逐值见 B-12d/B-12d2/B-12d3/B-12d4） | PASS | 实测=true 期望=true |
| B-12e | errorReceipt 容器内距 20px 22px | PASS | 实测="20px 22px" 期望="20px 22px" |
| B-12f | errorReceipt 容器圆角 14px | PASS | 实测="14px" 期望="14px" |
| R6 | 撞车负控：calorie 的 ilife-error 节点不受污染 | PASS | 实测="0px/rgba(0, 0, 0, 0)/0px" 期望="0px/rgba(0, 0, 0, 0)/0px" |
| H-20 | reduced-motion 下 copy-btn 过渡关闭 | PASS | 实测="0s" 期望="0s" |
| B-04 | charts 容器 position relative（复用 chartsCss） | PASS | 实测="relative" 期望="relative" |
| B-12c2 | 运行时 toast 探针命中（真实 helpers 产出 title-detail） | PASS | 实测=true 期望=true |
| H-12c | 运行时 toast 标题与详情**不同行**（rt_title_top ≠ rt_detail_top 且标题在上） | PASS | rt_title_top=675／rt_detail_top=693／rt_toast_h=58px |
| H-12c3 | W1：运行时 toast **关闭按钮与标题同行**（rt_close_top === rt_title_top） | PASS | rt_close_top=675／rt_title_top=675／rt_toast_h=58px |
| H-12d | W1：运行时 toast 结构与静态产出器同构（`.toast-body` ＋ `.toast-title-row` 命中，detail 在 body 内，无 flex-wrap） | PASS | 实测="true/true/true/nowrap" 期望="true/true/true/nowrap" |
| H-12e | 运行时 toast 高度 = body 高度 ＋ 内距/描边（关闭按钮不另占行）且落在 [50,90]px | PASS | rt_toast_h=58px／rt_body_h=32px／差值=26px（上限 30＝28 内距描边＋2 取整） |
| B-12h | 静态 toast 仍单行：icon／body／close 顶边同高（未折行） | PASS | st_icon_top=462／st_body_top=462／st_close_top=462 |
| H-12g | W8：窄屏 375px 下运行时 toast 关闭按钮与标题同行 | PASS | rt_close_top=743／rt_title_top=743／rt_toast_h=58px |
| H-12h | W8：窄屏 375px 下运行时 toast 不溢出视口（right ≤ 375 且宽度 > 0） | PASS | rt_right=331／rt_toast_w=302px／innerWidth=375 |
| H-21a | W4：toast 入场动效挂在 `.ilife-toast` 上（computed animationName） | PASS | 实测="ilife-toast-in" 期望="ilife-toast-in" |
| H-21b | W4：入场动效时长/填充模式（0.22s ＋ fill-mode both ⇒ 终态保持可见） | PASS | animationDuration=0.22s／fillMode=both |
| H-21c | W4：reduced-motion 下动画**归零**（animationName = none） | PASS | 实测="none" 期望="none" |
| H-21e | W4：无动画时 toast 默认可见（reduced-motion 页 computed opacity = 1） | PASS | 实测="1" 期望="1" |
| H-21f | W4：关键帧终态 `to { opacity: 1 }`（入场结束保持可见，不依赖 JS 加类） | PASS | true |
| H-21d | W4：CSS 文本含 `@keyframes <prefix>toast-in`（CSS-only，不依赖 JS） | PASS | 实测=true 期望=true |
| B-12m | W3：`.ilife-copy-btn.copied` 背景 = 成功色 `--ok`（#34c759 → rgb(52, 199, 89)） | PASS | 实测="rgb(52, 199, 89)" 期望="rgb(52, 199, 89)" |
| H-16a | W3：弹簧动画时长 450ms 在 copy-btn 基座上（B1 benchmark:279） | PASS | transitionDuration=0.45s, 0.2s |
| B-12j | W5：errorReceipt 按钮区逐值 = 旧 `.hm-actions`（max-width 520 居中；retry 520／ghost 256；row-gap 14px） | PASS | max-width=520px／容器_w=520／retry_w=520／ghost_w=256／row-gap=14px／column-gap=8px／居中偏移=0px |
| B-12i | errorReceipt 按钮区 = grid 2 列（返修⑤） | PASS | 实测="grid/2" 期望="grid/2" |
| B-12d | W2：statusBadge ok 底色/字色逐值（#e6f7ec / #1f8c3d） | PASS | 实测="rgb(230, 247, 236) / rgb(31, 140, 61)" 期望="rgb(230, 247, 236) / rgb(31, 140, 61)" |
| B-12d2 | W2：statusBadge warn 底色/字色逐值（#fff5e0 / #a25b00） | PASS | 实测="rgb(255, 245, 224) / rgb(162, 91, 0)" 期望="rgb(255, 245, 224) / rgb(162, 91, 0)" |
| B-12d3 | W2：statusBadge danger 底色/字色逐值（#fff0ee / #a83228） | PASS | 实测="rgb(255, 240, 238) / rgb(168, 50, 40)" 期望="rgb(255, 240, 238) / rgb(168, 50, 40)" |
| B-12d4 | W2：statusBadge empty 底色逐值（#f0f0f3）＋ 四态可区分 | PASS | 实测="rgb(240, 240, 243) / true" 期望="rgb(240, 240, 243) / true" |

RESULT: 71/71
```
