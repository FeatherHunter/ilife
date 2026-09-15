# t274 门禁运行记录（本席窗口导出）

来源：`.scratch/locks/gate-runs.log` 里 `ticket=274` 的条目（`START`／`RUN` 两行成对；`LOCK-STOLEN` 是并发席机器死亡后的抢锁记录）。
导出只搬运行标识与命令，不复制输出正文——输出都在 `.scratch/t274/` 与各条命令自己的落盘里。

## 本席窗口（2026-09-15，Asia/Shanghai 10:47–11:0x）

| runId | 命令 | 退出 |
|---|---|---|
| `67aa2a15-5762-4df2-9d9a-7f4e327e7638` | `npx tsc -b packages/skill-calorie` | 0 |
| `239535c0-0cb5-4e57-94d1-47333d9cd2f6` | `node --test packages/skill-calorie/test/*.test.mjs` | 1（首跑；`fail 40` 里 39 条为别席在途件） |
| `9c4cfd0f-9564-4d11-baff-0e1b50fcb6d9` | `node --test packages/skill-calorie/test/*.test.mjs`（落盘 `.scratch/t274/pkg-test-with-t274.log`） | 1 |
| `b7614764-49e5-4531-a36c-6eff9f69a60a` | `npx tsc -b packages/skill-calorie`（本席两件退回 HEAD 后重编） | 0 |
| `05771f95-8346-4df3-9286-5a048c168aa3` | `node --test packages/skill-calorie/test/*.test.mjs`（同上状态，落盘 `.scratch/t274/pkg-test-without-t274.log`） | 1 |
| `38834766-3a16-4cd0-87d5-224f712b5a10` | `npx tsc -b packages/skill-calorie`（还原本席两件后重编，waitedMs=60048） | 0 |
| `d457c132-60d6-4618-8fb3-18a41c1a065a` | `node --test packages/skill-calorie/test/*.test.mjs`（本票改动在场，落盘 `pkg-test-with-t274.log`） | 1 |
| `7763b33b-2021-4574-8231-b26670462220` | `npx tsc -b packages/skill-calorie`（变异后重编） | 0 |
| `b11ea616-d39a-4afa-9b2c-f03c7620a0c5` | `npx tsc -b packages/skill-calorie`（变异逐文件点名还原后重编） | 0 |
| `3a08cf70-20d2-492b-8e24-c9aa7a6ce649` | `node packages/skill-calorie/scripts/check-warning-line.mjs --sync --dry` | 1（演练，报别席行陈化） |
| `3bb5de03-10ee-4f9e-b6af-61f876d3829e` | `node packages/skill-calorie/scripts/check-warning-line.mjs --sync` | 0（`SYNC-VERIFY ok`） |
| `4bfacc30-6ec8-48d4-93d0-8319306a6420` | `node packages/skill-calorie/scripts/check-warning-line.mjs` | 0（`RESULT: 67/67` ＋ PASS） |
| `0dba66b8-ed91-49cf-9754-6b039546d22c` | 提交脚本 `pwsh -File .scratch/t274/commit.ps1`（`git add -- <7 路径>`／`git commit -m … -- <7 路径>`） | 0（sha `1ee8141`，已推送） |

## 第二阶段：来源统计页搬成姊妹件（编排者裁定 (b)）

| runId | 命令 | 退出 |
|---|---|---|
| `74dc2f69-8515-4052-b8ed-c45ee6f729cb` | `npx tsc -b packages/skill-calorie`（纯搬后首编，waitedMs=40025） | 0 |
| `2b72dae2-e522-4128-bf16-1448b01f4ad5` | 同上（补骨架后首编，报两处 `SerializableEnvelope` 类型错） | 1 |
| `f0b8eceb-a628-4012-9bae-d02fe3417d0b` | 同上（补 `DataTextInput['envelope']` 注记后复编） | 0 |
| `fe5eb1d7-70d7-4eb8-854a-34100045986e` | `node packages/skill-calorie/scripts/check-warning-line.mjs --sync --dry` | 1（演练：`改=3`） |
| `ea11b41b-cb9a-479b-bba4-25158e369604` | `node packages/skill-calorie/scripts/check-warning-line.mjs --sync` | 0（`SYNC-VERIFY ok`） |
| `801af6d6-08b2-4bcc-91eb-e645fd104799` | `node packages/skill-calorie/scripts/check-warning-line.mjs` | 0（`RESULT: 67/67` ＋ PASS） |
| `6d37559b-c15b-40db-b6cb-6b7e7bbae977` | 提交脚本 `pwsh -File .scratch/t274/commit2.ps1`（`git add -- <9 路径>`／`git commit -m … -- <9 路径>`） | 0（sha `ca52b5d`，已推送） |
| `6955dd03-af62-4144-9b81-414533886d89` | `node packages/skill-calorie/scripts/check-warning-line.mjs`（提交后复跑） | 0（`RESULT: 67/67` ＋ PASS） |
| （终态补记）`f50d89d9-7c9d-4c0d-8fa1-8d866d0708ce` | `node --test packages/skill-calorie/test/*.test.mjs` 终态全量，落盘 `.scratch/t274/pkg-test-final.log` | 1（`tests 1050 / pass 1012 / fail 38`；只在终态红的 3 条均为别席在途件，见 `t274-证据.md` §六） |

## 上一席（同一个票号，2026-09-14 06:55，孤儿件留下的历史）

| runId | 命令 | 退出 |
|---|---|---|
| `99cb649b-add0-4a2a-bbd5-883e9fc717ef` | `node --test packages/skill-calorie/test/diet-library-t274.test.mjs` | 1 |
| `a241bbd8-859c-4c13-af14-c8cb1927ea1c` | 同上 | 0 |
| `3666efc5-3fa5-4ea0-84d8-5864257113ac` | `pnpm test` | **只有 START、没有 RUN**——那一席中途挂了，全量跑没落地 |
