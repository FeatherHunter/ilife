## Question

用户要求页面「文字不冗余、信息生动、凡是用 `;`／`|`／`·` 分割的地方都代表该处需要 UI 设计」。仓里已有这份判据件（`packages/skill-calorie/scripts/audit-separators.mjs`，R1–R7 七条规则、节点级、有退出码），但**直接接进居家会读数全 0**：它的位置正则绑 `ilife-block-*` 公共层类名，而居家普通产物用的是自家极简 `SHARED_CSS`（`packages/skill-home/src/render/html.ts`），`base-render` 只在 HELP 那一支用（`src/help/helpFile.ts:51`）——看着全绿，其实是没查。

## 目标

在本包落一份居家的样式与文案判据件：改前缀常量（命令键 `home.`／命令原文 `home-cmd-read`），补齐居家 `SHARED_CSS` 的位置口径，并把 `t407`／`t417` 独有的两处口径（「版式位／标题位／非版式位／载荷位」四分、「共享层 vs 本页」两套读数）并进来；**接进包内 test 门**；用只有骨架页的现状跑出**非零命中**证明它真在查（不许假绿）；附改坏必红的负向证据。
**再加一件（页面内容的结构判据）**：现在的域票验收只能证「文件在、不丑」——`audit-separators` 查文案与分隔符，**查不出「这条场景该显示的字段／操作少了三样」**。本票要落 `packages/skill-home/scripts/audit-page-blocks.mjs`：拿票 8 由骨架登记出来的**每族必需块清单**，对产物目录逐页断言必需块在位（缺一块即红并点名到「哪一页、缺哪一块」），并各给一个真例（故意删一块 → 红）与假例（齐全 → 绿）。**另加两列（覆盖审计补进来的第二个洞）**：`docs/agents/视觉验收墙.md` §0 的机审是**六列**——双端自适应、触摸目标、触屏三件、分隔符懒政、英文裸词、重复句。本图今天只有后三列有票，**「双端自适应」与「触摸目标」两列无人负责**。本票要把这两列一并接进来（新件 `packages/skill-home/scripts/audit-responsive.mjs`：390／1280 两档真渲染读数——横向溢出像素、最窄触控目标尺寸、横滚是否被藏），照 `.scratch/t351-preview/gen-scene09-wall.mjs`（把三档横向溢出挂在墙上）的先例做。

## 验收命令

文案与分隔符：`node tooling/run-locked.mjs --ticket <本票号> --max-wait-ms 600000 -- node packages/skill-home/scripts/audit-separators.mjs <样例产物目录>` —— 正例（骨架页目录）**命中数 > 0 且读数与逐行清单打得出来**；反例（手工塞一处版式位 `·` 后跑 clean 目录）exit 1 并点名。
**双端与触摸（新增那一列）**：`… -- node packages/skill-home/scripts/audit-responsive.mjs <样例产物目录>` —— 对 390／1280 两档给出**逐页读数**（横向溢出像素、最小触控目标尺寸、横滚是否被藏），并各给一个真例与假例。两条读数写进 `docs/skills/skill-home/style-audit.md`。

## 不许动的东西

不改卡路里／记账那两份原件（只在本包建自己的）；不改 R1–R7 的规则语义；不动页面模板。

## 交付物路径

`packages/skill-home/scripts/**` ＋ 包内测试；说明 `docs/skills/skill-home/style-audit.md`。

## 遗留出口

居家语境下需要新增的判据（英文裸词例外、重复句口径、帮助页共用件的豁免）逐条列出并当场补进本件或补票。
