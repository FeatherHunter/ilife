# #83 返修 R-2 · 定点复核报告（第 3 席 · 独立复核，不采信实施者结论）

- 复核对象：commit **`bee97bc`**（`fix(83): 返修 R-2（蓝队 S2／S3）`，4 文件 **105+/8−**，**未 push**）。
- 复核席：**定点复核席（第 3 席，fresh session）**。不采信 `docs/research/t83-html-first.md` §11（实施者自述）与蓝队报告的结论；本报告全部数字由本席**自建探针／自跑门禁／自跑变异**重算。
- 本席自建物：`docs/research/t83-recheck-r2-scope.mjs`（真机探针 A／B／C，**15/15 观测**）。
- 本席复核面改动：`docs/research/t83-review-blue-mut.mjs` **2 个布尔字面量**（`MUT-83B-3`／`-6` 的 `expectRed: false → true`，编排者授权；`git diff --numstat` = **2+/2−**，无其他改动）。**产品代码零改动**（`packages/skill-calorie/src/**` 只读）。
- **verdict：FAIL** —— 5 条声称中 **4 条成立／1 条部分成立**（**D-6 澄清不成立**：本票引入 1 条 **S2** 文档事实错误）。最小整改＝**改一句话**（无代码／无测试改动）。

---

## 1. 逐条复核判定

| # | R-2 声称 | 本席判定 | 关键证据（本席自跑） |
|---|---|---|---|
| 1 | **D-1（S2）取口径②**：`RECEIPT` ＝ exit 5 专属；exit 2／4 不发；**行为零改动** | **成立** | 真机 5 例（探针 A／B，§2）：exit2-缺参／exit2-非法 mode／exit4-空库 → `receiptLines=0` ＋ stdout 0 B；exit5-结构错 → `receiptLines=1` ＋ stdout 0 B。`cmd_read.ts:1170-1176` 只读复核：`fail(2|4, …)` 分支不发 `RECEIPT`，`failWithReceipt` 仅 exit 5。`git diff --numstat -- packages/skill-calorie/src` = **0 行** |
| 2 | **D-2（S2）**：表标题去「并打开」；§7 新增「打开」未确证＋归 #64 | **成立** | `t83-html-first.md:62` 现为「① 成功渲染并**落盘＋回传落点**」；§7 第 1 条逐字含「**「打开（唤起查看器）」未确证**」「**#64 打通图／地图 Out of scope**」。**注**：R-2 自述引 `:61`，改后实为 **`:62`**（S3 引用漂移，见 §7-R2N2） |
| 3 | **D-4／D-5（S3）**：`:246` 改 `assert.equal(rec.html, undefined)`；新增 `deliveryTemplateOf('receipt','<!DOCTYPE…')==='doc-shell'` | **成立** | `delivery-83.test.mjs:246`／`:284-285` 逐字在位。**鉴别力（硬判据）**：变异 **MUT-83B-3 变异轮 exit=1 `fail=1`**（红行 `#83 delivery 契约单元…`）、**MUT-83B-6 变异轮 exit=1 `fail=1`**（红行 `#83 ④ 回执自身也走三态…`）；6 支还原轮**全部 59/59 绿**、src／dist sha256 **逐字节回原**（§4） |
| 4 | **D-6／D-8（S3 文档）**：changeset 澄清 `--params '{"delivery":"text"}'` 对写键不适用；「10 用例」→13；`SKILL.md:31` 补「`data.output` 恒绝对路径」 | **部分成立**（D-8 **成立**；**D-6 不成立**） | D-8：`delivery-83.test.mjs` 实测 **13 个 `test()`**；`SKILL.md:31` 含「**恒绝对路径**」，在 `HELP-AUTO-START`（`:79`）**块外**，`pnpm build` 后仍在；首 3 字节 `2d 2d 2d`。**D-6**：真机 **10 个写键扫描 → 7 个 `delivery:"text"` 生效**（exit 0 ＋ `delivery.mode=text` ＋ `data.text`）→ changeset 的「对写键不适用」「35 个写键…未知字段一律拒」**被证伪**（§3） |
| 5 | **门禁**：build／boundaries／snapshot:check／publish:pre 全 0；靶向 59/59；canonical 新增 0 | **成立** | 四门 **0/0/0/0**；靶向 6 文件 `tests 59／pass 59／fail 0`；canonical 失败集 **base=34 after=29 新增=0**（§5／§6） |

---

## 2. D-1 真机实证（本席探针 A／B，runId `6cf8efc4`，exit 0）

| 例 | 命令要点 | exit | stdout | `RECEIPT` 行 | `ERR 5:` 行 | 判定 |
|---|---|---|---|---|---|---|
| R2C-1 exit2-缺参 | `calorie.weight.log`（无 `--params`） | **2** | 0 B | **0** | 0 | `ERR 2: 缺参数 kg（须为有限 number）` |
| R2C-2 exit2-非法 mode | `calorie.help.center --params '{"mode":"bogus"}'` | **2** | 0 B | **0** | 0 | `ERR 2: 参数 mode 非法（bogus）：须为 file／inline／text`（`cmd_read.ts:801`） |
| R2C-4 exit4-空库缺失阻断 | `calorie.view.diet --params '{"date":"2026-09-07"}'`（空库） | **4** | 0 B | **0** | 0 | `ERR 4: 取数失败（缺失阻断）：无饮食记录（2026-09-01 ~ 2026-09-07）` |
| R2C-5 exit5-结构错落点 | `calorie.help.lookup --output <db>/blocker/x.html`（父路径是文件） | **5** | 0 B | **1** | 1 | `ERR 5: 渲染失败：显式落点 … EEXIST` ＋ `RECEIPT {"ok":false…}` |
| R2C-6 changeset 原命令 | `calorie.exercise.update --params '{"id":1,"calories":10,"delivery":"text"}'` | **2** | 0 B | **0** | 0 | `ERR 2: 不支持字段: delivery`（与 changeset 引文一致） |

- `RESULT-RECHECK-R2-SCOPE: PASS 5/5`。**结论**：D-1 口径②与真机行为一致——exit 2／4 确无 `RECEIPT`、stdout 恒空；exit 5 恰 1 行 `RECEIPT`；stdout 纯净（P9）未破。
- **行为零改动**：`git diff --numstat -- packages/skill-calorie/src` = **0 行**（工作区 vs `bee97bc`）；`git show --numstat bee97bc` 亦仅 4 文件、无 `src/**`。
- 首跑 `f584c0a4` exit 1（本席探针原把 D-6 的「写键未知字段」预设为 exit 2，被 `water.log` 实测 exit 0 打破）→ 该反例即 §3 的 S2 证据来源；修正探针后 `6cf8efc4` 复跑 exit 0。

## 3. D-6 反例（本席探针 C：10 个写键 ＋ `"delivery":"text"` 扫描）

机制（只读复核）：`cmd_read.ts:1040` `const askedText = params['delivery'] === 'text';` —— `delivery` 是**交付层通用开关**；写键能否吃到**取决于该键的参数白名单是否拒未知字段**（`write.ts:600/740/779/881` 等 4 处 `不支持字段`）。

| 写键 | exit | `delivery.mode` | `data.text` | 结论 |
|---|---|---|---|---|
| `calorie.water.log` | 0 | **text** | 81 字 | `delivery:"text"` **生效** |
| `calorie.diet.add` | 0 | **text** | 78 字 | 生效 |
| `calorie.weight.log` | 0 | **text** | 135 字 | 生效 |
| `calorie.exercise.add` | 0 | **text** | 84 字 | 生效 |
| `calorie.body.composition-add` | 0 | **text** | 91 字 | 生效 |
| `calorie.diet.update` | 0 | **text** | 65 字 | 生效 |
| `calorie.profile.set` | 0 | **text** | 86 字 | 生效 |
| `calorie.body.measure-add` | 2 | — | — | `不支持字段: delivery` |
| `calorie.exercise.update` | 2 | — | — | `不支持字段: delivery` |
| `calorie.goal.water` | 4 | — | — | 白名单未拦；空库「尚无营养目标行」→ exit 4（与本议题无关） |

- `SCAN-R2-D6 写键 10 例：生效=7 未生效=3`。
- **证伪 R-2 的 D-6 澄清**：`.changeset/t83-html-first-delivery.md:9` 现写「`--params '{"delivery":"text"}'` 对**写键不适用** —— 35 个写键各有参数白名单、未知字段一律拒」——(a)「对写键不适用」被 **7/10 写键反例**证伪；(b)「35 个写键各有参数白名单」与源码不符（显式拒未知字段的仅 4 处白名单）。同一条 bullet 前半句仍写「用户明确要文本（`--params '{"delivery":"text"}'`，只走 envelope）」→ **同一段落自相矛盾**。
- 旁证：蓝队自建探针 `B4`（写键 ＋ `delivery:"text"`）**5/5 PASS**；蓝队 D-6 原判为「**非通用**开关」（S3）——R-2 把它改成了**反向的全称否定**。

## 4. 变异复跑（判据＝蓝队 §7：`MUT-83B-3`／`-6` 须由全绿变红）

`node docs/research/t83-review-blue-mut.mjs`（单锁内「变异→重建→靶向→还原→重建→靶向 ＋ src／dist sha256 双向自证」）。

### 4.1 修前（`bee97bc` 原样脚本，`expectRed:false` ×2；runId `073f298e`，exit 0）

| 变异 | 变异轮 exit／counts | 还原轮 | src／dist |
|---|---|---|---|
| MUT-83B-1 | 1 ／ `{tests:59,pass:56,fail:3}` | 0 ／ 59-59-0 | 逐字节回原 |
| MUT-83B-2 | 1 ／ `{pass:55,fail:4}` | 0 ／ 59-59-0 | 逐字节回原 |
| **MUT-83B-3** | **1 ／ `{pass:58,fail:1}`** | 0 ／ 59-59-0 | 逐字节回原 |
| MUT-83B-4 | 1 ／ `{pass:58,fail:1}` | 0 ／ 59-59-0 | 逐字节回原 |
| MUT-83B-5 | 1 ／ `{pass:47,fail:12}` | 0 ／ 59-59-0 | 逐字节回原 |
| **MUT-83B-6** | **1 ／ `{pass:58,fail:1}`** | 0 ／ 59-59-0 | 逐字节回原 |

- 脚本末行仍打印 `RESULT-MUT-BLUE: ALL OK`（因 -3／-6 的 `expectRed:false` 使 `redOk` 恒真）→ **与「-3／-6 已红」自相矛盾**，证实实施者 §11.2「登记（不改）」的残留。
- **判定须读变异轮 exit／fail**：-3 红行 `✖ #83 delivery 契约单元：闭集校验／绝对路径／bytes／产物族／只追加`；-6 红行 `✖ #83 ④ 回执自身也走三态：可写时落盘（#87 命名）＋ 产物可读`。**两支均由蓝队审查轮的 `fail=0` 变 `fail=1`** → R-2 的两条断言**真承重**。

### 4.2 修后（本席置 `MUT-83B-3`／`-6` 的 `expectRed: true`；runId `12892dff`，exit 0）

- 6 支**全部 `MUT … OK`**：变异轮 exit=1（fail=**3／4／1／1／12／1**）、还原轮**全部 59/59 绿**、src／dist sha256 **逐字节回原**。
- 末行 `RESULT-MUT-BLUE: ALL OK`（exit 0）—— **摘要行从此可信**（`expectRed` 6 处全 `true`）。
- **登记（未改）**：脚本内 -3 的 `what` 仍为审查期口径「既有脚本无覆盖」、-6 仍为「测既有断言是否恒真」——**文案漂移**（改它超出「2 个布尔」授权），列 S3-R2N3。

## 5. 门禁／回归（全部持锁；`GATE-RUN` 见 §8）

| 门 | 命令 | exit | 关键行 | runId |
|---|---|---|---|---|
| 构建（前） | `pnpm build` | **0** | `tsc -b` 无 error | `d2c43544-2ca6-449d-a530-971ba164ec58` |
| 探针（首跑） | `node docs/research/t83-recheck-r2-scope.mjs` | 1 | 判据预设错（§2 末），**非门禁失败** | `f584c0a4-c553-463f-9226-d5983e7978c4` |
| 探针（终跑） | `node docs/research/t83-recheck-r2-scope.mjs` | **0** | `RESULT-RECHECK-R2-SCOPE: PASS 5/5` | `6cf8efc4-25be-487b-b4e6-2d60dfa23641` |
| 变异（修前） | `node docs/research/t83-review-blue-mut.mjs` | **0** | 6 支变异轮全红（§4.1） | `073f298e-b10f-428e-acb5-325bd402ad45` |
| 边界 | `pnpm boundaries` | **0** | — | `8e2990e8-0923-4265-ab93-16de600e698e` |
| 快照 | `pnpm snapshot:check` | **0** | — | `cf817007-50e5-43f8-a068-64d781334e2b` |
| 发布预检 | `pnpm publish:pre` | **0** | `check-publish --pre：PASS` | `c61d838c-4783-4718-855d-7ed4edd6ab39` |
| 构建（终态） | `pnpm build` | **0** | `tsc -b` 无 error | `2b927af3-68f9-4697-8365-5cf1a8934e8f` |
| 靶向 6 文件 | `node --test delivery-83／cmd-read-t11／render-copy-90／help-center-91／skill-t11／output-naming-87` | **0** | `tests 59／suites 1／pass 59／fail 0` | `786c23d3-926f-4687-ad4a-4cea773afac2` |
| 变异（修后） | `node docs/research/t83-review-blue-mut.mjs` | **0** | 6 支全 OK（§4.2） | `12892dff-d359-4c76-b0b8-2a6294258d46` |
| canonical ① | `pnpm test` | 1 | `tests 1143／suites 134／pass 1117／fail 26`（含 1 例文件级抖动，见 §6） | `4808661c-d9dd-4e58-8b37-f59e960b7931` |
| 失败集 ① | `node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t83/rc2-canonical.log` | 1 | `base=34 after=30 新增=1 消失=5`（抖动项） | `3e841a88-3192-4483-99d7-1b6bbb9be3cc` |
| 抖动单跑 | `node --test packages/skill-calorie/test/fetch-t4.test.mjs` | **0** | `tests 9／pass 9／fail 0` | `84cc67f5-1abd-4e3e-8763-801e0bb03816` |
| **canonical ②** | `pnpm test` | 1 | **`tests 1142／suites 134／pass 1117／fail 25`**（与实施者轮逐字相同） | `13f2b263-8a4d-4f2a-9d3a-562ec9ddb6c4` |
| **失败集 ②** | 同上（`rc2-canonical2.log`） | **0** | **`base=34 after=29 新增=0 消失=5`** | `747eb885-1a24-41c2-abc4-b465b771c1e8` |

- **写盘事故自检（#124）**：`packages/skill-calorie/SKILL.md` 首 3 字节 **`2d 2d 2d`**；`pnpm build` 后 `SKILL.md:31` 仍在（生成器只重写 `HELP-AUTO` 块，块起点 `:79`）。
- **残留扫描**：`MUT-\d` 在 `packages/**`／`tooling/**` 源码面 **0 处**；`git diff --numstat -- packages/skill-calorie/src` **0 行**。
- **未跑**：全量 `t81-exec-smoke.mjs`（派单明令禁止）。
- **过程自认（S3 · 如实）**：本席有 **1 次未持锁的真机 CLI 观测**（为定位 D-6 反例打印 `water.log` envelope，`node dist/cli/cmd_read.js` ＋ `node -e` 解析，只读、未写共享面、未与他票冲突）；其余全部经持锁包装器。

## 6. canonical 失败集（判据＝具名失败集**新增 0**）

- 第 ① 轮（`4808661c`／`3e841a88`）出现 **1 例新增**：`packages\skill-calorie\test\fetch-t4.test.mjs` —— **文件级**失败（`test at …:1:1`，**无错误文本**），同期 `tests 1143`（较实施者轮 +1，系并发他席新增 `packages/base-render/test/base-version-lockstep.test.mjs`，`git status` 可见未跟踪）。
- **本席归因（非 R-2 回归）**：(a) R-2 `src/**` 零改动；(b) 该文件**单跑 9/9 全绿**（`84cc67f5`）；(c) **第 ② 轮复跑逐字回到实施者轮结果**：`tests 1142／suites 134／pass 1117／fail 25`，失败集 `base=34 after=29 新增=0 消失=5`（`13f2b263`／`747eb885`）。⇒ 判为**环境性抖动**（30.7 s 并行 1142 例、锁高争用下的文件级瞬时失败），**不构成 canonical 新增**。
- **判据结论：canonical 失败集新增 0 成立**（消失 5 条均为基线已登记抖动项，与实施者轮一致）。

---

## 7. 缺陷清单

| 编号 | 级别 | 缺陷 | 归属 | 证据 |
|---|---|---|---|---|
| **R2N-1** | **S2**（本票引入 · 文档事实错误） | `.changeset/t83-html-first-delivery.md:9`（并同步记入 `t83-html-first.md:153`）的 D-6 澄清「`--params '{"delivery":"text"}'` **对写键不适用** —— 35 个写键各有参数白名单、未知字段一律拒」被真机证伪：**10 个写键抽样 7 个生效**（exit 0 ＋ `mode=text`）；且与同段前半句「用户明确要文本（`--params '{"delivery":"text"}'`）」自相矛盾。机制：`cmd_read.ts:1040` 是**交付层通用开关**，只有含参数白名单的写键（`write.ts:600/740/779/881`）才拒 | **口径（编排者裁决）＋ 执行未验证（实施者）** | 探针 C（§3）＋ `cmd_read.ts:1040` |
| R2N-2 | S3（引用漂移） | R-2 自述把表标题位置写作 `t83-html-first.md:61`，改后实际在 **`:62`**（蓝队原引 `:61` 为改前行号） | 实施者（文档） | 逐行核对 |
| R2N-3 | S3（审查物文案漂移） | `t83-review-blue-mut.mjs` 的 -3／-6 `what` 文案仍为审查期口径（「既有脚本无覆盖」／「测既有断言是否恒真」），与 `expectRed:true` 后语义不符（本席只改 2 个布尔，未动文案） | 蓝队审查物 | `git diff` = 2+/2− |
| R2N-4 | S3（过程自认） | 本席 1 次未持锁的真机 CLI 观测（§5 末） | 本席 | 自认 |
| R2N-5 | S3（记账） | R-2 未修 D-3／D-7／D-9／D-10／D-11 —— 与编排者裁决一致（不扩大范围）；本席复核**未被夹带**：`bee97bc` 改动面恰 4 文件 | 编排者已记账 | `git show --numstat bee97bc` |

- **负结果（如实记录）**：D-1 口径②与真机一致、行为零改动；D-2／D-4／D-5／D-8 逐字在位且**变异承重**；四门／靶向／canonical 无新增失败；`expectRed`（-3／-6）**已修**且修后复跑证明摘要行可信（§4.2）。

## 8. 机械门禁对账（协议 §2.4）

本席声明窗口：`--ticket 83 --since 2026-09-09T15:59:00.000Z --until 2026-09-09T16:19:00.000Z`（覆盖本席全部 15 次持锁运行；对账轮自身在 `--until` 之后，不入窗口）。

```
GATE-RUN runId=d2c43544-2ca6-449d-a530-971ba164ec58 cmd=pnpm build
GATE-RUN runId=f584c0a4-c553-463f-9226-d5983e7978c4 cmd=node docs/research/t83-recheck-r2-scope.mjs
GATE-RUN runId=6cf8efc4-25be-487b-b4e6-2d60dfa23641 cmd=node docs/research/t83-recheck-r2-scope.mjs
GATE-RUN runId=073f298e-b10f-428e-acb5-325bd402ad45 cmd=node docs/research/t83-review-blue-mut.mjs
GATE-RUN runId=8e2990e8-0923-4265-ab93-16de600e698e cmd=pnpm boundaries
GATE-RUN runId=cf817007-50e5-43f8-a068-64d781334e2b cmd=pnpm snapshot:check
GATE-RUN runId=c61d838c-4783-4718-855d-7ed4edd6ab39 cmd=pnpm publish:pre
GATE-RUN runId=2b927af3-68f9-4697-8365-5cf1a8934e8f cmd=pnpm build
GATE-RUN runId=786c23d3-926f-4687-ad4a-4cea773afac2 cmd=node --test packages/skill-calorie/test/delivery-83.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs packages/skill-calorie/test/render-copy-90.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/output-naming-87.test.mjs
GATE-RUN runId=12892dff-d359-4c76-b0b8-2a6294258d46 cmd=node docs/research/t83-review-blue-mut.mjs
GATE-RUN runId=4808661c-d9dd-4e58-8b37-f59e960b7931 cmd=pnpm test
GATE-RUN runId=3e841a88-3192-4483-99d7-1b6bbb9be3cc cmd=node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t83/rc2-canonical.log
GATE-RUN runId=84cc67f5-1abd-4e3e-8763-801e0bb03816 cmd=node --test packages/skill-calorie/test/fetch-t4.test.mjs
GATE-RUN runId=13f2b263-8a4d-4f2a-9d3a-562ec9ddb6c4 cmd=pnpm test
GATE-RUN runId=747eb885-1a24-41c2-abc4-b465b771c1e8 cmd=node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t83/rc2-canonical2.log
```

GATE-RELAX flag=--allow-nonzero reason=`4808661c`／`13f2b263` canonical `pnpm test` exit 1 系**基线既有红**（判据＝具名失败集**新增 0**，第②轮实测 `base=34 after=29 新增=0`）；`f584c0a4` 为探针**首跑判据预设错**（§2 末，已修正复跑 `6cf8efc4`）；`3e841a88` 为第①轮失败集比对的**抖动 delta**（§6，已由 `747eb885` 复跑归零）。

GATE-RELAX flag=--allow-undeclared reason=对账窗口内存在**他席** `--ticket 83` 运行（如 `bb4ae993` `pnpm build`、`2495d0ac` `t-help-parity-review-b-probe4.mjs` 等，见 `.scratch/locks/gate-runs.log`），非本席执行、不得作为本席证据声明；本席 **15 条声明全部 matched**。

对账命令与实测：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t83-recheck-r2.md \
  --ticket 83 --since 2026-09-09T15:59:00.000Z --until 2026-09-09T16:19:00.000Z \
  --allow-nonzero --allow-undeclared
```

实测：`RESULT: matched=15/15 auditEntries=884 scoped=46 undeclared=31` → **gate-audit: PASS**（exit 0；对账轮 runId `341c69eb-2c24-4cc6-8f3d-3db3e6906ab5`，在 `--until` 之后，不入窗口）。`undeclared=31` 全部为他席 `--ticket 83` 运行（已 GATE-RELAX 留痕）；本席 **15 条声明一对一绑定、0 missing**。

## 9. verdict 与最小整改清单

- **verdict：FAIL**（唯一阻断项＝ **R2N-1 / S2**）。
- 理由：R-2 五条声称中 4 条**成立**（D-1／D-2／D-4-D-5／门禁），但 D-6 的整改**把「把通用写成通用」改成了「把局部写成全称否定」**——新引入一条可被**一条真机命令**证伪的发布面（changeset 会进 CHANGELOG）事实错误，且与其同段首句自相矛盾。按「S2 须关闭前修完」，R-2 **未真闭环**。
- **最小整改清单（1 项阻断；纯文档，无代码／无测试改动）**：
  1. 把 `.changeset/t83-html-first-delivery.md:9` 的「注意」句与 `t83-html-first.md:153` 的 D-6 行，改写为**实测口径**（建议逐字）：
     > **注意**：`--params '{"delivery":"text"}'` 由**交付层**统一识别（`cmd_read.ts:1040`），但写键能否吃到取决于该键的**参数白名单**——白名单键会先拒未知字段（实测 `calorie.body.measure-add`／`calorie.exercise.update` → **exit 2 `不支持字段: delivery`**），其余写键实测可用（`water.log`／`diet.add`／`weight.log`／`exercise.add`／`body.composition-add`／`diet.update`／`profile.set` → exit 0 ＋ `delivery.mode=text`）；要文本回执最稳的路径仍是读键传参或写后读回。
  2. （可选，S3）R-2 自述的 `:61` 更正为 `:62`；`t83-review-blue-mut.mjs` 的 -3／-6 `what` 文案同步为「R-2 后已钉住」。
- 整改后**无须**重跑全部门禁：只需文档 diff ＋（若动 `SKILL.md` 才需）`pnpm build`；本席探针 `docs/research/t83-recheck-r2-scope.mjs` 可逐字复跑复核。

---

## 10. 追加（本席提交后观测）：R-6 订正已在工作区出现 —— 直接指向 R2N-1

- **观测时点**：本席提交 `dc40fa6` 时，`.changeset/t83-html-first-delivery.md`（1+/1−）与 `docs/research/t83-html-first.md`（29+/4−）**已被他席改写为 R-6 订正**（工作区**未提交**），其新增 §11.5 逐字引用本席结论「**定点复核 R2N-1**」并把原句替换为「`--params '{"delivery":"text"}'` 是**交付层通用开关**（`cmd_read.ts:1040`），对读键与**多数写键同样生效**……**例外**＝对**原始 `params` 键**做白名单校验的 3 个写键 …」。
- **本席抽查 R-6 新句（runId `48707706-a4a4-4bbe-8c60-11afd9d9c211`，exit 0）**：

| 写键 | exit | `delivery.mode` | 实测 |
|---|---|---|---|
| `calorie.exercise.update` | 2 | — | `不支持字段: delivery` |
| `calorie.product.update` | 2 | — | `不支持字段: delivery` |
| `calorie.body.measure-add` | 2 | — | `不支持字段: delivery` |
| `calorie.profile.update` | **0** | **text** | 白名单只遍历 `picked`，`delivery` 被忽略、仍生效 |
| `calorie.water.log` | **0** | **text** | 生效 |

⇒ **R-6 新句的事实面成立**（白名单拒＝3 例、profile.update 例外说法成立），较原句准确。
- **新句仅剩 1 条 S3 措辞 nit（不阻断）**：新句把「实测 **10 个写键中 7 个** exit 0」与「例外＝**3 个**白名单写键」并列，但两组**不同源**——本席 10 例中的第 3 个未生效键是 `calorie.goal.water`（exit 4，空库缺目标行，非白名单拒），而 `calorie.product.update` 出自 R-6 自建 6 例探针。建议改为「抽样 **7** 例生效；另 **3** 例白名单键（`exercise.update`／`product.update`／`body.measure-add`）拒之」，去掉「10 个中 7 个」的算术框。
- **verdict 不变（对 `bee97bc`）＝ FAIL**；但**阻断项 R2N-1 已可解除**：编排者只需核对 R-6 的 diff ＋ `runId 59fd4ecd`／`48707706` 即可关闭，**无须新开 R-3**（建议同时落 R2N-2 的 `:62` 订正——R-6 已含）。
