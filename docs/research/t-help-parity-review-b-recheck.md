# HELP 台账 R-3 返修复核（席 B · 口径面）

> **被复核**：commit `4543baa`（`docs(83): 台账返修 R-3（两席审查）——S1x2/S2x9 逐条更正 + 脚本判定由测量产生/evidenceRef/穷举对账/体积闭合`）。
> **复核依据**：本席原报告 `docs/research/t-help-parity-review-b.md`（`05a72ee`：S1×2／S2×6／S3×7）。
> **纪律**：只验证、不改台账；持锁 `--ticket 63`；不改他人文件；`commit --only`；**不 push**。
> **本席复跑证据**：`probe`→`9b6cbf68…`／`probe2`→`d0e4e8e6…`／`probe3`→`fcd32a28…`／`probe4`→`3d2a1124…`／`probe5`（新写）→`f87b0f1d…`／
> `compare.mjs` 复跑→`e0631d4a…`（`RESULT: 23/23 compare-checks`）。

## 0. 结论摘要

**verdict = FAIL**（五维 **86/100**：契约一致 26／证据真实可复现 23／parity 15／工程红线 14／文档同步 8）。
**8 项返修中 7 项闭环、1 项未闭环且引入 1 条新的 S1**：

- ✅ **S1-1／S1-2／S2-1／S2-2／S2-3／S2-5／S2-6 全部闭环**（逐条复算见 §1–§7）；`ledger.json` **确定性已验证**（复跑前后 sha256 逐字相同、`23/23` 断言通过）。
- ❌ **新增 S1-交付缺陷（口径面）**：D6「**Tab 形态**」行判定被 R-3 改成「**一致**」，而
  ① 该行自己的值列就是「横滑页＋底部 tabBar」vs「radio 标签条（11 个 `.tab-input`）」；
  ② 该行的 `evidenceRef=D6.newCss.mediaQueries` **两侧不同**（旧 3 条 `500/501/820` → 新 5 条 `820/720/640/400`）；
  ③ 该行的 `rule` 测的是**第三个**数据（`om.jumpPage !== nm.jumpPage`，两侧恒 `true`）。
  → **判定与证据三向脱钩**（本席 probe5 机器筛出：18 条「一致」行中**唯一** ref 两侧不同者即此行）。
  连带：原「断点」行消失，行内出现**悬空引用**「见下「跳页／断点」两行」，而 G-4（断点归 #89）的证据指针仍写「D6「Tab 形态」」→ **G-4 的证据链已断**。

## 1. S1-1 · 22/22 条 legacy 不同源 —— **闭环**

| | 内容 |
|---|---|
| 改前 | 「18 条不同源＋4 条两处皆无」 |
| 改后 | 「**22/22 条不同源**（18 双命令＋4 条卡级有原文／Sheet 无字段行）」；风险 1 与 G-3 同步 |
| 本席复算 | `probe4 R9`：`22 条 legacy 中：Sheet 有 CLI 18 ／Sheet 无 CLI 4`；`probe`（新 runId）逐卡取证 4 条均有 `<code class="ilife-help-shell-cli">mavis…/python…</code>` 且 `field rows: 0` |
| 判定 | ✅ **闭环**（数字、措辞、G-3 范围三处一致；`compare.mjs:420` 新增断言 `legacyBothDifferent + legacyCardOnly === 22`） |

## 2. S1-2 · 零渐变 H-04 —— **闭环**

| | 内容 |
|---|---|
| 改前 | 「L-17 零渐变判据作废，改按 CSS 区判」→ 差异（可解释） |
| 改后 | 删除该消解写法；新值写「与 H-04『命中数 = 0』**冲突，未消解**」；旧侧标 **OLD-DEVIATION**；归属改 **#89（裁定）＋#83（登记）** |
| 本席复算 | `ledger.json` D6 行 = `差异（可解释）`，evidenceRef `D6.newCss.linearGradients`（旧 1／新 1）；md 正文已无「判据作废」的实质用法（仅存于 §9 更正说明） |
| 判定 | ✅ **闭环**（`compare.mjs:245` rule 由 `linearGradients.length > 0` 双条件产生） |

## 3. S2-4 · 体积闭合 —— **数字已披露，但两条新断言是恒等式（鉴别力 0）**

| | 内容 |
|---|---|
| 改后 | 新增「体积构成（块口径闭合）」行：`markup 953,821＋payload 块 270,313＋style 块 21,031＋js 块 19,657 ＝ 1,264,822（残差 0）`；新增「体积残差（两处）」行（新 86 B／旧 120 B）；增减行改 `962,036 ＋ 标签壳 −34 ＝ 962,002` |
| 本席复算 | `probe`：新侧内容口径残差 **86**、旧侧 **120**、增减 gap **34**；`probe5`：**标签壳真恒等式成立**（新 54+15+17=86；旧 56+30+34=120；Δtags −34 = shellDelta） |
| **缺陷** | ① `so.blockSum = markup + payloadBlock + styleBlock + jsBlock`，而 `markup` 的定义就是「文件 − 全部 script/style 块」⇒ `blockResidual === 0` **恒真**（`compare.mjs:430` 断言零鉴别力）；② `innerDeltaSum + shellDelta === delta` 是代数恒等式（`shell ≡ total − inner`）⇒ `compare.mjs:431` 同样恒真。两者在 md 里被写成「严格闭合」 |
| 判定 | ◐ **部分闭环**（披露 ✅／断言 ❌）→ 见缺陷 R3-B-2 |

## 4. S2-1 · G-5 归属 —— **闭环**

| | 内容 |
|---|---|
| 改前 | 缺口清单 G-5「归 #83（如需改判归 #91）」 |
| 改后 | G-5 划除并标注「**已移出缺口清单**：属 #91／#83 规格内行为，改登记为 §1.1 观测点＋命名歧义」；§1.1 写「`mode` 参数面＝**#91 主**／`delivery` 字段面＝**#83 辅**」＋「**inline 产物在磁盘**（`…_2.html` 994,295 B），浏览器夹具须读文件」 |
| 本席复算 | `probe` ENV 行：inline `dataMode=inline`／`delivery.mode=file`／`output=…_2.html`（在盘）✓ |
| 判定 | ✅ **闭环**（归属顺序、归类、#89 接口三项全中） |

## 5. S2-2 · G-2／风险 3 —— **闭环**

| | 内容 |
|---|---|
| 改后 | G-2＝「**HELP Sheet 内无必填阻断**（F3 `getMissing` 无对应物）」；注明「#86 配置型 wizard **已落地**（`016bf9f`／`18354fe`／`aef6ae0`／`90128d8`），Sheet 字段运行时换 `input`」；风险 3 改为**时效风险（222/341）** |
| 本席复算 | `probe3`：字段行运行时 `createElement("input")`＋`input→refreshPreview`；`getMissing=false`；`compare.mjs:428` 断言 `old.sheetValidate===true && new===false` |
| 判定 | ✅ **闭环**（「新版拿不到填写入口」已删） |

## 6. S2-3 · G-1 归因 —— **闭环**

| | 内容 |
|---|---|
| 改后 | 删「#88 已登记 **95 键**无计划写键」；改「**#81 non-exec 110 − 漂移 15 ＝ 95**（out-of-scope 10 ＋ legacy-chain 85）」，4 条按 reason code（`noNoteFilter`×1／`oosCron`×3） |
| 本席复算 | `probe4 R8` 95 条分布逐组同；`compare.mjs:419` 断言文案同步为「#81 non-exec 110 − 漂移 15」 |
| 判定 | ✅ **闭环** |

## 7. S2-5／S2-6 · 两条新侧偏离登记 —— **闭环**

| 项 | 改后 | 本席复算 | 判定 |
|---|---|---|---|
| S2-5 冻结日期命令 | D5 新增行「CLI 参数含冻结绝对日期 **222/341**」＋ G-7（归 #81 后续票）；风险 3 换为此项 | `probe2`：`PAYLOAD cli fields with ISO date: 222 of 341`；样例 `--params '{"date":"2026-09-07"}'` | ✅ |
| S2-6 字体栈／gradient | D6 新增行「正文字体栈（H-06）＝**新版缺失**」＋ G-8（#89 裁定）；零渐变行并入 H-04 冲突 | `probe2`：`-apple-system=false／PingFang=false`；`old.css.fontStack=true` | ✅ |

## 8. S3-1 · 脚本加固复核 —— **主体落地，3 处未闭合**

| 加固项 | 台账声称 | 本席复核（读码＋复跑） | 判定 |
|---|---|---|---|
| verdict 由测量产生 | 50 行全部 `rule(实测值)`；`? A : A` 已删 | `add(...,rule,...)`→`verdict = rule()`（`compare.mjs:62-66`）；全文无 `? A : A` 恒真分支 | ✅ |
| 每行 `evidenceRef` | 50/50 可解析 | `resolveRef` 断言 `badRefs.length===0`；`probe5` 确认 50 行均带 ref | ✅（**但仅路径存在性**，非语义对应 → §0 的 Tab 行即反例） |
| 穷举对账 | 17 个可枚举差异键 100% 覆盖 | `enumPairs` 共 21 键，实际差异 17 键、覆盖缺口 0 ✅；**但 `scene.fieldKeys`／`group.fieldKeys` 的值是硬编码数组**（`compare.mjs:311-315`），不是从解析 JSON 的键集产生 | ◐ |
| 覆盖判定 | 「未覆盖即红」 | `uncovered = enumDiffs.filter(d => !d.coveredBy \|\| !rowItems.has(d.coveredBy))` → **只查覆盖行是否存在**，不查该行判定是否为非「一致」。`probe5` 实证：`css.mediaQueries`（真差异）被 `Tab 形态`（一致）「覆盖」 | ❌ |
| 体积闭合断言 | 「块口径残差 0」＋「增减闭合」 | 两条均为恒等式（§3） | ❌ |
| `ledger.json` 确定性 | 去 `generatedAt`，sha256 `e8233c78…adca45` | **复跑前后 sha256 逐字相同**（`e8233c78a1f019348dd3426b843575a04b416e11b0434a23cca5f77de1adca45`）＋ `RESULT: 23/23` | ✅ |
| inline／file 关系 | 分段 sha 相等＋子串命题钉 false | 本席未逐段复算（属 A 席面）；`compare.mjs` 有该断言 | 未复核 |
| 禁用 `wake_word` join | 改 `(子分组 id, 组内序)` | `probe4 R5` 对齐键 436 | ✅ |

**md ↔ `ledger.json` 一致性**：50 行、`一致18／可解释18／新增11／缺失3`、D1–D7 逐维分布与 md 表头**全部一致**；
`probe5` 报的 4 条「md-missing」＋1 条「verdict mismatch」经逐条人工核对**均为匹配器口径假阳性**（反引号/措辞差异与 §9 行干扰），非真实不一致。

## 9. 缺陷清单（R-3 复核）

| # | 级别 | 缺陷 | 证据 | 归属 |
|---|---|---|---|---|
| **R3-B-1** | **S1 交付缺陷** | D6「Tab 形态」= **一致**：值列两侧不同、`evidenceRef`（mediaQueries）两侧不同、rule 却测 `jumpPage`（两侧恒 true）→ **判定与证据三向脱钩**；且行内悬空引用「见下「跳页／断点」两行」（无断点行），G-4 的证据指针仍指此行使断点差异**无行可依** | `ledger.json` 该行 `verdict=一致`／`evidenceRef=D6.newCss.mediaQueries`；`probe5` 输出 `BIND-MISMATCH \| Tab 形态`；md:123；md:204（G-4） | #83 台账返修（口径面） |
| R3-B-2 | S3 断言无鉴别力 | D7「块口径闭合」断言 `blockResidual===0` 与「增减闭合」断言 `Δinner+Δshell===Δtotal` 均为定义式/代数恒等式，恒真；真实可断言的恒等式是标签壳式（新 86／旧 120／Δ−34） | `compare.mjs:430,431`；`probe5`「鉴别力 0：true」 | #83（脚本） |
| R3-B-3 | S3 穷举对账名不副实 | `scene.fieldKeys`／`group.fieldKeys` 为硬编码数组，非由解析 JSON 键集产生 → 新增字段不会被告警；覆盖判定只查「覆盖行存在」，真差异可被「一致」行覆盖（mediaQueries 实证） | `compare.mjs:311-315,435`；`probe5` | #83（脚本） |
| R3-B-4 | S3 证据绑定弱 | `evidenceRef` 只做「路径可解析」，不做「旧/新取值与判定方向一致」校验（R3-B-1 即因此漏网） | `compare.mjs:410-412` | #83（脚本） |

## 10. 五维评分与 verdict

| 维度 | 满分 | 得分 | 依据 |
|---|---:|---:|---|
| 契约一致 | 30 | **26** | G-5（#91 主/#83 辅、inline 在磁盘）、零渐变交 #89 裁定、#86 状态更正、#81 漂移链——契约面全部正确；扣：D7 两条恒等式断言被写成「严格闭合」 |
| 证据真实可复现 | 25 | **23** | `ledger.json` 复跑前后 sha256 逐字相同＋`23/23`；本席 4 探针复跑逐项同值；扣：穷举对账硬编码键集、evidenceRef 仅路径级 |
| parity | 20 | **15** | 22/22、222/341、字体栈、payload 顶层键、L-16/L-10 对账全部登记；扣：Tab 形态误判为「一致」并吞掉断点行（R3-B-1） |
| 工程红线 | 15 | **14** | 仅改自己 4 个文件、持锁、未跑全量 test／`t81-exec-smoke`、`commit --only`、未 push、`SKILL.md` 首 3 字节 `2d 2d 2d` |
| 文档同步 | 10 | **8** | §9 逐条处置表＋reason code＋新行齐备；扣：悬空引用与 G-4 断链 |
| **合计** | **100** | **86** | |

## **verdict：FAIL**（判据：**S1 ≥ 1**；本次新增 R3-B-1 为 S1）

### 最小整改清单（3 项，均为单点改动）

1. **修 R3-B-1**：D6「Tab 形态」行二选一——(a) 恢复为「**差异（可解释）**」并把断点值写回值列（旧 `500/501/820` → 新 `820/720/640/400`），rule 改为直接测 `mediaQueries`（`JSON.stringify(old.css.mediaQueries) !== JSON.stringify(new.css.mediaQueries)`）；
   (b) 或删除该行并把 L-07/L-13 说明并入「跳页」行。**同时**删悬空引用，把 G-4 的证据指针指向实际承载断点值的行。
2. **修 R3-B-2**：把 D7 两条断言换成非平凡恒等式——`(payloadBlock−payloadInner)+(styleBlock−styleInner)+(jsBlock−jsInner) === innerResidual`（新 86／旧 120）与 `Δtags === shellDelta`（−34）；删除或改写「块口径闭合」的表述（其残差 0 由定义产生）。
3. **修 R3-B-3／R3-B-4**：`scene.fieldKeys`／`group.fieldKeys` 改为从解析 JSON 的键集产生；覆盖判定加「覆盖行 verdict ≠ 一致（或该行显式标 OLD-DEVIATION/N-A）」；`evidenceRef` 加方向一致性校验（ref 两侧相等 ⇒ 该行不得为「差异/缺失」）。

## 11. 机械门禁对账

```
GATE-RUN runId=9b6cbf68-d02d-4c3b-b1d6-450dc0992f68 cmd="node docs/research/t-help-parity-review-b-probe.mjs"
GATE-RUN runId=d0e4e8e6-824c-4958-ad97-5fada95c19f4 cmd="node docs/research/t-help-parity-review-b-probe2.mjs"
GATE-RUN runId=fcd32a28-9ce2-4c95-a472-a1fe999bcd09 cmd="node docs/research/t-help-parity-review-b-probe3.mjs"
GATE-RUN runId=3d2a1124-8909-4534-9892-ed3e370058ea cmd="node docs/research/t-help-parity-review-b-probe4.mjs"
GATE-RUN runId=f87b0f1d-33e3-4252-b643-4ea1d35b1422 cmd="node docs/research/t-help-parity-review-b-probe5.mjs"
GATE-RUN runId=e0631d4a-c294-4eff-a840-1073fecedcff cmd="node docs/research/t-help-parity-compare.mjs"
```

```
GATE-RELAX flag=--allow-undeclared reason=对账窗口内同时有 #79/#83/#89 等他席并发运行（pnpm build／cmd_read 三态／t81-route-evidence／各票探针），非本席声明面；本席 6 条已逐条声明
```

**本报告自身对账（实测）**：

```
$ node tooling/run-locked.mjs --ticket 63 -- node tooling/check-gate-audit.mjs `
    --evidence docs/research/t-help-parity-review-b-recheck.md --ticket 63 `
    --since 2026-09-09T16:15:00Z --until 2026-09-09T16:25:00Z --allow-undeclared
RESULT: matched=6/6 auditEntries=879 scoped=6 undeclared=0
gate-audit: PASS
```

**确定性复算（实测，逐字）**：

```
SHA-BEFORE e8233c78a1f019348dd3426b843575a04b416e11b0434a23cca5f77de1adca45
$ node docs/research/t-help-parity-compare.mjs
RESULT: 23/23 compare-checks
SHA-AFTER  e8233c78a1f019348dd3426b843575a04b416e11b0434a23cca5f77de1adca45   ← 与台账 §6/§8 所载一致
```

**R3-B-1 机器筛出（probe5 输出，逐字）**：

```
MD rows 96 | ledger rows 50 | md-missing 4 | verdict mismatch 1 [["命中计数／空态文案逐字","一致","exit"]]
-- verdict=一致 的行 × 其 evidenceRef 指向值 --
ok | 搜索（输入框＋清空＋计数） | ref=D6.oldMarkers.searchPlaceholder | old=true new=true
ok | 命中计数／空态文案逐字 | ref=D6.newMarkers.hitCountText | old=true new=true
BIND-MISMATCH | Tab 形态 | ref=D6.newCss.mediaQueries | old=["@media(min-width:501px){","@media(max-width:500px){","@media (max-width: 820px) {"] new=["@media (max-width: 820px) {","@media (max-width:720px){","@media (max-width: 640px) {","@media (max-width: 400px) {","@media (prefers-reduced-motion: reduce) {"]
-- D7 体积恒等式 --
blockSum=markup+blocks 且 markup 定义为 total−blocks ⇒ blockResidual 恒 0（鉴别力 0）： true | old true
标签壳真恒等式（非平凡）：new tagBytes 86 == innerResidual 86 ? true | old 120 == 120 ? true
增减真恒等式（非平凡）：Δtags -34 == shellDelta -34 ? true
台账断言用的 Δinner+Δshell==Δtotal 为代数恒等式（鉴别力 0）： true
enumPairs 是否含硬编码键集（非由解析 JSON 产生）： true
enumDiffs 实际差异键数 17 | 覆盖缺口 0
enumDiffs 中由 verdict=一致 的行“覆盖”的键： css.mediaQueries → Tab 形态 (一致)
```

## 12. 自检

```
$ [System.IO.File]::ReadAllBytes("D:\ilife\packages\skill-calorie\SKILL.md")[0..2]
2d 2d 2d          ← 非 00 00 00
```

- 本席零改动台账／脚本／`packages/**`／`tooling/**`／既有 `docs/**`；仅新增本文件与只读探针 `t-help-parity-review-b-probe5.mjs`。
- **未**跑全量 `pnpm test`／`t81-exec-smoke.mjs`。

## 13. 复跑（逐字命令）

```powershell
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-parity-review-b-probe.mjs
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-parity-review-b-probe2.mjs
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-parity-review-b-probe3.mjs
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-parity-review-b-probe4.mjs
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-parity-review-b-probe5.mjs
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-parity-compare.mjs   # 复跑后 ledger.json sha256 应仍为 e8233c78…
```
