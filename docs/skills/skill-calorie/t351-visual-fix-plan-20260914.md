# T351 肉眼修复融合方案（只定做法，不落码）

目标：MAP #157 共 32 条链路跑得通，且真实 HTML 双击可打开，经肉眼验收。现状 `.scratch/t351/html/` 共 46 份。

## 1 三源对比表

| 维度 | 仓外老技能 `D:\2Study\...\卡路里\templates\`（74 文件） | 仓内新页面 `packages/skill-calorie/src/render/`（22 件） | 现状 46 份 |
|---|---|---|---|
| 形态 | 整页文档：doctype＋头部＋共享样式＋版式＋脚本，6 模板实物可直接打开看 | 数据＋片段：`planPlate/receipt/insightPlate/html` 只产数据与片段，`copy` 只接 base-paint 复制面 | 两极：176–195 段多为 1 行裸片段，无壳无样式；201–207 为 2057 行整页 |
| 壳 | 老版有完整页壳（标题、页眉、内容区、页脚） | `templates.ts` 只登记 6 模板（home/diet/exercise/goal/photo-gallery/help），训练计划类无整页模板 | 裸片段组（result 10＋process 10＋receipt 10＋verify 9）缺壳，打开即白底小字，不达肉眼标准 |
| 版式 | `crud_receipt`（标识卡＋差异卡＋备注行）、`review_template`（标题＋4 卡＋表格）、`process_progress`（Hero＋进度条＋4 步＋复制区）、`workout_plan_view`（周次页签＋会话卡＋动作表）层级完整 | 新卡片为区块件（page-shell＋指标卡格＋参数表单＋复制菜单），语义对但训练计划链路多走裸 `pageShell/kpi` 降级 | 201–207 已用新卡片，版式成立；其余 39 份仍是裸指标卡，深色内联样式，与老版浅色版式断裂 |
| 复制交互 | 老版复制区为单按钮配文本 | 新侧唯一接线 `copy.ts`：按钮走 `renderActionBar`，运行走 `buildSharedHelpersJs` 双通道，不许自造 | 201–207 复制菜单为 text/json/csv 三项，且指标明文泄漏为可见裸文本（`plannedSessions: 1…`），无“复制数据／复制日志”双按钮 |
| 数据 | 老版写死示例数 | 新侧数据源正（计划走 `planStore`，复盘走 `exerciseReview`，回执走 `CrudReceipt` 带 M5 四要素） | 数据可信，问题全在呈现层；另缺 `order195-verify` 1 份 |

第一性原理：肉眼标准＝整页壳＋版式层级＋中文单语＋双通道复制；数据层新侧已正，版式层老版已熟，现状缺的是“新数据穿老版式”的装配，不缺取数。

## 2 融合方案（每组一句话做法）

- result 组（17 份：176–185 计划看裸片段 10＋201–207 复盘整页 7）：176–185 直接迁移老 `workout_plan_view` 版式装新 `PlanView` 数据，201–207 复用新区块卡片只修复制区。
- process 组（186–195 写前预览 10）：直接迁移老 `process_progress` 五段式装新 `PlanWizardView/WritePreview` 数据，不复用裸指标卡。
- receipt 组（186–195 回执 10）：直接迁移老 `crud_receipt` 标识卡＋差异卡版式装新 `CrudReceipt（含 recordId/meta.actionAt/affectedRows/writtenFields）` 数据。
- verify 组（186–194 复盘看 9＋补 195 缺 1）：与 result 同源同版式复用 `workout_plan_view`，缺失的 195 按同装配新产，不另起版式。

## 3 用户两点解法

1. 7 份 result（201–207）：删泄漏的多语种数据明文与 text/json/csv 菜头文本，复制区改为“复制数据／复制日志”双按钮，共用同一双通道运行（剪贴板→命令兜底＋已复制态＋提示），数据文本走 `DEFAULT_DATA_ATTR` 承载，零内联脚本。
2. 其余一次达标清单：补整页壳（标题＋视口＋共享样式＋运行脚本）、浅色版式替换深色内联裸样式、中文单语（删 eyebrow 内英文键与裸字段名）、指标卡补单位与空态、回执补 M5 行、缺失 195-verify 按 verify 装配补产。

## 4 工作量排序（小→大）

1. 补 195-verify（同版式复用，S）。
2. 7 份双按钮改造（同一复制区改一处，多页同享，S）。
3. receipt 10 份穿老版式（字段映射固定，M）。
4. process 10 份穿老版式（进度步数映射，M）。
5. result/verify 计划看 19 份穿老版式（周次＋会话＋动作三级映射，L，排最后）。

## 5 方案约束与红线

能力自治：版式只读老模板，数据只读既有取数层，不跨能力取数；接口收敛：新增装配接口不超 5 个，参数只传视图对象；命令登记：不动既有命令，涉及命令只登记不改汇总；样式与复制不自造，只用记账的共享样式与复制面；文件行数告警线 350 行（LF 口径）写进落码票。本方案只出做法：不改 `packages/` 源码、不改 issue、不新增 `docs/research/`。

验收：32 条链路重跑通过后，46＋1 份真实 HTML 逐份双击打开，壳、版式、中文、双按钮四项全过即收。
