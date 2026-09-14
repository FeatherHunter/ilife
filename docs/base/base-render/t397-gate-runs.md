# t397 运行记录导出（对账源，抄自 `.scratch/locks/gate-runs.log`）

导出时刻 2026-09-14T10:35Z（UTC）；`basedir`／`build1` 两次废弃运行（写法错误，非门禁）不在此列，见证据 §三。

```
START ticket=397 runId=t397-build2 cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=1 pid=15576 at=2026-09-14T10:31:19.698Z
RUN ticket=397 runId=t397-build2 cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=1 exit=0 pid=15576 at=2026-09-14T10:31:19.814Z
START ticket=397 runId=t397-test1 cmd="node --test packages/base-render/test/blocks.test.mjs" waitedMs=40005 pid=13668 at=2026-09-14T10:32:08.946Z
RUN ticket=397 runId=t397-test1 cmd="node --test packages/base-render/test/blocks.test.mjs" waitedMs=40005 exit=0 pid=13668 at=2026-09-14T10:32:09.178Z
START ticket=397 runId=t397-mut-build cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=0 pid=15220 at=2026-09-14T10:32:24.872Z
RUN ticket=397 runId=t397-mut-build cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=0 exit=0 pid=15220 at=2026-09-14T10:32:25.531Z
START ticket=397 runId=t397-mut-test cmd="node --test packages/base-render/test/blocks.test.mjs" waitedMs=0 pid=14004 at=2026-09-14T10:32:28.285Z
RUN ticket=397 runId=t397-mut-test cmd="node --test packages/base-render/test/blocks.test.mjs" waitedMs=0 exit=1 pid=14004 at=2026-09-14T10:32:28.489Z
START ticket=397 runId=t397-restore-build cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=10001 pid=41236 at=2026-09-14T10:32:44.208Z
RUN ticket=397 runId=t397-restore-build cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=10001 exit=0 pid=41236 at=2026-09-14T10:32:44.857Z
START ticket=397 runId=t397-retest cmd="node --test packages/base-render/test/blocks.test.mjs" waitedMs=0 pid=43380 at=2026-09-14T10:32:48.785Z
RUN ticket=397 runId=t397-retest cmd="node --test packages/base-render/test/blocks.test.mjs" waitedMs=0 exit=0 pid=43380 at=2026-09-14T10:32:48.992Z
START ticket=397 runId=t397-basedir2 cmd="node --test packages/base-render/test/blocks.test.mjs packages/base-render/test/controls.test.mjs packages/base-render/test/render.test.mjs packages/base-render/test/template.test.mjs packages/base-render/test/text.test.mjs packages/base-render/test/help.test.mjs packages/base-render/test/charts.test.mjs packages/base-render/test/style.test.mjs packages/base-render/test/contract-signatures.test.mjs" waitedMs=50005 pid=38504 at=2026-09-14T10:34:00.418Z
RUN ticket=397 runId=t397-basedir2 cmd="node --test packages/base-render/test/blocks.test.mjs packages/base-render/test/controls.test.mjs packages/base-render/test/render.test.mjs packages/base-render/test/template.test.mjs packages/base-render/test/text.test.mjs packages/base-render/test/help.test.mjs packages/base-render/test/charts.test.mjs packages/base-render/test/style.test.mjs packages/base-render/test/contract-signatures.test.mjs" waitedMs=50005 exit=1 pid=38504 at=2026-09-14T10:34:02.451Z
START ticket=397 runId=t397-wiz86 cmd="node --test packages/skill-calorie/test/wizard-86.test.mjs" waitedMs=10000 pid=50968 at=2026-09-14T10:34:43.966Z
RUN ticket=397 runId=t397-wiz86 cmd="node --test packages/skill-calorie/test/wizard-86.test.mjs" waitedMs=10000 exit=0 pid=50968 at=2026-09-14T10:34:45.598Z
```
