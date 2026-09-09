# #121 定点复核报告（被审：返修 `835b6f5`）

> 复核席（独立 session，单席）。被审 `835b6f5`（返修红队 S2-1／S3-1）；基线 `d0e0546`／红队 `8244445`／蓝队 `5a0dc02`。
> 复跑一律经 `node tooling/run-locked.mjs --ticket 121-recheck -- …`；自写脚本 `.scratch/orchestrator/rev121-*.mjs`（**不引用**被审脚本）。

## 0. 结论

红队两条主缺陷**均真闭环**（S2-1：干净重建后 5 连跑全绿＋同 dist 旧版对照红；S3-1：指纹实测对 CSS 面敏感），产品面**零改动**。未发现 S1／S2；仅一条 S3（行号引用过期）。→ **verdict PASS（五维 96／均分 96）**。

## ① S2-1 闭环：干净重建 ＋ 5 连跑台账

我自己删 `packages/base-render/{dist,tsconfig.tsbuildinfo}` 后持锁 `pnpm build` → **exit 0**（runId `2a184e56`）；产物指纹 `index.js 2396f0b2…／controls.js 576538c8…／style.js 839e5919…`，5 轮**逐轮相同**（每轮各一次持锁包装器 `e291cbe0`／`aa659356`／`2974949a`／`67f617ad`／`14efd215`）。

| 轮 | exit | 结论 | A6 轮询（主口径） | MutationObserver | 驱动侧（仅参照） | 两计时器差 | addLatency |
|---|---|---|---|---|---|---|---|
| r1 | 0 | 22/22 PASS | 458.3ms | 453.3ms | 397ms | 5.0ms | 5.5ms |
| r2 | 0 | 22/22 PASS | 455.3ms | 451.0ms | 400ms | 4.3ms | 8.6ms |
| r3 | 0 | 22/22 PASS | 455.8ms | 451.3ms | 431ms | 4.5ms | 15.3ms |
| r4 | 0 | 22/22 PASS | 458.9ms | 454.9ms | 433ms | 4.0ms | 17.1ms |
| r5 | 0 | 22/22 PASS | 458.3ms | 453.8ms | 398ms | 4.5ms | 5.9ms |

→ **5/5 全绿**。轮询 455.3–458.9ms（下界余量 ≥15.3ms、上界余量 ≥61.1ms），MutationObserver 451.0–454.9ms，驱动侧仍漂 397–433ms——与红队 S2-1 的伪红源逐字吻合。
**同 dist 对照（决定性）**：把 `d0e0546` 版脚本放在**同一份**干净 dist 副本上跑 → A6 实测 **396ms < 400 → 红**（20/21，exit 1）；返修版同轮 455.7ms → 绿。伪红已消除，且**非靠放宽**：旧窗 400–600，新窗 440–520，**两端都收紧**。

## ② M4 变异（独立重跑，单锁窗口）

`HELP_COPY_COPIED_MS 450→0`（变异 sha `018B1304…`，runId `780bb51a`）→ 构建 0；单测 **pass 5／fail 5**（`S2 … 0 !== 450` 红）；CDP **14/22 → 8 红**（A2 A3 **A6** **A10** B2 B3 C2 C3），A6 实测 `0ms`、A10 `pollAdd=null` → 两条新断言**真红**。还原 → sha256 `82575C21…7DCF` **相等** → 重建 0 → 单测 10/10、CDP **22/22**（exit 0）。另跑一轮得 7 红（A2 因驱动侧采样恰好捕获 ~1ms 类窗而绿）→ 红条数 7–8 随采样波动，**A6／A10 稳定红**。

## ③ S3-1 闭环（副本 CSS-only 漂移；仓库文件零改动）

干净 dist＋两版脚本复制到独立假根，先各跑一次取基线，再把**副本** `dist/style.js` 中 `.help-shell-btn.copied, .help-shell-card-copy.copied` 的 `background: var(--ok)` → `var(--blue)`，各再跑一次：

- 返修版指纹：`index.js SAME｜controls.js SAME｜style.js CHANGED`（`839e5919…`→`b28dcf85…`）→ **对 CSS 面敏感**；同时 A3／B3 转红（C3 仍绿＝#75 独立规则，层叠归属正确）。
- `d0e0546` 版指纹：`index.js SAME｜controls.js SAME` → **对 CSS 面失明**（红队 S3-1 复现）。

→ S3-1 闭环，且漂移在**指纹面与断言面双重可见**。

## ④ 产品零改动

`git diff d0e0546..835b6f5 -- packages/base-render/src/` **空**；`git hash-object` 与 `d0e0546` blob **逐字节相等**；sha256 `controls.ts 82575C21…7DCF`／`style.ts 04182D2D…EC5F` 与声称一致（M4 变异还原后我复核仍相等）。返修 commit 只动 3 个 `docs/research/` 文件（`git show --numstat`：78/13＋100/46＋17/1 ＝ **+195/−60**，与声称吻合）。

## ⑤ 新引入检查（含窗口上界是否过宽）

- **上界 520 是否过宽**：520 ＝ 规格 450＋70ms（+15.6%），单看 A6 区分不了 450 与 520；但**精确值由单测 S2 逐字钉死**（`copy-copied-121.test.mjs:213 assert.equal(copiedMs, 450)`＋跨文件 `.45s` 同源）。结合 A6 相较改前 400–600 两端收紧、我 5 轮最大 458.9ms（余量 61ms）→ **不过宽**，属「运行期带＋规格钉死」的分工（证据 §3 已写明）。
- **A10 阈值**：实测 delta 4.0–5.4ms（阈 25）、addLatency 4.2–17.1ms（阈 30），余量 ≥1.7×；M4 下真红 → 非恒真。
- **隐式依赖**：仅新增 `MutationObserver`／`performance.now`／`setTimeout`（标准 API）；无新参数／env／文件依赖。三处脆弱点（>900ms 观察窗、页面节流到秒级、addLatency 超 30ms）**只会误红、不会误绿**。
- **新缺陷（S3）**：`t121-copied-runtime.md:106` 仍引 `t121-browser-evidence.mjs:80-84`（浏览器守卫），返修在其上方插入 ~12 行后实际为 **:95-98**（旧值亦已偏 3 行）→ 行号过期，不影响结论。

## ⑥ 门禁

四门＋#96 门＋靶向测试（持锁 `1bc6f6b6`）**8/8 exit 0**：`pnpm build`／`boundaries`／`snapshot:check`／`publish:pre`／`snapshot:html:check`（185 件 changed=0）／`copy-copied-121` **10/10**／契约 54/54／base-render 全量 **475/475**。
> 首次尝试（`262b985a`）`pnpm build` **exit 2**：4 条 TS2304 全在 `packages/skill-calorie/src/cli/cmd_read.ts`（他席在途 WIP），**base-render 零诊断**；待其落定后复跑即 8/8 绿。

canonical `pnpm test`（1 轮，`663a348f`）：tests 1134／pass 1107／**fail 27**／exit 1；`t101-fail-set` → **base=34 after=31 新增=2 消失=5**。两条新增＝`落库 · 运动 update…`／`覆盖门 · 35 写键…`，均在 `packages/skill-calorie/test/cmd-write-40-persist.test.mjs`，**单跑 17/17 绿**（`9a31f38d`）→ 抖动类、**与本票零关联**（返修零代码改动）；31 条红**无一在 base-render**。
白名单 `git diff d0e0546..835b6f5 -- docs/research/t88-baseline/test-failset.txt` = **0 行**。`check-gate-audit` 复跑 → **matched=44/44 scoped=44 undeclared=0，PASS（exit 0）**。
`git status --short` 自检：`SKILL.md` 30052 B、`git diff` 空；工作区仅余**他席** WIP（skill-calorie src/test）与未跟踪 tmp 目录；本席只写 `.scratch/orchestrator/rev121-*`（§③ 探针只读副本、不触共享 dist，故未取锁）与本报告。

## ⑦ 五维＋verdict

| 维 | 分 | 依据 |
|---|---|---|
| 契约一致 30 | **29** | 返修零产品改动；src 与 `d0e0546` 逐字节相等；签名／常量不导出／spec 面不动 |
| 证据真实可复现 25 | **24** | 干净重建＋5/5 全绿＋同 dist 旧版对照红；M4 8 红含 A6/A10；指纹实测敏感。扣 1：M4 红条数 7–8 属单样本表述 |
| parity 20 | **19** | 22/22（三面＋失败面＋剪贴板回读）独立复现；连点语义仍为记账项（红队 S3-3，未变） |
| 工程红线 15 | **15** | 全程持锁；变异窗口单锁内完成且 sha 还原；未 push／未 install；仓库零残留 |
| 文档同步 10 | **9** | §3 计时口径＋5 连跑台账＋M4＋§8.6 持锁口径齐备。扣 1：`:80-84` 行号过期 |

**加权合计 96／均分 96（≥85）、S1 0／S2 0（S3 1）→ verdict：PASS**。红队 FAIL 84 的两条依据已消除，产品面无需改动。
