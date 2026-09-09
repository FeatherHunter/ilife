# #96 · 其余 5 技能不回归门（base-paint 变更）——实施与验收证据

- 票：wayfinder 地图 #63 / 票 #96《其余 5 技能不回归门（base-paint 变更）》
- 分支：`master`（不 push）；本票路径所有权：`tooling/**`／`.github/workflows/ci.yml`／`package.json`（仅加 script）／`docs/research/t96-*`／`.changeset/t96-*`／`.scratch/t96/**`
- 验收口径（票面）：① 回归门落地并接入 CI；② base-* 变更后 5 技能快照差异为 **0**，或每处差异有解释与批准。
- 结论：**两条验收均满足**。新门 `pnpm snapshot:html:check` 覆盖 5 技能 **185 件** HTML 产物（逐件 sha256）；5 个受控变异全部「红 → 逐字节还原 → 绿」；四门 ＋ 新门 exit 0；canonical `pnpm test` 失败集**新增 0**。

---

## 1. 现状诊断（先实测，再动手）

### 1.1 `pnpm snapshot:check` 现在覆盖什么

`package.json:16` → `node tooling/write-snapshot.mjs --check`。该脚本（`tooling/write-snapshot.mjs:9-19`）**只**读三样东西算一个 16 位 sha：

| 输入 | 行 | 说明 |
| --- | --- | --- |
| `packages/ilife-skills/package.json` 的 `version` | `:13` | 分发版本 |
| `packages/base-combos/combos.yaml` | `:16` | 键真相源 |
| `packages/base-combos/src/present.ts` | `:17` | 键表 |

输出落在**唯一**文件 `packages/ilife-skills/skill.snapshot.json`（4 行：`resolvedVersion`／`sha`／`writtenBy`）。**结论：它不覆盖任何 HTML 产物**，与 5 个技能的页面零关系——票面「仓库现无 per-skill HTML 快照」属实。

### 1.2 缺口

| 缺口 | 实测证据 |
| --- | --- |
| 无 per-skill HTML 快照 | 全仓 `*snapshot*.json` 仅 `packages/ilife-skills/skill.snapshot.json` 一个；`tooling/` 下无第二个快照脚本 |
| 5 技能与 base-* 的耦合**当前为零**（票面「6 技能共用 45 处 `token()`」是**迁移后目标态**，非现状） | `packages/skill-bill/package.json:23-25` 等 5 个包 `dependencies` 只有 `base-link-core`；5 包 `src/**/*.ts` ＋ `templates/*.html` 中 `base-paint`／`base-render` 命中 **0**；`token(` 命中 **0**（仅 `skill-calorie` 39 处） |
| 边界门只查零依赖，不查 base-* 影响面 | `tooling/check-boundaries.mjs:12-28` 原有 7 条断言全部是 link-core／render／combos 的零依赖与装配归属 |

> 因此本票的「不回归」不是「改 base-paint 后重新跑一遍看有没有变」，而是**把「base-* 到不了这 5 个技能」变成两条可机械判定的断言**：结构面（依赖闭包／import）＋ 行为面（HTML 产物逐件冻结）。

### 1.3 覆盖集合的实测边界（防「假覆盖」）

5 技能的渲染层可枚举面：`*_KEY_SHAPES`（16／8／21／8／10 ＝ **63 个 key**）、`*_TEMPLATES`（16／8／21／8／6 ＝ **59 个模板**）、6 形状分支 ＋ `!items.length` 空态分支 ＋ 未知形状必抛分支 ＋ `escapeHtml`。用统一对抗夹具（含 `&<>"'` 与代理对）实测：**63/63 key 渲染成功、59/59 模板填充成功、5/5 技能未知形状抛出本技能 `*RenderError/*_SHAPE_MISMATCH`**（探针脚本 `.scratch/t96/probe-shapes.mjs`）。

---

## 2. 回归门设计与落点

### 2.1 新增门：`pnpm snapshot:html:check`（行为面）

- 脚本：`tooling/skill-html-snapshot.mjs`（406 行）；快照：`tooling/skill-html.snapshot.json`（185 件，113 KB）。
- 覆盖 5 技能（`SKILLS`，`:43`）的 **185 件产物**：

| 产物族 | id 形态 | 件数 | 打的分支 |
| --- | --- | --- | --- |
| key→shape 映射表 | `<skill>/keys` | 5 | 结构性：改映射即红 |
| 每 key 的 section 片段 | `<skill>/frag/<key>` | 63 | 6 形状按 key 分配路径 |
| 形状全覆盖 | `<skill>/shape/<shape>` | 30 | 含 5 技能都**没分配**的 `fallback` |
| 空列表空态 | `<skill>/shape/list-empty` | 5 | `!items.length` 分支（5 技能共有的 `hm-empty` 文案） |
| 未知形状必抛 | `<skill>/shape-throw` | 5 | 抛错类型＋错误码 |
| 模板清单 | `<skill>/templates` | 5 | 模板集合变更 |
| 模板填充页 | `<skill>/tpl/<name>` | 59 | 模板文本 ＋ 标记填充 ＋ 共享资产注入 |
| 共享 CSS／helpers | `<skill>/shared-css`、`shared-helpers` | 8 | 4 技能有导出，memo 无（由 tpl 探针串覆盖） |
| 转义探针 | `<skill>/escape` | 5 | `&<>"'` ＋ 反引号 ＋ 代理对 |

- 判据：**逐件 `sha256(归一化文本)`**（归一化＝去 BOM ＋ CRLF→LF，跨 3 个 CI OS 同值；`normalize`，`:62`）。任一件不同即 exit 1，并打印**首个差异行**（`firstDiff`，`:252`）。
- 体积控制（票面要求）：单件 > 2048 B 只存 `sha256`＋`bytes`（`textOmitted:true`，当前 6 件 memo 大模板）；**定位路径**＝`src` 字段给出的源文件 ＋ `git diff`，或用 `--show <id>` 打印实际全文。185 件中 179 件带全文，`git diff` 可直接看差异。
- 反手改快照：带 `text` 的条目其 `sha256` 必须自洽，否则红（`compare` 的 `staleText`，`:231`）。
- 未构建时**显式失败**（不静默跳过）：`dist/render/index.js` 缺失即 `FAIL`。

### 2.2 边界断言：base-* 变更影响面（结构面）

`tooling/check-boundaries.mjs:30-56` 追加 6 条断言（**只加不放宽**，原 7 条一字未动）：

1. `skill-bill／chef／home／schedule／memo-ilife` 的 `dependencies／devDependencies／peerDependencies` 闭包**不含** `base-paint`／`base-render`（5 条，`:35-40`）；
2. 5 包 `src/**/*.ts` ＋ `templates/*.html` **不 import** `base-paint`／`base-render`（1 条，`:41-56`）。

配套第三条在快照门内（**影响面断言**，`:55`）：185 件产物文本**不得**出现 base-paint 命名空间标记 `ilife-base`／`data-ilife`／`ilife-`（`MARKER_ALLOW` **刻意留空**，`:55`）——出现即说明 base-* 的样式／控件／图表资产已渗进这 5 个技能，必须**显式改工具并走审查**，不得静默变绿。

### 2.3 为什么快照文件放 `tooling/` 而不是 `packages/<pkg>/`

5 个技能包不在本票路径所有权内（改它们＝越界）。集中放 `tooling/skill-html.snapshot.json` 同时避免「一个门散落 5 个文件」；`src` 字段已把每件产物指回其真实源文件，定位能力不受影响。

### 2.4 为什么不含 `skill-calorie`

票面口径是「**其余** 5 技能」。calorie 的 HTML 正是 #108–#113／#83 在途改造对象，冻结它会让别的票一改就红（跨票假红）。calorie 与 base-* 的耦合由 §3.3 的正对照探针负责证明「可检出」。

---

## 3. 鉴别力自证

### 3.1 受控变异（`docs/research/t96-mutation-evidence.mjs`）

运行（**经持锁包装器，脚本自证 `owner.runId` 一致**）：
`node tooling/run-locked.mjs --ticket 96 --run-id t96-mut-20260909a -- node docs/research/t96-mutation-evidence.mjs --expect-run-id t96-mut-20260909a`

| # | 变异目标 | 变异内容 | 期望 | 实测 |
| --- | --- | --- | --- | --- |
| T1 | `packages/skill-bill/templates/record_today.html` | 模板加一段 `<p data-mut>` | 快照门红，命中 `bill/tpl/record_today` | **PASS** |
| T2 | `packages/skill-bill/templates/help.html` | 注入 `class="ilife-probe"` | 快照门红，命中影响面断言 `ilife-` | **PASS** |
| T3 | `packages/skill-home/src/render/html.ts` | **src 级**：空态文案加 `data-mut` ＋ `pnpm build` 重建 dist | 快照门红，命中 `home/shape/list-empty` | **PASS** |
| B1 | `packages/skill-bill/package.json` | 依赖闭包加 `base-paint` | 边界门红，命中「依赖闭包不含 base-*」 | **PASS** |
| B2 | `packages/skill-bill/src/render/html.ts` | 加 `import ... from 'base-paint'` | 边界门红，命中「不 import base-*」 | **PASS** |

每个变异都满足：跑前 sha256 记录 → 锚点恰命中 1 次 → 变异 → 门红且命中预期 → **逐字节还原**（备份 Buffer 回写）→ `sha256` 与跑前**相同** ＋ `git status --porcelain` 干净 → 门**复绿**。机器可读结论：

```
RESULT: mutations=5 bad=0 restored_targets=5 snapshot:html=0 boundaries=0
```

还原 sha256 双证（前 → 后，16 位）：

| 目标 | sha256 |
| --- | --- |
| `packages/skill-bill/templates/record_today.html` | `159298b2a5876b5e` → `159298b2a5876b5e` |
| `packages/skill-bill/templates/help.html` | `909a288b1af0f90d` → `909a288b1af0f90d` |
| `packages/skill-home/src/render/html.ts` | `b95a95263894303f` → `b95a95263894303f` |
| `packages/skill-bill/package.json` | `c98cb457df437dd7` → `c98cb457df437dd7` |
| `packages/skill-bill/src/render/html.ts` | `ac6b472965ff2120` → `ac6b472965ff2120` |

> 说明（偏离记账）：变异目标含 5 技能包的**受跟踪文件**（`skill-bill`／`skill-home`），本票路径所有权不含它们。这是协议 §5「变异自证」的**临时**动作：全程在持锁区内（`LOCK-SELF-CHECK` 断言 `owner.runId`）、逐字节还原并双证、`git status` 收尾干净；**不是本票交付物**，无任何残留。

### 3.2 门禁工具自证（`tooling/test/skill-html-snapshot.test.mjs`，9/9）

覆盖 4 类盲区：① 归一化／sha 稳定性；② 变化／新增／消失三类检出；③ 手改快照（`text` 与 `sha256` 不符）必须红；④ **影响面标记注入必须红且白名单为空**；⑤ `firstDiff` 定位；⑥ **「覆盖集合 == 声称集合」**——逐技能断言结构件数 `4+6+1`、frag 数 16/8/21/8/10、tpl 数 16/8/21/8/6、7 件形状探针齐备、空列表探针确实含 `hm-empty`、未知形状抛出本技能错误码（防「探针存在但没打到分支」的自我满足）；⑦ 写读闭环零差异；⑧ base-* 指纹可复算；⑨ 入仓快照与当前树一致。

### 3.3 「base-* 变更 → 差异 0」的结构性证明（`docs/research/t96-base-impact.mjs`）

算每个技能 `dist/index.js` 的 ES 模块 **import 闭包**：

```
OK   skill-bill: dist 文件 20 件；外部依赖闭包 = [base-link-core]；base-* 命中 = [（无）]
OK   skill-chef: dist 文件 17 件；外部依赖闭包 = [base-link-core]；base-* 命中 = [（无）]
OK   skill-home: dist 文件 20 件；外部依赖闭包 = [base-link-core]；base-* 命中 = [（无）]
OK   skill-schedule: dist 文件 20 件；外部依赖闭包 = [base-link-core]；base-* 命中 = [（无）]
OK   skill-memo-ilife: dist 文件 18 件；外部依赖闭包 = [base-link-core]；base-* 命中 = [（无）]
OK   skill-calorie: dist 文件 86 件；外部依赖闭包 = [base-paint]；base-* 命中 = [base-paint]
POSITIVE-CONTROL: skill-calorie 闭包含 [base-paint] → 探针能测出 base-* 消费
RESULT: skills=5 five_clean=5 positive_control_base_star=1 bad=0
```

**正对照**是关键：同一探针在 `skill-calorie` 上确实测出了 `base-paint`。若探针连 calorie 都测不出，「5 技能不含」的结论不可信；现在它有鉴别力。⇒ base-* 的变更**没有可达路径**影响这 5 个技能，故快照差异必然为 0；这与快照门的实测 0 差异互为印证。

---

## 4. 门禁实测（逐条 exit）

全部经 `node tooling/run-locked.mjs --ticket 96 -- <命令>`（协议 §2.4）。基线＝`docs/research/t88-baseline/BASELINE.md`（四门 exit 0）。

| # | 命令 | exit | 关键行 |
| --- | --- | --- | --- |
| 01 | `pnpm build` | **0** | 无 `error TS` |
| 02 | `pnpm boundaries` | **0** | `boundaries: PASS`（13 条 OK，含新增 6 条） |
| 03 | `pnpm snapshot:check` | **0** | `OK: 快照 == 实际拉取版（0.1.0@932e7b250d278d50）` |
| 04 | `pnpm publish:pre` | **0** | `check-publish --pre：PASS` |
| 05 | `pnpm snapshot:html:check`（**新门**） | **0** | `RESULT: artifacts=185 changed=0 added=0 removed=0 base-* fingerprint=fd6299e2…` |
| 06 | `pnpm test`（canonical，1 轮） | **1** | 既有红：tests 1091／pass 1066／fail **25**／suites 131 |
| 07 | `node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t96/after-pnpm-test.log` | **0** | `base=34 after=29 新增=0 消失=5` |

- **失败集新增 0**：消失的 5 条正是基线 §4 列出的**抖动项**（`#41 M3 真 CLI 串行冒烟`／`#76 无宿主可执行证据`／`#80 HELP 生成`／`helpers JS ≤820px`／`③ check-combos 全绿`），本轮恰好都没触发；**未新增任何失败项**，无需分类。
- **当轮并发上下文**（裁定 §3.3 要求）：本票运行期间工作区另有在途改动 `packages/skill-calorie/src/cli/write.ts`（他票 WIP，非本票路径）＋ 其他 session 的锁竞争（`pnpm boundaries`／`publish:pre`／`snapshot:html:check` 各 `waitedMs=1`，其余 0）；**无 headless 浏览器实证同时运行**；全量测试经锁串行（`pnpm test` `waitedMs=0`）。
- `changeset:status` 未跑（基线 §6.2 记为环境红 `Cannot find module '@changesets/errors'`，非本票验收门；协议 §2.1 禁 `pnpm install`）。
- 事故 #124 自检：跑完 `pnpm test` 后 `git status --short` **无** `packages/skill-calorie/SKILL.md` 改动（`git diff --stat` 空、`git ls-files --eol` 为 `i/lf w/lf`）。

---

## 5. CI 接入

`.github/workflows/ci.yml:35-39`（`build-test` job，紧跟 `pnpm snapshot:check`）：

```yaml
      # #96：其余 5 技能 HTML 不回归门（per-skill HTML 逐件 sha256；base-* 影响面断言）
      #   本地同口径命令就是这一条：pnpm snapshot:html:check（见 tooling/skill-html-snapshot.mjs）
      - run: pnpm snapshot:html:check
      # #96：门禁工具自证（协议 §2.4.6：不在 canonical pnpm test 的 glob 内，须单独触发）
      - run: pnpm gate:selftest:html
```

- **本地与 CI 同口径**：CI 跑的就是 `pnpm snapshot:html:check`（`package.json:18`），与本地完全同一条命令；快照比较用归一化 sha256，跨 ubuntu／macos／windows 三 OS 同值。
- 结构面断言随 `pnpm boundaries` 一起进 CI（`ci.yml:32` 既有行），故「5 技能一旦消费 base-*」会在**两个** job 步同时暴露。
- 新增 script（`package.json:17-19`、`:29`）：`snapshot:html`（写）／`snapshot:html:check`（校验）／`snapshot:html:list`（列产物）／`gate:selftest:html`（工具自证，内部即经持锁包装器）。

---

## 6. 机械对账（协议 §2.4.2）

本证据声称的每次运行（`GATE-RUN` 声明）：

GATE-RUN runId=1642ceb1-1ec0-4e5c-9a30-2cf2f4fdff69 cmd="node --test tooling/test/skill-html-snapshot.test.mjs"
GATE-RUN runId=732259e1-243f-4f0b-9c30-c9fb266944ff cmd="git add tooling/skill-html-snapshot.mjs tooling/skill-html.snapshot.json tooling/test/skill-html-snapshot.test.mjs tooling/check-boundaries.mjs .github/workflows/ci.yml package.json"
GATE-RUN runId=def286ea-aeeb-4b8e-845a-7debe2fb755b cmd="git commit --only tooling/skill-html-snapshot.mjs tooling/skill-html.snapshot.json tooling/test/skill-html-snapshot.test.mjs tooling/check-boundaries.mjs .github/workflows/ci.yml package.json -F .scratch\\t96\\commit-1.txt"
GATE-RUN runId=2c82745a-f47e-4316-8876-19f667f5f992 cmd="git add tooling/skill-html-snapshot.mjs tooling/skill-html.snapshot.json tooling/test/skill-html-snapshot.test.mjs"
GATE-RUN runId=640ba821-d207-4fb2-aff5-22251a2270b6 cmd="git commit --only tooling/skill-html-snapshot.mjs tooling/skill-html.snapshot.json tooling/test/skill-html-snapshot.test.mjs -F .scratch\\t96\\commit-2.txt"
GATE-RUN runId=t96-mut-20260909a cmd="node docs/research/t96-mutation-evidence.mjs --expect-run-id t96-mut-20260909a"
GATE-RUN runId=7a64e2fd-02e3-4770-8311-ac9ce3511654 cmd="pnpm build"
GATE-RUN runId=95faba5a-5c6e-40e2-b9a6-a093a0ce3086 cmd="pnpm boundaries"
GATE-RUN runId=f190509d-f5ee-47a1-a855-4f10fcfc8d78 cmd="pnpm snapshot:check"
GATE-RUN runId=39ba890c-fc92-4c2d-8794-afd4c8e1d2eb cmd="pnpm publish:pre"
GATE-RUN runId=a1aa9d50-a7db-4daa-b5d9-28df51047dbd cmd="pnpm snapshot:html:check"
GATE-RUN runId=e67e1a7d-ffa3-410d-ad08-010c1a948324 cmd="pnpm test"

GATE-RELAX flag=--allow-nonzero reason=`pnpm test` 的基线态即 exit 1（`docs/research/t88-baseline/BASELINE.md` §4：991 pass／26 fail）；本票判据是**失败集新增 0**而非 exit 0，故该条声明引用 `exit=1` 的 RUN 条目，据实放宽「只认 exit=0」一条。

对账命令与导出（对账源入仓）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t96-gate.md --ticket 96 \
  --since 2026-09-09T13:50:00.000Z --until 2026-09-09T13:54:00.000Z \
  --allow-nonzero --export docs/research/t96-gate-runs.log
```

---

## 7. 未做 / 未确证

1. **未做**：不含 `skill-calorie` 的 HTML 快照（理由见 §2.4，属票面「其余 5 技能」口径）。
2. **未做**：未对 `packages/base-render/**` 做**活体**变异探针（票面硬约束「不得改 `packages/base-render/**`」）。「base-* 变更 → 差异 0」由 §3.3 的**可达性闭包 ＋ 正对照**证明，而非「改一下 base-paint 再跑一遍」的活体实验；后者可在审查阶段由审查者自行安排。
3. **未确证**：`dist` 陈旧度只作 `WARN`（`staleness()`，mtime 判据在 `tsc -b` 增量构建下可能误报），不作红；门自身读 `dist`，CI 顺序为 `pnpm build` → `pnpm snapshot:html:check`。
4. **未确证**：未在 macOS／ubuntu 实机跑过新门（本机为 Windows）。跨 OS 一致性靠 CRLF→LF 归一化 ＋ 3 OS CI 矩阵；首次 CI 运行是真正的跨 OS 实证。
5. **未做**：`changeset:status`（环境红，见 §4）。
6. **无 changeset**：本票不改任何**已发布包**（只改 `tooling/**`／CI／`package.json` 的 scripts），changesets 面向发布包，故不写 `.changeset/t96-*`；若审查认为门禁设施也需登记，请编排者裁定。

---

## 8. 风险 top3

1. **快照门只冻结「当前 5 技能」，不阻止未来迁移**：一旦某技能接入 base-paint，门会**红**（依赖断言 ＋ `ilife-` 标记断言），需要显式改工具／断言并走审查——这是设计意图，但迁移票（各技能本体图）必须知道「#96 的断言要一起改」，否则会被当成假红。
2. **`textOmitted` 的 6 件大产物定位依赖 `git diff` 源文件**：差异能检出，但门自己只给 `src` 路径 ＋ 摘要；若源文件同时被他票改动，定位需人工分辨。
3. **`--allow-nonzero` 属放宽开关**：本票只用一次且已留 `GATE-RELAX` 行（`pnpm test` 基线即红）。若审查认为应改为「不声明该条」，则反向对账需要 `--allow-undeclared`，同样需要留痕——两条路径都需审查者确认口径。
