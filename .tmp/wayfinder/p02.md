Blocked by: 无

## Question

冻结 engines 与 doctor fail/warn 线，修正 02 的 node>=18。

事实基线：node:sqlite v22.5.0 引入需 flag，v22.13.0去 flag，18/20 全系无，18 已 EOL。定 engines>=22.13（用 22.13+/24），低于 fail，22.5-22.12 warn，CI 只跑 22.13+/24。

doctor：node 版本、SKILLS_DB_PATH 可写（换 DB 重连例外）、lark-cli 四项全绿才取数、CLI argv+JSON+exit、缺 key 阻断对应技能、缺失阻断不返空数组。HTML 未定前只 warn。
