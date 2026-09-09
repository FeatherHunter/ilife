# #89 视觉锁 B1 逐值验收 · 过程台账（第 2 任实施席）

- runId（本席取证轮）：`536e8b9c-5a93-4ad0-bd92-5e125480300d`
- 证据根：`docs/research/t89-evidence/536e8b9c-5a93-4ad0-bd92-5e125480300d/`
- 交接基线：`docs/research/t89-evidence-plan.md`（commit `b927a3c`）§1 矩阵／§4 归档约定／§6 移交清单
- 照判裁定：H-12 的 400px 子句按冻结 820 为准；H-17 HELP 页 N/A；H-06 如实判「未达」＋最小修复方案（不改冻结面）
- 判据收窄：H-01 禁色只约束 UI 主色（图表色板例外 D-10）；H-04／H-10 按 CSS 区判（charts 区除外，L-17）
- 状态：取证中（先落文档再跑下一条；每 5 条一 commit，不 push）

## 逐条 verdict（实测值／证据／复算命令随取证轮补齐）

| 条 | verdict | 实测值（摘要） | 证据路径 | 逐字复算命令 |
|---|---|---|---|---|
| H-01 | PASS | 禁色命中`[]`；`--blue:#007aff`逐字；computed根/壳均为`#007aff` | `t89-evidence/<runId>/S/probe-static.json`(H-01)＋`shots/H-01/{viewport,element}.png`＋`shots/probe-shots.json`(H-01.1) | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-static.mjs --out <dir>`；`node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-shots.mjs --out <dir>` |
| H-02 | PASS | 冻结token 7/7；正文h1/卡标题`rgb(29,29,31)`=--fg、副标题/命令`rgb(110,110,115)`=--fg2；--fg3仅落≤13px提示层 | `S/probe-static.json`(H-02)＋`shots/H-02/{viewport,element,lead}.png`＋`shots/probe-shots.json`(H-02.1/.2) | 同上 |
| H-03 | PASS | `--bg:#f5f5f7`≠`--card:#ffffff`；卡面computed纯白`rgb(255,255,255)` | `S/probe-static.json`(H-03)＋`shots/H-03/{viewport,card}.png`＋`shots/probe-shots.json`(H-03.1) | 同上 |
| H-04 | PASS | CSS区分区：`gradHelp:0`／`gradAll:1`／`gradCharts:1`（charts区`repeating-linear-gradient`属冻结图表资产，D-10/L-17例外） | `S/probe-static.json`(H-04)＋`shots/H-04/element.png`＋`shots/probe-shots.json`(H-04.1) | 同上（须同时打印gradHelp与gradAll） |
| H-05 | PASS | 无≥48px（max 32；D-9不要求）；h2 17px/600×3；正文subtitle 15px；提示12/13px；h1 32px/700∈[28,32] | `S/probe-static.json`(H-05)＋`shots/H-05/element.png`＋`shots/probe-shots.json`(H-05.1/.2/.3) | 同上 |
| H-06 | 未达 | 等宽面PASS（computed`"SF Mono",monospace`逐字开头，Consolas=0）；正文面FAIL：CSS正文栈缺失（stacks仅`SF Mono/inherit`，sfPro=0），正文computed回落浏览器默认`"Noto Sans SC"` | `S/probe-static.json`(H-06)＋`shots/H-06/element.png`＋`shots/probe-shots.json`(H-06.1 PASS/H-06.2 FAIL) | 同上（见最终报告H-06最小修复方案，不改冻结面） |
| H-07 | PASS | CSS `font-feature-settings…tnum`命中2；computed壳/计数/徽章/卡标题均为`"tnum"` | `S/probe-static.json`(H-07)＋`shots/H-07/element.png`＋`shots/probe-shots.json`(H-07.1) | 同上 |
| H-08 | PASS | h1/h2共4个，emoji命中0；h1=`唤醒词速查台`（已去emoji，D-12） | `S/probe-static.json`(H-08)＋`shots/H-08/element.png`＋`shots/probe-shots.json`(H-08.1) | 同上 |
| H-09 | PASS | CSS逐字`max-width:960px`＋`padding:32px 20px 80px`；1440视口computed四值32/20/20/80＋max-width 960px；内容列居中留白211/211 | `S/probe-static.json`(H-09)＋`shots/H-09/element.png`＋`shots/probe-shots.json`(H-09.1/.2) | 同上 |
| H-10 | FAIL | CSS声明面：`cssBad=[{sel:.ilife-help-shell-card-mark,radius:4px}]`∉{8,14,20,999,50%}；阴影面PASS（全`var(--shadow)`）；computed抽样面badCount=0 | `S/probe-static.json`(H-10)＋`shots/H-10/element.png`＋`shots/probe-shots.json`(H-10.1 FAIL/H-10.2 PASS) | 同上（按CSS区判；charts区2px已除外） |
| H-11 | PASS | 首行computed `border-top:0px`、后续行`1px solid rgb(210,210,215)`；CSS `:first-child{border-top:0}`规则命中2 | `S/probe-static.json`(H-11)＋`shots/H-11/element.png`＋`shots/probe-shots.json`(H-11.1) | S＋shots同上 |
| H-12 | PASS（交互记录齐） | 静态断点m640:1/m400:1（图表720/toast栈820并存，D-6）；三档computed：1440→32/20/20/80＋960px，640/400→20/16/16/60；400px toast栈left/right=12px（经冻结820层承担，照判）；交互记录`h12-1440/640/400.png`＋时序JSON | `I/probe-interactive.json`(H12)＋`I/h12-{1440,640,400}.png`＋`shots/H-12/viewport-{1440,640,400}.png` | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-interactive.mjs --out <dir>` |
| H-13 | N/A（转内容页B-02，D-15） | HELP页`.kpi`命中0／`<svg>`0（shots domCounts）；判据转区块尺B-02 | blocks `B-02/`＋`probe-blocks.json`(B-02) | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-blocks.mjs --out <dir>` |
| H-14 | N/A（转内容页B-04，D-15） | 同上（svg=0／circle=0） | blocks `B-04/`＋`probe-blocks.json`(B-04) | 同上 |
| H-15 | PASS | `<pre>`载体439个；computed等宽栈/`12px`/行高比1.55/`pre-wrap`/`overflow-x:auto`/圆角8px全满足 | `S/probe-static.json`(H-15)＋`shots/H-15/element.png`＋`shots/probe-shots.json`(H-15.1/.2) | S＋shots同上 |
| H-16 | PASS（交互记录＋t121交叉） | 真手势命中；copied存活453.2ms∈[440,520]（双计时器）；剪贴板归一后逐字等长82；复原无残留；toast恰1枚存活4501ms≈冻结4500；抽40卡每卡1按钮；无「复制全部」；t121交叉22/22（含失败零加类＋danger toast）；shots before/after双证 | `I/probe-interactive.json`(H16)＋`I/h12-*.png`＋`shots/H-16/{before,after}.png`＋`R1/t121-t89reuse.log`(22/22) | I＋`node tooling/run-locked.mjs --ticket 89 -- node docs/research/t121-browser-evidence.mjs --label t89reuse` |
| H-17 | N/A（转内容页B-03，照判） | HELP页`<table>`=0（shots domCounts）；表格为内容页新增能力，转区块尺B-03（th大写/透明/1px＋td 12-14px＋末行无边框已由blocks实证） | blocks `B-03/`＋`probe-blocks.json`(B-03.1/.2/.3/.4/.5全绿) | blocks探针 |
| H-18 | PASS | 空态卡片外观（白底/20px圆角/1px描边/居中）；padding 48/20；图标40px/.5；标题17px/600；说明13px `#86868b` | `shots/H-18/{viewport,element}.png`＋`shots/probe-shots.json`(H-18.1/.2/.3/.4) | shots（现场构造空态样本） |
| H-19 | PASS（交互记录＋t88交叉） | 几何42×42/50%/fixed/right=bottom=24；scrollY=0时opacity0＋pe none；401时出现可点；点击rAF 22采样单调降到0；t88交叉B20/B22/B23/B25/B27全PASS | `I/probe-interactive.json`(H19.trace)＋`shots/H-19/{before,after}.png`＋`R2/t88-evidence-b.log`(B20/B22/B23/B25/B27) | I＋t88-browser-evidence-b（注：B26红=fields:341过期断言，非#89面） |
| H-20 | PASS（交互新采） | reduce下复制/回顶过渡0s、toast动画none；Tab遍历6次4环（I）＋10控件10环（shots）；首Tab SUMMARY :focus-visible＋1px环；焦点截图focus.png | `I/probe-interactive.json`(H20)＋`shots/H-20/focus.png`＋`shots/probe-shots.json`(H-20.1/.2/.3) | I＋shots（两套件零命中故新采） |
## 取证轮次记账（GATE-RUN 对账用）

- `GATE-RUN runId=9f2ebd7b-0c28-493f-ad89-0f7d3ec89148 cmd="node .scratch/t89/cmdA.mjs (calorie.help.center mode=file)"` → artifact 1264822B sha16=F380EF685065A1E9（与交接基线逐字节一致）
- `GATE-RUN runId=91af98be-b3f1-4381-8327-97f9cc3c3ecf cmd="node docs/research/t89-probe-browser.mjs"` → `RESULT: 10/10 PASS`
- `GATE-RUN runId=d30a51ee-99d0-4253-bc6e-2b2ab5e0aa23 cmd="node docs/research/t89-probe-help-static.mjs"` → `RESULT: 24/27`（红=H-06.2/H-10.1/H-17.1）
- `GATE-RUN runId=15c0ee76-0170-4d27-a666-65c22617df64 cmd="node docs/research/t89-probe-help-interactive.mjs"` → `RESULT: 21/21 PASS`
- `GATE-RUN runId=48d3b30d-82ef-4099-bf96-a8cb8431e614 cmd="node docs/research/t89-probe-shots.mjs"` → `RESULT: 34/36`（红=H-06.2/H-10.1）
- `GATE-RUN runId=b6400a16-6ec3-47e8-82fe-2490185a89f3 cmd="node docs/research/t121-browser-evidence.mjs --label t89reuse"` → `RESULT: 22/22 PASS`（H-16交叉）
- `GATE-RUN runId=52c27b1e-5e0a-4464-a4e7-535a57469813 cmd="node docs/research/t88-probe-impl-b.mjs"` → `RESULT: 59/59`（样本sha fb87787c…）
- `GATE-RUN runId=c77f9195-0448-47d0-beb3-720af39c170a cmd="node docs/research/t88-browser-evidence-b.mjs"` → `RESULT: 28/29`（唯一红B26=fields:341过期断言，非#89面；H-19相关B20/B22/B23/B25/B27全绿）
