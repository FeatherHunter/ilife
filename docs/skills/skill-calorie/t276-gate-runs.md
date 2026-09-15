# t276 门禁运行记录（导出件，对账源）

> 导出源：`.scratch/locks/gate-runs.log`（未受版本控制，第三方无法复核）→ 本件按协议 §2.3 第 4 条导出到归属件路径。
> 取法：`Select-String -Path .scratch/locks/gate-runs.log -Pattern "ticket=276"`（逐字抄录，未改写）。
> 口径：`GATE-RUN` 的声明逐条对上这里的 `RUN … runId=` 条目；**只有 exit=0 的条目**才当门禁证据引用（§2.4 第 3③④ 条）。
> 时间戳为 UTC（`at=` 字段）。

## 一、本次窗口（二阶段收尾，新席；UTC 05:45—06:10）

| # | 运行标识 | 命令 | exit | 等待 | 用途 |
|---|---|---|---|---|---|
| 1 | `1a0ce15e-ac98-468d-9cc6-58738001483b` | `node .scratch/t276/run-targeted.mjs base …`（4 个测试文件） | 1 | 0ms | **动前基线**：两处欠账各 1 红，另两文件已在红（他线） |
| 2 | `af6c1eb4-fe88-4fb0-a49b-7cffbb91fc9e` | `cmd /c .scratch\t276\gate-p2.cmd` | 0 | 10001ms | **作废**：批处理在 LF 行尾下被 cmd 解析错（`'ts' is not recognized`），只跑完第一道 build；未采信，重开窗 |
| 3 | `ef6209b8-9fb0-4ba3-8f98-f9d728a2274f` | `node .scratch/t276/gate-p2.mjs` | 0 | 10001ms | 落点窗口：`pnpm build` → `pnpm gen` → `pnpm build` → `pnpm help:build` 四步全 exit 0 |
| 4 | `3641e1ae-ee77-46df-aebb-1875b8c5bd20` | `node .scratch/t276/run-targeted.mjs after …`（同 4 个文件） | 1 | 1ms | **动后**：本票两文件转绿（20/20、55/55）；另两文件仍红（他线基线，红用例名不变） |
| 5 | `fa86d6f7-f316-418d-9e4c-fe019aa4b482` | `node .scratch/t276/real-db-import.mjs` | 0 | 90024ms | 真库实跑 `calorie.product.import`：新增 1 行、库内回读一致 |
| 6 | `e4adcfa6-a432-436c-9049-2bde50e71207` | `node .scratch/t276/mutate-and-verify.mjs` | 1 | 0ms | **作废**：变异脚本自身的 sha 比较写错（把改坏后的值当改前值），三条「还原一致」误报；脚本修好后重跑 |
| 7 | `515264d6-fd87-468f-a64b-7bdf4cb0de18` | `node .scratch/t276/mutate-and-verify.mjs` | 0 | 20002ms | 变异自证三轮（改坏必红／还原必绿／sha 一致）＋ `pnpm gen` ＋ `pnpm gen:check` PASS |
| 8 | `3541c59e-a67c-47f7-bca2-05e0740a4467` | `node .scratch/t276/run-full.mjs` | 0 | 90012ms | 全量测试读数（**说明**：本脚本按设计只报读数不传播退出码，故记账为 0；`pnpm test` 自身 exit=1，读数 tests 1616／pass 1588／fail 28，逐条归因见证据件 §5.6） |
| 9 | `c16743c7-b9f0-4b77-a20c-0b315f4c74cc` | `node .scratch/t276/commit-p2.mjs` | 1 | 10001ms | **未提交**：守卫「看共用索引」被他席暂存件触发假阳性；**未动他人索引**，脚本改为「看这一笔实际提交了什么」后重开窗 |
| 10 | `9eefc93e-2bec-44a9-97c0-f85fd2770fe9` | `node .scratch/t276/commit-p2.mjs` | 0 | 110010ms | **提交并推送成功**：`bf274e6`（`b646d6f..bf274e6 master -> master`），入账恰 7 件，经 `git show --name-only bf274e6` 复核 |
| 11 | `1ed12204-9d1b-4353-80c3-8c09690ec40d` | `node .scratch/t276/commit-p2b.mjs` | 0 | 50004ms | 第二笔：证据件回填（`3e33048`，`bf274e6..3e33048 master -> master`），入账 2 件 |

## 二、一阶段（前席窗口，UTC 04:03—05:06；已在其证据件 §三 报告）

| 运行标识 | 命令 | exit |
|---|---|---|
| `d9610630-9c10-4e5e-ad64-164071439d52` | `pnpm build` | 2（他线 weight 五件报错，阻塞） |
| `fe2c66e1-ae87-4e43-9d90-3f0912050cd7` | `pnpm build` | 0 |
| `12cce146-9637-4add-8ca8-c011f903b53d` | `pnpm gen` | 0 |
| `da8c1155-2567-4989-b333-2b74d5a7cb57` | `pnpm build` | 2（同上，阻塞） |
| `90869e44-3f0d-4d5c-844b-baaa4671c67b` | `pwsh -NoProfile -File .scratch/t276/commit-locked.ps1` | 0 |
| `0bd79b58-f6b6-43fa-86bf-4ed8fecc06e6` | `pwsh -NoProfile -File .scratch/t276/commit-locked.ps1` | 0 |
| `fcd2822e-2f93-42ee-a861-4bd6e140a46e` | `pwsh -NoProfile -File .scratch/t276/revert-locked.ps1` | 0 |

## 三、本窗口内的直调步骤（同一个持锁窗口里直接调用，不另抢锁；§2.4 第 5 条）

| 窗口运行标识 | 窗内步骤 | 落盘日志 |
|---|---|---|
| `ef6209b8-9fb0-4ba3-8f98-f9d728a2274f` | `pnpm build`（重编＋打印记）→ `pnpm gen` → `pnpm build` → `pnpm help:build` | `.scratch/t276/p2-build1.log`／`p2-gen1.log`／`p2-build2.log`／`p2-help1.log` |
| `515264d6-fd87-468f-a64b-7bdf4cb0de18` | `pnpm gen` → 三轮变异（各含 `node --test` 与 `pnpm build`）→ `pnpm gen:check` | `.scratch/t276/gencheck2.log`（另有各轮 `pnpm build` 输出按脚本内联入窗口日志） |
| `3541c59e-a67c-47f7-bca2-05e0740a4467` | `pnpm test`（全量） | `.scratch/t276/full-test.log` |
| `c16743c7-b9f0-4b77-a20c-0b315f4c74cc`／`9eefc93e-2bec-44a9-97c0-f85fd2770fe9` | `pnpm help:examples:check` → `git add` 逐条点名 → `git diff --cached --name-only` 量现场 → `git commit -F … -- <7 路径>` → `git show --name-only HEAD` 复核 → `git push` | `.scratch/t276/examples-check.log` |

提交与推送（本次二阶段）：`bf274e6` 已在 `origin/master`（`git branch -r --contains bf274e6` → `origin/master`）；第二笔为证据件回填。

## 第三阶段运行记录（窗口导出 · 自动生成，勿手改本节以下内容）

> 导出源：`.scratch/locks/gate-runs.log`（未受版本控制）；本件是它的**受版本控制副本**，供第三方一对一复核
> （协议 §2.3 第 4 条）。全部经 `node tooling/run-locked.mjs --ticket 276 --poll-ms 2000 --max-wait-ms 900000 -- …`。

```
RUN ticket=276 runId=0365809b-7b96-4f56-8598-da251dac18a5 cmd="\…"pnpm build; node packages/skill-calorie/scripts/gen-cli.mjs; node packages/skill-calorie/scripts/gen-cli.mjs --check; node packages/skill-calorie/scripts/build-help.mjs; node packages/skill-calorie/scripts/check-examples.mjs\"" waitedMs=40027 exit=1 pid=44428 at=2026-09-15T05:06:53.710Z
RUN ticket=276 runId=16dbc561-b506-4ce8-8665-4561d2d86e83 cmd="cmd /c \…"pnpm build && node packages/skill-calorie/scripts/gen-cli.mjs && node packages/skill-calorie/scripts/gen-cli.mjs --check && node packages/skill-calorie/scripts/build-help.mjs && node packages/skill-calorie/scripts/check-examples.mjs > \\\"D:\\ilife\\.scratch\\t276\\build.log\\\" 2>&1\"" waitedMs=10009 exit=2 pid=2504 at=2026-09-15T05:07:44.554Z
RUN ticket=276 runId=57cd38ee-472f-48d8-9199-625ee4437b46 cmd="cmd /c \…"npx tsc -b --force packages/skill-calorie packages/base-render && node packages/skill-calorie/scripts/gen-cli.mjs && node packages/skill-calorie/scripts/gen-cli.mjs --check && node packages/skill-calorie/scripts/build-help.mjs && node packages/skill-calorie/scripts/check-examples.mjs > \\\"D:\\ilife\\.scratch\\t276\\build2.log\\\" 2>&1\"" waitedMs=80053 exit=2 pid=7980 at=2026-09-15T05:09:44.739Z
RUN ticket=276 runId=5e3ba582-208f-4432-b3af-098a578bc82e cmd="cmd /c \…"node packages/skill-calorie/scripts/gen-cli.mjs; node packages/skill-calorie/scripts/gen-cli.mjs --check; node packages/skill-calorie/scripts/build-help.mjs; node packages/skill-calorie/scripts/check-examples.mjs; node --test packages/skill-calorie/test/diet-ranking-route-t276.test.mjs packages/skill-calorie/test/cmd-write-40-persist.test.mjs packages/skill-calorie/test/m5-receipt-97.test.mjs > \\\"D:\\ilife\\.scratch\\t276\\w1.log\\\" 2>&1\"" waitedMs=0 exit=1 pid=44408 at=2026-09-15T05:15:52.599Z
RUN ticket=276 runId=4a6858b4-f5a5-4b95-807c-36daaf4a17fa cmd="\…"node packages/skill-calorie/scripts/gen-cli.mjs && node packages/skill-calorie/scripts/gen-cli.mjs --check && node packages/skill-calorie/scripts/build-help.mjs && node packages/skill-calorie/scripts/check-examples.mjs && node --test packages/skill-calorie/test/diet-ranking-route-t276.test.mjs packages/skill-calorie/test/cmd-write-40-persist.test.mjs packages/skill-calorie/test/m5-receipt-97.test.mjs\"" waitedMs=0 exit=1 pid=35388 at=2026-09-15T05:16:17.418Z
RUN ticket=276 runId=c5eaf2a5-93c9-404b-8ec9-2362f04ef63c cmd="node .scratch/t276/battery.mjs w3 gen gen-check help examples test-t276 test-t27…" waitedMs=1 exit=1 pid=34280 at=2026-09-15T05:18:07.679Z
RUN ticket=276 runId=bdffe4f2-42ee-484a-a0f7-aeda96d5a48e cmd="node .scratch/t276/battery.mjs w4 gen-stamp gen gen-check help examples test-t27…" waitedMs=10010 exit=1 pid=2908 at=2026-09-15T05:20:53.823Z
RUN ticket=276 runId=e9dde6f0-651f-4c82-a2df-6b8c70bcabf5 cmd="node .scratch/t276/battery.mjs w5 probe gen-check test-t276…" waitedMs=0 exit=1 pid=34048 at=2026-09-15T05:22:03.287Z
RUN ticket=276 runId=96018843-2dc4-4498-b544-a42421be017d cmd="node .scratch/t276/battery.mjs w6 test-t276 test-t276-extra ledger…" waitedMs=0 exit=1 pid=42624 at=2026-09-15T05:23:42.647Z
RUN ticket=276 runId=e5a35a11-e200-4161-b9b1-82d8d1fae003 cmd="node .scratch/t276/battery.mjs w7 test-t276 examples…" waitedMs=60110 exit=1 pid=16012 at=2026-09-15T05:25:32.538Z
RUN ticket=276 runId=cd89ddd4-57cf-4d6e-b6ce-4333382dd23d cmd="node .scratch/t276/battery.mjs w8 build test-t276…" waitedMs=20015 exit=1 pid=3880 at=2026-09-15T05:26:11.106Z
RUN ticket=276 runId=25895ade-6866-488e-92d6-d63b98a9a730 cmd="node .scratch/t276/battery.mjs w9 build test-t276 test-sc test-root test-base…" waitedMs=270285 exit=1 pid=1480 at=2026-09-15T05:32:37.001Z
RUN ticket=276 runId=8e85d01b-634f-47e8-b180-b9c0c8334ae0 cmd="node .scratch/t276/battery.mjs w10 probe…" waitedMs=60050 exit=0 pid=45904 at=2026-09-15T05:34:43.767Z
RUN ticket=276 runId=bcb8ba9b-8424-4c39-a479-49add62ac937 cmd="node .scratch/t276/battery.mjs c2 commit…" waitedMs=20078 exit=0 pid=43820 at=2026-09-15T06:09:58.612Z
RUN ticket=276 runId=a07c5475-8a27-43fe-b4cd-54efb604193f cmd="node .scratch/t276/battery.mjs w13 build test-t276 mutate…" waitedMs=880686 exit=1 pid=42380 at=2026-09-15T06:10:36.671Z
RUN ticket=276 runId=9b23b26e-f1dc-4b26-8d40-9c6e99a3b02a cmd="node .scratch/t276/battery.mjs c4 build test-t276 mutate…" waitedMs=287008 exit=1 pid=2628 at=2026-09-15T06:16:42.700Z
```

条目数：START/其他 17 条 ＋ RUN 16 条 = 33 条。
