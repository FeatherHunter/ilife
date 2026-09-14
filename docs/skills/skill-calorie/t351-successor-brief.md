# T351 接任派单（预置 · 仅当现任实施兵中途死掉时启用）

> 编排者预置。现任 = 会话 `abe93bf6-c325-416a-baf5-62d0d77a3dd8`（跑 44 分钟以上）。
> 它若交出完整回执，本单作废。它若中途无回执而死，按下文接手——**先量现场再动手，不许把它的未提交改动当既成事实采信**（`subagent-concurrency-protocol.md` §3.2 第 4 条）。

## 0. 你要做的事（一句话）
把「复制区收口 ＋ prompt 补齐 ＋ 读命令缺失阻断回归修复 ＋ 全量重跑」这一轮**收尾并提交**，然后写证据件。

## 1. 已由编排者独立验证成立的部分（不用重做）

| 项 | 读数 | 我怎么验的 |
|---|---|---|
| 交付目录 `final-v3` 的 37 份产物 | **0 异常** | 我自己写的 `verify-artifacts.mjs`（不引用实施者脚本）：doctype／真冻结 id 各 1／复制日志恰好 1 且非禁用／正文无格式菜单／无 `op=`／无 `# 成功`／无英文命令键标题 |
| 过程页 prompt | **10/10** 命中各自唤醒词 | 我从 `dist/workout/precheckPrompt.js` 独立取期望值，与产物逐条比 |
| 非过程页泄漏 | **0** | 结果页 17 ＋ 回执页 10 均无 prompt 段 |
| 目标①32 条 | 27 条 exec **全部有产物**（缺 0）；5 条 non-exec 按地图 Out of scope | `reconcile-32.mjs`，从 `src/workout/routes.ts` 读声明 |
| 变异还原一致性 | 三件 git blob 哈希与它记的基线**逐字节相同** | `f6b9af14…`（workoutPlanDocs.ts）／`f517dcfd…`（planCopyBlock.ts）／`766012e2…`（plan.ts） |
| 行数 | 全部 ≤350 | `workoutPlanDocs.ts` 348、`planCopyBlock.ts` 61、`precheckPrompt.ts` 38、`plan.ts` 54、`receipt.ts` 120 |

## 2. 现场（自己复核一遍，别采信本文）

```
cd D:\ilife
git status --short -- packages/skill-calorie/src
```
预期（我们这一票的件）：
- `M  src/cli/write.ts`（**注意**：这处的 M 里含我们自己的 T351 接线 —— 训练计划 10 条走 `workout/receipt.ts` 整页装配；但**整棵树里他席的在途件很多，提交前必须逐路径点名 add**）
- `M  src/render/planPlate.ts`（`PlanView` 加 `description`）
- `M  src/render/workoutPlanDocs.ts`
- `M  src/workout/plan.ts`
- `?? src/render/planCopyBlock.ts`
- `?? src/workout/precheckPrompt.ts`
- `?? src/workout/receipt.ts`

**不属于本票、不许碰**：`src/analysis/multiTrend*.ts`、`src/weight/*`、`src/shared/copyArea.ts`、`base-render/**`、`base-paint/**`、`src/triggerS` 里除场景 05 之外的任何件。

## 3. 还剩的活（按序）

1. **真数据页重生成**：`.scratch/t351-fix/final-v3/run-realdata-v3.mjs`。构造：生产库 `D:\2Study\StudyNotes\.db\calorie_data.db` 用 `VACUUM INTO` 只读拷一份到隔离目录再渲染 `order184`。
   **先改脚本一处毛病**：它现在**先删旧产物再跑**，失败就什么都不剩（上一份好页已被它删掉）。按并发协议 §2.5 第 1 条改成「**先在内存里算出产物 → 跑完全部断言 → 全过才落盘**；失败的那次不许动已有产物」。
2. **机检逐份**（脚本 `run-176-207-v3.mjs` 已含 17 条判据，最后交读数 `RESULT: n/n`）。**再加一条**：全部 37 份 `data-action-id="ilife-copy-log"` 计数逐份等于 1，且不出现 `data-action-id="ilife-copy-log" disabled`。
3. **变异自证**：至少打两处 —— ① 摘掉 `planCopyBlock` 里给数据按钮补冻结 `id` 的那行 `.replace(...)`；② 摘掉 `planCopyBlock` 里的 `prompt` 段。各自「改坏必红／还原必绿」两行读数。
   **变异前后各记一次 git blob 哈希**（`git hash-object <文件>`）作还原基线，并**在交付目录之外跑变异产物**（或跑完务必重跑复位），别把变异产物留在 `final-v3`。
4. **提交**：`git add <逐条点名自己的件>` → `git diff --cached --name-only` 自查 → **`git commit -F <msg> -- <逐条路径>`（必须带路径限定！不带会把暂存区里他席的件一起提交，本会话已犯过一次并用 `reset --soft` 纠正）** → `git push`。提交信息用中文、说清做了什么。
5. **证据件**：`docs/skills/skill-calorie/t351-v3-rerun-evidence.md`（进版本库），含：改了什么、判据读数、变异两行、真数据页读数、**范围外发现逐条归因**（见下）、未做项。

## 4. 两条环境障碍（已发生，写进证据件即可，别去修）

1. **门禁锁拥塞**：十几个席抢同一把锁，实测单条命令等过 **210 秒**（日志里的 `waitedMs=210010`）。长命令一律经 `node tooling/run-locked.mjs --ticket 351 -- <命令>`，输出落盘、等标记行、只读尾 5 行。**不要因为慢就裸跑。**
2. **共享编译产物曾被并发写坏**（18:52 那段）：`dist/analysis/multiTrendPage.js` 里 `const weighed` 出现过 3 处（359/360 连着重复拼接），导致 **CLI 整个起不来**。**源件一直是好的**（只有 2 处、分属两个函数），**18:53:08 重编后自愈**。定性措辞：**范围外发现·共享编译产物被并发写坏，本票引入 0 条；已由重编自愈**——别写成「他席源码有缺陷」。

## 5. 判据（什么时候算收工）
- 三支场景测试全绿：`node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs`
- `pnpm test:types` 绿（若因他席在途件红，如实归因，别改别人的件）
- 37 份机检全绿（含新增的「复制日志恰好一颗」）
- 真数据页重生成成功、读数记入证据件
- 变异红／还原一致两行齐
- 提交已推送，且 `git show --name-only <sha>` **只含本票的件**

回执按 `subagent-concurrency-protocol.md` §5.1：判定／机器证据／逐条路径／未做项，上限 1200 词。
