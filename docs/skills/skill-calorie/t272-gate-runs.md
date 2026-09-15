# #272 门禁运行条目（抄自 `.scratch/locks/gate-runs.log`，只抄 `ticket=272`）

> 本窗共 **21** 条运行条目；每条一行 `GATE-RUN runId=<标识> cmd=<命令> exit=<码> waitedMs=<等锁毫秒> at=<ISO>`。
> 编译／测试／`git add`／`git commit`／`git push` 一律持锁跑（协议 §2.4）；等到超时的 `exit 1` 不是失败。

- `START ticket=272 runId=64187e20-2736-47f7-9402-4946bb00dda4 cmd="npx tsc -b packages/skill-calorie" waitedMs=0 pid=11528 at=2026-09-15T02:38:05.415Z`
- `RUN ticket=272 runId=64187e20-2736-47f7-9402-4946bb00dda4 cmd="npx tsc -b packages/skill-calorie" waitedMs=0 exit=0 pid=11528 at=2026-09-15T02:38:05.970Z`
- `START ticket=272 runId=dcd358b1-64cd-4254-a5d4-e843d22af8c2 cmd="node docs/skills/skill-calorie/t155-证据/复算-全量真跑.mjs" waitedMs=0 pid=32196 at=2026-09-15T02:38:10.569Z`
- `RUN ticket=272 runId=dcd358b1-64cd-4254-a5d4-e843d22af8c2 cmd="node docs/skills/skill-calorie/t155-证据/复算-全量真跑.mjs" waitedMs=0 exit=0 pid=32196 at=2026-09-15T02:38:35.939Z`
- `START ticket=272 runId=ff489ea6-2aeb-4007-b2b1-e0ec41e8b3b8 cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 pid=42268 at=2026-09-15T02:39:41.272Z`
- `RUN ticket=272 runId=ff489ea6-2aeb-4007-b2b1-e0ec41e8b3b8 cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 exit=1 pid=42268 at=2026-09-15T02:40:56.645Z`
- `START ticket=272 runId=090252dd-b539-44b8-ad2b-413d8a402f39 cmd="npx tsc -b packages/skill-calorie" waitedMs=10002 pid=28972 at=2026-09-15T02:44:59.907Z`
- `RUN ticket=272 runId=090252dd-b539-44b8-ad2b-413d8a402f39 cmd="npx tsc -b packages/skill-calorie" waitedMs=10002 exit=0 pid=28972 at=2026-09-15T02:45:01.405Z`
- `START ticket=272 runId=bc093bda-d9b4-4415-9e04-61507a3962ba cmd="node docs/skills/skill-calorie/t155-证据/复算-全量真跑.mjs" waitedMs=0 pid=29040 at=2026-09-15T02:45:29.591Z`
- `RUN ticket=272 runId=bc093bda-d9b4-4415-9e04-61507a3962ba cmd="node docs/skills/skill-calorie/t155-证据/复算-全量真跑.mjs" waitedMs=0 exit=0 pid=29040 at=2026-09-15T02:45:55.600Z`
- `START ticket=272 runId=db9a8326-23d3-4c64-880b-5f569b3cbe11 cmd="npx tsc -b packages/skill-calorie" waitedMs=90046 pid=41312 at=2026-09-15T02:49:20.251Z`
- `RUN ticket=272 runId=db9a8326-23d3-4c64-880b-5f569b3cbe11 cmd="npx tsc -b packages/skill-calorie" waitedMs=90046 exit=0 pid=41312 at=2026-09-15T02:49:20.755Z`
- `START ticket=272 runId=80f58d0c-53d5-4b8e-9e53-c0b3cb4c3a6d cmd="node .scratch/t272/run22.mjs" waitedMs=80008 pid=42672 at=2026-09-15T02:50:51.193Z`
- `RUN ticket=272 runId=80f58d0c-53d5-4b8e-9e53-c0b3cb4c3a6d cmd="node .scratch/t272/run22.mjs" waitedMs=80008 exit=0 pid=42672 at=2026-09-15T02:50:59.243Z`
- `START ticket=272 runId=9e6c1447-b0d2-41b0-bd18-9c7c9d60f032 cmd="node --test packages/skill-calorie/test/diet-homogeneity-108.test.mjs packages/skill-calorie/test/t511-清尾二.test.mjs" waitedMs=0 pid=46100 at=2026-09-15T02:51:11.500Z`
- `RUN ticket=272 runId=9e6c1447-b0d2-41b0-bd18-9c7c9d60f032 cmd="node --test packages/skill-calorie/test/diet-homogeneity-108.test.mjs packages/skill-calorie/test/t511-清尾二.test.mjs" waitedMs=0 exit=1 pid=46100 at=2026-09-15T02:51:40.281Z`
- `START ticket=272 runId=e997ceda-01d9-4e86-8552-3306aba019d3 cmd="git commit -m \"feat(272): 场景02 横向排行榜页 21 条照老实物 food_ranking.html 重做（五类榜一处定列序／前三金银铜章／营养结构三段条＋文字百分比／无数据榜不出折叠块／结论句＋页内导航＋口径行＋来源脚注／复制区双按钮＋日志第4段命令原文）\" -- packages/skill-calorie/src/diet/rankingDocs.ts packages/skill-calorie/src/diet/ranking.ts .changeset/t272-排行榜页.md" waitedMs=0 pid=38900 at=2026-09-15T02:52:20.960Z`
- `RUN ticket=272 runId=e997ceda-01d9-4e86-8552-3306aba019d3 cmd="git commit -m \"feat(272): 场景02 横向排行榜页 21 条照老实物 food_ranking.html 重做（五类榜一处定列序／前三金银铜章／营养结构三段条＋文字百分比／无数据榜不出折叠块／结论句＋页内导航＋口径行＋来源脚注／复制区双按钮＋日志第4段命令原文）\" -- packages/skill-calorie/src/diet/rankingDocs.ts packages/skill-calorie/src/diet/ranking.ts .changeset/t272-排行榜页.md" waitedMs=0 exit=0 pid=38900 at=2026-09-15T02:52:21.057Z`
- `START ticket=272 runId=b558a71e-2c12-48ca-84cc-e3163f0c865f cmd="git push" waitedMs=1 pid=43984 at=2026-09-15T02:52:25.735Z`
- `RUN ticket=272 runId=b558a71e-2c12-48ca-84cc-e3163f0c865f cmd="git push" waitedMs=1 exit=0 pid=43984 at=2026-09-15T02:52:28.673Z`
- `START ticket=272 runId=2874d258-9fd6-4211-b80c-130e4cec380d cmd="pwsh -NoProfile -File .scratch/t272/attribution.ps1" waitedMs=0 pid=47092 at=2026-09-15T02:52:44.418Z`
- `RUN ticket=272 runId=2874d258-9fd6-4211-b80c-130e4cec380d cmd="pwsh -NoProfile -File .scratch/t272/attribution.ps1" waitedMs=0 exit=0 pid=47092 at=2026-09-15T02:52:59.380Z`
- `START ticket=272 runId=e0da710c-d321-473d-beb9-2c660ad0e353 cmd="node --test packages/skill-calorie/test/t272-排行榜页.test.mjs" waitedMs=250052 pid=41820 at=2026-09-15T02:57:46.801Z`
- `RUN ticket=272 runId=e0da710c-d321-473d-beb9-2c660ad0e353 cmd="node --test packages/skill-calorie/test/t272-排行榜页.test.mjs" waitedMs=250052 exit=1 pid=41820 at=2026-09-15T02:58:05.476Z`
- `START ticket=272 runId=a8990048-8316-4adc-bf66-7c6884f72532 cmd="node --test packages/skill-calorie/test/t272-排行榜页.test.mjs" waitedMs=70075 pid=44044 at=2026-09-15T03:00:19.220Z`
- `RUN ticket=272 runId=a8990048-8316-4adc-bf66-7c6884f72532 cmd="node --test packages/skill-calorie/test/t272-排行榜页.test.mjs" waitedMs=70075 exit=1 pid=44044 at=2026-09-15T03:00:27.251Z`
- `START ticket=272 runId=f97c29d7-44ff-4049-946c-b423bfa22ea6 cmd="node --test packages/skill-calorie/test/t272-排行榜页.test.mjs" waitedMs=0 pid=18448 at=2026-09-15T03:01:28.396Z`
- `RUN ticket=272 runId=f97c29d7-44ff-4049-946c-b423bfa22ea6 cmd="node --test packages/skill-calorie/test/t272-排行榜页.test.mjs" waitedMs=0 exit=1 pid=18448 at=2026-09-15T03:01:36.213Z`
- `START ticket=272 runId=2a2dfb4c-008f-41c7-9ca4-aa42918e6c8c cmd="node --test packages/skill-calorie/test/t272-排行榜页.test.mjs" waitedMs=0 pid=41416 at=2026-09-15T03:02:12.714Z`
- `RUN ticket=272 runId=2a2dfb4c-008f-41c7-9ca4-aa42918e6c8c cmd="node --test packages/skill-calorie/test/t272-排行榜页.test.mjs" waitedMs=0 exit=1 pid=41416 at=2026-09-15T03:02:20.471Z`
- `START ticket=272 runId=08f13046-0567-4a9f-81d7-5acfa0b72ae0 cmd="node --test packages/skill-calorie/test/t272-排行榜页.test.mjs" waitedMs=10011 pid=29808 at=2026-09-15T03:02:49.697Z`
- `RUN ticket=272 runId=08f13046-0567-4a9f-81d7-5acfa0b72ae0 cmd="node --test packages/skill-calorie/test/t272-排行榜页.test.mjs" waitedMs=10011 exit=0 pid=29808 at=2026-09-15T03:02:57.484Z`
- `START ticket=272 runId=d4b13e57-9d5c-4c9a-95d3-e66fd06255b3 cmd="pwsh -NoProfile -File .scratch/t272/mutation.ps1" waitedMs=0 pid=37140 at=2026-09-15T03:03:16.904Z`
- `RUN ticket=272 runId=d4b13e57-9d5c-4c9a-95d3-e66fd06255b3 cmd="pwsh -NoProfile -File .scratch/t272/mutation.ps1" waitedMs=0 exit=0 pid=37140 at=2026-09-15T03:04:08.574Z`
- `START ticket=272 runId=bbc05d48-cffc-4cf9-b8ab-6ac98280b634 cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 pid=11072 at=2026-09-15T03:04:15.439Z`
- `RUN ticket=272 runId=bbc05d48-cffc-4cf9-b8ab-6ac98280b634 cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 exit=1 pid=11072 at=2026-09-15T03:06:58.028Z`
- `START ticket=272 runId=a84eccd8-1cf0-4ef8-b79e-ce683d8b62da cmd="npm run gen:check" waitedMs=170137 pid=25168 at=2026-09-15T03:07:20.145Z`
- `RUN ticket=272 runId=a84eccd8-1cf0-4ef8-b79e-ce683d8b62da cmd="npm run gen:check" waitedMs=170137 exit=1 pid=25168 at=2026-09-15T03:07:20.593Z`
- `START ticket=272 runId=9bce60c5-308b-4f3b-8734-1783aaf3566d cmd="pwsh -NoProfile -File .scratch/t272/attribution2.ps1" waitedMs=10003 pid=46924 at=2026-09-15T03:11:11.391Z`
- `RUN ticket=272 runId=9bce60c5-308b-4f3b-8734-1783aaf3566d cmd="pwsh -NoProfile -File .scratch/t272/attribution2.ps1" waitedMs=10003 exit=0 pid=46924 at=2026-09-15T03:11:19.605Z`
- `START ticket=272 runId=545aa94b-e123-4fa8-8406-e112abbe28d5 cmd="node --test packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/t445-告警线门.test.mjs packages/skill-calorie/test/t272-排行榜页.test.mjs packages/skill-calorie/test/diet-homogeneity-108.test.mjs packages/skill-calorie/test/t511-清尾二.test.mjs" waitedMs=0 pid=29948 at=2026-09-15T03:12:55.089Z`
- `RUN ticket=272 runId=545aa94b-e123-4fa8-8406-e112abbe28d5 cmd="node --test packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/t445-告警线门.test.mjs packages/skill-calorie/test/t272-排行榜页.test.mjs packages/skill-calorie/test/diet-homogeneity-108.test.mjs packages/skill-calorie/test/t511-清尾二.test.mjs" waitedMs=0 exit=0 pid=29948 at=2026-09-15T03:13:10.744Z`

## 机器可读形状（RUN 行）

```
GATE-RUN runId=64187e20-2736-47f7-9402-4946bb00dda4 cmd=npx tsc -b packages/skill-calorie waitedMs=0 exit=0 at=2026-09-15T02:38:05.970Z
GATE-RUN runId=dcd358b1-64cd-4254-a5d4-e843d22af8c2 cmd=node docs/skills/skill-calorie/t155-证据/复算-全量真跑.mjs waitedMs=0 exit=0 at=2026-09-15T02:38:35.939Z
GATE-RUN runId=ff489ea6-2aeb-4007-b2b1-e0ec41e8b3b8 cmd=node --test packages/skill-calorie/test/*.test.mjs waitedMs=0 exit=1 at=2026-09-15T02:40:56.645Z
GATE-RUN runId=090252dd-b539-44b8-ad2b-413d8a402f39 cmd=npx tsc -b packages/skill-calorie waitedMs=10002 exit=0 at=2026-09-15T02:45:01.405Z
GATE-RUN runId=bc093bda-d9b4-4415-9e04-61507a3962ba cmd=node docs/skills/skill-calorie/t155-证据/复算-全量真跑.mjs waitedMs=0 exit=0 at=2026-09-15T02:45:55.600Z
GATE-RUN runId=db9a8326-23d3-4c64-880b-5f569b3cbe11 cmd=npx tsc -b packages/skill-calorie waitedMs=90046 exit=0 at=2026-09-15T02:49:20.755Z
GATE-RUN runId=80f58d0c-53d5-4b8e-9e53-c0b3cb4c3a6d cmd=node .scratch/t272/run22.mjs waitedMs=80008 exit=0 at=2026-09-15T02:50:59.243Z
GATE-RUN runId=9e6c1447-b0d2-41b0-bd18-9c7c9d60f032 cmd=node --test packages/skill-calorie/test/diet-homogeneity-108.test.mjs packages/skill-calorie/test/t511-清尾二.test.mjs waitedMs=0 exit=1 at=2026-09-15T02:51:40.281Z
GATE-RUN runId=e997ceda-01d9-4e86-8552-3306aba019d3 cmd=git commit -m \"feat(272): 场景02 横向排行榜页 21 条照老实物 food_ranking.html 重做（五类榜一处定列序／前三金银铜章／营养结构三段条＋文字百分比／无数据榜不出折叠块／结论句＋页内导航＋口径行＋来源脚注／复制区双按钮＋日志第4段命令原文）\" -- packages/skill-calorie/src/diet/rankingDocs.ts packages/skill-calorie/src/diet/ranking.ts .changeset/t272-排行榜页.md waitedMs=0 exit=0 at=2026-09-15T02:52:21.057Z
GATE-RUN runId=b558a71e-2c12-48ca-84cc-e3163f0c865f cmd=git push waitedMs=1 exit=0 at=2026-09-15T02:52:28.673Z
GATE-RUN runId=2874d258-9fd6-4211-b80c-130e4cec380d cmd=pwsh -NoProfile -File .scratch/t272/attribution.ps1 waitedMs=0 exit=0 at=2026-09-15T02:52:59.380Z
GATE-RUN runId=e0da710c-d321-473d-beb9-2c660ad0e353 cmd=node --test packages/skill-calorie/test/t272-排行榜页.test.mjs waitedMs=250052 exit=1 at=2026-09-15T02:58:05.476Z
GATE-RUN runId=a8990048-8316-4adc-bf66-7c6884f72532 cmd=node --test packages/skill-calorie/test/t272-排行榜页.test.mjs waitedMs=70075 exit=1 at=2026-09-15T03:00:27.251Z
GATE-RUN runId=f97c29d7-44ff-4049-946c-b423bfa22ea6 cmd=node --test packages/skill-calorie/test/t272-排行榜页.test.mjs waitedMs=0 exit=1 at=2026-09-15T03:01:36.213Z
GATE-RUN runId=2a2dfb4c-008f-41c7-9ca4-aa42918e6c8c cmd=node --test packages/skill-calorie/test/t272-排行榜页.test.mjs waitedMs=0 exit=1 at=2026-09-15T03:02:20.471Z
GATE-RUN runId=08f13046-0567-4a9f-81d7-5acfa0b72ae0 cmd=node --test packages/skill-calorie/test/t272-排行榜页.test.mjs waitedMs=10011 exit=0 at=2026-09-15T03:02:57.484Z
GATE-RUN runId=d4b13e57-9d5c-4c9a-95d3-e66fd06255b3 cmd=pwsh -NoProfile -File .scratch/t272/mutation.ps1 waitedMs=0 exit=0 at=2026-09-15T03:04:08.574Z
GATE-RUN runId=bbc05d48-cffc-4cf9-b8ab-6ac98280b634 cmd=node --test packages/skill-calorie/test/*.test.mjs waitedMs=0 exit=1 at=2026-09-15T03:06:58.028Z
GATE-RUN runId=a84eccd8-1cf0-4ef8-b79e-ce683d8b62da cmd=npm run gen:check waitedMs=170137 exit=1 at=2026-09-15T03:07:20.593Z
GATE-RUN runId=9bce60c5-308b-4f3b-8734-1783aaf3566d cmd=pwsh -NoProfile -File .scratch/t272/attribution2.ps1 waitedMs=10003 exit=0 at=2026-09-15T03:11:19.605Z
GATE-RUN runId=545aa94b-e123-4fa8-8406-e112abbe28d5 cmd=node --test packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/t445-告警线门.test.mjs packages/skill-calorie/test/t272-排行榜页.test.mjs packages/skill-calorie/test/diet-homogeneity-108.test.mjs packages/skill-calorie/test/t511-清尾二.test.mjs waitedMs=0 exit=0 at=2026-09-15T03:13:10.744Z
```