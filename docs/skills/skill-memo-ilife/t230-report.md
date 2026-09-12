# #230 报告 · 锁：CLI 级用例（真 spawn 出口）

- 票面：`docs/skills/skill-memo-ilife/t230-body.md`｜地图：`#220`｜前序出口票：`#229`
- 依据正本：`docs/skills/skill-memo-ilife/t220-orchestrator-decisions.md` 裁决 1／2／3／18
- 样板：`packages/skill-bill/test/help-exit-148.test.mjs`（记账那张图的五例）
- 本票**没有**、也不许有「包内 `npm test` 绿」这条判据（裁决 18）
- 测试库全在 `%TEMP%` 下（每次 `mkdtempSync` 一个 `memo230-*` 目录，`SKILLS_DB_PATH` 指过去）；
  **真库 `D:\2Study\StudyNotes\.db` 零写入**（实测 `memo_html\` 目录 mtime 仍为 `2026/9/12 13:44:56`，早于本票的首次构建 `13:47`）

---

## 0. 结论一句话

五例在**真 spawn 出口**下全绿（5/5，包内 `test/` 合计 53/53）；两次变异自证按票面预测变红（改文件名主体 → **①④红**；`wx`→`w` → **③红**）；逐字还原后两个源件 sha256 与变异前**逐位相同**，删 `tsconfig.tsbuildinfo` ＋ `tsc --build --force` 全量重建后仍全绿。

---

## 1. 交付件

| 件 | 状态 | LF | 说明 |
| --- | --- | --- | --- |
| `packages/skill-memo-ilife/test/cli-help-230.test.mjs` | 新增 | **251** | 五例，5 个顶层 `test()`，**只经真 spawn**，一次都不直接调模块 |
| `packages/skill-memo-ilife/package.json` | 改 **1 行** | 35 | `scripts.test` 追加 `test/*.test.mjs`（只加这一行，另一半归票 8，未动） |
| `docs/skills/skill-memo-ilife/t230-report.md` | 新增 | 本件 | 本报告 |
| `docs/skills/skill-memo-ilife/t230-body.md` | 改 | — | 票面进度 |

变异自证**临时**碰过、并已逐字还原的两件（净改动为零，见 §3.3）：`src/help/manifest.ts`、`src/help/memoOutput.ts`。
构建产物 `packages/skill-memo-ilife/dist/**`、`tsconfig.tsbuildinfo` 随重建更新（均在 `.gitignore` 外／内按仓规，不入交付）。

> **只构建本包**：全程用 `node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json --force`；
> **没有**跑仓根 `tsc -b`／`pnpm -r build`（#241 的 loader 工厂雷），**没有**动 `127.0.0.1:43120` 的 GUI，**没有**动暂存区。

---

## 2. 五例逐条（命令 ＋ 原始输出）

构件：`node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json --force`（exit 0）
临时库：`%TEMP%\memo230-<tag>-*`（`os.tmpdir()`）

### 例① 名字通式与落点

```
> node --test --test-name-pattern ① packages/skill-memo-ilife/test/cli-help-230.test.mjs

✔ #230 ① 名字通式与落点：备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html 落扁平 memo_html/，回执绝对路径 (241.291ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 322.1797
```

锁住的事实（断言原文）：文件名合 `/^备忘录_HELP_\d{8}_\d{6}(_\d+)?\.html$/`；`dirname(path) === <SKILLS_DB_PATH>/memo_html`；
路径里**不出现** `memo_html\help`（裁决 1 扁平）；回执为绝对路径且文件真在、`delivery.bytes` ＝ 实盘字节数；
顶层键序 `['version','skill','shape','key','data','delivery']`（`delivery` 只追加）；载荷＝域级索引 8 域／13 二级组／30 场景／版本 1.3.0；
**跑完不建库**：`readdirSync(dir)` 只有 `['memo_html']`，`<db>/memo` 不存在、`<db>/memo.db` 不存在。

### 例② help 模板前后缀逐字

```
> node --test --test-name-pattern ② packages/skill-memo-ilife/test/cli-help-230.test.mjs

✔ #230 ② help 模板前后缀逐字：产物＝共享壳前缀（只填标题槽）＋载荷＋后缀 (240.4166ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 314.3343
```

锁住的事实：`<title>` 逐字 `备忘录 · 使用手册`；`html.startsWith(HELP_SHELL_PREFIX.split(HELP_SHELL_TITLE_SLOT).join(title))`；
`html.endsWith(HELP_SHELL_SUFFIX)`；标题槽 `__HELP_TITLE__` 不留占位；壳内 `help-data` 载荷 8 域／30 场景／版本 1.3.0，
且**没有** `aliases`（裁决 5：留资产、剥离渲染载荷），场景卡的 `prompt_template` 非空。
常量从 `base-paint/help-shell` 取——与出口用的是**同一个**共享壳模块（`skill-memo-ilife/node_modules/base-paint` → `packages/base-render` 的 junction）。

### 例③ 并发 6 次独占递补

```
> node --test --test-name-pattern ③ packages/skill-memo-ilife/test/cli-help-230.test.mjs

✔ #230 ③ 并发 6 次独占递补：六份产物两两不同、内容互不覆盖、`_N` 从 `_2` 起 (221.8261ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 297.2923
```

锁住的事实：6 次**异步** spawn（`spawnSync` 会把并发串行化，测不出独占）⇒ 6 个**互不相同**的落点、
`memo_html/` 里**恰好 6 份**产物、每份字节数＝自己回执的 `delivery.bytes`、每份都是完整壳（30 场景）；
文件名里**绝不出现** `_1`（裁决 3 硬条件 2：`_N` 从 `_2` 起）；同秒组内槽位两两不同且必有一次拿本体名（不断言「首个不带 `_N`」——那是把进程调度当契约）。
本例**有意不**断言名字通式（名字归 ①④）⇒ 名字主体被改时本例仍绿，变异签名才指向唯一一处。

### 例④ 三支互不串

```
> node --test --test-name-pattern ④ packages/skill-memo-ilife/test/cli-help-230.test.mjs

✔ #230 ④ 三支互不串：缺省 HELP 文件 ／ mode:"lookup" 速查表 ／ q 只回命中不落盘 (335.3824ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 415.1358
```

锁住的事实：缺省 → `备忘录_HELP_<TS>.html` 且**是整页壳**（`<!DOCTYPE html>` ＋ `help-data` 锚点）、`data.mode='file'`、`total=8`；
`mode:"lookup"` → `备忘录_速查表_<TS>.html`、**不是** HELP 壳、不是整页（`<section>` 分节片段）、`data.mode='lookup'`、`total>=28`、每行给 `memo.*` key；
两件**并排共存**（`readdirSync` 逐字对得上）、两名不同（#139 判法）；缺省与速查的载荷形状不同（索引 ≠ 短语表）。
`q` 支走**独立**库目录：`delivery === undefined`（不落盘）、命中 1 条 `memo.remind`，且 `SKILLS_DB_PATH` **本身都没被建**（零落盘、零建库）。

### 例⑤ 退出码矩阵

```
> node --test --test-name-pattern ⑤ packages/skill-memo-ilife/test/cli-help-230.test.mjs

✔ #230 ⑤ 退出码矩阵：0 ／ 2 参数错 ／ 3 未知 key ／ 5 落盘失败 (779.9371ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 859.0914
```

锁住的事实（每条都断言 `status` ＋ stderr 含 `ERR <code>` ＋ **失败时 stdout 必须空**）：

| 码 | 用例 | 实得 stderr |
| --- | --- | --- |
| **0** | 缺省跑通 | （空） |
| **2** | `q` 与 `mode` 互斥 | `ERR 2: 参数 q 与 mode 互斥：q＝现找，mode＝速查表产物` |
| **2** | `mode:"nope"` | `ERR 2: mode 非法（nope）：本键只认 lookup` |
| **2** | `--params` 非 JSON | `ERR 2: --params 须为 JSON` |
| **2** | `--params` 给数组 | `ERR 2: --params 须为 JSON 对象` |
| **2** | 未知参数 `--bogus` | `ERR 2: 未知参数：--bogus` |
| **2** | `--timeout 0` | `ERR 2: --timeout 须为正数毫秒` |
| **2** | 缺 key（用法） | `ERR 2: 用法：memo-cmd-read <memo.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]` |
| **3** | `memo.nope` | `ERR 3: 未知联动 key：memo.nope` |
| **5** | 默认支落盘失败（`SKILLS_DB_PATH` 落在**文件**之下） | `ERR 5: 落盘失败：ENOTDIR: not a directory, mkdir '…\filler\sub\memo_html'` |
| **5** | 显式支落盘失败（`--html` 的父级是文件） | `ERR 5: 落盘失败：EEXIST: file already exists, mkdir '…\filler'` |
| **1** | 缺 `SKILLS_DB_PATH`（预检，票面矩阵之外的补充锁） | `ERR 1: SKILLS_DB_PATH 未设置（无默认值，必设）` |

> 说明：`1` 是本席在票面四码之外**补的**一条——`cmd_read.ts:3` 的冻结口径里它存在，且它是「既不开库也不落盘」的唯一入口。
> 提交给复审时可整条删掉，不影响五例。

### 全量（包内 `test/`）

```
> node --test "packages/skill-memo-ilife/test/*.test.mjs"

ℹ tests 53
ℹ suites 8
ℹ pass 53
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
（基线 48 ＝ 既有两个票落的 7 个文件：`cli` 5＋`fetch` 4＋`policy` 6＋`render` 4＋`skill` 3＋`help-file-228` 15＋`cli-help-229` 11；本票 ＋5 ⇒ 53。）

---

## 3. 变异自证（红 → 绿）

### 3.1 变异 A：改「文件名主体」⇒ ①④红

改动（`src/help/manifest.ts:18`）：`'备忘录_HELP'` → `'备忘录_HELPX'`。

重建（**先删增量缓存**，防票 12 那种 `tsbuildinfo` 跳编造成假绿／假红）：

```
> Remove-Item packages\skill-memo-ilife\tsconfig.tsbuildinfo -Force
> node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json --force
tsc exit=0
> Select-String -Path packages\skill-memo-ilife\dist\help\manifest.js -Pattern "HELPX"
export const HELP_FILE_STEM = '备忘录_HELPX';        ← dist 确实换血（mtime 2026/9/12 13:49:32）
```

原始输出（`node --test packages/skill-memo-ilife/test/cli-help-230.test.mjs`，exit 1）：

```
✖ #230 ① 名字通式与落点：备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html 落扁平 memo_html/，回执绝对路径 (75.8639ms)
✔ #230 ② help 模板前后缀逐字：产物＝共享壳前缀（只填标题槽）＋载荷＋后缀 (126.3091ms)
✔ #230 ③ 并发 6 次独占递补：六份产物两两不同、内容互不覆盖、`_N` 从 `_2` 起 (245.929ms)
✖ #230 ④ 三支互不串：缺省 HELP 文件 ／ mode:"lookup" 速查表 ／ q 只回命中不落盘 (133.4516ms)
✔ #230 ⑤ 退出码矩阵：0 ／ 2 参数错 ／ 3 未知 key ／ 5 落盘失败 (767.6843ms)
ℹ tests 5
ℹ pass 3
ℹ fail 2

✖ failing tests:
✖ #230 ① … (75.8639ms)
  AssertionError [ERR_ASSERTION]: 文件名通式：备忘录_HELPX_20260912_134932.html
✖ #230 ④ … (133.4516ms)
  AssertionError [ERR_ASSERTION]: 缺省名：备忘录_HELPX_20260912_134933.html
```

⇒ 签名与票面预测**逐条吻合**：①④红，②③⑤不受影响。

### 3.2 变异 B：`wx` → `w` ⇒ ③红

改动（`src/help/memoOutput.ts:91`）：`writeFileSync(candidate, html, { flag: 'wx', … })` → `{ flag: 'w', … }`。

重建（同样删 `tsbuildinfo` ＋ `--force`，exit 0）：

```
> Select-String -Path packages\skill-memo-ilife\dist\help\memoOutput.js -Pattern "writeFileSync\(candidate"
writeFileSync(candidate, html, { flag: 'w', encoding: 'utf8' });
```

原始输出（exit 1）：

```
✔ #230 ① 名字通式与落点：… (232.7608ms)
✔ #230 ② help 模板前后缀逐字：… (243.8766ms)
✖ #230 ③ 并发 6 次独占递补：六份产物两两不同、内容互不覆盖、`_N` 从 `_2` 起 (244.844ms)
✔ #230 ④ 三支互不串：… (204.9453ms)
✔ #230 ⑤ 退出码矩阵：… (807.8472ms)
ℹ tests 5
ℹ pass 4
ℹ fail 1

✖ failing tests:
✖ #230 ③ … (244.844ms)
  AssertionError [ERR_ASSERTION]: 六次调用六个不同落点：
  ["备忘录_HELP_20260912_134950.html","备忘录_HELP_20260912_134950.html","备忘录_HELP_20260912_134950.html",
   "备忘录_HELP_20260912_134950.html","备忘录_HELP_20260912_134950.html","备忘录_HELP_20260912_134950.html"]
  1 !== 6
```

⇒ 去掉 `wx` 独占后，6 次并发**全落到同一个落点**（1 个不同路径 ≠ 6）——正是 `#128` 那个覆盖事故的形状。

### 3.3 还原与重建的证据

| 步 | 动作 | 证据 |
| --- | --- | --- |
| 变异前 | 记 sha256 | `manifest.ts` ＝ `B5550525605D3BE95DC8B2ACBF008489D759075E3F525C84E15A30722F72761F`；`memoOutput.ts` ＝ `F1372B498D57FDBE881BC7832CC808D7BB7F7AECB5DFD056DA863F49E9648229` |
| 还原 A | `edit` 逐字改回 `'备忘录_HELP'` | `Select-String … -Pattern "HELPX" -Quiet` ⇒ **False**（dist 里已无变异标记） |
| 重建 A | 删 `tsconfig.tsbuildinfo` ＋ `--force` | `tsc exit=0`；`node --test cli-help-230` ⇒ **5 pass / 0 fail**（exit 0） |
| 还原 B | `edit` 逐字改回 `{ flag: 'wx' }` | `writeFileSync(candidate, html, { flag: 'wx', encoding: 'utf8' });` |
| 重建 B | 删 `tsconfig.tsbuildinfo` ＋ `--force` | `tsc exit=0`；`dist\help\memoOutput.js` mtime `13:49:57`；`node --test cli-help-230` ⇒ **5 pass / 0 fail**（exit 0） |
| 终态比对 | 复算 sha256 | 两件与变异前**逐位相同**（`B5550525…761F`／`F1372B49…8229`）⇒ 净改动为零 |
| 终态全量 | 全包 `test/` | **53 pass / 0 fail** |

> 假红／假绿的坑按票面要求躲法：**每次**改源码后都 `Remove-Item tsconfig.tsbuildinfo` ＋ `tsc --build … --force`，
> 并用 `Select-String` 在 **`dist`** 里确认变异标记进／出（读的是真正被 spawn 的那份 JS，不是源码）。

---

## 4. 同批修的包内 `test` 脚本

`packages/skill-memo-ilife/package.json`（工作树 diff，**只这一行**；该文件另一半是票 8 的依赖改动，已被暂存，本席未动）：

```diff
   "scripts": {
     "build": "tsc -b && node scripts/build-help.mjs",
-    "test": "node --test ../../test/scaffold.test.mjs"
+    "test": "node --test ../../test/scaffold.test.mjs test/*.test.mjs"
   }
```

实测 `npm test`（在包目录内，exit 1）：

```
✖ scaffold (145.1666ms)
✔ #230 ① … / ✔ #230 ② … / ✔ #230 ③ … / ✔ #230 ④ … / ✔ #230 ⑤ …
ℹ tests 55
ℹ pass 54
ℹ fail 1

✖ failing tests:
✖ 快照 == 实际拉取版 (59.1941ms)
  Error: Command failed: D:\2Study\nodejs\node.exe tooling/write-snapshot.mjs --check
  FAIL: 快照过期（文件 0.1.0@932e7b250d278d50 ≠ 实际 0.1.0@3505369be1e98cb6），请跑 pnpm snapshot 重写
```

**这条红不是本票的账**（裁决 18 已记在案）：失败点是 `tooling/write-snapshot.mjs --check`，其 sha 输入只有
`packages/ilife-skills/package.json` ＋ `packages/base-combos/combos.yaml` ＋ `packages/base-combos/src/present.ts` 三件
（`tooling/write-snapshot.mjs:13-18`），**不含 `packages/skill-memo-ilife/**` 的任何一件** ⇒ 与本次改动**无因果关系**。
本票的完成判据因此写作：**五例在真 spawn 下全绿 ＋ 变异自证留证**（不写「包内 `npm test` 绿」）。

**另核一处（免得复审以为还要另挂线）**：仓根 `package.json` 的 `test` 脚本本来就带
`"packages/skill-memo-ilife/test/*.test.mjs"` ⇒ 新用例**无需再动仓根**即被仓级测试门收进去；
本席已按**同一个 pattern** 跑过本包那一段（§2 全量 53/53 绿）。仓根全门（含别的会话的包）本席**没跑**，
也不该由本票跑（那些包的红／绿不是本图的账）。
附带事实：该 `--check` 的「实际」值已从裁决 18 记的 `ef9b16473d03cf19` 漂到 `3505369be1e98cb6`（别的会话在改 combos 侧），红的状态**依旧是既有的**。

---

## 5. 第五步 · 交付对账

| 第一步清单（动工前） | 实际 | 偏差 |
| --- | --- | --- |
| `packages/skill-memo-ilife/test/cli-help-230.test.mjs`（新增，五例） | 新增，251 LF，5 个 `test()` | 无 |
| `packages/skill-memo-ilife/package.json`（只加 `test/*.test.mjs` 一行） | 工作树 diff 恰 1 行，另一半未动 | 无 |
| `docs/skills/skill-memo-ilife/t230-report.md`（新增） | 新增，本件 | 无 |
| `docs/skills/skill-memo-ilife/t230-body.md`（进度更新） | 已改并 `gh issue edit` 推回 GitHub | 无 |
| 变异自证：`src/help/manifest.ts`／`src/help/memoOutput.ts`（临时改，必还原） | 各改 1 处、已逐字还原，sha256 与变异前逐位相同 | 无（净改动为零） |
| 构建产物 `packages/skill-memo-ilife/dist/**`、`tsconfig.tsbuildinfo` | 随 `--force` 重建更新（构建产物，不入交付） | 无 |
| **未碰**：`packages/base-render/**`、`packages/skill-chef/**`、`packages/skill-calorie/**`、`packages/skill-schedule/**`、`packages/plugin-chef/**`、`pnpm-lock.yaml`、仓根 `tsc -b`、暂存区、GUI `127.0.0.1:43120` | 全程未碰（`base-render` 只经 junction `base-paint` **读**其 `dist`） | 无 |
| 临时脚本 | 只落 `%TEMP%\memo230-probe.mjs`；仓根无 `.scratch-*`（实测 `Get-ChildItem -Filter .scratch-*` 为空） | 无 |

**本包行数告警线**：`test/*.mjs` 与 `templates/`、`SKILL.md` 按 `packages/skill-memo-ilife/AGENTS.md` 划在 350 线之外 ⇒ 本票**不触发**第四步。

---

## 6. 观察与拿不准处（留给复审与本图记账）

1. **`mkdirSync` 的 `EEXIST` 被当成「候选文件已存在」**（本席探针实测，**不改**，只记账）：
   把 `<db>/memo_html` 预先占成一个**文件**再跑缺省支，`writeFileExclusiveWithRetry` 会把 `mkdirSync` 抛的 `EEXIST`
   误判为命中已有产物，于是 `_N` 空转 **1000 次**（实测 112 ms）后以「落点独占创建重试超限」收场。
   **退出码仍是 5（矩阵成立）**，只是错误文案与重试语义退化。根因在照抄来的通式那一小块里，
   与 `#237`／`#240` 属同一条账 ⇒ 建议挂到迁移票的观察项，不在本票改（改了会偏离「照抄通式」的裁决 3 硬条件 1）。
2. **②例只锁壳，不锁「页面上没有命令名」**：那条归 `#228`／`#231` 的说明面与载荷锁（`helpFile.ts` 的 `aliases`／命令清洗），
   本票只在 ② 里补了「`aliases` 不进载荷」这一条（防它被悄悄加回去）。
3. **③例在不同机器上可能跨秒**：跨秒时各次自带独立 stamp、递补不触发，本例会自动退化为「6 份互不相同」这一半；
   要让递补路径**每次**都被压到，需要把 6 次 spawn 压进同一秒——那要靠调度运气，故照 #148 的口径不做硬断言（变异 B 的实测已证明它抓得住覆盖）。
4. **票面矩阵四码之外补了 `exit 1`**（缺 `SKILLS_DB_PATH`）。理由见 §2⑤ 说明；若复审认为越界，删该 4 行即可。

---

## 7. 真库账（谁往 `D:\2Study\StudyNotes\.db` 写了什么）

本票**零写入**真库，三条依据：

1. **源码可查**：`test/cli-help-230.test.mjs:41` `envOf = (dir) => ({ ...process.env, SKILLS_DB_PATH: dir })`，
   每个 `dir` 都出自 `mkdtempSync(join(tmpdir(), 'memo230-…'))`；探针脚本同法。全文件无一处裸跑出口。
2. **实测反证**：本席把整包 `test/*.test.mjs`（含本票 5 例与既有 `cli.test.mjs`——它自己也是 `mkdtempSync` 临时库）
   重跑一遍，前后比对真库 `memo_html`：**新增 0 件**、目录 mtime 不变（214 件 → 214 件）。
3. **时间窗对不上**：本席的 spawn 窗口是 `13:48:0x`（探针）与 `13:48:3x`／`13:49:5x`／`13:50:0x`（用例），
   真库在那些秒上**没有任何新件**。

真库 `memo_html` 今日 13:30 后新增 7 件，逐件归因：

| 时间 | 件 | 大小 | 归属 |
| --- | --- | --- | --- |
| 13:37:08／13:39:47／13:39:59／13:40:16 | `备忘录_HELP_20260912_13*.html` | 130885 | **早于本席首次构建（13:47:34）** ⇒ #229 的出口验证窗口 |
| 13:39:55 | `备忘录_速查表_20260912_133955.html` | 6476 | 同上（速查支） |
| 13:44:56 | `备忘录_HELP_20260912_134456.html` | 130825 | **编排会话的独立回归**（其消息自述「改动前验证过的那份」） |
| 13:50:29 | `备忘录_HELP_20260912_135029.html` | 130825 | **编排会话的独立回归**（其消息自述「你改过生产件之后，我重新构建 ＋ 真跑端到端，`delivery.bytes=130825`」） |

后两件的 sha256 **完全相同** ＝ `7CBE622A31849573…`，与编排会话自述的 `SHA-256 7CBE622A…` 逐字对上
⇒ 那是「本席的变异已逐字还原、行为没变」的**第三方旁证**，记在编排会话账上，不是本票用例所写。
