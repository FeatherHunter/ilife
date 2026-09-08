# #75 视觉取证（代理证据）— 输出快照

> 可复跑：`node docs/research/t75-visual-evidence.mjs`（需先 `pnpm build`）。无浏览器 → **显式 exit 1**，不静默变绿；未测量计 FAIL；末行 `RESULT: n/m`。

```
# #75 视觉取证（代理证据 · 合成模板 ＋ 真实产出）

- 浏览器：`C:\Program Files\Google\Chrome\Application\chrome.exe`
- 共享 CSS：`buildStyleSheet().css`（16912 B）；helpers：`buildSharedHelpersJs()`
- 载体：`fillTemplate` 合成内容页（6 控件 ＋ charts ＋ 撞车负控）＋ `renderHelpShell` 内置壳（合成 sceneData）
- 口径：**未测量计 FAIL**；任一条 FAIL → exit 1；无浏览器 → exit 1（不静默变绿）

| 判据 | 项 | 结果 | 实测 |
|---|---|---|---|
| H-01a | 主色 --blue 逐字 #007aff | PASS | 实测=true 期望=true |
| H-01b | B1 其它候选主色命中 0 | PASS | 实测=0 期望=0 |
| H-04 | 非 charts 段渐变命中 0（charts 段 1 处为复用的虚线图例） | PASS | 实测=0 期望=0 |
| H-07 | font-feature-settings:"tnum" 命中 ≥1 | PASS | 实测=true 期望=true |
| H-10a | 圆角集 ⊆ {8,14,20,999,50%} | PASS | 实测=0 期望=0 |
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

RESULT: 42/42
```

