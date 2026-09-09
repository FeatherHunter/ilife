# 整图验收方案：用什么一次性端到端证据判定「体验与旧版一样」

- 归属：地图 **#63**《卡路里·本体图（1/3）parity 极致重做》→ `## Not yet specified` 最后一条
  「**整图验收：三条主线全绿后，用什么一次性的端到端证据判定『体验与旧版一样』**」。
- 本文件＝**设计交付**（判据／证据形态／覆盖矩阵／缺口／方案对比／拍板点）。**不改任何代码**：
  本轮只新增两个受跟踪文件——本文件 ＋ 只读采集器 `docs/research/t-help-acceptance-collect.mjs`；
  零 `packages/**`／`tooling/**`／既有 `docs/**` 改动。
- 纪律：本文引用的每个数字都带**来源文件＋行号**或**可复算命令**；本轮实测的持锁运行逐条给 `GATE-RUN`。
- 结论摘要见 §0；判据见 §2；证据形态见 §3；对账见 §4；缺口见 §5；方案见 §6；拍板见 §7。

---

## 0. 结论摘要（先读这一节）

**推荐方案 B**：新增一个**受跟踪的编排脚本** `docs/research/t-help-acceptance.mjs`（唯一入口），
一条命令跑完三条主线的全部终局判据，末行给三条机器可读摘要行，并把结果落成受跟踪报告
`docs/research/t-help-acceptance-result.md`；原始产物落 `.scratch/acceptance-63/<runId>/`（不入库）。

三条主线各一条摘要行（格式与既有证据脚本一致，见 `t83-evidence.mjs:251`）：

```
RESULT-L1: n/m   # 主线① 唤醒词 → HTML（436 逐条入桶／exec 实跑 exit 0／命中即渲染／门面 69 词）
RESULT-L2: n/m   # 主线② 卡路里HELP 速查台（10-54-436 数据模型／F3 逐字 parity／B1 逐值 20 条／真实浏览器交互）
RESULT-L3: n/m   # 主线③ 共享层（冻结面 130／四门／5 技能 185 件不回归／零依赖／canonical 失败集新增 0／#79 收口）
RESULT-63: n/m   # 整图：三条主线全绿 ∧ 缺口台账无「阻断」项
```

**现状（本轮实测，2026-09-09；含返修 R-4 的复跑）**：
- `RESULT-L1 = 1/4`：A3 绿（`t83-evidence` 21/21）；**A1 判据漂移 19 项**（`t81-route-evidence`，非产品缺陷）、
  **A2 日期依赖 1 条**（`复制昨日运动`，397/398；其判据在 `test/calorie-routing-81.test.mjs:293` 里**已经是红的**，
  但被基线白名单掩盖）、A4 未复跑。
- `RESULT-L2 = 5/8`：B1／B2／B3 绿（45/45）、**B4 绿**（`t88-probe-impl-a.mjs` `RESULT: 44/44 fails=0`）、
  B7 绿（description 499 字符含「卡路里HELP」）；**B5 改为「自有档」后已可全绿**（`t121` 22/22 ＋ `t88-b` 29/29，合计 11.7 s）；
  **B6 只剩 H-12／H-20／12 区块 computed 需 #89b**；**B8 运行时入口不可判定**（跨图缺口，见 §5-4）。
- `RESULT-L3 = 4/6`：C1 绿（冻结面 130／implemented 130／pending 0）、C2／C3／C4 有 E3 未复跑；
  **C6 #79 收口未产出**。
- 静态对账层（本方案已落地）：**29/29 PASS**（`runId=0b4fd778-…`，含返修新增的两条交叉来源校验）。

⇒ **当前不满足「整图全绿」**，且不满足的原因**全部是「票未收口」「判据未重基线」或「环境／日期依赖」，
没有一条是产品缺陷**（依据见 §2 各条的实测与 §5）。
**本轮最重要的发现**：主线① 的两条「应该绿」的判据，一条因**证据脚本未重基线**而假红、一条因**日期依赖 ＋ 白名单**
而**真红却没人看得见**——这两条都只有「把整图证据串起来跑一次」才会暴露，这正是本文要设计的东西。

---

## 1. 口径与证据分级

### 1.1 「体验与旧版一样」在本文的落地口径

地图 Destination 的三条主线＋重构失败点（`gh issue view 63` → `## Destination`）给出的是**能力面**要求，
不是像素面要求。本文据此把「一样」拆成三层，并**只对前两层要求「逐条全绿」**：

| 层 | 判什么 | 判据来源 | 允许的偏离 |
|---|---|---|---|
| **L-A 能力面** | 旧版能做、新版也能做：436 词命中／渲染／HELP 速查台／共享层能力 | 本文 §2 的可复算命令 | 0（逐条全绿） |
| **L-B 契约面** | 新旧同质的**可断言形式**：B1 逐值 20 条（`docs/visual-spec-help.md`）＋ 内容页 12 区块（`docs/visual-spec-blocks.md`） | 同上 | 只允许**已裁定**的偏离（R35 与各票台账） |
| **L-C 像素面** | 截图级／DOM 同构级「看起来一样」 | — | **明确不要求**（`docs/calorie-architecture.md:97`：「不要求 DOM 同构」；`docs/visual-spec-blocks.md:253`：「不做截图 diff」） |

> 这不是本文自定的宽松：R35 已裁定「**旧版 HELP 实例的 18 处差异 = 旧版未达 B1 = 新版改进项，不是缺陷**」
> （`docs/visual-spec-help.md:8`），且基准取 B1 逐值而非旧版实测值。本文把这条裁定**落成判据的可执行形式**（§2.2-B3、§5-8）。

### 1.2 证据分级（沿用仓内既有分级）

| 级 | 含义 | 在本文里的用途 |
|---|---|---|
| **E1 冻结对照物** | 入仓、有 sha256 的旧版实例 | `fixtures/help-instances/*.html`（2 件） |
| **E2 可复跑脚本** | 受跟踪、末行 `RESULT: n/m`、退出码语义明确 | `docs/research/*.mjs`、`packages/**/test/*.test.mjs` |
| **E3 票面／报告台账** | 人写、可被 E2 复核 | `docs/research/t*-*.md`、`gh issue view` |
| **E4 旧树现场** | 只在 `D:\2Study\StudyNotes\SKILLS\卡路里` 存在 | **不得作为验收输入**（不在仓、新克隆不可复跑），只用于本文的计数核对 |

> **硬约束**：整图验收的输入**只许是 E1＋E2＋E3**。任何「必须读旧树才能判」的条目自动降为缺口（§5-6）。
> 旧树只读纪律：**禁读 `.个人笔记不允许参考`**（`gh issue view 63` → Notes）。

### 1.3 计数基线（本文所有数字的唯一出处）

| 量 | 值 | 来源／可复算命令 |
|---|---:|---|
| 旧版唤醒词 SoT | **436**（434 唯一词） | `docs/research/t71-old-trigger-records.csv` = **437 行**（1 表头＋436）；`help-center-88.test.mjs:48` 断言 `TRIGGERS.length === 436` |
| 旧版模板 | **73** | `docs/research/t71-old-baseline-inventory.md:226-234`；旧树 `templates\*.html` 实测 73 |
| 旧版渲染脚本 | **67** | `t71-old-baseline-inventory.md:283-295`；旧树 `scripts\render_*.py` 实测 67 |
| 新版注册键 | **99**（读 64 ＋ 写 35） | `packages/skill-calorie/test/cmd-read-t11.test.mjs:79-80`；`combos.yaml` 中 `calorie.*` 键 99 条 |
| 跨技能共享键表 | **109**（99 calorie ＋ 10 memo） | `packages/base-combos/src/present.ts`（正则计数） |
| 路由两桶 | **exec 341 ／ non-exec 95** | `help-center-106.test.mjs:66-67`（断言字面值）；采集器 C4/C11/C12 交叉校验 |
| exec 来源分解 | **直连 56 ＋ override 22 ＋ 孪生 26 ＋ 参数化 222 ＝ 326，另有「未分类 15」** | 分解式由 `t81-route-evidence.mjs:460` 的断言打印（**该断言当前红**，见 §2.1-A1）；「15」＝该脚本 15 条「家族未派生但路由层为 exec」（#111–#113 促进、族派生模型未重基线） |
| 新拟入口／覆盖修复 | **56 ／ 1** | `routing.ts` `NEW_KEY_ROUTES`／`COVERAGE_REPAIR_ROUTES`（采集器 A7/A8 断言） |
| HELP 数据模型 | **10 分组／54 子功能／436 场景** | `help-center-88.test.mjs:44-48` |
| B1 逐值 | **20 条**（H-01…H-20） | `docs/visual-spec-help.md:47-49,241-251` |
| 内容页区块 | **12 个**（B-01…B-12） | `docs/visual-spec-blocks.md:26-41` |
| base-render 冻结面 | **130 条（implemented 130／pending 0）** | `packages/base-render/src/spec/index.ts` 正则计数（本轮实测） |
| 旧 HELP 实例 | **2 件**：65,366 B ／ 73,811 B | `fixtures/help-instances/README.md:15-16` |
| 新版 HELP 产物 | **file 1,264,822 B ／ text 24,989 B** | 本轮 `t83-evidence.mjs`（`runId=3820de4c-…`）。**注意**：`t88-final.md:166` 的 L-16 记的是 **1,010,979 B**（#88 时点），两者不同源，勿混用 |
| 旧版 SKILL.md | **2196 行** | `(Get-Content … -Raw) -split "`n"` 计数；地图写 2195＝去尾空行口径 |
| `docs/research/` 受跟踪件数 | **267**（本席本轮实测；`4d33dfe` 时点为 **243**） | `git ls-tree -r HEAD --name-only docs/research \| Measure-Object -Line` |

---

## 2. 三条主线各自的终局判据

每条判据给四件东西：**可复算命令**／**期望输出**／**失败长什么样（真失败 vs 判据漂移 vs 抖动）**／**机读摘要行**。

### 2.0 运行纪律（三条主线共用）

1. 一切会读共享 `dist/` 或写仓内产物的命令**必须**经持锁包装器（协议 §2.4）：
   `node tooling/run-locked.mjs --ticket 63 -- <cmd>`；留痕在 `.scratch/locks/gate-runs.log`。
2. 判「红/绿」**看内层 `RUN … exit=<n>` 与脚本末行 `RESULT:`，不看 PowerShell 进程退出码**——
   实测：本轮 `pwsh` 整体返回 1，而两条命令的 `RUN … exit=0`（`run-locked` 把 `LOCK-*` 写 stderr，
   PowerShell 会把 stderr 当错误记录）。**这是最容易误判成「真失败」的一处。**
3. canonical `pnpm test` 在冻结基线上**必然 exit 1**（基线既有红 25 条），判据是**失败集新增 = 0**，
   不是 exit 码（`t88-final.md:46`、`t83-review-red.md:73`）。
4. **抖动（flake）不得由编排层自动豁免**：`t88-delta-flake-ruling.md:75`「本判据**只能**由编排者按三步判定逐条裁；
   session 不得自行援引第 1 条豁免」、`:104`「session 只登记事实形态，不得自行主张豁免」。
   ⇒ 编排层**只输出事实形态**（签名／单独复跑次数／是否在冻结基线红名单内），豁免字段留空并标 `pending-ruling`。
   另：**在冻结基线红名单里的条目永远不能主张 B 类**（`t88-delta-flake-ruling.md:95-102` §5.2-1 的反自利守卫）。

---

### 2.1 主线① 旧版全部唤醒词在新版同样命中并产出对应 HTML

| 子判据 | 可复算命令 | 期望输出 | 现状 |
|---|---|---|---|
| **A1 逐条入桶** | `node tooling/run-locked.mjs --ticket 63 -- node docs/research/t81-route-evidence.mjs` | `WAKE_ROUTES.length === 436`；`non-exec 95 ＝ 10＋85`；**exec 分解不变量**：`直连 56 ＋ override 22 ＋ 孪生 26 ＋ 参数化 222 ＋ 未分类 = EXEC_ROUTES.length`，且**未分类必须为 0**；核对失败 **0** | ⚠️ **19 项红**（`runId=2e31333e-…`）。当前 `未分类 = 15`（不是 0）——**照抄旧分解式 `56+22+26+222` 会得到 326≠341，永远绿不了** |
| **A2 exec 实跑** | `node tooling/run-locked.mjs --ticket 63 -- node docs/research/t81-exec-smoke.mjs` | exec 桶逐条 `exit 0` ＋ `envelope.key === route.key`；即 **398/398** | ⚠️ **397/398**：唯一红＝`复制昨日运动`（`calorie.exercise.add`）`exit=4`「昨日无运动记录可复制」；**日期依赖**（见下），已由 `t81-exec-smoke.md:15-18,538-539` 登记。**同一条红也被 `test/calorie-routing-81.test.mjs:293` 断言**（`actual:1 expected:0`，读 `.md` 快照），且该用例已在冻结基线白名单内（`t88-baseline/test-failset.txt:16`）→ **没有任何 CI 会因此变红**；**5b 修好后该用例自动回绿**（它读的正是同一份快照） |
| **A3 命中即渲染（M4）** | `node tooling/run-locked.mjs --ticket 63 -- node docs/research/t83-evidence.mjs` | `RESULT: 21/21 PASS`；其中 `⑤-81 联动 命中即渲染` 逐词 → `file` 态 | ✅ 本轮实测 `21/21`（`runId=3820de4c-…`）；**但只有 5/436 抽样**（见 §2.1 失败表末行） |
| **A4 门面 69 词** | `node tooling/run-locked.mjs --ticket 63 -- node docs/research/t82-verify-triggers.mjs` | `RESULT: 69/69`（全在 SoT 且被路由命中；exec 60／non-exec 9） | E3 有（`t82-skill-facade.md`），**未在本轮复跑**（0.06 s，随时可跑） |

**摘要行**：`RESULT-L1: n/4`（n = A1…A4 通过数）。**本轮 = 1/4**（仅 A3 绿；A1 判据漂移、A2 日期依赖、A4 未复跑）。

#### 失败长什么样

| 形态 | 签名 | 判读 |
|---|---|---|
| **真失败** | 某条 `cli` `exit≠0` 或 `envelopeKey ≠ route.key`；或 `WAKE_ROUTES.length ≠ 436`（SoT 漂移） | 产品缺陷：路由层／键缺失／取数失败 |
| **判据漂移（假红）** | 该脚本最后改动停在 `52e6fc8`（#81），而 #111／#112／#113／#86 已把口径推到 99 键／56 新拟／341 exec。**19 项红的实际构成 = 1 ＋ 15 ＋ 3**：①**1 项**漂移汇总「路由层与冻结表漂移 30 处」；②**15 项**「家族未派生但路由层为 exec」（**族派生模型未重基线**，不是硬编码常量）；③**3 项**常量断言：`covered.size === 77`（`:430`）、`NEW_KEY_ROUTES.length === 34`（`:434`）、`exec 来源分解 56+22+26+222 ≠ 341`（`:460`） | **不是产品缺陷**，是**判据未随票据重基线**；注意脚本只打印前 5 条漂移（`:315` `drift.slice(0,5)`）→ **30 处漂移不全可见**，重基线时须要求全量落盘 |
| **日期依赖（时间炸弹）** | `复制昨日运动` → `copyFrom:"yesterday"`（`routing.ts:300`）由**系统日期**决定（`write.ts:558` → `fetch/exercise.ts:247 copyYesterday`），而标准种子库（`t81-seed.mjs:70-78`）只种**绝对日期** `2026-09-01…07`。**同一命令 2026-09-08 绿、2026-09-09 红** | 既非产品缺陷也非抖动：**判据随墙钟变化**。修法二选一：种子补「相对今天的前一天」数据，或该词降 non-exec 并写理由 |
| **抽样冒充全量** | A3「命中即渲染」只验 5 个词（`t83-evidence.mjs` `⑤-81` 逐词列出恰 5 个） | 判据必须写明覆盖面；若要全量，须另测（逐词 436 次 spawn，成本另计） |
| **抖动（事实形态，待裁）** | `exit=3221225477 (0xC0000005)` ／ `3221225501 (0xC000001D)`、stderr 空、干净重建后单独复跑 ≥2 次绿 | **编排层只登记**（签名／复跑次数／是否基线红），**豁免由编排者逐条裁定**（`t88-delta-flake-ruling.md:75,104`）；在基线红名单内的条目**不得**主张 B 类 |
| **并发假红** | 同一秒两条命令都写 `calorie_html/<中文command>_<TS>.html` → **互相覆盖**（#128：`output.ts` 探测-写入非原子） | 验收脚本**必须串行** ＋ 每条显式 `--output` 到独立 tmp 目录 |

> **A1 的处置是整图验收的第一个硬需求**：要么（a）把 `t81-route-evidence.mjs` 的常量**重基线**到当前口径，
> 要么（b）在验收脚本内**自建**当前口径断言、把该脚本降级为「历史快照」。本文推荐 (a)＋(b) 并用：
> 重基线保「同一脚本可复跑」，验收脚本再独立断言一次（互为对照）。归属见 §5-5。

---

### 2.2 主线② `卡路里HELP` 打开的完整能力速查台与旧版 HELP HTML（UI＋功能）同质

| 子判据 | 可复算命令 | 期望输出 | 现状 |
|---|---|---|---|
| **B1 数据模型** | `node --test packages/skill-calorie/test/help-center-88.test.mjs` | 10 分组／54 子功能／436 场景；`id 436/436` 唯一；三态同源 | ✅ 本轮 45/45（含 91／106，`runId=962cac71-…`） |
| **B2 CLI 三态接线** | `node --test packages/skill-calorie/test/help-center-91.test.mjs` | `file`＝完整文档／`inline` 片段不入 envelope／`text` 纯文本；非法 `mode` exit 2 | ✅ 同上 |
| **B3 F1／F2 回补** | `node --test packages/skill-calorie/test/help-center-106.test.mjs` | 341/436 场景带可执行 CLI 行；95 条**不发且不造占位**；卡面 id 436/436 | ✅ 同上 |
| **B4 F3 逐字 parity** | `node tooling/run-locked.mjs --ticket 63 -- node docs/research/t88-probe-impl-a.mjs` | **`RESULT: 44/44 fails=0`**（其中「F3 对账：436 条 `prompt_template` 逐字相等」是**一条**断言内部遍历 436 条，故**不要**把期望写成「436/436」） | ✅ 本轮实测 `44/44 fails=0`（0.27 s） |
| **B5 真实浏览器交互（自有档）** | `node tooling/run-locked.mjs --ticket 63 -- node docs/research/t121-browser-evidence.mjs` ＋ `… node docs/research/t88-browser-evidence-b.mjs` | `RESULT: 22/22 PASS` ＋ `RESULT: 29/29 fails=0`；覆盖 H-16（复制／Sheet／通用／失败态）与 H-19（`#backTop` 5 用例）＋ 搜索／无 JS 436 卡 | ✅ **两套件均受跟踪、实测 11.7 s 全绿**（`t121` 5.3 s／`t88-b` 6.2 s）。**需本机 Chrome**；CI 无此步（`.github/workflows/ci.yml` 117 行） |
| **B6 视觉锁（外部档）** | `node tooling/run-locked.mjs --ticket 63 -- node docs/research/t105-check-rulers.mjs --strict` ＋ **#89b 只承担三项**：H-12（断点）／H-20（焦点可见＋动效可关）／12 区块 computed | `DEFECT 0`（实测）；H-12／H-20／computed 面由 #89b 产出 | ⚠️ **尺子侧已绿**（`DEFECT 0`／`OLD-DEVIATION 18`／`BLOCKED` 逐字）；**#89b 三项未产出**（本席核验：H-12／H-20 在 `t121`／`t88-b` 里 **零命中**，唯一采样断点的是**未受跟踪**的 `t89-probe-browser.mjs:259-265`） |
| **B7 入口可达（代码侧）** | `node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-acceptance-collect.mjs`（A10/B1） | **`description` 行**（非整文件）含「卡路里HELP」且长度 ≤500（实测 499）＋ 正文逐字命令 3 处（`:3`／`:10`／`:17`） | ✅ 代码侧达成（`t82-skill-facade.md`；采集器 A10 已改为按 frontmatter 行取值） |
| **B8 入口可达（运行时）** | 重装后真机说「卡路里HELP」 | 打开速查台 | ❌ **本图不可判定**：**#64 已于 2026-09-09T14:32:58Z COMPLETED 关闭**，实测 3 处安装副本 `description` 仍为 61 字符且**无「卡路里HELP」** → 归属失效（§5-4） |

**摘要行**：`RESULT-L2: n/8`（B1…B8 通过数；B8 缺件时计 0 并标 `blocked=1`）。**本轮 = 5/8**。

#### 失败长什么样

| 形态 | 签名 | 判读 |
|---|---|---|
| **真失败** | `help-center-88/91/106` 任一 `fail>0`；或 `DEFECT>0`（尺子与冻结常量冲突）；或浏览器实证中「点一次复制 4 次」类断言红 | 产品缺陷 |
| **判据漂移** | B4 的 F3 常量被改动导致「逐字」红；或 `t105-check-rulers.mjs` 的 `OLD-DEVIATION` 被误读成 `FAIL` | R35 口径：`OLD-DEVIATION`＝**旧版差异**（18 条），不是新版缺陷（`visual-spec-help.md:331,369`） |
| **时序抖动（事实形态）** | 浏览器侧 ~31ms 采样导致的伪红——**已有先例**：`t121` 的 A6 在干净 dist 上 6 次复跑 3 次红，返修改为 1ms 轮询 ＋ `MutationObserver` 后 **5 连跑全绿 455–459ms**（`t121-copied-runtime.md` 返修 `835b6f5`） | 时序类判据必须**页面侧计时**，不许驱动侧采样；**是否豁免由编排者裁**（§2.0-4） |
| **环境缺件** | `RESULT: ABORT exit=2`（找不到浏览器／CDP 起不来） | **显式失败，不得静默变绿**（`t88-browser-evidence-b.mjs:5`、`t121-browser-evidence.mjs:57`） |
| **体积误判** | 产物 1,264,822 B vs 旧 HELP 302,820 B | 若把「体积」写成验收项会红，但那是**设计选择**（`t106-help-cli-backfill.md` 登记 +22.4%）；**勿与 `t88-final.md:166` L-16 的 1,010,979 B 混用**（不同时点） |

---

### 2.3 主线③ 共享层补齐（base-* 控件层／图表层／HELP 模板／payload-snapshot 契约）

| 子判据 | 可复算命令 | 期望输出 | 现状 |
|---|---|---|---|
| **C1 冻结面完整** | `node --test packages/base-render/test/contract-signatures.test.mjs` | 130 条签名全绿；`SPEC_FROZEN_SURFACE` 130（implemented 130／pending 0） | ✅ 本轮 `help-center-88.test.mjs` 内 A2 用例亦断言（45/45 中） |
| **C2 四门** | `pnpm build` ／ `pnpm boundaries` ／ `pnpm snapshot:check` ／ `pnpm publish:pre` | 四门 `exit 0` | E3 有（`t83-review-red.md:64-69`），**未在本轮复跑**；实测各 **0.8–1.2 s**（见 §3.2） |
| **C3 其余 5 技能不回归** | `pnpm snapshot:html:check` | 185 件 HTML 逐件 sha256 相等 | E3 有（#96：活体实证 `changed=0`）；实测 **0.5–0.8 s** |
| **C4 零依赖／零 DOM／无 canvas** | `pnpm boundaries` | 13 条 OK（含 6 条 base-* 影响面断言） | 同 C2 |
| **C5 canonical 失败集新增 0** | `node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt <新日志>` | `新增=0` | 基线文件受跟踪：`docs/research/t88-baseline/test-failset.txt`；**白名单只许缩小**（见 §2.3 失败表） |
| **C6 #79 收尾** | 见 #79 票面 | v1.30 控件签名 × 实现实况**逐条有结论**（每条指名脚本＋断言 id）；三包版本统一；CI 断言绿 | ❌ **未产出**（#79 进度 0%） |

**摘要行**：`RESULT-L3: n/6`。

#### 失败长什么样

| 形态 | 签名 | 判读 |
|---|---|---|
| **真失败** | `SPEC_FROZEN_SURFACE` 出现 `pending>0`；`boundaries` 任一红；`snapshot:html:check` 打印首个差异行 | 共享层缺陷（会波及 6 技能） |
| **判据漂移** | 失败集新增但测试名在基线白名单内 | 按 `t88-delta-flake-ruling.md` §5–§8 具名分类，**不以 exit 码判** |
| **白名单掩盖真红** | 新增一条白名单即「新增 0」 | **白名单只许缩小**；每条必须带「票号＋签名＋复跑次数」；新增白名单条目需 `GATE-RELAX` 式声明（§5-5c 是本条的活体实例） |
| **抖动（事实形态）** | `#93 ① 64 读键`／`#41 M3`／`#76 无宿主证据`／`#80 HELP 生成` 等基线已登记的波动项 | 编排层**只登记形态**；**豁免归编排者**（§2.0-4）；基线红名单内条目**不得**主张 B 类 |

---

### 2.4 本轮实测记录（GATE-RUN，可复算）

GATE-RUN runId=2e31333e-1505-4099-a3eb-ff9e6c74fafc cmd=node docs/research/t81-route-evidence.mjs
GATE-RUN runId=9bba58f1-a6a4-42f9-a243-3a863a3cf2c9 cmd=node docs/research/t81-exec-smoke.mjs
GATE-RUN runId=ac6cf688-9a6a-4845-9865-83668055566a cmd=node docs/research/t81-exec-smoke.mjs
GATE-RUN runId=962cac71-792d-4f37-88ba-7e2bdc7009ac cmd=node --test packages/skill-calorie/test/help-center-88.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/help-center-106.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs
GATE-RUN runId=3820de4c-6e21-4e4b-9901-1e2d43dd62fd cmd=node docs/research/t83-evidence.mjs
GATE-RUN runId=61bd571b-6f18-4800-872b-6461027b89a3 cmd=node --test test/calorie-routing-81.test.mjs
GATE-RUN runId=a6f2874e-d882-45bc-b2cc-f4b3b35e7ccd cmd=node docs/research/t88-probe-impl-a.mjs
GATE-RUN runId=07f81448-0b77-4dd8-95c7-d7b605550d28 cmd=node docs/research/t105-check-rulers.mjs --strict
GATE-RUN runId=0b4fd778-1c9a-43cf-8743-22cc71c042e0 cmd=node docs/research/t-help-acceptance-collect.mjs

GATE-RELAX flag=--allow-nonzero reason=本轮 4 条 exit≠0 是**被观测对象本身**：t81-route-evidence（判据漂移 19 项）、t81-exec-smoke ×2（日期依赖 1 条）、calorie-routing-81（FX-81-5 快照红）——它们正是本文要分类的「红」，不是门禁失败
GATE-RELAX flag=--allow-undeclared reason=对账窗口内同时有 #89／#83／#79 与他席 #63 session 的运行，非本席声明面

**对账实测**（返修 R-4 后重跑）：`node tooling/check-gate-audit.mjs --evidence docs/research/t-help-acceptance-plan.md --ticket 63 --since 2026-09-09T15:38:50.000Z --until 2026-09-09T16:05:00.000Z --allow-nonzero --allow-undeclared`
→ 见文末「返修 R-4」小节 §R-4.1 的实测行。

- `2e31333e`：**19 项核对失败**＝ **1（漂移汇总「路由层与冻结表漂移 30 处」）＋ 15（「家族未派生但路由层为 exec」）＋ 3（常量断言）**（§2.1 失败表第 2 行）。
  该轮 stdout 打印的分解式 **`341 ＝ 56＋22＋26＋222` 本身是错的**（合计 326）——它正是脚本 `:460` 报的那条红；
  **未分类 15 条**是 #111–#113 促进后族派生模型未重基线的产物。另：`non-exec 95 ＝ 明确不做 10 ＋ 该词自身未承接 85（含 wizard 5 条）`；
  `新拟 56 ＋ 覆盖修复 1`；`SoT 436 条里 main_prompt.cli 以 py 起头：370；含 py：372；可执行：60`。
- `9bba58f1`／`ac6cf688`：**两次复跑输出逐字一致**（`exec 桶记录数 398 ／ 原样 exit 0 = 393 ／ 占位符替换后 exit 0 = 4 ／ 非零 1`），
  证明该红**确定性**、非抖动；唯一红＝`复制昨日运动`（日期依赖，§2.1 失败表第 3 行）。**实测耗时 58.1 s**。
- `962cac71`：`tests 45／pass 45／fail 0`（4 个测试文件，4.4 s）。
- `3820de4c`：`RESULT: 21/21 PASS`；其中 `①-file calorie.help.center … bytes=1264822`、
  `③-text … bytes=24989`、`⑤-81 联动 命中即渲染` **5/5 词（抽样）**。实测 3.0 s。
- `61bd571b`：`test/calorie-routing-81.test.mjs` `tests 8／pass 7／fail 1`，唯一红＝
  `FX-81-5 不变量：exec ⟺ 实跑 exit 0`（`actual:1 expected:0`，读 `.md` 快照）；D2①（436／341／95）
  与 D2③（99 键全入口）等 7 条**全绿**——说明「测试已随票据更新、证据脚本没有」（§2.1 失败表第 2 行）。
- `a6f2874e`：`t88-probe-impl-a.mjs` **`RESULT: 44/44 fails=0`**（B4 的期望输出据此改正）。
- `07f81448`：`t105-check-rulers.mjs --strict` exit 0；**BLOCKED 逐字**：`H-10 圆角 token`、
  `H-02/H-05/H-12/H-16 「渲染后 computed 值」类判据`；`N/A 2 条`＝H-13／H-14。
- `0b4fd778`：**静态对账层 29/29 PASS**（含返修新增 C11／C12 交叉来源，见 §3.1）。

> **这些红/绿样本正好演示了本文的核心主张**：整图验收的价值不在「再跑一遍测试」，
> 而在**把红分成五类**（真失败／判据漂移／日期依赖／抽样冒充全量／抖动-待裁）并让每一类有归属。

---

## 3. 一次性端到端证据的形态

### 3.1 形态：编排脚本 ＋ 受跟踪报告（不新造测试体系）

```
docs/research/t-help-acceptance-collect.mjs   # 静态对账层（**本方案已落地并跑绿**：29/29，runId=0b4fd778-…）
docs/research/t-help-acceptance.mjs           # 编排层（待建：串起 §2 全部命令，末行给三条 RESULT 行）
docs/research/t-help-acceptance-result.md     # 结论报告（受跟踪；含 GATE-RUN 行 ＋ 三条 RESULT 行 ＋ 覆盖矩阵快照）
.scratch/acceptance-63/<runId>/               # 原始产物（不入库）：stdout 日志／HTML 产物 sha256／截图目录
```

- **已落地的静态对账层**（`t-help-acceptance-collect.mjs`，只读、零 spawn、`<1 s`）：
  把「不 spawn CLI、不渲染页面就能判」的 29 条一次算清——436／341／95／56／1／493／99／64／35／130／
  20 条 B1／12 区块／2 件冻结 HELP 实例 sha256／`description` 行（含唤醒词 ＋ ≤500）／E3 台账数字一致性／
  **两条交叉来源**（C11／C12：`help-center-106.test.mjs:66-67` 的断言字面值必须等于路由层实测 341／95）。
  末行 `RESULT: 29/29 PASS`，退出码 0／1／2（2＝缺 `dist/`，**不静默变绿**）。
  它的作用是**把「计数悄悄漂移」这类缺陷挡在整图验收之前**（本轮它已抓出并修正自身两处判据缺陷：A10 口径、C11/C12 缺失）。
- **编排层不新造测试体系**：判据全部复用既有 E2（`help-center-88/91/106`、`cmd-read-t11`、`t81-*`、`t83-evidence`、
  `t105-check-rulers`、`t121`／`t88-b` 浏览器脚本、四门）。编排脚本**只做编排 ＋ 对账 ＋ 摘要**。
- **末行恒三条摘要行**（§0 格式），失败即 `exit 1`；**缺浏览器等环境缺件**走 `exit 2` ＋ `RESULT: ABORT`
  （沿用 `t121-browser-evidence.mjs:57` 语义，**绝不静默变绿**）。
- **外部证据接口（返修 R-4 · S2-4 新增）**：编排层以 `--expect-external <dir>` **显式声明**外部档
  （#89b 的 H-12／H-20／12 区块 computed），**缺件即 `RESULT: ABORT exit=2`**；
  接口路径与格式必须**先写进 #89 票面**（改票不改代码），不得由本方案单方发明。
- **抖动只登记不豁免**（返修 R-4 · S2-3）：编排层输出事实形态字段（`signature`／`rerunClean`／`inBaselineRed`），
  豁免字段恒为 `pending-ruling`；**判定权归编排者**（`t88-delta-flake-ruling.md:75,104`）。
- **反伪造（先落地再当论据）**：编排层内嵌 3 处「变异抽查」（改一个常量／删一个断言／换一条 cli，
  期望对应判据变红），与 #83／#88 的变异自证同形态（`t83-mutation.mjs:84` `RESULT-MUT: n/m`）。
  **该功能目前 0% 落地（编排层待建）**——在它落地前，方案 B 的「难伪造」论证**只由静态层的两条交叉来源支撑**
  （C11／C12 已实测生效：改 `help-center-106.test.mjs:66` 的 341 会让采集器变红）。

### 3.2 谁跑、在哪跑、跑多久、产物存哪

| 项 | 结论 |
|---|---|
| **谁跑** | 维护者或任一 session，**一条命令**：`node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-acceptance.mjs` |
| **在哪跑** | **Windows 本机**（浏览器部分必需）＋ **CI**（无浏览器部分可加一步）。CI 现无浏览器步骤（`.github/workflows/ci.yml` 117 行） |
| **跑多久（实测，返修 R-4 · S2-5 更正）** | `pnpm build` **1.2 s**（`8ec55c1a`／`53445b2c`）；四门 **0.8 s 各一**（`fa9f09fc`／`38a23ac9`／`1bfee536`）；`snapshot:html:check` **0.8 s**（`ac79e72a`）；45 测试 **4.4 s**；`t83-evidence` **3.0 s**；`t88-probe-impl-a` **0.27 s**；`t105 --strict` **0.06 s**；`t82` **0.06 s**；采集器 **0.1 s**；`t81-route-evidence` **20.6 s**；`t81-exec-smoke` **58.1 s**（`9bba58f1` 15:39:52.544→15:40:50.612）；浏览器两套件 **11.7 s**（`t121` 5.3 s ＋ `t88-b` 6.2 s）。**合计 ≈102 s ≈ 1.7 min**（不含 `pnpm install`）。原稿「15–25 min」**高估约一个数量级**，已删 |
| **产物存哪** | 报告 → `docs/research/t-help-acceptance-result.md`（**受跟踪**）；原始日志／sha256／截图 → `.scratch/acceptance-63/<runId>/`（**不入库**，`.gitignore:5` 已忽略 `.scratch/`） |
| **是否受跟踪** | 脚本 ＋ 报告**受跟踪**；原始产物**不受跟踪**。理由：仓内已有先例——`t83-review-red.md:51` 把「四门命令写在 gitignored 的 `.scratch/`」记为 **S3-5 缺陷**（新克隆无法逐字复跑）。故**凡是复跑必需的东西必须在 `docs/`**。 |

### 3.3 「新克隆能不能逐字复跑」——逐项前置条件

| # | 前置条件 | 状态 | 依据 |
|---|---|---|---|
| 1 | Node 24.x（或 ≥22.13） | ✅ | `.github/workflows/ci.yml:14` |
| 2 | pnpm 11.8.0 | ✅ | `ci.yml:22` |
| 3 | `pnpm install --frozen-lockfile` | ✅ | `ci.yml:28` |
| 4 | **`pnpm build`（必须先，证据脚本读 `dist/`）** | ✅ | `t83-evidence.mjs:4`；`t81-seed.mjs:13` 直接 import `dist` |
| 5 | 证据脚本本身受跟踪 | ⚠️ **部分不满足** | 受跟踪：`t81-*`／`t83-*`／`t88-*`／`t105-check-rulers.mjs`（`git ls-tree -r HEAD docs/research` = **267** 件，`4d33dfe` 时点 **243**）。**未跟踪 ≥3 个**：`t89-probe-browser.mjs`、`t89-probe-help-interactive.mjs`、`t-help-parity-{gen,extract,compare}.mjs` → **入库前不可复跑** |
| 6 | 旧版对照物在仓 | ⚠️ **只满足 2 件** | `fixtures/help-instances/`（2 个 HELP 实例，sha256 已冻结）。**旧 73 模板／67 脚本不在仓**（`fixtures/help-instances/README.md:31-52`：上游 `.gitignore` 零跟踪；本仓只冻结了 HELP 实例） |
| 7 | 旧侧计数可复算 | ⚠️ **靠 E3 台账** | 436 条 SoT 有 CSV（`t71-old-trigger-records.csv` 受跟踪）；73／67 的判定只在 `t71-old-baseline-inventory.md`（人写，非脚本） |
| 8 | 浏览器 | ⚠️ 本机有 Chrome／Edge 则全跑；否则 `exit 2` | `t121-browser-evidence.mjs:86-96` |
| 9 | 无 `.scratch/` 依赖 | ⚠️ 需在设计时保证 | 反例：`t83-review-red.md:51`（S3-5）、`visual-spec-help.md:329` 引 `.scratch/t105/check-rulers.mjs`（虽有同哈希的受跟踪副本 `docs/research/t105-check-rulers.mjs`） |
| 10 | 外部档（#89b）路径/格式已约定 | ❌ **未约定** | `docs/research/t89-evidence/` **不存在**；#89 票面 **0 条评论**、无该路径约定 → 见 §3.1「外部证据接口」与 §7-2 |

**结论**：**「代码侧＋新版侧」可以逐字复跑；「旧侧对照」只能复跑到 E3 台账的粒度，不能重算。**
这正是 §5-6 缺口，也是本文把「L-C 像素面」判为不要求的原因之一。

---

## 4. 覆盖矩阵（旧版资产 × 新版判据，逐格给「谁覆盖」或「尚无覆盖」）

约定：**已覆盖**＝存在受跟踪的 E2 或 E1＋可复算命令；**部分**＝只有 E3 台账或抽样；**无覆盖**＝没有判据。

### 4.1 唤醒词 436 条

| 维度 | 计数 | 覆盖证据 | 状态 |
|---|---:|---|---|
| SoT 全量 | 436 | `docs/research/t71-old-trigger-records.csv`（受跟踪）；`cmd-read-t11.test.mjs:196` `TRIGGERS.length ≥ 436` | 已覆盖 |
| 逐条入桶 | 436 | #81：`t81-route-evidence.mjs`（**当前 19 项红＝判据漂移**）＋ `WAKE_ROUTES.length===436`（`:288`） | **部分** |
| exec 桶 | 341 | `help-center-106.test.mjs:66`（341）＋ `t81-exec-smoke.mjs`（逐条 exit 0） | 已覆盖 |
| non-exec 桶 | 95 | `help-center-106.test.mjs:67`（95）＋ `:99-101`（不发字段） | 已覆盖 |
| 命中即渲染 | 436 | #83：`t83-evidence.mjs` `⑤-81 联动`（抽样 5 词）＋ `delivery` 闭集 | **部分**（抽样，非全量） |
| 门面触发词 | 69 | #82：`t82-verify-triggers.mjs`（`RESULT: 69/69`） | 已覆盖（E3＋脚本） |
| 词 → key 全覆盖 | 99 键 | #81：`covered.size` 断言（**硬编码 77，已漂移**） | **部分** |

### 4.2 模板 73 个（47 已有／18 移植／5 不适用／3 不做）

| 判定 | 数量 | 覆盖证据 | 状态 |
|---|---:|---|---|
| 新版已有 | 47 | t71 判定口径＝当时已有 key ＋ `render*Html`（`t71-…:141`）；其中 **23 键**经 #84 → #108（饮食 8）／#109（运动身体 9）／#110（趋势分析 6）升级为**全文档同质**（`*-homogeneity-10{8,9,10}.test.mjs` 各 12 用例）；其余由原渲染器承接（`render-t10/t41.test.mjs`、`cmd-read-t11.test.mjs` 逐键） | 已覆盖 |
| 需移植 | 18 | #85 → #111（运动 6）／#112（营养 4）／#113（趋势 2＋其他 6）；`*-port-11{1,2,3}.test.mjs` | 已覆盖 |
| 新架构不适用 | 5 | wizard×3 ＋ GIF 框选器×1 → **#86**（`wizard-86.test.mjs`，新拟 4 词）；静态文档 `设计审查报告.html`（`t71-…:220`）→ **尚无覆盖** | **部分** |
| 明确不做 | 3 | #18 cron／#19 跨技能／#52 mmx vision（`t71-…:233`，`#39` 判 out of scope） | 无覆盖（按设计不做） |
| 6 个死模板 | 6 | #107：并入 HELP「看板页入口」并真渲染（`t107-merge-into-help.md`、`t107-probe-render.mjs`） | 已覆盖 |
| 旧 HELP 实例 | 2 | #94 冻结入仓 ＋ sha256 自校验（`fixtures/help-instances/README.md`） | 已覆盖 |
| **旧模板本体逐字对照** | 73 | **无**（旧树不在仓） | **无覆盖**（§5-6） |

### 4.3 `render_*.py` 67 个（46 映射／19 无对应）

| 判定 | 数量 | 覆盖证据 | 状态 |
|---|---:|---|---|
| 已映射 | 46 | 同上 4.2 的 47／18 两行（键＋渲染器）；`render-t10/t41.test.mjs` | 已覆盖 |
| 未映射·需移植 | 16 | #111–#113 承接 18 模板（含 `nutrition_*` 4 脚本 → 4 模板）；对照表逐条见 `t111/t112/t113-*.md` | 已覆盖 |
| 明确不做 | 3 | 同 4.2「明确不做」 | 无覆盖（按设计不做） |
| 机制不适用 | 4 | #86（wizard／cropper） | 部分 |
| helper／部分映射 | 2 | `render_goal_common.py`（helper）／`render_review.py`（部分映射，8 维复盘未承接） | **无覆盖**（`t71-…:267,276`） |

### 4.4 键 99 个（读 64 ＋ 写 35）

| 维度 | 计数 | 覆盖证据 | 状态 |
|---|---:|---|---|
| 注册表 | 99 | `cmd-read-t11.test.mjs:79-80`、`cmd-write-40.test.mjs:72`、`render-t41.test.mjs:70-71`、`skill-t11.test.mjs:52`、`output-naming-{87,119}.test.mjs` | 已覆盖 |
| 读键可用性 | 64 | `db-readonly-93.test.mjs:287`（只读句柄逐键，**基线既有红**） | 部分（基线红） |
| 写键回执 | 35 | #97：`m5-receipt-97.test.mjs`（id／时间戳／`affectedRows`／`writtenFields`） | 已覆盖 |
| 跨技能共享表 | 109 | `base-combos/src/present.ts`；`t80-help-gen-evidence.md:431-448` | 已覆盖 |
| 逐键 HTML 产出 | 99 | #83：`t83-evidence.mjs` NOTE（97 读键＋写键 receipt 全产 HTML） | 部分（逐键核对，非逐键断言） |

### 4.5 10 分组／54 子功能／436 场景

| 维度 | 计数 | 覆盖证据 | 状态 |
|---|---:|---|---|
| 分组／子功能／场景 | 10／54／436 | `help-center-88.test.mjs:44-48`（数据层）＋ `:196-200`（HTML 层 436 卡／1308 按钮） | 已覆盖 |
| id 唯一 | 436＋54 | `:261-272`（数据层＋HTML 层＋人为重复抛 `duplicate-id`） | 已覆盖 |
| 三态同源 | 3 | `:217-220`、`help-center-91.test.mjs:121-135` | 已覆盖 |
| 逐场景 CLI 行 | 341 | #106：`help-center-106.test.mjs:64-135` | 已覆盖 |

### 4.6 B1 逐值 20 条（HELP 页）

> **返修 R-4 · S1-2 更正**：原稿把整行标成「静态可判（A 级）→ 已覆盖」，并引用
> `t75-style-evidence.mjs`——**该文件不存在**（同名只有 `.md`）。实测 `t105-check-rulers.mjs --strict`
> 自判 `BLOCKED` 的正是 **H-10（圆角 token）** 与 **H-02／H-05／H-12／H-16（渲染后 computed 值）**；
> `t75-style-evidence.md` 的 R7 亦明写「B1 的 H-06／H-09／H-17／H-19 **不在本票验收面**」。故拆成下列四行。

| 分组 | 条 | 覆盖证据 | 状态 |
|---|---|---|---|
| **冻结常量侧** | H-01／H-03／H-04／H-07／H-08／H-11／H-15／H-17／H-18 等的**常量锚点** | `t105-check-rulers.mjs`（可判 43 条／`PASS 25`／`OLD-DEVIATION 18`／`DEFECT 0`，`runId=07f81448-…`）；#75 `buildStyleSheet` 的产出证据见 `t75-style-evidence.md`（**R7 声明排除面**） | 已覆盖 |
| **渲染后 computed 侧 ＋ 交互／时序** | **H-02／H-05／H-10（BLOCKED）／H-12／H-16／H-19／H-20** | H-16 由 `t121`（22/22）覆盖、H-19 由 `t88-b`（29/29）覆盖；**H-12／H-20 在两张套件里零命中**，须 #89b；H-02／H-05／H-10 的 computed 面尺子自判 `BLOCKED` | **部分**（H-12／H-20／computed 归 #89b，见 §5-1） |
| N/A | H-13／H-14 | `visual-spec-help.md:364-365`（HELP 页无 KPI／进度环，转内容页 B-02／B-04） | 已裁定 |
| 旧版差异 | 18 处 | `visual-spec-help.md:338`（`OLD-DEVIATION 18`）＝改进项（R35） | 已裁定 |

### 4.7 内容页 12 区块

| 区块 | 覆盖证据 | 状态 |
|---|---|---|
| B-01／B-04／B-07／B-09／B-10／B-11／B-12 | 尺子自证 15 行 `PASS`（`visual-spec-blocks.md:229-243`）＋ #104（区块接口 owner） | 已覆盖（结构锚点） |
| B-02／B-03／B-05／B-06／B-08 | `visual-spec-blocks.md:244` 标 **BLOCKED**（需渲染后 computed 值） | **无覆盖**（待 #89b） |
| 12 个区块清单终审 | `visual-spec-blocks.md:209` DB-1 **移交 #104** | 已裁定（清单以 #104 为准） |
| 命名空间闭集 | `:210` DB-2 移交 #104 | 已裁定 |

### 4.8 覆盖矩阵小计（**返修 R-4 · S1-3 逐行重算**）

| 类别 | 格数 | 已覆盖 | 部分 | 无覆盖 | 已裁定 |
|---|---:|---:|---:|---:|---:|
| 唤醒词 436 | 7 | 4 | 3 | 0 | 0 |
| 模板 73 | 7 | **4** | 1 | **2** | 0 |
| 渲染脚本 67 | 5 | 2 | 1 | 2 | 0 |
| 键 99 | 5 | 3 | 2 | 0 | 0 |
| 分组／子功能／场景 | 4 | 4 | 0 | 0 | 0 |
| B1 20 条 | 4 | **1** | 1 | 0 | **2** |
| 内容页 12 区块 | 4 | **1** | 0 | 1 | **2** |
| **合计** | **36** | **19** | **8** | **5** | **4** |

> 原稿小计写 **22／8／4**，与逐行状态不符（模板 73 行实为 4／1／2、B1 与内容页各多算 1 格「已覆盖」，
> 其中两格实为「已裁定」）。**正确点票：已覆盖 19 ／ 部分 8 ／ 无覆盖 5 ＋ 已裁定 4 ＝ 36 格。**
> **无覆盖 5 格逐条**：①模板「明确不做 3」②模板「旧模板本体逐字 73」③渲染脚本「明确不做 3」
> ④渲染脚本「helper／部分映射 2」⑤内容页「B-02／B-03／B-05／B-06／B-08」。

---

## 5. 缺口清单（无法判定的项，按影响排序）

| # | 缺口 | 为什么无法判定 | 归属票 | 影响等级 |
|---|---|---|---|---|
| 1 | **B1 20 条的「新版侧」逐条结论**——**返修 R-4 后范围缩小为三项**：H-12（断点）／H-20（焦点可见＋动效可关）／12 区块 computed（含 H-02／H-05／H-10 的 computed 面） | 尺子自证只判到「冻结常量＋旧版实例」，新版页面的 computed 值需落地后判（`t105 --strict` 逐字判 `BLOCKED`；`visual-spec-blocks.md:244` 同）；H-12／H-20 在 `t121`／`t88-b` 里**零命中**（本席核验） | **#89**（前置 #104／#75／#88／#108–113／#86／#93 **全部 CLOSED**，随时可开工；**无严格环**，风险在接口，见 §5-17） | **阻断**（主线② UI 同质）——**但 H-16／H-19 已由自有档覆盖，不再等 #89b** |
| 2 | **共享层收口**：v1.30 签名 × 实现逐条对照、三包版本统一、CI 断言 | #79 进度 0%（`gh issue view 79`） | **#79** | **阻断**（主线③ 收口） |
| 3 | **#83 的对抗式审查第二席** | 票面停在 90%「等编排者安排对抗式审查，本票不关票」；红队报告自认「蓝队席缺」（`t83-review-red.md:117`） | **#83** | **阻断**（主线① 的 HTML-First 判据目前单席） |
| 4 | **运行时「卡路里HELP」入口**（**返修 R-4 · S1-4 更正**） | **#64 已于 2026-09-09T14:32:58Z（COMPLETED）关闭**，早于本方案首次提交 72 分钟；实测**3 处**安装副本（`.dsh/profiles/web/node_modules`／`.agents/skills`／`~/node_modules`；`.dsh-module-fallback` **不存在**）的 `description` 仍是 **61 字符**、**无「卡路里HELP」** ⇒ **原归属失效** | **需新票**（重发版／重装取证），或由维护者改判 #64 的收口口径 | **阻断**（就「用户真能说一句话打开」而言）／**可接受**（就代码侧而言，已达成）。**本图只能声明「代码侧达成」**——见 §7-3 与文末 R-4.4 |
| 5 | **主线① 的可复算判据已漂移**：`t81-route-evidence.mjs` 硬编码 77／34／34 常量与旧族派生模型 | 脚本最后改动 `52e6fc8`（#81）；#111–#113／#86 把口径推到 99／56／341；本轮实测 **19 项红**（`runId=2e31333e-…`），构成＝**1＋15＋3**（§2.1 失败表第 2 行），其中 **15 项是「族派生模型未重基线」而非硬编码常量** | **需新票**（重基线；建议不并入 #79，见 §7-3） | **阻断**（不修则「一条命令全绿」永远不成立） |
| 5b | **`复制昨日运动` 的日期依赖红** | `copyFrom:"yesterday"`（`routing.ts:300`）随系统日期解析，而标准种子库只种绝对日期（`t81-seed.mjs:70-78`）→ **同一命令换一天就变色**（本轮 2026-09-09 红、`t81-exec-smoke.md:539` 已登记同一红） | **需新票**（扩种子或降级该词） | **阻断**（对「一次性证据可复现」而言：证据必须**日期无关**才叫可复现） |
| 5c | **判据被基线白名单掩盖** | `test/calorie-routing-81.test.mjs:293`「FX-81-5 不变量：exec ⟺ 实跑 exit 0」**当前就是红的**（本轮 `runId=61bd571b-…`，`actual:1 expected:0`，读 `.md` 快照而非实跑），但它在冻结基线 `test-failset.txt:16` 的稳定红名单里 → 只要判据取「失败集新增 0」，**这条红永远看不见** | 登记 ＋ **纳入 5b 的验收**（5b 修好后该用例自动回绿） | **阻断**（整图验收若只判「新增 0」，会把主线① 的核心不变量判成绿） |
| 6 | **旧 73 模板本体逐字对照** | 旧树不在仓（`fixtures/help-instances/README.md:31-52`）；本仓只冻结 2 个 HELP 实例 | **#94 已做能做的**；余下**登记** | **可接受**（判据降级为映射表＋B1 逐值） |
| 7 | **95 条 non-exec ＋ 3 个不做模板** | 按设计不产 HTML／不承接 | #81／#39 已登记 | **可接受**（判据须定义为「有回执／有登记即通过」，见 §7-3） |
| 8 | **18 处 OLD-DEVIATION** | 旧版未达 B1（R35 裁定＝改进项） | #105／#89 | **可接受**（判据须定义为「改进项」） |
| 9 | **并发写同名产物**（#128） | `output.ts` 同秒「探测-写入」非原子 → 并发跑验收会**互相覆盖**（#91 的 1 MB 产物把窗口拉到 200–300 ms） | **#128** | **可登记**（验收脚本串行 ＋ 显式 `--output` 即可规避） |
| 10 | **`goal.set` 静默重置未传列**（#127） | 用户可见数据丢失（`water_goal 2300→2000` 等） | **#127** | **可登记**（不属「与旧版一样」的判据面，但影响真实体验） |
| 11 | **真机非空数据证据 0 条** | `t67-key-audit.md:15` 自陈；本轮所有实跑走**标准种子库**（`t81-seed.mjs`） | #93 已有基线；余下登记 | **可接受**（`docs/calorie-architecture.md:83`：合成与真实证据须显式标注，不得混用） |
| 12 | **canonical `pnpm test` 必然 exit 1** | 基线既有红 25 条／稳定红 29 条（`t88-baseline/BASELINE.md:93`）；其中 **`#93 ① 64 读键`** 与 **`#81 唤醒词路由层`／`FX-81-5`** 本身就在红名单里（`test-failset.txt:13-16`）；`--expect-exit` 待修（`t88-final.md:159`） | 登记 | **可接受**（判据＝失败集新增 0，**且白名单只许缩小**；「读键全绿」「路由全绿」当前**不是事实**） |
| 13 | **产物体积 1,264,822 B（+22.4%）** | #106 登记（`t106-help-cli-backfill.md`）；**`t88-final.md:166` L-16 记的是 1,010,979 B（#88 时点），两数不同源** | 登记 | **可登记** |
| 14 | **`fallback` 形无 CLI 出口** | #93 实测；`t83-evidence.mjs` 的 ⑥ 形状覆盖也只到 5 形 | 登记 | **可登记** |
| 15 | **`changeset:status` 环境红** | 缺 `@changesets/errors`；协议禁止自行 install | 登记 | **可登记** |
| 16 | **#82 description 余量仅 4 字符**（499／500） | 再加触发词即截断（截断态三要素仍可见，已实证）；**原 A10 的整文件搜索让「截断后仍绿」成立** → 已改为按 `description` 行取值（采集器 A10） | 登记 | **可登记**（判据已修） |
| 17 | **外部档接口未约定**（返修 R-4 · S2-4） | `docs/research/t89-evidence/` **不存在**；#89 票面 0 评论、无路径/格式约定；其断点探针 `t89-probe-browser.mjs` **未受跟踪** | **#89 票面补约定**（改票不改代码） | **阻断**（不约定则编排层 `--expect-external` 无对象，只能 `ABORT`） |

---

## 6. 三个可选方案（便宜 → 昂贵）

| 维度 | **A · 文档对账** | **B · 编排脚本（推荐）** | **C · B ＋ 浏览器全量 ＋ 全新克隆复跑** |
|---|---|---|---|
| 形态 | 一份受跟踪报告，人抄录既有 E2／E3 结论 | 受跟踪编排脚本 ＋ 报告 ＋ `.scratch` 原始产物 | B ＋ 截图归档 ＋ 浏览器交互套件 ＋ 在临时目录 `pnpm install && pnpm build` 全量复跑 |
| **证据强度** | 低—中：结论可追溯但**不可复算** | 中—高：**一条命令复算**，末行机读，逐条可追 | 高：再加「像素／交互」与「干净环境」两维 |
| **成本（人时）** | 2–4 | **4–8**（静态层已落地，只剩编排层 ＋ 报告模板） | 16–24 |
| **成本（机时）** | ≈1 min | **≈1.7 min**（实测合计 102 s，见 §3.2） | 2–3 h（含 install ＋ 3 OS×2 node 复跑） |
| **维护成本** | 低，但**必然腐烂**（票据一收口就过期） | 中：需随票据重基线常量（本轮的 19 项红就是没维护的代价） | 高：浏览器版本／字体／DPR 引入像素抖动，需定期重拍基线 |
| **能否被伪造** | **易**：数字手抄，无命令可对 | **难**：脚本＋GATE-RUN 对账（`check-gate-audit.mjs`）＋交叉来源；变异抽查**待落地** | **最难**：还要过干净环境与浏览器 |
| 反伪造手段 | 无 | `check-gate-audit`（runId 逐条命中实时日志）＋ 静态层交叉来源 C11／C12（**已实测生效**）＋ 变异抽查（**待落地**）＋ 第二人独立复跑 | 同 B ＋ CI 矩阵 ＋ 截图可复现性检查 |
| 结论 | 不足以支撑「整图验收」 | **推荐** | 过重（且与 #89b 重复） |

### 推荐：**方案 B**，理由四条

1. **判据已经存在**：三条主线的终局判据 90% 已落成受跟踪 E2 脚本／测试（§2 各表）。缺的是**编排＋对账＋缺口台账**，
   不是新体系。A 之所以便宜，正是因为它把「复算」这一半省掉了——而这一半才是验收的全部意义。
2. **「自有档 ＋ 外部档」而不是「等一张 0% 的票」**（返修 R-4 · S2-4 更正）：两套浏览器证据
   （`t121` 22/22、`t88-b` 29/29）**都受跟踪、合计 11.7 s**，没有理由降级成 E3；
   #89b 只承担 **H-12／H-20／12 区块 computed** 三项，且接口须先写进 #89 票面。
   C 方案会把这三项也重写一遍，**双维护**。
3. **对抗性**：整图验收的敌人不是「跑不起来」，是「**看起来绿**」。B 的机读摘要行 ＋ `GATE-RUN` 对账
   （`tooling/check-gate-audit.mjs`，runId 必须命中**实时**日志，`t106-help-cli-backfill.md` 已用过 17/17）
   让「手抄数字」这条路走不通；静态层 C11／C12 进一步把「改测试常量而不改采集器」这条路堵上
   （**已实测**：采集器解析 `help-center-106.test.mjs:66-67` 的断言字面值并与路由层实测比对）。
   编排层的 3 处变异抽查**尚未落地**，落地前不计入证据强度论证。
4. **本轮已经证明 B 的必要性**：一次「把整图证据串起来跑一次」就抓出**三类没人报的缺陷**——
   `t81-route-evidence.mjs` 的 19 项判据漂移（任何测试都不会报）、`复制昨日运动` 的日期依赖红
   （换一天就变色）、以及**主线① 的核心不变量已经在白名单里红着**（§5-5c）。
   A 方案会把前两者抄成「#81 已通过」「#81 全绿」，**把漂移藏起来**。
   反过来说：B 的**维护成本主要就花在这三类上**——把判据钉在「当前口径」而不是「#81 当时的口径」。

---

## 7. 需要维护者拍板的点（3 个）

### 拍板点 1 · 整图验收的判定口径

- **问题**：`RESULT-63` 判「三条主线机读全绿 ∧ 缺口台账无『阻断』项」是否足够？还是要「必须浏览器实景录屏」？
- **选项**：(a) 机读全绿＋缺口台账（本文推荐）；(b) (a) ＋ 必须附浏览器实景（截图＋交互记录）作为**验收门**；
  (c) 只认人工目检。
- **推荐**：**(a)**，并规定浏览器证据分**自有档**（`t121`／`t88-b` 复跑，覆盖 H-16／H-19）与
  **外部档**（#89b 只做 H-12／H-20／12 区块 computed）。理由：`docs/calorie-architecture.md:97` 已明确
  「不要求 DOM 同构」，像素面本就不是判据；(c) 不可复算。

### 拍板点 2 · 证据形态 ＋ **外部证据接口**（返修 R-4 新增）

- **问题**：(i) 报告入仓、**原始产物不入仓**是否可接受？旧基线不在仓导致「旧侧不可复算」如何记账？
  (ii) **#89b 的产物路径与格式由谁定**？（现状：`docs/research/t89-evidence/` **不存在**、#89 票面 **0 评论**、
  其断点探针**未受跟踪**——本方案**单方发明**了别人的交付形态）
- **选项**：(a) 报告＋脚本入仓，原始产物落 `.scratch/`，且**接口先写进 #89 票面**
  （`--expect-external <dir>`，缺件即 `ABORT exit=2`）（本文推荐）；
  (b) 原始产物一并入仓（可逐字复算，但每次验收给仓加 ~2.5 MB）；(c) 全部落 `.scratch/`（最省，重犯 S3-5）。
- **推荐**：**(a)**。并在报告里固定一段「旧侧不可复算声明」（本文 §3.3 第 6／7 条），
  使「新克隆逐字复跑」的边界**写在明面上**，而不是靠读者猜。
  **接口条款须由维护者落进 #89 票面**（改票不改代码），否则编排层只能对 H-12／H-20 判 `ABORT`。

### 拍板点 3 · 判据豁免与判据重基线

- **问题**：三个豁免（95 条 non-exec ＋ 3 个不做模板 ＝ 达成；18 处 `OLD-DEVIATION` ＝ 改进项；
  5 个「新架构不适用」中 4 个由 #86 承接、1 个静态文档无覆盖）是否成立？
  以及 `t81-route-evidence.mjs` 的**重基线**归哪张票？**运行时入口缺口的归属**（#64 已关闭）怎么办？
- **选项**：(a) 三个豁免全部成立 ＋ 重基线**新开一张收尾票** ＋ 运行时入口**新开票或改判 #64 口径**（本文推荐）；
  (b) 豁免成立，重基线并入 **#79**；(c) 不豁免（则本图目标不可达）。
- **推荐**：**(a)**。理由：(c) 会让「与旧版完全一样」成为字面不可达（旧版自己也不做这 3 类）；
  (b) 会让 #79（共享层收口）背上一张卡路里路由票，与 #79 的「base- 契约」主题不符。
  重基线票的最小验收：`t81-route-evidence.mjs` 在当前树 `exit 0`，**全量漂移明细落盘**（不再 `slice(0,5)`），
  且断言常量与 `help-center-106.test.mjs:66-67`（341／95）同源、不各自维护第二份数字；
  日期依赖（§5-5b）与白名单（§5-5c）随该票一并收口。

---

## 附 · 复算命令索引（逐条可直接粘贴；**读 dist 一律持锁**——返修 R-4 · S3-7）

```powershell
# 0 静态对账层（本方案已落地；一条命令覆盖全部计数／契约／冻结物／交叉来源）
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-acceptance-collect.mjs   # 期望 RESULT: 29/29 PASS

# 0 计数基线（人工复核用）
(Get-Content docs\research\t71-old-trigger-records.csv -Encoding UTF8 | Measure-Object -Line).Lines   # 437（含表头）
(Select-String -Path packages\base-render\src\spec\index.ts -Pattern "status:\s*'" -AllMatches).Matches.Count  # 130
([regex]::Matches((Get-Content packages\base-combos\combos.yaml -Raw -Encoding UTF8), "(?m)^\s*-\s*key:\s*(calorie\.[a-zA-Z0-9_.-]+)") | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique).Count  # 99
(git ls-tree -r HEAD --name-only docs/research | Measure-Object -Line).Lines  # 267

# 1 主线①
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t81-route-evidence.mjs   # 期望 0（当前 1＝判据漂移 1+15+3）
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t81-exec-smoke.mjs       # 期望 0（当前 1＝397/398，日期依赖）
node tooling/run-locked.mjs --ticket 63 -- node --test test/calorie-routing-81.test.mjs # 期望 8/8（当前 7/8＝FX-81-5）
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t83-evidence.mjs         # 期望 RESULT: 21/21
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t82-verify-triggers.mjs  # 期望 RESULT: 69/69

# 2 主线②
node tooling/run-locked.mjs --ticket 63 -- node --test packages/skill-calorie/test/help-center-88.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/help-center-106.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs   # 期望 45/45
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t88-probe-impl-a.mjs     # 期望 RESULT: 44/44 fails=0
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t105-check-rulers.mjs --strict   # 期望 DEFECT 0（BLOCKED 逐字）
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t121-browser-evidence.mjs   # 期望 22/22（需 Chrome）
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t88-browser-evidence-b.mjs  # 期望 29/29（需 Chrome）

# 3 主线③
node tooling/run-locked.mjs --ticket 63 -- pnpm build                                   # 实测 1.2 s
node tooling/run-locked.mjs --ticket 63 -- pnpm boundaries                              # 实测 0.8 s
node tooling/run-locked.mjs --ticket 63 -- pnpm snapshot:check                          # 实测 0.8 s
node tooling/run-locked.mjs --ticket 63 -- pnpm publish:pre                             # 实测 0.8 s
node tooling/run-locked.mjs --ticket 63 -- pnpm snapshot:html:check                     # 185 件 changed=0
node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt <新日志>  # 新增=0
node tooling/check-gate-audit.mjs --evidence docs/research/t-help-acceptance-result.md --ticket 63 --since <t0> --until <t1>
```

## 附 · 本轮 GATE-RUN 原文（对账源）

```
RUN ticket=63 runId=2e31333e-1505-4099-a3eb-ff9e6c74fafc cmd="node docs/research/t81-route-evidence.mjs" waitedMs=0 exit=1
RUN ticket=63 runId=9bba58f1-a6a4-42f9-a243-3a863a3cf2c9 cmd="node docs/research/t81-exec-smoke.mjs" waitedMs=10016 exit=1
RUN ticket=63 runId=ac6cf688-9a6a-4845-9865-83668055566a cmd="node docs/research/t81-exec-smoke.mjs" waitedMs=0 exit=1
RUN ticket=63 runId=962cac71-792d-4f37-88ba-7e2bdc7009ac cmd="node --test packages/skill-calorie/test/help-center-88.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/help-center-106.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs" waitedMs=0 exit=0
RUN ticket=63 runId=3820de4c-6e21-4e4b-9901-1e2d43dd62fd cmd="node docs/research/t83-evidence.mjs" waitedMs=0 exit=0
RUN ticket=63 runId=44881f56-c2d4-4c36-b87e-725ce5a494e2 cmd="node docs/research/t-help-acceptance-collect.mjs" waitedMs=0 exit=0
RUN ticket=63 runId=61bd571b-6f18-4800-872b-6461027b89a3 cmd="node --test test/calorie-routing-81.test.mjs" waitedMs=0 exit=1
RUN ticket=63 runId=a6f2874e-d882-45bc-b2cc-f4b3b35e7ccd cmd="node docs/research/t88-probe-impl-a.mjs" waitedMs=0 exit=0
RUN ticket=63 runId=07f81448-0b77-4dd8-95c7-d7b605550d28 cmd="node docs/research/t105-check-rulers.mjs --strict" waitedMs=0 exit=0
RUN ticket=63 runId=0b4fd778-1c9a-43cf-8743-22cc71c042e0 cmd="node docs/research/t-help-acceptance-collect.mjs" waitedMs=100077 exit=0
```

（来源：`.scratch/locks/gate-runs.log`，2026-09-09T15:38:59Z–16:05:00Z。窗口内另有 `ticket=89／83／79` 的运行——
`t89-probe-browser.mjs`、`t121`／`t88-b` 的审查席复跑、`t63-line1-*.mjs` 等——**属他席，不计入本席声明面**，
已在 `GATE-RELAX --allow-undeclared` 声明。）

对账命令（逐字复跑；两条放宽已在上文 `GATE-RELAX` 声明；实测结果见文末 §R-4.5）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t-help-acceptance-plan.md \
  --ticket 63 --since 2026-09-09T15:38:50.000Z --until 2026-09-09T16:05:00.000Z \
  --allow-nonzero --allow-undeclared
→ RESULT: matched=9/9 auditEntries=824（随并发 session 增长，以复跑实测为准） scoped=74 undeclared=65 → PASS
```

---

## 返修 R-4（审查席）

- 审查对象：commit **`4d33dfe`**；审查报告 `docs/research/t-help-acceptance-plan-review.md`（commit `264546a`），
  **verdict FAIL 58/100**（契约一致 17／证据真实可复现 13／parity 13／工程红线 9／文档同步 6）。
- 本节的每一条都写「**接受／不接受 ＋ 理由 ＋ 证据**」；证据一律给 `GATE-RUN runId=…` 或可复算命令。

### R-4.1 必改 7 条

| # | 指控 | 判定 | 处置与证据 |
|---|---|---|---|
| 1 | **A1 假等式**：`exec 341 ＝ 56＋22＋26＋222` 实为 326；19 项红构成是 1＋15＋3，原稿写「×16」并把 15 项误归「硬编码断言」 | **接受** | §1.3 改为「四分类合计 326 ＋ **未分类 15** ＝ 341；**未分类必须为 0**」的不变量形式；§2.1 A1 期望输出、§2.4「权威口径」段、§5-5 全部重写为 **1＋15＋3**，并注明 15 项源于**族派生模型未重基线**（非硬编码常量）。证据：`t81-route-evidence.mjs:460` 的断言即报此差；本轮 `runId=2e31333e-…` stdout 逐条列 15 项「家族未派生但路由层为 exec」 |
| 2 | **阻断缺口归属过期**：归 #64，但 #64 已 COMPLETED 关闭 | **接受** | §5-4 重写：`gh issue view 64` 实测 `state=CLOSED, stateReason=COMPLETED, closedAt=2026-09-09T14:32:58Z`；实测 **3 处**副本（`.dsh/profiles/web/node_modules`／`.agents/skills`／`~/node_modules`，`.dsh-module-fallback` 不存在）`description` 均 **61 字符且无「卡路里HELP」**；归属改为「**需新票**或由维护者改判 #64 收口口径」，并给出本图的**最终表述**（见 §R-4.4） |
| 3 | **越权豁免**：编排层自动把抖动判「不计入」 | **接受** | 删掉全部自动豁免。§2.0 新增第 4 条（引 `t88-delta-flake-ruling.md:75,104`）、§2.1／§2.3 失败表改为「**只登记事实形态**（签名／干净重建后单独复跑次数／是否基线红）＋ 豁免字段恒 `pending-ruling`」；并补「**基线红名单内条目不得主张 B 类**」（`:95-102` §5.2-1 反自利守卫） |
| 4 | **采集器 A10 整文件搜索** | **接受** | `t-help-acceptance-collect.mjs` A10 改为**解析 frontmatter `description:` 行**再判是否含唤醒词（与 B1 的长度断言合并）；复跑 `RESULT: 29/29 PASS`（`runId=0b4fd778-…`） |
| 5 | **§3.1「交叉来源」代码里不存在** | **部分接受**：不接受「删除」，接受「必须有代码」 | 原稿是**声称未落地**——已**落地**：新增 C11／C12 两条，**解析** `help-center-106.test.mjs:66-67` 的断言字面值并与路由层 `EXEC_ROUTES`／`HIT_NOT_EXEC_ROUTES` 实测比对（改测试里的 341 → 采集器立即红）。证据：`runId=0b4fd778-…` 的 `PASS C11／C12`；同时 §3.1 如实标注编排层「3 处变异抽查」**仍 0% 落地**，落地前不计入证据强度 |
| 6 | **矩阵小计 22／8／4 不成立** | **接受** | §4.8 逐行重算为 **19／8／5 ＋ 4 已裁定（36 格）**，并逐条列出 5 个「无覆盖」格；§0 的无覆盖清单同步为 5 格 |
| 7 | **机时高估约 10×** | **接受** | §3.2／§6 改为**实测值**：build 1.2 s、四门各 0.8 s、`snapshot:html:check` 0.8 s、45 测试 4.4 s、`t83` 3.0 s、`t81-exec-smoke` **58.1 s**、浏览器两套件 11.7 s、`t81-route-evidence` 20.6 s、`t105`／`t82`／采集器 ≈0.1 s ⇒ **合计 ≈102 s ≈ 1.7 min**。证据：`.scratch/locks/gate-runs.log` 的 START／RUN 配对（`9bba58f1` 15:39:52.544→15:40:50.612 等） |

### R-4.2 结论层面的更正

| # | 审查席结论 | 判定 | 处置与证据 |
|---|---|---|---|
| 8 | **无严格环**；真风险是「接口未定」 | **接受** | §5-1 补「前置 #104／#75／#88／#108–113／#86／#93 **全部 CLOSED**、#89 票面 **0 评论**（`gh issue view 89` 实测）⇒ **随时可开工，无环**」；新增 §3.1「外部证据接口」条款（`--expect-external <dir>`，缺件 `ABORT exit=2`）与 §5-17 缺口、§7-2 拍板点 |
| 9 | **「不重跑浏览器」应改为「重跑」** | **接受** | §2.2 B5 改「**自有档**」：`t121` 22/22（5.3 s）＋`t88-b` 29/29（6.2 s），**均受跟踪**、合计 11.7 s；B6 改「**外部档**」只承担 **H-12／H-20／12 区块 computed**（本席核验这两项在两张套件里零命中）。`RESULT-L2` 现状 4/8 → **5/8** |
| 10 | **静态可判 A 级不成立** | **接受** | §4.6 拆成「冻结常量侧（已覆盖）」与「渲染后 computed 侧 ＋ 交互时序（部分）」两行；删除不存在的 `t75-style-evidence.mjs` 引用，改引 `t75-style-evidence.md` 并注明其 R7 的排除面；`BLOCKED` 逐字＝**H-10 圆角 token** 与 **H-02／H-05／H-12／H-16 computed**（`runId=07f81448-…`） |
| 11 | **引用对象错**：`fixtures/README.md:31-52` 不存在 | **接受** | 两处改为 `fixtures/help-instances/README.md:31-52`（`Test-Path fixtures\README.md` = False） |
| 12 | S3-2 受跟踪数 240≠243 | **接受** | §3.3-5 改为「本轮实测 **267**（`4d33dfe` 时点 **243**）」＋复算命令 |
| 13 | S3-3 361／341 混用 | **接受** | 全文删除「361」；§1.3 只保留当前口径 341／95／56／1 |
| 14 | S3-4 体积与 L-16 混用 | **接受** | §1.3 与 §2.2 失败表均注明：`1,264,822 B`＝#106 回补后实测（`runId=3820de4c-…`）；`t88-final.md:166` L-16 记 **1,010,979 B**（#88 时点），两数不同源 |
| 15 | S3-5 B4 期望输出／现状 | **接受** | B4 期望改 **`RESULT: 44/44 fails=0`**（`runId=a6f2874e-…`，0.27 s），并注明「436 条逐字」是其中**一条**断言内部遍历；B4 现状改 ✅ |
| 16 | S3-6 62 字符／四处副本 | **接受** | §5-4 改为 **61 字符／3 处存在**（逐条实测路径见 §R-4.1-2） |
| 17 | S3-7 附录命令未持锁 | **接受** | 附录索引全部加 `node tooling/run-locked.mjs --ticket 63 --`（`t82`／`t105`／四门／`snapshot:html:check` 亦然） |
| 18 | S3-8 未跟踪脚本 ≥3 | **接受** | §3.3-5 列 ≥3：`t89-probe-browser.mjs`／`t89-probe-help-interactive.mjs`／`t-help-parity-{gen,extract,compare}.mjs` |
| 19 | A2 另有独立复核（`:304-311` 逐行重算） | **接受** | §2.1 A2 备注补「`test/calorie-routing-81.test.mjs:304-311` 逐行重算 `c[6]==='0'`／`c[7]===key`／`c[8]===cli`，比汇总行强」 |
| 20 | A3 抽样冒充全量 | **接受** | §2.1 失败表新增「**抽样冒充全量**」一类（A3 只验 5 词），并要求判据写明覆盖面 |
| 21 | 白名单可扩 → 只许缩小 | **接受** | §2.3 失败表新增「**白名单掩盖真红**」行：白名单只许缩小、每条带票号＋签名＋复跑次数、新增需 `GATE-RELAX` 式声明；§5-12 同步 |

### R-4.3 未接受／部分接受的项

- **唯一「部分接受」＝ S2-2（交叉来源）**：审查席给的选项是「删除或落实」。本席选**落实**（C11／C12），
  因为「删掉」会让静态层失去唯一的反伪造手段，而落实的边际成本仅两条断言。
  **理由与证据**：`runId=0b4fd778-…` 显示 `PASS C11`（断言字面值 341 ＝ 路由实测 341）、
  `PASS C12`（95 ＝ 95）；若某票把测试里的 341 改成 342，C11 即红。
- **其余 20 条全部接受**，无一条争辩。

### R-4.4 「阻断缺口」的最终表述（本图结论）

1. **代码侧达成**：`SKILL.md` 的 `description`（499 字符）含「卡路里HELP」，正文三处给逐字命令
   （`:3`／`:10`／`:17`）；采集器 A10／B1 逐条断言（`runId=0b4fd778-…`）。
2. **运行时未达成**：3 处已安装副本仍为 61 字符旧 `description`、**无「卡路里HELP」**；
   **#64 已 COMPLETED 关闭（2026-09-09T14:32:58Z）** ⇒ **本图内没有未关闭的归属票**。
3. ⇒ **`RESULT-63` 的「缺口台账无阻断项」当前不可达**。本图的**如实表述**只有两种合法写法：
   - **(i) 列为跨图阻断**：新增一张「重发版／重装取证」票（或由维护者改判 #64 口径），
     该票关闭前 `RESULT-L2` 的 B8 恒为 0／`blocked=1`，`RESULT-63` 不得判绿；
   - **(ii) 显式降级为跨图依赖**：把 B8 从 `RESULT-L2` 移出，改为**跨图声明**——
     「本图只声明**代码侧**达成；运行时可达性归打通图」，此时 `RESULT-L2` 判 n/7 并附一句
     `EXTERNAL: 卡路里HELP 运行时入口（跨图）`。
4. **本席推荐 (i)**（诚实优先：用户可见性没达成就不该让整图判绿），并请维护者在 §7-3 一并拍板。

### R-4.5 返修后的自证

> 返修轮的运行**已在 §2.4 逐条声明**（`0b4fd778` 采集器 29/29、`a6f2874e` `t88-probe-impl-a` 44/44、
> `07f81448` `t105 --strict` exit 0），此处不重复声明（对账口径：一条审计条目只认领一次）。

- 采集器：**`RESULT: 29/29 PASS`**（原 27 条 ＋ C11／C12；A10 已改口径）。
- `t88-probe-impl-a.mjs`：`RESULT: 44/44 fails=0`（B4 期望输出据此定稿）。
- `t105 --strict`：exit 0；`BLOCKED` 逐字＝H-10／H-02·H-05·H-12·H-16；`N/A` 2 条＝H-13／H-14。
- 对账：`matched=9/9 auditEntries=824（随并发 session 增长，以复跑实测为准） scoped=74 undeclared=65` → **PASS**（命令见文末附录）。
