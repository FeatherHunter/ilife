---
name: skill-schedule
description: "「作息管家HELP」／「作息管家 HELP」→schedule.help.lookup 缺省即落一份能打开的 HELP 文件（5 类别／34 唤醒词／85 场景，走共享 help 模板）；唯一出口 schedule-cmd-read。触发词：作息管家HELP、作息管家help、作息管家 HELP、作息管家帮助、作息管家能做什么、作息管家使用说明、今天总结、今日作息、今日总结、今天作息、查作息时间轴、查作息状态、初始化数据库、查作息、汇总作息、查作息范围、查作息游标、周视图、查作息详情、按ID查记录、补一条作息、录作息、修正作息、改作息、这条记错了、写作息摘要、记作息、对比两个月、月份对比、跨月对比、类别深挖、异常检测、查多日计划、24h 概览、查日程、看日程、商量计划、一起规划、规划明天、规划一天、讨论计划、补计划、改计划、删计划、复盘今日、复盘本周、复盘本月、复盘区间、日程管家同步、飞书探测、复盘"
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

<!-- CALL-FORM-START -->

## 唯一出口：怎么跑

入口＝本技能包 `package.json` 里 `bin` 声明的那条：`dist/cli/cmd_read.js`。
`<技能基目录>`＝加载本技能时给出的 `Base directory for this skill: <路径>` 那一行。

1. 命令名解析得到时：`schedule-cmd-read <key> [--params '<json>']`。
2. 解析不到时（`not recognized`／`command not found`）＝ PATH 上没有这条命令，下面这行照样跑得起来：
   `node <技能基目录>/dist/cli/cmd_read.js <key> [--params '<json>']`
3. 本目录里没有编译产物时：`npx -p skill-schedule schedule-cmd-read <key> [--params '<json>']`（上面第 2 行就够，不必再取一份）。

换走法的信号只有一个：命令名解析不到。其余报错照 stderr 的报文原样交给用户。
<!-- CALL-FORM-END -->

## 口径

- 双域隔离：record（真实发生的过去时间块）唤醒词禁含计划/日程；plan（未来安排）唤醒词禁含作息/记录。废弃词（同步作息/作息计划表/配置定时同步）不路由。
- 分类：一级固定 8 个（维持/健康/工作/学习/创作/投入/调整/日常），二级白名单制；坏分类阻断，无跳过通道。
- 相对时间：今天/昨天/前天/大前天/明天/后天/大后天；本周/上周/上上周/本月/上月；recentDays=N。周一起始。
- 商量计划落盘须 24h 覆盖（首 00:00、尾 24:00、逐条相接）；补计划按 date+起止三元组幂等；复盘 completion 6 态（已完成/已完成(超时)/部分完成/未完成/未完成(不可抗力)/未复盘）。
- 健康分：工作≤8h 满分、超 1.5 倍 0 分；其余达目标满分、0.8/0.5 分档衰减；7 维取均（创作不参评）。异常：环比 ±20% 红、±10% 黄。
- 坏输入与缺失一律阻断（exit 2/4），不返空数组冒充正常；飞书同步须 lark-cli 四门全绿。

## 批量补计划（多天，#599）

- 单天 `op=ensure` 按 `date+time_start+time_end` 三元组幂等（`title` 只展示）；多天批量把每天的对象装进 `dates[]`，逐天走同一条单天合成写（本地幂等＋远端查一趟再判），回执 `items[]` 逐天分字段、失败逐条前缀日期点名且退出码非 0。`op=sync` 整天口径不动。
- 照抄即跑（2 天示例；7 天同形，只是数组更长）：`schedule-cmd-read schedule.plan.write --params '{"op":"ensure","dates":[{"date":"2026-09-21","time_start":"09:00","time_end":"10:00","title":"晨会"},{"date":"2026-09-22","time_start":"09:00","time_end":"10:00","title":"晨会"}]}'`

## 批量导入作息（记作息 · `records[]`，#783）

- 一条一条记＝`op=add` 走多遍；一次导入多条＝**同一条命令**带 `records[]`（每条自带 `date`／`time_start`／`time_end`／`activity`／`category`）：逐条走同一套校验与写库函数，**单条不过不打断其余**；回执给 `total`／`success`／`failed` 三个读数 ＋ `items[]` 逐条分字段，有一条没通过即退出码非 0（合成写没达成，页照出）。
- 产物＝一份「批量导入回执」整页（逐条结果 ＋ 汇总），地址读回执的 `delivery.path`。
- 照抄即跑（2 条示例）：`schedule-cmd-read schedule.record.write --params '{"op":"add","records":[{"date":"2026-09-22","time_start":"09:00","time_end":"10:00","activity":"写代码","category":"工作.开发"},{"date":"2026-09-22","time_start":"10:00","time_end":"10:30","activity":"散步","category":"调整.散步"}]}'`

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
| 查多日计划 | schedule.plan.today | list | `schedule-cmd-read schedule.plan.today --params '{"view":"aggregate","dates":["2026-09-21","2026-09-22"]}'` |
| 24h 概览 | schedule.plan.today | list | `schedule-cmd-read schedule.plan.today --params '{"view":"aggregate"}'` |
| 查日程 | schedule.plan.today | list | `schedule-cmd-read schedule.plan.today` |
| 看日程 | schedule.plan.today | list | `schedule-cmd-read schedule.plan.today` |
| 商量计划 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"preview"}'` |
| 一起规划 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"preview"}'` |
| 规划明天 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"preview"}'` |
| 规划一天 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"preview"}'` |
| 讨论计划 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"preview"}'` |
| 补计划 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"ensure","date":"2026-09-01","time_start":"09:00","time_end":"10:00","title":"晨会"}'` |
| 改计划 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"update","id":1}'` |
| 删计划 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"deactivate","id":1}'` |
| 复盘今日 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"review","granularity":"day"}'` |
| 复盘本周 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"review","granularity":"week"}'` |
| 复盘本月 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"review","granularity":"month"}'` |
| 复盘区间 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"review","granularity":"range"}'` |
| 日程管家同步 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"sync"}'` |
| 飞书探测 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"sync","dryRun":true}'` |
| 复盘 | schedule.plan.write | receipt | `schedule-cmd-read schedule.plan.write --params '{"op":"review"}'` |
| 周视图 | schedule.record.range | stat | `schedule-cmd-read schedule.record.range --params '{"view":"week"}'` |

相关场景：schedule.help.lookup、schedule.plan.today、schedule.plan.write、schedule.record.compare、schedule.record.detail、schedule.record.range、schedule.record.today、schedule.record.write（8 联动，key 字符串后续票落表时冻结）。
<!-- HELP-AUTO-END -->

## 交付面（说唤醒词就跑，产物落盘并回绝对路径）

- **缺省就是交付物**：上面 8 个联动 key **原样调用**即各落一份能打开的 HTML，stdout 顶层给 `delivery{mode,path,bytes}`——`path` 是**绝对路径**、`bytes` 是**落盘字节数**（回执即真相：回话就把 `path` 给用户）。
  **完成标准**：`delivery.path` 指向的文件真的存在，且大小＝`delivery.bytes`。
- **落点**：页面落**产物根** `<库目录>/<产物目录>`；`作息管家HELP` 落它的 `help` 子目录。`<库目录>`＝配置文件 `~/.ilife/schedule.yaml` 的 `db.dir`（空串＝数据目录 `~/.ilife/data/`）；`<产物目录>`＝同文件的 `html.dir`（默认 `schedule_html`，段间用 `/` 或 `\` 分隔），HELP 那一支＝`html.helpDir`（默认 `help`）。
- **命名**：`〈主体〉_<YYYYMMDD_HHMMSS>[_N].html`。主体＝`作息管家_〈页名〉`，页名就是该命令的标题（今日作息／汇总作息／作息详情／作息对比／查日程／写计划／记作息）；HELP 的主体恒为 `作息管家_HELP`（老名字逐字不变；5 类别／34 唤醒词／85 场景，走共享 help 模板）。**同名不覆盖**：同一秒落第二份时递补 `_2`、`_3`……任何时候都不覆盖已有产物。
- **产物是整页**：`<!DOCTYPE html>` 起、`</html>` 收；7 个命令页里放真内容（`<section data-skill="schedule"…`），`作息管家HELP` 是完整 HELP 壳页（载荷在 `<script id="help-data">`）。
- **要现找才加参数**：`--params '{"q":"查作息"}'` 回命中条目（**按定义不落盘**：这一支顶层没有 `delivery`；`q` 留空＝走上面的文件交付那一支）。全量速查表读上「联动速查」块（49 条路由词，构建期注入，与 `q` 同一张表）。
- **`--html <路径>`＝显式落点**：逐字使用、覆盖写、缺父目录自动建（不参与同秒 `_N` 递补）。8 个 key 都认它；`q` 支带上它写的是该键的分节页。
- **反复读不再涨目录（#245）**：同一主体**一天内只留一份**——24 小时内再读就**复用已有那份**（不新建、不改写；回执给的就是它）。要别的窗口给 `--params '{"reuseHours":3}'`（小时）；要**每次都要一份最新的**给 `{"reuseHours":0}`。窗口内若已有一份、而你刚改过 HELP 内容，那份旧产物**不会被自动刷新**（窗口语义如此）——真要新的就带 `reuseHours:0`。
- **看帮助不开库**：`作息管家HELP` 在开库之前分派，跑完不建 `schedule_data.db`（库还没建出来时也看得到帮助）；DB 文件已存在时，页首的首次使用横幅隐藏（判定只看文件在不在，不开库）。
- **边界**：面板／侧栏的 HELP 入口不在本技能范围（属插件侧那条线，见下「环境与出 scope」）。

## 环境与出 scope

- 路径类取值一律读配置文件 `~/.ilife/schedule.yaml`（**配置文件是唯一真相，环境变量不参与配置**）：库目录＝`db.dir`（空串＝数据目录 `~/.ilife/data/`，首次读时自动建）、库文件名＝`db.name`（默认 `schedule_data.db`）、产物根目录＝`html.dir`（默认 `schedule_html`；页面落它下面）、HELP 子目录＝`html.helpDir`（默认 `help`）。HELP 文件主体名回到代码常量（`作息管家_HELP`，#764 起不再是配置项）；飞书 CLI 不再是配置项（#764 起由设置页「飞书 CLI」状态行替代，只探测、不配置）。飞书同步另须 lark-cli 四门全绿。取值面与环境项见 docs/env.md。
- 出 scope：定时任务/早睡提醒（老家 Cron 已删，外部定时以外置为准）、面板（二期单 MAP）、本技能外联动（combos 登记走后续票）；语录取数（daily_recorder.db）以外置为准；真实数据禁迁，测试 tmp 隔离。
