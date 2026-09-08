# #95 打包与模板装载：files／loader／publish 门（实测证据）

票面：GitHub issue #95（wayfinder 地图 #63 子票）「三处漏洞：`files` 不发模板／`WITH_TEMPLATES` 不含
skill-calorie／`templates/*.html` 没有任何产品代码读它」。术语以 `CONTEXT.md` 为准。

**结论**：三处全部闭合。四门（build／boundaries／snapshot:check／publish:pre）exit 0；打包实证走
「npm pack → 安装布局 → loadTemplate 真读 6 件」；变异自证三项（files 口径／loader 清单／G2 逐件点名）。

> **返修（2026-09-09，A1 FAIL 76／A2 FAIL 67）**：首版有 2 条 S1（临时根退回仓库内 → 仓内 `npm install`
> 违反协议 §2.1；证据脚本 `rmSync` 无守卫）＋ 若干 S2／S3。逐项缺陷→修法→证据见 **§9 返修台账**；
> 本节 §1–§8 中与返修冲突的表述已就地更正（§3.3 注、§7.3、§7.4）。

---

## 1. 三处漏洞的前后对照

| # | 漏洞 | 变更前 | 变更后 | 落点（符号锚，不用易漂的行号） |
| --- | --- | --- | --- | --- |
| 1 | 模板不发包 | `files: ["dist","SKILL.md"]` | `files: ["dist","SKILL.md","templates/*.html"]` | `packages/skill-calorie/package.json` 的 `files` 字段 |
| 2 | publish 门不覆盖 | `WITH_TEMPLATES` 只有 chef/bill/home/memo/schedule | 收入 `skill-calorie`，并新增 `TEMPLATE_NAMES` 逐件点名 | `tooling/check-publish.mjs`：`WITH_TEMPLATES`／`TEMPLATE_NAMES`（常量）、`gateTarball()`（G2 逐件）、`gateFreshTmp()`（G3 安装态逐件） |
| 3 | 模板无产品代码读 | 只有 `test/skill-t11.test.mjs` 直接 `readFileSync` | 新增 loader `src/render/templates.ts` ＋ 经 `src/render/index.ts` 导出；测试改经 loader 装载 | `src/render/templates.ts`（`CALORIE_TEMPLATES`／`loadTemplate`）、`src/render/index.ts`（`export { CALORIE_TEMPLATES, loadTemplate }`）、`test/skill-t11.test.mjs`（「模板 6 件经 loader 装载」） |

loader 口径对齐同族 5 个 skill（`packages/skill-chef/src/render/templates.ts` 的 `loadTemplate` 为范式）：

- `CALORIE_TEMPLATES = ['home','diet','exercise','goal','photo-gallery','help']`（与 `templates/*.html` 双向对齐，测试断言）。
- 错误码复用 `CalorieRenderError` 既有三码：未知模板 → `bad-input`；文件缺失 → `missing-data`。**不新增错误码**
  （`src/render/errors.ts` 不在本票写权限内，且既有码语义已覆盖「坏输入／缺失阻断不返空」）。

## 2. 「`../../templates` 在 dist 下能否解析」——实测而非推理

`tsc` 不复制非 TS 资源，所以 `dist/render/templates.js` 里的 `templatesDir` 解析结果只可能是**包根**：

- 源码态：`packages/skill-calorie/dist/render/templates.js` → 上溯两级 = `packages/skill-calorie/templates`（工作区存在）。
- 安装态：`node_modules/skill-calorie/dist/render/templates.js` → 上溯两级 = `node_modules/skill-calorie/templates`
  （**只有 `files` 发了 templates 才存在**）。

因此「能否解析」等价于「`files` 是否发模板」，实测链见 §3；反证见 §5（变异 1）。

## 3. 打包实证（真跑，非推理）

### 3.1 独立实证脚本 `docs/research/t95-publish-evidence.mjs`

`node docs/research/t95-publish-evidence.mjs`：造包（npm pack）→ `tar -tf` 逐件断言 → `tar -xzf` 到
`<tmp>/node_modules/skill-calorie`（**真实安装布局**）→ 从安装布局 import `dist/render/templates.js`
→ 逐件 `loadTemplate` 断言内容与双标记。实测输出（`.scratch/t95/ev-normal.txt`）：

```
OK: A files 含 templates/*.html（["dist","SKILL.md","templates/*.html"]）
OK: B tarball 含全部 6 件模板
OK: B tarball 含 dist/render/templates.js
OK: B tarball templates/ 条目 6 个，全包条目 400 个
OK: C 安装布局 templates/ = diet,exercise,goal,help,home,photo-gallery
OK: C loadTemplate(diet) → 1798 字节，双标记各 1
OK: C loadTemplate(exercise) → 1735 字节，双标记各 1
OK: C loadTemplate(goal) → 1723 字节，双标记各 1
OK: C loadTemplate(help) → 1810 字节，双标记各 1
OK: C loadTemplate(home) → 1677 字节，双标记各 1
OK: C loadTemplate(photo-gallery) → 1749 字节，双标记各 1
t95 打包实证：PASS
```

> 环境口径（返修后）：临时根优先**仓外** `os.tmpdir()`；仅当 `%TEMP%` 含非 ASCII 时退回仓库内 ASCII 的
> `.scratch/t95/ev-<随机>`——因为 Windows 自带 `bsdtar` 实测打不开非 ASCII 路径下的 tgz
> （`tar.exe: Error opening archive`，同包复制到 ASCII 路径即可开）。两种情形**都只跑 `npm pack`**
> （不跑 `npm install`、不触碰 `node_modules`，协议 §2.1②不适用），且所有 `rmSync` 经 `guardEv`
> 守卫（§2.1③）＋ 用完即清（§2.1④）。

### 3.2 publish 门 G2（tarball 清单逐件）

`node tooling/check-publish.mjs --tarball --only skill-calorie`（`.scratch/t95/tarball-only.txt`）：

```
OK: skill-calorie tarball 含 dist/cli/cmd_read.js
OK: skill-calorie tarball 含 templates/
OK: skill-calorie tarball 含全部 6 件模板
check-publish --tarball：PASS
```

### 3.3 publish 门 G3（fresh 安装态真读）

`node tooling/check-publish.mjs --fresh-tmp --only skill-calorie`：npm pack → 临时工程 `npm install`
→ 生成断言脚本从**安装产物内**取 `dist/render/templates.js` 并逐件 `loadTemplate`。实测
（`.scratch/t95/fresh-only.txt`）：

```
OK: skill-calorie 打包 skill-calorie-0.1.1.tgz
OK: fresh-tmp npm install 1 实包成功
OK: skill-calorie 安装态 templates/ 6 件经 loadTemplate 全部装载成功
NOTE: skill-calorie 公开出口 import('skill-calorie/render') 抛（版本偏斜 → 真崩，非本票红）：The requested module 'base-paint' does not provide an export named 'ACTION_ID_ATTR'
G3 内部断言：模板 1/1 包逐件装载全绿；契约 未跑（本 scope 无契约键）
OK: G3 安装态：模板断言 1 包逐件装载全绿（应发清单逐件比对）；契约断言 未跑（本 scope 不含插件包，无 cliPath／契约键可断）
NOTE: 公开出口断言（安装态 import(<skill>/render)）**未跑**——受 registry base-paint 版本偏斜阻塞，待 base-paint 发版后补（#95 F3 记账）
check-publish --fresh-tmp：PASS
```

> **返修更正（F4／F3，2026-09-09）**：首版此处打印「G3 安装态断言全绿」＋「cliPath 解析 + 契约键打通」，
> 而 `--only skill-calorie` 下 `CONTRACT = {}`、契约循环一次不跑 —— **没跑却宣称成功**。现在：
> ① 模板断言与契约断言**分别**给结论；② 无契约键时明写「未跑（本 scope 不含插件包）」；
> ③ 公开出口断言如实记账为**未跑**（原因 ＋ 待补票），并附探针 NOTE 记录当时的真实结果。
> 回归判据：`node docs/research/t95-g3-honesty.mjs`（含「不得出现『契约键打通／断言全绿』」的负向断言）。
>
> 附带修复（本票范围内，`tooling/check-publish.mjs`）：G3 原来在 Windows 上**空跑**——安装目录
> 无 `package.json` 时 `npm install` 退出码 0 却不落 `node_modules`（实测对照见下）。现保留「写入最小
> `package.json`」这一必要动作。
>
> **返修更正（F1，2026-09-09）**：首版把根因写成「中文 `%TEMP%` 路径」并因此把临时根退回**仓库内**
> `.scratch/` —— 这是错的且违反协议 §2.1。2×2 实测（`node docs/research/t95-f1-attribution.mjs`）：
>
> | cwd | 最小 package.json | npm install exit | node_modules 落盘 | templates 件数 |
> | --- | --- | --- | --- | --- |
> | 非 ASCII `%TEMP%` | 无 | 0 | **false** | 0 |
> | 非 ASCII `%TEMP%` | 有 | 0 | **true** | **6** |
> | ASCII 仓外根 | 无 | 4294963248（EPERM，无 package.json 时的 npm 行为） | false | 0 |
> | ASCII 仓外根 | 有 | 0 | **true** | **6** |
>
> → **决定性变量是「安装目录缺最小 package.json」，与 cwd 编码无关**。故 `TMP_ROOT` 现为 `os.tmpdir()`，
> 临时根一律在仓库之外（`--tmp-hygiene` 守这条），用完即清。CI（Ubuntu，ASCII）行为不变。

### 3.4 真实 `npm install` 安装态（人工 + 脚本双证）

> **返修更正（F1／F9，2026-09-09）：本节原记录的手工步骤在仓库内执行 `npm install`**
> （`D:\ilife\.scratch\t95\insttest`），**违反协议 §2.1②**（仓内安装会把包装进共享根 `node_modules`，
> 与 2026-09-09 全仓事故同一机制）→ 该记录**作废**，仅留作反面证据；仓内残留目录已清。
> 安装态实证改为只走 `tooling/check-publish.mjs --fresh-tmp`（临时根在**仓库之外**）与
> `docs/research/t95-publish-evidence.mjs`（只 `npm pack` ＋ `tar` 解包，不跑 install）。

```
【作废·违规示例，勿复跑】
D:\ilife\packages\skill-calorie> npm pack --pack-destination D:\ilife\.scratch\t95\packtest   # 仓内
D:\ilife\.scratch\t95\insttest> npm install <tgz>                                            # ← 违反 §2.1②
node_modules\skill-calorie\  -> dist  templates  package.json  SKILL.md
Test-Path node_modules\skill-calorie\templates -> True
```

现在的合法等价物（仓外临时根，用完即清）：

```sh
node tooling/check-publish.mjs --fresh-tmp --only skill-calorie   # G3：仓外 fresh 安装 ＋ 逐件装载
node docs/research/t95-publish-evidence.mjs                       # 安装布局（tar 解包，不 install）逐件装载
node tooling/check-publish.mjs --tmp-hygiene                      # 守「临时根在仓外 ＋ 仓内无残留」
```

## 4. 门禁实测（本票改动后，持锁）

| 门禁 | 命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| 构建 | `pnpm build` | exit 0 | `.scratch/t95/final-*.txt`；返修复跑 `.scratch/t95-fix/gate-build.txt` |
| 边界 | `pnpm boundaries` | exit 0 | 同上 |
| 快照 | `pnpm snapshot:check` | exit 0 | 同上 |
| 发布（pre） | `pnpm publish:pre` | exit 0 | 同上 |
| 打包（G2） | `node tooling/check-publish.mjs --tarball --only skill-calorie` | exit 0 | 返修：`.scratch/t95-fix/gate-g2.txt` |
| 安装态（G3） | `node tooling/check-publish.mjs --fresh-tmp --only skill-calorie` | exit 0 | 返修：`.scratch/t95-fix/gate-g3.txt` |
| 临时根卫生 | `node tooling/check-publish.mjs --tmp-hygiene` | exit 0 | 返修新增（F1／F9 回归守卫） |
| G3 诚实性回归 | `node docs/research/t95-g3-honesty.mjs` | exit 0 | 返修新增（F1／F3／F4／F8／F9 判据） |
| 测试 | `node --test <根 test globs>` | exit 1，失败集见 §6 | `.scratch/t95/test-delta-A.md` |

`packages/skill-calorie/test/skill-t11.test.mjs` 单跑：首版 `tests 5 / pass 5 / fail 0`；
返修后 `tests 7 / pass 7 / fail 0`（＋#98 的 M6 断言 ＋ 本票 F7 的 `missing-data` 断言）。

## 5. 变异自证

| # | 变异 | 期望 | 实测（证据文件） |
| --- | --- | --- | --- |
| 1 | 真 `package.json` 的 `files` 摘掉 `templates/*.html` | G2 红 | `FAIL: skill-calorie tarball 缺 templates/` ＋ `缺模板：diet, exercise, goal, help, home, photo-gallery`，`check-publish --tarball：2 处红`（`.scratch/t95/mut-files-break.txt`）；还原后 `PASS`（`mut-files-restored.txt`） |
| 2 | `files` 变异态跑独立实证 | B/C 红且脚本判「被抓住」 | `FAIL(B) 缺模板 ×6`、`FAIL(C) 安装布局无 templates/`、`loadTemplate ×6 抛 missing-data`、`变异被抓住（B红 1 处、C红 7 处）→ PASS`（`.scratch/t95/ev-mutate.txt`） |
| 3 | `CALORIE_TEMPLATES` 摘掉 `photo-gallery` | `skill-t11` 红 | `✖ 模板 6 件经 loader 装载`＋`deepStrictEqual` 差 `'photo-gallery'`，`fail 1`（`.scratch/t95/mut-loader-break.txt`） |
| 4 | 还原后 | 全绿 | `pass 5 / fail 0`（`.scratch/t95/mut-loader-ok.txt`） |

变异用 `.scratch/t95/mutate.mjs`（`loader-break`／`files-break` 及对应 restore），每次变异后立即还原并重跑。

> 变异方法论坑（实测记录）：`fs.copyFileSync` 还原会保留备份文件的 mtime，而 `tsc -b` 增量按 mtime 判定，
> 会出现「源码已还原但 `dist/` 仍是变异产物」的假绿。故本票每次 restore 后 `touch` 源文件再 `pnpm build`，
> 并核对 `dist/render/templates.js` 含 `photo-gallery` 才继续。

## 6. 测试失败集 delta 与归因

冻结基线 21 条（`.scratch/t75/baseline-failing.txt`）。本票改动后实测（`.scratch/t95/test-delta-A.md`，
`node docs/research/t95-test-delta.mjs`）：**13 条失败，基线命中 12/21，新增 1 条，基线中消失 9 条**。
归因（逐条落到文件所有权）：

- **本票贡献 0 条**：`packages/skill-calorie/test/skill-t11.test.mjs` 单跑 `tests 5 / pass 5 / fail 0`；
  本票只新增 `src/render/templates.ts` ＋ 两行导出 ＋ `files` 一项，且不碰 CLI／DB／其它包。
- **新增 1 条**：`口径 · 删除回执可恢复性：文案与库内语义一致（软删行留／硬删行无）`，落在
  `packages/skill-calorie/test/cmd-write-40-persist.test.mjs`（**#101 未提交的在飞新测试**）。
- **消失 9 条**（#48／#50 envelope 契约 7 条 ＋ #93 只读 2 条）：现已单跑全绿
  （`plugin-calorie/test/smoke.test.mjs` 10/10、`skill-calorie/test/db-readonly-93.test.mjs` 8/8），
  系 #87 CLI 出口（`src/cli/cmd_read.ts`／`src/output.ts`）与 #93 的在飞/已提交修复所致。
- **口径提醒**：本工作区同时有 5 个 agent 在飞，失败集本身在移动（同一命令先后跑出 16／17／13 条）；
  上表取本票改动后的最后一次快照。审查者要核的是「本票路径未新增失败」而非「集合冻结」。
- 参考：`--reuse` 重解析时 TAP 会把名字里的 `#` 转义成 `\#`，未反转义会造出 13 条假 delta（脚本已处理）。

## 7. 偏离／未做

1. **`html.ts` 未接线**：`render/pageShell` 仍自建 HTML 壳，未走 loader——该文件不在本票写权限内
   （#87 占 `src/cli/cmd_read.ts`、#101 占 `src/cli/write.ts`／`src/render/photo.ts`）。本票把 loader 做成
   可被出口消费的公开 API ＋ 用 publish 门/测试证明安装态可读，接线留给后续票。
2. **全量 13 包 fresh 未跑**：本票范围是卡路里线；`pnpm publish:fresh`（4 包口径）含 registry 拉取，
   本地中文路径环境曾失败，CI 覆盖。
3. **发现（不在本票范围，需转票）· 定性更正为「真崩」（F3）**：安装态 `import('skill-calorie/render')`
   会连带加载 registry 上的 `base-paint`，而 registry 版本落后工作区（缺 `ACTION_ID_ATTR`）→ **真崩**，
   **不是假红**：registry 包确实没有工作区已导出的符号，安装态整包不可用。复现命令（仓外临时根）：

   ```sh
   mkdir %TEMP%\ilife-repro && cd %TEMP%\ilife-repro
   npm pack --pack-destination . D:\ilife\packages\skill-calorie
   npm init -y && npm i .\skill-calorie-0.1.1.tgz
   node -e "import('skill-calorie/render').then(()=>console.log('OK'),e=>{console.error(e.message);process.exit(1)})"
   ```

   实测抛：`The requested module 'base-paint' does not provide an export named 'ACTION_ID_ATTR'`。
   G3 因此改从安装态 `dist/render/templates.js` 取 loader（与 `exports['./render']` 同目录、只依赖 node
   内置 ＋ `errors.js`）——这**只是绕过公开出口**，不等于公开出口可用。故 G3 现在把「公开出口断言」如实
   记为**未跑（待 base-paint 发版后补）**，并打印探针 NOTE 记录当时真实结果，不再冒充已跑（F3②／F4）。
   **本票不发布 base-paint**（归框架图）。
4. **偏离记账（改动大于票面口径）**：`tooling/check-publish.mjs` 除 `WITH_TEMPLATES`／逐件点名／G3 loader
   断言外，还改了安装目录 `package.json`（§3.3 注）。**返修更正（F1）**：首版同时把非 ASCII 时的临时根
   改到仓库内 `.scratch/`，那是 S1（仓内 `npm install`，违反 §2.1），已回退为 `os.tmpdir()`；根因经 2×2
   实测确认为「缺最小 package.json」，与路径编码无关（§3.3 表）。

## 8. 复跑

```sh
pnpm build
node docs/research/t95-publish-evidence.mjs            # A/B/C 打包实证（PASS）
node docs/research/t95-publish-evidence.mjs --mutate   # files 变异态（B/C 红、D 绿）
node docs/research/t95-publish-evidence.mjs --guard-selftest   # F2：清理守卫必须有牙
node docs/research/t95-f1-attribution.mjs              # F1：2×2 归因（决定性变量 = 最小 package.json）
node tooling/check-publish.mjs --tarball --only skill-calorie
node tooling/check-publish.mjs --fresh-tmp --only skill-calorie
node tooling/check-publish.mjs --tmp-hygiene           # F1/F9：临时根在仓外 ＋ 仓内无残留
node docs/research/t95-g3-honesty.mjs                  # F3/F4/F8：G3 说真话 ＋ 逐件 6 件
node docs/research/t95-test-delta.mjs                  # 失败集 vs 冻结基线
node --test packages/skill-calorie/test/skill-t11.test.mjs
```

---

## 9. 返修台账（2026-09-09 · A1 FAIL 76（2 S1）／A2 FAIL 67 → 裁定返修）

| 项 | 缺陷（审查判定） | 修法 | 证据（file:line 用符号锚） |
| --- | --- | --- | --- |
| **F1**（S1 · A1-1） | `check-publish.mjs` 在非 ASCII `%TEMP%` 时把 G3 临时根改到**仓库内** `.scratch/` → 仓内 `npm install`，违反协议 §2.1，与 2026-09-09 全仓事故同机制 | `TMP_ROOT` 回 `os.tmpdir()`；删掉「退回仓内」分支；只保留「写最小 package.json」 | `tooling/check-publish.mjs` 的 `TMP_ROOT`／`mkTmp`／`gateFreshTmp`；归因实测 `docs/research/t95-f1-attribution.mjs`（2×2 表）；守卫 `--tmp-hygiene`；变异：`TMP_ROOT = join(root,'.scratch')` → `--tmp-hygiene` 红 |
| **F2**（S1 · A1-2） | 证据脚本 `rmSync(recursive,force)` 无路径守卫 | 新增 `guardEv`（须在**独占临时根**下且不在 `node_modules`／`packages`／`docs`／`test`／`tooling`／`.git` 之下）＋ `cleanupAll`／`bail`（异常路径也清理） | `docs/research/t95-publish-evidence.mjs` 的 `guardEv`／`cleanupAll`／`bail`；自证 `--guard-selftest`（10 例，8 拦 2 放）；变异：`guardEv` 改 `return resolve(p)` → 自证红 |
| **F3**（S2） | 版本偏斜定性错（说「假红」，实为**真崩**）；G3 走 `dist/render/templates.js` 深路径**绕过**公开出口却不记账 | ① 文档定性改「真崩」＋给复现命令与实测错误串；② G3 如实记账「公开出口断言未跑，待 base-paint 发版后补」＋探针 NOTE 记录真实结果；**本票不发布 base-paint** | 本文 §7.3（复现命令）；`tooling/check-publish.mjs` 的 G3 `NOTE:` 行；探针输出见 `.scratch/t95-fix/gate-g3.txt` |
| **F4**（S2） | `--only skill-calorie` 下 `CONTRACT={}`，契约循环一次不跑，却仍打印「断言全绿／契约键打通」 | G3 结论按 scope 分支：模板断言／契约断言**分别**给结论，无键时明写「未跑（本 scope 不含插件包）」 | `tooling/check-publish.mjs` 的 `tplMsg`／`contractMsg`／`G3 内部断言`；回归判据 `docs/research/t95-g3-honesty.mjs`（负向断言「契约键打通」「断言全绿」） |
| **F5**（S2） | 证据文档 file:line 漂移（`:36`／`:38-41`／`:84-93` 实为 `:44`／`:46-48`／`:90-100`） | 全文改**符号锚**（常量／函数名），不再依赖行号 | 本文 §1 表；复跑 `grep -n "WITH_TEMPLATES\|TEMPLATE_NAMES\|function gateTarball\|function gateFreshTmp" tooling/check-publish.mjs` |
| **F6**（S2） | `docs/calorie-dual-path-acceptance.md` 的「dist/render 零运行时读盘／HTML 一律以代码提供」已成**假陈述** | 就地同步该行：本票后已有读盘 loader ＋ 模板随包；未接线部分与占位符改造归 **#107** | `docs/calorie-dual-path-acceptance.md` 的「模板资产边界」条 |
| **F7**（S3） | `missing-data` 分支零守卫（变异 catch→`return ''` 后 build／skill-t11／G3 三绿） | 新增断言：缺件必须抛 `missing-data`（安装布局副本造缺件，不碰仓库模板文件）＋正例对照 | `packages/skill-calorie/test/skill-t11.test.mjs`（「loader 缺文件抛 missing-data」）；变异见 §10 |
| **F8**（S3） | G3 对「少发几件」失明（遍历磁盘发现的文件） | G3 按 `TEMPLATE_NAMES` 应发清单逐件比对，缺一即红 | `tooling/check-publish.mjs` 的 G3 `miss`／`extra` 断言；变异见 §10 |
| **F9**（S3） | 临时根不清理 ＋ 遗留 8.1MB（`.scratch/ilife-fresh-*`／`ilife-pack-*`） | G3 的 `packDir`／`inst` 与 assert 侧 DB 目录 `finally` 清理＋守卫；证据脚本 `bail()` 全路径清理；新增 `--tmp-hygiene` | `tooling/check-publish.mjs` 的 `gateFreshTmp` `finally`／`gateTmpHygiene`；`docs/research/t95-publish-evidence.mjs` 的 `cleanupAll` |

## 10. 返修变异自证（红 → 还原 sha256 相同 → 绿）

见 `docs/research/t95-rework-evidence.md`（含每项的 sha256 前后值、变异命令、红/绿实测输出）。

> 纪律：变异一律**持 `gate.lock`**；变异前记录目标文件 sha256，还原后复核 sha256 相同再跑绿；
> 变异只碰本票独占路径。
