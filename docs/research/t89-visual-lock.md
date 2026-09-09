# #89 视觉锁 B1 逐值验收 · 实施结论（第 2 任实施席）

- 票：`#89`（89b 收尾验收）· 取证轮 runId：`536e8b9c-5a93-4ad0-bd92-5e125480300d`
- 证据：`docs/research/t89-evidence/536e8b9c-5a93-4ad0-bd92-5e125480300d/`（58 文件／2,078,259 B；`MANIFEST.json`＋`SHA256SUMS.txt` 55/55 自验通过；Chrome profile 与 1.26MB HTML 未入库）
- 被验产物：`.scratch/t89/help-file.html`（1264822 B，sha256_16=`F380EF685065A1E9`，与交接基线逐字节一致，可一命令再生）
- 浏览器：`Chrome/152.0.7977.83 / protocol 1.3`（CDP 直连，零第三方）
- 口径：判据按 CSS 区收窄（H-01 禁色只约束 UI 主色，图表色板例外 D-10；H-04／H-10 按 CSS 区判，charts 区除外 L-17）；无浏览器显式失败不静默变绿（P5 自证 exit 2＋RESULT: ABORT）
- 照判裁定：H-12 的 400px 子句按冻结 820 为准；H-17 HELP 页 N/A；H-06 如实判「未达」＋最小修复方案（不改冻结面）
- 本席不改产品代码与冻结尺；不关票（#89 关闭权归编排者）；`SKILL.md` 首 3 字节 `2d 2d 2d` 非零已自检

## 1. B1 20 条逐值表（每条：verdict／实测值／证据路径／逐字复算命令）

| 条 | verdict | 实测值 | 证据路径（证据根下） | 逐字复算命令（仓根，持锁） |
|---|---|---|---|---|
| H-01 | PASS | 禁色命中`[]`；`--blue:#007aff`逐字；computed 根/壳均为`#007aff` | `S/probe-static.json`(H-01)＋`shots/H-01/{viewport,element}.png`＋`shots/probe-shots.json`(H-01.1/.2) | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-static.mjs --out <dir>`；`node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-shots.mjs --out <dir>` |
| H-02 | PASS | 冻结 token 7/7；h1/卡标题`rgb(29,29,31)`=--fg，副标题/命令`rgb(110,110,115)`=--fg2；--fg3 仅落 ≤13px 提示层 3 类 | `S/probe-static.json`(H-02)＋`shots/H-02/{viewport,element,lead}.png`＋`shots/probe-shots.json`(H-02.1/.2/.3) | 同上 |
| H-03 | PASS | `--bg:#f5f5f7`≠`--card:#ffffff`；卡面 computed 纯白`rgb(255,255,255)` | `S/probe-static.json`(H-03)＋`shots/H-03/{viewport,card}.png`＋`shots/probe-shots.json`(H-03.1) | 同上 |
| H-04 | PASS | `gradHelp:0`／`gradAll:1`／`gradCharts:1`（charts 区 `repeating-linear-gradient` 属冻结图表资产，例外） | `S/probe-static.json`(H-04)＋`shots/H-04/element.png`＋`shots/probe-shots.json`(H-04.1) | 同上（须同时打印 gradHelp 与 gradAll） |
| H-05 | PASS | 无 ≥48px（max 32，D-9 不要求）；h2 17px/600×3；正文 15px；提示 12/13px；h1 32px/700∈[28,32] | `S/probe-static.json`(H-05)＋`shots/H-05/element.png`＋`shots/probe-shots.json`(H-05.1/.2/.3) | 同上 |
| H-06 | 未达 | 等宽面 PASS（computed`"SF Mono",monospace`逐字开头，Consolas=0）；正文面缺失：CSS 栈仅`SF Mono/inherit`（sfPro=0），正文 computed 回落浏览器默认`"Noto Sans SC"` | `S/probe-static.json`(H-06)＋`shots/H-06/element.png`＋`shots/probe-shots.json`(H-06.1 PASS／H-06.2 FAIL) | 同上（修复方案见 §4，不改冻结面） |
| H-07 | PASS | CSS `font-feature-settings…tnum`命中 2；computed 壳/计数/徽章/卡标题均为`"tnum"` | `S/probe-static.json`(H-07)＋`shots/H-07/element.png`＋`shots/probe-shots.json`(H-07.1) | 同上 |
| H-08 | PASS | h1/h2 共 4 个，emoji 命中 0；h1=`唤醒词速查台`（D-12 已去 emoji） | `S/probe-static.json`(H-08)＋`shots/H-08/element.png`＋`shots/probe-shots.json`(H-08.1) | 同上 |
| H-09 | PASS | CSS 逐字`max-width:960px`＋`padding:32px 20px 80px`；1440 视口 computed 32/20/20/80＋960px；居中留白 211/211 | `S/probe-static.json`(H-09)＋`shots/H-09/element.png`＋`shots/probe-shots.json`(H-09.1/.2) | 同上 |
| H-10 | FAIL | CSS 声明面：`cssBad=[{sel:.ilife-help-shell-card-mark,radius:4px}]`∉{8,14,20,999px,50%}；阴影面 PASS（全 `var(--shadow)`）；computed 抽样 badCount=0 | `S/probe-static.json`(H-10)＋`shots/H-10/element.png`＋`shots/probe-shots.json`(H-10.1 FAIL／H-10.2 PASS) | 同上（按 CSS 区判；charts 区 2px 已除外） |
| H-11 | PASS | 首行 `border-top:0px`、后续行`1px solid rgb(210,210,215)`；`:first-child{border-top:0}`规则命中 2 | `S/probe-static.json`(H-11)＋`shots/H-11/element.png`＋`shots/probe-shots.json`(H-11.1) | 同上 |
| H-12 | PASS | 静态 m640:1／m400:1（图表 720／toast 栈 820 并存，D-6）；三档 computed：1440→32/20/20/80＋960px，640／400→20/16/16/60；400px toast 栈 left/right=12px（经冻结 820 层承担，照判）；交互记录齐 | `I/probe-interactive.json`(H12)＋`I/h12-{1440,640,400}.png`＋`shots/H-12/viewport-{1440,640,400}.png` | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-interactive.mjs --out <dir>` |
| H-13 | N-A | HELP 页 `.kpi`命中 0（shots domCounts）；转内容页 B-02（§2） | `blocks/B-02/viewport.png`＋`blocks/probe-blocks.json`(B-02.1/.2/.3/.4/.5) | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-blocks.mjs --out <dir>` |
| H-14 | N-A | HELP 页 `<svg>`=0／`<circle>`=0；转内容页 B-04（§2） | `blocks/B-04/viewport.png`＋`blocks/probe-blocks.json`(B-04.1/.2/.3/.4) | 同上 |
| H-15 | PASS | `<pre>`载体 439 个；computed 等宽栈／12px／行高比 1.55／pre-wrap／overflow-x:auto／圆角 8px 全满足 | `S/probe-static.json`(H-15)＋`shots/H-15/element.png`＋`shots/probe-shots.json`(H-15.1/.2) | S＋shots 命令（见 H-01 行） |
| H-16 | PASS | 真手势命中；copied 存活 453.2ms∈[440,520]（页面侧双计时器）；剪贴板归一后逐字等长 82；复原无残留；toast 恰 1 枚存活 4501ms≈冻结 4500；抽 40 卡每卡 1 按钮；无「复制全部」（D-8）；t121 交叉 22/22（含失败零加类＋danger toast）；shots before/after 双证 | `I/probe-interactive.json`(H16)＋`shots/H-16/{before,after}.png`＋`R1/t121-t89reuse.log`(22/22) | I 命令（见 H-12 行）＋`node tooling/run-locked.mjs --ticket 89 -- node docs/research/t121-browser-evidence.mjs --label t89reuse` |
| H-17 | N-A | HELP 页 `<table>`=0（照判 N/A）；转内容页 B-03：th 大写／透明／1px／12px／600，td 内距 12–14px／1px 软描边／末行无边框，整表在卡片内（§2 全绿） | `blocks/B-03/viewport.png`＋`blocks/probe-blocks.json`(B-03.1/.2/.3/.4/.5) | blocks 命令（见 H-13 行） |
| H-18 | PASS | 空态卡片外观（白底／20px 圆角／1px 描边／居中）；padding 48/20；图标 40px／.5；标题 17px／600；说明 13px `#86868b` | `shots/H-18/{viewport,element}.png`＋`shots/probe-shots.json`(H-18.1/.2/.3/.4) | shots 命令（见 H-01 行，空态样本现场构造） |
| H-19 | PASS | 几何 42×42／50%／fixed／right=bottom=24；scrollY=0 时 opacity 0＋pe none；401 时出现可点；点击 rAF 22 采样单调降到 0；t88 交叉 B20／B22／B23／B25／B27 全 PASS | `I/probe-interactive.json`(H19.trace)＋`shots/H-19/{before,after}.png`＋`R2/t88-evidence-b.log`(B20/B22/B23/B25/B27) | I 命令＋`node tooling/run-locked.mjs --ticket 89 -- node docs/research/t88-browser-evidence-b.mjs`（注：B26 红系 fields:341 过期断言，非 #89 面） |
| H-20 | PASS | reduce 下复制／回顶过渡 0s、toast 动画 none；Tab 遍历 6 次 4 环（I）＋10 控件 10 环（shots）；首 Tab SUMMARY :focus-visible＋1px 环；焦点截图齐（两套件零命中故新采） | `I/probe-interactive.json`(H20)＋`shots/H-20/focus.png`＋`shots/probe-shots.json`(H-20.1/.2/.3) | I 命令＋shots 命令 |

verdict 分布：**PASS 15／N-A 3（H-13／H-14／H-17，转区块）／未达 1（H-06）／FAIL 1（H-10）**，合计 20/20 无遗漏。

**RESULT: 15/20 PASS, 3 N-A, 1 未达, 1 FAIL**

备注（非 verdict 项）：H-05「相邻档差 ≥4px」面向含 48px 档的完整阶梯；HELP 页按 D-9 无 48px 档（实测档 12／13／15／17／32），该子句在 HELP 页不适用——机判子项（H-05.1／.2／.3）全绿故整条 PASS。

## 2. 区块级结果（B-01…B-12，`RESULT: 39/39 PASS`）

探针 `docs/research/t89-probe-blocks.mjs`（本席修 5 处取证 bug 后全绿，runId `3ddb1565-272b-437d-a11f-bf265a7e230b`）：

| 区块 | 结论 | 实测锚点 |
|---|---|---|
| B-01 页面壳 | PASS | 占位符残留 0；id 唯一；根类名含 `ilife-` 前缀；壳命名空间齐 |
| B-02 KPI 卡（承接 H-13） | PASS | 四槽语义齐（label／value-row＋value／detail；unit 并入 value 文本如“肥肠面 1500 卡”，today 页有独立 unit 节点“卡”）；非法 status 降级 empty；computed 四槽＋tnum（`font-feature-settings:"tnum"`） |
| B-03 表格（承接 H-17） | PASS | `<table>/<thead>/<th>/<td>`＝2／2／15／51；caption＋卡片容器；computed 见 H-17 行 |
| B-04 图表（承接 H-14） | PASS | 命名空间＋viewBox 齐；`<canvas>`＝0；8 kind＋empty=true＋非法抛 `ChartError` |
| B-05 列表 | PASS | 命名空间 `ilife-block-list-rows`；行左/中/右三槽各 5 且与行数相等 |
| B-06 指令块 | PASS | 真实 `<pre>`（measure-wizard）；data-action-id＝data-t；computed 六项全满足 |
| B-07 详情区 | PASS | 必填五字段逐字；`types`复数无单数别名；STATUS 两值闭集 |
| B-08 折叠区 | PASS | 原生 details／summary 各 5；HELP 同卡点复制后 80ms 内 open 不变（true→true） |
| B-09 表单 | PASS | ns／label／input 齐（15 字段 name＋placeholder）；computed 抽样齐 |
| B-10 空态 | PASS | 冻结 `renderEmptyState` 四件套；computed 七项全满足 |
| B-11 复制区 | PASS | 两属性分工；空文本短路 ok:false 且零端口调用；渲染后双属性齐 |
| B-12 反馈区 | PASS | role=status／aria-live=polite；闭集 8 区；缺文本零按钮；运行时 toast 单枚 |

取证修复记账（只改探针，不碰产品／冻结尺）：① markup 计数剥离 `<style>/<script>`（diet 页 `pre:3` 全在注释里、ranking 页 label 计数在样式定义里）；② B-02 按产物实际 `-card-` 命名＋unit 并入 value 文本（只锚 `ilife-` 命名空间，不锚拼写）；③ B-04.4 切分正则 `/\\s+/`→`/\s+/`；④ B-06 改 measure-wizard 真 pre 样本；⑤ B-08.2 改 HELP 同卡（436／436 details 含复制按钮）；⑥ B-05 样本改 health＋断言 `list-rows` 三槽。

## 3. 门禁（GATE-RUN＋check-gate-audit 对账）

本席 14 次持锁运行（`--ticket 89`），exit≠0 者均为缺口证据／过程记录，非 pass 冒领（`--allow-nonzero` 理由见本节末）：

- GATE-RUN runId=5ceecca9-6e61-480d-a5bb-64f3e78b19f1 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params {\\ mode\\:\\file\\} --output .scratch/t89/help-file.html"
- GATE-RUN runId=0bdb4981-4308-47d6-b59e-1247e4023607 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params {mode:file} --output .scratch/t89/help-file.html"
- GATE-RUN runId=9f2ebd7b-0c28-493f-ad89-0f7d3ec89148 cmd="node .scratch/t89/cmdA.mjs"
- GATE-RUN runId=91af98be-b3f1-4381-8327-97f9cc3c3ecf cmd="node docs/research/t89-probe-browser.mjs --out .scratch/t89/run536e/B"
- GATE-RUN runId=d30a51ee-99d0-4253-bc6e-2b2ab5e0aa23 cmd="node docs/research/t89-probe-help-static.mjs --out .scratch/t89/run536e/S"
- GATE-RUN runId=15c0ee76-0170-4d27-a666-65c22617df64 cmd="node docs/research/t89-probe-help-interactive.mjs --out .scratch/t89/run536e/I"
- GATE-RUN runId=48d3b30d-82ef-4099-bf96-a8cb8431e614 cmd="node docs/research/t89-probe-shots.mjs --out .scratch/t89/run536e/shots"
- GATE-RUN runId=6a99fd70-0819-4dbf-aca6-9c1b89ccad0f cmd="node docs/research/t121-browser-evidence.mjs --label t89reuse --out .scratch/t89/run536e/R1"
- GATE-RUN runId=b6400a16-6ec3-47e8-82fe-2490185a89f3 cmd="node docs/research/t121-browser-evidence.mjs --label t89reuse"
- GATE-RUN runId=52c27b1e-5e0a-4464-a4e7-535a57469813 cmd="node docs/research/t88-probe-impl-b.mjs"
- GATE-RUN runId=c77f9195-0448-47d0-beb3-720af39c170a cmd="node docs/research/t88-browser-evidence-b.mjs"
- GATE-RUN runId=394d2e43-00ee-4623-8fd9-2e6a038bf545 cmd="node docs/research/t89-probe-blocks.mjs --out .scratch/t89/run536e/blocks"
- GATE-RUN runId=86c087f9-ce89-43b8-b933-e3d9805bcb27 cmd="node docs/research/t89-probe-blocks.mjs --out .scratch/t89/run536e/blocks"
- GATE-RUN runId=3ddb1565-272b-437d-a11f-bf265a7e230b cmd="node docs/research/t89-probe-blocks.mjs --out .scratch/t89/run536e/blocks"

复算：`node tooling/check-gate-audit.mjs --evidence docs/research/t89-visual-lock.md --ticket 89 --since 2026-09-09T19:43:00Z --allow-nonzero`（GATE-RELAX：① `--allow-nonzero`——exit 1／2 的 7 条是缺口如实记录（S 24/27、shots 34/36、R2 28/29 唯一红 B26、blocks v1／v2 修复过程、CMD-A 两次 PowerShell 引号坑 exit 2），非 pass 冒领；② 反向对账若报他席条目——共享门禁日志下 #79／#83 并行持锁，其 RUN 条目无人声明属正常，需 `--allow-undeclared`）。

GATE-RELAX --allow-nonzero（理由：本证据 14 条声明中 7 条 exit≠0，均为缺口／过程如实记录——S 24/27、shots 34/36、R2 28/29、B26、blocks v1 36/38、blocks v2 37/38、CMD-A 引号坑 exit×2；无一条冒领为 pass）。

对账结果：`gate-audit: PASS（matched=14/14，scoped=14，undeclared=0；auditEntries=969）`。

## 4. 缺口与修复方案

| # | 缺口 | 根因（实测） | 最小修复方案（不改冻结面，本席不实施） |
|---|---|---|---|
| G-1（H-06 未达） | 正文栈无 `"SF Pro Display"` | 冻结 `spec/` 零字体常量（`font/SF/Consolas/monospace` 命中 0，R-3：不能按 R35 豁免）；现行 CSS 正文栈缺失，正文回落 `"Noto Sans SC"` | #75 样式资产侧以**局部 CSS 常量**给 `body`/`.ilife-help-shell` 加正文栈（首位 `"SF Pro Display"`，后接系统兜底＋`"Noto Sans SC"`），**不新增 token 名**（沿 D-5 纪律）；等宽栈已合规不动。owner：#75 或并入 #89b 返修清单 |
| G-2（H-10 FAIL） | `.ilife-help-shell-card-mark` 用 `4px` 圆角 | HELP 自身 CSS 区声明（charts 区 2px 已按 D-10 除外；computed 抽样未命中实例但声明面违规即判 FAIL） | 同一局部 CSS 常量处置：`4px`→集合内最近的 `8px`，不新增 token 名。owner 同上 |
| G-3（非 #89 面，备忘） | t88 B26 断言过期（`fields:341` vs 假设 0） | #106 回补 341 条 `editable_fields`，旧样本假设失效 | 转票修 B26 断言（“与真实 payload 一致”），#89b 复用时标注跳过 |

## 附：自检

- [x] 交接单 §6 十一步：0（认领／前置由编排者定，本席不关票）／1（dist 现成，产物逐字节复现）／2（CMD-A）／3（CMD-B 10/10＋P5）／4（CMD-S）／5（CMD-I，R-2 已按照判落实）／6（CMD-R1 22/22、CMD-R2 28/29＋B26 注）／7（H-18 空态样本＋20 条逐条截图 28 张）／8（R-2／R-3／R-4 结论见 §4，其中 R-4 按照判为 H-17 N/A）／9（归档＋MANIFEST＋SHA256SUMS）／10（不关票）／11（SKILL.md `2d 2d 2d`）
- [x] 提交纪律：5 条一 commit（共 6 次 `--only`，不 push）；先落文档再跑下一条
- [x] 未改产品代码与冻结尺（`git status` 仅 docs/research 取证文件；他席文件未碰）
