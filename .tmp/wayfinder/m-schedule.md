## Destination

作息管家 TS 迁移重构为全 TS 并纯 SKILL 可用：唯一出口 cmd_read，envelope 全字段，HELP 现找可执行。体量：py 52 个约 19.7k 行，SKILL.md 1511 行，有 DB，联动 8 处。lark-cli 相关取数与定时边界以外置为准。

## Notes

- 遵循一期总图 Destination 与铁律（真相唯一 B、纯 CLI、engines>=22.13、缺失阻断不返空）。
- 老家只读对照，Python 当天删；真实数据禁迁，测试 tmp 隔离。
- 每 session 按票调 research / prototype / grilling / domain-modeling。

## Decisions so far

- （空）

## Not yet specified

- 取数 / 口径 / 渲染拆分待首票毕业。

## Out of scope

- 面板（二期单 MAP）；定时任务；本技能外联动。
