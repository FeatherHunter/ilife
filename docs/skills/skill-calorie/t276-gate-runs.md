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
| 11 | （见第二笔） | `node .scratch/t276/commit-p2b.mjs` | 0 | — | 证据件回填提交（§5.8 sha 与共享索引说明、本表第 9／10 行） |

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
