# #88 治理返修实施 · R-2-1／R-2-2／R-2-3 ＋ R-3-1…R-3-6（协议修订 ＋ 机械门禁工具）

> **被修**：`a8d5c1f`（协议 §2.3／§2.4／§6.1 ＋ `tooling/run-locked.mjs`／`tooling/check-gate-audit.mjs` ＋ 9 条自证）。
> **依据**：红队 `docs/research/t88-review-governance-red.md`（`2930834`）②③④⑤；蓝队 `docs/research/t88-review-governance-blue.md`（`80c325c`）G-2／G-3／G-4；编排者 `docs/research/t88-delta-flake-ruling.md`。
> **commit**：`16b0579`（工具／测试／协议／`package.json`）＋ 本文件与 `--until` 对账窗口（第 2 次提交）。
> **纪律**：全程经 `node tooling/run-locked.mjs --ticket 88 -- …`；**本轮零裸跑**、未杀进程、未 `pnpm/npm install`、未 push、`packages/**` 零改动、未改 `docs/research/t88-baseline/**`。
> **事故**：期间两次意外断电（21:0x／21:1x）。已按编排者恢复清单自检：本席 7 个文件 **NUL 字节 0**、无 `MUT-` 残留、`16b0579` 完好；`.scratch/locks/owner.json` 为断电时被杀运行的**零填充残留**（无 `gate.lock`，不影响互斥，未由本席删除）。

## ① 逐条返修（怎么改 ＋ 落点 ＋ 验证）

| 编号 | 对应缺陷 | 改法 | 落点 | 验证 |
|---|---|---|---|---|
| **R-2-1** | 红队 D-2／C2（抢回夺活锁＋`finally` 删他人锁） | ①**抢回前探活**：`probePidAlive()`＝`process.kill(pid,0)`，`ESRCH`→死、`EPERM`／未知→**保守判活**；**活 owner 一律不抢回**（`if (probe && probe.alive)` 之后所有抢回分支，含锁龄兜底，全被跳过）②**释放前归属校验**：`ownedByUs = ownerNow.pid === process.pid`，不符则**不删** `owner.json`／锁目录并 **exit≠0** 告警 ③`LOCK-STOLEN` **落盘**（`appendOrThrow`，写失败即抛错）④删序固定为**先 `owner.json` 后锁目录**（先删锁会误删新持锁者的记录） | `tooling/run-locked.mjs:90`（探活）`:196`（活 owner 不抢回）`:210`（锁龄兜底仅在无活 owner 时生效）`:301`（LOCK-STOLEN 落盘）`:401`（归属校验） | 新增 **②c**（活锁不可夺）／**②d**（归属校验不删他人锁）；**②b**／**②e** 断言 `LOCK-STOLEN` 落盘；变异 **MUT-R2-1** 红→还原→绿 |
| **R-2-2** | 红队 D-1／②a／②b ＋ 蓝队 G-2 | 默认**严格**：①`--require-claims` 默认开 ②**反向对账**：窗口内无人声明的 `RUN` → FAIL ③**`runId` 一对一**：带 `runId` 的声明只认同 `runId` 条目（同 cmd 历史条目不得顶替）；无 `runId` 的声明默认直接判不成立 ④只认领 `exit=0` 条目 ⑤放宽开关 `--allow-no-claims／--allow-undeclared／--allow-nonzero／--allow-no-runid` **必须在证据里留 `GATE-RELAX flag=… reason=…`**，否则 exit≠0 ⑥`--export <path>` 导出窗口内 `RUN` 条目为对账源 ⑦`--since`／`--until` 界定对账窗口（共享日志必需） | `tooling/check-gate-audit.mjs:50`（放宽开关表）`:148`（GATE-RELAX 解析）`:175`（窗口）`:188,192`（runId／exit 判定）`:207`（反向对账 reconcile）`:246,248`（严格默认）`:294`（export）`:358,359`（反向对账／放宽留痕判 FAIL） | 新增 **③c／③d／③e／③f／③g**；变异 **MUT-R2-2** 红→还原→绿 |
| **R-2-3** | 红队 D-3／C4（写日志失败静默） | `appendOrThrow()` 统一兜底：`gate-runs.log`／`owner.json` 写失败 → **exit≠0**；`START` 写失败**不执行命令**；`RUN` 写失败把 exit 抬到 ≠0（不再只 `WARN`） | `tooling/run-locked.mjs:301,332,340,396` | 新增 **④**（日志被目录占位／`owner.json` 被目录占位 → exit≠0 且子命令未执行） |
| **R-2-4** | 红队 D-1 措辞 | §2.4-5 改写：机械门禁**只能对账「已声明」的运行**；**裸跑本身不可机械检测**（`node --test` 尤其），故裸跑只能靠**自认／举报／审查**发现；保留「裸跑＝**S1-过程违规**」；补「对账**查漏不防伪**，造假按 **S1-交付缺陷**」 | `docs/subagent-concurrency-protocol.md:96` | 逐字复核 |
| **R-3-1** | 红队 D-5 | 持锁后、执行命令**前**追加 `START ticket=… runId=… cmd=… waitedMs=… pid=… at=…`（崩溃／被杀也留痕） | `tooling/run-locked.mjs:340` | 新增 **⑤**（子命令自读日志，无 `START` 即 exit 9）；**断电实证**：`START ticket=88 runId=c43e1f21… cmd="pnpm test" at=13:10:41Z` 有 START、**无 RUN**（该次运行被断电杀死） |
| **R-3-2** | 红队 D-10 | §6.1④ 追加：量刑律第三句「无 S1 且均分 ≥85 → PASS」读作「**无 S1-交付缺陷且无未被②处置的 S1-过程违规**」；经②四要件降 **S3** 的 S1-过程违规**不再计入**该句「无 S1」，但**仍须逐条列出**且一次性／不类推／累犯升级照旧 | `docs/subagent-concurrency-protocol.md:172` | 逐字复核 |
| **R-3-3** | 红队 C3 | 残留锁**先探活再等**：owner pid 已死且其记录**属于当前锁**（`owner.json` mtime 不早于锁目录）→ **立即抢回**（`reason=owner-dead`），不再空等 10 分钟；只有**无可用 pid** 时才退化为锁龄兜底 | `tooling/run-locked.mjs:196-212` | 新增 **②e**（`--stale-minutes 10` 下仍立即抢回、`LOCK-STOLEN reason=owner-dead` 落盘） |
| **R-3-4** | 蓝队 G-4 | 删除全部 `waitedMs<=50` 墙钟断言 → 改**行为断言**（`waitedMs` 非负数字、`START`↔`RUN` 一致、真并发时 `waitedMs>0` 且落盘） | `tooling/test/run-locked.test.mjs:109,143` | 复跑 18/18 |
| **R-3-5** | 蓝队 G-3 | **不**把 `tooling/test` 纳入 canonical glob（嵌套持锁）；新增 `gate:selftest`（内部即经包装器）＋协议 §2.4-6 注明「须手工／CI 单独触发，不得据此认为 canonical `pnpm test` 已覆盖门禁工具自身」 | `package.json:25`、`docs/subagent-concurrency-protocol.md:97` | 实测 `pnpm gate:selftest` **exit 0（18/18）** |
| **R-3-6** | 编排者裁定 | §2.4-7 新增：**编排者可具名授权一次受控裸跑探针**（派单写明授权对象／一次性／命令范围／只读要求，证据留痕 `GATE-RELAX flag=--bare-run-probe` 或等价记录），**不适用** §2.4-5 违规判定；未经具名授权的裸跑一律按 S1-过程违规；**不类推、不得自行援引**（同 §6.1③） | `docs/subagent-concurrency-protocol.md:98` | 逐字复核 |

**本轮额外修（R-3-5 实测暴露的真实缺陷）**：`pnpm` 运行时 `process.execPath` 是 **Electron 宿主二进制**（实测 `D:\0Tools\DSH Desktop\DSH Desktop.exe`），测试里 `spawnSync(process.execPath, …)` 会**静默 exit 0** → `pnpm gate:selftest` 首轮 **1/18** 假红（`.scratch/orchestrator/t88-fix-gate-selftest.log`）。修法：两测试文件加 `resolveNodeBin()`（Electron 下用 `where node` 取首个 `.exe`）。落点 `tooling/test/run-locked.test.mjs:19-31`、`tooling/test/check-gate-audit.test.mjs:24-38`。

## ② 测试用例（18 条；★＝本轮新增／改写）

| 文件:行 | 用例 | 覆盖 |
|---|---|---|
| `run-locked.test.mjs:109` ★ | ① START＋RUN 同 runId／pid、字段、清理 | R-3-1 |
| `:133` | ①b 失败透传 | — |
| `:143` ★ | ② 真并发 `waitedMs>0` 落盘（去墙钟断言） | R-3-4 |
| `:177` ★ | ②b 锁龄抢回＋`LOCK-STOLEN` **落盘** | R-2-1③ |
| `:194` ★ | ②c **活 owner 不得被抢回**（`--stale-minutes 0.02`） | R-2-1① |
| `:220` ★ | ②d **归属校验**：锁被接管时不得删他人 `owner.json`／锁 | R-2-1② |
| `:239` ★ | ②e 死 pid 残留锁**立即抢回**＋落盘 | R-3-3 |
| `:255` | ③ 缺票号／缺命令 | — |
| `:267` ★ | ④ 日志／`owner.json` 写失败 → exit≠0 且不执行命令 | R-2-3 |
| `:290` ★ | ⑤ `START` 先于命令落盘 | R-3-1 |
| `check-gate-audit.test.mjs:77` | ③ 缺失 exit≠0／补齐 0 | — |
| `:97` | ③b 一条记录不得顶两次声称 | — |
| `:107` ★ | ③c 默认 require-claims＋放宽须留痕 | R-2-2①⑤ |
| `:118` ★ | ③d **反向对账**＋`--since`／`--until` 窗口＋放宽留痕 | R-2-2②⑦ |
| `:146` ★ | ③e **runId 一对一**（同 cmd 不得顶替） | R-2-2③ |
| `:177` ★ | ③f 只认领 `exit=0`（`--allow-nonzero` 留痕） | R-2-2④ |
| `:193` ★ | ③g `--export` 且导出文件可作 `--log` 复核 | R-2-2⑥ |
| `:210` ★ | 匹配口径／`START` 不计入／重复 runId／窗口／`GATE-RELAX` 解析 | — |

## ③ 变异自证（src 级，红→还原→绿＋sha256）

| 变异 | 位置 | 红（fail） | 唯一红项 | 还原 sha256（变异前＝还原后） | 绿 |
|---|---|---|---|---|---|
| **MUT-R2-1** 归属校验改为恒真 | `tooling/run-locked.mjs:401` | `node --test tooling/test/run-locked.test.mjs` → **9/10，fail 1**（`.scratch/orchestrator/t88-mut-r21-red.log`） | ②d「归属校验失败时旧持锁者必须 exit≠0」 | `ff3f19341ca2eac8bdba0d83f254c3cd1c08517f38c373c8fce138bc0edd171f` | 18/18 |
| **MUT-R2-2** 忽略 `runId` 绑定 | `tooling/check-gate-audit.mjs:192` | `node --test tooling/test/check-gate-audit.test.mjs` → **7/8，fail 1**（`.scratch/orchestrator/t88-mut-r22-red-final.log`） | ③e「runId 不同（同 cmd）应判缺失」 | `b3338430c2811c5de6c7216b8c079788126d876ba4723550206731cd4dd3827a` | 18/18 |

## ④ 门禁实测（逐条 exit）

| 项 | runId | exit |
|---|---|---|
| `pnpm build`（断电前／重启后／断电后各 1 次） | `19c22436…`／`9bfe6086…`／`5f559d23-e3af-43db-a9a8-03391b96ab5f` | **0／0／0** |
| `pnpm boundaries` | `0e210107…`／`b4ace32e…`／`94deb914-4c3d-42bb-b4d7-c398c0a573c6` | **0／0／0** |
| `pnpm snapshot:check` | `3f88588c…`／`92548e52…`／`772de269-896d-4f12-978d-1b077332af16` | **0／0／0** |
| `pnpm publish:pre` | `fbb1e15d…`／`0957d727…`／`eac23e36-5de4-4dbc-a209-d6bee7b3dd83` | **0／0／0** |
| 自证 18 条（多轮） | `936e3dde…`／`a566d0d9…`／`721ad995…`／`378940e5…`／`29e66794…`／`a9aaeeab…`／`77c17677…`／`b50b8151-6f16-4976-b380-e88ca254aae6` | **0**（每轮 18/18） |
| `pnpm gate:selftest` | `e9bc86ef-28a7-4b35-96ac-0a5574415734`（ticket=selftest） | **0**（18/18） |
| canonical `pnpm test` | `7bf51206…`／`3bbf5c3f…`（断电前 R1／R2）／`5f162e1f…`（重启后 R1）／`e5c818a9-3526-4dca-a50e-b83f8b157b08`（断电后终轮） | 1／1／1／1（**基线白名单 34 条**导致） |

- **失败集 delta**（`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt <log>`）：
  - 断电前 R1／R2：`base=34 after=29 新增=0 消失=5`（**新增=0**）
  - 重启后 R1（`5f162e1f`，21:10:37）：`base=34 after=29 新增=0 消失=5`（**新增=0**）
  - 断电后终轮（`e5c818a9`，21:18:04）：`base=34 after=32 **新增=3** 消失=5`
- **新增 3 条的分类（按 `t88-delta-flake-ruling.md` §2）**：签名**全部为 A 类**（`AssertionError` 带 expected/actual），但**归属与确定性均指向他票在途 WIP**，非本票路径：

  | 新增测试名 | 签名 | 归属文件（commit） | 单独复跑 | 判定 |
  |---|---|---|---|---|
  | `#97 · affectedRows＝库真实行数（只读句柄独立复核，非自报）` | `AssertionError 0 !== 1`（`:154`） | `packages/skill-calorie/test/m5-receipt-97.test.mjs`（`11be0c7`，#97） | 2 次**仍红**（35/40 红，比全量更红 → 依赖其它测试建立的夹具状态，**顺序依赖**） | A 类签名＋顺序依赖，**非本票 delta** |
  | `120 · analysis 11 处查询逐处排除软删行（每处唯一可观测面）` | `AssertionError 2 !== 0`（`:166`） | `packages/skill-calorie/test/softdelete-120.test.mjs`（`aaf494d`，#120） | 2 次**全绿**（4/4，exit 0） | A 类签名＋单跑全绿 → **顺序／状态污染** |
  | `120 · 过度过滤护栏：is_deleted 为 NULL 的活行仍计入（谓词必须 COALESCE）` | `AssertionError 30 !== 150`（`:178`） | 同上（`aaf494d`，#120） | 同上 | 同上 |
  - **同一树上前一轮（`5f162e1f`，21:10:37）这 3 条全绿**（`.scratch/orchestrator/t88-fix-final-test-r1.log` 中 `✔`）→ 非确定性，排除「本票改动引入」。
  - 本票按 §5.1「范围外发现」处理：**只作转票措辞＋S3 记账**，未动 `packages/**`（禁区）；类别裁定权在编排者（严格按 A 类字面 → 由 #97／#120 修；按「环境／顺序污染」精神 → 不计入新增）。
- `git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` → **0 行**（白名单未改）。
- **当轮并发上下文**：同仓 4 个 session 在跑（本席 #88 返修／#88 实施 B／#120／#97），断电后另有 blue5 审查与 impl-b 探针在同一共享日志下运行（见 §附的未声明条目）；本席**未**跑 headless 浏览器实证；锁等待实测 `build waitedMs=20010/30026`、自证 `10008/10013/10014/10015/60058/70045/70040` —— 当轮确为重负载并发。

## ⑤ 与红队／蓝队缺陷的对应

- **已闭环**：D-1（R-2-2＋R-2-4）、D-2（R-2-1）、D-3（R-2-3）、D-4（`LOCK-STOLEN` 落盘）、D-5（`START`）、D-7（`exit=0` 才认领）、D-10（R-3-2）、蓝队 **G-2**（同上）、**G-3**（R-3-5）、**G-4**（R-3-4）。
- **机制已给、本票不新增未声明路径**：D-6（对账源 gitignored）→ `--export` 已实现；本票导出产物写 `.scratch/orchestrator/t88-gate-runs-export.log`，**受跟踪**对账源改由本文件「附：对账源（窗口内 RUN 行）」承担（`--log <本文件>` 可直接复核）。
- **故意不做（理由）**：
  - 红队 D-8／蓝队 G-3 的「把 `tooling/test` 纳入 canonical `pnpm test` glob」→ **按派单不纳入**（会与外层包装器嵌套持锁），改 `gate:selftest`。
  - 红队 D-9（地图 #63 `Decisions` 登记）→ 编排者职权，非本席路径。
  - 「日志防伪」→ **无解**（日志与工具同在可写工作区）；按红队建议在协议 §2.4-5 明说「查漏不防伪＋造假按 S1-交付缺陷」。
  - **未加 `--force-steal`**：活 owner 一律不抢回是 C2 的根治手段，任何「强制夺活锁」开关都会重新打开该缺陷；pid 复用导致的长等待改由日志 `WAIT-OWNER-ALIVE`（带 ticket／runId／pid）＋人工确认处理。

## ⑥ 未做／未确证

- 本轮**未做任何裸跑**（红队 §②a 的结论改由**机械复现**替代：③d／③e／③f 用伪造日志 fixture 证明这些伪造面在默认口径下已会被抓住，无需裸跑）。
- `--allow-undeclared`／`--allow-no-claims` 的端到端放宽路径：本票证据实际用到 `--allow-nonzero`（基线白名单 exit=1／变异红跑）与 `--allow-undeclared`（共享日志混入他席同票运行，见 §附）。
- 断电中断的 `c43e1f21`（`pnpm test`）**只有 START、无 RUN** → 不可作为门禁证据声明（R-3-1 的现场证明，见 ①）。
- 未复核他人票号（97／120）的运行；未改 `packages/**`；`.scratch/locks/owner.json` 零填充残留未由本席删除（无 `gate.lock`，不影响互斥）。

## ⑦ 风险 top3

1. **pid 复用**：活 owner 一律不抢回 → 若 `owner.json.pid` 被复用（Windows 常见），锁会一直等到 `--max-wait-ms` 或人工清理。缓解：`WAIT-OWNER-ALIVE` 落盘带 ticket／runId／pid；未提供强制夺锁开关（避免重开 C2）。
2. **`owner.json` mtime 判定**：容差 2ms 在网络盘／时钟跳变下可能把「属于当前锁的记录」判成残留 → 退化为锁龄兜底（方向安全：只等不抢），代价是最长 10 分钟等待。
3. **反向对账依赖窗口隔离**：共享日志下须靠 `--ticket`／`--since`／`--until`；同票并发 session 增多时会报「未声明」，需 `--allow-undeclared`＋`GATE-RELAX`（本票已实际触发一次，见 §附）。

## 附：机读声明（`gate:audit` 据此对账）

```text
GATE-RELAX flag=--allow-nonzero reason=canonical pnpm test 因基线白名单 34 条必然 exit=1、变异红跑按设计 exit=1；判定口径为失败集新增=0 与变异红-绿自证
GATE-RELAX flag=--allow-undeclared reason=共享 .scratch/locks/gate-runs.log 在同一窗口内混入同票（ticket=88）其它 session 的运行（blue5 审查／impl-b 探针／base-render 靶向），非本席运行；本席已逐条列出
GATE-RUN ticket=88 runId=936e3dde-c4e1-44d3-8996-142375583ad1 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs"
GATE-RUN ticket=88 runId=19c22436-1913-4301-a225-d2fe6e4bebf2 cmd="pnpm build"
GATE-RUN ticket=88 runId=0e210107-d9a4-47bc-8779-512cfb2dd8c4 cmd="pnpm boundaries"
GATE-RUN ticket=88 runId=3f88588c-4a1e-4bda-9ad2-0740f7a80d16 cmd="pnpm snapshot:check"
GATE-RUN ticket=88 runId=fbb1e15d-b94e-49a0-8b3b-9fadd3cc49d0 cmd="pnpm publish:pre"
GATE-RUN ticket=88 runId=7bf51206-b581-40e8-8fb5-da45d1efd7e4 cmd="pnpm test"
GATE-RUN ticket=88 runId=3bbf5c3f-cb19-4383-9da9-e4ac9d0b97ea cmd="pnpm test"
GATE-RUN ticket=88 runId=a566d0d9-b07b-47b1-b6e2-e512418d563f cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs"
GATE-RUN ticket=88 runId=721ad995-0cf0-450e-8529-a33e4c126095 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs"
GATE-RUN ticket=88 runId=c6e065e6-426c-41b4-be6a-b068385c386f cmd="node --test tooling/test/run-locked.test.mjs"
GATE-RUN ticket=88 runId=656dd615-60e3-4401-b07d-3bda0058a97b cmd="node --test tooling/test/check-gate-audit.test.mjs"
GATE-RUN ticket=88 runId=378940e5-7545-40cc-891a-de277ce7266a cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs"
GATE-RUN ticket=88 runId=31780923-1c29-4de7-888d-6cb6846b6ab5 cmd="git add tooling/run-locked.mjs tooling/check-gate-audit.mjs tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs package.json docs/subagent-concurrency-protocol.md"
GATE-RUN ticket=88 runId=1a22f53a-2033-4b0c-bf55-f14cf3d2da50 cmd="git commit -F .scratch/orchestrator/t88-fix-msg-1.txt"
GATE-RUN ticket=88 runId=29e66794-1c6c-45d7-8bb1-2b7daf56bbfd cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs"
GATE-RUN ticket=88 runId=bad5cf9a-f928-4b43-a5fb-469b642a7ecd cmd="node --test tooling/test/check-gate-audit.test.mjs"
GATE-RUN ticket=88 runId=a9aaeeab-4b8a-45e9-9e3e-7576c02cb012 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs"
GATE-RUN ticket=88 runId=77c17677-c8ac-4b4f-93f0-2dbd9882fd56 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs"
GATE-RUN ticket=88 runId=9bfe6086-2be5-4e90-b6b0-650b4f3ed240 cmd="pnpm build"
GATE-RUN ticket=88 runId=b4ace32e-72a0-433e-8e08-25a874176884 cmd="pnpm boundaries"
GATE-RUN ticket=88 runId=92548e52-c044-4547-9f84-a5ab4a3c20b0 cmd="pnpm snapshot:check"
GATE-RUN ticket=88 runId=0957d727-f348-4f00-9264-bcb54c873bbd cmd="pnpm publish:pre"
GATE-RUN ticket=88 runId=5f162e1f-6a65-4adb-abb7-ecf24e3cfbee cmd="pnpm test"
GATE-RUN ticket=88 runId=b50b8151-6f16-4976-b380-e88ca254aae6 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs"
GATE-RUN ticket=88 runId=5f559d23-e3af-43db-a9a8-03391b96ab5f cmd="pnpm build"
GATE-RUN ticket=88 runId=94deb914-4c3d-42bb-b4d7-c398c0a573c6 cmd="pnpm boundaries"
GATE-RUN ticket=88 runId=772de269-896d-4f12-978d-1b077332af16 cmd="pnpm snapshot:check"
GATE-RUN ticket=88 runId=eac23e36-5de4-4dbc-a209-d6bee7b3dd83 cmd="pnpm publish:pre"
GATE-RUN ticket=88 runId=e5c818a9-3526-4dca-a50e-b83f8b157b08 cmd="pnpm test"
GATE-RUN ticket=88 runId=64960119-d837-4886-8910-f1a832ceef97 cmd="node --test packages/skill-calorie/test/softdelete-120.test.mjs"
GATE-RUN ticket=88 runId=b2e03191-7375-464c-803f-854c1c19db71 cmd="node --test packages/skill-calorie/test/softdelete-120.test.mjs"
GATE-RUN ticket=88 runId=55f0c0ed-a84f-4f24-9888-fc5a48eae305 cmd="node --test packages/skill-calorie/test/m5-receipt-97.test.mjs"
GATE-RUN ticket=88 runId=7dbd6f1d-1517-4044-9afe-68f0377ea665 cmd="node --test packages/skill-calorie/test/m5-receipt-97.test.mjs"
GATE-RUN ticket=selftest runId=833f283a-cd01-4265-b821-84d0f77ccb46 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs"
GATE-RUN ticket=selftest runId=e9bc86ef-28a7-4b35-96ac-0a5574415734 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs"
```

## 附：对账输出与窗口内 RUN 行（`--log <本文件>` 可复核）

对账命令（`check-gate-audit` 是**只读**工具，不在 §2.4-1 的持锁清单内，故未包装）：

```text
node tooling/check-gate-audit.mjs --evidence docs/research/t88-impl-governance-fix.md --ticket 88 \
  --since 2026-09-09T12:53:00Z --until 2026-09-09T13:20:33Z --allow-nonzero --allow-undeclared \
  --export .scratch/orchestrator/t88-gate-runs-export.log
→ 审计：.scratch/locks/gate-runs.log（RUN 条目 118 条；窗口内 41 条，ticket=88）
→ 声称运行 35 条
→ 反向对账：窗口内无人声明的 RUN 条目 8 条（＝他席运行，见下表）
→ RESULT: matched=35/35 auditEntries=118 scoped=41 undeclared=8
→ gate-audit: PASS（exit 0）
```

**8 条未声明条目＝同票他席运行（非本席）**：`bebc75dc`（`t88-probe-impl-b.mjs`）／`092364f9`（`blue5-gates.ps1`）／`811ff3ef`（`t88-probe-impl-a.mjs`）／`eb38bd3e`（`t88-probe-shell3.mjs`）／`d0b9cd73`（`blue5-gates.mjs`）／`831eef53`（`blue5-test.mjs`）／`a4d34cb2`（`t88-browser-evidence-b.mjs`）／`9b3614f3`（`base-render` 靶向 5 文件）——命令、pid（`19484`／`29720`／`28828`／`30892`／`26712`／`7320`／`28056`／`17424`）与本席任何一次运行都不同，且本席从未运行过这些命令。

**受跟踪对账源（窗口内 41 条 ticket=88 ＋ 2 条 ticket=selftest，共 43 条 `RUN` 原始行；第三方可 `--log docs/research/t88-impl-governance-fix.md` 直接复核，实测 `matched=35/35`）**：

```text
RUN ticket=88 runId=936e3dde-c4e1-44d3-8996-142375583ad1 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=10013 exit=0 at=2026-09-09T12:54:07.678Z
RUN ticket=88 runId=19c22436-1913-4301-a225-d2fe6e4bebf2 cmd="pnpm build" waitedMs=30026 exit=0 at=2026-09-09T12:55:03.163Z
RUN ticket=88 runId=0e210107-d9a4-47bc-8779-512cfb2dd8c4 cmd="pnpm boundaries" waitedMs=0 exit=0 at=2026-09-09T12:55:04.037Z
RUN ticket=88 runId=3f88588c-4a1e-4bda-9ad2-0740f7a80d16 cmd="pnpm snapshot:check" waitedMs=0 exit=0 at=2026-09-09T12:55:04.913Z
RUN ticket=88 runId=fbb1e15d-b94e-49a0-8b3b-9fadd3cc49d0 cmd="pnpm publish:pre" waitedMs=1 exit=0 at=2026-09-09T12:55:05.785Z
RUN ticket=88 runId=7bf51206-b581-40e8-8fb5-da45d1efd7e4 cmd="pnpm test" waitedMs=0 exit=1 at=2026-09-09T12:55:31.150Z
RUN ticket=88 runId=3bbf5c3f-cb19-4383-9da9-e4ac9d0b97ea cmd="pnpm test" waitedMs=0 exit=1 at=2026-09-09T12:55:54.117Z
RUN ticket=88 runId=a566d0d9-b07b-47b1-b6e2-e512418d563f cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=60058 exit=0 pid=29492 at=2026-09-09T12:57:19.319Z
RUN ticket=88 runId=721ad995-0cf0-450e-8529-a33e4c126095 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=70045 exit=0 pid=30652 at=2026-09-09T13:00:18.202Z
RUN ticket=88 runId=c6e065e6-426c-41b4-be6a-b068385c386f cmd="node --test tooling/test/run-locked.test.mjs" waitedMs=0 exit=1 pid=4160 at=2026-09-09T13:00:44.568Z
RUN ticket=88 runId=656dd615-60e3-4401-b07d-3bda0058a97b cmd="node --test tooling/test/check-gate-audit.test.mjs" waitedMs=0 exit=1 pid=32644 at=2026-09-09T13:00:55.261Z
RUN ticket=88 runId=378940e5-7545-40cc-891a-de277ce7266a cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=10014 exit=0 pid=19484 at=2026-09-09T13:01:18.798Z
RUN ticket=88 runId=31780923-1c29-4de7-888d-6cb6846b6ab5 cmd="git add tooling/run-locked.mjs tooling/check-gate-audit.mjs tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs package.json docs/subagent-concurrency-protocol.md" waitedMs=0 exit=0 pid=17740 at=2026-09-09T13:01:47.788Z
RUN ticket=88 runId=1a22f53a-2033-4b0c-bf55-f14cf3d2da50 cmd="git commit -F .scratch/orchestrator/t88-fix-msg-1.txt" waitedMs=0 exit=0 pid=28176 at=2026-09-09T13:01:50.588Z
RUN ticket=88 runId=29e66794-1c6c-45d7-8bb1-2b7daf56bbfd cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=10015 exit=0 pid=31704 at=2026-09-09T13:03:58.686Z
RUN ticket=88 runId=bad5cf9a-f928-4b43-a5fb-469b642a7ecd cmd="node --test tooling/test/check-gate-audit.test.mjs" waitedMs=10013 exit=1 pid=30568 at=2026-09-09T13:04:20.866Z
RUN ticket=88 runId=a9aaeeab-4b8a-45e9-9e3e-7576c02cb012 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=0 exit=0 pid=29136 at=2026-09-09T13:04:33.313Z
RUN ticket=88 runId=77c17677-c8ac-4b4f-93f0-2dbd9882fd56 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=0 exit=0 pid=15640 at=2026-09-09T13:08:32.223Z
RUN ticket=88 runId=9bfe6086-2be5-4e90-b6b0-650b4f3ed240 cmd="pnpm build" waitedMs=20010 exit=0 pid=21160 at=2026-09-09T13:08:55.625Z
RUN ticket=88 runId=b4ace32e-72a0-433e-8e08-25a874176884 cmd="pnpm boundaries" waitedMs=0 exit=0 pid=13616 at=2026-09-09T13:08:56.499Z
RUN ticket=88 runId=92548e52-c044-4547-9f84-a5ab4a3c20b0 cmd="pnpm snapshot:check" waitedMs=0 exit=0 pid=3040 at=2026-09-09T13:08:57.362Z
RUN ticket=88 runId=0957d727-f348-4f00-9264-bcb54c873bbd cmd="pnpm publish:pre" waitedMs=0 exit=0 pid=9140 at=2026-09-09T13:08:58.224Z
RUN ticket=88 runId=5f162e1f-6a65-4adb-abb7-ecf24e3cfbee cmd="pnpm test" waitedMs=70040 exit=1 pid=29640 at=2026-09-09T13:10:37.920Z
RUN ticket=88 runId=b50b8151-6f16-4976-b380-e88ca254aae6 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=0 exit=0 pid=25300 at=2026-09-09T13:17:07.610Z
RUN ticket=88 runId=5f559d23-e3af-43db-a9a8-03391b96ab5f cmd="pnpm build" waitedMs=0 exit=0 pid=10960 at=2026-09-09T13:17:13.238Z
RUN ticket=88 runId=94deb914-4c3d-42bb-b4d7-c398c0a573c6 cmd="pnpm boundaries" waitedMs=0 exit=0 pid=26644 at=2026-09-09T13:17:14.118Z
RUN ticket=88 runId=772de269-896d-4f12-978d-1b077332af16 cmd="pnpm snapshot:check" waitedMs=0 exit=0 pid=12420 at=2026-09-09T13:17:14.974Z
RUN ticket=88 runId=eac23e36-5de4-4dbc-a209-d6bee7b3dd83 cmd="pnpm publish:pre" waitedMs=0 exit=0 pid=3496 at=2026-09-09T13:17:15.836Z
RUN ticket=88 runId=e5c818a9-3526-4dca-a50e-b83f8b157b08 cmd="pnpm test" waitedMs=20019 exit=1 pid=17144 at=2026-09-09T13:18:04.449Z
RUN ticket=88 runId=bebc75dc-eac5-48d4-9de6-f9a8bcccfe08 cmd="node docs/research/t88-probe-impl-b.mjs" waitedMs=10015 exit=0 pid=19484 at=2026-09-09T13:18:07.387Z
RUN ticket=88 runId=092364f9-ba26-4510-8e83-6329d0e951ae cmd="pwsh -NoProfile -File .scratch/orchestrator/blue5-gates.ps1" waitedMs=0 exit=1 pid=29720 at=2026-09-09T13:18:07.433Z
RUN ticket=88 runId=811ff3ef-0454-4e61-a6bd-6dcaab861ca0 cmd="node docs/research/t88-probe-impl-a.mjs" waitedMs=0 exit=0 pid=28828 at=2026-09-09T13:18:08.705Z
RUN ticket=88 runId=eb38bd3e-2686-4840-ac3a-c76e12f60c9f cmd="node docs/research/t88-probe-shell3.mjs" waitedMs=0 exit=0 pid=30892 at=2026-09-09T13:18:08.849Z
RUN ticket=88 runId=d0b9cd73-4021-4540-8ffe-9b6d575e4382 cmd="node .scratch/orchestrator/blue5-gates.mjs" waitedMs=0 exit=0 pid=26712 at=2026-09-09T13:18:25.091Z
RUN ticket=88 runId=831eef53-6d39-4a56-b750-22ce63736a9d cmd="node .scratch/orchestrator/blue5-test.mjs" waitedMs=10012 exit=0 pid=7320 at=2026-09-09T13:19:14.291Z
RUN ticket=88 runId=a4d34cb2-949a-460c-b606-dcfe9d1de79a cmd="node docs/research/t88-browser-evidence-b.mjs" waitedMs=70065 exit=0 pid=28056 at=2026-09-09T13:19:26.988Z
RUN ticket=88 runId=64960119-d837-4886-8910-f1a832ceef97 cmd="node --test packages/skill-calorie/test/softdelete-120.test.mjs" waitedMs=70047 exit=0 pid=31316 at=2026-09-09T13:19:48.342Z
RUN ticket=88 runId=b2e03191-7375-464c-803f-854c1c19db71 cmd="node --test packages/skill-calorie/test/softdelete-120.test.mjs" waitedMs=0 exit=0 pid=27844 at=2026-09-09T13:19:54.724Z
RUN ticket=88 runId=55f0c0ed-a84f-4f24-9888-fc5a48eae305 cmd="node --test packages/skill-calorie/test/m5-receipt-97.test.mjs" waitedMs=0 exit=1 pid=29956 at=2026-09-09T13:20:15.104Z
RUN ticket=88 runId=7dbd6f1d-1517-4044-9afe-68f0377ea665 cmd="node --test packages/skill-calorie/test/m5-receipt-97.test.mjs" waitedMs=1 exit=1 pid=29496 at=2026-09-09T13:20:31.006Z
RUN ticket=88 runId=9b3614f3-6107-432a-8781-c4befa7678c4 cmd="node --test packages/base-render/test/help-center-js-88.test.mjs packages/base-render/test/help.test.mjs packages/base-render/test/style.test.mjs packages/base-render/test/contract-signatures.test.mjs packages/base-render/test/controls.test.mjs" waitedMs=1 exit=0 pid=17424 at=2026-09-09T13:20:32.498Z
RUN ticket=selftest runId=833f283a-cd01-4265-b821-84d0f77ccb46 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=10008 exit=1 pid=27496 at=2026-09-09T12:57:58.846Z
RUN ticket=selftest runId=e9bc86ef-28a7-4b35-96ac-0a5574415734 cmd="node --test tooling/test/run-locked.test.mjs tooling/test/check-gate-audit.test.mjs" waitedMs=0 exit=0 pid=8964 at=2026-09-09T13:00:28.807Z
```

> 提交本次证据（第 2 次提交）的 `git add`／`git commit` 两条条目在对账窗口 `--until 13:20:33Z` **之后**，故不参与本次对账；其 runId 见本席回报（第三方可用 `--log .scratch/locks/gate-runs.log` 全量复核）。

