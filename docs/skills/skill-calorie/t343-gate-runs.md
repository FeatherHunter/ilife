# t343 运行记录导出（对账源，抄自 `.scratch/locks/gate-runs.log` 的 `ticket=343` 行）

本席（#343）窗口内每次持锁运行的 `START`／`RUN` 对子，按时间序原样抄录（含总工派单前的两次现场勘查运行，见证据 §九 第 — 行）。
判定“有没有走包装器”看 `START`／`RUN` 对子；`exit` 预期：红线类（有命中）为 1，绿线类为 0。

```
START ticket=343 runId=178ac1bb-239a-42fe-8eee-79fdb482c0d8 cmd="node .scratch/map638/t343-survey.mjs" waitedMs=0 pid=30292 at=2026-09-16T13:18:32.346Z
RUN ticket=343 runId=178ac1bb-239a-42fe-8eee-79fdb482c0d8 cmd="node .scratch/map638/t343-survey.mjs" waitedMs=0 exit=0 pid=30292 at=2026-09-16T13:18:32.420Z
START ticket=343 runId=cee5e7b5-a442-4a29-aada-5034ac9d197e cmd="node .scratch/map638/t343-survey2.mjs" waitedMs=0 pid=53604 at=2026-09-16T13:19:18.670Z
RUN ticket=343 runId=cee5e7b5-a442-4a29-aada-5034ac9d197e cmd="node .scratch/map638/t343-survey2.mjs" waitedMs=0 exit=0 pid=53604 at=2026-09-16T13:19:18.747Z
START ticket=343 runId=6aa4dfda-d2f4-42e2-9ef7-bf7dde00d924 cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 pid=62884 at=2026-09-16T13:25:57.976Z
RUN ticket=343 runId=6aa4dfda-d2f4-42e2-9ef7-bf7dde00d924 cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 exit=1 pid=62884 at=2026-09-16T13:28:01.027Z
START ticket=343 runId=cfbaa3c8-6547-4a5c-87fe-c7aec5c2b3a4 cmd="node packages/skill-calorie/scripts/gen-cli.mjs --check" waitedMs=0 pid=71168 at=2026-09-16T13:34:46.601Z
RUN ticket=343 runId=cfbaa3c8-6547-4a5c-87fe-c7aec5c2b3a4 cmd="node packages/skill-calorie/scripts/gen-cli.mjs --check" waitedMs=0 exit=1 pid=71168 at=2026-09-16T13:34:46.874Z
START ticket=343 runId=acab30e3-4637-4b03-b26e-989701395eda cmd="node node_modules/typescript/bin/tsc -b packages/skill-calorie" waitedMs=0 pid=71120 at=2026-09-16T13:35:50.303Z
RUN ticket=343 runId=acab30e3-4637-4b03-b26e-989701395eda cmd="node node_modules/typescript/bin/tsc -b packages/skill-calorie" waitedMs=0 exit=0 pid=71120 at=2026-09-16T13:35:51.299Z
START ticket=343 runId=764cea06-ab7e-44b8-ae76-266f2de35586 cmd="node packages/skill-calorie/scripts/gen-cli.mjs --stamp" waitedMs=1 pid=44068 at=2026-09-16T13:35:55.563Z
RUN ticket=343 runId=764cea06-ab7e-44b8-ae76-266f2de35586 cmd="node packages/skill-calorie/scripts/gen-cli.mjs --stamp" waitedMs=1 exit=0 pid=44068 at=2026-09-16T13:35:55.647Z
START ticket=343 runId=cb434398-42b1-424d-b4f9-d21aa3e247d8 cmd="node packages/skill-calorie/scripts/gen-cli.mjs" waitedMs=1 pid=28124 at=2026-09-16T13:35:59.258Z
RUN ticket=343 runId=cb434398-42b1-424d-b4f9-d21aa3e247d8 cmd="node packages/skill-calorie/scripts/gen-cli.mjs" waitedMs=1 exit=0 pid=28124 at=2026-09-16T13:35:59.544Z
START ticket=343 runId=b26ffaba-eafd-4c26-ba84-b0c82f4cff77 cmd="node packages/skill-calorie/scripts/build-help.mjs" waitedMs=1 pid=35220 at=2026-09-16T13:36:05.385Z
RUN ticket=343 runId=b26ffaba-eafd-4c26-ba84-b0c82f4cff77 cmd="node packages/skill-calorie/scripts/build-help.mjs" waitedMs=1 exit=0 pid=35220 at=2026-09-16T13:36:05.470Z
START ticket=343 runId=c8d4575c-f58f-4868-9500-9c1c83889c86 cmd="node --test packages/skill-calorie/test/wakeword-gate-343.test.mjs" waitedMs=0 pid=43944 at=2026-09-16T13:36:52.533Z
RUN ticket=343 runId=c8d4575c-f58f-4868-9500-9c1c83889c86 cmd="node --test packages/skill-calorie/test/wakeword-gate-343.test.mjs" waitedMs=0 exit=0 pid=43944 at=2026-09-16T13:36:53.098Z
START ticket=343 runId=1f503f5c-c925-4a40-8fbb-526325f26f4f cmd="node --test packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/help-new-family-471.test.mjs" waitedMs=0 pid=54084 at=2026-09-16T13:36:58.181Z
RUN ticket=343 runId=1f503f5c-c925-4a40-8fbb-526325f26f4f cmd="node --test packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/help-new-family-471.test.mjs" waitedMs=0 exit=0 pid=54084 at=2026-09-16T13:37:18.064Z
START ticket=343 runId=58017e2b-52b6-475b-9399-752b8af4b660 cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 pid=71176 at=2026-09-16T13:37:24.592Z
RUN ticket=343 runId=58017e2b-52b6-475b-9399-752b8af4b660 cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 exit=1 pid=71176 at=2026-09-16T13:39:29.844Z
START ticket=343 runId=62dfe6dd-5266-4b01-b9b8-d19cf519739a cmd="node packages/skill-calorie/scripts/check-warning-line.mjs" waitedMs=1 pid=62676 at=2026-09-16T13:39:49.294Z
RUN ticket=343 runId=62dfe6dd-5266-4b01-b9b8-d19cf519739a cmd="node packages/skill-calorie/scripts/check-warning-line.mjs" waitedMs=1 exit=1 pid=62676 at=2026-09-16T13:39:49.422Z
START ticket=343 runId=b8024f40-3c70-4935-b1de-846f47a57383 cmd="node packages/skill-calorie/scripts/check-warning-line.mjs --sync --dry" waitedMs=0 pid=68612 at=2026-09-16T13:39:54.869Z
RUN ticket=343 runId=b8024f40-3c70-4935-b1de-846f47a57383 cmd="node packages/skill-calorie/scripts/check-warning-line.mjs --sync --dry" waitedMs=0 exit=1 pid=68612 at=2026-09-16T13:39:55.012Z
START ticket=343 runId=d01ce06f-896e-4293-babc-05af85b867a0 cmd="node packages/skill-calorie/scripts/check-warning-line.mjs --sync" waitedMs=0 pid=6404 at=2026-09-16T13:40:00.831Z
RUN ticket=343 runId=d01ce06f-896e-4293-babc-05af85b867a0 cmd="node packages/skill-calorie/scripts/check-warning-line.mjs --sync" waitedMs=0 exit=0 pid=6404 at=2026-09-16T13:40:00.985Z
START ticket=343 runId=d2b99693-6a67-4cdc-87c8-3f0604cc4a2d cmd="node packages/skill-calorie/scripts/check-warning-line.mjs" waitedMs=0 pid=70360 at=2026-09-16T13:40:01.073Z
RUN ticket=343 runId=d2b99693-6a67-4cdc-87c8-3f0604cc4a2d cmd="node packages/skill-calorie/scripts/check-warning-line.mjs" waitedMs=0 exit=0 pid=70360 at=2026-09-16T13:40:01.196Z
START ticket=343 runId=3f07cead-e593-49a7-973c-bcfa19861eab cmd="node packages/skill-calorie/scripts/check-warning-line.mjs" waitedMs=1 pid=38328 at=2026-09-16T13:40:26.413Z
RUN ticket=343 runId=3f07cead-e593-49a7-973c-bcfa19861eab cmd="node packages/skill-calorie/scripts/check-warning-line.mjs" waitedMs=1 exit=0 pid=38328 at=2026-09-16T13:40:26.537Z
START ticket=343 runId=b9ba64b2-e3d8-45fb-b28a-cfb56525ce6e cmd="node packages/skill-calorie/scripts/check-warning-line.mjs --sync --dry" waitedMs=1 pid=51112 at=2026-09-16T13:40:26.618Z
RUN ticket=343 runId=b9ba64b2-e3d8-45fb-b28a-cfb56525ce6e cmd="node packages/skill-calorie/scripts/check-warning-line.mjs --sync --dry" waitedMs=1 exit=0 pid=51112 at=2026-09-16T13:40:26.772Z
START ticket=343 runId=5c401888-0b00-4faf-83f0-0fe79ee8dc2b cmd="node node_modules/typescript/bin/tsc -b packages/skill-calorie" waitedMs=0 pid=67008 at=2026-09-16T13:40:45.162Z
RUN ticket=343 runId=5c401888-0b00-4faf-83f0-0fe79ee8dc2b cmd="node node_modules/typescript/bin/tsc -b packages/skill-calorie" waitedMs=0 exit=0 pid=67008 at=2026-09-16T13:40:46.057Z
START ticket=343 runId=bd3411d8-ee01-4e4d-bd91-499cce3fd6bb cmd="node packages/skill-calorie/scripts/gen-cli.mjs --stamp" waitedMs=0 pid=48332 at=2026-09-16T13:40:46.114Z
RUN ticket=343 runId=bd3411d8-ee01-4e4d-bd91-499cce3fd6bb cmd="node packages/skill-calorie/scripts/gen-cli.mjs --stamp" waitedMs=0 exit=0 pid=48332 at=2026-09-16T13:40:46.198Z
START ticket=343 runId=f89e5647-b873-484e-8d38-4650ffce19d0 cmd="node packages/skill-calorie/scripts/gen-cli.mjs --check" waitedMs=0 pid=60376 at=2026-09-16T13:40:46.259Z
RUN ticket=343 runId=f89e5647-b873-484e-8d38-4650ffce19d0 cmd="node packages/skill-calorie/scripts/gen-cli.mjs --check" waitedMs=0 exit=1 pid=60376 at=2026-09-16T13:40:46.516Z
START ticket=343 runId=61f95b1f-099b-4c87-8c46-e86f5764834f cmd="node --test packages/skill-calorie/test/wakeword-gate-343.test.mjs" waitedMs=0 pid=5080 at=2026-09-16T13:40:52.110Z
RUN ticket=343 runId=61f95b1f-099b-4c87-8c46-e86f5764834f cmd="node --test packages/skill-calorie/test/wakeword-gate-343.test.mjs" waitedMs=0 exit=1 pid=5080 at=2026-09-16T13:40:52.642Z
START ticket=343 runId=320ee015-0d6b-42f4-b116-86992de1c6bf cmd="node node_modules/typescript/bin/tsc -b packages/skill-calorie" waitedMs=0 pid=69828 at=2026-09-16T13:40:57.244Z
RUN ticket=343 runId=320ee015-0d6b-42f4-b116-86992de1c6bf cmd="node node_modules/typescript/bin/tsc -b packages/skill-calorie" waitedMs=0 exit=0 pid=69828 at=2026-09-16T13:40:57.353Z
START ticket=343 runId=dc540687-ec3f-41d2-ac19-9be4e5bdfc4b cmd="node packages/skill-calorie/scripts/gen-cli.mjs --stamp" waitedMs=0 pid=45096 at=2026-09-16T13:40:57.408Z
RUN ticket=343 runId=dc540687-ec3f-41d2-ac19-9be4e5bdfc4b cmd="node packages/skill-calorie/scripts/gen-cli.mjs --stamp" waitedMs=0 exit=0 pid=45096 at=2026-09-16T13:40:57.489Z
START ticket=343 runId=ae6466a8-a9f9-4f68-89d7-26715286daa4 cmd="node packages/skill-calorie/scripts/gen-cli.mjs --check" waitedMs=0 pid=48240 at=2026-09-16T13:40:57.554Z
RUN ticket=343 runId=ae6466a8-a9f9-4f68-89d7-26715286daa4 cmd="node packages/skill-calorie/scripts/gen-cli.mjs --check" waitedMs=0 exit=1 pid=48240 at=2026-09-16T13:40:57.819Z
START ticket=343 runId=93875e6d-a198-4f4d-b252-df799f687e5e cmd="node node_modules/typescript/bin/tsc -b packages/skill-calorie" waitedMs=0 pid=48436 at=2026-09-16T13:41:20.904Z
RUN ticket=343 runId=93875e6d-a198-4f4d-b252-df799f687e5e cmd="node node_modules/typescript/bin/tsc -b packages/skill-calorie" waitedMs=0 exit=0 pid=48436 at=2026-09-16T13:41:21.844Z
START ticket=343 runId=adb9f094-5263-4586-9e93-3e120d30ac5e cmd="node packages/skill-calorie/scripts/gen-cli.mjs --stamp" waitedMs=1 pid=69124 at=2026-09-16T13:41:21.911Z
RUN ticket=343 runId=adb9f094-5263-4586-9e93-3e120d30ac5e cmd="node packages/skill-calorie/scripts/gen-cli.mjs --stamp" waitedMs=1 exit=0 pid=69124 at=2026-09-16T13:41:21.996Z
START ticket=343 runId=c8f0a8e9-cd5c-4c3c-828d-6e5d2536f3a0 cmd="node packages/skill-calorie/scripts/gen-cli.mjs --check" waitedMs=0 pid=42180 at=2026-09-16T13:41:22.059Z
RUN ticket=343 runId=c8f0a8e9-cd5c-4c3c-828d-6e5d2536f3a0 cmd="node packages/skill-calorie/scripts/gen-cli.mjs --check" waitedMs=0 exit=0 pid=42180 at=2026-09-16T13:41:22.321Z
START ticket=343 runId=a086b5a3-e37a-4a0f-827b-e53864e0022b cmd="node --test packages/skill-calorie/test/wakeword-gate-343.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/help-new-family-471.test.mjs packages/skill-calorie/test/t367-唤醒词门.test.mjs packages/skill-calorie/test/t255-单一来源.test.mjs" waitedMs=1 pid=52444 at=2026-09-16T13:41:31.935Z
RUN ticket=343 runId=a086b5a3-e37a-4a0f-827b-e53864e0022b cmd="node --test packages/skill-calorie/test/wakeword-gate-343.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/help-new-family-471.test.mjs packages/skill-calorie/test/t367-唤醒词门.test.mjs packages/skill-calorie/test/t255-单一来源.test.mjs" waitedMs=1 exit=1 pid=52444 at=2026-09-16T13:41:51.934Z
START ticket=343 runId=1f4c4c31-0f6f-44d4-a4e2-e9da5534ca67 cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 pid=66332 at=2026-09-16T13:42:13.991Z
RUN ticket=343 runId=1f4c4c31-0f6f-44d4-a4e2-e9da5534ca67 cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 exit=1 pid=66332 at=2026-09-16T13:44:15.689Z
START ticket=343 runId=3aa3c280-4afc-4216-9b1e-2a0a617635a6 cmd="git add packages/skill-calorie/scripts/gen-cli.mjs packages/skill-calorie/scripts/build-help.mjs packages/skill-calorie/SKILL.md packages/skill-calorie/src/diet/commands.ts packages/skill-calorie/src/goal/commands.ts packages/skill-calorie/src/photo/commands.ts packages/skill-calorie/test/wakeword-gate-343.test.mjs docs/skills/skill-calorie/t343-代表词门-证据.md docs/skills/skill-calorie/t343-gate-runs.md" waitedMs=0 pid=28872 at=2026-09-16T13:51:54.834Z
RUN ticket=343 runId=3aa3c280-4afc-4216-9b1e-2a0a617635a6 cmd="git add packages/skill-calorie/scripts/gen-cli.mjs packages/skill-calorie/scripts/build-help.mjs packages/skill-calorie/SKILL.md packages/skill-calorie/src/diet/commands.ts packages/skill-calorie/src/goal/commands.ts packages/skill-calorie/src/photo/commands.ts packages/skill-calorie/test/wakeword-gate-343.test.mjs docs/skills/skill-calorie/t343-代表词门-证据.md docs/skills/skill-calorie/t343-gate-runs.md" waitedMs=0 exit=0 pid=28872 at=2026-09-16T13:51:54.893Z
START ticket=343 runId=6919fd8d-d954-4d90-b12c-c0e778c97a03 cmd="git commit -F .scratch/t343/commit-msg.txt" waitedMs=0 pid=40576 at=2026-09-16T13:52:15.545Z
RUN ticket=343 runId=6919fd8d-d954-4d90-b12c-c0e778c97a03 cmd="git commit -F .scratch/t343/commit-msg.txt" waitedMs=0 exit=0 pid=40576 at=2026-09-16T13:52:15.640Z
START ticket=343 runId=43417552-3432-4f5a-bf98-644095dbbb73 cmd="node packages/skill-calorie/scripts/gen-cli.mjs --check" waitedMs=0 pid=71632 at=2026-09-16T13:52:25.853Z
RUN ticket=343 runId=43417552-3432-4f5a-bf98-644095dbbb73 cmd="node packages/skill-calorie/scripts/gen-cli.mjs --check" waitedMs=0 exit=0 pid=71632 at=2026-09-16T13:52:26.131Z
START ticket=343 runId=c28cd9ef-ec0b-43a2-8026-aa1d31b96f43 cmd="node --test packages/skill-calorie/test/wakeword-gate-343.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/help-new-family-471.test.mjs" waitedMs=0 pid=13600 at=2026-09-16T13:52:30.259Z
RUN ticket=343 runId=c28cd9ef-ec0b-43a2-8026-aa1d31b96f43 cmd="node --test packages/skill-calorie/test/wakeword-gate-343.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/help-new-family-471.test.mjs" waitedMs=0 exit=0 pid=13600 at=2026-09-16T13:52:51.027Z
START ticket=343 runId=5f2d15ab-352f-47a4-ac51-21d77f9ae961 cmd="node packages/skill-calorie/scripts/check-warning-line.mjs" waitedMs=0 pid=70632 at=2026-09-16T13:52:51.115Z
RUN ticket=343 runId=5f2d15ab-352f-47a4-ac51-21d77f9ae961 cmd="node packages/skill-calorie/scripts/check-warning-line.mjs" waitedMs=0 exit=0 pid=70632 at=2026-09-16T13:52:51.236Z
```

