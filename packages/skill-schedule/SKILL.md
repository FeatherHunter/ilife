# 作息管家（schedule）SKILL

作息记录与日程计划：单日查、区间汇总、详情、记/修正、对比、查日程、商量/补/改/删/复盘、飞书同步。唯一出口 `schedule-cmd-read <schedule.key>`，argv+JSON(stdout)+exit，非 0 走 stderr。

## 快速开始

```sh
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

## 环境与出 scope

- SKILLS_DB_PATH（必设，无默认值）+ lark-cli（同步须四门全绿），见 docs/env.md。
- 出 scope：定时任务/早睡提醒（老家 Cron 已删，外部定时以外置为准）、面板（二期单 MAP）、本技能外联动（combos 登记走后续票）；语录取数（daily_recorder.db）以外置为准；真实数据禁迁，测试 tmp 隔离。
