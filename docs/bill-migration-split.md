# 饼干记账迁移拆分确认（一期 #19，P9 已冻）

老家只读对照 `D:\2Study\StudyNotes\SKILLS\饼干记账`：py 核心 79（总量 87 含 tmp_*.py 调试杂项与 .scratch，不迁）约 18.3k 行，SKILL.md 1209 行，tests/ 约 25，templates/ 7 域子目录（写入/分析/开始使用/目标/联动/账户 + query_view.html，HELP 模板已迁 Base 参数化），scenes/ 7 yaml（write 15/query 15/analysis 25/goal 4/account 4/link 2/setup 6，合计 71 场景 + HELP 4 条，老家 74 唤醒词 + TS 补齐读链 1（查账单详情，老家无直接词，沿居家改购物清单先例），共 75 短语），文件 DB（biscuit_accountant.db 单 bills 表 10 列 + goals.json 三顶层键 budgets/savings/accounts），账单为联动子功能（link form + receipt 自包含），联动 16 处（本表）。

## 三层去向（包 packages/skill-bill，新建零冲突面，布局对标 skill-memo/schedule）

| 层 | TS 去向 | 老家对照 | 归属 |
|---|---|---|---|
| 取数 | src/fetch/db.ts（node:sqlite 单 bills 表 10 列 + goals.json 原子读写；SKILLS_DB_PATH 必设，Q6 fallback 链不继承）+ paths.ts（必设 + tmp 隔离哨兵 BILL_FORCE_PROD） | scripts/db.py（init_db + insert/fetch_all/get_by_id/update/undo/restore + _fallback_db_dir 两层查找）、scripts/goal/cli.py（goals.json budgets/savings）、scripts/account/cli.py（accounts 顶层键 + transfer 双笔） | 取数 |
| 口径 | src/policy/category.ts（支出 L1 10 + 收入 L1 6 + 借贷/分期/转账隔离 + amount 符号即分类依据 + validate_record 7 字段）+ record.ts（add/update/undo/restore 校验，op 分流）+ analysis.ts（overview/compare/trend 校验，kind 分流）+ goals.ts（set-budget/set-saving 覆盖语义，force 门）+ accounts.ts（add/update/transfer 校验）+ wakewords.ts（75 短语→16 key，最长匹配，1 补齐已声明） | scripts/validators.py（validate_amount/category/time/record + ALL_L1）、scripts/record_bill.py、scripts/routing.py（相对时间 3 函数 + today 注入）、references/categories.md（L1 10 + 心法 5 维度）、references/路由表.md（#11~#144 域区间连续编号） | 口径 |
| 渲染 | src/render/envelope.ts（16 key×shape）+ views.ts（16 键数据装配：KPI/分类聚合/tag 精确匹配/借贷聚合）+ html.ts（section+三标记 + 复制 prompt 按键回填）+ templates/16（7 域→16 合并，1 键 1 模板） | scripts/_base_render.py（envelope/inject_base/write_html）、scripts/render_help.py、scripts/render_write.py、scripts/analysis/cli.py + scripts/query/cli.py 各 HTML 分支、templates/ 7 子目录 + query_view.html | 渲染 |
| 出口 | src/cli/cmd_read.ts（argv+JSON+exit，16 键分发，写走 receipt：record.add/update + goal.write + account.write + link.submit + setup.run 全 receipt；缺 key 2/未知 3/缺失 4/预检 1；超时 terminate+TOAST） | scripts/write/cli.py（add/update 2 子命令）+ scripts/query/cli.py（list/search/recent/summary/tag/debt/reimburse/installment 8 子命令）+ scripts/analysis/cli.py + scripts/goal/cli.py + scripts/account/cli.py + scripts/link/cli.py（form/receipt 自包含）+ scripts/setup/cli.py（init/init-status/backup/restore/import 6 场景） | 出口 |
| SKILL | SKILL.md 重写+HELP 互联注入（75 行速查表，构建期静态文本；账单子功能折入 record.add/receipt 回执提示） | SKILL.md 1209 行（含 Language/command_cn/scenario/HELP 保留字/File structure/分类心法/amount 符号/File structure）、references/scenarios.yaml（71 场景合并汇总）、饼干记账.html HELP 镜像（总纲镜像原则不继承，TS 以 templates 快照为准） | SKILL |
| 收尾 | 16 联动对表+tmp 单测+仓内零 py（老家只读不动） | tests/ 25、backups/ CSV 迁移备份（gitignored）、.scratch/、__pycache__/.pytest_cache/、tmp_*.py/json 调试杂项（tmp_0802/tmp_ai/tmp_bk/tmp_july/tmp_recent 等只读不迁） | 收尾 |

## 联动 key×shape 映射（16 处；key 字符串后续票落表时冻结；analysis/fallback 全 key 可用）

```bill-keys
bill.record.add | receipt
bill.record.update | receipt
bill.record.today | list
bill.record.range | list
bill.record.search | list
bill.record.detail | detail
bill.analysis.overview | stat
bill.analysis.compare | analysis
bill.analysis.trend | analysis
bill.goal.write | receipt
bill.goal.query | list
bill.account.write | receipt
bill.account.query | list
bill.link.submit | receipt
bill.setup.run | receipt
bill.help.lookup | list
```

老家联动 16 处对照（消费侧，combos.yaml 已冻结，本票不登记，后续票落表）：write 记支出/记收入等 12 + 改记录/撤销/恢复 3（→record.add/update，op 分流，拍账单图片识别以外置为准，批量录入逐笔校验）+ query 查今天/昨天/某天/最近 4（→record.today）+ 查周/月/区间/分类/账户/账本 6（→record.range）+ 搜备注/查标签/查欠款/查待报销/查分期 5（→record.search，kind 分流，#tag 精确匹配）+ 单条详情查账单详情（→record.detail，id 分流，老家无直接词，补齐读链已声明）+ analysis 看月度/年度/总览/周报/分类/账户/账本/结构/统计 9（→analysis.overview，kind 分流）+ 看对比/双区间/同比/分类对比 4（→analysis.compare，kind 分流）+ 看趋势/分类趋势/大额/高频/分布/活跃/洞察/异常/借贷/报销/分期/退款 12（→analysis.trend，kind 分流，洞察/异常接 insights 纯算）+ goal 设定预算/目标 2 + 看预算/目标 2（→goal.write/query，覆盖须 --force）+ account 新增/改/转账 3 + 看汇总 1（→account.write/query，转账双笔 #转账不入收支）+ link 买东西/吃饭 2（→link.submit，主操作复用 record.add，跨技能按钮仅复制 prompt 不直写）+ setup 初始化/状态/备份/恢复/导入 5（→setup.run，op 分流，导入列映射 dry-run 先行）+ HELP 现找 4（→help.lookup）。账单子功能折入 record.add（receipt 回执带账单提示，不单设 key）。跨 skill 路由（协同饼干记账 L1.1/L1.2/L1.3/L1.5/L1.6 5 处）为消费侧，沿卡路里侧声明，本技能只暴露上表 16 键。

## 出 scope（不迁）

- 定时任务：老家零定时代码（仅文档废弃声明），外部定时任务以外置为准。
- 面板（二期单 MAP）、本技能外联动登记（combos.yaml 一律不碰，P8 已冻结，走后续票；link 跨技能按钮仅复制 prompt，AI 调目标技能，不直写他库）。
- backups/（CSV 迁移备份，gitignored）、饼干记账.html 手册镜像及 .bak.v2.4、reports/、.scratch/（debug_ledger_history/inspect_buttons/restyle_confirm/update_map305 等）、tmp_*.py/json 调试杂项（tmp_814/tmp_bk_food/tmp_check_ali/tmp_check_gaode/tmp_july/tmp_month/tmp_render_sams/tmp_search_all/tmp_today/tmp_write_sams 等 + tmp_0802/tmp_ai/tmp_bk/tmp_july_expense/tmp_recent 等 json）、__pycache__/.pytest_cache/、docs/ 历史规格、backfill_multilevel/migrate_other/migrate_uncategorized/bill_inject 迁移脚本（T0 一次性，不进运行时）、拍账单图片识别（以外置为准）、config-cookie-accounting.ts SkillBoard 视图（独立维护）。
- 旧版 categories NOT NULL 重建补丁、bills 老字符串分类过渡字段（TS 新库 category 原样存，读时 L1 归一，零迁移）。

## 写走 receipt 口径

写走 receipt（直通即真相，备忘录 precedent）：record.add（add/批量/借贷/分期/退款/报销全 op）/ record.update（update/undo 软删/restore）/ goal.write（set-budget/set-saving，覆盖须 --force）/ account.write（add/update/transfer 双笔）/ link.submit（form 采单 + receipt 回执，复用 record.add 语义）/ setup.run（init/backup-create/restore/import 实做回执，init --check 只读检测）全 receipt；读走 list/detail/stat/analysis（today/range/search/goal.query/account.query/help.lookup 走 list，detail 走 detail，overview 走 stat，compare/trend 走 analysis）。

## 环境与验收

- SKILLS_DB_PATH（必设，无默认值）+ BILL_FORCE_PROD 哨兵（非 tmp 写库须 opt-in），见 docs/env.md；真实数据禁迁，测试 tmp 隔离；仓内零 py（本包全 TS，老家只读对照）。
- 验收：按此表开工；test/bill-split.test.mjs 钉死映射合法性（key 命名空间+6 形状）与定时/联动出 scope、写走 receipt。
