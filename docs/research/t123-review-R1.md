# #123 发版窗口 — 对抗式审查 R1（语义与闭包）

- 审查者角色：**R1 语义与闭包**（独立复验，不引用被审方结论）。
- 仓库 `D:\ilife`；审查起止 HEAD：进入时 `42a5b49`，审查中并发 session 又落两笔（`336a6e0`、`f4d57ba`），结束前 HEAD `f4d57ba`。
- 环境：Node `v24.19.0`、npm `10.9.2`、pnpm `11.8.0`、Windows PowerShell `5.1.26100.9168`（`pwsh` 工具实测就是 5.1：`Select-String -Recurse` 不存在）。
- 审查时间：2026-09-09（本机时区）。
- 只读纪律：**未改任何源码/changeset/package.json**；未 `npm publish`；仓内零 `npm install`（安装态实证全在 `$env:TEMP\ilife-t123rev1-*`，均先写最小 `package.json`）；未跑 `git stash/checkout/reset/clean/restore/commit/push`；**未跑任何 build/test**（故全程未持 `gate.lock`，无需持锁）。
- 产物：本文件 + `.scratch/t123review-R1/**`（脚本、`run-*.log`）。
- 未读 `docs/research/t123-review-R2.md`（按派单禁读）。

---

## 0 一句话结论

诊断票的**技术主线全部成立**（版本计算、base-paint 缺符号、CLI 链接期崩、`^0.1.0` 解析不到 `0.2.0`、门禁会变红、life-pack 被钉 0.1.1），但它的**「最小修复清单」不完整到会卡住发版窗口**：改 range 会打红 **4 处未登记的测试断言**（另有 2 处版本常量未登记），因此按该清单执行 **`pnpm test` 必红**。编排者综合文件另有 3 处**论证错误**（life-pack「不属运行崩溃」、dist 陈旧证据、`^0.2.0` vs `>=0.2.0 <0.3.0` 的伪选择）。综合判定 **FAIL**。

---

## 1 逐条复验表（我自己的命令 + 我的输出 + 判据）

### 1.1 版本计算（焦点第一项）

| # | 被审断言 | 我的命令 | 我的输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| V1 | `skill-calorie 0.1.1→0.2.0` | 自写 `.scratch/t123review-R1/recompute.mjs`：解析全部 `.changeset/*.md` frontmatter（`---` 块内 `"pkg": minor/patch`），按 changesets 语义「同包取最高等级 → semver.inc」重算（不依赖 `changeset status`） | `skill-calorie: cur=0.1.1 bumps=["minor","patch"] n=21 -> 0.2.0` | **PASS** |
| V2 | `dsh-calorie 0.1.6→0.2.0` | 同上 | `dsh-calorie: cur=0.1.6 bumps=["minor","patch"] n=6 -> 0.2.0` | **PASS** |
| V3 | `base-paint 0.1.0→0.2.0`（诊断 §10.1「应为 9 个 minor」） | 同上 | `base-paint: cur=0.1.0 bumps=["minor"] n=9 -> 0.2.0`（`base-paint-*` 7 ＋ `p5-scaffold` ＋ `p7-render`） | **PASS** |
| V4 | 全仓 53 changeset / 17 包 | 同上 | `TOTAL_CHANGESET_FILES=53 TOTAL_PACKAGES=18 AFFECTED_PACKAGES=17` | **PASS** |
| V5 | 诊断 §0.5「skill-calorie 21 个（含 **15** 个 minor）」 | 同上逐文件枚举 | 实为 **16 minor + 5 patch**（诊断自己的 §1.2 也写 16 minor） | **FAIL（文档内部自相矛盾，结论不变）** |
| V6 | `pnpm changeset status` 不可用 | `pnpm changeset status` → `.scratch/t123review-R1/run-changeset-status.log` | `MARK=1`；`node:internal/modules/cjs/loader:1524`…`Cannot find module '@changesets/errors'`；另 `require.resolve('semver')`→`NO_SEMVER`、`require.resolve('@changesets/errors')`→`NO_CHANGESETS_ERRORS` | **PASS**（oracle 确实坏，手工重算必要） |
| V7 | semver 计算口径 | 在**仓外** temp 装 canonical `semver@7.8.5` | `inc(0.1.1, minor)=0.2.0`、`inc(0.1.6, minor)=0.2.0`、`inc(0.1.0, minor)=0.2.0`、`inc(0.2.0, minor)=0.3.0` | **PASS** |

### 1.2 闭包：registry `base-paint@0.1.0` 是否真缺那 5 个具名导出

| # | 被审断言 | 我的命令 | 我的输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| C1 | 缺 `ACTION_ID_ATTR`/`DEFAULT_DATA_ATTR`/`HELP_COPY_ACTIONS`/`buildSharedHelpersJs`/`renderActionBar`（诊断 §10.1；编排者 §2.2） | 仓外 temp 最小 `package.json` ＋ `npm install base-paint@0.1.0 --registry=https://registry.npmjs.org/`，再**真实 import**（非 grep） | `COUNT=18`；`MISSING ACTION_ID_ATTR=true / DEFAULT_DATA_ATTR=true / HELP_COPY_ACTIONS=true / buildSharedHelpersJs=true / renderActionBar=true` | **PASS** |
| C2 | 反查「`export *` 通配让扁平 grep 漏判」 | 同一 temp：`node --input-type=module -e "import { ACTION_ID_ATTR } from 'base-paint'"` | `SyntaxError: The requested module 'base-paint' does not provide an export named 'ACTION_ID_ATTR'`（`A_EXIT=1`） | **PASS**（通配不掩盖：导出面就是 18 项） |
| C3 | 工作区 base-paint 已具备 5 符号（无需改源码） | 把工作区 `packages/base-render/dist` 暂存为 temp 里的 `node_modules/base-paint`，再 import | `WS_COUNT=106`，5 个 `WS_MISSING?=false` | **PASS** |
| C4 | 发布集合是否**充分**：`skill-calorie`/`dsh-calorie` dist 的外部运行时依赖 | 自写 `.scratch/t123review-R1/bare-specs.mjs` 扫 dist 全部静态 import / 动态 import / require | skill-calorie dist 的裸依赖**只有 `base-paint`**（`render/copy.js`、`render/html.js`）；plugin 侧只有 `react`（宿主提供）。无 `base-link-core` 运行期引用（`import type` 已擦除） | **PASS（闭包 = {base-paint, skill-calorie, dsh-calorie}）** |
| C5 | 版本元组（registry 真值） | `npm view <pkg> versions --json <X>` | `base-paint=[0.1.0]`、`skill-calorie=[0.1.0,0.1.1]`、`dsh-calorie=[0.1.0…0.1.6]`、`dsh-life-pack=[0.1.0,0.1.1,0.2.0]` | **PASS** |

### 1.3 调用链：「CLI 链接期崩」论证是否成立（焦点第三项）

| # | 被审断言 | 我的命令 | 我的输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| L1 | `cmd_read` 静态依赖 `render/copy.js`（源码链） | 读 `src/cli/cmd_read.ts:41-52`、`src/render/html.ts:14,23`、`src/render/copy.ts:18-24` | `cmd_read.ts:52 import { … } from '../render/html.js'`；`html.ts:23 import { copyActionHtml, copyRuntimeScriptHtml } from './copy.js'`；`copy.ts:18-24 import { ACTION_ID_ATTR, DEFAULT_DATA_ATTR, HELP_COPY_ACTIONS, buildSharedHelpersJs, renderActionBar } from 'base-paint'` | **PASS** |
| L2 | 两条链都查（dist 层） | 自写 `.scratch/t123review-R1/dist-imports.mjs` 解 dist 的 import 子句 | `dist/cli/cmd_read.js → ../render/html.js`（41 个具名）；`dist/render/html.js → {cx,escapeHtml,token} from 'base-paint'` ＋ `{copyActionHtml,copyRuntimeScriptHtml} from './copy.js'`；`dist/render/copy.js → {5 个} from 'base-paint'`；**dynamic-import-count=0** | **PASS** |
| L3 | 是否可能被动态 import / 条件导出绕过 | `Get-ChildItem … -Recurse | Select-String "await import\(|[^.]import\("`；`grep` 全 dist | src 命中仅 `cmdImport(` 误报；dist 动态 import 计数 0；`package.json` `exports` 里 `./cli` → `./dist/cli/cmd_read.js`（无条件分支） | **PASS（无绕过路径）** |
| L4 | 「装上即用」时是否真在**链接期**崩 | **决定性实测**：temp 里 `node_modules/skill-calorie` = 工作区 `dist` + `package.json`，同目录 registry `base-paint@0.1.0`，跑 `import('skill-calorie/cli')` | `CHAIN_FAIL SyntaxError: The requested module 'base-paint' does not provide an export named 'ACTION_ID_ATTR'`（`C_EXIT=7`）；把 base-paint 换成工作区 dist 后 `CHAIN_OK_WS_BP n=1`（`D2_EXIT=0`） | **PASS（论证成立，非推测）** |

### 1.4 range 目标值与门禁（焦点第四、六项）

| # | 被审断言 | 我的命令 | 我的输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| R1 | `^0.1.0` 解析不到 `0.2.0` | 仓外 canonical `semver@7.8.5` | `satisfies(0.2.0, ^0.1.0)=false`；`maxSatisfying([0.1.0,0.1.1,0.2.0], ^0.1.0)=0.1.1`；`validRange(^0.1.0)= >=0.1.0 <0.2.0-0` | **PASS** |
| R2 | 隔离安装实测：`npm install dsh-calorie@0.1.6` → `dsh-life-pack@0.1.1`（诊断 §2.2/§10.2） | 仓外 temp 最小 `package.json` ＋ `npm install dsh-calorie@0.1.6 <X>` | `added 4 packages`；落盘 `dsh-calorie@0.1.6` / `skill-calorie@0.1.1` / `base-paint@0.1.0` / **`dsh-life-pack@0.1.1`**（原始 manifest 摘录：life-pack `"version": "0.1.1"`；skill-calorie `"files": ["dist"]`） | **PASS** |
| R3 | `tooling/check-publish.mjs:84,86` 的 `/^\^0\.1\./` 会让 `pnpm publish:pre` 变红（诊断 §2.3 #4/#5、§10.4 #10） | ① 读根 `package.json:35` `"publish:pre": "node tooling/check-publish.mjs --pre --only dsh-calorie,skill-calorie,dsh-life-pack,base-paint"`；② **只读**跑真门禁；③ 把**真门禁脚本**复制到 `.scratch/t123review-R1/fakerepo/tooling/`，配一份 range 改成 `^0.2.0` 的 manifest 副本再跑 | ② `check-publish --pre：PASS`（`MARK=0`）；③ `FAIL: dsh-calorie 未声明 dsh-life-pack ^0.1.x` ＋ `FAIL: dsh-calorie 未声明 skill-calorie ^0.1.x` → `check-publish --pre：2 处红`（`GATE_AFTER_EXIT=1`）；`node -e` 正则实测：`^0.1.0→true`、`^0.2.0→false`、`^0.3.0→false` | **PASS（用真门禁代码判定，未 build）** |
| R4 | `^0.2.0` vs `>=0.2.0 <0.3.0` 是否两个真选项（编排者 §5.4） | canonical semver | `validRange(^0.2.0) = >=0.2.0 <0.3.0-0`；`subset(^0.2.0, >=0.2.0 <0.3.0)=true`，`subset(>=0.2.0 <0.3.0, ^0.2.0)=false` | **PASS（二者同域，`^0.2.0` 更窄；该「选择」是伪选择）** |

### 1.5 `dsh-life-pack` 该不该发（焦点第五项）

| # | 被审断言 | 我的命令 | 我的输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| P1 | `dsh-calorie` 源码零 import life-pack（编排者 §2.5） | 全目录 grep `life-pack`（src/dist/yml/json） | 无 `import … from 'dsh-life-pack'`；但有 `src/bridge.ts:18 MANAGER_PACKAGE`、`src/slot.ts:14 MANAGER_PLUGIN`（**均为死导出，无消费者**）＋ `package.json:28` 硬依赖声明 | **PASS（字面成立）** |
| P2 | 「链路陈旧，不属编译/运行崩溃」（编排者 §2.5） | 读 `src/client.ts:263-264` `ctx.slots.inject('ilife.config-tab', () => ctx.slots.register(…))`；读 `packages/plugin-manager/src/client.ts:30` `CONFIG_TAB_SLOT='ilife.config-tab'`＋`:218 children: {'ilife.config-tab': …}`；再在仓外装 registry `dsh-life-pack@0.1.1` 与 `@0.2.0` 对比产物 | `0.1.1`: `client.js 3608B, ilife.* ids=[], has children=false`；`0.2.0`: `client.js 7566B, ilife.* ids=["ilife.config-tab"], has children=true` | **FAIL（编排者论断被推翻：是槽位契约耦合，旧总管不声明该槽 → 设置页静默缺席）** |
| P3 | 不发 life-pack 是否成立 | 结合 P2 + registry 有 `0.2.0` | 成立**当且仅当** `dsh-calorie` 的 range 提到 `^0.2.0`（否则干净安装 maxSatisfying=0.1.1 → 无 `ilife.config-tab`）；工作区仅领先 registry 一笔 `f02bf12`（`src/client.ts` pill 样式），不发不阻塞本票 | **PASS（诊断「可选发」/编排者「不发」结论对，但依据必须换成 P2）** |
| P4 | registry `0.1.6` 的 `inject` 缺 `connection`（#123 立项前提之一） | 自己下载并**手工解析 registry tarball**（`.scratch/t123review-R1/untar.mjs`，gzip+512 头） | `package/dist/client.js size=13444 sha256=2359934fc224…3e9beeb09b6d`，`L84 const inject = ["slots"];`；工作区 dist 同行 `["slots","connection"]`；manifest `dsh.client.inject=[…ui-slots, …connection]` | **PASS（结论成立）** |
| P5 | 诊断 §8 的 registry client.js 哈希证据（23906B / `211C8622…79D7`） | 用同一 untar 解析**诊断自己的** `.scratch/t123/reg-dsh-calorie-0.1.6.tgz`，并另下一次 registry tarball 对照 | 两份 tarball 的 `package/dist/client.js` 都是 **13444B / `2359934f…`**；`.scratch/t123/reg-client-0.1.6.js`（23906B / `211C8622…`）**不是**该 tarball 的内容 | **FAIL（哈希/体积不可复现，结论另由 P4 证实）** |

### 1.6 其它被审断言（抽验）

| # | 被审断言 | 我的命令 | 我的输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| X1 | `skill-calorie` range 现为 `^0.1.0`（诊断 §2.1/§2.3 #3、编排者 §2.5） | `node -e` 读 manifest ＋ `git show 42a5b49 -- packages/skill-calorie/package.json` | 现值 **`"base-paint": "^0.2.0"`**；`42a5b49`（12:41:11，晚于诊断 HEAD `dfd4db6`）已把 `^0.1.0` 改为 `^0.2.0` | **FAIL（两份交付物此条已过期）** |
| X2 | `dsh-calorie` deps `dsh-life-pack ^0.1.0` / `skill-calorie ^0.1.0` | 同上 | 与断言一致（未变） | **PASS** |
| X3 | 打包内容：skill-calorie 400 项含 SKILL.md＋6 模板；dsh-calorie 34 项 | `npm pack --dry-run --json`（只读，不 build） | `skill-calorie entryCount=400 SKILL.md=true templates=6 dist=392 cmd_read=true`；`dsh-calorie entryCount=34`；`base-paint entryCount=69` | **PASS** |
| X4 | SKILL.md 3 行 / 4 处 `0.1.1`；`test/skills-export-47.test.mjs:55,57` 钉死 `@0.1.1` | `Select-String` | `L172 matches=1 / L173 matches=2 / L179 matches=1`；`L57 assert.ok(text.includes('@0.1.1'), …)` | **PASS** |
| X5 | 同步点「≥6 处」（诊断 §5） | 全仓搜版本常量消费者 | **另有** `packages/plugin-calorie/src/slot.ts:19-20 PLUGIN_VERSION='0.1.6' / SKILL_VERSION='0.1.1'`，被 `src/client.ts:56` 渲染成面板版本行，且被 `test/smoke.test.mjs:93-94` 断言与两处 `package.json` 相等 | **FAIL（漏登记，且会打红测试）** |
| X6 | 门禁硬编码只有 `check-publish.mjs:84,86` 两处 | 全仓搜 `/^\^0\.1\./` 与 `'^0.1.0'` | **14 处命中**，其中本次会打红的：`check-publish.mjs:84,86`、`packages/plugin-calorie/test/smoke.test.mjs:33,34`、`test/plugin-p10-boundaries.test.mjs:35`（`assert.equal(…, '^0.1.0')` 精确相等）、`:36`、`test/plugin-p10-install.test.mjs:44`（精确相等） | **FAIL（漏 4 处测试断言）** |
| X7 | `.scratch/t75/baseline-failing.txt` 21 条不含上述用例 | 读该文件 | 21 条均为 envelope 契约 / #93 / client 产物类，**无**依赖范围断言 → 新增失败即 delta | **PASS（我的 S1 判定成立）** |
| X8 | 真机是 junction 直连工作区（诊断 §8 / 前置 P-1） | `Get-Item -Force` 逐跳解析 | `dsh-calorie → D:\ilife\packages\plugin-calorie`；`dsh-life-pack → D:\ilife\packages\plugin-manager`；fallback `skill-calorie → D:\ilife\packages\plugin-calorie\node_modules\skill-calorie → D:\ilife\packages\skill-calorie`；fallback `base-paint → …\skill-calorie\node_modules\base-paint → D:\ilife\packages\base-render` | **PASS（并补全了两跳链条）** |
| X9 | 真机 `dsh-calorie/dist/client.js` = 工作区产物 | `Get-FileHash` 三方对照 | 工作区 13882B `5CB259AE…9714E`；真机 13882B `5CB259AE…9714E`；registry tarball 13444B `2359934F…B09B6D` | **PASS** |
| X10 | 前置 P-3 真库事实 | `Test-Path` / `Get-ChildItem` | `calorie_data.db 3072000B 2026/8/29 11:49:11`；`calories.db 0B`；`calorie_html` 存在 169 文件 | **PASS** |
| X11 | 编排者 §2.7 闸门 2：dist 含旧 `charts-xlabel{font-size:10.5px}` 且早于 src | `Select-String dist/charts.js` ＋ `Get-Item` mtime | dist 该选择器 **L1614、L1626 均 9.5px**（无 10.5px）；dist 内残留的 10.5px 属 `charts-value-last`/`charts-mptext`，**src 同值**（`src/charts.ts:1749,1752`）；dist mtime `12:41:33` **晚于** src `12:35:57` | **FAIL（证据已过期，推断不成立）** |
| X12 | 编排者 §2.7 闸门 1：工作树有未提交改动 | `git status --porcelain` | 只剩 3 个 `??` 文档（runbook/diagnosis/realmachine-prereq）；chartfix 已由 `336a6e0`、`f4d57ba` 提交 → 闸门已自然满足 | **FAIL（已失效，需重述）** |

---

## 2 反事实结果（5 条「试图推翻」各一段）

**① registry `base-paint@0.1.0` 是否真缺那 5 个具名导出。**
我试图这样推翻：不 grep，而是**真装真 import**，并专门怀疑 `export *` 通配让符号其实存在（只是 grep 不到）。结果：`npm install base-paint@0.1.0` 后 `Object.keys(await import('base-paint'))` = **18 项**，5 个目标符号逐个 `MISSING=true`；`import { ACTION_ID_ATTR }` 直接 `SyntaxError`。反向对照：把工作区 `packages/base-render/dist` 冒充 `base-paint`，导出 **106 项**、5 个符号全在。**推翻失败 → 断言成立**，且证明修复动作只需「发布」。

**② `calorie-cmd-read` 是否真在链接期依赖 `render/copy.js`。**
我试图这样推翻：找动态 import、条件导出、或 `cmd_read` 只用到 `html.js` 的部分函数（tree-shaking 可能剔除 `copy.js`）。结果：`cmd_read.ts:41-52` 是**静态具名 import** 41 个渲染函数；`html.ts:23` 静态具名 import `copy.js` 两函数；src/dist 动态 import 计数 **0**；`exports['./cli']` 无条件分支；ESM 链接期对整图求值，无法只取一半。**决定性实测**：registry `base-paint@0.1.0` ＋ 工作区 `skill-calorie` dist 跑 `import('skill-calorie/cli')` → `SyntaxError … does not provide an export named 'ACTION_ID_ATTR'`（exit 7）；换工作区 base-paint → `CHAIN_OK`。**推翻失败 → 论证成立**，且是「装上即用」第一跳就崩，不是运行到某分支才崩。

**③ `^0.1.0` 是否真的解析不到 `0.2.0`。**
我试图这样推翻：用**真 semver 实现**（不是被审方手写的 caret 逻辑，仓库内 `semver` 不可解析），并怀疑 npm 的 `0.x` 特殊规则。结果：canonical `semver@7.8.5`（仓外装）给出 `satisfies('0.2.0','^0.1.0')=false`、`validRange('^0.1.0')='>=0.1.0 <0.2.0-0'`、`maxSatisfying(['0.1.0','0.1.1','0.2.0'],'^0.1.0')='0.1.1'`；再用**真 npm 安装**交叉验证：`npm install dsh-calorie@0.1.6` 落盘 `dsh-life-pack@0.1.1`。**推翻失败 → 断言成立**。

**④ 三处 range 的目标值是否真的最优。**
我试图这样推翻：论证 `>=0.2.0 <0.3.0` 更明确，或论证「发 patch（`base-paint 0.1.1` / `skill-calorie 0.1.2` / `dsh-calorie 0.1.7`）让 `^0.1.0` 自动生效」是更小改动。结果：
- `^0.2.0` ≡ `>=0.2.0 <0.3.0`：`validRange('^0.2.0')` 规范化就是 `>=0.2.0 <0.3.0-0`，且 `subset(^0.2.0, >=0.2.0 <0.3.0)=true` 而反向 `false` → 后者**更宽**（放行 `0.3.0` 预发布），且**不满足门禁的 `^\^` 前置**（任何 caret 正则都表达不了它）。**方案 B 被推翻**。
- patch 路线：确实能免掉 range/门禁/测试改动，但 ① 与 `.changeset` 声明的 16＋9 个 minor 冲突（本次不发就得留着或改写 changeset）；② 工作区**已经**由 `42a5b49` 把 `base-paint` 定成 `^0.2.0`，patch 路线要求**回退**该提交；③ 最致命：它救不了 `dsh-life-pack`——registry 已有 `0.2.0`，`^0.1.0` 的 maxSatisfying 恒为 `0.1.1`，而 `0.1.1` 不声明 `ilife.config-tab`（见 ⑤），故 range 仍必须改，门禁/测试照样要动。**patch 路线被推翻**。
- 结论：**推荐 `^0.2.0`（三处统一）**，理由 = 规范化最短形式、比 `>=…<…` 更窄、与仓内既有 caret 约定与门禁形态一致、且已被 `42a5b49` 的 base-paint 部分采用；代价是必须同步门禁与 4 处测试断言。

**⑤ `npm publish` 是否真的打工作树而非 git HEAD。**
我试图这样推翻：假设 npm 从 git HEAD 或 `git archive` 取内容。结果：`git ls-tree -r --name-only HEAD packages/{base-render,skill-calorie,plugin-calorie}` 的 `dist/` 计数 **0/0/0**（dist 被 `.gitignore` 忽略、根本不在 git 里），而 `npm pack --dry-run --json` 打出 `dist=68 / 392 / 32` 项 → **发布内容全部来自磁盘工作树**，与 git 状态无关。**推翻失败 → 断言成立**；附带发现：审查期间并发 session 已把 chartfix 提交（`336a6e0`、`f4d57ba`），编排者 §2.7 的「工作树脏」闸门**已自然解除**。

---

## 3 缺陷清单

| ID | 级别 | 位置 | 证据 | 最小修复 |
| --- | --- | --- | --- | --- |
| **FX-R1-1** | **S1** | 诊断 §2.3（5 项修复表）、§6.2（「门禁正则 2 处」）；走查单同缺 | 全仓硬编码 `^0.1.` 共 14 处；改 range 后**新增红**的 4 处测试断言：`packages/plugin-calorie/test/smoke.test.mjs:33,34`（`assert.match(dep['dsh-life-pack'], /^\^0\.1\./)`）、`test/plugin-p10-boundaries.test.mjs:35`（`assert.equal(dep['dsh-life-pack'], '^0.1.0')` 精确相等）、`:36`、`test/plugin-p10-install.test.mjs:44`（精确相等）。`.scratch/t75/baseline-failing.txt` 21 条**不含**这些用例 → 新失败即 delta；走查单 S6 的验收是「`pnpm test` delta 为空」→ 按现清单执行**窗口必卡** | §2.3 表增 4 行；§6.2 爆炸半径改为「门禁 2 处 ＋ 测试 4 处」；精确相等那两处改成与目标版本一致或改为版本无关断言 |
| **FX-R1-2** | **S1** | 诊断 §5（同步点表）、§9.1 A2（「编辑 6 处」） | `packages/plugin-calorie/src/slot.ts:19-20` 硬编码 `PLUGIN_VERSION='0.1.6'` / `SKILL_VERSION='0.1.1'`；`src/client.ts:56` 渲染面板版本行；`test/smoke.test.mjs:93-94` 断言它们等于两处 `package.json` 的版本 → 只改 manifest 不改此处，`pnpm test` 红，且 #123 H6 验收截图里的版本行会是旧号 | §5 增第 7 行（`src/slot.ts:19-20` → 新版本，需重建 dist）；A2 的「6 处」改「8 处」 |
| FX-R1-3 | S2 | 编排者 §2.5 末句 | 我用 registry tarball 实测：`dsh-life-pack@0.1.1` 的 `client.js`（3608B）**无** `ilife.config-tab`、`children=false`；`0.2.0`（7566B）才有；而 `dsh-calorie/src/client.ts:263` 正是 `ctx.slots.inject('ilife.config-tab', …)` | 把「链路陈旧、不属运行崩溃」改为「槽位契约耦合：range 留在 `^0.1.0` → 干净安装取 0.1.1 → 设置页静默缺席（腿 1.2 取不到证据）」 |
| FX-R1-4 | S2 | 诊断 §8 哈希证据 | 用 `.scratch/t123review-R1/untar.mjs` 解析诊断**自己的** `.scratch/t123/reg-dsh-calorie-0.1.6.tgz`：`package/dist/client.js = 13444B / 2359934f…`，与另下的 registry tarball 完全一致；而诊断引用的 `23906B / 211C8622…` 文件不在该 tarball 内 | 把 §8 的 registry 侧哈希/体积换成 `13444B / 2359934F…B09B6D`（结论不变，`L84 const inject = ["slots"]` 仍成立） |
| FX-R1-5 | S2 | 诊断 §2.1、§2.3 #3、§10.2 行 `base-paint` | `git show 42a5b49`：`-"base-paint": "^0.1.0"` / `+"base-paint": "^0.2.0"`；当前 manifest 已是 `^0.2.0`（`42a5b49` 时间 12:41:11，晚于诊断 HEAD `dfd4db6`） | 该行标注「已由 42a5b49 完成」，并把「三处 range」改「两处待改（`dsh-calorie` 的 life-pack / skill-calorie）」 |
| FX-R1-6 | S2 | 诊断 §0.5 | 自算：skill-calorie `bumps=["minor","patch"] n=21` = 16 minor + 5 patch（诊断 §1.2 亦写 16） | 把「15 个 minor」改「16 个 minor」 |
| FX-R1-7 | S2 | 编排者 §2.7 闸门 2 | `dist/charts.js` 的 `charts-bar .charts-xlabel` 在 L1614/L1626 **均为 9.5px**；dist 内 10.5px 属 `charts-value-last`/`charts-mptext`，src 同值（`charts.ts:1749,1752`）；dist mtime 12:41:33 晚于 src 12:35:57 | 删除或重写该闸门（改为「发版前强制重建并断言 `charts-xlabel` 9.5px 且 tarball 内无 10.5px 的 xlabel」） |
| FX-R1-8 | S3 | 编排者 §2.7 闸门 1 | 审查期间 chartfix 已提交（`336a6e0`、`f4d57ba`）；`git status --porcelain` 仅剩 3 个 `??` 文档 | 标注闸门已满足，保留「发版前 `git status --short -- <包目录>` 为空」作为常规检查 |
| FX-R1-9 | S3 | 编排者 §5.4 | `validRange('^0.2.0') = '>=0.2.0 <0.3.0-0'`；`subset(^0.2.0, >=0.2.0 <0.3.0)=true`，反向 `false` | 删掉「二选一」，直接写「`^0.2.0`（≡ `>=0.2.0 <0.3.0`，且更窄、且满足门禁 caret 形态）」 |
| FX-R1-10 | S3 | 诊断 §2.3 #4/#5 的修法建议 | `/^\^\d+\.\d+\.\d+$/` 会放行 `^9.9.9`，丢掉门禁原本的「同版本 caret」意图 | 改成零依赖的意图保持式断言：把 caret 的 `major.minor` 与该包本地版本比对（如 `new RegExp('^\\^' + maj + '\\.' + min + '\\.')`），并同步 4 处测试断言 |
| FX-R1-11 | S3 | 诊断 §11.1 / 附录 | 自曝两次 `pnpm --filter … build` **未持锁**；附录里 `git-status.log` 为 **0 字节**（无法作证） | 补一条持锁重跑记录；空日志重取或从证据表删除 |

---

## 4 评分表（0–100，权重按任务书 §3）

| 轴（权重） | 诊断票 `t123-release-window-diagnosis.md` | 编排者 `t123-closure-plan.md` | 真机前置 `t123-realmachine-prereq.md` |
| --- | --- | --- | --- |
| 事实准确性（35） | 30（§0.5 计数错、§2.1 range 过期、§8 哈希不可复现） | 26（§2.5 论证错、§2.7 证据过期） | 33（P-1/P-3 全部复验一致） |
| 证据可复现（25） | 21（命令/exit/版本元组齐；1 份 0 字节日志、1 处哈希对不上、build 未持锁） | 16（多为「复现：npm view…」，缺 exit 与逐条摘录） | 23（命令＋输出＋证据文件齐） |
| 结论完整性（20） | 13（漏 4 处测试断言＋2 处版本常量 → 最小修复清单不足） | 13（未提门禁/测试连带；range 清单已过期） | 18（P-4 登记了 profile range 与 junction 假绿风险） |
| 与票面一致（10） | 9（§10.4 十条偏离准确，含票面漏 base-paint） | 8（指出票面不足，但未登记门禁） | 9（P-4 四条对齐票面） |
| 风险识别（10） | 7（漏测试门禁风险与版本行风险） | 6（漏门禁/测试风险；life-pack 风险定性错） | 9 |
| **综合** | **80 → FAIL** | **70 → FAIL** | **92 → PASS** |
| 主要 S1 | FX-R1-1、FX-R1-2 | —（无 S1，但有 S2 论证错误） | — |

- **走查单 `t123-release-runbook.md`（51KB）：按派单豁免，未深审、不评分。** 抽查发现它与诊断票**同源缺口**：全文无 `slot.ts`/`PLUGIN_VERSION`/`smoke.test.mjs`/`plugin-p10-boundaries` 命中，却计划把 range 改成 `^<V_LIFEPACK>`（L310）并期望 `pnpm test` delta 为空（L382）→ FX-R1-1/FX-R1-2 同样适用于它。
- **判定门槛**：#123 发版窗口的**主要交付物（诊断票）FAIL**（80 分，且含 2 条 S1）；编排者综合 FAIL（70）。**总体判定 = FAIL**，需返修后才能进入发版执行。

---

## 5 并发合规抽检（R1 抽做；R2 全量）

| 项 | 我的命令 | 结果 | 判据 |
| --- | --- | --- | --- |
| 仓内 `npm install` 痕迹（`.scratch/t123`、`.scratch/t123w`） | `Get-ChildItem -Recurse -Directory -Filter node_modules`、`-File -Filter package-lock.json` | **t123/t123w 内零命中**；历史残留只在 `.scratch/t95*`、`.scratch/pref-test`、`.scratch/t93/wire-dist`（非本窗口） | PASS |
| `node_modules/.bin` 条目数（基线 9） | `(Get-ChildItem node_modules\.bin).Count` | **9** | PASS |
| 危险 git 命令 | 我全程只跑 `log/show/status/ls-tree/ls-files/check-ignore`（只读） | 无 `stash/checkout/reset/clean/restore/commit/push` | PASS |
| 工作区污染 | `git status --porcelain`（审查开始与结束各一次） | 开始：`42a5b49` + 4 个 `M`（chartfix，他人）；结束：`f4d57ba`，仅 3 个 `??` 文档。**我的写入只有本文件与 `.scratch/t123review-R1/**`** | PASS |
| 长命令落盘 | 所有 `node`/`npm`/`pnpm`/门禁命令均 `> .scratch/t123review-R1/run-*.log 2>&1; echo MARK=$LASTEXITCODE`，只读尾行/失败签名 | 已落 12 份 `run-*.log` | PASS |
| 被审方合规 | 诊断票 §11 自曝两次 build **未持锁**（`build-skill-calorie.log` / `build-dsh-calorie.log`）；`git-status.log` 0 字节 | 记 FX-R1-11 | S3 |

---

## 6 与编排者综合文件（`.scratch/orch/t123-closure-plan.md`）不一致之处

1. **§2.5「`dsh-calorie` 源码零 import `dsh-life-pack` → 链路陈旧，不属编译/运行崩溃」——我推翻。** 耦合不是 import 而是槽位契约：`dsh-calorie/src/client.ts:263` `ctx.slots.inject('ilife.config-tab', …)`；registry `dsh-life-pack@0.1.1` 的 `client.js`（3608B）**不含** `ilife.config-tab`、无 `children`，`0.2.0`（7566B）才有。故 range 留在 `^0.1.0` 的后果是**干净安装下卡路里设置页静默缺席**（腿 1.2 证据取不到），不是「只是陈旧」。
2. **§2.5 三处 range 现值过期**：`packages/skill-calorie/package.json:22` 已是 `^0.2.0`（`42a5b49`），不是 `^0.1.0`；待改的是 `dsh-calorie` 的两处。
3. **§2.7 闸门 2 证据不成立**：`dist/charts.js` 的 `charts-bar .charts-xlabel` 现为 9.5px（L1614/L1626），10.5px 属其它选择器且 src 同值；dist mtime 已晚于 src。该闸门需重写或删除。
4. **§2.7 闸门 1 已自然解除**：chartfix 已提交（`336a6e0`、`f4d57ba`），工作树只剩 3 个未跟踪文档。
5. **§5.4「`^0.2.0` vs `>=0.2.0 <0.3.0`」是伪选择**：semver 规范化后同域（`^0.2.0 → >=0.2.0 <0.3.0-0`），且后者更宽、且不满足门禁 `^\^` 形态。
6. **§3「随包改 range」未登记门禁与测试连带**：`tooling/check-publish.mjs:84,86` 会 2 处红（我用真门禁代码实证），另有 4 处测试断言会红（FX-R1-1）、2 处版本常量需同步（FX-R1-2）。编排者文件全文**未提** `check-publish.mjs`。
7. **§2.2「registry 0.1.0 缺符号」表述与实测一致**（我独立枚举 18 项导出，5 个缺失），此处**与编排者一致**，非分歧，仅补充「已用真实 import 证实，非 grep 推断」。
8. **§2.1/§2.6 的 registry 事实与发布时间**：`base-paint` 仅 `0.1.0`、`dsh-life-pack` 有 `0.2.0`——与我的 `npm view` 一致，**无分歧**。
