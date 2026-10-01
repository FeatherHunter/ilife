# t992 复盘：两家配置面板报出口回执 key 不符

- 现象：备忘录、作息管家配置面板整面读不到，均落字 `出口回执 key 不符`，写配置改不动。
- 指纹：恰好是卡路里测试缝的两个目标（其余四家 dist 实测为真 CLI），面板走的正是被污染的那条真路。
- 根因：卡路里测试缝（`land-inferred-stub.mjs`，`before` 暂放／`after` 还原）把测试挡板
  `land-fixture.mjs` 暂放到两家 `dist/cli/cmd_read.js`；某次测试进程被杀没走 `after`，
  残留至今。挡板回 `{"data":...}` 无 `key` 格，桥的 `key-mismatch` 守卫即抛，面板原样上屏。
  该机制与解法见挡板件头「并发与崩溃」一段（残留打不到主干，`dist/**` 在 `.gitignore` 里）。
- 修复（未改任何源码）：重编两家包。注意普通 `tsc -b` 救不回——增量判鲜见 `src` 未动会跳过
  emit，必须 `--force`。
- 验证（隔离家目录，不碰真实 `~/.ilife`）：两家读命令 exit 0 且回执 `key` 逐字回显；
  两家插件桥 `readConfigSurface` 端到端全绿。

## 门禁运行（GATE-RUN，对账源）

- `GATE-RUN runId=e5b29285-b82c-4dbb-93e6-c6fd1a6f0feb cmd=tsc -b 两家`（exit=0；事后证实未实际恢复，见下）
- `GATE-RUN runId=6f4d3cdf-6c5a-4ba2-8dc0-af3b23951455 cmd=tsc -b --force 两家`（exit=0，真恢复）
- `GATE-RUN runId=d7cf5ce3-c119-4754-83b4-9a046ae3c387 cmd=memo config-695`（pass 5／fail 0）
- `GATE-RUN runId=7c74e990-3f74-4ad0-8999-929bd1299d83 cmd=sched config-695`（pass 4／fail 0）
- `GATE-RUN runId=ec0654fa-b032-4059-8fd1-e1b8d1f52cc4 cmd=memo 整包`（pass 296／fail 0）
- `GATE-RUN runId=75b16108-a5fb-4275-bd6a-adcbb1595162 cmd=sched 整包`（pass 267／fail 0）
- `GATE-RUN runId=456e61e0-30bc-4940-a92f-0588cdc1e7cc cmd=两家插件 smoke`（pass 15／fail 0）
- 明细在 `.scratch/t992-*.log`（草稿，已清）；运行记录以锁目录落盘为准。

## 给后来者

- 再见 `出口回执 key 不符` 且恰好两家同坏：先看两家 `dist/cli/cmd_read.js` 头 30 行是不是挡板，
  是即 `--force` 重编两家。
- 若用户装机包（npm registry 那份）同样被污染，仓内重编到不了用户，需走发版窗口重发；
  本票只覆盖仓内，未覆盖装机包。
