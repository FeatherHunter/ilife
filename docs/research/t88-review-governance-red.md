# #88 治理红队审查 · A 档落地物（协议 §6.1／§2.3／§2.4 ＋ run-locked／check-gate-audit ＋ 处置文件）

> 被审：`a8d5c1f`（协议 ＋ `tooling/run-locked.mjs`／`tooling/check-gate-audit.mjs` ＋ 9 自证 ＋ `package.json` 两条 script）、`ce3e234`（`docs/research/t88-disposition-lock-violation.md`）。
> 依据：协议全文（§2.3 `:69-79`／§2.4 `:81-91`／§6.1 `:138-167`）、决策简报 `ff80f47`、处置正本、本席上轮 `t88-review-impl-a-red.md`。
> 纪律：只读＋只写本文件与 `.scratch/orchestrator/red4-*`；门禁／测试**全部**经 `node tooling/run-locked.mjs --ticket 88 -- …`；未跑全量 `pnpm test`、未杀进程、未安装、未改 tracker。**自认一处派单明示授权的故意裸跑探针**（②a）。

## ① 独立复跑清单（exit 码）

| 对象 | 实测 | exit |
|---|---|---|
| 9 条自证 `node --test tooling/test/{run-locked,check-gate-audit}.test.mjs` | tests 9／pass 9／fail 0 | **0** |
| `pnpm build`／`boundaries`／`snapshot:check`／`publish:pre`（逐条持锁） | 逐条 PASS（`.scratch/orchestrator/red4-*.log`） | **0/0/0/0** |
| `check-gate-audit --evidence <处置文件> --log <冻结快照> --ticket 88` | `matched=7/7 auditEntries=16` | **0** |
| 处置 §8.5 片段 vs 真实日志 | 10 行**逐字＋连续**（起于日志第 1 行） | — |
| `pnpm gate:run …`／`pnpm gate:audit …`（§2.4 等价入口） | 两条 script 均可用 | **0／0** |
| 协议 diff | `+55/-0`（§6 原文一字未改） | — |
| canonical `pnpm test` ×2 | **未复核**（派单禁令＋另 session 正在改 `base-render`，#124 风险） | — |

审计片段（逐字）：`RUN ticket=88 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=0 exit=0 at=2026-09-09T12:48:07.287Z`；四门 `waitedMs=0 exit=0 at=…12:48:08/09/10/11Z`。

## ② 攻门禁三探针（`red4-probe-audit.mjs`／`red4-probe-lock.mjs`，均经包装器执行）

### a. 裸跑**能**被漏检 —— 结论：默认口径下**100% 漏检**
- **故意裸跑**（派单授权）：`node --test tooling/test/check-gate-audit.test.mjs` → 4/4 exit 0；日志 **22→22 行（新增 0）**；`tsconfig.tsbuildinfo`／`base-render/{tsbuildinfo,dist}` **mtime 全未变** → 无日志痕迹、也无产物痕迹。
- E1 零声明 → `matched=0/0` **PASS exit 0**；E1＋`--require-claims` → **FAIL exit 1**（唯一机械抓手，但默认关闭）。
- E2 如实声明裸跑命令 → **FAIL exit 1**：**只有自报才抓得住**。
- E3 实际裸跑 4 条、声明写成 9 条套件 → `matched=1/1` **PASS**：声明被**历史持锁条目**顶替。
- **补强建议（按性价比）**：① `gate:audit` 默认加 `--require-claims`；② 增加**反向对账**（日志中无人声明的 `RUN` → `--strict` 下 FAIL）；③ 声明与条目用 `runId=<uuid>`／`at=` **一对一绑定**（杀 P6／P8）；④ 无 `--ticket` 时从证据文件名推断并**强制**票号过滤（杀 P5）；⑤ 包装器把 `RUN` 行**同时**追加到受 git 跟踪的 `docs/research/t<票>-gate-runs.log`（对账有第二来源）；⑥ build 类可用 `dist/`／`*.tsbuildinfo` mtime 与日志末条时间序交叉校验，**对 `node --test` 无解**（只读测试不落任何产物）→ 协议应明说「测试无法机械检测，只能靠声明＋抽查」；⑦ §2.4-4「让有没有走锁**可机械判定**」应改为「可机械**对账已声明**运行」。

### b. 审计日志**可被伪造**，对账只是「存在性检查」

| 探针 | 结果 | 探针 | 结果 |
|---|---|---|---|
| P2 副本手写一条从未跑过的 `RUN` | **PASS 0** | P6 历史条目顶替新声明（本席未跑 build） | **PASS 0** |
| P3 删掉一条真实条目 | FAIL 1 | P7 日志多出未声明条目 | **PASS 0** |
| P4 `--log` 指向自造日志 | **PASS 0** | P8 `cmd=node --test` 模糊声明被任意顶替 | **PASS 0** |
| P5 无 `--ticket`：`ticket=99` 认领 `ticket=88` 声明 | **PASS 0** | P9 `exit=1` 条目照样认领 | **PASS 0** |

- **最小改进**：②反向对账＋③`runId` 绑定＋④强制票号，三条即可把「存在性检查」升为「一对一可追溯」；**防伪无解**（日志与工具同在可写工作区）→ §2.4 应明说「对账**查漏不防伪**，造假按 S1-交付缺陷处置」。

### c. 锁语义
- **C1 并发正确**：holder／waiter 两条 `RUN` 分别落盘，waiter `waitedMs=2071`；`owner.json` 含 `pid`；释放后**零残留** → 补偿控制②**实质成立**。另捕获真实样本：另一 session 等本席探针锁 `waitedMs=10008` 落盘。
- **C2 抢回路径破坏互斥＋毁留痕**：A 持锁 6s，B 以 `--stale-minutes 0.05`（**同一代码路径**，仅把 10min 阈值压到 3s）抢回**活锁**；A 退出时其 `finally` **删掉了 B 的 `owner.json` 与 `gate.lock`**（B 仍在跑）→ 第三个 `run-locked` **`waitedMs=0` exit 0 立即获锁**，与 B **同时持锁**；日志序 `88-A,88-C,88-B`，且 **`LOCK-STOLEN` 完全不在 `gate-runs.log`** → 互斥破坏在审计面**不可见**。
- **C3 残留**：伪造「死 pid 残留锁」→ 默认口径**阻塞至 10min**（`--max-wait-ms` 超时 exit 1），**无 pid 存活检查**；强制抢回痕迹只在 stderr。
- **C4 审计写入失败静默**：`gate-runs.log` 位置被目录占位 → `appendFileSync` 抛错 → 仅 `WARN`、**exit 0**、该次运行**零痕迹**（`check-gate-audit` 读该路径 exit 1，信息为 `FAIL: EISDIR…`）。
- 修复各约 2 行：抢回前校验 `owner.json.pid` 存活；`finally` 释放前校验 `owner.json.pid === process.pid`（不符不删＋告警）；写日志失败即 `exit≠0`。

## ③ §6 拆分自洽性
- **与 §5／§6 不冲突**：§6 原文 `+0/-0`，§6.1 只追加；④ 逐条重指「任一 S1 → FAIL」「§2.1／§2.2／违规条中的 S1」「S1 四个括注」，并明文「§5／§5.1 不因本节改动」。
- **与本席上轮结论一致**：上轮 D-6＝S1 违规、技术面 93 且无 S1-交付缺陷 → 正落在「S1-过程违规默认 FAIL，仅 ② 四要件成立降 S3」；蓝队 §⑧「具名处置＋三项补偿控制 → PASS(87)」被 §6.1 ② 完整吸收。
- **无「一律豁免」口子**：① 表格保留「默认 FAIL ＋ 作废重做」；③ 援引权**独家**给编排者、明文禁止实施者／审查者自行援引；② 每次须**一次性＋不类推**；④ 累犯即关闭路径。
- **留白（S3）**：④ 只澄清量刑律第一句，未同步澄清第三句「无 S1 且均分 ≥85 → PASS」在降 S3 后的读法（可推出，建议补一句，避免误读为「仍算 S1 → 一律 FAIL」）。**权力依赖**：四要件是否成立**无第三方复核**（③ 明文）→ 建议随地图 Decisions 登记四要件逐条证据。

## ④ 处置文件对表（逐条 vs 维护者 A 档）

| A 档要素 | 处置文件 | 判定 |
|---|---|---|
| 具名（编排者 session） | `:3` `73a70fbf…`（＝本席父 session，实测一致） | ✅ |
| 引条号 | `:5` §2:18／§6:136／§6.1:138-167／§2.3:69-79／§2.4:81-91（行号实测全对） | ✅ |
| 一次性／不类推 | `:6`／§3 `:31-36` | ✅ |
| 三项补偿控制 | §4 ①两席持锁复跑（`678f113a`／`1d64a0c3`，与两报告 §①/§③/§⑤ 一致）②落盘（C1 实证）③机械门禁（7/7） | ✅ |
| 累犯升级 | §5 `:60-63`（＝§6.1 ②-4） | ✅ |
| S3 定性 | §6 `:65-70`（D1／D-6 编号与两报告一致） | ✅ |
| **入「票面＋地图 Decisions」** | 票面 **✅**（#88 body `## 裁定记录` ＋ 编排者评论「书面确认（A 档落地）」）；**地图 #63 `## Decisions so far` 未登记**（现仅 #90／#78／#75） | **⏳ D-9** |
| 不重做／不重跑实施审查 | §2 `:21-29` | ✅ |

## ⑤ 缺陷清单
- **D-1（S2 · 本票引入）** 机械门禁无强制力：默认口径下裸跑**零痕迹、audit PASS**（②a）；§2.4-4 措辞与实现不符。
- **D-2（S2 · 本票引入）** 抢回路径破坏互斥＋毁新持锁者留痕（C2；同源缺陷在 §2 参考实现已存在，本票新工具本可用 `owner.json.pid` 防住）。
- **D-3（S2 · 本票引入）** 审计日志写失败仅 `WARN`、`exit 0` → 「跑过但无痕」（C4）。
- **D-4（S3 · 本票引入）** `LOCK-STOLEN` 只 stderr、不落盘（C2／C3），与 §2.3「只打印＝不可复核」的立意自相矛盾。
- **D-5（S3 · 本票引入）** 无 `START` 行（`parseAuditLog` 已处理该前缀却无生产者）→ 被信号杀死／崩溃的运行零痕迹。
- **D-6（S3 · 本票范围）** 对账源 `.scratch/locks/gate-runs.log` **gitignored**（`git check-ignore` 实证）＋ `--log` 可指任意路径（P4）→ 事后第三方只能复跑、不能验日志。
- **D-7（S3 · 本票引入）** 对账不看 `exit=`／`at=`（P6／P9）→ 声明可被历史同命令条目顶替。
- **D-8（S3 · 本票范围）** `tooling/test` 不在 canonical `pnpm test`（#88 已登记后续票）→ 门禁工具自身无回归门。
- **D-9（S3 · 流程）** 地图 #63 Decisions 未登记（④）。
- **D-10（S3 · 文档）** §6.1 ④ 未澄清量刑律第三句（③）。
- **无 S1-交付缺陷／无 S1-过程违规**：落仓路径日志显示 `git add`／`git commit`／四门／自证**全部持锁**、`waitedMs` 已落盘。
- **本席自认**：②a 的故意裸跑系派单明示授权的一次只读探针（4/4），按 §2.4-4 属「裸跑」字面 → 如实登记，请编排者按 §6.1 处置。

## ⑥ 五维与 verdict

| 维度 | 分 | 依据 |
|---|---|---|
| 契约一致 30 | **27** | §6.1 与裁定逐条一致、§2.3 落盘达标、§2.4-1…3 可用；扣 3＝§2.4-4 措辞与实现不符（D-1）＋§2.3 立意与 D-4 |
| 证据真实可复现 25 | **22** | 自证 9/9、四门 0/0/0/0、audit 7/7、§8.5 逐字连续全复现；扣 3＝对账源不可追踪（D-6）＋canonical 未由本席复跑 |
| parity 20 | **16** | 协议条文↔实现↔测试三层大体齐；扣 4＝9 条测试未覆盖抢回互斥（D-2）、日志写失败（D-3）、伪造面（②b） |
| 工程红线 15 | **13** | 无危险 git／无 install／无 push／路径守卫齐备、全程持锁；扣 2＝新门禁工具自身的互斥与留痕安全缺陷 |
| 文档同步 10 | **8** | §6.1／§2.3／§2.4 入仓、行号准确、§6 一字未改、票面已登记；扣 2＝地图未登记（D-9）＋④留白（D-10） |
| **合计／均分** | **86/100** | **86.0** |

# verdict：**PASS（86.0）** —— 无 S1-交付缺陷、无 S1-过程违规；但 **3×S2（D-1／D-2／D-3）按 §6 须在关闭前修完**（或由编排者书面改期并给出具名票号）。
- **最省力的三处修复（约 6 行）**：① `finally` 释放前校验 `owner.json.pid`；② 抢回前校验 pid 存活；③ 写日志失败即 `exit≠0`。
- **建议一并落地**：`gate:audit` 默认 `--require-claims` ＋ 反向对账 ＋ `runId` 绑定 ＋ 强制票号（②a ①②③④）。
- **未复核**：canonical `pnpm test` 两轮（派单禁令）；#88 时间窗事实（处置已自认不可复核）。
- **机读声明（本报告所引运行，`gate:audit` 据此对账）**：

```text
GATE-RUN ticket=88 cmd=node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs
GATE-RUN ticket=88 cmd=pnpm build
GATE-RUN ticket=88 cmd=pnpm boundaries
GATE-RUN ticket=88 cmd=pnpm snapshot:check
GATE-RUN ticket=88 cmd=pnpm publish:pre
GATE-RUN ticket=88 cmd=node .scratch/orchestrator/red4-probe-audit.mjs
GATE-RUN ticket=88 cmd=node .scratch/orchestrator/red4-probe-lock.mjs
```
