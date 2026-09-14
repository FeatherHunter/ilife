# T351 v3 · 加锁运行记录导出件（协议 §2.3 第 4 条／§2.4）

源：`.scratch/locks/gate-runs.log`（未受版本控制，第三方无法复核）。本件把**本票在本执行者窗口内**的运行条目导出到受版本控制的归属件路径，可当对账源直接复核。

窗口：`2026-09-14T10:19Z ~ 11:03Z`（本地 18:19 ~ 19:03）。留痕由加锁包装器 `tooling/run-locked.mjs` 落盘；本执行者未手工写过 `gate-runs.log` 与 `owner.json`。

窗口内 `ticket=351` 的条目里，**5 条不是本执行者跑的**：`t351-ux` 那串 `git add docs/skills/skill-calorie/t351-recon-20260914.md`／`git commit -F .scratch/t351-ux/commit-msg*.txt`／`node .scratch/t351-ux/fix-commit.mjs`／`git push`（10:22:23~10:23:04 与 10:31:31~10:31:33）——那是编排者自己的收口窗口，本执行者不声明、不顶替。其余条目与 `t351-v3-rerun-evidence.md` 的 `GATE-RUN` 声明一一对应。

```text
START ticket=351 runId=a99e3f9c-4017-478f-8584-88c2ddc31ce6 cmd="pnpm test:types" waitedMs=0 pid=23760 at=2026-09-14T10:19:31.771Z
RUN ticket=351 runId=a99e3f9c-4017-478f-8584-88c2ddc31ce6 cmd="pnpm test:types" waitedMs=0 exit=0 pid=23760 at=2026-09-14T10:19:33.556Z
START ticket=351 runId=51a35b8a-b6e5-4710-9ab2-ae7405731839 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs" waitedMs=1 pid=41752 at=2026-09-14T10:19:47.406Z
RUN ticket=351 runId=51a35b8a-b6e5-4710-9ab2-ae7405731839 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs" waitedMs=1 exit=1 pid=41752 at=2026-09-14T10:19:51.788Z
START ticket=351 runId=6388e163-d7f1-4ba1-9ac0-016a315192e2 cmd="git add docs/skills/skill-calorie/t351-recon-20260914.md" waitedMs=0 pid=45124 at=2026-09-14T10:22:23.863Z
RUN ticket=351 runId=6388e163-d7f1-4ba1-9ac0-016a315192e2 cmd="git add docs/skills/skill-calorie/t351-recon-20260914.md" waitedMs=0 exit=0 pid=45124 at=2026-09-14T10:22:23.910Z
START ticket=351 runId=8a28830a-1187-4a29-be9c-5584865d919f cmd="git commit -F .scratch/t351-ux/commit-msg.txt" waitedMs=0 pid=50648 at=2026-09-14T10:22:24.018Z
RUN ticket=351 runId=8a28830a-1187-4a29-be9c-5584865d919f cmd="git commit -F .scratch/t351-ux/commit-msg.txt" waitedMs=0 exit=0 pid=50648 at=2026-09-14T10:22:24.086Z
START ticket=351 runId=94aa1099-999e-4f60-a36b-2a0e9240d0c3 cmd="pnpm test:types" waitedMs=1 pid=10356 at=2026-09-14T10:22:27.408Z
RUN ticket=351 runId=94aa1099-999e-4f60-a36b-2a0e9240d0c3 cmd="pnpm test:types" waitedMs=1 exit=0 pid=10356 at=2026-09-14T10:22:29.199Z
START ticket=351 runId=2469ce0e-777d-419d-85d5-ad5cac1bc084 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs" waitedMs=0 pid=24108 at=2026-09-14T10:22:33.230Z
RUN ticket=351 runId=2469ce0e-777d-419d-85d5-ad5cac1bc084 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs" waitedMs=0 exit=0 pid=24108 at=2026-09-14T10:22:37.593Z
START ticket=351 runId=7fa48322-ca1d-428e-b7b0-9bae579998e8 cmd="node .scratch/t351-ux/fix-commit.mjs" waitedMs=0 pid=27476 at=2026-09-14T10:22:54.555Z
RUN ticket=351 runId=7fa48322-ca1d-428e-b7b0-9bae579998e8 cmd="node .scratch/t351-ux/fix-commit.mjs" waitedMs=0 exit=0 pid=27476 at=2026-09-14T10:22:54.952Z
START ticket=351 runId=e75e2c23-ccca-4e47-940a-b279af9fab71 cmd="git push" waitedMs=0 pid=49788 at=2026-09-14T10:23:02.068Z
RUN ticket=351 runId=e75e2c23-ccca-4e47-940a-b279af9fab71 cmd="git push" waitedMs=0 exit=0 pid=49788 at=2026-09-14T10:23:04.279Z
START ticket=351 runId=fd17ee60-4d54-4e7b-94ef-8984699731fb cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=0 pid=47224 at=2026-09-14T10:23:47.979Z
RUN ticket=351 runId=fd17ee60-4d54-4e7b-94ef-8984699731fb cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=0 exit=1 pid=47224 at=2026-09-14T10:23:57.660Z
START ticket=351 runId=fafe96d8-1216-4f70-be01-daacbfd9d9c0 cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=1 pid=41952 at=2026-09-14T10:24:28.562Z
RUN ticket=351 runId=fafe96d8-1216-4f70-be01-daacbfd9d9c0 cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=1 exit=0 pid=41952 at=2026-09-14T10:24:38.339Z
START ticket=351 runId=d2915361-0ba0-44aa-b5b4-653eb47f077d cmd="node .scratch/t351-fix/final-v3/run-realdata-v3.mjs" waitedMs=0 pid=50292 at=2026-09-14T10:24:59.786Z
RUN ticket=351 runId=d2915361-0ba0-44aa-b5b4-653eb47f077d cmd="node .scratch/t351-fix/final-v3/run-realdata-v3.mjs" waitedMs=0 exit=0 pid=50292 at=2026-09-14T10:25:00.149Z
START ticket=351 runId=04c54b1f-4337-46e2-89b1-9a7d346dec7b cmd="pnpm test:types" waitedMs=30003 pid=44040 at=2026-09-14T10:27:27.179Z
RUN ticket=351 runId=04c54b1f-4337-46e2-89b1-9a7d346dec7b cmd="pnpm test:types" waitedMs=30003 exit=0 pid=44040 at=2026-09-14T10:27:28.437Z
START ticket=351 runId=3fd00dcf-ff52-416a-92ad-91b153efc85e cmd="pnpm test:types" waitedMs=0 pid=23440 at=2026-09-14T10:28:53.773Z
RUN ticket=351 runId=3fd00dcf-ff52-416a-92ad-91b153efc85e cmd="pnpm test:types" waitedMs=0 exit=0 pid=23440 at=2026-09-14T10:28:55.034Z
START ticket=351 runId=260b9714-f63e-488c-8b7d-6aedfcd00abf cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs" waitedMs=0 pid=53076 at=2026-09-14T10:28:59.113Z
RUN ticket=351 runId=260b9714-f63e-488c-8b7d-6aedfcd00abf cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs" waitedMs=0 exit=0 pid=53076 at=2026-09-14T10:29:03.204Z
START ticket=351 runId=dbbcece7-6e58-4f5e-ad33-5db912abe631 cmd="node --test packages/skill-calorie/test/render-t41.test.mjs" waitedMs=40001 pid=49600 at=2026-09-14T10:29:49.617Z
RUN ticket=351 runId=dbbcece7-6e58-4f5e-ad33-5db912abe631 cmd="node --test packages/skill-calorie/test/render-t41.test.mjs" waitedMs=40001 exit=1 pid=49600 at=2026-09-14T10:29:50.967Z
START ticket=351 runId=2bf06549-0808-46ff-8d6a-0e08bb5c0857 cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=70004 pid=19560 at=2026-09-14T10:31:21.229Z
RUN ticket=351 runId=2bf06549-0808-46ff-8d6a-0e08bb5c0857 cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=70004 exit=0 pid=19560 at=2026-09-14T10:31:30.828Z
START ticket=351 runId=f8011d73-22c5-4858-94cf-3a6e67e9a07f cmd="git add docs/skills/skill-calorie/t351-recon-20260914.md" waitedMs=20002 pid=44664 at=2026-09-14T10:31:31.316Z
RUN ticket=351 runId=f8011d73-22c5-4858-94cf-3a6e67e9a07f cmd="git add docs/skills/skill-calorie/t351-recon-20260914.md" waitedMs=20002 exit=0 pid=44664 at=2026-09-14T10:31:31.362Z
START ticket=351 runId=2be8de1f-7394-4707-8676-3a1650d3d160 cmd="git commit -F .scratch/t351-ux/commit-msg2.txt -- docs/skills/skill-calorie/t351-recon-20260914.md" waitedMs=0 pid=30232 at=2026-09-14T10:31:31.467Z
RUN ticket=351 runId=2be8de1f-7394-4707-8676-3a1650d3d160 cmd="git commit -F .scratch/t351-ux/commit-msg2.txt -- docs/skills/skill-calorie/t351-recon-20260914.md" waitedMs=0 exit=0 pid=30232 at=2026-09-14T10:31:31.539Z
START ticket=351 runId=b1198079-94aa-4f3b-8d38-ce93ace053b2 cmd="git push" waitedMs=0 pid=43052 at=2026-09-14T10:31:31.612Z
RUN ticket=351 runId=b1198079-94aa-4f3b-8d38-ce93ace053b2 cmd="git push" waitedMs=0 exit=0 pid=43052 at=2026-09-14T10:31:33.957Z
START ticket=351 runId=a57f096b-7e57-4b76-8bf2-a00c183811bb cmd="pnpm test:types" waitedMs=1 pid=40404 at=2026-09-14T10:34:40.839Z
RUN ticket=351 runId=a57f096b-7e57-4b76-8bf2-a00c183811bb cmd="pnpm test:types" waitedMs=1 exit=2 pid=40404 at=2026-09-14T10:34:42.847Z
START ticket=351 runId=581fdfb1-ad33-4054-a30c-dc3590840a6e cmd="pnpm test:types" waitedMs=0 pid=15804 at=2026-09-14T10:34:59.700Z
RUN ticket=351 runId=581fdfb1-ad33-4054-a30c-dc3590840a6e cmd="pnpm test:types" waitedMs=0 exit=2 pid=15804 at=2026-09-14T10:35:01.551Z
START ticket=351 runId=fb6167e7-c0ce-4151-a51b-591b2c8fcbc6 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs" waitedMs=20004 pid=52600 at=2026-09-14T10:35:54.808Z
RUN ticket=351 runId=fb6167e7-c0ce-4151-a51b-591b2c8fcbc6 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs" waitedMs=20004 exit=0 pid=52600 at=2026-09-14T10:35:59.332Z
START ticket=351 runId=5507b092-b211-4b60-9f8a-a34155133ea1 cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=40005 pid=32416 at=2026-09-14T10:36:45.437Z
RUN ticket=351 runId=5507b092-b211-4b60-9f8a-a34155133ea1 cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=40005 exit=0 pid=32416 at=2026-09-14T10:36:55.964Z
START ticket=351 runId=abd4afbc-5084-4fca-93f0-116ef6e6da24 cmd="node .scratch/t351-fix/final-v3/run-realdata-v3.mjs" waitedMs=1 pid=40468 at=2026-09-14T10:37:07.645Z
RUN ticket=351 runId=abd4afbc-5084-4fca-93f0-116ef6e6da24 cmd="node .scratch/t351-fix/final-v3/run-realdata-v3.mjs" waitedMs=1 exit=0 pid=40468 at=2026-09-14T10:37:08.022Z
START ticket=351 runId=f5beb382-e050-4c95-920a-f3deb2c2524f cmd="pnpm test:types" waitedMs=0 pid=46944 at=2026-09-14T10:37:37.173Z
RUN ticket=351 runId=f5beb382-e050-4c95-920a-f3deb2c2524f cmd="pnpm test:types" waitedMs=0 exit=2 pid=46944 at=2026-09-14T10:37:39.172Z
START ticket=351 runId=a56a8be2-756e-4d4a-8ed4-799f1db44464 cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=140015 pid=35748 at=2026-09-14T10:40:18.974Z
RUN ticket=351 runId=a56a8be2-756e-4d4a-8ed4-799f1db44464 cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=140015 exit=1 pid=35748 at=2026-09-14T10:40:29.064Z
START ticket=351 runId=a2a72d31-c91b-4e0c-91a3-e2a2d9650299 cmd="node --test test/scene05-write-mutate.test.mjs" waitedMs=50006 pid=14392 at=2026-09-14T10:41:35.064Z
RUN ticket=351 runId=a2a72d31-c91b-4e0c-91a3-e2a2d9650299 cmd="node --test test/scene05-write-mutate.test.mjs" waitedMs=50006 exit=1 pid=14392 at=2026-09-14T10:41:39.602Z
START ticket=351 runId=2c8b6299-5407-49ea-8583-9973dcc5486a cmd="pnpm test:types" waitedMs=130012 pid=48436 at=2026-09-14T10:46:51.885Z
RUN ticket=351 runId=2c8b6299-5407-49ea-8583-9973dcc5486a cmd="pnpm test:types" waitedMs=130012 exit=0 pid=48436 at=2026-09-14T10:46:53.484Z
START ticket=351 runId=72ecd023-6a20-4621-8ed9-4a67397edd89 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs" waitedMs=0 pid=50380 at=2026-09-14T10:46:58.877Z
RUN ticket=351 runId=72ecd023-6a20-4621-8ed9-4a67397edd89 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs" waitedMs=0 exit=0 pid=50380 at=2026-09-14T10:47:03.568Z
START ticket=351 runId=071f032e-afb5-4731-b33b-22723d2e628a cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=10001 pid=16132 at=2026-09-14T10:47:19.999Z
RUN ticket=351 runId=071f032e-afb5-4731-b33b-22723d2e628a cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=10001 exit=0 pid=16132 at=2026-09-14T10:47:30.464Z
START ticket=351 runId=bb5ccee0-eadd-476f-b991-4686f97b1122 cmd="node .scratch/t351-fix/final-v3/run-realdata-v3.mjs" waitedMs=210010 pid=42316 at=2026-09-14T10:52:23.101Z
RUN ticket=351 runId=bb5ccee0-eadd-476f-b991-4686f97b1122 cmd="node .scratch/t351-fix/final-v3/run-realdata-v3.mjs" waitedMs=210010 exit=1 pid=42316 at=2026-09-14T10:52:23.353Z
START ticket=351 runId=eb9f984c-4512-4cb7-9b7a-ade15b185005 cmd="pnpm test:types" waitedMs=20002 pid=47688 at=2026-09-14T10:53:02.094Z
RUN ticket=351 runId=eb9f984c-4512-4cb7-9b7a-ade15b185005 cmd="pnpm test:types" waitedMs=20002 exit=2 pid=47688 at=2026-09-14T10:53:03.987Z
START ticket=351 runId=87349328-63e5-41ea-84c4-e784ff5cb7b1 cmd="pnpm test:types" waitedMs=1 pid=26984 at=2026-09-14T10:53:31.501Z
RUN ticket=351 runId=87349328-63e5-41ea-84c4-e784ff5cb7b1 cmd="pnpm test:types" waitedMs=1 exit=0 pid=26984 at=2026-09-14T10:53:32.771Z
START ticket=351 runId=bb851e01-3a9a-4711-a43d-4dcfd1581fb3 cmd="node .scratch/t351-fix/final-v3/run-realdata-v3.mjs" waitedMs=270016 pid=47900 at=2026-09-14T10:58:08.217Z
RUN ticket=351 runId=bb851e01-3a9a-4711-a43d-4dcfd1581fb3 cmd="node .scratch/t351-fix/final-v3/run-realdata-v3.mjs" waitedMs=270016 exit=0 pid=47900 at=2026-09-14T10:58:08.555Z
START ticket=351 runId=60919dff-55ec-4916-9413-068b0c5bc336 cmd="pnpm test:types" waitedMs=10000 pid=7400 at=2026-09-14T10:58:56.778Z
RUN ticket=351 runId=60919dff-55ec-4916-9413-068b0c5bc336 cmd="pnpm test:types" waitedMs=10000 exit=0 pid=7400 at=2026-09-14T10:58:58.468Z
START ticket=351 runId=0ca51742-448b-4420-953f-cdbfcf425d3c cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=30002 pid=46060 at=2026-09-14T10:59:35.595Z
RUN ticket=351 runId=0ca51742-448b-4420-953f-cdbfcf425d3c cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=30002 exit=1 pid=46060 at=2026-09-14T10:59:45.830Z
START ticket=351 runId=2dfec408-a367-4604-9dd2-b55b984082c9 cmd="pnpm test:types" waitedMs=0 pid=28196 at=2026-09-14T11:00:25.790Z
RUN ticket=351 runId=2dfec408-a367-4604-9dd2-b55b984082c9 cmd="pnpm test:types" waitedMs=0 exit=0 pid=28196 at=2026-09-14T11:00:27.107Z
START ticket=351 runId=d173c134-8234-471c-a2f7-b75c4a8b7bdb cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=70003 pid=9128 at=2026-09-14T11:01:42.003Z
RUN ticket=351 runId=d173c134-8234-471c-a2f7-b75c4a8b7bdb cmd="node .scratch/t351-fix/final-v3/run-176-207-v3.mjs" waitedMs=70003 exit=0 pid=9128 at=2026-09-14T11:01:52.229Z
START ticket=351 runId=5e6d8f2d-1c80-42ce-9284-02d68acd7767 cmd="node .scratch/t351-fix/final-v3/run-realdata-v3.mjs" waitedMs=40003 pid=30852 at=2026-09-14T11:02:43.140Z
RUN ticket=351 runId=5e6d8f2d-1c80-42ce-9284-02d68acd7767 cmd="node .scratch/t351-fix/final-v3/run-realdata-v3.mjs" waitedMs=40003 exit=0 pid=30852 at=2026-09-14T11:02:43.496Z
```
