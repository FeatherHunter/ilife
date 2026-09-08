# #75 视觉取证（代理证据）— 输出快照

> 可复跑：`node docs/research/t75-visual-evidence.mjs`（需先 `pnpm build`）。无浏览器 → **显式 exit 1**；`DSH_BROWSER` 显式指向不存在的路径 → **显式 exit 1**（返修⑦）；未测量计 FAIL；末行 `RESULT: n/m`。
> 返修（A1／A2 审查后）：② 圆角严格集；⑥ 渐变／圆角取证覆盖**除 charts 段外全部文本**（含 helpShell）；⑧ 新增**契约外部 oracle**（doc:276-288 的 `:root` 块逐字／逐字节）；①／⑤ 新增浏览器实测（运行时 toast 分层、errorReceipt 两行 grid）。

```
# #75 视觉取证（代理证据 · 合成模板 ＋ 真实产出）

- 浏览器：`C:\Program Files\Google\Chrome\Application\chrome.exe`
- 共享 CSS：`buildStyleSheet().css`（17086 B）；helpers：`buildSharedHelpersJs()`
- 载体：`fillTemplate` 合成内容页（6 控件 ＋ charts ＋ 撞车负控）＋ `renderHelpShell` 内置壳（合成 sceneData）
- 外部 oracle：契约 `docs/base-paint-contract.md:276-288` 的 `:root` 块逐字比对（返修项⑧，不引用 `CSS_VAR_TOKENS` 自身）
- 口径：**未测量计 FAIL**；任一条 FAIL → exit 1；无浏览器 → exit 1；`DSH_BROWSER` 不存在 → exit 1（不静默变绿）

| 判据 | 项 | 结果 | 实测 |
|---|---|---|---|
| H-01a | 主色 --blue 逐字（外部 oracle：契约 doc:283） | PASS | 实测=true 期望=true |
| H-01c | 产出含契约 doc:276-288 的 `:root` 块**逐字**（外部 oracle，不引用被测量常量） | PASS | 实测=true 期望=true |
| H-01d | 产出 `:root` 块与契约块**逐字节相等** | PASS | 两侧均 = `:root {…--blue: #007aff;…}`（11 token 逐值，逐字节相等） |
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
| H-12 | toast 栈窄屏 left:12px / right:12px | PASS | 实测="12px/12px" 期望="12px/12px" |
| B-12a | toast 栈 position fixed ＋ 间距取 TOAST_DEFAULTS.gapPx | PASS | 实测="fixed/8px" 期望="fixed/8px" |
| B-12b | toast 卡面 = var(--card) | PASS | 实测="rgb(255, 255, 255)" 期望="rgb(255, 255, 255)" |
| B-12c | toast 圆角 14px | PASS | 实测="14px" 期望="14px" |
| B-11a | action-row 两列（evenRowPairs） | PASS | 实测=2 期望=2 |
| B-11b | ghost 行独占一列 | PASS | 实测=1 期望=1 |
| B-11c | 按钮 min-height/字号/字重取 ACTION_BAR_DEFAULTS | PASS | 实测="40px/12px/600" 期望="40px/12px/600" |
| B-11d | copy-btn ghost 描边 = --blue 38% alpha | PASS | 实测="rgba(0, 122, 255, 0.38)" 期望="rgba(0, 122, 255, 0.38)" |
| B-12d | statusBadge 四态底色可区分 | PASS | 实测=true 期望=true |
| B-12e | errorReceipt 容器内距 20px 22px | PASS | 实测="20px 22px" 期望="20px 22px" |
| B-12f | errorReceipt 容器圆角 14px | PASS | 实测="14px" 期望="14px" |
| R6 | 撞车负控：calorie 的 ilife-error 节点不受污染 | PASS | 实测="0px/rgba(0, 0, 0, 0)/0px" 期望="0px/rgba(0, 0, 0, 0)/0px" |
| H-20 | reduced-motion 下 copy-btn 过渡关闭 | PASS | 实测="0s" 期望="0s" |
| B-04 | charts 容器 position relative（复用 chartsCss） | PASS | 实测="relative" 期望="relative" |
| B-12c2 | 运行时 toast 探针命中（真实 helpers 产出 title-detail） | PASS | 实测=true 期望=true |
| H-12c | 运行时 toast 标题与详情**不同行**（返修①：rt_title_top ≠ rt_detail_top） | PASS | rt_title_top=621／rt_detail_top=653／rt_toast_h=113px |
| H-12d | 运行时 toast 结构：无 `.ilife-toast-body` 包裹 ＋ flex-wrap:wrap | PASS | 实测="false/wrap" 期望="false/wrap" |
| H-12e | 运行时 toast 高度 > 单行（≥40px） | PASS | 实测=true 期望=true |
| B-12h | 静态 toast 仍单行：icon／body／close 顶边同高（wrap 未把 body 折行） | PASS | st_icon_top=404／st_body_top=404／st_close_top=404 |
| B-12i | errorReceipt 按钮区 = grid 2 列（返修⑤） | PASS | 实测="grid/2" 期望="grid/2" |
| B-12j | errorReceipt retry 按钮跨全列（宽 ≈ 容器宽） | PASS | retry_w=1337px／容器_w=1337px |
| B-12k | errorReceipt 两个 ghost 各半宽（≈ (容器宽 − 8) / 2） | PASS | ghost_w=665px／期望≈664.5px |

RESULT: 56/56
```
