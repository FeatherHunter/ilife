# #180 收口波 · 对账正本（快照重算 ＋ 补偿表清空 ＋ 前提型断言改写 ＋ 全量门禁）

> 交付者：收口波实施 agent（session-fe7022a7 之下的实施子代理）。
> 写集（派单允许清单）：`packages/skill-calorie/test/skill-t11.test.mjs`／`render-t10.test.mjs`／`help-center-106.test.mjs`／
> `packages/skill-calorie/src/triggers/help-lookup.ts`／`test/calorie-routing-81.test.mjs`／本文件／
> `docs/skills/skill-calorie/t180-gate-runs.log`／`.scratch/t180-c/**`。
> 用词照 `docs/agents/wording.md`；结构判据 `docs/agents/structure.md`（350 行告警线、必报五步）。
> 时间口径：本文所有 ISO 时刻为 UTC（本地 = UTC＋8）。

## 0. 一句话结论

前任（#180 收口波上半）已把**快照重算**（已提交 `fd65fab`）与**四处未提交改动**（补偿表清空＋三处测试改写）做对做全；
本席**接住这四处未提交成果**、补完它没来得及做的**第五处**（`skill-t11.test.mjs:154` 的孪生断言），
再走完全仓「前提已消失」同类断言扫描（**无第三处漏网**）、全套门禁、变异自证、5 条命令的增量提交与对账源导出。
全量 `pnpm test` ＝ **1469 测试／1468 通过／1 失败**，唯一红是**议题已登记**的环境时钟项（`fetch-t6:97`），
其余议题登记的派生常量／基线／smoke 项**本波已随四处改动一起转绿**。

## 1. 完成的样子（收口波派单 §六，7 条逐条对账）

| # | 要求 | 怎么满足 | 证据（file:line） |
|---|---|---|---|
| 1 | `HELP_EXEC_OVERRIDES` 无残留 | 值已清成 `{}`（23 条映射全删，`profile_view` 在内）；**导出名保留**的唯一理由是跨层再导出 `src/triggers/index.ts:15` 在同一行同时导出它与 `execCliFor`，该文件不在本波写集内，删名即编译断 → 名字收敛归 **#181** | `packages/skill-calorie/src/triggers/help-lookup.ts:85`；再导出 `packages/skill-calorie/src/triggers/index.ts:15` |
| 2 | `routing.ts` 22 串是字面文本，`help-lookup.ts` 不再被它 import | 实测：`routing.ts` 全文 401 处 `calorie-cmd-read` 字面；对 `help-lookup` 的唯一提及是 `:13-14` 的说明注释（无 import 语句）；全仓 import `help-lookup` 的只剩 `src/triggers/index.ts:12`（聚合出口，正当） | `packages/skill-calorie/src/triggers/routing.ts:13-14`（注释即自述）；`packages/skill-calorie/src/triggers/index.ts:12` |
| 3 | `gen-sot-snapshot.mjs --check` 通过；快照除 `entry_sha` 段外逐字节未变 | 本席复跑 `--check`：`MASK-EQUAL=1`、`RESULT: entries=436 mismatch=0 mode=check`、exit 0；提交 `fd65fab` 自报 `BYTES 32564 -> 32564（DELTA 0）`、`changed=376`。编排者另有独立核验（派单转述）：掩码后结构逐字相同、键顺序未被重排 | 脚本 `packages/skill-calorie/scripts/gen-sot-snapshot.mjs`；快照 `test/calorie-sot.snapshot.json`（现 **32564 B**、6 个顶层键 `sot/total/scene_counts/entry_sha/wake_multiset/summary`、`entry_sha` **436** 键） |
| 4 | `dead.length` 断言改成 `=== 0` 并绿；`calorie-routing-81` 全绿；`calorie-triggers` 全绿 | 三条断言已改口径并实测绿（见 §2／§3）；三个文件在 §5 的绿态运行里全通过 | `packages/skill-calorie/test/help-center-106.test.mjs:87`；`test/calorie-routing-81.test.mjs`；`test/calorie-triggers.test.mjs` |
| 5 | 全量 `pnpm test` 通过 ＋ 还原并发伙伴的 `SKILL.md` | **未全绿**：`1469／1468／1`，唯一红＝已登记环境时钟项（见 §7）。`SKILL.md` 还原为**空操作**：跑前跑后 6 件 sha256 逐件相同（见 §8） | §5 的 `GATE-RUN`（`ac4c6122…`）；§8 哈希表 |
| 6 | `t180-gate-runs.log` 入库；证据里有 `GATE-RUN` 声明行 | 对账源已导出到受跟踪路径并随本正本同笔提交 | `docs/skills/skill-calorie/t180-gate-runs.log`；§5 |
| 7 | 正本：逐项证据 ＋ 偏离记账 ＋ 未确证项 ＋ 结构告警线报告 | 即本文件（§2–§12） | — |

**不做**（派单明令）：`routing.ts` 按场景拆分（归 **#181**）；窗口写死的根因纠正（归 **#250**）；#180 之外任何票的收口。

## 2. 四条既有改动对账（前任未提交的成果，本席逐条复核后**保留**）

复核方式：读 `git diff` 全文 ＋ 跑对应测试（红/绿两态） ＋ 与调用点/数据面交叉验证。

| # | 文件 | 改了什么（实测 diff） | 复核结论 |
|---|---|---|---|
| 1 | `packages/skill-calorie/src/triggers/help-lookup.ts`（+101/−…） | ① `HELP_EXEC_OVERRIDES` 23 条映射 → `{}`；② `execCliFor` 退化为**恒等转发**（只回传入的 `fallbackCli`）；③ 新增 `frozenCli(triggers, wakeWord)` 从入参表现找该唤醒词的 `main_prompt.cli`；④ `searchHelp` 命中行 `cli` 直取 `t.main_prompt.cli`；⑤ 两处「合成首命中」从抄表字面改为 `frozenCli` ＋ `null` 则不合成 | **成立**。自洽：`routing.ts` 已不再从它取命令（补丁 2 的前置条件已由上一波完成）；`calorie-c43`／`profile-view-177`／`help-center-106`／`render-t10`／`skill-t11` 全绿 |
| 2 | `packages/skill-calorie/test/help-center-106.test.mjs` | `assert.ok(dead.length > 300)` → `assert.equal(dead.length, 0)`；头注释同步（353 → 「#180 之前 353」） | **成立且更强**：原断言的前提（「数据里还有 353 条死命令」）正是本票要消灭的东西；改成 `=0` 后它从「前置鉴别力」变成**残留账目**。源级三字段扫描由 `no-script-commands-180.test.mjs:21,63-97` 独占 |
| 3 | `packages/skill-calorie/test/render-t10.test.mjs` | 原 `all.every(h => h.legacyCli.startsWith('python scripts/render_'))` → 两条新断言：①`legacyCli` 逐字同源 SoT 命令字段（经 `TRIGGERS` 建 `Map`）；②不得退回脚本形态 | **成立**（派单称其为「标准答案」）。唯一保留意见：`记身材照` 在 SoT 里**不唯一**（×3），按唤醒词建 `Map` 只比最后一条；实测三条 cli 逐字相同，故今天无差（本席在孪生处改成了「同唤醒词全部条目」比对，见 §3） |
| 4 | `test/calorie-routing-81.test.mjs`（+162/−…） | ① `paramFlipRoutes()`（按命令原文反推，实测 237 条）→ **结构式**判据（覆盖全 341 条 exec：单条命令＋键 token 一致＋需参数带 `--params`），把 legacy（无 key）在 exec 桶里的 **18 条**具名登记为 `legacyCardIdExecZone()`；② `LEGACY_OVERRIDE_EXCEPTIONS`（#152 的 `profile_view` 具名例外）**撤销**，D2⑤ 的「施工前既有入口 43 键」由反推改成冻结字面 `FROZEN_BASELINE_KEYS`；③ FX-81-5 的 smoke 汇总按用户 2026-09-11 甲案**放宽**（数据依赖失败单列登记册，只许登记不许扩，且汇总行与逐条实测自洽） | **成立，且比原判据覆盖面大**（341 > 237）。三条异议点逐条查过：撤销 #152 例外有数据面依据（`calorie.view.profile` 施工前不可达，今天仍由新拟词「看档案视图」承载）；`FROZEN_BASELINE_KEYS` 恰 43 键且无重复；smoke 放宽只松了 `exit`／`envelope` 两列，`cli` 逐字那格没松（`:349`） |

另：`help-center-106.test.mjs:67` 的 `non-exec 95` 与 `:64-76` 的 341／95／261 走路由层，**本波不动**——「开发 12 条」是另一条线（议题《92 条逐条处置》里那 12 条本波不开发），故 `95` 这个数不连带动；`test/calorie-triggers.test.mjs:8-24` 的 `S()/L()/canon()` 口径一字未改（快照重算脚本照抄它）。

## 3. ① 补 `skill-t11.test.mjs:154`：改法论证

**原断言**：`assert.ok(h.legacyCli.startsWith('python scripts/render_'))`（在「T10 照片 HELP：10 条全可执行」用例里）。
**它验什么**：`legacyCli` 取的是该唤醒词 SoT 的 `main_prompt.cli`（`src/render/help.ts:61`）。原断言锁的是「老家 python 原命令**备查**」这个形态——#180 把 10 个场景文件三个命令字段全量改写成 `calorie-cmd-read calorie.*` 之后，该前提**不存在了**（不是坏了，是被正当地消灭）。

**改法（照 `render-t10.test.mjs:181-193` 同一路数：不删断言，改口径为「钉新形态前提 ＋ 钉仍与 SoT 同源」）**，落点 `packages/skill-calorie/test/skill-t11.test.mjs:151-174`：

1. **同源**：按照片 10 条的唤醒词，从 `TRIGGERS` 收集**该唤醒词的全部** `main_prompt.cli`，要求每一条命中都与之逐字相同（失败信息带 SoT 值与 HELP 值）。
2. **形态**：`h.legacyCli.startsWith('calorie-cmd-read calorie.')`，不得退回脚本命令形态。

**为什么与 render-t10 略有不同（读了上下文才这么改）**：本用例的 10 条里 `记身材照` 在 SoT 里出现 **3 次**
（`body_photo_add_single`／`_add_note`／`_add_batch`，`scene-09-photo.ts:5-7`），按唤醒词建 `Map` 会把前两条压掉、只比最后一条 ——
今天三条 cli 逐字相同（是数据事实、不是保证），故这里按「同唤醒词的**全部** SoT 条目」比对，把那个洞堵上。
另外新增 `import { TRIGGERS } from '../dist/triggers/index.js';`（与该用例已用的 `../dist/cli/keys.js` 同层，无新增依赖面）。

**可执行性那一条没动**：`h.exec.startsWith('node ') && h.exec.includes(h.fn)` ＋ 逐条 `import` 断言原样保留（那才是本用例的题面）。

## 4. ② 全仓扫「前提已消失」的同类断言（编排者特别要求，不许跳）

**口径**：在**代码路径**（`packages/**`、`test/**`、`tooling/**`、`apps/**`）里搜 `<target>`，
`docs/research/**`（历史归档）与 `docs/skills/**`（历史正本）只作线索、**不作门禁**；
线索串＝`python scripts/render_`／`legacyCli`／`dead`／`353`／`376`／`375`／`370`／`300`／`HELP_EXEC_OVERRIDES`／`mavis`／`mmx`／`死命令`／`isExecCli`。

### 4.1 断言级（会因 #180 变红或失去鉴别力）——共 5 处，**无第三处漏网**

| # | 位置 | 原前提 | 处置 | 现状 |
|---|---|---|---|---|
| 1 | `packages/skill-calorie/test/render-t10.test.mjs:180` | SoT 有 `python scripts/render_` 原命令 | 前任改写（§2-3） | **绿**（本席复跑） |
| 2 | `packages/skill-calorie/test/help-center-106.test.mjs:83-84` | SoT 有 >300 条死命令 | 前任改写（§2-2） | **绿** |
| 3 | `packages/skill-calorie/test/skill-t11.test.mjs:154` | 同上（孪生） | **本席补完**（§3） | **绿** |
| 4 | `test/calorie-routing-81.test.mjs:53-54`（`paramFlipRoutes` 反推 237 条）／`:242-262`（D2⑤ 反推 43 键）／`:313-355`（FX-81-5 汇总） | 命令原文里还有非本仓命令、有 `HELP_EXEC_OVERRIDES` 命中、快照非零＝0 | 前任重导（§2-4） | **绿**（含 `:228` 的 341 条覆盖面、`:262` 的 43 键、`:351` 的汇总自洽） |
| 5 | `packages/skill-calorie/test/no-script-commands-180.test.mjs:56-97` | 本文件**不是**前提型断言，是**新任的防回退断言**（源级三字段扫描，读 `src/triggers/scene-*.ts` 原文、不经 dist） | 保留，本波未动 | **绿**（`:79` 条目数 436 钉住解析走样） |

### 4.2 已核实「仍是负向断言、不随本波变红」的同类串（逐条点名，防再漏）

- `test/calorie-routing-81.test.mjs:110,113,279,311`：`/python/i.test(...) === false`（负向）→ 绿。
- `packages/skill-calorie/test/profile-view-177.test.mjs:135`：`/python/i.test(hit.cli) === false`（负向，且正是 #177 为补偿表立的）→ 绿（**MUT-C 证明它仍有鉴别力**，见 §6）。
- `packages/skill-calorie/test/calorie-c43.test.mjs:95,99`：`isExecCli(首条)` → 绿（MUT-C 证明会红）。
- `packages/skill-calorie/test/help-center-106.test.mjs:81`／`:86`：判定串 `/^(python|mavis|mmx)\b/` 的两处使用（一处扫产物 CLI、一处扫 SoT 残留）→ 绿。
- `docs/research/t81-route-evidence.mjs`／`t63-line1-review-paramflips.mjs`／`t63-line1-review-probe.mjs`：**证据脚本**（非门禁、不在 `pnpm test` glob 内）今天仍 `import { HELP_EXEC_OVERRIDES }`——表已清空，**重跑会得到与归档文本不同的数字**。历史归档按纪律不新增不改；**登记为时效性缺口**（§11-2）。

### 4.3 前提消失但**不是断言**的残留（文本/注释级，写集外 → 只记账、本波不改）

| 位置 | 残留 | 判定 |
|---|---|---|
| `packages/skill-calorie/src/render/help.ts:5` | 「`legacyCli` 保留老家 python 原命令备查」 | 注释已失真（字段还在，语义变了） |
| `packages/skill-calorie/src/render/helpCenter.ts:25-29` | 「后者 **376/436** 是已不存在的命令…（这批老命令清完后该串数归 0，本行随之失效）」 | **自述会失效**，今天仍留；数字 376／370 已成历史 |
| `packages/skill-calorie/src/triggers/routing.ts:14` | 「查找层那张 `HELP_EXEC_OVERRIDES` 的删除与 10 个场景数据文件的清理同批——单删它会让…」 | 表已清空，句子过期（`:13` 那半句仍准确） |
| `packages/skill-calorie/SKILL.md:193` | 「`+legacyCli`（老家 python 原命令备查）」 | AUTO 块**之外**的手写正文，会误导读者 |
| `packages/skill-calorie/templates/help.html:29` | 「每条命中自带 exec（node 一行式）+ legacyCli」 | 未提 python，**仍成立**，最低级 |

## 5. 门禁（协议 §2.4：一切 build／test 经持锁包装器）

- 包装器：`node tooling/run-locked.mjs --ticket 180 -- <命令…>`；长输出一律落盘 `.scratch/t180-c/*.log`，只读尾 5 行 ＋ 摘要行。
- 对账窗口：`--since 2026-09-12T19:12:00Z --until 2026-09-12T19:20:30Z`（含），`--ticket 180`。窗口内**恰 8 条** `RUN`，**全部由本正本声明**（下表），故**无需** `--allow-undeclared`。

GATE-RUN 声明行（`runId` 抄自 `.scratch/locks/gate-runs.log`；cmd 与日志逐字同）：

- GATE-RUN runId=ade0fa3b-06b5-4d7d-a04a-4b93d17b3ee6 cmd=pnpm build （exit=0，19:12:40Z）← 编译本波改动后的 dist
- GATE-RUN runId=a7d390a9-caa1-4e74-a76d-aeac345c68db cmd=node --test packages/skill-calorie/test/*.test.mjs test/calorie-routing-81.test.mjs test/calorie-triggers.test.mjs （exit=1，19:13:23Z）← **靶向红态取证**：`467 测试／466 通过／1 失败`，唯一红＝`fetch-t6:97` 环境时钟（见 §7）
- GATE-RUN runId=ac4c6122-53ec-47b3-b852-a485ea952431 cmd=pnpm test （exit=1，19:15:00Z）← **全量红态取证**：`1469／1468／1`，唯一红同上
- GATE-RUN runId=4fafed6d-23bf-4381-8104-3438bf39b749 cmd=node --test packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/render-t10.test.mjs packages/skill-calorie/test/help-center-106.test.mjs packages/skill-calorie/test/no-script-commands-180.test.mjs packages/skill-calorie/test/calorie-c43.test.mjs packages/skill-calorie/test/profile-view-177.test.mjs test/calorie-routing-81.test.mjs test/calorie-triggers.test.mjs （exit=0，19:15:42Z）← **绿态证据**（`56 测试／56 通过／0 失败`）
- GATE-RUN runId=d885f081-c75f-4b06-9782-ae3ed61e351b cmd=node .scratch/t180-c/mutate-probe.mjs （exit=2，19:16:25Z）← 变异探针 v1，判据写错（把「该分支不可达」当成失败）**自杀**，非交付缺陷；v2 见 `410f7de3…`
- GATE-RUN runId=410f7de3-a61e-40d3-9903-fad45a37b483 cmd=node .scratch/t180-c/mutate-probe.mjs （exit=0，19:17:38Z）← **变异自证 v2**：`PROBE-SUMMARY bad=0 mutations=3`（§6）
- GATE-RUN runId=3486dbab-f896-46a3-bd98-17c3e3167f70 cmd=node --test packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/render-t10.test.mjs packages/skill-calorie/test/help-center-106.test.mjs packages/skill-calorie/test/no-script-commands-180.test.mjs packages/skill-calorie/test/calorie-c43.test.mjs packages/skill-calorie/test/profile-view-177.test.mjs test/calorie-routing-81.test.mjs test/calorie-triggers.test.mjs （exit=0，19:18:55Z）← **变异还原后的终局绿态**（`56／56／0`，`waitedMs=30027`＝等 t152 的锁，见 §8）
- GATE-RUN runId=b131ae1f-f38a-45de-9481-2e7d426aa945 cmd=node packages/skill-calorie/scripts/gen-sot-snapshot.mjs --check （exit=0，19:19:47Z）← `MASK-EQUAL=1`、`entries=436 mismatch=0 mode=check`

- GATE-RELAX flag=--allow-nonzero reason=上表 3 条 exit≠0（`a7d390a9`／`ac4c6122`／`d885f081`）**只作「红在何处」的机读取证**，不作为「门禁通过」的证据；本波的门禁通过证据是 `ade0fa3b`／`4fafed6d`／`410f7de3`／`3486dbab`／`b131ae1f` 五条 exit=0。其中 `ac4c6122` 的唯一红是议题**已登记**的环境时钟项（§7），`d885f081` 是探针脚本自身判据写错（非产品/测试缺陷）。
- 未使用 `--allow-undeclared`／`--allow-no-claims`／`--allow-no-runid`：窗口内 8 条 `RUN` 全部被本文声明，声明全部引 `runId`，证据里确有声明。

对账命令（可复跑）：

```
node tooling/check-gate-audit.mjs --evidence docs/skills/skill-calorie/t180-collection.md \
  --ticket 180 --since 2026-09-12T19:12:00Z --until 2026-09-12T19:20:30Z --allow-nonzero \
  --export docs/skills/skill-calorie/t180-gate-runs.log
```

**前序窗口不在本文范围**：#180 上半（数据改写＋快照重算）的运行已在各自正本内对账——
`docs/skills/skill-calorie/t180-scenes-01-05.md`／`t180-scenes-06-10.md`（窗口 17:59:30Z–18:12:00Z，`matched=14/14`），
其中快照重算三连（`2c90db60…` --write／`5c42b6bb…` --check／`24984fc1…` node --test）记在 `t180-scenes-06-10.md`。

## 6. 变异自证（协议 §5；dist 级，论证如下）

**为什么是 dist 级**：被验断言读的就是 `dist/`；对应 src 里 `src/render/help.ts`／`src/triggers/scene-*.ts` **不在本波写集**（`scene-*.ts` 被派单明令禁止），
而 `src/triggers/help-lookup.ts` 是**上一个 agent 未提交的成果**——src 级变异若中途崩溃会毁掉它。
故一律改 `dist/`（gitignore 内、非跟踪面），**按字节还原＋核 sha256**，整段跑在 `run-locked` 持锁区内（外部一条 RUN），探针 `PROBE-RESULT` 行机读留痕：

| 变异 | 靶文件／改动 | 期望 | 实测 |
|---|---|---|---|
| MUT-A | `dist/render/help.js`：`legacyCli` 塞回 `'python scripts/render_body_photo_receipt.py'` | `skill-t11`＋`render-t10` 两条新断言红 | `red_exit=1`；两条都报「legacyCli 必须逐字同源 SoT 命令字段」（`render-t10` 与 `skill-t11` 各一条）；`restore_equal=1`；还原后 `green_exit=0` ✓ |
| MUT-B | `dist/triggers/help-lookup.js`：合成首条 `frozenCli(...)` 换成 python 字面 | **预期不红**（该分支已不可达，见 REACH） | `red_exit=0`；`restore_equal=1`；`green_exit=0` ✓（登记为旁证，不算通过） |
| MUT-C | `dist/triggers/help-lookup.js`：命中行 `cli` 换成 python 字面 | `calorie-c43`＋`profile-view-177` 红（证明补偿表撤了以后「HELP 只许回真命令」仍有人守） | `red_exit=1`（`AssertionError: HELP 查找回的不是真实命令`）；`restore_equal=1`；还原后 `green_exit=0` ✓ |
| REACH（只读探针） | 量「合成首命中」分支的可达性 | — | `words=434 first_not_exec=103 synth_branch_reachable=0`；四个查询（`主页`／`今日主页`／`减肥`／`目标`）首条**都已是 exec**。即：该分支对唤醒词查询集**已不可达**，`frozenCli` 与退化的 `execCliFor` 一并成为**死代码**（删除归 **#181**，因为要连带动 `index.ts:15` 的再导出） |

## 7. 全量 `pnpm test` 读数与红名单归属

- **读数**：`ℹ tests 1469 ／ pass 1468 ／ fail 1 ／ suites 160 ／ skipped 0 ／ todo 0`，`duration_ms 35026`（runId `ac4c6122-53ec-47b3-b852-a485ea952431`，exit=1）。
- **逐条红名单（1 条）**：

| 位置 | 报错 | 归属 | 判据 |
|---|---|---|---|
| `packages/skill-calorie/test/fetch-t6.test.mjs:86`（`history：按日聚合倒序 + 目标状态 + 空库空行`），红在 `:97:48` | `TypeError: Cannot read properties of undefined (reading 'status')` | **议题已登记 · 环境时钟**（派单点名 `fetch-t6:97`） | 用例在 `:97` 调 `getCalorieHistory(db, 7)` **不传 `now`**，走真实时钟；样例数据是 `2026-09-04/05`，本机今天 `2026-09-13` → 7 天窗已不含样例 → `rows[0]` 为 `undefined`。`:91` 那条传了 `new Date('2026-09-06T12:00:00')` 的断言**是绿的**，反证与 #180 数据面无关 |

- **对比上一轮**：前任 18:09:36Z 那次全量（`779a158a…`）＝`1469／1461／8`，8 条逐条归属记在 `docs/skills/skill-calorie/t180-scenes-06-10.md:479-489`。本轮 `8 → 1`，**转绿 7 条**逐条对应：

| 上轮 # | 断言 (file:line) | 本轮为何转绿 |
|---|---|---|
| 1 | `packages/skill-calorie/test/help-center-106.test.mjs:84` | 前任改口径 `dead.length > 300` → `= 0` |
| 2 | `packages/skill-calorie/test/skill-t11.test.mjs:154` | **本席补完**（§3） |
| 3 | `packages/skill-calorie/test/render-t10.test.mjs:180` | 前任改口径（§2-3） |
| 4 | `test/calorie-routing-81.test.mjs:209`（D2④ 派生 237 条） | 前任重导为结构式判据（§2-4①） |
| 5 | `test/calorie-routing-81.test.mjs:248`（D2⑤ 43 键基线） | 前任撤 `LEGACY_OVERRIDE_EXCEPTIONS` ＋ 冻结字面基线（§2-4②） |
| 6 | `test/calorie-triggers.test.mjs:47`（逐条 sha） | 上半 `fd65fab` 重算快照 ＋ 本席复跑 `--check` 得 `mismatch=0` |
| 7 | `test/calorie-routing-81.test.mjs:310`（FX-81-5 汇总） | 前任按用户 2026-09-11 甲案放宽（§2-4③） |
| 8 | `packages/skill-calorie/test/fetch-t6.test.mjs:97`（环境时钟） | **仍在红**——本波不办（§11-1） |
- **靶向红态读数**（`a7d390a9`）：`467／466／1`，唯一红同上（证明 `packages/skill-calorie/test/*` 全域除该环境时钟项外无红）。

## 8. 并发纪律：`SKILL.md` 还原核查 ＋ 锁等待留痕

- 跑全量前对 6 件 `packages/*/SKILL.md` 各做一次 sha256（同时复制到 `.scratch/t180-c/skill-md-before/`），跑完逐件比对：

| 文件 | 跑前 sha256(前16) | 跑后 | 判定 |
|---|---|---|---|
| `packages/skill-bill/SKILL.md` | `4CA715962137E22D` | 同 | 未被动 |
| `packages/skill-calorie/SKILL.md` | `C962CBF1905AA187` | 同 | 未被动 |
| `packages/skill-chef/SKILL.md` | `8536551E871B89B0` | 同 | 未被动 |
| `packages/skill-home/SKILL.md` | `477725A041B06E4A` | 同 | 未被动 |
| `packages/skill-memo-ilife/SKILL.md` | `FA3006309D0E9583` | 同 | 未被动 |
| `packages/skill-schedule/SKILL.md` | `4AEBCC8941566B55` | 同 | 未被动 |

  → 本次 `pnpm test` **没有**顺手改写别的技能的 `SKILL.md`，还原动作**不需要执行**（按地图 Notes 的并发纪律：只在真被改写时按跑前字节还原）。
- 锁等待留痕（§2.3）：`3486dbab…` 的 `waitedMs=30027`、`b131ae1f…` 的 `waitedMs=10011` —— 本席两次撞上 `ticket=152` 的活锁（`WAIT-OWNER-ALIVE pid=2572 …`），按协议**不抢回**、等待后正常执行并落盘 `.scratch/locks/gate-runs.log`。

## 9. 结构告警线报告（必报五步第四步）

**告警线＝350 行**（本包口径见 `docs/skills/skill-calorie/t180-impact-list.md:4`／`:146`；本包尚无 `packages/skill-calorie/AGENTS.md`，数字沿用兄弟包先例）。
**本波实际碰到的文件行数**（数法＝LF，只数 `\n`；括号内为 `Get-Content` 行数，供对照）：

| 文件 | LF（Get-Content） | 判定 |
|---|---|---|
| `src/triggers/help-lookup.ts` | 177（159） | 线内 |
| `test/skill-t11.test.mjs` / `test/render-t10.test.mjs` / `test/help-center-106.test.mjs` / `test/calorie-routing-81.test.mjs` | — | 测试件按同级先例**不在告警线管辖内** |

**已超线、需要根据规则进行重构（本波只碰不改结构，逐件说明为什么先不拆）**：

- `src/triggers/routing.ts` **814 LF**（超 464）：一份 436＋57＋1 条的穷举路由表 ＋ 窗口字面，装的是「一个域的多页数据」；按场景拆分要连带动 6 个测试文件与证据脚本 → **归 #181**，本波不拆。
- `src/render/helpCenter.ts` **485 LF**（超 135）：装的是壳装配 ＋ 场景模型 ＋ 详情层字段三件事，拆法同样连带渲染测试与三态口径 → **归 #181**，本波不拆。
- `src/cli/write.ts` **961 LF**（超 611）：装的是全部分派与写链收据；拆它属「命令分派重构」→ **归 #181**，本波不拆。

本波对这 3 件的改动**为零**（`git status` 可证），故不因本波加长任何一件；总账见 §12。

## 10. 偏离记账

1. **派单描述与实况的一处措辞差**：派单说 `help-lookup.ts` 的「两处直接抄表的字面改成走 `execCliFor`」；实况是这两处改走**新增的 `frozenCli`**（从入参表现找该唤醒词的 `main_prompt.cli`），而 `execCliFor` 退化为恒等转发、**已无任何调用点**（只剩 `index.ts:15` 的再导出）。本席按**实况**复核，未回退前任的写法。
2. **`d885f081` 是一次自伤**：变异探针 v1 把「该分支不可达 → 不红」当成判据失败并 `exit 2`；v2 改为把不可达写成**显式期望**（`want_red=0`）并加 REACH 度量。产品/测试面零影响。
3. **不止改派单点名的一处**：派单要求 `skill-t11:154` 照 `render-t10` 的路数改，本席按上下文把「同源」判据从「唤醒词 `Map` 单值」收紧为「同唤醒词**全部** SoT 条目」（理由：`记身材照` 在 SoT 里不唯一）——属**加强**，不是放宽。
4. **未新增 changeset**：本波是既有票的数据/测试面收口，无包版本语义变化；如需 changeset 由编排者在收口时补（未在派单写集内）。

## 11. 未确证项

1. **全量门禁不是全绿**：`pnpm test` exit=1，唯一红＝环境时钟项（§7）。该项**本波范围外**且议题已登记；本席**没有**放宽它、也没有改样例日期。
2. **归档证据脚本的时效性未复跑**：`docs/research/t81-route-evidence.mjs`／`t63-line1-review-*.mjs` 仍 `import HELP_EXEC_OVERRIDES`，表清空后重跑数字会变。按「`docs/research/` 是历史归档，不新增」的纪律未动；**未确证**它们重跑后的差异幅度（未跑）。
3. **「22 条补偿串已就地落成 routing.ts 字面」逐条未逐一复核**：本席只做了存在性验证（`routing.ts` 无 `help-lookup` import、401 处 `calorie-cmd-read` 字面 ＋ 上一波正本的对账表）；逐条 22↔22 的映射表在上半正本里，本席未重做逐条比对。
4. **`legacyCli` 字段名未改**：字段已名不副实（不再 legacy），改名属契约变更（牵 `render/help.ts` 与两个测试），**本波不做**，登记给 #181。
5. **未跑的非 canonical 门**：`pnpm gate:selftest`／`gate:selftest:html`／`snapshot:html:check`／`boundaries`／`publish:*` 本波均未跑（派单未要求；`tooling/skill-html.snapshot.json` 只覆盖其余 5 技能，实测 `python|render_|mavis|mmx` 命中 0，**不因本波过期**）。

## 12. 风险 top3

1. **活代码里还留着两件死代码**（`execCliFor` 恒等转发、`frozenCli` 合成首命中），它们的唯一存在理由是跨层再导出链。若不随 #181 清掉，将来有人会在已经清零的数据上「修」一个永远不会执行的补丁分支。证据：§6 REACH（`synth_branch_reachable=0`）＋ `help-lookup.ts:87-103`。
2. **同一概念的第二处定义地**：`test/calorie-routing-81.test.mjs` 把「施工前 43 键」改成冻结字面后，基线与 `e953509` 的历史数据之间只剩注释里的重建口径；如果将来有人改 `FROZEN_BASELINE_KEYS`，门禁不会报警。缓解：`:242-247` 已写明重建口径（取 `e953509` 的 10 个场景文件 ＋ 当时 22 条补偿表）。
3. **时效性缺口**：`t180-gate-runs.log` 是**窗口切片**（19:12:00Z–19:20:30Z），不含本波之后的提交运行；归档探针（§11-2）与 5 处文本残留（§4.3）也都是「今天不清、明天更难清」的账，随 #181 一并处理最省事。
