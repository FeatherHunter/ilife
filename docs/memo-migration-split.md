# 备忘录迁移拆分确认（M1 #31，P9 已冻）

老家只读对照 `D:\2Study\StudyNotes\SKILLS\备忘录`：py 实测 42（盘点 41，差 1 为 .scratch/.trash 杂项，不迁）、SKILL.md 73KB/1174 行、tests/ 约 35、templates/ 16 html、.sql×1、feishu 两文件（script/feishu_sync.py、scripts/feishu_auth_helper.py）。

## 三层去向（包 packages/skill-memo，M2 起建，布局对标 skill-calorie）

| 层 | TS 去向 | 老家对照 | 归属 |
|---|---|---|---|
| 取数 | src/fetch/db.ts（文件 DB+FTS CJK）、src/fetch/feishu.ts（lark-cli 四项全绿才取数） | memo_cli 取数段、feishu 两文件、test_db_fallback/test_fts_cjk/test_feishu_sync | M2 |
| 口径 | src/policy/wakewords.ts、category.ts、reminder.ts、wish.ts、crud.ts | 唤醒词路由、顶层/子分类、提醒路由、心愿排期、批量改分类、增删改查 | M3 |
| 渲染 | src/render/envelope.ts、html.ts、templates/16 | memo_render.py、test_render/test_html_*、HTML 交付规范 | M4 |
| 出口 | src/cli/cmd_read.ts（argv+JSON+exit） | memo_cli.py 入口段 | M5 |
| SKILL | SKILL.md 重写+HELP 互联注入 | 73KB SKILL.md、docs/、references/ | M6 |
| 收尾 | 10 联动对表+tmp 单测+删 py | tests/ 全量、output/ 产物 | M7 |

## 联动 key×shape 映射（10 处；key 字符串为提案，P8 combos 落表时冻结；analysis/fallback 全 key 可用）

```memo-keys
memo.search | list
memo.detail | detail
memo.create | receipt
memo.update | receipt
memo.remove | receipt
memo.remind | list
memo.wish | list
memo.sync | receipt
memo.batch | receipt
memo.stats | stat
```

## 出 scope（不迁）

- reminder_scheduler.py 定时任务（02§8 另建方案，不占主体工期）。
- 面板（二期单 MAP）、本技能外联动；output/、.scratch/、.out-of-scope/、.pytest_cache/、output/.trash/ 不迁。

## 环境与验收

- SKILLS_DB_PATH + lark-cli 按 docs/env.md（P9 已冻）；真实数据禁迁，测试 tmp 隔离；Python 当天删（M7）。
- 验收：M2-M7 按此表开工；test/memo-split.test.mjs 钉死映射合法性（key 命名空间+shape 6 形状）。
