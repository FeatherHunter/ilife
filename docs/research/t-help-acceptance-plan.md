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

**现状（本轮实测，2026-09-09）**：
- `RESULT-L1 = 1/4`：A3 绿（`t83-evidence` 21/21）；**A1 判据漂移 19 项**（`t81-route-evidence`，非产品缺陷）、
  **A2 日期依赖 1 条**（`复制昨日运动`，397/398；其判据在 `test/calorie-routing-81.test.mjs:293` 里**已经是红的**，
  但被基线白名单掩盖）、A4 未复跑。
- `RESULT-L2 = 4/8`：B1／B2／B3 绿（45/45）、B7 绿（description 499 字符含「卡路里HELP」）；
  B4／B5 有 E3 未复跑；**B6 视觉锁未产出**（#89 在飞）；**B8 运行时入口不可判定**（#64）。
- `RESULT-L3 = 4/6`：C1 绿（冻结面 130／implemented 130／pending 0）、C2／C3／C4 有 E3 未复跑；
  **C6 #79 收口未产出**。
- 静态对账层（本方案已落地）：**27/27 PASS**（`runId=44881f56-…`）。

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
| 路由两桶 | **exec 341 ／ non-exec 95** | `help-center-106.test.mjs:67`；`helpCenter.ts:96`；本轮实测见 §2.1-A1 |
| 新拟入口／覆盖修复 | **56 ／ 1** | 本轮 `t81-route-evidence.mjs` stdout（`runId=2e31333e-1505-4099-a3eb-ff9e6c74fafc`） |
| HELP 数据模型 | **10 分组／54 子功能／436 场景** | `help-center-88.test.mjs:44-48` |
| B1 逐值 | **20 条**（H-01…H-20） | `docs/visual-spec-help.md:47-49,241-251` |
| 内容页区块 | **12 个**（B-01…B-12） | `docs/visual-spec-blocks.md:26-41` |
| base-render 冻结面 | **130 条（implemented 130／pending 0）** | `packages/base-render/src/spec/index.ts` 正则计数（本轮实测） |
| 旧 HELP 实例 | **2 件**：65,366 B ／ 73,811 B | `fixtures/help-instances/README.md:15-16` |
| 新版 HELP 产物 | **file 1,264,822 B ／ text 24,989 B** | 本轮 `t83-evidence.mjs`（`runId=3820de4c-6e21-4e4b-9901-1e2d43dd62fd`） |
| 旧版 SKILL.md | **2196 行** | `(Get-Content … -Raw) -split "`n"` 计数；地图写 2195＝去尾空行口径 |

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

---

### 2.1 主线① 旧版全部唤醒词在新版同样命中并产出对应 HTML

| 子判据 | 可复算命令 | 期望输出 | 现状 |
|---|---|---|---|
| **A1 逐条入桶** | `node tooling/run-locked.mjs --ticket 63 -- node docs/research/t81-route-evidence.mjs` | `WAKE_ROUTES.length === 436`；`exec 341 ＝ 56＋22＋26＋222`；`non-exec 95 ＝ 10＋85`；核对失败 **0** | ⚠️ **19 项红，全属判据漂移**（见下；`runId=2e31333e-…`） |
| **A2 exec 实跑** | `node tooling/run-locked.mjs --ticket 63 -- node docs/research/t81-exec-smoke.mjs` | exec 桶逐条 `exit 0` ＋ `envelope.key === route.key`；即 **398/398** | ⚠️ **397/398**：唯一红＝`复制昨日运动`（`calorie.exercise.add`）`exit=4`「昨日无运动记录可复制」；**日期依赖**（见下），已由 `t81-exec-smoke.md:15-18,538-539` 登记。**同一条红也被 `test/calorie-routing-81.test.mjs:293` 断言，但它读的是 `.md` 快照（`actual:1 expected:0`），且该用例已在冻结基线白名单内**（`t88-baseline/test-failset.txt:13-16`）→ **没有任何 CI 会因此变红** |
| **A3 命中即渲染（M4）** | `node tooling/run-locked.mjs --ticket 63 -- node docs/research/t83-evidence.mjs` | `RESULT: 21/21 PASS`；其中 `⑤-81 联动 命中即渲染` 逐词 → `file` 态 | ✅ 本轮实测 `21/21`（`runId=3820de4c-…`） |
| **A4 门面 69 词** | `node docs/research/t82-verify-triggers.mjs` | `RESULT: 69/69`（全在 SoT 且被路由命中；exec 60／non-exec 9） | E3 有（`t82-skill-facade.md`），**未在本轮复跑** |

**摘要行**：`RESULT-L1: n/4`（n = A1…A4 通过数）。**本轮 = 1/4**（仅 A3 绿；A1 判据漂移、A2 日期依赖、A4 未复跑）。

#### 失败长什么样

| 形态 | 签名 | 判读 |
|---|---|---|
| **真失败** | 某条 `cli` `exit≠0` 或 `envelopeKey ≠ route.key`；或 `WAKE_ROUTES.length ≠ 436`（SoT 漂移） | 产品缺陷：路由层／键缺失／取数失败 |
| **判据漂移（假红）** | `t81-route-evidence.mjs` 的**硬编码断言**：`covered.size === 77`（`:430`）、`NEW_KEY_ROUTES.length === 34`（`:434`）、`frozenExecKeys.size === 43`（`:444`）、`exec 来源分解 … ≠ 341`（`:460`）——该脚本最后改动停在 `52e6fc8`（#81），而 #111／#112／#113／#86 已把口径推到 99 键／56 新拟／341 exec | **本轮实测 19 项红全部属此类**，逐条为「家族未派生但路由层为 exec ×16 ＋ 覆盖键 99≠77 ＋ 新拟入口 56≠34 ＋ exec 分解 ≠341」；**不是产品缺陷**，是**判据未随票据重基线** |
| **日期依赖（时间炸弹）** | `复制昨日运动` → `copyFrom:"yesterday"`（`routing.ts:300`）由**系统日期**决定（`write.ts:558` → `fetch/exercise.ts:247 copyYesterday`），而标准种子库（`t81-seed.mjs:70-78`）只种**绝对日期** `2026-09-01…07`。**同一命令 2026-09-08 绿、2026-09-09 红** | 既非产品缺陷也非抖动：**判据随墙钟变化**。修法二选一：种子补「相对今天的前一天」数据，或该词降 non-exec 并写理由 |
| **抖动** | `exit=3221225477 (0xC0000005)` ／ `3221225501 (0xC000001D)`、stderr 空、单独复跑绿 | B 类 flake（`t88-final.md:62-63` 具名裁决），**不计入** |
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
| **B4 F3 逐字 parity** | `node docs/research/t88-probe-impl-a.mjs` | 436/436 卡 `prompt` 逐字；三档徽章色逐条＝F3 `TYPE_DEFAULT` | E3 有（`t88-final.md:31`、`t91-help-center-cli.md`），**未在本轮复跑** |
| **B5 真实浏览器交互** | `node docs/research/t121-browser-evidence.mjs`（22/22）＋ `node docs/research/t88-browser-evidence-b.mjs`（29/29） | 复制按钮真变绿／搜索 44 命中／`#backTop`／禁用脚本仍 436 卡 | E3 有；**需本机 Chrome**，CI **无此步**（`.github/workflows/ci.yml` 全 117 行无浏览器） |
| **B6 B1 逐值 20 条（视觉锁）** | `node docs/research/t105-check-rulers.mjs --strict` ＋ `#89b` 截图／交互记录 | `DEFECT 0`；20 条逐条有结论（H-13／H-14 判 N/A，转内容页） | ❌ **未产出**：#89 进度 0%，在飞（本轮实测其探针 `.scratch/t89/*`、`runId=7191442c-…` exit=1） |
| **B7 入口可达（代码侧）** | `Select-String packages/skill-calorie/SKILL.md -Pattern "卡路里HELP"` | `description` 含「卡路里HELP」（实测 499 字符 ≤500）＋ 正文逐字命令 3 处（`:3`／`:10`／`:17`） | ✅ 代码侧达成（`t82-skill-facade.md`） |
| **B8 入口可达（运行时）** | 重装后真机说「卡路里HELP」 | 打开速查台 | ❌ **本图不可判定**（§5-4，归 #64） |

**摘要行**：`RESULT-L2: n/8`（B1…B8 通过数；B8 缺件时计 0 并标 `blocked=1`）。

#### 失败长什么样

| 形态 | 签名 | 判读 |
|---|---|---|
| **真失败** | `help-center-88/91/106` 任一 `fail>0`；或 `DEFECT>0`（尺子与冻结常量冲突）；或浏览器实证中「点一次复制 4 次」类断言红 | 产品缺陷 |
| **判据漂移** | B4 的 F3 常量被改动导致「逐字」红；或 `t105-check-rulers.mjs` 的 `OLD-DEVIATION` 被误读成 `FAIL` | R35 口径：`OLD-DEVIATION`＝**旧版差异**（18 条），不是新版缺陷（`visual-spec-help.md:331,369`） |
| **抖动** | 浏览器侧 ~31ms 采样导致的伪红——**已有先例**：`t121` 的 A6 在干净 dist 上 6 次复跑 3 次红，返修改为 1ms 轮询 ＋ `MutationObserver` 后 **5 连跑全绿 455–459ms**（`t121-copied-runtime.md` 返修 `835b6f5`） | 时序类判据必须**页面侧计时**，不许驱动侧采样 |
| **环境缺件** | `RESULT: ABORT exit=2`（找不到浏览器／CDP 起不来） | **显式失败，不得静默变绿**（`t88-browser-evidence-b.mjs:5`、`t121-browser-evidence.mjs:57`） |
| **体积误判** | 产物 1,264,822 B vs 旧 HELP 302,820 B | 若把「体积」写成验收项会红，但那是**设计选择**（`t88-final.md:166` L-16／`t106-help-cli-backfill.md` 登记 +22.4%），不是缺陷 |

---

### 2.3 主线③ 共享层补齐（base-* 控件层／图表层／HELP 模板／payload-snapshot 契约）

| 子判据 | 可复算命令 | 期望输出 | 现状 |
|---|---|---|---|
| **C1 冻结面完整** | `node --test packages/base-render/test/contract-signatures.test.mjs` | 130 条签名全绿；`SPEC_FROZEN_SURFACE` 130（implemented 130／pending 0） | ✅ 本轮 `help-center-88.test.mjs` 内 A2 用例亦断言（45/45 中） |
| **C2 四门** | `pnpm build` ／ `pnpm boundaries` ／ `pnpm snapshot:check` ／ `pnpm publish:pre` | 四门 `exit 0` | E3 有（`t83-review-red.md:64-69`），**未在本轮复跑** |
| **C3 其余 5 技能不回归** | `pnpm snapshot:html:check` | 185 件 HTML 逐件 sha256 相等 | E3 有（#96：活体实证 `changed=0`） |
| **C4 零依赖／零 DOM／无 canvas** | `pnpm boundaries` | 13 条 OK（含 6 条 base-* 影响面断言） | 同 C2 |
| **C5 canonical 失败集新增 0** | `node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt <新日志>` | `新增=0` | 基线文件受跟踪：`docs/research/t88-baseline/test-failset.txt` |
| **C6 #79 收尾** | 见 #79 票面 | v1.30 控件签名 × 实现实况**逐条有结论**；三包版本统一；CI 断言绿 | ❌ **未产出**（#79 进度 0%） |

**摘要行**：`RESULT-L3: n/6`。

#### 失败长什么样

| 形态 | 签名 | 判读 |
|---|---|---|
| **真失败** | `SPEC_FROZEN_SURFACE` 出现 `pending>0`；`boundaries` 任一红；`snapshot:html:check` 打印首个差异行 | 共享层缺陷（会波及 6 技能） |
| **判据漂移** | 失败集新增但测试名在基线白名单内 | 按 `t88-delta-flake-ruling.md` §5–§8 具名分类，**不以 exit 码判** |
| **抖动** | `#93 ① 64 读键`／`#41 M3`／`#76 无宿主证据`／`#80 HELP 生成` 等基线已登记的波动项 | `t83-review-red.md:73` 已列为「基线已登记的抖动项」 |

---

### 2.4 本轮实测记录（GATE-RUN，可复算）

GATE-RUN runId=2e31333e-1505-4099-a3eb-ff9e6c74fafc cmd=node docs/research/t81-route-evidence.mjs
GATE-RUN runId=9bba58f1-a6a4-42f9-a243-3a863a3cf2c9 cmd=node docs/research/t81-exec-smoke.mjs
GATE-RUN runId=ac6cf688-9a6a-4845-9865-83668055566a cmd=node docs/research/t81-exec-smoke.mjs
GATE-RUN runId=962cac71-792d-4f37-88ba-7e2bdc7009ac cmd=node --test packages/skill-calorie/test/help-center-88.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/help-center-106.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs
GATE-RUN runId=3820de4c-6e21-4e4b-9901-1e2d43dd62fd cmd=node docs/research/t83-evidence.mjs
GATE-RUN runId=44881f56-c2d4-4c36-b87e-725ce5a494e2 cmd=node docs/research/t-help-acceptance-collect.mjs
GATE-RUN runId=61bd571b-6f18-4800-872b-6461027b89a3 cmd=node --test test/calorie-routing-81.test.mjs

GATE-RELAX flag=--allow-nonzero reason=本轮 4 条 exit≠0 是**被观测对象本身**：t81-route-evidence（判据漂移 19 项）、t81-exec-smoke ×2（日期依赖 1 条）、calorie-routing-81（FX-81-5 快照红）——它们正是本文要分类的「红」，不是门禁失败
GATE-RELAX flag=--allow-undeclared reason=对账窗口内同时有 #89 与他席 #63 session 的运行（t89-probe-browser／t63-line1-*／中途两次采集器自检），非本席声明面

**对账实测**：`node tooling/check-gate-audit.mjs --evidence docs/research/t-help-acceptance-plan.md --ticket 63 --since 2026-09-09T15:38:50.000Z --until 2026-09-09T15:46:00.000Z --allow-nonzero --allow-undeclared`
→ `RESULT: matched=7/7 auditEntries=679 scoped=18 undeclared=11` → **PASS**（两条放宽已在上文声明）。

- `2e31333e`：**19 项核对失败**，逐条属判据漂移（§2.1 失败表第 2 行）。同时该轮 stdout 给出**当前权威口径**：
  `exec 341 ＝ 直连 56 ＋ HELP_EXEC_OVERRIDES 22 ＋ 孪生词转 exec 26 ＋ 同 key 可参数化 222`；
  `non-exec 95 ＝ 明确不做 10 ＋ 该词自身未承接 85（含 wizard 5 条）`；`新拟 56 ＋ 覆盖修复 1`；
  `SoT 436 条里 main_prompt.cli 以 py 起头：370；含 py：372；可执行：60`。
- `9bba58f1`／`ac6cf688`：**两次复跑输出逐字一致**（`exec 桶记录数 398 ／ 原样 exit 0 = 393 ／ 占位符替换后 exit 0 = 4 ／ 非零 1`），
  证明该红**确定性**、非抖动；唯一红＝`复制昨日运动`（日期依赖，§2.1 失败表第 3 行）。
- `962cac71`：`tests 45／pass 45／fail 0`（4 个测试文件）。
- `3820de4c`：`RESULT: 21/21 PASS`；其中 `①-file calorie.help.center … bytes=1264822`、
  `③-text … bytes=24989`、`⑤-81 联动 命中即渲染` 5/5 词。
- `44881f56`：**静态对账层 27/27 PASS**（`docs/research/t-help-acceptance-collect.mjs`，见 §3.1）。
- `61bd571b`：`test/calorie-routing-81.test.mjs` `tests 8／pass 7／fail 1`，唯一红＝
  `FX-81-5 不变量：exec ⟺ 实跑 exit 0`（`actual:1 expected:0`，读 `.md` 快照）；D2①（436／341／95）
  与 D2③（99 键全入口）等 7 条**全绿**——说明「测试已随票据更新、证据脚本没有」（§2.1 失败表第 2 行）。

> **这三个红/绿样本正好演示了本文的核心主张**：整图验收的价值不在「再跑一遍测试」，
> 而在**把红分成四类**（真失败／判据漂移／日期依赖／抖动）并让每一类有归属。

---

## 3. 一次性端到端证据的形态

### 3.1 形态：编排脚本 ＋ 受跟踪报告（不新造测试体系）

```
docs/research/t-help-acceptance-collect.mjs   # 静态对账层（**本方案已落地并跑绿**：27/27，runId=44881f56-…）
docs/research/t-help-acceptance.mjs           # 编排层（待建：串起 §2 全部命令，末行给三条 RESULT 行）
docs/research/t-help-acceptance-result.md     # 结论报告（受跟踪；含 GATE-RUN 行 ＋ 三条 RESULT 行 ＋ 覆盖矩阵快照）
.scratch/acceptance-63/<runId>/               # 原始产物（不入库）：stdout 日志／HTML 产物 sha256／截图目录
```

- **已落地的静态对账层**（`t-help-acceptance-collect.mjs`，只读、零 spawn、`<1 s`）：
  把「不 spawn CLI、不渲染页面就能判」的 27 条一次算清——436／341／95／56／1／493／99／64／35／130／
  20 条 B1／12 区块／2 件冻结 HELP 实例 sha256／description 499 字符／E3 台账数字一致性。
  末行 `RESULT: 27/27 PASS`，退出码 0／1／2（2＝缺 `dist/`，**不静默变绿**）。
  它的作用是**把「计数悄悄漂移」这类缺陷挡在整图验收之前**（本轮它已抓出两个自身判据缺陷并修正）。
- **编排层不新造测试体系**：判据全部复用既有 E2（`help-center-88/91/106`、`cmd-read-t11`、`t81-*`、`t83-evidence`、
  `t105-check-rulers`、`t121/t88` 浏览器脚本、四门）。编排脚本**只做编排 ＋ 对账 ＋ 摘要**。
- **末行恒三条摘要行**（§0 格式），失败即 `exit 1`；**缺浏览器等环境缺件**走 `exit 2` ＋ `RESULT: ABORT`
  （沿用 `t121-browser-evidence.mjs:57` 语义，**绝不静默变绿**）。
- **反伪造**：编排层内嵌 3 处「变异抽查」（改一个常量／删一个断言／换一条 cli，期望对应判据变红），
  与 #83／#88 的变异自证同形态（`t83-mutation.mjs:84` `RESULT-MUT: n/m`）；
  静态层已具备**交叉来源**（同一数字同时钉在 `routing.ts` 实测值与 `help-center-106.test.mjs:66-67` 的断言文本上）。

### 3.2 谁跑、在哪跑、跑多久、产物存哪

| 项 | 结论 |
|---|---|
| **谁跑** | 维护者或任一 session，**一条命令**：`node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-acceptance.mjs` |
| **在哪跑** | **Windows 本机**（浏览器部分必需）＋ **CI**（无浏览器部分可加一步）。CI 现无浏览器步骤（`.github/workflows/ci.yml` 117 行） |
| **跑多久**（按本轮实测外推） | build 约 1–3 min；四门 约 2–4 min；45 测试 **4.4 s**；`t83-evidence` **3.0 s**；`t81-exec-smoke` **≈398 次 CLI spawn**（数量级 5–15 min）；`snapshot:html:check` 约 1 min；浏览器实证 约 1–3 min。**合计 ≈15–25 min**（不含 `pnpm install`） |
| **产物存哪** | 报告 → `docs/research/t-help-acceptance-result.md`（**受跟踪**）；原始日志／sha256／截图 → `.scratch/acceptance-63/<runId>/`（**不入库**，`.gitignore:5` 已忽略 `.scratch/`） |
| **是否受跟踪** | 脚本 ＋ 报告**受跟踪**；原始产物**不受跟踪**。理由：仓内已有先例——`t83-review-red.md:51` 把「四门命令写在 gitignored 的 `.scratch/`」记为 **S3-5 缺陷**（新克隆无法逐字复跑）。故**凡是复跑必需的东西必须在 `docs/`**。 |

### 3.3 「新克隆能不能逐字复跑」——逐项前置条件

| # | 前置条件 | 状态 | 依据 |
|---|---|---|---|
| 1 | Node 24.x（或 ≥22.13） | ✅ | `.github/workflows/ci.yml:14` |
| 2 | pnpm 11.8.0 | ✅ | `ci.yml:22` |
| 3 | `pnpm install --frozen-lockfile` | ✅ | `ci.yml:28` |
| 4 | **`pnpm build`（必须先，证据脚本读 `dist/`）** | ✅ | `t83-evidence.mjs:4`；`t81-seed.mjs:13` 直接 import `dist` |
| 5 | 证据脚本本身受跟踪 | ⚠️ **部分不满足** | 受跟踪：`t81-*`／`t83-*`／`t88-*`／`t105-check-rulers.mjs`（`git ls-files docs/research` = **240** 件）。**未跟踪**：`docs/research/t89-probe-browser.mjs`（#89 在飞）、`docs/research/t-help-parity-gen.mjs`（平行工作）→ **入库前不可复跑** |
| 6 | 旧版对照物在仓 | ⚠️ **只满足 2 件** | `fixtures/help-instances/`（2 个 HELP 实例，sha256 已冻结）。**旧 73 模板／67 脚本不在仓**（`fixtures/README.md:31-52`：上游 `.gitignore` 零跟踪；本仓只冻结了 HELP 实例） |
| 7 | 旧侧计数可复算 | ⚠️ **靠 E3 台账** | 436 条 SoT 有 CSV（`t71-old-trigger-records.csv` 受跟踪）；73／67 的判定只在 `t71-old-baseline-inventory.md`（人写，非脚本） |
| 8 | 浏览器 | ⚠️ 本机有 Chrome／Edge 则全跑；否则 `exit 2` | `t121-browser-evidence.mjs:86-96` |
| 9 | 无 `.scratch/` 依赖 | ⚠️ 需在设计时保证 | 反例：`t83-review-red.md:51`（S3-5）、`visual-spec-help.md:329` 引 `.scratch/t105/check-rulers.mjs`（虽有同哈希的受跟踪副本 `docs/research/t105-check-rulers.mjs`） |

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

| 分组 | 条 | 覆盖证据 | 状态 |
|---|---|---|---|
| 静态可判（A 级） | H-01…H-11、H-13…H-15、H-17、H-18 | #105 尺子自证（`docs/research/t105-check-rulers.mjs`，可判 43 条／`DEFECT 0`）＋ #75 `buildStyleSheet`（`t75-style-evidence.mjs`） | 已覆盖（尺子＋样式资产） |
| 交互／时序（B 级） | **H-12／H-16／H-19／H-20** | #89 票面点名「截图不足，需交互记录」；现状：`t121`（H-16 22/22）、`t88-browser-evidence-b`（H-19 等 29/29） | **部分**（散落在两张票，**无一条把它们合成「B1 20 条逐条勾选」**） |
| N/A | H-13／H-14 | `visual-spec-help.md:364-365`（HELP 页无 KPI／进度环，转内容页 B-02／B-04） | 已裁定 |
| 旧版差异 | 18 处 | `visual-spec-help.md:338`（`OLD-DEVIATION 18`）＝改进项（R35） | 已裁定 |

### 4.7 内容页 12 区块

| 区块 | 覆盖证据 | 状态 |
|---|---|---|
| B-01／B-04／B-07／B-09／B-10／B-11／B-12 | 尺子自证 15 行 `PASS`（`visual-spec-blocks.md:229-243`）＋ #104（区块接口 owner） | 已覆盖（结构锚点） |
| B-02／B-03／B-05／B-06／B-08 | `visual-spec-blocks.md:244` 标 **BLOCKED**（需渲染后 computed 值） | **无覆盖**（待 #89b） |
| 12 个区块清单终审 | `visual-spec-blocks.md:209` DB-1 **移交 #104** | 已裁定（清单以 #104 为准） |
| 命名空间闭集 | `:210` DB-2 移交 #104 | 已裁定 |

### 4.8 覆盖矩阵小计

| 类别 | 格数 | 已覆盖 | 部分 | 无覆盖 |
|---|---:|---:|---:|---:|
| 唤醒词 436 | 7 | 4 | 3 | 0 |
| 模板 73 | 7 | 5 | 1 | 1 |
| 渲染脚本 67 | 5 | 2 | 1 | 2 |
| 键 99 | 5 | 3 | 2 | 0 |
| 分组／子功能／场景 | 4 | 4 | 0 | 0 |
| B1 20 条 | 4 | 2 | 1 | 0（1 已裁定 N/A） |
| 内容页 12 区块 | 4 | 2 | 0 | 1（1 已裁定移交） |
| **合计** | **36** | **22** | **8** | **4** |

---

## 5. 缺口清单（无法判定的项，按影响排序）

| # | 缺口 | 为什么无法判定 | 归属票 | 影响等级 |
|---|---|---|---|---|
| 1 | **B1 20 条的「新版侧」逐条结论**（尤其 H-12／16／19／20 交互＋12 区块 computed 值） | #89（89b）进度 0%；尺子自证只判到「冻结常量＋旧版实例」，新版页面的 computed 值需落地后判（`visual-spec-blocks.md:244` BLOCKED） | **#89** | **阻断**（主线② UI 同质） |
| 2 | **共享层收口**：v1.30 签名 × 实现逐条对照、三包版本统一、CI 断言 | #79 进度 0%（`gh issue view 79`） | **#79** | **阻断**（主线③ 收口） |
| 3 | **#83 的对抗式审查第二席** | 票面停在 90%「等编排者安排对抗式审查，本票不关票」；红队报告自认「蓝队席缺」（`t83-review-red.md:117`） | **#83** | **阻断**（主线① 的 HTML-First 判据目前单席） |
| 4 | **运行时「卡路里HELP」入口** | 四处**已安装副本**的 `description` 仍是 62 字符旧版 → 须重发版／重装；本图 Out of scope 明列「安装／双路实证归打通图」 | **#64** | **阻断**（就「用户真能说一句话打开」而言）／**可接受**（就代码侧而言，已达成） |
| 5 | **主线① 的可复算判据已漂移**：`t81-route-evidence.mjs` 硬编码 77／34／43／361 | 脚本最后改动 `52e6fc8`（#81）；#111–#113／#86 把口径推到 99／56／398；本轮实测 **19 项红**（`runId=2e31333e-…`），**全属判据漂移** | **需新票或并入 #79** | **阻断**（不修则「一条命令全绿」永远不成立） |
| 5b | **`复制昨日运动` 的日期依赖红** | `copyFrom:"yesterday"`（`routing.ts:300`）随系统日期解析，而标准种子库只种绝对日期（`t81-seed.mjs:70-78`）→ **同一命令换一天就变色**（本轮 2026-09-09 红、`t81-exec-smoke.md:539` 已登记同一红） | **需新票**（扩种子或降级该词） | **阻断**（对「一次性证据可复现」而言：证据必须**日期无关**才叫可复现） |
| 5c | **判据被基线白名单掩盖** | `test/calorie-routing-81.test.mjs:293`「FX-81-5 不变量：exec ⟺ 实跑 exit 0」**当前就是红的**（本轮 `runId=61bd571b-…`，`actual:1 expected:0`，读 `.md` 快照而非实跑），但它在冻结基线 `test-failset.txt:13-16` 的稳定红名单里 → 只要判据取「失败集新增 0」，**这条红永远看不见** | 登记 ＋ 纳入 5b 的修 | **阻断**（整图验收若只判「新增 0」，会把主线① 的核心不变量判成绿） |
| 6 | **旧 73 模板本体逐字对照** | 旧树不在仓（`fixtures/README.md:31-52`）；本仓只冻结 2 个 HELP 实例 | **#94 已做能做的**；余下**登记** | **可接受**（判据降级为映射表＋B1 逐值） |
| 7 | **95 条 non-exec ＋ 3 个不做模板** | 按设计不产 HTML／不承接 | #81／#39 已登记 | **可接受**（判据须定义为「有回执／有登记即通过」，见 §7-3） |
| 8 | **18 处 OLD-DEVIATION** | 旧版未达 B1（R35 裁定＝改进项） | #105／#89 | **可接受**（判据须定义为「改进项」） |
| 9 | **并发写同名产物**（#128） | `output.ts` 同秒「探测-写入」非原子 → 并发跑验收会**互相覆盖**（#91 的 1 MB 产物把窗口拉到 200–300 ms） | **#128** | **可登记**（验收脚本串行 ＋ 显式 `--output` 即可规避） |
| 10 | **`goal.set` 静默重置未传列**（#127） | 用户可见数据丢失（`water_goal 2300→2000` 等） | **#127** | **可登记**（不属「与旧版一样」的判据面，但影响真实体验） |
| 11 | **真机非空数据证据 0 条** | `t67-key-audit.md:15` 自陈；本轮所有实跑走**标准种子库**（`t81-seed.mjs`） | #93 已有基线；余下登记 | **可接受**（`docs/calorie-architecture.md:83`：合成与真实证据须显式标注，不得混用） |
| 12 | **canonical `pnpm test` 必然 exit 1** | 基线既有红 25 条／稳定红 29 条（`t88-baseline/BASELINE.md:93`）；其中 **`#93 ① 64 读键`** 与 **`#81 唤醒词路由层`／`FX-81-5`** 本身就在红名单里（`t88-baseline/test-failset.txt:14`）；`--expect-exit` 待修（`t88-final.md:159`） | 登记 | **可接受**（判据＝失败集新增 0；但须注意「读键全绿」「路由全绿」当前**不是事实**，验收脚本必须读失败集而非 exit 码） |
| 13 | **产物体积 1,264,822 B（+22.4%）** | #106 登记；若 #89／#83 以体积为验收项需回议（`t88-final.md:166`） | 登记 | **可登记** |
| 14 | **`fallback` 形无 CLI 出口** | #93 实测；`t83-evidence.mjs` 的 ⑥ 形状覆盖也只到 5 形 | 登记 | **可登记** |
| 15 | **`changeset:status` 环境红** | 缺 `@changesets/errors`；协议禁止自行 install | 登记 | **可登记** |
| 16 | **#82 description 余量仅 4 字符**（499／500） | 再加触发词即截断（截断态三要素仍可见，已实证） | 登记 | **可登记** |

---

## 6. 三个可选方案（便宜 → 昂贵）

| 维度 | **A · 文档对账** | **B · 编排脚本（推荐）** | **C · B ＋ 浏览器全量 ＋ 全新克隆复跑** |
|---|---|---|---|
| 形态 | 一份受跟踪报告，人抄录既有 E2／E3 结论 | 受跟踪编排脚本 ＋ 报告 ＋ `.scratch` 原始产物 | B ＋ 截图归档 ＋ 浏览器交互套件 ＋ 在临时目录 `pnpm install && pnpm build` 全量复跑 |
| **证据强度** | 低—中：结论可追溯但**不可复算** | 中—高：**一条命令复算**，末行机读，逐条可追 | 高：再加「像素／交互」与「干净环境」两维 |
| **成本（人时）** | 2–4 | **4–8**（静态层已落地，只剩编排层 ＋ 报告模板） | 16–24 |
| **成本（机时）** | ≈10 min | ≈15–25 min | 2–3 h（含 install ＋ 3 OS×2 node 复跑） |
| **维护成本** | 低，但**必然腐烂**（票据一收口就过期） | 中：需随票据重基线常量（本轮的 19 项红就是没维护的代价） | 高：浏览器版本／字体／DPR 引入像素抖动，需定期重拍基线 |
| **能否被伪造** | **易**：数字手抄，无命令可对 | **难**：脚本＋GATE-RUN 对账（`check-gate-audit.mjs`）＋变异抽查；但仍可通过改脚本恒绿 | **最难**：还要过干净环境与浏览器 |
| 反伪造手段 | 无 | `check-gate-audit`（runId 逐条命中实时日志）＋ 3 处变异抽查 ＋ 第二人独立复跑 | 同 B ＋ CI 矩阵 ＋ 截图可复现性检查 |
| 结论 | 不足以支撑「整图验收」 | **推荐** | 过重（且与 #89b 重复） |

### 推荐：**方案 B**，理由四条

1. **判据已经存在**：三条主线的终局判据 90% 已落成受跟踪 E2 脚本／测试（§2 各表）。缺的是**编排＋对账＋缺口台账**，
   不是新体系。A 之所以便宜，正是因为它把「复算」这一半省掉了——而这一半才是验收的全部意义。
2. **「一次性」不等于「重跑一遍」**：B 通过**消费** #89b 的产物（把 `docs/research/t89-evidence/` 的 `RESULT` 行
   纳入 `RESULT-L2`）实现一次性，而不是把浏览器套件重写一遍。C 会把 #89b 的交付物复制成第二份，**双维护**。
3. **对抗性**：整图验收的敌人不是「跑不起来」，是「**看起来绿**」。B 的机读摘要行 ＋ `GATE-RUN` 对账
   （`tooling/check-gate-audit.mjs`，runId 必须命中**实时**日志，`t106-help-cli-backfill.md` 已用过 17/17）
   让「手抄数字」这条路走不通；再加变异抽查，把「改脚本恒绿」这条路也堵上。
4. **本轮已经证明 B 的必要性**：一次「把整图证据串起来跑一次」就抓出**两类没人报的缺陷**——
   `t81-route-evidence.mjs` 的 19 项判据漂移（任何测试都不会报）、`复制昨日运动` 的日期依赖红
   （换一天就变色）。A 方案会把前者抄成一句「#81 已通过」、把后者抄成「#81 全绿」，**把漂移藏起来**。
   反过来说：B 的**维护成本主要就花在这两类上**——把判据钉在「当前口径」而不是「#81 当时的口径」。

---

## 7. 需要维护者拍板的点（3 个）

### 拍板点 1 · 整图验收的判定口径

- **问题**：`RESULT-63` 判「三条主线机读全绿 ∧ 缺口台账无『阻断』项」是否足够？还是要「必须浏览器实景录屏」？
- **选项**：(a) 机读全绿＋缺口台账（本文推荐）；(b) (a) ＋ 必须附浏览器实景（截图＋交互记录）作为**验收门**；
  (c) 只认人工目检。
- **推荐**：**(a)**，并规定浏览器证据由 **#89b 一次性提供**、作为 `RESULT-L2` 的输入而非重复跑。
  理由：`docs/calorie-architecture.md:97` 已明确「不要求 DOM 同构」，像素面本就不是判据；(c) 不可复算。

### 拍板点 2 · 证据形态与受跟踪边界

- **问题**：报告入仓、**原始产物不入仓**是否可接受？旧基线不在仓导致「旧侧不可复算」如何记账？
- **选项**：(a) 报告＋脚本入仓，原始产物（含 1.26 MB HTML 三态）落 `.scratch/`（本文推荐）；
  (b) 原始产物一并入仓（可逐字复算，但每次验收给仓加 ~2.5 MB）；
  (c) 全部落 `.scratch/`（最省，但重犯 `t83-review-red.md:51` 的 S3-5）。
- **推荐**：**(a)**。并在报告里固定一段「旧侧不可复算声明」（本文 §3.3 第 6／7 条），
  使「新克隆逐字复跑」的边界**写在明面上**，而不是靠读者猜。

### 拍板点 3 · 判据豁免与判据重基线

- **问题**：三个豁免（95 条 non-exec ＋ 3 个不做模板 ＝ 达成；18 处 `OLD-DEVIATION` ＝ 改进项；
  5 个「新架构不适用」中 4 个由 #86 承接、1 个静态文档无覆盖）是否成立？
  以及 `t81-route-evidence.mjs` 的**重基线**归哪张票？
- **选项**：(a) 三个豁免全部成立 ＋ 重基线**新开一张收尾票**（本文推荐）；
  (b) 豁免成立，重基线并入 **#79**；(c) 不豁免（则本图目标不可达）。
- **推荐**：**(a)**。理由：(c) 会让「与旧版完全一样」成为字面不可达（旧版自己也不做这 3 类）；
  (b) 会让 #79（共享层收口）背上一张卡路里路由票，与 #79 的「base- 契约」主题不符。
  重基线票的最小验收：`t81-route-evidence.mjs` 在当前树 `exit 0`，且断言常量与
  `help-center-106.test.mjs:66-67`（341／95）同源、不各自维护第二份数字。

---

## 附 · 复算命令索引（逐条可直接粘贴）

```powershell
# 0 静态对账层（本方案已落地；一条命令覆盖全部计数／契约／冻结物）
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t-help-acceptance-collect.mjs   # 期望 RESULT: 27/27 PASS

# 0 计数基线（人工复核用）
(Get-Content docs\research\t71-old-trigger-records.csv -Encoding UTF8 | Measure-Object -Line).Lines   # 437（含表头）
(Select-String -Path packages\base-render\src\spec\index.ts -Pattern "status:\s*'" -AllMatches).Matches.Count  # 130
([regex]::Matches((Get-Content packages\base-combos\combos.yaml -Raw -Encoding UTF8), "(?m)^\s*-\s*key:\s*(calorie\.[a-zA-Z0-9_.-]+)") | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique).Count  # 99

# 1 主线①
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t81-route-evidence.mjs   # 期望 0（当前 1＝判据漂移）
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t81-exec-smoke.mjs       # 期望 0（当前 1＝397/398，日期依赖）
node tooling/run-locked.mjs --ticket 63 -- node --test test/calorie-routing-81.test.mjs # 期望 8/8（当前 7/8＝FX-81-5）
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t83-evidence.mjs         # 期望 RESULT: 21/21
node docs/research/t82-verify-triggers.mjs                                            # 期望 RESULT: 69/69

# 2 主线②
node tooling/run-locked.mjs --ticket 63 -- node --test packages/skill-calorie/test/help-center-88.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/help-center-106.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs   # 期望 45/45
node docs/research/t105-check-rulers.mjs --strict                                     # 期望 DEFECT 0
node tooling/run-locked.mjs --ticket 63 -- node docs/research/t121-browser-evidence.mjs   # 期望 22/22（需 Chrome）

# 3 主线③
pnpm build; pnpm boundaries; pnpm snapshot:check; pnpm publish:pre                     # 四门 exit 0
pnpm snapshot:html:check                                                              # 185 件 changed=0
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
```

（来源：`.scratch/locks/gate-runs.log`，2026-09-09T15:38:59Z–15:45:00Z。窗口内另有 `ticket=89` 的运行——
`t89-probe-browser.mjs` 两跑 `exit=1`、`calorie.help.center --params {"mode":"file"}` `exit=0`——**属他票，不计入本票证据**。）

对账命令（逐字复跑；两条放宽已在上文 `GATE-RELAX` 声明）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t-help-acceptance-plan.md \
  --ticket 63 --since 2026-09-09T15:38:50.000Z --until 2026-09-09T15:46:00.000Z \
  --allow-nonzero --allow-undeclared
```
