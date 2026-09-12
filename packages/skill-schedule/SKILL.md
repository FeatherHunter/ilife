---
name: skill-schedule
description: "「作息管家HELP」／「作息管家 HELP」→schedule.help.lookup 缺省即落一份能打开的 HELP 文件（5 类别／34 唤醒词／85 场景，走共享 help 模板）；唯一出口 schedule-cmd-read。触发词：作息管家HELP、作息管家help、作息管家 HELP、作息管家帮助、作息管家能做什么、作息管家使用说明、今天总结、今日作息、今日总结、今天作息、查作息时间轴、查作息状态、初始化数据库、查作息、汇总作息、查作息范围、查作息游标、查作息详情、按ID查记录、补一条作息、录作息、修正作息、改作息、这条记错了、写作息摘要、记作息、对比两个月、月份对比、跨月对比、类别深挖、异常检测、查多日计划、24h 概览、查日程、看日程、商量计划、一起规划、规划明天、规划一天、讨论计划、补计划、改计划、删计划、复盘今日、复盘本周、复盘本月、复盘区间、日程管家同步、飞书探测、复盘"
---

# 作息管家（schedule）SKILL

作息记录与日程计划：单日查、区间汇总、详情、记/修正、对比、查日程、商量/补/改/删/复盘、飞书同步。唯一出口 `schedule-cmd-read <schedule.key>`，argv+JSON(stdout)+exit，非 0 走 stderr。

## 快速开始

```sh
schedule-cmd-read schedule.help.lookup              # 说「作息管家 HELP」就这一条：缺省落一份 HELP 文件
schedule-cmd-read schedule.record.today --params '{"date":"今天"}'
schedule-cmd-read schedule.record.range --params '{"range":"本周"}'
schedule-cmd-read schedule.plan.today --params '{"date":"2026-09-06"}'
schedule-cmd-read schedule.record.write --params '{"op":"add","date":"2026-09-06","time_start":"09:00","time_end":"10:00","activity":"调优","category":"工作.AI调优"}'
```

## 口径

- 双域隔离：record（真实发生的过去时间块）唤醒词禁含计划/日程；plan（未来安排）唤醒词禁含作息/记录。废弃词（同步作息/作息计划表/配置定时同步）不路由。
- 分类：一级固定 8 个（维持/健康/工作/学习/创作/投入/调整/日常），二级白名单制；坏分类阻断，无跳过通道。
- 相对时间：今天/昨天/前天/大前天/明天/后天/大后天；本周/上周/上上周/本月/上月；recentDays=N。周一起始。
- 商量计划落盘须 24h 覆盖（首 00:00、尾 24:00、逐条相接）；补计划按 date+起止三元组幂等；复盘 completion 6 态（已完成/已完成(超时)/部分完成/未完成/未完成(不可抗力)/未复盘）。
- 健康分：工作≤8h 满分、超 1.5 倍 0 分；其余达目标满分、0.8/0.5 分档衰减；7 维取均（创作不参评）。异常：环比 ±20% 红、±10% 黄。
- 坏输入与缺失一律阻断（exit 2/4），不返空数组冒充正常；飞书同步须 lark-cli 四门全绿。

## 联动速查（构建期注入，勿手改）

<!-- HELP-AUTO-START -->
| 唤醒词 | key | shape | 例 |
|---|---|---|---|
| 作息管家 HELP | schedule.help.lookup | list | `schedule-cmd-read schedule.help.lookup` |
| 作息管家帮助 | schedule.help.lookup | list | `schedule-cmd-read schedule.help.lookup` |
| 作息管家能做什么 | schedule.help.lookup | list | `schedule-cmd-read schedule.help.lookup` |
| 作息管家使用说明 | schedule.help.lookup | list | `schedule-cmd-read schedule.help.lookup` |
| 今天总结 | schedule.record.today | list | `schedule-cmd-read schedule.record.today` |
| 今日作息 | schedule.record.today | list | `schedule-cmd-read schedule.record.today` |
| 今日总结 | schedule.record.today | list | `schedule-cmd-read schedule.record.today` |
| 今天作息 | schedule.record.today | list | `schedule-cmd-read schedule.record.today` |
| 查作息时间轴 | schedule.record.today | list | `schedule-cmd-read schedule.record.today` |
| 查作息状态 | schedule.record.today | list | `schedule-cmd-read schedule.record.today` |
| 初始化数据库 | schedule.record.today | list | `schedule-cmd-read schedule.record.today` |
| 查作息 | schedule.record.today | list | `schedule-cmd-read schedule.record.today` |
| 汇总作息 | schedule.record.range | stat | `schedule-cmd-read schedule.record.range --params '{"start":"2026-09-01","end":"2026-09-01"}'` |
| 查作息范围 | schedule.record.range | stat | `schedule-cmd-read schedule.record.range --params '{"start":"2026-09-01","end":"2026-09-01"}'` |
| 查作息游标 | schedule.record.range | stat | `schedule-cmd-read schedule.record.range --params '{"start":"2026-09-01","end":"2026-09-01"}'` |
| 查作息详情 | schedule.record.detail | detail | `schedule-cmd-read schedule.record.detail` |
| 按ID查记录 | schedule.record.detail | detail | `schedule-cmd-read schedule.record.detail --params '{"id":1}'` |
| 补一条作息 | schedule.record.write | receipt | `schedule-cmd-read schedule.record.write --params '{"op":"add"}'` |
| 录作息 | schedule.record.write | receipt | `schedule-cmd-read schedule.record.write --params '{"op":"add"}'` |
| 修正作息 | schedule.record.write | receipt | `schedule-cmd-read schedule.record.write --params '{"op":"amend","id":1}'` |
| 改作息 | schedule.record.write | receipt | `schedule-cmd-read schedule.record.write --params '{"op":"amend","id":1}'` |
| 这条记错了 | schedule.record.write | receipt | `schedule-cmd-read schedule.record.write --params '{"op":"amend","id":1}'` |
| 写作息摘要 | schedule.record.write | receipt | `schedule-cmd-read schedule.record.write --params '{"op":"summary"}'` |
| 记作息 | schedule.record.write | receipt | `schedule-cmd-read schedule.record.write --params '{"op":"add"}'` |
| 对比两个月 | schedule.record.compare | analysis | `schedule-cmd-read schedule.record.compare --params '{"kind":"months"}'` |
| 月份对比 | schedule.record.compare | analysis | `schedule-cmd-read schedule.record.compare --params '{"kind":"months"}'` |
| 跨月对比 | schedule.record.compare | analysis | `schedule-cmd-read schedule.record.compare --params '{"kind":"months"}'` |
| 类别深挖 | schedule.record.compare | analysis | `schedule-cmd-read schedule.record.compare --params '{"kind":"category"}'` |
| 异常检测 | schedule.record.compare | analysis | `schedule-cmd-read schedule.record.compare --params '{"kind":"anomaly"}'` |
| 查多日计划 | schedule.plan.today | list | `schedule-cmd-read schedule.plan.today` |
| 24h 概览 | schedule.plan.today | list | `schedule-cmd-read schedule.plan.today` |
| 查日程 | schedule.plan.today | list | `schedule-cmd-read schedule.plan.today` |
| 看日程 | schedule.plan.today | list | `schedule-cmd-read schedule.plan.today` |
| 商量计划 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"preview"}'` |
| 一起规划 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"preview"}'` |
| 规划明天 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"preview"}'` |
| 规划一天 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"preview"}'` |
| 讨论计划 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"preview"}'` |
| 补计划 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"ensure"}'` |
| 改计划 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"update","id":1}'` |
| 删计划 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"deactivate","id":1}'` |
| 复盘今日 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"review","granularity":"day"}'` |
| 复盘本周 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"review","granularity":"week"}'` |
| 复盘本月 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"review","granularity":"month"}'` |
| 复盘区间 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"review","granularity":"range"}'` |
| 日程管家同步 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"sync"}'` |
| 飞书探测 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"sync","dryRun":true}'` |
| 复盘 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"review"}'` |

相关场景：schedule.help.lookup、schedule.plan.today、schedule.plan.write、schedule.record.compare、schedule.record.detail、schedule.record.range、schedule.record.today、schedule.record.write（8 联动，key 字符串后续票落表时冻结）。
<!-- HELP-AUTO-END -->

## HELP 交付（说「作息管家 HELP」或「作息管家帮助」走这里）

- **缺省就是交付物**：`schedule-cmd-read schedule.help.lookup` **原样调用**即落一份能打开的 HELP 文件——`<SKILLS_DB_PATH>/schedule_html/help/作息管家_HELP_<YYYYMMDD_HHMMSS>[_N].html`（5 类别／34 唤醒词／85 场景，走共享 help 模板）。stdout 的 `delivery.path` 是**绝对路径**，`delivery.bytes` 是文件字节数；回话就把这个路径给用户（回执即真相）。
  **完成标准**：`delivery.path` 指向的文件真的存在，且大小＝`delivery.bytes`。
- **要现找才加参数**：`--params '{"q":"查作息"}'` 回命中条目（只出 JSON，不落盘）；`q` 留空＝全表。全量速查表读上「联动速查」块（48 条路由词，构建期注入，与 `q` 同一张表）。
- **`--html <路径>`＝显式落点**：逐字使用、覆盖写、缺父目录自动建（不参与同秒 `_N` 递补）；缺省支写的是完整 HELP 页，`q` 支写的是该键的分节页（与其余 7 条命令同形）。
- **同名不覆盖**：缺省落点按秒命名，同秒第二次调用递补 `_2`、`_3`……每次回执的路径，内容就是这一次的产物。
- **看帮助不开库**：本键在开库之前分派，跑完不建 `schedule_data.db`（库还没建出来时也看得到帮助）；DB 文件已存在时，页首的首次使用横幅隐藏（判定只看文件在不在，不开库）。
- **边界**：面板／侧栏的 HELP 入口不在本技能范围（属插件侧那条线，见下「环境与出 scope」）。

## 环境与出 scope

- SKILLS_DB_PATH（必设，无默认值）+ lark-cli（同步须四门全绿），见 docs/env.md。
- 出 scope：定时任务/早睡提醒（老家 Cron 已删，外部定时以外置为准）、面板（二期单 MAP）、本技能外联动（combos 登记走后续票）；语录取数（daily_recorder.db）以外置为准；真实数据禁迁，测试 tmp 隔离。
