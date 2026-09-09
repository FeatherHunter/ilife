# #88 · 未持锁过程违规 · 具名书面处置（A 档）

> **处置人（具名）**：编排者 session `73a70fbf-e1f6-4de5-9d9b-5d3676854e74`（本文件即处置正本）
> **依据**：维护者拍板 A 档 —— `docs/research/t88-decision-lock-violation.html`（commit `ff80f47`）；两席审查 红队 `678f113a`／蓝队 `1d64a0c3`
> **条号**：`docs/subagent-concurrency-protocol.md` §2（`:18`）＋ §6（`:136`）＋ 本次新增 **§6.1**（`:138-167`）／**§2.3**（`:69-79`）／**§2.4**（`:81-91`）
> **适用范围**：**一次性、仅限本事件；不类推**（§3）
> **在 #88 的定性**：**过程缺陷（S3，不阻断关闭）**（§6）
> **执行**：本处置的落仓与门禁自证由受派 subagent 执行；票面 #88 与地图 #63 `Decisions` 的同步登记由编排者完成（本席未代行）。

## 1. 违规事实

| 项 | 事实 |
|---|---|
| 时间 | 2026-09-09 约 **20:27–20:28**（实施 A 段变异核对期间；自认落盘于提交 `bf43324` `20:28:51`）。该次运行**无任何可审计产物**，精确时刻不可复核 —— 见下行。 |
| 动作 | 核对变异 **MUT-A** 还原是否干净时，**直接运行一次 `node --test …`**，**未持锁** |
| 条号 | §2（`:18`）把 `pnpm test`／`node --test` 明文列入**必须持锁**项且**无只读豁免**；§6（`:136`）明文「绕过锁跑 build/test/git…＝ **S1 违规**，该票成果作废并重做」 |
| 自认 | `docs/research/t88-impl-a.md` **§7-5**（`:144`）主动如实登记并请编排者裁决；其后全程持锁 |
| 取证缺口 | `.scratch/t88/run-force-build.log` **为空**；`WAITED_*` 当时只 `Write-Host`、**未落盘** → 「当时锁为空」**不可独立复核**（蓝队 `…-blue.md:39`）。此缺口即补偿控制②要补的洞。 |
| 实质风险 | 四维全指向**零实质风险**：① 未写共享面（新代码零 `node:`／零 fs 写；靶向测试不写 `SKILL.md`，三轮 CLEAN）；② 当时锁空闲（同序列 `WAITED_*=0`，但**不可复核**）；③ 结论可独立复现（两席持锁复跑与那次自检**无分歧**）；④ 主动自认、无掩盖 |

## 2. 裁定：A 档（不重做）

1. **档位**：**A 档 —— 具名书面按比例处置**。**不**按 §6 字面作废重做，**不**重跑实施／审查。
2. **理由**：
   - 四维风险事实（§1 末行）全部指向零实质风险，且该次运行**未写任何共享可变状态**（锁保护的正是 `dist/`／`.tsbuildinfo`／git index）；
   - **两席持锁复跑无分歧**：红队 `678f113a` §①、蓝队 `1d64a0c3` §③ 各自持锁复跑，结论与那次未持锁自检一致（详见 §4①）；
   - 交付物本身**无技术性 S1**：红队 93/100、蓝队 87/100，两席 FAIL **完全由本条过程违规触发**（蓝队 `…-blue.md:85` 明文）。
3. **效力**：本处置成立后，#88 实施 A 段按 **PASS（红队 93／蓝队 87）** 成立（依蓝队 §⑧ 给出的显式条件）。
4. **边界**：本裁定**不**触及 **S1-交付缺陷** 的后果路径（仍字面作废重做）；也**不**为任何其它票、任何其它违规创设口径。

## 3. 具名 · 一次性 · 不类推

- **具名**：处置人为编排者 session `73a70fbf-e1f6-4de5-9d9b-5d3676854e74`，**引条号 §6.1**。比例处置是**编排者的具名行为**；**实施者／审查者无权自行援引**（协议 §6.1 ③），审查者只能出建议。
- **一次性**：仅针对 **2026-09-09 那一次** 未持锁 `node --test` 运行；对其它时间／其它命令／其它票**一律无效**。
- **不类推**：本处置**不得**作为后续同类违规的先例。后续同类违规默认回到 §6 字面（**FAIL ＋ 作废重做**），除非编排者就**该次**另出具名书面处置。
- **四要件**（缺一即本处置不成立，回到字面作废重做）：① 具名书面处置（票面 ＋ 地图，引条号／一次性／不类推）；② 三项补偿控制；③ 记为过程缺陷 S3；④ 累犯升级。

## 4. 三项补偿控制（逐条 ＋ 落地状态）

### ① 持锁复跑证明无分歧 —— **已完成（两席各自独立完成）**

| 席 | commit | 持锁复跑内容 | 结论 |
|---|---|---|---|
| 红队 | `678f113a`（`t88-review-impl-a-red.md` §①） | 四门 `0/0/0/0`；靶向 `node --test …help-center-88.test.mjs` **23/23 exit 0**；canonical `pnpm test` **新增=0**；探针 44/44／17/17／26/26／6/6；自设 `red3-recompute.mjs` **35/35** | 与那次自检**无分歧** |
| 蓝队 | `1d64a0c3`（`t88-review-impl-a-blue.md` §③） | 四门 `0/0/0/0`；靶向 **23/23**（另在「父进程持锁」下再复跑 23/23）；canonical R1／R3 **新增=0**；探针 44/44／17/17／26/26／6/6 | 与那次自检**无分歧**（蓝队 §⑤ 明文） |

### ② `WAITED_*` 落盘可复核 —— **已实现**

- 协议新增 **§2.3**（`:69-79`）：等待与运行信息**必须落盘**，**只 `Write-Host` 的等待量视为不可复核**，审查中不得作为「当时锁为空」的证据。
- 实现：`tooling/run-locked.mjs` 持锁期间写 `<lock-dir>/owner.json`（`pid`／`ticket`／`cmd`／`startedAt`／`waitedMs`），退出前**追加**一行 `RUN ticket=… cmd=… waitedMs=… exit=… at=…` 到 `<lock-dir>/gate-runs.log`。
- 测试实证：`tooling/test/run-locked.test.mjs` ②「等待时 `waitedMs>0` 落盘」——并发持锁者 + 等待者两条 `RUN` 记录分别落盘，等待者 `waitedMs>0`。

### ③ 机械门禁 —— **已实现**

- 协议新增 **§2.4**（`:81-91`）：build／test **必须**经持锁包装器执行；证据里声称的门禁运行**必须**能在审计日志里找到对应条目。
- 实现：`tooling/run-locked.mjs`（持锁包装器，目录锁 ＋ >10 分钟死锁抢回 ＋ `finally` 释放 ＋ 路径守卫）、`tooling/check-gate-audit.mjs`（证据 `GATE-RUN cmd=…` 声明 vs 审计日志对账，**缺失 exit≠0** 并列出缺失项）。
- 入口：`package.json` 新增 `gate:run`／`gate:audit` 两条 script（未改其它 script）。
- 测试实证：`tooling/test/check-gate-audit.test.mjs` ③「审计缺失时 exit≠0 并列出缺失项，补齐后 exit 0」＋ ③b「一条记录不得顶两次声称」＋ ③c「`--require-claims`」。

## 5. 累犯升级

- **同一票（#88）或同一实施者再犯任一 S1-过程违规** → 本处置**立即关闭**，按 §6 字面**成果作废并重做**（§6.1 ②-4）。
- 本处置**不因**「门禁已补齐」而延长或泛化；补偿控制是**放行的对价**，不是**再次放行的许可**。

## 6. 在 #88 的定性

- 该违规在 #88 记为 **过程缺陷 · S3（记账跟进，不阻塞关闭）**（协议 §6 `:132` 的 S3 定义）。
- 缺陷编号沿用两席审查：**D1**（蓝队 §⑦）／**D-6**（红队 §⑧）。
- 交付物技术面结论**不受影响**：A1–A8 达成、四门 exit 0、canonical 新增=0、变异自证成立、F3 parity 逐条相等。
- **不含**任何 S1-交付缺陷：契约违反／用户可见回归／证据造假或私自放宽／数据丢失风险**四项均无**。

## 7. 协议修订指针

| 条文 | 行号 | 内容 |
|---|---|---|
| **§6.1** | `:138-167` | S1 拆为 **S1-交付缺陷**（字面作废重做）／**S1-过程违规**（具名书面比例处置路径 ＋ 三项补偿控制 ＋ 记 S3 ＋ 累犯升级）；权力边界（实施者／审查者无权自行援引）；与上文条文的读法澄清 |
| **§2.3** | `:69-79` | 锁等待留痕**必须落盘**（`owner.json` ＋ `gate-runs.log`）；只 `Write-Host` 视为不可复核 |
| **§2.4** | `:81-91` | 机械门禁：build／test 必须经持锁包装器；证据声称的运行必须能在审计日志中找到条目 |
| §6 原文 | `:130-136` | **一字未改**（分级定义／量刑律／违规条全部保留） |

## 8. 机械门禁自证（可复跑）

### 8.1 门禁四门（全部经 `node tooling/run-locked.mjs --ticket 88 -- …`）

| 门 | exit | 现场日志 |
|---|---|---|
| `pnpm build` | **0** | `.scratch/orchestrator/gate-build.log` |
| `pnpm boundaries` | **0** | `.scratch/orchestrator/gate-boundaries.log` |
| `pnpm snapshot:check` | **0** | `.scratch/orchestrator/gate-snapshot-check.log` |
| `pnpm publish:pre` | **0** | `.scratch/orchestrator/gate-publish-pre.log` |

### 8.2 canonical `pnpm test` 两轮 ＋ 失败集判据

| 轮 | exit | tests／pass／fail | 失败集 delta |
|---|---|---|---|
| R1 | 1（既有红） | 1047／1022／**25** | `base=34 after=29 新增=0 消失=5` |
| R2 | 1（既有红） | 1047／1022／**25** | `base=34 after=29 新增=0 消失=5` |

- 判据：`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt <after.log>` → **新增=0**（两轮）。
- 白名单未改口径：`git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` = **0 行**；`git hash-object` ＝ `93e27f9:` blob ＝ `b7a48bbe…`。
- 每轮跑完 `git status --short` 自检：`packages/skill-calorie/SKILL.md` **未变**（事故票 #124 未复现）。

### 8.3 工具自证测试（自身也经包装器跑）

`node tooling/run-locked.mjs --ticket 88 -- node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs` → **tests 9／pass 9／fail 0，exit 0**。

### 8.4 本文件的机读声明（`gate:audit` 据此对账）

```text
GATE-RUN ticket=88 cmd=pnpm build
GATE-RUN ticket=88 cmd=pnpm boundaries
GATE-RUN ticket=88 cmd=pnpm snapshot:check
GATE-RUN ticket=88 cmd=pnpm publish:pre
GATE-RUN ticket=88 cmd=node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs
GATE-RUN ticket=88 cmd=pnpm test
GATE-RUN ticket=88 cmd=pnpm test
```

### 8.5 审计日志片段（`.scratch/locks/gate-runs.log`，gitignored，机器可读；**逐字原样**）

```text
RUN ticket=88 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=0 exit=1 at=2026-09-09T12:44:28.196Z
RUN ticket=88 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=0 exit=0 at=2026-09-09T12:44:41.221Z
RUN ticket=88 cmd="git add docs/subagent-concurrency-protocol.md package.json tooling/run-locked.mjs tooling/check-gate-audit.mjs tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=1 exit=0 at=2026-09-09T12:44:47.838Z
RUN ticket=88 cmd="git commit -F .scratch/orchestrator/msg-disp-1.txt" waitedMs=0 exit=0 at=2026-09-09T12:44:49.147Z
RUN ticket=88 cmd="pnpm build" waitedMs=0 exit=0 at=2026-09-09T12:44:54.361Z
RUN ticket=88 cmd="pnpm boundaries" waitedMs=0 exit=0 at=2026-09-09T12:44:55.257Z
RUN ticket=88 cmd="pnpm snapshot:check" waitedMs=0 exit=0 at=2026-09-09T12:44:59.868Z
RUN ticket=88 cmd="pnpm publish:pre" waitedMs=0 exit=0 at=2026-09-09T12:45:00.738Z
RUN ticket=88 cmd="pnpm test" waitedMs=0 exit=1 at=2026-09-09T12:45:21.522Z
RUN ticket=88 cmd="pnpm test" waitedMs=0 exit=1 at=2026-09-09T12:45:42.161Z
```

> 前两行是工具自证测试（首轮 `exit=1`＝测试 ① 的 `waitedMs` 断言过严，修断言后第二轮 `exit=0`；留痕如实保留）。
> `pnpm test` 的 `exit=1` 为**既有红**（判据见 §8.2：两轮 `新增=0`）。

### 8.6 复跑命令

```powershell
node tooling/run-locked.mjs --ticket 88 -- pnpm build
node tooling/run-locked.mjs --ticket 88 -- pnpm boundaries
node tooling/run-locked.mjs --ticket 88 -- pnpm snapshot:check
node tooling/run-locked.mjs --ticket 88 -- pnpm publish:pre
node tooling/run-locked.mjs --ticket 88 -- pnpm test        # 两轮，分别喂 t101-fail-set.mjs
node tooling/check-gate-audit.mjs --evidence docs/research/t88-disposition-lock-violation.md --ticket 88
```

## 9. 遗留待编排者确认（1 条）

- 本次拆分对 **§6 量刑律「任一 S1 → FAIL」** 产生一处必须澄清的相互作用：S1-过程违规在**具名书面处置成立**时降为 S3（不阻断关闭），否则维持 FAIL。协议以 **§6.1 ④** 作**最小读法澄清**（未改上文任何字面）：`任一 S1-交付缺陷 → FAIL`；`S1-过程违规 → 默认 FAIL`，仅当 §6.1 ② 四要件成立时降为 S3。此为**维护者 A 档裁定的直接后果**，如需另行表述，请编排者书面改期。
- 本文件**不**代替票面 #88 与地图 #63 `Decisions` 的登记；两处登记由编排者完成。
