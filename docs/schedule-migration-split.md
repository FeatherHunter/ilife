# 作息管家迁移拆分确认（一期 #15，P9 已冻）

老家只读对照 `D:\2Study\StudyNotes\SKILLS\作息管家`：py 核心 51（总量 202 含 .scratch 调试杂项，不迁）约 16.3k 行，SKILL.md 1177 行，tests/ 约 35，templates/ 19 html + 3 共享资产（css/js），scenarios/ 6 yaml，有 DB（schedule_data.db 三表 + 旧版小时表），feishu_sync.py（lark-cli 7 条子命令），联动 8 处（combos.yaml `external: 作息管家` × 8）。

## 三层去向（包 packages/skill-schedule，新建零冲突面，布局对标 skill-memo-ilife）

| 层 | TS 去向 | 老家对照 | 归属 |
|---|---|---|---|
| 取数 | src/fetch/db.ts（sqlite 三表+旧表改名+completion 补列）、paths.ts（SKILLS_DB_PATH 必设，Q6 fallback 链不继承）、feishu.ts（lark 四门+7 子命令封装） | schedule_db.py、conftest.py 三表 DDL、feishu_sync.py | 取数 |
| 口径 | src/policy/category.ts（8 一级+白名单二级+emoji+健康分+异常）、routing.ts（相对时间 7+7+N）、record.ts（add/amend/summary/compare 校验）、plan.ts（事件校验+24h 覆盖+completion 6 态）、wakewords.ts（45 短语→8 key） | validators.py、calculations.py（l1/健康/异常/时长格式）、routing.py、add/amend 各入参、CONTEXT completion 6 态 | 口径 |
| 渲染 | src/render/envelope.ts（8 key×shape）、views.ts（8 键数据装配）、html.ts（section+三标记）、templates/8（19→8 合并） | schedule_html_render.py、help_render.py、record_day 等 19 模板 + 3 共享资产 | 渲染 |
| 出口 | src/cli/cmd_read.ts（argv+JSON+exit，8 键分发） | schedule_cli.py 49 子命令（prepare 系以外置为准，交互 Y/n 不迁） | 出口 |
| SKILL | SKILL.md 重写+HELP 互联注入（45 行速查表，构建期静态文本） | SKILL.md 1177 行、references/scenarios.yaml（85 场景/34 词事实源）、help_center.html | SKILL |
| 收尾 | 8 联动对表+tmp 单测+仓内零 py（老家只读不动） | tests/ 35、output/ 产物 | 收尾 |

## 联动 key×shape 映射（8 处；key 字符串后续票落表时冻结；analysis/fallback 全 key 可用）

```schedule-keys
schedule.record.today | list
schedule.record.range | stat
schedule.record.detail | detail
schedule.record.write | receipt
schedule.record.compare | analysis
schedule.plan.today | list
schedule.plan.write | receipt
schedule.help.lookup | list
```

老家联动 8 处对照（消费侧，combos.yaml 已冻结，本票不登记）：L2.1 运动时间窗→record.range、L2.2 作息异常影响→record.compare、L2.3 运动时段对饮食时段→record.today、L2.4 睡眠时长对减重→record.range、L2.5 早餐时间对体重→record.range（近似口径保留）、L2.6 睡眠质量对运动表现→record.range、L2.7 加班日对饮食失控→record.compare、L2.8 睡眠不足对摄入→record.compare。跨 skill 路由（心愿/打卡上下文）沿备忘录侧声明，本技能只暴露上表 8 键。

## 出 scope（不迁）

- 定时任务：老家 Cron 已删（零定时代码，仅文档废弃声明），外部定时任务以外置为准。
- prepare-messages/#1~#3 同步链：语录取数（daily_recorder.db）以外置为准；写入原语只留 record.write op=add；交互式 Y/n 确认不迁。
- 面板（二期单 MAP）、本技能外联动登记（combos.yaml 一律不碰，P8 已冻结，走后续票）。
- output/（schedule_html 产物）、作息管家.html 手册镜像、reports/、.scratch/、.notes/、__pycache__/、.pytest_cache/、daily_recorder.db 外置语录库、lark-cli 二进制、schedule_plans_legacy 旧表数据、category_whitelist.yaml 用户增量。
- 旧版小时计划（upsert-plan 24 位置参）仅做改名保留，不做读路径。

## lark-cli 外置口径

取数与同步边界以外置 lark-cli 为准：--version / auth status / calendar +create/+update/+search-event/+agenda / events delete；超时 15/30/60 三档；四门（存在+版本+登录+日历可达）全绿才同步，否则阻断（exit 4）不返空。op=sync 默认实做（显式调用即确认），dryRun 只报数；飞书探测（#21）走 op=sync + dryRun。

## 环境与验收

- SKILLS_DB_PATH + lark-cli 按 docs/env.md；真实数据禁迁，测试 tmp 隔离（SCHEDULE_FORCE_PROD 哨兵）；仓内零 py（本包全 TS，老家只读对照）。
- 验收：按此表开工；test/schedule-split.test.mjs 钉死映射合法性（key 命名空间+shape 6 形状）与定时出 scope。
