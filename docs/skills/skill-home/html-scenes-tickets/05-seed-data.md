## Question

70 条场景的页面要经**真命令链**产出真产物，就得有可复跑的种子数据：仓内种子脚本 ＋ 测试库，**不碰生产库**（用户 Q4 裁决）。

## 目标

在 `packages/skill-home/scripts/` 写种子脚本（幂等、可重跑、带 `--reset` 与 `--check`），灌出覆盖 70 条场景的**有真实感**数据：每场景 3–10 条，含照片路径、标签、位置树（含固定位）、保修与保养周期、证件与账号、借用记录、购物清单与阈值、盘点记录与差异、物品历史快照等；**照片类页面（5-1 查看照片／5-2 管照片／5-3 照片墙／SM6-13 证件归档）要有真实可渲染的图片文件**（自造的小尺寸 PNG，别只写路径——否则墙上的照片页全是空框，视觉复核看到的是假象）；字段与册子（票 1）逐项对得上；库落 `.scratch/` 下的测试库，**绝不写** `SKILLS_DB_PATH` 指的生产目录（`D:\2Study\StudyNotes\.db`）。

## 验收命令

`node tooling/run-locked.mjs --ticket <本票号> -- node packages/skill-home/scripts/seed-scenes.mjs --check` —— exit 0；并实测生产目录文件数与小节读数前后不变（两条读数写进 `docs/skills/skill-home/seed-scenes.md`）。

## 不许动的东西

不碰 `D:\2Study\StudyNotes\.db`（生产库与生产产物）；不改 schema 迁移；不动页面模板；不动 21 条命令的对外契约。

## 交付物路径

`packages/skill-home/scripts/**`（种子脚本）；说明 `docs/skills/skill-home/seed-scenes.md`。

## 遗留出口

发现 schema 存不下的数据需求（例如某场景要的字段没有落点）当场补票，不自己加迁移。
