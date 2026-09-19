# t725 · 运行条目导出（协议 §2.3.4）

源＝`.scratch/locks/gate-runs.log`（未受版本控制，释放即删的持锁者记录不在其中）里 `ticket=725` 的全部条目，**逐字抄录**。
证据件里声称跑过的每次运行，都在下表里能找到一对一对应条目（对账口径见 `docs/subagent-concurrency-protocol.md` §2.4）。

```text
START ticket=725 runId=5ca650a4-cec7-4496-848e-03f61c2e43af cmd="node packages/skill-bill/scripts/gen-page-fingerprints.mjs --check" waitedMs=0 pid=10368 at=2026-09-19T07:52:22.213Z
RUN ticket=725 runId=5ca650a4-cec7-4496-848e-03f61c2e43af cmd="node packages/skill-bill/scripts/gen-page-fingerprints.mjs --check" waitedMs=0 exit=2 pid=10368 at=2026-09-19T07:52:22.403Z
START ticket=725 runId=db59d560-b552-4b82-99fe-2e8ea2c96984 cmd="node packages/skill-calorie/test/t380-真出口.mjs --all" waitedMs=0 pid=5636 at=2026-09-19T07:52:22.459Z
RUN ticket=725 runId=db59d560-b552-4b82-99fe-2e8ea2c96984 cmd="node packages/skill-calorie/test/t380-真出口.mjs --all" waitedMs=0 exit=1 pid=5636 at=2026-09-19T07:53:17.453Z
START ticket=725 runId=f10dabd5-c57d-49dd-99a9-adabede80c03 cmd="node node_modules/typescript/bin/tsc -b packages/base-render packages/skill-calorie" waitedMs=20003 pid=35592 at=2026-09-19T07:57:47.461Z
RUN ticket=725 runId=f10dabd5-c57d-49dd-99a9-adabede80c03 cmd="node node_modules/typescript/bin/tsc -b packages/base-render packages/skill-calorie" waitedMs=20003 exit=0 pid=35592 at=2026-09-19T07:57:49.738Z
START ticket=725 runId=249cb24d-aa6f-4051-aab8-85c95db13729 cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=1 pid=36476 at=2026-09-19T07:59:33.448Z
RUN ticket=725 runId=249cb24d-aa6f-4051-aab8-85c95db13729 cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=1 exit=1 pid=36476 at=2026-09-19T07:59:33.612Z
START ticket=725 runId=e49c4f8f-93fa-45b6-88c5-c5701786ae88 cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=0 pid=14212 at=2026-09-19T07:59:57.406Z
RUN ticket=725 runId=e49c4f8f-93fa-45b6-88c5-c5701786ae88 cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=0 exit=0 pid=14212 at=2026-09-19T07:59:57.568Z
START ticket=725 runId=dc44361a-08d2-431b-a5f1-5c0d2307f6b5 cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 pid=37512 at=2026-09-19T08:00:10.337Z
RUN ticket=725 runId=dc44361a-08d2-431b-a5f1-5c0d2307f6b5 cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 exit=1 pid=37512 at=2026-09-19T08:02:18.420Z
START ticket=725 runId=9ce3e340-ec41-4293-b50d-9d70acd22dd9 cmd="node --test packages/base-render/test/*.test.mjs" waitedMs=1 pid=36852 at=2026-09-19T08:02:18.479Z
RUN ticket=725 runId=9ce3e340-ec41-4293-b50d-9d70acd22dd9 cmd="node --test packages/base-render/test/*.test.mjs" waitedMs=1 exit=1 pid=36852 at=2026-09-19T08:02:25.785Z
START ticket=725 runId=35114ce3-8e11-4a90-922a-4032b67ee943 cmd="node packages/skill-calorie/test/t380-真出口.mjs --all" waitedMs=1 pid=13036 at=2026-09-19T08:02:25.843Z
RUN ticket=725 runId=35114ce3-8e11-4a90-922a-4032b67ee943 cmd="node packages/skill-calorie/test/t380-真出口.mjs --all" waitedMs=1 exit=1 pid=13036 at=2026-09-19T08:03:18.807Z
START ticket=725 runId=400b027e-bbad-4238-b82c-a6b8d6655766 cmd="node node_modules/typescript/bin/tsc -b packages/base-render packages/skill-calorie" waitedMs=0 pid=38548 at=2026-09-19T08:05:40.960Z
RUN ticket=725 runId=400b027e-bbad-4238-b82c-a6b8d6655766 cmd="node node_modules/typescript/bin/tsc -b packages/base-render packages/skill-calorie" waitedMs=0 exit=0 pid=38548 at=2026-09-19T08:05:43.184Z
START ticket=725 runId=5b3745ae-0cd7-4836-bd79-087cf6a79eee cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 pid=14452 at=2026-09-19T08:05:43.237Z
RUN ticket=725 runId=5b3745ae-0cd7-4836-bd79-087cf6a79eee cmd="node --test packages/skill-calorie/test/*.test.mjs" waitedMs=0 exit=1 pid=14452 at=2026-09-19T08:07:57.547Z
START ticket=725 runId=babb2996-7e47-4c5d-aa73-5fda89c02d4d cmd="node node_modules/typescript/bin/tsc -b packages/base-render packages/skill-calorie" waitedMs=0 pid=31988 at=2026-09-19T08:07:57.606Z
RUN ticket=725 runId=babb2996-7e47-4c5d-aa73-5fda89c02d4d cmd="node node_modules/typescript/bin/tsc -b packages/base-render packages/skill-calorie" waitedMs=0 exit=0 pid=31988 at=2026-09-19T08:07:57.717Z
START ticket=725 runId=8bd995c9-bce3-40c6-b615-71d78eb5d56c cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=20004 pid=42076 at=2026-09-19T08:08:49.455Z
RUN ticket=725 runId=8bd995c9-bce3-40c6-b615-71d78eb5d56c cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=20004 exit=0 pid=42076 at=2026-09-19T08:08:50.012Z
START ticket=725 runId=5aac320e-5dd5-465b-a2cd-e681059d9846 cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=0 pid=42532 at=2026-09-19T08:08:50.078Z
RUN ticket=725 runId=5aac320e-5dd5-465b-a2cd-e681059d9846 cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=0 exit=1 pid=42532 at=2026-09-19T08:08:50.243Z
START ticket=725 runId=5f76e9f2-f9b7-4b63-a265-2624d0a35506 cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=0 pid=42896 at=2026-09-19T08:08:50.369Z
RUN ticket=725 runId=5f76e9f2-f9b7-4b63-a265-2624d0a35506 cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=0 exit=0 pid=42896 at=2026-09-19T08:08:50.476Z
START ticket=725 runId=8b489c82-f0ac-4961-98cd-4a7ebec73419 cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=1 pid=42476 at=2026-09-19T08:08:50.536Z
RUN ticket=725 runId=8b489c82-f0ac-4961-98cd-4a7ebec73419 cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=1 exit=1 pid=42476 at=2026-09-19T08:08:50.709Z
START ticket=725 runId=48bf9754-8661-41da-8b79-119bfa0b3024 cmd="node node_modules/typescript/bin/tsc -b packages/base-render packages/skill-calorie --force" waitedMs=0 pid=42944 at=2026-09-19T08:09:06.877Z
RUN ticket=725 runId=48bf9754-8661-41da-8b79-119bfa0b3024 cmd="node node_modules/typescript/bin/tsc -b packages/base-render packages/skill-calorie --force" waitedMs=0 exit=0 pid=42944 at=2026-09-19T08:09:12.429Z
START ticket=725 runId=e67bf6a4-d606-43a3-bc7d-2c744d1677b2 cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=0 pid=39388 at=2026-09-19T08:09:12.500Z
RUN ticket=725 runId=e67bf6a4-d606-43a3-bc7d-2c744d1677b2 cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=0 exit=0 pid=39388 at=2026-09-19T08:09:12.661Z
START ticket=725 runId=fa6befb3-9441-4c84-9551-e3563e96dc33 cmd="node node_modules/typescript/bin/tsc -b packages/base-render --force" waitedMs=1 pid=42696 at=2026-09-19T08:09:38.238Z
RUN ticket=725 runId=fa6befb3-9441-4c84-9551-e3563e96dc33 cmd="node node_modules/typescript/bin/tsc -b packages/base-render --force" waitedMs=1 exit=0 pid=42696 at=2026-09-19T08:09:39.452Z
START ticket=725 runId=f1ce5900-1ba4-449b-b79d-306f232d340d cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=1 pid=40588 at=2026-09-19T08:09:39.511Z
RUN ticket=725 runId=f1ce5900-1ba4-449b-b79d-306f232d340d cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=1 exit=1 pid=40588 at=2026-09-19T08:09:39.672Z
START ticket=725 runId=6e293a30-82b8-4026-aec8-54d26a685a71 cmd="node node_modules/typescript/bin/tsc -b packages/base-render --force" waitedMs=0 pid=42620 at=2026-09-19T08:09:39.790Z
RUN ticket=725 runId=6e293a30-82b8-4026-aec8-54d26a685a71 cmd="node node_modules/typescript/bin/tsc -b packages/base-render --force" waitedMs=0 exit=0 pid=42620 at=2026-09-19T08:09:40.988Z
START ticket=725 runId=f85b9581-c58d-4622-8817-e832a9648682 cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=1 pid=42680 at=2026-09-19T08:09:41.044Z
RUN ticket=725 runId=f85b9581-c58d-4622-8817-e832a9648682 cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=1 exit=1 pid=42680 at=2026-09-19T08:09:41.203Z
START ticket=725 runId=b74012c9-d436-4048-8655-6e7712f85e4d cmd="node node_modules/typescript/bin/tsc -b packages/base-render --force" waitedMs=0 pid=3444 at=2026-09-19T08:10:00.431Z
RUN ticket=725 runId=b74012c9-d436-4048-8655-6e7712f85e4d cmd="node node_modules/typescript/bin/tsc -b packages/base-render --force" waitedMs=0 exit=0 pid=3444 at=2026-09-19T08:10:01.670Z
START ticket=725 runId=d46cf84d-7670-4b1f-99c7-25179757a18e cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=1 pid=42840 at=2026-09-19T08:10:01.733Z
RUN ticket=725 runId=d46cf84d-7670-4b1f-99c7-25179757a18e cmd="node --test packages/base-render/test/doc-shell-725.test.mjs" waitedMs=1 exit=0 pid=42840 at=2026-09-19T08:10:01.897Z
START ticket=725 runId=48b9784e-5afa-42aa-b0a2-071d58fcc47d cmd="node packages/skill-calorie/scripts/check-one-path.mjs" waitedMs=0 pid=40488 at=2026-09-19T08:10:15.558Z
RUN ticket=725 runId=48b9784e-5afa-42aa-b0a2-071d58fcc47d cmd="node packages/skill-calorie/scripts/check-one-path.mjs" waitedMs=0 exit=0 pid=40488 at=2026-09-19T08:10:15.806Z
START ticket=725 runId=5f73f28a-a7a4-40fc-9a61-ce46b6949390 cmd="node packages/skill-calorie/scripts/check-page-assert.mjs" waitedMs=1 pid=35472 at=2026-09-19T08:10:15.871Z
RUN ticket=725 runId=5f73f28a-a7a4-40fc-9a61-ce46b6949390 cmd="node packages/skill-calorie/scripts/check-page-assert.mjs" waitedMs=1 exit=0 pid=35472 at=2026-09-19T08:10:15.952Z
START ticket=725 runId=61988bab-1587-4cd6-b180-f0afa045a61c cmd="node packages/skill-calorie/scripts/check-warning-line.mjs" waitedMs=0 pid=42132 at=2026-09-19T08:10:16.010Z
RUN ticket=725 runId=61988bab-1587-4cd6-b180-f0afa045a61c cmd="node packages/skill-calorie/scripts/check-warning-line.mjs" waitedMs=0 exit=0 pid=42132 at=2026-09-19T08:10:16.123Z
START ticket=725 runId=598f4690-5fc9-4e9e-adec-a7bdb99b1c7e cmd="node --test packages/base-render/test/*.test.mjs" waitedMs=0 pid=35596 at=2026-09-19T08:10:16.180Z
RUN ticket=725 runId=598f4690-5fc9-4e9e-adec-a7bdb99b1c7e cmd="node --test packages/base-render/test/*.test.mjs" waitedMs=0 exit=1 pid=35596 at=2026-09-19T08:10:23.485Z
```
