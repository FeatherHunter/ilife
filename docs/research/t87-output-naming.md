# #87 输出命名规范复刻（M10）· 实施证据

票面：GitHub issue #87《输出命名规范复刻（M10）》（wayfinder 地图 #63 子票）。
任务：复刻旧版输出目录与命名规范 `calorie_html/<中文command>_<YYYYMMDD>_<HHMMSS>[_N].html`，
跟随 `SKILLS_DB_PATH`，同秒冲突自动加后缀；验收＝「新架构产物路径与命名逐条对齐（含冲突后缀与 `--output` 覆盖）」。

- 实施人：t87（并发票 #75／#87／#95／#98／#101 之一，路径独占见 `.scratch/t75/concurrency-protocol.md`）
- 独占可写路径：`packages/skill-calorie/src/cli/cmd_read.ts`、**新建** `packages/skill-calorie/src/output.ts`、
  `packages/skill-calorie/test/output-naming-87.test.mjs`、`.changeset/calorie-output-naming-87.md`、`docs/research/t87-*`
- 旧版真值（**只读**）：`D:\2Study\StudyNotes\SKILLS\卡路里\scripts\html_paths.py`、`...\SKILL.md:88-104`、`...\references\html_templates.md:33-58`

## 1. 旧版真值 → 新实现 → 证据（逐条）

| # | 旧版真值（行号） | 新实现（落点 file:line） | 证据（测试 file:line） |
| --- | --- | --- | --- |
| 1 | 目录 `HTML_DIR = DATA_DIR / "calorie_html"`，`DATA_DIR = find_db_path().parent`（跟随 `SKILLS_DB_PATH`，`html_paths.py:39,42-56`） | `HTML_DIR_NAME='calorie_html'`；`htmlDir(dbDir=resolveDbDir())` = `<SKILLS_DB_PATH>/calorie_html`，`mkdirSync(recursive)`（`src/output.ts:27,82-87`） | `test/output-naming-87.test.mjs:149`（⑤） |
| 2 | 文件名 `<command>_<YYYYMMDD>_<HHMMSS>.html`（`html_paths.py:78-109`） | `htmlFileName()` = `<中文command>_<stamp>.html`；`formatStamp()` = 本地时区零填充（`src/output.ts:38-50,73-80`） | `:75`（②）、`:149`（⑤）、`:172`（⑥） |
| 3 | 同秒冲突 `_N`，`N = len(glob("<command>_<stamp>*.html")) + 1`（首个冲突 `_2`；`html_paths.py:105-109`） | `countSameSecond()` 用 `readdirSync` + `startsWith`/`endsWith` 计数，`n===0 ? base : _${n+1}`（`src/output.ts:61-71,73-80`） | `:130`（④，`_2`/`_3`/无关文件不干扰）、`:206`（⑦，真 CLI） |
| 4 | `--output <path>` 显式覆盖，绕过命名规则（旧 `SKILL.md:104`；`render_calorie_trend.py:161` 等 4 处 argparse） | `--output <path>` 优先；`--html <path>` 保留为 legacy 别名；两者都给定则 `--output` 胜（`src/cli/cmd_read.ts:84-108,688-695`） | `:224`（⑧） |
| 5 | `<中文command>` 中文化：静态 command 直接传中文、动态 command 拼接中文（`html_paths.py:11-15`；`SKILL.md:94-102`） | 真值 = `CALORIE_COMBOS[key].title`（`src/output.ts:52-59`） | `:86`（③ 77 键逐键相等）、`:101`（③b `combos.yaml` 镜像逐键相等）、`:188`（⑥b） |
| 6 | 字段清洗 `\\ / : * ? " < > | [ ]` → `_`、trim、截断 32 字符（`html_paths.py:59-75`） | `sanitizeFilenamePart()` 逐字复刻（`src/output.ts:30-36`） | `:63`（①） |
| 7 | 默认落盘（每个 `render_*.py` 都写 `calorie_html/`） | 无 `--output`/`--html` 时默认写 `calorie_html/`；落点经 envelope `data.output` 回传（`src/cli/cmd_read.ts:688-695`） | `:172`（⑥）、`:188`（⑥b） |

### 1.1 `<中文command>` 真值来源（票内「需自行侦察判定」项）

结论：**`CALORIE_COMBOS[key].title`**，不是 triggers 的 `wake_word`。

- 旧版 `<command>` 是「CLI 子命令名」（`html_paths.py:89` 注释：`command: CLI 子命令名(中文化后,例 "主页仪表盘")`），
  一个键一个命令名。新架构里与「子命令」一一对应的唯一中文名就是注册表 `title`
  （`src/cli/keys.ts:64-108`，77 键各一 `title`）。
- `title` 同时是**唯一真相源** `packages/base-combos/combos.yaml` 的字段（`tooling/check-combos.mjs:24,65` 冻结
  `['key','skill','shape','title','cmd']`），两处逐键同值 —— 证据：③b 实测 77/77 相等。
- 排除 `wake_word`：① 是用户话术，含空格与括号（实测 `TRIGGERS` 里存在「看体重 vs 摄入(最近 7 天)」这类词），
  做文件名主干必须清洗，破坏「逐字对齐」；② 与 CLI 键非一一对应（一场景多唤醒词、help 键无独立唤醒词）
  —— 证据：③c。`combos.yaml` 的 `cmd` 字段也不可用（`CMD_RE = /^[a-z][a-z0-9-]*$/` 只许小写 ASCII，
  `tooling/check-combos.mjs:17,66`）。

### 1.2 命名模块落点（票内「二选一」项）

选 **新建 `src/output.ts`**，不动 `src/paths.ts`。理由：

1. `paths.ts` 的职责是「DB 路径解析 ＋ 测试隔离守卫」（`src/paths.ts:1-41`），与「产物命名」是两个变化原因；
   `output.ts` 复用其 `resolveDbDir()`，保持「跟随 `SKILLS_DB_PATH`」单点。
2. 独占写路径最小化：不碰 `paths.ts`，给其它票（#93 只读打开等）留出该文件的改动空间。
3. `package.json` 的 `exports` **未新增** `./output` 条目 —— 该文件归 #95 独占，本票禁写；
   `files: ["dist", ...]` 已随包发（`packages/skill-calorie/package.json:16-20`），测试按相对路径
   `../dist/output.js` 导入，不影响发布面。

## 2. 门禁实测

全部持 `D:\ilife\.scratch\locks\gate.lock` 执行（协议 §2）；日志落在 `.scratch/t87/after-*.log`（gitignore，命令与结论逐条抄录于下）。

| 门禁 | 命令 | 变更前（编排者基线） | 变更后（本票实测） | 结论 |
| --- | --- | --- | --- | --- |
| 构建 | `pnpm build` | exit 0 | **exit 0** | 持平 |
| 边界 | `pnpm boundaries` | exit 0（7 条 OK） | **exit 0**（`boundaries: PASS`） | 持平 |
| 快照 | `pnpm snapshot:check` | exit 0（`0.1.0@2fc0b42170d9604a`） | **exit 0**（同值） | 持平 |
| 发布 | `pnpm publish:pre` | exit 0 | **exit 0**（`check-publish --pre：PASS`） | 持平 |
| 测试 | `pnpm test` | exit 1，21 条既有失败 | **exit 1**，本票新增失败 **0** | 见下 |

### 2.1 `pnpm test` 失败集（逐名比对）

- 冻结基线 21 条：`.scratch/t75/baseline-failing.txt`。
- 本票变更后失败集 14 条（`.scratch/t87/after-failing-names.txt`，TAP 逐名）：
  - 12 条 plugin client 产物（`dsh-bill/chef/home/schedule-ilife` 各 3 条）→ **在冻结基线内**（归 #57–#60／#64）。
  - `口径 · 删除回执可恢复性：文案与库内语义一致（软删行留／硬删行无）` → 落在**未跟踪新文件**
    `packages/skill-calorie/test/cmd-write-40-persist.test.mjs`（#101 在飞），**不在本票路径**；
    该条在我 commit 前的 TAP 运行里**已红**（`.scratch/t87/base-failing-names.txt`），故非本票引入。
  - `calorie SKILL 与模板（M6 范式）` → 失败子用例 `模板 6 件经 loader 装载（#95：dist/render 上溯两级取包根 templates/）`，
    落在 `packages/skill-calorie/test/skill-t11.test.mjs`（**他人已改** M 状态）＋ #95 的 `src/render/index.ts`／`templates`，
    **不在本票路径**。
- 相对冻结基线**消失**的 9 条（#48 1 条／#50 6 条／#93 2 条）为并发伙伴在窗口内修好，**非本票所为**。
- **本票自有 11 条用例全绿**（`node --test packages/skill-calorie/test/output-naming-87.test.mjs` → `# pass 11 / # fail 0`）。
- 本票引入过的 2 条红（④ 断言写反、⑥b 种子不足）在 commit 前已修正，见 §6 偏离记账。

## 3. 变异自证

见 `docs/research/t87-mutation-evidence.md`（复跑：`node docs/research/t87-mutation-evidence.mjs`，脚本自持锁）。
**结论：5/5 变异全部「红 → 逐字节还原 → 复绿」闭环**（M1 同秒计数／M2 目录名／M3 中文 command 真值／M4 时间戳零填充／M5 CLI 默认落点）。

## 4. 偏离记账

1. **`--html` 保留为 `--output` 别名**：旧版只有 `--output`；本仓既有测试与 `SKILL.md:150` 用 `--html`，
   改名为 `--output` 会破 4 个既有测试文件，故并存（`--output` 优先）。
2. **同秒冲突用 `readdirSync` 而非 `glob`**：语义等价（命令名已 sanitize，无 `[`/`]` 元字符），
   少一个依赖；目录不存在时视为 0（旧 `glob` 同义）。
3. **显式 `--output` 自动建父目录**：旧版直接 `open()` 会 ENOENT；本票建父目录（超集，不改变命名）。
4. **未复刻「场景类型段」**：旧版 v1.0 起写库/场景 HTML 走 `html_scene_path` →
   `<场景名>_<类型中文>_<TS>.html`（`html_paths.py:130-161`，类型 `process→过程/result→结果/receipt→回执`）。
   issue #87 票面与验收只写基础规则 `<中文command>_<YYYYMMDD>_<HHMMSS>[_N].html`，故本票按票面实现；
   若编排者裁定要补，改动量＝`src/output.ts` 一处 + 一条测试（补丁见 §5）。
5. **`data.output` 为新增 envelope 字段**：六形状守卫只校验既有键（`src/cli/cmd_read.ts:146-187`；
   `base-link-core/src/envelope.ts:55-88`），`assertStatMetrics` 只遍历 `data.metrics`
   （`src/render/envelope.ts:93-99`），故 additive 合法；未改 `version`（仍 `0.1.0`）。

## 5. 需改 `SKILL.md` 的补丁文本（**本票不改**，归 #98 独占）

`packages/skill-calorie/SKILL.md` 两处仍写「`--html` 显式落盘」，与本次默认落盘行为不一致：

**位置 1：第 26 行**（现行）
```
- stdout 纯净：成功只打 envelope JSON 一行；进度与错误一律 stderr；`--html` 显式落盘 utf8。
```
**改为**
```
- stdout 纯净：成功只打 envelope JSON 一行；进度与错误一律 stderr；HTML 默认落
  `<SKILLS_DB_PATH>/calorie_html/<中文command>_<YYYYMMDD>_<HHMMSS>[_N].html`（同秒冲突自动加 `_2`/`_3`），
  落点回传在 envelope `data.output`；`--output <路径>` 显式覆盖任意路径（`--html <路径>` 为 legacy 别名）。
```

**位置 2：第 150 行**（现行）
```
- 成功 stdout 只有一行 envelope JSON，进度与错误走 stderr；`--html <路径>` 显式落盘 utf8。
```
**改为**
```
- 成功 stdout 只有一行 envelope JSON，进度与错误走 stderr；HTML 默认落 `calorie_html/<中文command>_<TS>[_N].html`
  （`<中文command>` = 该键注册表 `title`，落点见 `data.output`）；`--output <路径>` 显式覆盖。
```

## 6. 未做 / 未确证

1. **`SKILL.md` 未改**（#98 独占）——补丁文本见 §5；在 #98 落地前，`SKILL.md:26/150` 仍写「`--html` 显式落盘」，
   与实现不一致（文档面缺口，已交编排者排期）。
2. **场景类型段未复刻**（旧 `html_scene_path`：`<场景名>_<类型中文>_<TS>.html`，`html_paths.py:130-161`）。
   票面只写基础规则，故本票按票面实现。若裁定要补，**确切补丁**（`packages/skill-calorie/src/output.ts`）：
   ```ts
   // 在 HTML_EXT 之后新增
   export const OUTPUT_TYPE_LABELS: Record<string, string> = { process: '过程', result: '结果', receipt: '回执' };
   /** 场景段（旧 html_scene_path）：shape → 类型中文；无映射则不加段。 */
   export function sceneCommandFor(key: string, shape: string): string {
     const label = OUTPUT_TYPE_LABELS[shape];
     const base = chineseCommandFor(key);
     return label ? base + '_' + label : base;
   }
   ```
   并把 `resolveDefaultHtmlPath` 的 `chineseCommandFor(key)` 换成 `sceneCommandFor(key, shape)`（签名加 `shape`），
   同步 `cmd_read.ts:689` 传 `shape`，并加一条 `calorie.diet.add` → `记一餐_回执_<TS>.html` 的断言。
   **本票不改**：等编排者裁定，避免与 #101（写键回执）面冲突。
3. **未在安装态（tarball / fresh-tmp）实测默认落盘**：`pnpm publish:pre` 只做 workspace: 零外泄检查
   （`tooling/check-publish.mjs:51-67`），`--tarball`／`--fresh-tmp` 非本票门禁；`dist/output.js` 随
   `files: ["dist"]` 发（`package.json:16-20`）但未实机验证。
4. **`data.output` 无下游消费方接线**：本票只保证回传；DSH 面板/技能话术如何取用属 #98 文档面与 #95 发布面。
5. **`--output` 指向不可写路径的 exit 5 文案未新增用例**：沿用既有 `fail(5, 'HTML 写盘失败：…')` 分支
   （`cmd_read.ts:690-694`），与变更前同一分支。
6. **本票自查发现并修正的 2 处测试缺陷**（记账）：① ④ 用例把「不同命令各自计数」的期望写反（应为 `_2`）；
   ② ⑥b 原用固定日期 `2026-09-07` 且未铺 `food_log` → `calorie.view.home` 缺失阻断 exit 4；改为
   「相对今天」种子。两处均在 commit `9afe0d1` 之前修正，未进入提交。

## 7. 风险（top3）

1. **调用方契约变更（默认落盘）**：以前不传 `--html` 不落盘，现在会写 `calorie_html/`。若调用方仍按旧文档
   自己传 `--html`，行为等价（显式优先）；但若调用方把 `calorie_html/` 当只读目录、或依赖「无副作用」，
   会被这次变更影响。缓解：`--output`/`--html` 显式覆盖仍可用；`data.output` 回传落点；
   `SKILL.md` 补丁待 #98 落地。
2. **`data.output` 是 envelope `data` 的新增字段**：六形状守卫为白名单式校验（只查既有键），additive 合法，
   但若下游对 `data` 做严格/封闭校验（或对 `stat.metrics` 之外的键做类型断言），会破。
   备选方案：改走 stderr 单行（`HTML <path>`）——但会引入新的 stderr 协议。**请编排者裁定**。
3. **同秒冲突计数非原子**：`readdirSync` 计数后写盘，两个进程同秒并发仍可能取到同一 `_N` 而互相覆盖。
   旧版 `glob` 计数同样非原子（`html_paths.py:105-109`），本票未引入新缺陷，但也未消除；高并发批量渲染场景需上层串行化。

