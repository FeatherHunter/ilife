# #88 实施 B 段 · 蓝队审查报告（契约／并发／门禁／纪律）

> 审查者：蓝队席（独立 session，只读源码／tracker／共享审计日志）。被审：`e3690df`→`f2d4be0`→`c49b608`→`0ff4deb`→`a300403`（HEAD `a300403`；该 commit 的父是 `11be0c7`#97 → B 段 4 commit 与 #97／#120 **交错提交**）。
> 依据：协议 §2／§2.1／§2.2／§2.3／§2.4／§3／§5.1／§6＋§6.1；`.scratch/orchestrator/t88-acceptance.md`（A1–A8）；`docs/research/t88-plan.md` v2 §3；`t88-delta-flake-ruling.md` §2／§5；`dispatch-rules.md` §4.5。
> 复跑现场 `.scratch/orchestrator/blue5-*`（gitignored）；**未改任何源码／证据正本／tracker**。
> 审查期间 HEAD 前进到 `7b4e891`（`tooling/check-gate-audit.mjs` ＋ 治理返修证据，**不含 B 段路径**）；本报告结论以 `a300403` 为准。

## ① 禁区与冻结面
- **B 段真实改动面＝5 commit 并集 7 文件**：`packages/base-render/src/{controls,style}.ts`、`packages/base-render/test/help-center-js-88.test.mjs`、`docs/research/t88-{probe-impl-b.mjs,browser-evidence-b.mjs,impl-b.md}`、`.changeset/t88-help-center.md`。逐 commit `git show --stat` **全部落在声明路径内**。
- ⚠ **口径提醒**：派单给的 `git diff 4d98e5f..HEAD --stat` 实测只含 `11be0c7`(#97)＋`a300403`，**不是** B 段面。我改按 5 commit 并集独立复算。
- 禁区零改动（`git diff 678f113..a300403 --name-only -- <路径>` 全空）：`help.ts`／`cmd_read.ts`／`keys.ts`／`templates/*`／`plugin-*`／其余 5 技能／`SKILL.md`。
- 冻结面独立复算（读 dist）：**130 implemented／0 pending**；`src/spec/*` 零改动 → **零新增契约面**。
- `style.ts` 只动 helpShell 区：3 个 hunk——`@507` 纯注释（登记第二个类名产出者）、`@856(+129)`／`@1006(+10)` 全在 `SECTION_BUILDERS.helpShell`（`style.ts:513-1015`）内。新类只用 11 个冻结 token（独立扫描 `NEW_CLASS_ALIEN_TOKENS=[]`）；全 CSS 仅 1 处 `gradient`（charts 区，合 P-4）。

## ② 类名合规（上轮 D-1）＋ N-4
- **独立重算 T9**：CSS 143 个 `ilife-*` 类名，闭集外 **0**。
- **独立重算 T11**（`cls()` 实参 57 条）：helpShell 67 个类名，臆造 **0**；14 个走 `startsWith` 借道（含本段 11 个新后缀），**逐一核对借道来源均为 help.ts 真产出类名**（`card`／`subgroup`／`tab`／`page`／`field`／`btn`）→ **D-1 仍闭合**，无「借道空转」。
- **N-4 闭环且判据有鉴别力**：`help-center-js-88.test.mjs:404` 断言 `classExact===436`（`:266` 判据＝注入按钮 `className` **恰等于** `ilife-help-shell-card-copy`），叠加 computed `display:flex`／`border-radius:999px`。我的**内存变异探针**（删产出文本里 `btn.className = CARD_COPY_CLASS;` 一行，不改源码）实测：卡头按钮仍 6 个而该类名 **0** → 断言非空转满足。

## ③ 纯度／零依赖
- 我**持锁独立跑** `contract-signatures.test.mjs` → **exit 0**（runId `d0b9cd73-4021-4540-8ffe-9b6d575e4382`）。
- FX-18 五布尔量独立复算：键集恰 5 个、全 true（`selfContained`／`idempotent`／`domAllowed`／`forbidGlobalAssignment`／`forbidNodeBuiltins`）。
- 产出文本（缺省／`prefix=x-`／`dataAttr` 覆盖三输入）＋ B 段 **562 行新增源码**：`window.<id>=`／`globalThis.<id>=`／`node:`（4 种写法）／`<canvas>`／`classList`／内联 `on*` **全 0 命中**（唯二命中是注释文字）；渲染页 `<canvas>` 0。

## ④ 共享面门禁（逐条 exit；全部经 `tooling/run-locked.mjs --ticket 88`）
| 门 | exit |
|---|---|
| `pnpm build`／`boundaries`／`snapshot:check`／`publish:pre` | **0／0／0／0** |
| `contract-signatures`／`style`／`help-center-js-88`／`help`／`controls` | **0×5** |
| `t88-probe-impl-b.mjs`／`t88-browser-evidence-b.mjs`（CDP 真浏览器） | **59/59**／**29/29**（均我独立复跑） |
- `snapshot:check` exit 0 ⇒ 其余技能 HTML 快照不变（R1-8 满足）。跑后 `SKILL.md` 自检为空；774 个 tracked 文件零填充扫描 **0 命中**。

## ⑤ delta 分类合规（§5 五条守卫逐条核实）
- ① 四个崩溃文件（`output-naming-87`／`cmd-read-t11`／`cmd-write-40-persist`／轮 9 的 `cmd-write-40`）**均不在 #88 路径所有权内** ✓；② 轮 1 签名逐字复核 `AssertionError: exit=3221225477 stderr=`（空，`output-naming-87.test.mjs:58`）✓；③ 四个名字在基线两轮 canonical（`09b`／`09c`）**均 ✔** ✓；④ 每个名字 9 轮中只出现 1 次（无连续 ≥3 轮）✓；⑤ **轮 1／2／8 有单独复跑证据（fail 0），轮 9 的 `体重记/改/删/批量…` 无单独复跑 → 严格读应判 C 类**（D-3）。
- 白名单未改：`git diff 93e27f9 -- test-failset.txt` = **0 行** ✓。
- 我的 1 轮 canonical `pnpm test`（runId `831eef53-6d39-4a56-b750-22ce63736a9d`，waitedMs=10012）：exit 1，`新增=37／消失=5`。**37 条全部来自他票在途改动**——35 条 `#97 · M5 四要素`（A 类内容断言）由**并发 session 21:18:27 留在工作区的未还原变异** `receipt.ts:110 // MUT-97-2` 造成，2 条 #120 软删 WIP；**#88 路径新增 0**。该轮**被污染**，不作本票 delta 依据（留证 `.scratch/orchestrator/blue5-test-b10.log`）。

## ⑥ 提交与 tracker 纪律
- 5 commit 逐条只含声明路径；`.tmp-*／t123-release-evidence／decision-116-3q` 等仍**未跟踪** ⇒ 无 `git add -A` 痕迹。
- `git reflog --all` 无 `stash／reset --hard／checkout --／clean／switch`；`git stash list` 空；**未 push**（`origin/master` 仍 `90128d8`，master 领先 29）。
- `docs/research/t88-*` 受跟踪 **45 条**（impl-b／probe-impl-b／browser-evidence-b 均在册）。
- #88：**state=OPEN**（未提前 close）、assignee 仍 `FeatherHunter`；票面首 3 字节 `## `（无 BOM）、CRLF 0／裸 LF 85、字面 `\n` **0**；末条评论＝B 段完成回报。

## ⑦ 断电恢复复核
- `git fsck` **exit 0／error 0 行**（14 个悬空提交，与恢复笔记一致）；`.git/refs/heads/master` = 41 B ASCII＋LF 无 BOM 且 == HEAD；零填充扫描 774 tracked **0 命中**；`SKILL.md` 26,992 B == HEAD。
- 留痕齐备：`issue124-second-instance.md`（21:08）＋ `git-master-ref-corrupt-20260909.bak`（41 B）＋ #124 第二例评论；`write.ts` 已还原到 HEAD（`git status` 空）。
- **悬空锁**：当前无悬空锁、`LOCK-STOLEN` **0** ⇒ 「清理」既无可复核留痕也无可清理对象（B 段 `commit-msg-b5` 亦自证「无悬空锁」）→ 记为不可复核（D-6）。
- ⚠ **范围外**：并发 #97 此刻把变异 `MUT-97-2` 留在 `receipt.ts`（mtime 21:18:27；备份 `.scratch/t97/receipt.ts.bak`）→ 「变异只在自己持锁区内」这条纪律**无机制保障**（D-5）。

## ⑧ 自设新探针（被审脚本覆盖不到；`.scratch/orchestrator/blue5-probe.mjs` **51/51 fails=0**）
1. **prefix 覆盖面**：被审的 T9／T11／S4 **全部只跑缺省前缀** → `helpShellSlug()` 退化成字面量也全绿。我用 `prefix=x-` 双向对齐（产出类名 ⊆ CSS 规则、无缺省前缀残留）→ 通过。
2. **非 HELP 页零副作用**（实施者 §7 自认未测）：真实浏览器注入 helpers 到**无 HELP 壳**页面 → helpShell 类名元素 0／卡级按钮 0／搜索框 0／backTop 0，既有 marker 仍 1 → 通过。
3. **判据鉴别力反证**：见 ②（内存变异 → 类名 0 而按钮仍在）。
4. 附带独立复算：token 闭集、渐变计数、`<canvas>`、FX-18 五布尔量。

## ⑨ 缺陷清单
| # | 级别 | 归属 | 内容 |
|---|---|---|---|
| **D-1** | **S1-过程违规** | 本票范围 | B 段**全部** build／test／`tsc -b`／`node --test` 运行（9 轮 canonical `pnpm test`、四门×3 轮、靶向、变异重建、flake 复跑）**均走 `.scratch/t88/*.ps1` 的旧式内联目录锁循环，未用 §2.4.1 强制要求的 `tooling/run-locked.mjs`** → `gate-runs.log` 中 ticket=88 的 `pnpm test` 仅 6 条、四门条目亦无一条对应 B 段运行时刻（20:51／21:01／21:09；21:08:55 那批属治理返修的 `t88-fix-final-*`）；证据**零 `GATE-RUN` 声明** ⇒ §2.4.2 无法对账。§2.4.5 明定「不经包装器＝裸跑＝S1-过程违规」；§2.4 生效时点 `a8d5c1f`=**20:44:49**，晚于它的正是上述全部运行。减轻事实：这些运行**确实持有同一目录锁**（无并发写风险），且旧循环缺「先探活／归属校验／路径守卫／落盘」四项（R-2-1…R-3-x 所修）。 |
| D-2 | S3 | 本票范围 | 证据 §3.1 写「8 轮并集 `union=31`」，与其自引日志 `run-delta-union-b8.log` 的 `union=32` 不符（`34−5+3=32` 算术自证）。 |
| D-3 | S3 | 本票范围 | 轮 9 的 B 类判定（`cmd-write-40.test.mjs:53`）**缺 §5.2.5 要求的「单独复跑 ≥2 次全绿（命令＋输出）」** → 严格读应判 C 类；该条属 #120 面，不影响 #88 自身 delta=0。 |
| D-4 | S3 | 本票范围 | flake 复跑的**命令**未随证据入仓（在 gitignored 的 `.scratch/t88/flake-b.ps1`／`flake-b2.ps1`），证据只给日志名。 |
| D-5 | S3 | **范围外** | 并发 #97 把未还原变异留在 `receipt.ts`（`MUT-97-2`）→ 我轮 10 出现 35 条假失败；建议加「变异期禁跨 session 全量」或「变异前后 sha256 公示」。 |
| D-6 | S3 | 范围外 | 「悬空锁清理」无留痕（`LOCK-STOLEN`=0）——按 §2.3.2 只能记为不可复核。 |

## ⑩ 五维与裁决
| 维度 | 分 | 依据 |
|---|---|---|
| 契约一致 30 | **29** | 130/0＋零新增契约面＋T9/T11 独立重算双绿＋`help.ts` 零改动 |
| 证据真实可复现 25 | **22** | 四门／五靶向／59/59／29/29／探针 51/51 全部我复现；扣 D-2／D-3／D-4 |
| parity 20 | **18** | 卡级按钮 436/436、`data-t` 逐字、幂等、无 JS 降级、F3 逐字文案、H-19 `#backTop`；扣：Sheet 预览真实数据不可观测、卡面文案取「复制指令」 |
| 工程红线 15 | **8** | 无危险 git／无 push／无 install／路径守卫齐备；**扣 7＝D-1** |
| 文档同步 10 | **7** | D-2／D-3／D-4 ＋ 证据未记 §2.4／GATE-RUN |
| **合计** | **84** | (29+22+18+8+7) |
| **verdict** | **FAIL** | §6.1 ④：S1-过程违规**默认 FAIL**；D-1 尚无 §6.1 ② 四要件具名处置；且合计 84 < 85。**交付物本身无 S1-交付缺陷**（契约／parity／纯度／共享面门禁全绿）。 |

**处置建议（审查者建议，非裁决）**：D-1 若由编排者按 §6.1 ② 出具具名书面处置，三项补偿控制中「持锁复跑证明无分歧」**我已提供**（四门 0／五靶向 0／59/59／29/29／探针 51/51），「落盘可复核」自 runId `d0b9cd73`／`831eef53` 起成立，「机械门禁」此后经包装器；此时 D-1 降 S3、工程红线维度回补至 ~13、合计 ≈89 → **PASS**。**但**：A 段已就同一票的锁违规取得过 §6.1 ② 处置，本段再犯将触发 **§6.1 ② 4 累犯升级**（作废重做）——是否认定「同一类」由编排者裁定，审查者无权援引。D-2／D-3／D-4 随证据修；D-5／D-6 转 flake／事故票；**本席不自行关票**。
