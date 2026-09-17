# t508 复核运行记录导出（对账源，抄自 `.scratch/locks/gate-runs.log` 的 `t508r-*` 行）

复核席独立复跑的每次持锁运行。判定“有没有走包装器”看 `START`／`RUN` 对子；
`exit` 预期：红线类（有命中）为 1，绿线类为 0。
`t508r-jsonparity` 的 exit=1 系复核席 harness 写法瑕疵（见主件 §六 D1），修正重跑为 `t508r-jsonparity2` exit=0。

```
START ticket=508 runId=t508r-build1 cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=1 pid=41424 at=2026-09-16T10:50:58.919Z
RUN ticket=508 runId=t508r-build1 cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=1 exit=0 pid=41424 at=2026-09-16T10:50:59.030Z
START ticket=508 runId=t508r-guard1 cmd="node --test packages/base-render/test/separator-guard.test.mjs" waitedMs=1 pid=2960 at=2026-09-16T10:51:00.784Z
RUN ticket=508 runId=t508r-guard1 cmd="node --test packages/base-render/test/separator-guard.test.mjs" waitedMs=1 exit=0 pid=2960 at=2026-09-16T10:51:01.132Z
START ticket=508 runId=t508r-probe-today cmd="node packages/base-render/test/separator-probe.mjs .scratch/t401c/看今日主页.html" waitedMs=0 pid=16416 at=2026-09-16T10:51:04.021Z
RUN ticket=508 runId=t508r-probe-today cmd="node packages/base-render/test/separator-probe.mjs .scratch/t401c/看今日主页.html" waitedMs=0 exit=1 pid=16416 at=2026-09-16T10:51:04.112Z
START ticket=508 runId=t508r-probe-week cmd="node packages/base-render/test/separator-probe.mjs .scratch/t401c/看本周主页.html" waitedMs=1 pid=67332 at=2026-09-16T10:51:06.050Z
RUN ticket=508 runId=t508r-probe-week cmd="node packages/base-render/test/separator-probe.mjs .scratch/t401c/看本周主页.html" waitedMs=1 exit=1 pid=67332 at=2026-09-16T10:51:06.134Z
START ticket=508 runId=t508r-probe-month cmd="node packages/base-render/test/separator-probe.mjs .scratch/t401c/看本月主页.html" waitedMs=0 pid=52888 at=2026-09-16T10:51:07.892Z
RUN ticket=508 runId=t508r-probe-month cmd="node packages/base-render/test/separator-probe.mjs .scratch/t401c/看本月主页.html" waitedMs=0 exit=1 pid=52888 at=2026-09-16T10:51:07.976Z
START ticket=508 runId=t508r-probe-orig cmd="node .scratch/sep-audit/probe.mjs .scratch/t401c/看今日主页.html" waitedMs=0 pid=54184 at=2026-09-16T10:51:09.555Z
RUN ticket=508 runId=t508r-probe-orig cmd="node .scratch/sep-audit/probe.mjs .scratch/t401c/看今日主页.html" waitedMs=0 exit=1 pid=54184 at=2026-09-16T10:51:09.644Z
START ticket=508 runId=t508r-regress1 cmd="node --test packages/base-render/test/blocks.test.mjs packages/base-render/test/page-finish-420.test.mjs packages/base-render/test/rowcard-caliber-t154r3.test.mjs" waitedMs=0 pid=41600 at=2026-09-16T10:51:11.459Z
RUN ticket=508 runId=t508r-regress1 cmd="node --test packages/base-render/test/blocks.test.mjs packages/base-render/test/page-finish-420.test.mjs packages/base-render/test/rowcard-caliber-t154r3.test.mjs" waitedMs=0 exit=0 pid=41600 at=2026-09-16T10:51:11.689Z
START ticket=508 runId=t508r-mut-red cmd="node .scratch/t508r/mut.mjs red" waitedMs=0 pid=68320 at=2026-09-16T10:51:44.086Z
RUN ticket=508 runId=t508r-mut-red cmd="node .scratch/t508r/mut.mjs red" waitedMs=0 exit=1 pid=68320 at=2026-09-16T10:51:44.151Z
START ticket=508 runId=t508r-mut-green cmd="node .scratch/t508r/mut.mjs green" waitedMs=0 pid=12176 at=2026-09-16T10:51:46.064Z
RUN ticket=508 runId=t508r-mut-green cmd="node .scratch/t508r/mut.mjs green" waitedMs=0 exit=0 pid=12176 at=2026-09-16T10:51:46.139Z
START ticket=508 runId=t508r-newprobes cmd="node .scratch/t508r/new-probes.mjs" waitedMs=0 pid=43804 at=2026-09-16T10:51:48.071Z
RUN ticket=508 runId=t508r-newprobes cmd="node .scratch/t508r/new-probes.mjs" waitedMs=0 exit=0 pid=43804 at=2026-09-16T10:51:48.142Z
START ticket=508 runId=t508r-parity cmd="node .scratch/t508r/parity.mjs" waitedMs=0 pid=45492 at=2026-09-16T10:51:56.875Z
RUN ticket=508 runId=t508r-parity cmd="node .scratch/t508r/parity.mjs" waitedMs=0 exit=0 pid=45492 at=2026-09-16T10:51:56.949Z
START ticket=508 runId=t508r-jsonparity cmd="node .scratch/t508r/json-parity.mjs" waitedMs=0 pid=18088 at=2026-09-16T10:51:58.462Z
RUN ticket=508 runId=t508r-jsonparity cmd="node .scratch/t508r/json-parity.mjs" waitedMs=0 exit=1 pid=18088 at=2026-09-16T10:51:58.613Z
START ticket=508 runId=t508r-jsonparity2 cmd="node .scratch/t508r/json-parity.mjs" waitedMs=0 pid=52572 at=2026-09-16T10:52:03.798Z
RUN ticket=508 runId=t508r-jsonparity2 cmd="node .scratch/t508r/json-parity.mjs" waitedMs=0 exit=0 pid=52572 at=2026-09-16T10:52:04.017Z
```
