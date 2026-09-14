# T351 对抗审查回执（独立审查兵）

> 派单正本：`docs/skills/skill-calorie/t351-review-brief.md`（commit `2284d49`）。
> 派单 §5 的名义落点是 `t351-<角色>-review.md`；本件按派单消息的逐字指定落在 `t351-review-报告.md`。
> 被审交付：`272b275`（7 源件 ＋ 3 新件 ＋ 1 删件 ＋ 2 证据件）＋ `67034d6`（`src/cli/write.ts`）。

## 一、判定

**PASS**（均分 95／无 S1-交付缺陷／无未记录的过程违规）。

## 二、机器证据

| 项 | 我的读数（全部自己跑，不采信实施者结论） |
|---|---|
| 源码与提交一致 | 本票 9 件源码 `git diff HEAD` 全空（`workoutPlanDocs.ts`／`planPlate.ts`／`planCopyBlock.ts`／`precheckPrompt.ts`／`receipt.ts`／`plan.ts`／`cli/write.ts`／`html.ts`／`wizard.ts`）；4 个变异还原件 blob 与基线逐字节相同（`6023932c…`／`c80c3f94…`／`766012e2…`／`fd23aa8f…`） |
| 场景三支 | `GATE-RUN runId=t351-review-scene05` exit=0，`ℹ tests 3 / ℹ pass 3 / ℹ fail 0` |
| 全量重跑（我把脚本原样搬到 `.scratch/t351-review/probe/`） | `GATE-RUN runId=t351-review-rerun-v3` exit=0，`RESULT: 54/54（产物 37 ＋ 判据 17）`、`PROBE: PASS（17/17）` |
| 生成一致性（我自己的口径） | 重跑 37 份与交付 37 份**抹掉时间戳后逐字节相同（0/37 差异）**；产物最早 mtime `19:01:42.363` vs 相关源码最晚 mtime `19:00:06.978`（`workout/plan.ts`） |
| 我的新探针①（生成一致性 provenance，**被审脚本完全没有这一组**） | 交付 37 份：`PROBE-INDEPENDENT: GREEN（37/37）`；每份页内嵌渲染戳与文件 mtime **同秒**且全落在 `19:01:42–19:01:52`；真数据页 1/1 同判 |
| 我的新探针②（读命令**反向面**，被审脚本只断言「撤销后 exit 4」） | `GATE-RUN runId=t351-review-readblock` exit=0，`PROBE-READ-BLOCK: GREEN（6/6）`：空库 exit 4 ＋ stderr「无训练计划」；**有计划时三种视图全 exit 0**；删除后回到 exit 4 |
| 我的新探针③（**可见** prompt 块与触发器数据全等，不是「含片段」） | `PROBE-PRE-VERBATIM: GREEN（10/10）`，逐份可见 `<pre>` 与 `prompt_template` **全等**（153／158／110／217／176／157／106／140／168／120 字逐份相符） |
| 变异红／还原一致（我的探针） | 变异红：抽冻结 `id` 1 份红、塞回 `ilife-copy-menu-wrap` 1 份红、标题改回 `calorie.view.…` 1 份红、抹掉整段 prompt 1 份红、**mtime 回拨 1 份红／整目录回拨 37 份红**、删动作标识属性 1 份红、抽掉全部表 2 份红；还原一致：`.scratch/t351-fix/final-v3` 上 `PROBE-INDEPENDENT: GREEN（37/37）` |
| 自造权威假产物（真值我手写，不经被审脚本生成） | 喂进**被审脚本断言的逐字副本**：假产物红＝1 份（②=0/0、③=纯文本｜JSON｜CSV｜`data-fmt-open`｜复制数据 ▾｜英文命令键标题），跨份判据再红 2 条 ⇒ **机检会红，判据有识别力** |

日志件：`.scratch/t351-review/{types,scene05,rerun-v3,readblock,mutants}.log`；读数 `.scratch/t351-review/mutants/readings.json`；
脚本 `.scratch/t351-review/{probe-integrity,probe-read-block,probe-pre-verbatim,probe-oldnew,mutants,impl-assert}.mjs`。

## 三、派单九条逐条

**3.1 186–195 复制区已经对了 —— 成立。** 37 份全部 `(?<!data-action-)id="ilife-copy-data"`＝1、`id="ilife-copy-log"`＝1；正文（剥 `<style>`／`<script>`）无 `ilife-copy-menu-wrap`／`复制数据 ▾`／`data-fmt-open`／`data-fmt="`／`纯文本`／`JSON`／`CSV`／`copy-menu-item`。我的 token 表比被审脚本多收 `-wrap` 类名，仍全绿。

**3.2 缺失阻断恢复 —— 成立。** 三支测试 3/3；空库 exit 4 ＋ stderr 命中「无训练计划」；**反向面我自设探针 6/6 绿**（有计划亦 exit 0，恢复阻断未误伤）。删件：`git cat-file -e HEAD:<路径>` 退出 128（不在 HEAD）、全工作树 grep 只剩 6 处文档叙述、无代码引用。

**3.3 机检四条 —— 口径有三处「自己给自己开后门」，但都不决定本次判定。** 见 §四。

**3.4(a) 没为凑数删动作标识属性 —— 成立。** 37 份两个属性各 1（真 id 1、`data-action-id` 1），无一缺失。
**3.4(b) 标题中文单语 —— 成立。** 37 份逐份抽 `【calorie · …】`：训练计划查看／计划对比实际／构建向导／写前预览／定训练计划／…／撤销训练计划／计划复盘／禁忌扫描，`/【calorie · calorie\./` 命中 0。

**3.5 NA 通道的判定 —— v3 里「NA」写法已不存在（那是 v2 口径）；但等价绿通道换成了 `expectTable:'other'`：页内零表也判绿。** 我抽掉 `order201`／`order207` 全部表与行结构后，被审逐份机检与跨份判据**双双全绿**，只有我的表形判据红（`readings.json: mut-G`）。⇒ 「本该有动作明细的页渲染坏了会被蒙混过关」这一担心**在 v3 依然成立**，只是通道名换了。

**3.6 生成顺序 —— 成立，且我给了比 mtime 更强的一行。** 产物最早 `19:01:42.363`（`order176-result.html`）晚于相关源码最晚 `19:00:06.978`（`workout/plan.ts`）；更强的一行＝**重跑 37 份与交付抹时间戳后逐字节相同**。判据表**已覆盖**「载荷标题不许出现英文命令键」（`EN_KEY_RE` ＋ 单独一条过程页标题判据）。附带读数：交付产物用的 `dist` 是 19:04:07 由**他席** `ticket=360-review` 的 `npx tsc -b packages/skill-calorie --force`（台账 `runId=95cecd02`）重建的；我的重跑正是用这份第三方 `dist`，仍逐字节复现 ⇒ 生成一致性另有旁证。

**3.7 过程型页面必带逐字 prompt —— 成立。** 10 份可见 `<pre>` 与 `src/triggers/scene-05-workout.ts` 的 `prompt_template` **全等**；结果页 17 ＋ 回执页 10 无 `执行唤醒词「`；层级未倒置：`git grep triggers -- packages/skill-calorie/src/render` 无命中，取 prompt 的活只在 `workout/precheckPrompt.ts`。

**3.8 撤销回执状态卡副行 —— 确认为用词缺陷（本票引入，S3）。** 我独立抠出可见文案：`状态 已改动 已写入训练计划 影响行数 5 行 … 改动对照 已撤销训练计划「t1计划」（…硬删除，不可恢复） 已删除（硬，不可恢复）`。出处 `src/workout/receipt.ts:86` `statusCard(receipt, '已写入训练计划')` 是恒定兜底。建议修法：兜底随 op 走，撤销类给「已删除训练计划」，其余保持；级别 **S3 记账跟进**（同页主文案与「写后现值」都正确，不阻塞关票）。是否进机检：**不建议**做关键词并列正则（脆）；建议改成「状态卡副行由 op 派生」后用一条结果型断言固定撤销类的取值。

**3.9 交付目录污染 —— 交付的 37 份全部出自复位后那一轮。** 变异轮读数（`logs/351-rerun-MUTATED2.log`，`runId=0ca51742`，exit=1）：`RESULT: 49/54`，**30 份 `②data=0/log=1`**、机检⑤ 红 9 份。交付轮读数（`logs/351-rerun-v3-r7.log`，`runId=d173c134`，exit=0）：`RESULT: 54/54`，`data=0` **0 份**、`data=1/log=1` **37 份**、`③禁词≠无` **0 份**。我另加一条被审脚本没有的判据：逐份「页内嵌渲染戳 ＝ 文件 mtime」，37 份全部落在 `19:01:42–19:01:52`（r7 窗口），无一取自 18:40:29／18:59:45 两轮变异。**不判 S1。**

## 四、缺陷清单与归属

| # | 缺陷 | 归属 | 级别 |
|---|---|---|---|
| 1 | 机检④ `expectTable:'other'` 在页内零表时判绿（本该有表的页渲染坏了也过） | 本票引入（判据件） | S3 收紧跟进 |
| 2 | 冻结 id 计数写成「两数相减」：删掉 `data-action-id="ilife-copy-data"` 时 ② 仍得 1 ⇒ 陷阱(a) 点名的真回归抓不到（`readings.json: mut-F` 被审全套全绿） | 本票引入（判据件） | S3 收紧跟进 |
| 3 | 判据表整支没有 provenance 判据（产物属哪一轮／mtime 与内嵌戳是否同源），故变异轮污染只能靠人工重跑发现（`mut-E2` 被审全套全绿） | 本票引入（判据件） | S3 收紧跟进 |
| 4 | 撤销回执状态卡副行恒定兜底，与同页「已删除」对撞 | 本票引入 | S3 记账跟进 |
| 5 | 删件的编译残留 `packages/skill-calorie/dist/render/planDeleteVerifyDocs.js` 未清（`dist/` 被 `.gitignore` 忽略、全树无模块引用它，`tsc -b` 本身不剪枝） | 本票范围（低） | S3 记账跟进 |

**范围外发现（不决定判定）**
1. **他席在途件与信封契约未对齐致整树 `tsc -b` 红**：`GATE-RUN runId=t351-review-types` exit=2，唯一报错 `packages/skill-calorie/src/photo/compareDoc.ts(97,19) TS2353`——该件是 `??` 未跟踪、不在 HEAD、不在本票两个提交的件表里；**本票引入 0 条**。本票范围内的类型自证改由三支场景测试 ＋ 我的三支探针承担。
2. **共享编译产物被他席并发重建**：`dist` 19:04:07 由 `ticket=360-review runId=95cecd02` 的 `--force` 重建（台账在册）；他席另有 `npx tsc -b packages/skill-calorie (mut)` 的变异轮（19:03:05）在同一工作树里改源又还原。本票交付的三轮重跑（19:01:42–19:01:52）都在这些窗口之前，且我的复现逐字节相同。
3. **我自己的足迹（如实登记）**：`GATE-RUN runId=t351-review-types` 的 `tsc -b` 在 `dist` 里新写出 `dist/photo/compareDoc.js`（19:07:41）——全树 `dist` 里唯一被我改动的文件；`probe-read-block.mjs` 的删除守卫拦住的是我自己的 `.scratch/t351-review/readblock/`。除此未碰任何源码、测试、公共层。
4. `render-t41.test.mjs:158` 那条红已由**另票提交 `803c5dd`** 收紧，证据件未回改一行指过去（文档与现状差一条）。

## 五、五个维度

契约一致 **28**／30（扣 2＝缺陷 4）｜证据真实可复现 **24**／25（扣 1＝缺陷 3 使「绿」只能靠人工重跑兜底）｜新旧对照 **19**／20（改前 `final/` 的 186–195 共 30 份：真 id 恰好 1 ＝ **0 份**、带 prompt 段 ＝ **0 份**、3 份带三格式菜单；改后 20 份：真 id 20/20、prompt 段 10/10、菜单 0——这行新旧读数是本次补的，证据件未给）｜工程红线 **15**／15｜文档同步 **9**／10（扣 1＝范围外发现 4）。**合计 95，无 S1，判 PASS。**

## 六、未做项与下一手缺什么

1. **196–200 外部五条**未造产物（`routes.ts` 记 `non-exec`），我沿用「如实记」口径，未另验。
2. **真数据页**我只复验了交付的那一份（`realdata/order184-realdata-result.html`，1/1 绿、内嵌戳 19:02:43 ＝ mtime），**没有**独立重跑 `run-realdata-v3.mjs`（它要在暂存区算产物再搬，属可复现性加分项，不属派单九条）。
3. **缺陷 1–3 需另开票**把三条判据收紧：`other` 类页加「至少 1 表 1 行」、冻结 id 计数改用负向后顾、逐份加「内嵌渲染戳 ＝ mtime」的 provenance 断言（我的三支探针可直接当种子）。
4. **缺陷 4** 需在 `src/workout/receipt.ts` 把兜底随 op 派生，并补一条结果型断言固定撤销类取值。
5. **范围外发现 1** 的 `photo/` 三件属他席路径，本审查兵不碰，需该件主对齐信封契约。
