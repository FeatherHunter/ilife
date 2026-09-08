# #87 输出命名规范复刻（M10）· 实施证据（第二轮返修后）

票面：GitHub issue #87《输出命名规范复刻（M10）》（wayfinder 地图 #63 子票）。
任务：复刻旧版输出目录与命名规范 `calorie_html/<中文command>_<YYYYMMDD>_<HHMMSS>[_N].html`，
跟随 `SKILLS_DB_PATH`，同秒冲突自动加后缀；验收＝「新架构产物路径与命名逐条对齐（含冲突后缀与 `--output` 覆盖）」。

- 实施人：t87（并发票 #75／#87／#95／#98／#101 之一，路径独占见 `.scratch/t75/concurrency-protocol.md`）
- 审查结论：A1 **PASS 85**／A2 **FAIL 67** → 编排者裁定**返修**（本文件为返修后版本）
- 独占可写路径：`packages/skill-calorie/src/output.ts`、`packages/skill-calorie/src/cli/cmd_read.ts`、
  `packages/skill-calorie/test/output-naming-87.test.mjs`、`.changeset/calorie-output-naming-87.md`、`docs/research/t87-*`
- 旧版真值（**只读**）：`D:\2Study\StudyNotes\SKILLS\卡路里\scripts\html_paths.py`、`...\_cmd_maps.py`、
  `...\render_food_ranking.py`、`...\render_weight_receipt.py`、`...\SKILL.md`
- **本文件不使用 `file:line` 作代码锚**（并发下数字必漂，返修 F6）：一律锚**符号名**（函数／常量／`case`／用例名）。

## 0. 返修台账（F1–F8）

| 缺陷 | 症状（审查证据） | 修法（符号锚） | 自证 |
| --- | --- | --- | --- |
| **F1** 截断按 UTF-16 码元 | `'a'+'😀'×20` 末位留孤立代理项，落盘被 FS 换 U+FFFD，而 `data.output` 回传含 `\ud83d` 的串 → 回传路径 ≠ 实际落盘；旧 `html_paths.py::_sanitize_filename_part` 用 `s[:32]`（按码点） | `sanitizeFilenamePart()`：`s.slice(0,32)` → `[...s].slice(0,32).join('')` | 用例 `#87 ①b`；变异 M6；§1.3 实测（旧：17 码点＋孤立代理项、盘上名 U+FFFD；新：21 码点、逐字符相等） |
| **F2** 同秒计数大小写敏感 | 目录已有 `…_123000.HTML` 时仍选 `…_123000.html` → **Windows 覆盖原文件**；旧 `glob.glob()` 在 Windows 走 `fnmatch.filter`→`os.path.normcase`（不敏感） | `countSameSecond()`：前缀与扩展名两侧 `toLowerCase()` 后比较 | 用例 `#87 ④b`（含 CLI 端到端）；变异 M7；§1.3 实测（旧计数 0→选 `.html` 覆盖；新计数 1→选 `_2`，原文件内容不变） |
| **F3** 动态段／suffix 段未复刻 | ranking 5 榜＋全榜全落 `食品排行_<TS>[_2.._N]`（旧 `食物排行_<高热量/低热量/常吃/…>`）；写键落 `记体重_<TS>.html`（旧 `记体重_回执_68kg_<TS>.html`）；影响 **35/77** 键；而证据文档原 §1 误记「动态 command 拼接中文已满足」 | **本票只做如实记账**（§5.1 给出可执行补丁，**未实现**，等编排者裁定／另开票） | `docs/research/t87-fix-evidence.mjs` 实测表（F3 段）＋本节 §5.1 |
| **F4** 读键新增硬依赖＋失败码错位 | `<DB>/calorie_html` 被同名文件占位 → `mkdirSync` 抛 `EEXIST` → `ERR 4: 未知失败：…`（4＝取数/超时） | `cmd_read.ts` 落点解析段包 `try/catch` → `fail(5, '渲染失败：HTML 落点解析失败（…）')`（与紧邻「HTML 写盘失败」同码同形态） | 用例 `#87 ⑨`；变异 M8（破坏后实测原样复现 `ERR 4: 未知失败：EEXIST…`） |
| **F5** changeset 迁移指引错误 | 原写「需要旧行为（不落盘）时传 `--output`…即可」，实测 `--output` 仍写盘、全链无「不落盘」开关 | `.changeset/calorie-output-naming-87.md` 改为如实陈述：「`--output`／`--html` 只是改写落点，**仍然写盘**；无「不落盘」模式」 | changeset「行为变更」段 |
| **F6** 证据文档 `file:line` 漂移 | `t87-output-naming.md` 的 `:119/:120/:110` 等行号已失效 | 全文改**符号锚**（本文件） | 本文件所有引用均为符号／用例名 |
| **F7** 变异脚本污染工作区 | M5 在**仓库根**遗留未跟踪 `calorie_html_flat.html`；脚本每次覆写**被跟踪**的 `t87-mutation-evidence.md` | 变异固定落点改到**独占临时根**（`t87-mutation-<随机>`）；输出写 `.scratch/t87/`（**不覆写被跟踪 md**）；收尾按**路径守卫**删除 ＋ 自证仓库根无残留 | 变异脚本「工作区残留自证：无」；§3 |
| **F8** `SKILL.md` 与默认落盘矛盾 | 审查时 HEAD `SKILL.md` 第 26／165 行仍写「`--html` 显式落盘」 | **本票不改**（#98 独占）；逐字补丁见 §5。**现状：已由 #98 在 `d6e88b5` 落地修正**（HEAD 第 26／178 行已是「HTML 默认落 …」，补丁为 no-op） | §5（附审查时原文 ＋ 现 HEAD 原文） |

## 1. 旧版真值 → 新实现 → 证据（逐条 · 符号锚）

| # | 旧版真值 | 新实现（符号锚） | 证据（用例名） |
| --- | --- | --- | --- |
| 1 | `html_dir()` = `find_db_path().parent / "calorie_html"`（跟随 `SKILLS_DB_PATH`） | `HTML_DIR_NAME`；`htmlDir(dbDir = resolveDbDir())` 递归 `mkdirSync` | `#87 ⑤` |
| 2 | `html_name()` 文件名 `<command>_<YYYYMMDD>_<HHMMSS>.html` | `htmlFileName()`；`formatStamp()`（本地时区零填充） | `#87 ②`／`#87 ⑤`／`#87 ⑥` |
| 3 | 同秒冲突 `N = len(glob("<command>_<stamp>*.html")) + 1`（首个 `_2`） | `countSameSecond()`（`readdirSync` ＋ **大小写不敏感**前后缀比较）；`htmlFileName()` 出 `_N` | `#87 ④`／`#87 ④b`／`#87 ⑦` |
| 4 | `--output <path>` 显式覆盖（4 处 argparse） | `--output` 优先；`--html` 为 legacy 别名；`resolveExplicitHtmlPath()` 建父目录 | `#87 ⑧` |
| 5 | `<中文command>`：静态 command 传中文、动态 command 拼接中文（`_cmd_maps.py`） | `chineseCommandFor()` = `CALORIE_COMBOS[key].title`（**动态段未复刻**，见 §5.1） | `#87 ③`／`#87 ③b`／`#87 ③c` |
| 6 | `_sanitize_filename_part()`：`\\ / : * ? " < > \| [ ]`→`_`、trim、截断 32 **字符** | `sanitizeFilenamePart()`（**按码点**截断，返修 F1） | `#87 ①`／`#87 ①b` |
| 7 | 每个 `render_*.py` 默认写 `calorie_html/` | 无 flag 时默认写 `calorie_html/`，落点经 envelope `data.output` 回传；解析失败 → `fail(5, '渲染失败：…')` | `#87 ⑥`／`#87 ⑥b`／`#87 ⑨` |

### 1.1 `<中文command>` 真值来源（票内「需自行侦察判定」项）

结论：**`CALORIE_COMBOS[key].title`**，不是 triggers 的 `wake_word`。

- 旧版 `<command>` 是「CLI 子命令名（中文化后）」，一个键一个命令名；新架构里与子命令一一对应的唯一中文名就是注册表 `title`。
- `title` 同时是唯一真相源 `packages/base-combos/combos.yaml` 的字段（`tooling/check-combos.mjs` 冻结字段集），两处逐键同值 —— 证据：`#87 ③b` 实测 77/77 相等。
- 排除 `wake_word`：是用户话术（含空格/括号，实测存在「看体重 vs 摄入(最近 7 天)」），且与 CLI 键非一一对应 —— 证据：`#87 ③c`。
  `combos.yaml` 的 `cmd` 字段也不可用（`CMD_RE` 只许小写 ASCII，`tooling/check-combos.mjs`）。

### 1.2 命名模块落点（票内「二选一」项）

选**新建 `src/output.ts`**，不动 `src/paths.ts`：职责分离（DB 路径解析 vs 产物命名）；独占写路径最小化；
`package.json` 的 `exports` **未新增** `./output` 条目（该文件归 #95 独占，本票禁写），测试按相对路径 `../dist/output.js` 导入。

### 1.3 F1／F2／F4 实测（脚本 `docs/research/t87-fix-evidence.mjs`，可复跑）

复跑：`pnpm build` 后 `node docs/research/t87-fix-evidence.mjs`（只读 dist ＋ 系统临时目录跑 CLI；不改源码、不持锁）。

**F1**（`'a' + '😀'.repeat(20)`，21 码点／41 码元）：

| 量 | 旧实现 `s.slice(0,32)` | 现实现 `[...s].slice(0,32).join('')` |
| --- | --- | --- |
| 码点数 | 17 | 21 |
| 含孤立代理项 | true | false |
| 回传名 === 盘上名 | **false**（盘上为 `a😀…😀�.html`，末位被换成 U+FFFD） | **true** |

**F2**：目录内预置 `今日总览_20260726_123000.HTML`（内容 `ORIGINAL`）→ 旧实现计数 0 → 会选 `…_123000.html`（Windows 覆盖）；
现实现计数 1 → 选 `…_123000_2.html`，`ORIGINAL` 内容不变。CLI 端到端（预置 3 个大写扩展名种子）：`data.output` = `唤醒词HELP_<TS>_2.html`，种子内容 `SEED0` 未变。

**F4**：`<SKILLS_DB_PATH>/calorie_html` 被同名文件占位 → 现实现 `exit 5` ＋
`ERR 5: 渲染失败：HTML 落点解析失败（默认目录 <SKILLS_DB_PATH>/calorie_html）：EEXIST: …`，stdout 长度 0，占位文件未被改写。
**破坏后（变异 M8）实测旧行为**：`exit 4` ＋ `ERR 4: 未知失败：EEXIST: file already exists, mkdir …`（见 §3 诊断列）。

## 2. 门禁实测（全部持 `D:\ilife\.scratch\locks\gate.lock`，协议 §2）

日志 `.scratch/t87/gates2.log`（施工草稿，gitignore）；命令经 `.scratch/t87/lockrun.ps1` 持锁执行，`finally` 释放。

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| 构建 | `pnpm build` | **exit 0** |
| 边界 | `node tooling/check-boundaries.mjs` | **exit 0**（`boundaries: PASS`） |
| 快照 | `node tooling/write-snapshot.mjs --check` | **exit 0** |
| 发布 | `pnpm publish:pre` | **exit 0**（`check-publish --pre：PASS`） |
| 本票测试 | `node --test packages/skill-calorie/test/output-naming-87.test.mjs` | **exit 0**（`tests 14 / pass 14 / fail 0`） |
| 全量 | `pnpm test` | 见 §2.1（失败集 delta） |

### 2.1 全量 `pnpm test` 失败集 delta

冻结基线：`.scratch/t75/baseline-failing.txt`（21 条）。本次 TAP 逐名：`.scratch/t87/after-failing-names.txt`；比对脚本 `.scratch/t87/delta.mjs`。

| 量 | 值 |
| --- | --- |
| TAP 汇总 | `# tests 882 · # pass 870 · # fail 12` |
| 冻结基线失败数 | 21 |
| 本次失败数 | **12** |
| **新增（非基线）** | **0 条**（`delta.mjs` 断言「本票路径失败 0 条」，exit 0） |
| 消失（基线内已修，非本票所为） | 9 条（`#48` 1 条／`#50` 6 条／`#93` 2 条） |
| 本票路径（`output-naming-87.test.mjs`）失败 | **0 条** |

### 2.2 非 #87 路径失败归因（逐条单列）

本次 12 条失败**全部**是冻结基线里那 12 条 `dsh-*` client 产物用例（`.scratch/t75/baseline-failing.txt`），归 #57–#60／#64（与 #87 无关）：

| 失败名（12 条，`dsh-bill-ilife` / `dsh-chef` / `dsh-home-ilife` / `dsh-schedule-ilife` 各 3 条） | 归属 |
| --- | --- |
| `… client：classic 执行并注册自身 id（#48 整批 crash 回归）` ×4 | 冻结基线（`plugin-*/test/client-*.test.mjs`） |
| `… client：factory 可物化，导出 apply/inject，无 node 依赖` ×4 | 同上 |
| `… client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像）` ×3＋1 | 同上 |

相对基线**消失**的 9 条（`#48`／`#50`／`#93`）为并发伙伴在本票窗口内修好，**非本票所为**；
上一轮证据里出现过的 `skill-t11.test.mjs`（#95）与 `cmd-write-40-persist.test.mjs`（#101）两条失败，本轮已被各自票修好，不再出现。


## 3. 变异自证（8/8，含返修新增 M6–M8）

脚本：`docs/research/t87-mutation-evidence.mjs`（自持 `gate.lock`，`finally` 释放）。
**输出写 `.scratch/t87/mutation-evidence-<ts>.md`（施工草稿），不覆写被跟踪的 `docs/research/t87-mutation-evidence.md`**（返修 F7）。
口径：记 sha256 → 改一处 → `pnpm build` → 本票测试 → 断言预期用例进失败集 → **逐字节还原** → 复跑全绿 → **断言还原后 sha256 与跑前相同**。

| 变异 | 预期红 | 实际红用例数 | 命中 | 还原(字节+sha256) | 复绿 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| M1 同秒计数「不加 1」 | `#87 ④` | 3 | 是 | 是 | 是 | PASS |
| M2 目录名 `calorie_html`→`html_out` | `#87 ⑤` | 1 | 是 | 是 | 是 | PASS |
| M3 命令名真值 title→key | `#87 ③` | 7 | 是 | 是 | 是 | PASS |
| M4 时间戳去零填充 | `#87 ②` | 7 | 是 | 是 | 是 | PASS |
| M5 默认落点改固定名（落在独占临时根内） | `#87 ⑥` | 5 | 是 | 是 | 是 | PASS |
| **M6 截断改回码元（F1）** | `#87 ①b` | 1 | 是 | 是 | 是 | PASS |
| **M7 同秒计数改回大小写敏感（F2）** | `#87 ④b` | 1 | 是 | 是 | 是 | PASS |
| **M8 落点解析失败退回「未知失败」（F4）** | `#87 ⑨` | 1 | 是 | 是 | 是 | PASS |

还原自证（sha256 前 16 位）：`output.ts` `49f9331d7d5706b1` → `49f9331d7d5706b1`；
`cmd_read.ts` `7622528a1d0897f2` → `7622528a1d0897f2`（相同）。
工作区残留自证：仓库根 `calorie_html_flat.html` **无**；变异临时根跑完按路径守卫删除。

破坏后实测诊断（择要，逐字）：
- M6：`expected: 'a😀…😀（21 码点）' / actual: 'a😀…😀\ud83d'`。
- M7：`expected: '今日总览_20260726_123000_2.html' / actual: '今日总览_20260726_123000.html'`。
- M8：`须 exit 5（渲染/落盘），实得 4 stderr=ERR 4: 未知失败：EEXIST: file already exists, mkdir '…\calorie_html'`。

## 4. 偏离记账

1. **`--html` 保留为 `--output` 别名**：旧版只有 `--output`；本仓既有测试与 `SKILL.md` 用 `--html`，改名为 `--output` 会破既有测试文件，故并存（`--output` 优先）。
2. **同秒冲突用 `readdirSync` 而非 `glob`**：语义等价（命令名已 sanitize，无 `[`/`]` 元字符），少一个依赖；目录不存在视为 0（旧 `glob` 同义）。
   **返修 F2 追加**：为对齐旧 `glob` 在 Windows 的 `normcase` 行为，比较前两侧 `toLowerCase()` —— 这是**复刻**而非偏离。
3. **显式 `--output` 自动建父目录**：旧版直接 `open()` 会 ENOENT；本票建父目录（超集，不改变命名）。
4. **未复刻「类型段／内容标识段／动态 command 段」**：见 §5.1（如实记账，本票不实现）。
5. **`data.output` 为新增 envelope 字段**：六形状守卫为白名单式校验（只查既有键），`assertStatMetrics` 只遍历 `data.metrics`，故 additive 合法；未改 `version`（仍 `0.1.0`）。
6. **F4 的错误形态**：未新增 `CalorieRenderError` 的 `render-failed` 码 —— `src/render/errors.ts` 不在本票独占路径（且 `CalorieRenderErrorCode` 是闭合联合类型，扩码属跨票改动）。
   改用本文件既有的**渲染/落盘失败形态** `fail(5, '渲染失败：…')`（与紧邻的「HTML 写盘失败」同码同文案前缀），exit 与文案均满足返修要求。
   若编排者要求真正的 `render-failed` 码，补丁＝在 `src/render/errors.ts` 的 `CalorieRenderErrorCode` 加 `'render-failed'`，并把 `cmd_read.ts` 的 `fail(5, …)` 换成
   `throw new CalorieRenderError('render-failed', 'HTML 落点解析失败（…）：' + (e as Error).message)`（外层既有分支自动落 `fail(5, '渲染失败：…')`）。

## 5. 需改 `SKILL.md` 的补丁文本（**本票不改**，归 #98 独占）

**审查时 HEAD 的现状**（该文案由 `f05c1c0`／`2b2b14f` 引入，A1 S2-2 引的两处），逐字如下：

- 第 26 行：`` - stdout 纯净：成功只打 envelope JSON 一行；进度与错误一律 stderr；`--html` 显式落盘 utf8。``
- 第 165 行：`` - 成功 stdout 只有一行 envelope JSON，进度与错误走 stderr；`--html <路径>` 显式落盘 utf8。``

**补丁（逐字替换，锚内容不锚行号）**：

位置 1（审查时 HEAD 第 26 行）替换为：
```
- stdout 纯净：成功只打 envelope JSON 一行；进度与错误一律 stderr；HTML 默认落
  `<SKILLS_DB_PATH>/calorie_html/<中文command>_<YYYYMMDD>_<HHMMSS>[_N].html`（同秒冲突自动加 `_2`/`_3`），
  落点回传在 envelope `data.output`；`--output <路径>` 显式覆盖任意路径（`--html <路径>` 为 legacy 别名）。
```

位置 2（审查时 HEAD 第 165 行）替换为：
```
- 成功 stdout 只有一行 envelope JSON，进度与错误走 stderr；HTML 默认落 `calorie_html/<中文command>_<TS>[_N].html`
  （`<中文command>` = 该键注册表 `title`，落点见 `data.output`）；`--output <路径>` 显式覆盖。
```

**落地状态（2026-09-09 实测 · F8 已满足）**：`#98` 已在 **`d6e88b5`**（`fix(98): M6 铁则正文返修…`）落地等价表述 ——
`git show HEAD:packages/skill-calorie/SKILL.md` 第 26／178 行现为「HTML 默认落 …／`--output <路径>` 显式覆盖」，
全文件已无「`--html` 显式落盘」字样（`git log -S"显式落盘" -- packages/skill-calorie/SKILL.md` 显示该串由 `d6e88b5` 移除）。
故上述补丁为 **no-op（已满足，无需再落地）**；此处保留逐字文本仅供审计与回归比对。


## 5.1 动态段／suffix 段补丁（F3 · **本票未实现**，供编排者裁定）

**实测缺口**（`docs/research/t87-fix-evidence.mjs` F3 段，同一 DB、5 次调用）：

| 键 | 旧真值 | 现实现实测 |
| --- | --- | --- |
| `calorie.view.ranking` · `category=high_calorie` | `食物排行_高热量_<TS>.html` | `食品排行_<TS>.html` |
| 同 · `low_calorie` / `frequent` / `high_carb` / `high_protein` | `食物排行_低热量/常吃/高碳水/高蛋白_<TS>.html` | `食品排行_<TS>_2/_3/_4.html`（**同秒互撞**） |
| 同 · 无 category（全榜） | `食物排行_全部_<TS>.html` | `食品排行_<TS>_5.html` |
| `calorie.weight.log` | `记体重_回执_68kg_<TS>.html` | `记体重_<TS>.html` |

影响面：`shape === 'receipt'` 的写键 **35/77** 缺 `_回执` 段；动态键（ranking 5 榜＋全榜／contraindication 部位／weight-history mode 等）缺动态段；
旧 `html_name(suffix=)` 的内容标识段（如 `香蕉`／`68kg`）在新实现中**无参数可传**。

**补丁 A（`packages/skill-calorie/src/output.ts`，在 `HTML_EXT` 常量之后追加）**：

```ts
/** 旧 `html_scene_path()` 的「类型中文」段真值。 */
export const OUTPUT_TYPE_LABELS: Record<string, string> = { process: '过程', result: '结果', receipt: '回执' };

/** 该键的旧版类型段：写键一律 `receipt`（旧 `render_*_receipt.py` 全部走 `html_scene_path(..., 'receipt')`）；
 *  视图键**默认不加段**（旧视图多数走 `html_path()` 无类型段，只有少数走场景命名，须逐键核对旧脚本后登记）。 */
export function sceneTypeFor(key: string): 'process' | 'result' | 'receipt' | null {
  const hit = (CALORIE_COMBOS as Record<string, { shape?: string }>)[key];
  return hit?.shape === 'receipt' ? 'receipt' : null;
}
```

**补丁 B（同文件，动态 command 段 ＋ 旧命令名覆盖）**：

```ts
/** 旧 `html_path()` 实参与注册表 `title` 不同的键（逐键核对旧脚本后登记）。 */
export const LEGACY_COMMAND_OVERRIDES: Record<string, string> = {
  'calorie.view.ranking': '食物排行', // 旧 render_food_ranking.py：'食物排行_' + FOOD_RANKING_CATEGORY_MAP[category]
};

/** 旧 `_cmd_maps.py` 的动态参数中文化映射（逐表复刻；未命中即不加段）。 */
export const DYNAMIC_COMMAND_SEGMENTS: Record<string, Record<string, string>> = {
  'calorie.view.ranking': {
    high_calorie: '高热量', low_calorie: '低热量', frequent: '常吃', high_carb: '高碳水', high_protein: '高蛋白', all: '全部',
  },
  'calorie.view.contraindication': { 腰: '腰', 膝: '膝', 肩: '肩', all: '全部' },
  'calorie.view.weight-history': { history: '历史', trend: '趋势', compare: '对比', volatility: '波动' },
};

/** 动态段：ranking 取 `category`、contraindication 取 `part`、weight-history 取 `mode`；缺省 `all`。 */
export function dynamicSegmentFor(key: string, params: Record<string, unknown>): string {
  const table = DYNAMIC_COMMAND_SEGMENTS[key];
  if (!table) return '';
  const raw = params['category'] ?? params['part'] ?? params['mode'];
  const v = raw === undefined || raw === null ? 'all' : String(raw);
  return sanitizeFilenamePart(table[v] ?? '');
}
```

**补丁 C（同文件，`resolveDefaultHtmlPath()` 改为按段拼接）**：

```ts
export function resolveDefaultHtmlPath(
  key: string,
  opts: { now?: Date; dbDir?: string; suffix?: string | null; params?: Record<string, unknown> } = {},
): string {
  const d = htmlDir(opts.dbDir ?? resolveDbDir());
  const segs = [LEGACY_COMMAND_OVERRIDES[key] ?? chineseCommandFor(key)];
  const type = sceneTypeFor(key);
  if (type) segs.push(OUTPUT_TYPE_LABELS[type] as string);
  const dyn = dynamicSegmentFor(key, opts.params ?? {});
  if (dyn) segs.push(dyn);
  const suf = opts.suffix ? sanitizeFilenamePart(opts.suffix) : '';
  if (suf) segs.push(suf);
  return join(d, htmlFileName(segs.join('_'), { dir: d, now: opts.now ?? new Date() }));
}
```

**补丁 D（`packages/skill-calorie/src/cli/cmd_read.ts`，落点解析处传参）**：

```ts
        htmlTarget = o.output ?? o.html ?? resolveDefaultHtmlPath(o.key as string, { params, suffix: writeSuffixFor(o.key as string, params) });
```

其中 `writeSuffixFor()` 需**逐键核对旧脚本**（本票未写）：已知两例为
`calorie.weight.log` → `String(params.kg) + 'kg'`（旧 `render_weight_receipt.py` 的 `file_suffix`），
`calorie.diet.add` → `String(params.foodName)`（旧 `html_name(suffix=)`）。

**建议测试**（同一测试文件）：`calorie.view.ranking` 五榜＋全榜落 `食物排行_<中文类别>_<TS>.html` 且互不撞名；
`calorie.weight.log` 落 `记体重_回执_68kg_<TS>.html`。

**为什么不本票做**：① issue #87 票面与验收只写基础规则；② 补丁 D 落在 `cmd_read.ts` 出口，与 #100／#102／#103 的在飞队列冲突；
③ `writeSuffixFor()` 需要 35 个写键逐个对照旧脚本，属独立工作量。**请编排者裁定是否另开票。**

## 6. 未做 / 未确证

1. **动态段／suffix 段未复刻**（§5.1 补丁文本已给出，等裁定）。
2. **`SKILL.md` 本票未改**（#98 独占；§5 逐字补丁）。**现状：已由 #98 在 `d6e88b5` 落地**，补丁为 no-op（无需再落地）。
3. **未在安装态（tarball / fresh-tmp）实测默认落盘**：`pnpm publish:pre` 只做 workspace: 零外泄检查；`--tarball`／`--fresh-tmp` 非本票门禁。
4. **`data.output` 无下游消费方接线**：本票只保证回传；面板/话术取用属 #98 文档面与 #95 发布面。
5. **F2 修复只在 Windows 语义下自证**：大小写不敏感是旧 `glob` 的 Windows 行为；POSIX 上旧实现大小写敏感，本实现更严（只会多算冲突、不会少算，最坏是多个 `_N`，不会覆盖）。
6. **同秒冲突计数非原子**（旧 `glob` 同样非原子，非本票引入，也未消除）：见 §7。

## 7. 风险（top3）

1. **调用方契约变更（默认落盘）**：以前不传 `--html` 不落盘，现在会写 `calorie_html/`；且**没有「不落盘」开关**（F5 已如实记账）。
   缓解：`--output`／`--html` 可改写落点；`data.output` 回传；`SKILL.md` 补丁待 #98 落地。
2. **未复刻的动态段／suffix 段会持续产生「同秒覆盖」与「文件名歧义」**：ranking 五榜＋全榜同名，同秒并发下靠 `_2.._N` 兜底，
   语义上无法区分榜单；写键缺 `_回执` 段也丢失了「产物类型」信息。**建议尽快裁定 §5.1 补丁。**
3. **`data.output` 是 envelope `data` 的新增字段**：六形状守卫为白名单式校验（additive 合法），
   但若下游对 `data` 做严格/封闭校验（或对 `stat.metrics` 之外的键做类型断言），会破。备选方案＝改走 stderr 单行，但会引入新 stderr 协议。**请编排者裁定。**
