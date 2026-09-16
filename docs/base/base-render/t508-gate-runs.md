# t508 运行记录导出（对账源，抄自 `.scratch/locks/gate-runs.log`）

本文件是协议 §2.3 第 4 条的导出件：把本次窗口内属于票号 508 的运行条目逐行抄录，供第三方复核。
判定“有没有走包装器”看运行记录里的持锁行（`START`／`RUN`），不看持锁者记录文件在不在。
抄录时刻 2026-09-16T10:47Z（UTC）。`t508-mut-red` 等待了他席 555 的活锁一次（`WAIT-OWNER-ALIVE`，等待 10003ms，未抢活锁）。

```
START ticket=508 runId=t508-build1 cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=0 pid=69304 at=2026-09-16T10:45:56.969Z
RUN ticket=508 runId=t508-build1 cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=0 exit=0 pid=69304 at=2026-09-16T10:45:57.690Z
START ticket=508 runId=t508-guard1 cmd="node --test packages/base-render/test/separator-guard.test.mjs" waitedMs=0 pid=47480 at=2026-09-16T10:45:59.287Z
RUN ticket=508 runId=t508-guard1 cmd="node --test packages/base-render/test/separator-guard.test.mjs" waitedMs=0 exit=0 pid=47480 at=2026-09-16T10:45:59.604Z
START ticket=508 runId=t508-probe-today cmd="node packages/base-render/test/separator-probe.mjs .scratch/t401c/看今日主页.html" waitedMs=0 pid=52232 at=2026-09-16T10:46:03.420Z
RUN ticket=508 runId=t508-probe-today cmd="node packages/base-render/test/separator-probe.mjs .scratch/t401c/看今日主页.html" waitedMs=0 exit=1 pid=52232 at=2026-09-16T10:46:03.563Z
START ticket=508 runId=t508-probe-week cmd="node packages/base-render/test/separator-probe.mjs .scratch/t401c/看本周主页.html" waitedMs=0 pid=48872 at=2026-09-16T10:46:08.080Z
RUN ticket=508 runId=t508-probe-week cmd="node packages/base-render/test/separator-probe.mjs .scratch/t401c/看本周主页.html" waitedMs=0 exit=1 pid=48872 at=2026-09-16T10:46:08.310Z
START ticket=508 runId=t508-probe-month cmd="node packages/base-render/test/separator-probe.mjs .scratch/t401c/看本月主页.html" waitedMs=0 pid=43748 at=2026-09-16T10:46:09.967Z
RUN ticket=508 runId=t508-probe-month cmd="node packages/base-render/test/separator-probe.mjs .scratch/t401c/看本月主页.html" waitedMs=0 exit=1 pid=43748 at=2026-09-16T10:46:10.135Z
START ticket=508 runId=t508-probe-orig cmd="node .scratch/sep-audit/probe.mjs .scratch/t401c/看今日主页.html" waitedMs=0 pid=35688 at=2026-09-16T10:46:14.399Z
RUN ticket=508 runId=t508-probe-orig cmd="node .scratch/sep-audit/probe.mjs .scratch/t401c/看今日主页.html" waitedMs=0 exit=1 pid=35688 at=2026-09-16T10:46:14.488Z
START ticket=508 runId=t508-mut-red cmd="node --input-type=module -e \"import('./packages/base-render/test/separator-probe.mjs').then(m=>{const r=m.auditHtml('<html><body><p>今日摄入 1189 卡 · 缺口 511 卡 · 完成度 66%</p></body></html>');console.log('MUT-RED node='+r.node.hits.length+' exit='+m.exitCodeFor(r));process.exit(m.exitCodeFor(r))})\"" waitedMs=10003 pid=47588 at=2026-09-16T10:46:37.539Z
RUN ticket=508 runId=t508-mut-red cmd="node --input-type=module -e \"import('./packages/base-render/test/separator-probe.mjs').then(m=>{const r=m.auditHtml('<html><body><p>今日摄入 1189 卡 · 缺口 511 卡 · 完成度 66%</p></body></html>');console.log('MUT-RED node='+r.node.hits.length+' exit='+m.exitCodeFor(r));process.exit(m.exitCodeFor(r))})\"" waitedMs=10003 exit=1 pid=47588 at=2026-09-16T10:46:37.607Z
START ticket=508 runId=t508-mut-green cmd="node --input-type=module -e \"import('./packages/base-render/test/separator-probe.mjs').then(m=>{const r=m.auditHtml('<html><body><p>今日摄入 1189 卡</p></body></html>');console.log('MUT-GREEN node='+r.node.hits.length+' exit='+m.exitCodeFor(r));process.exit(m.exitCodeFor(r))})\"" waitedMs=1 pid=44256 at=2026-09-16T10:46:45.759Z
RUN ticket=508 runId=t508-mut-green cmd="node --input-type=module -e \"import('./packages/base-render/test/separator-probe.mjs').then(m=>{const r=m.auditHtml('<html><body><p>今日摄入 1189 卡</p></body></html>');console.log('MUT-GREEN node='+r.node.hits.length+' exit='+m.exitCodeFor(r));process.exit(m.exitCodeFor(r))})\"" waitedMs=1 exit=0 pid=44256 at=2026-09-16T10:46:45.829Z
START ticket=508 runId=t508-regress1 cmd="node --test packages/base-render/test/blocks.test.mjs packages/base-render/test/page-finish-420.test.mjs packages/base-render/test/rowcard-caliber-t154r3.test.mjs" waitedMs=0 pid=64892 at=2026-09-16T10:46:48.621Z
RUN ticket=508 runId=t508-regress1 cmd="node --test packages/base-render/test/blocks.test.mjs packages/base-render/test/page-finish-420.test.mjs packages/base-render/test/rowcard-caliber-t154r3.test.mjs" waitedMs=0 exit=0 pid=64892 at=2026-09-16T10:46:48.856Z
START ticket=508 runId=t508-guard2 cmd="node --test packages/base-render/test/separator-guard.test.mjs" waitedMs=0 pid=16688 at=2026-09-16T10:48:33.255Z
RUN ticket=508 runId=t508-guard2 cmd="node --test packages/base-render/test/separator-guard.test.mjs" waitedMs=0 exit=0 pid=16688 at=2026-09-16T10:48:33.580Z
```
