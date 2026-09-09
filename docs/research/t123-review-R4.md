# #123 发版窗口 — 对抗式审查 R4（第二轮：C2 诊断返修 ＋ C3 走查单返修）

- 审查者：R4（对抗式，第二轮）；被审对象 = C2 返修后的两份文档 ＋ C3 重写的走查单/真机前置。
- 复核时间：2026-09-09 13:24–13:33（本机时区）。
- 快照锚点：**开始复核时** `git rev-parse --short HEAD` = `981a3b5`，`git status --porcelain` = **0 行**；**复核过程中 HEAD 被并发 session 推进到 `c6ba6e0`（13:29:04，R3 报告入仓）**——本文所有「实测」均以 13:24–13:33 之间的命令输出为准，凡与文件状态有关处均给出复跑命令。
- 环境（实测）：Windows PowerShell **5.1.26100.9168**、Node `v24.19.0`、npm `10.9.2`、pnpm `11.8.0`、默认 registry = `https://registry.npmmirror.com`。
- 只读声明：未改任何被审文档/源码/changeset/package.json/锁文件；未跑 build/test（**未持锁，故一次都没跑**）；未 `npm publish`；未仓内 install；未执行危险 git。写入仅限本报告与 `.scratch/t123review-R4/`。
- 并发声明：**未读** `docs/research/t123-review-R3.md` 与 `.scratch/t123review-R3/`。复核期间观察到 HEAD 移动（`981a3b5` → `c6ba6e0`）与 `.scratch/t123w/`、`.scratch/locks/` 被其它 session 使用——**未触碰、未清理他人文件**；本报告所有落盘均写 `.scratch/t123review-R4/`。
- 方法：① 逐条返修落地核对（不信任标注，去文件里找落点并复跑）；② 事实核验（与工作区当前状态比对）；③ 走查单抽检复跑 17 条只读命令；④ 18 个 powershell 块逐个 `[scriptblock]::Create`（raw 与占位符替换后两种）；⑤ 格式硬要求（BOM/换行/字面转义/标题）。

## 0 结论摘要（判定门槛）

| 项 | 结论 |
| --- | --- |
| S1 缺陷 | **0 条** |
| 综合分（四份交付物均值） | **88.8 / 100**（诊断 89、闭包计划 91、走查单 **82**、真机前置 93） |
| 总判定 | **PASS**（≥85 且无 S1）；但**走查单单项 82 未达 85 门槛**，建议先按 FX-R4-1/2/3/4/6/8/11 返修再执行 |
| 最重要的一条 | C2 的 21 条缺陷里 **20 条落地、FX-R2-6 未落地**（§9-1 版本元组的 `skills`/`opencode` 仍是占位符）；C3 的走查单**核心事实全对**（S4 六项断言、真机 junction 链、`.bin`=9、changeset 53、whoami 401、registry 版本全复现），但**有 7 处「期望值 vs 实际输出」矛盾或现状过期**，其中 2 处会**假红中止** |
| 最可能卡住的一步 | **S7-6 版本串残留检查**（命令实测 3 命中 vs 期望 0 命中，且中止判据点名该条件）——见 §10 |

## 1 C2 逐条返修落地核对表

派发未附「C2 的 14 条」原文；我按可复核的方式取**R1/R2 两轮缺陷清单的并集**（`docs/research/t123-review-R1.md:116-126` 共 11 条、`docs/research/t123-review-R2.md:148-157` 共 10 条 = **21 条**；其中 S1 4 条、S2 9 条、S3 8 条），逐条去 C2 两份文件里找落点并复跑。C2 的 `> 返修（FX-…）` 标注在诊断里 **20 处**、闭包计划里 **8 处**，共命名 **17 个**不同 ID。

| FX | 级别 | 返修落点（诊断 / 闭包计划行号） | 我的独立复核命令与摘录 | 判据 |
| --- | --- | --- | --- | --- |
| FX-R1-1 | S1 | 诊断 §2.3 第 6–10 行（L145-149）＋标注 L159；§6.2 L297/L310/L318 | 读三处测试现值：`smoke.test.mjs:33,34 = /^\^0\.2\./`；`plugin-p10-boundaries.test.mjs:34 WINDOW123`；`plugin-p10-install.test.mjs:43 LIFEPACK123` | **PASS** |
| FX-R1-2 | S1 | 诊断 §5 第 7 行（L249）＋标注 L251；A2 L440 | `slot.ts:19,20 = '0.2.0','0.2.0'`；A2 已写「8 个 `file:line`」；`smoke.test.mjs:93,94` 断言两常量 == 两处 manifest 版本（现相等） | **PASS** |
| FX-R1-3 | S2 | 闭包 §2.5 末段＋标注 L57；§2.6 标注 L65；诊断 §10.2 标注 L530 | 定性改为「槽位契约」；`src/client.ts:263` 的 `ctx.slots.inject('ilife.config-tab')` 仍在（读文件确认） | **PASS** |
| FX-R1-4 | S2 | 诊断 §8 L367-375＋标注 L369 | 标注值与 R1 一致（registry `client.js` 13444 B / `2359934F…`）——**未重新解包 tarball**（避免仓外写盘），仅核对标注内部一致性与诊断自带证据文件存在 | **PASS（转引）** |
| FX-R1-5 | S2 | 诊断 §2.1 标注 L116、§2.3 标注 L161、§10.2 L524-530；闭包 §2.5 标注 L59 | `skill-calorie/package.json:22 = ^0.2.0`（实测） | **PASS** |
| FX-R1-6 | S2 | 诊断 §0.5 L19 改 16＋标注 L21 | 诊断 §1.2 同写 16 minor + 5 patch；两处一致 | **PASS** |
| FX-R1-7 | S2 | 闭包 §2.7 闸门② L75-82＋标注 L90 | 现象句已删，改为可跑命令；我复跑 `charts-xlabel{font-size:10.5px}` 同类断言：`9.5px src=4 dist=4 MATCH`、`10.5px src=4 dist=4 MATCH`，mtime `dist 13:05:38 > src 13:00:39` | **PASS** |
| FX-R1-8 | S3 | 闭包 §2.7 闸门① 标注 L88 | 现状句已删、改为 `git status` 为空断言＋锁文件断言（我复跑：三包目录与锁文件全 CLEAN） | **PASS** |
| FX-R1-9 | S3 | 闭包 §5.4 L116-124＋标注 L124 | 伪选项已删；`^0.2.0` ≡ `>=0.2.0 <0.3.0-0` 的论证与门禁形态一致（`check-publish.mjs:81` 注释「只认 `^major.minor.patch`」印证） | **PASS** |
| FX-R1-10 | S3 | 诊断 §2.3 第 4/5 行（L143-144）＋标注 L163＋修法代码 L177-181 | `tooling/check-publish.mjs:83 assertSameVersionLine` 存在，:108/:109 调用；`:75` 注释说明旧实现已弃；实跑 `--pre --only …` = PASS | **PASS** |
| FX-R1-11 | S3 | 诊断 §11.1（L587-598）＋标注 L585；附录注 L642 | 复跑：`.scratch/t123` 下 **18 个 `.log`**、`Select-String 'MARK=|EXIT='` → **0 命中**、`git-status.log` 长度 **0**、`changeset-status.log` 尾 3 行 = `}`／空行／`Node.js v24.18.1`（无 EXIT 行） | **PASS** |
| FX-R2-1 | S1 | 诊断 A4 L442＋标注 L457 | A4 已删「可选」、写「必做第一步」＋三条 `node -e` 断言；三包实测 `0.2.0/0.2.0/0.2.0` | **PASS** |
| FX-R2-2 | S1 | 诊断 §9.0 闸门 3（L391-433）＋§2.3 第 11 行 L150＋标注 L433；闭包 §2.7 闸门③ | 静态复跑 `pnpm-lock.yaml`：`packages/skill-calorie` base-paint `^0.2.0`、`packages/plugin-calorie` dsh-life-pack/skill-calorie 均 `^0.2.0` → **不一致项 0**；另发现 `.scratch/t123c1/run-lockfile-frozen.log` 显示 `--frozen-lockfile` 已实测 **exit 0** | **PASS** |
| FX-R2-3 | S2 | 闭包 §2.7 两条闸门＋标注 L88/L90 | 同 FX-R1-7/8 | **PASS** |
| FX-R2-4 | S2 | 诊断头部锚点 L6、§2.1 标注 L116、§2.2 标注 L130、§2.3 标注 L161、§10.2；闭包头部 L7 | 两份文件均有快照锚点行；三处 range 现值实测 = `^0.2.0` | **PASS** |
| FX-R2-5 | S2 | 诊断 A5 L443（已加 `pnpm --filter base-paint build`）——**无标注** | 命令文本含 base-paint；闸门 2 断言落点见 §9.0 | **PASS（无标注）** |
| **FX-R2-6** | **S2** | **无落点**：诊断 §9.3 第 1 条（L474）仍写「版本元组 = … `skills@?` / `opencode@?` / `git rev-parse --short HEAD`」，A1–A9/H1–H6 表仍无「exit 码」列或统一命令模板 | 读 L474 原文＝占位符仍在；`docs/calorie-dual-path-acceptance.md:118` 明确要求元组含 `skills@w` / `opencode@z` | **FAIL（未落地）** |
| FX-R2-7 | S3 | 诊断 §1.4 标注 L98、附录 L642 | 同 FX-R1-11 复跑（日志尾无 EXIT 行、`git-status.log` 0 字节） | **PASS** |
| FX-R2-8 | S3 | 闭包 §3 L100-102＋标注 L102、§5.4 标注 L124 | 独立复算同步点：SKILL.md `172x1,173x2,179x1`（3 行 4 次）、`public-installer-47.md:22`、`skills-export-47.test.mjs:55x1,57x2`、`slot.ts:19,20` = **8 个 file:line / 10 次** | **PASS** |
| FX-R2-9 | S3 | 诊断 L6 锚点、闭包 L7 锚点——**无标注** | 两份文件均加「快照锚点 + 复跑命令」 | **PASS（无标注）** |
| FX-R2-10 | S3 | 诊断 §11.1 自曝＋附录——**无标注** | 两个 t123 文档已由 `981a3b5` 提交（工作树 clean）；`.scratch/locks/` 现非空（并发 session 持有），**不评价他人锁** | **PASS（无标注）** |

**小结**：21 条里 **20 条落地**、**1 条（FX-R2-6，S2）未落地且未标注**；另有 2 条（FX-R2-5、FX-R2-9）**改了但没加标注**——即 C2 声称的「逐条标注」覆盖 17/21。两条 S1（FX-R1-1/2、FX-R2-1/2）**确已落地并复跑成立**。

## 2 C3 逐条复核（走查单 + 真机前置）

派发未附「C3 的 10 条」原文；按走查单自身声明的 10 个改造点独立复核如下（若与原清单不符，以本表落点为准）。

| # | C3 声称 | 我的复核（命令 + 摘录） | 判据 |
| --- | --- | --- | --- |
| 1 | 闭包**已定案**、不再「集合 A/B 二选一」 | 读 §0 L13-32：唯一序列 `base-paint@0.2.0 → skill-calorie@0.2.0 → dsh-calorie@0.2.0`；集合 A 作废有记账；与诊断 §10.3／R1 一致 | **PASS** |
| 2 | 三条阻断前置 P-1/P-2/P-3 | P-1 复跑 `npm whoami --registry=https://registry.npmjs.org/` → `E401` / `401 Unauthorized` / `WHOAMI_EXIT=1`（与 L38 一致）；P-2 锁文件实测一致；P-3 junction 实测成立 | **PASS** |
| 3 | 阶段化 S0–S13 共 14 阶段，每阶段四要素 | 数二级标题中以 `S` 开头的 = 14 个（S0…S13）；每阶段均有①命令②期望③失败判据④证据 | **PASS** |
| 4 | **闸门增减**：新增 S3 锁文件闸门、删「二选一」 | S3 存在（L223-258），命令为 `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts` 并自带「协议 §2.1 例外项 → 持锁 + 编排者授权」提示；「二选一」已作废 | **PASS** |
| 5 | S4 强制重建 + dist↔src 一致性（6 项断言） | **不跑 build**，只复跑 S4 的 5 组只读断言：`BASE_PAINT_EXPORTS_OK=10 / BASE_PAINT_EXPORT_EXIT=0`；`CHART_STR 9.5px MATCH`、`10.5px MATCH`；`SKILL_DIST resolveDefaultHtmlPath=4 / calorie_html=10 / readFileSync=6`；`DSH_CLIENT L84 const inject = ["slots", "connection"];`；`DSH_SKILL_PROVIDER_EXISTS=True`；mtime 三包全 `FRESH`。**命令可解析、期望值与当前代码一致** | **PASS** |
| 6 | S7 以 **C1 的 `assertSameVersionLine`** 为准 | `check-publish.mjs:83` 定义、`:108,109` 调用、`:81` 注释「只认 `^major.minor.patch`」；实跑 `node tooling/check-publish.mjs --pre --only dsh-calorie,skill-calorie,dsh-life-pack,base-paint` → 末行 `check-publish --pre：PASS`，含 2 行「同版本线」（L445 写「三行」→ 见 FX-R4-5） | **PASS（表述有偏差）** |
| 7 | S7-5 四处测试断言 + S7-6 版本串 | S7-5 复跑 6 命中（`smoke:33,34`、`boundaries:34,35`、`install:43,46`）；S7-6 `SKILL.md` 命中 **0** ✓，但外部两文件命中 **3**（见 FX-R4-6/7） | **部分 FAIL** |
| 8 | S8 `pnpm test` delta 为空 | baseline 文件存在且 **21 条**；但 S8 的命令块**没有** delta 命令（只有失败签名计数）→ 见 FX-R4-8 | **FAIL（缺命令）** |
| 9 | S11/S12 真机 junction 解除 | S12-0 逐包复跑：`dsh-calorie / dsh-life-pack / skill-calorie / base-paint` 全 `link=Junction`，`dsh-better-sidebar` 真实目录；profile `dsh-calorie: ^0.1.5`、`dsh-life-pack: ^0.2.0` —— **与 L792 期望逐字一致**；`dsh plugin` 的 `--registry`/`--config.minimumReleaseAge=0` 在 DSH 侧为**透传**（`app.asar.unpacked/lib/plugin-*.js` 注释「specs, registry names, and every other pnpm argument pass through」；`pnpm-policy-*.js:19` 会把 `plugin` 子命令的该参数过滤掉，属无害） | **PASS** |
| 10 | §9 七条映射（附录 C）+ 附录 D 票面不一致 | 附录 C 20 行覆盖七条；逐条可判性见 §6——**条 1 不成立**（缺 `skills@w`/`opencode@z`） | **部分 FAIL** |

## 3 走查单抽检复跑表（17 条，全部只读、未 build）

| # | 步 | 我实跑的命令（落盘 `.scratch/t123review-R4/run-*.log`） | 输出摘录 | 与文档期望 | 判据 |
| --- | --- | --- | --- | --- | --- |
| 1 | S1 闸门 | 按 L154-171 逻辑复跑（日志改落我的目录） | `CLEAN base-render/skill-calorie/plugin-calorie/pnpm-lock.yaml`；`GATE_WORKTREE_CLEAN=PASS` | 一致 | **PASS** |
| 2 | S2-1 | `(Get-ChildItem node_modules\.bin -Force).Count` | `9` | 一致 | **PASS** |
| 3 | S2-3 | `pnpm changeset status` | `MODULE_NOT_FOUND @changesets/errors`；`CHANGESET_STATUS_EXIT=1` | 一致（文档说「已知事实，不是失败」） | **PASS** |
| 4 | S3 | `node -e` 打 manifest range ＋ 读锁文件 importer | manifest `^0.2.0`；锁文件 `specifier: ^0.2.0` ×3 | 一致 | **PASS** |
| 5 | S4-2 | `node --input-type=module -e "import * as m from './packages/base-render/dist/index.js' …"` | `BASE_PAINT_EXPORTS_OK=10`；`TOTAL_EXPORTS=106`；exit 0 | 一致 | **PASS** |
| 6 | S4-3 | `Select-String src/charts.ts vs dist/charts.js` | `9.5px src=4 dist=4 MATCH`；`10.5px src=4 dist=4 MATCH` | 一致 | **PASS** |
| 7 | S4-4/4-5 | `Get-ChildItem dist -Recurse | Select-String`；读 `dist/client.js` | `4 / 10 / 6`；`const inject = ["slots", "connection"];`；`skill-provider.js` 存在 | 一致 | **PASS** |
| 8 | S5 | `npm pack --dry-run --json` ×3（三个包目录） | skill-calorie `entryCount=400` / dist 392 / SKILL.md=True / templates=6；dsh-calorie **`entryCount=32` / dist 30**；base-paint `69` / dist 68 | skill-calorie、base-paint 一致；**dsh-calorie 不符（文档 34/32）** | **FAIL（FX-R4-9）** |
| 9 | S7-2 | 文档原命令 `Select-String -Path …package.json ×2 -Pattern '"\^\d'` | **4 命中**：`package.json:22 ^0.2.0`、`:25 ^0.1.0`(base-link-core devDep)、`:28 ^0.2.0`、`:29 ^0.2.0` | 文档期望「三行…出现 ^0.1.0 即未改完」 | **FAIL（FX-R4-1）** |
| 10 | S7-3 | 文档原命令 `Select-String -Path tooling\check-publish.mjs -Pattern 'assertSameVersionLine|0\\\.1\\\.'` | **4 命中**：L75（注释里的旧实现）、L83、L108、L109 | 文档期望「不再有硬编码（命中 0 行）」 | **FAIL（FX-R4-5）** |
| 11 | S7-3 | `node tooling\check-publish.mjs --pre --only …` | 6 行 OK ＋ `check-publish --pre：PASS` | 一致 | **PASS** |
| 12 | S7-4 | `Select-String src/slot.ts`、`dist/slot.js` | `SRC L19/20 = '0.2.0'`；**`DIST L17/18 = '0.2.0'`**（mtime 13:05:39） | 文档说 dist 仍是 `0.1.6/0.1.1`「未重建」 | **FAIL（FX-R4-3）** |
| 13 | S7-5 | 文档原命令（4 个测试文件 + `0\.1\.|0\.2\.|WINDOW123|LIFEPACK123`） | **6 命中**：smoke 33,34；boundaries 34,35；install 43,46；**无 skills-export 行** | 文档期望含「skills-export-47 为 @0.2.0」 | **FAIL（FX-R4-7）** |
| 14 | S7-6 | `Select-String SKILL.md -Pattern '0\.1\.1'` | **0 命中** | 一致 | **PASS** |
| 15 | S7-6 | `Select-String docs\public-installer-47.md,test\skills-export-47.test.mjs -Pattern '0\.1\.1'` | **3 命中**：`public-installer-47.md:54,56,65` | 文档期望「三处均命中 0 行」（注释只豁免 :54,:56） | **FAIL（FX-R4-6）** |
| 16 | S7-7 | `(Get-ChildItem .changeset -Filter *.md).Count` | `53` | 一致 | **PASS** |
| 17 | S12-0 | 逐包 `Get-Item -Force` LinkType/Target ＋ 读 profile `package.json` | 四包 `Junction`、`dsh-better-sidebar` 空；`"dsh-calorie": "^0.1.5"` | 一致 | **PASS** |
| 附 | 注册表 | `npm view <pkg> versions --json <X>` ×4 | base-paint `["0.1.0"]`；skill-calorie `["0.1.0","0.1.1"]`；dsh-calorie `…0.1.6`；dsh-life-pack `["0.1.0","0.1.1","0.2.0"]` | 与诊断/走查单一致 | **PASS** |

## 4 事实核验（派发点名 8 项，逐条实测）

| # | 断言 | 我的命令 | 实测 | 判据 |
| --- | --- | --- | --- | --- |
| 1 | 三包版本 `0.2.0` | `node -e require(…package.json).version` | `base-paint 0.2.0` / `skill-calorie 0.2.0` / `dsh-calorie 0.2.0` | **PASS** |
| 2 | 三处 range `^0.2.0` | 同上读 dependencies | `skill-calorie:22 ^0.2.0`、`plugin-calorie:28 ^0.2.0`、`:29 ^0.2.0` | **PASS** |
| 3 | `slot.ts:19-20` | 读文件 | `PLUGIN_VERSION='0.2.0'`、`SKILL_VERSION='0.2.0'` | **PASS** |
| 4 | `pnpm-lock.yaml` specifier | 读 importer 块 | 三处 `specifier: ^0.2.0`；5 个窗口外包 `dsh-life-pack ^0.1.0 → 0.1.1`（与「link=1/registry=5」一致） | **PASS** |
| 5 | `check-publish.mjs` 新断言 | 读文件 ＋ 实跑 `--pre` | `:83 assertSameVersionLine`、`:108,109` 调用；`--pre` PASS | **PASS** |
| 6 | `SKILL.md` 4 处版本串 | 逐行计数 | `0.2.0` 出现在 `172x1,173x2,179x1` = **3 行 4 次**（`0.1.1` 命中 0） | **PASS** |
| 7 | `test/skills-export-47.test.mjs` | 读 L55/L57 | `// 版本钉死 @0.2.0…`、`assert.ok(text.includes('@0.2.0'))` | **PASS** |
| 8 | `docs/public-installer-47.md:22` | 读该行 | `运行时走 npm（`skill-calorie@0.2.0` 已发布）` | **PASS** |
| 附 | 走查单新增断言 | 读 `.scratch/t123c1/run-lockfile-frozen.log` | `✓ Lockfile passes supply-chain policies … Done in 254ms`（该闸门命令**已实测 exit 0**，与走查单 L256/L914 的「未实测」不符） | **FAIL（FX-R4-4）** |

## 5 PS 5.1 可解析性（18 个 powershell 块，逐个 `[scriptblock]::Create`）

脚本 `.scratch/t123review-R4/parse-check.ps1`，日志 `run-parse-check.log`。

- **raw 解析：7 个块 FAIL**（BLOCK 1 mdL99、3 mdL186、7 mdL364、11 mdL597、12 mdL605、13 mdL633、14 mdL667），失败签名统一为 `The '<' operator is reserved for future use.`，全部来自未加引号的 `<X>` / `<V_…>` 占位符（例：`npm whoami <X>`、`npm view base-paint@<V_BASEPAINT> version <X>`）。
- **占位符替换后（`'<[^<>]+>' → PLACEHOLDER`）：18/18 OK**——C3 自己的 `.scratch/t123c3/check-ps-blocks.ps1:17` 正是这么做的，`check-ps-blocks.log` 的 `RESULT: bad=0 / total=18` **只在替换后成立**。
- 另有 3 个块（BLOCK 10/15/17）含占位符但 raw 也 OK——因为占位符在**已引号化**的 token 里（如 `--otp=<6位>`）。
- 结论：**「18 个 PS 块全部可解析」这句话对 raw 文本不成立**（见 FX-R4-2）；维护者直接粘贴会得到明确的 parse error，需先替换占位符。

## 6 §9 七条证据质量清单：走查单映射逐条可判性

七条原文 = `docs/calorie-dual-path-acceptance.md:118-124`；映射在走查单**附录 C**（L871-895，非附录 D——附录 D 是「与票面不一致」）。

| §9 条 | 走查单落点 | 逐条可判？ |
| --- | --- | --- |
| 1 可复现（命令 + exit + 版本元组 + 日期） | 各阶段命令块均有 exit 变量；`version-tuple.txt`（S0-3 L128） | **不成立**：元组缺 §9-1 要求的 `skills@w` / `opencode@z`（只有 node/npm/pnpm + 四包版本）→ FX-R4-11 |
| 2 可打开（截图含日期+版本行；HTML 存在非空含 `ilife-page`） | S11-1 `SMOKE1_HAS_ILIFE_PAGE` / `SMOKE1_FILE_EXISTS`；S13 截图落点表 | **可判**（脚本断言 + 落点） |
| 3 机器可判 | `pack` JSON、`check-publish`、`LOADTPL_OK=6` 脚本 | **可判**（但 S8 的 delta 缺脚本 → FX-R4-8） |
| 4 数据标注 | L895 口径（S11-1 真机 / S6+S11-2 隔离） | **可判**（散文标注，符合条 4 形态） |
| 5 版本一致 | `realmachine-versions.txt` + 元组 | **可判** |
| 6 零触碰 | `db-hash-before/after.txt` + `DB_HASH_MATCH` | **可判**（我复核 P-3：`calorie_data.db` 3,072,000 B / 2026-08-29 11:49:11） |
| 7 无替代品 | exit≠0 → 缺证据；字段差异 → 开票（各阶段③） | **可判** |

## 7 格式硬要求（四份文件）

字节级/UTF-8 级实测（`Get-Content` 在本环境会因 DBCS 解码**吞掉 CJK 后换行**，故行数一律用字节/`ReadAllText` 计）：

| 文件 | BOM | CRLF | LF 总数 | 行数 | 字面反斜杠-n | `##` 标题 |
| --- | --- | --- | --- | --- | --- | --- |
| 诊断 | 无 | 0 | 651 | 651 | **0** | 14 个，全部列 0 |
| 闭包计划 | 无 | 0 | 124 | 124 | **0** | 5 个，全部列 0 |
| 走查单 | 无 | 0 | 918 | 918 | **1**（L776 的命中来自 `node -e` 里双反斜杠 + `node_modules` 的 Windows 路径转义，非转义换行） | 21 个，全部列 0 |
| 真机前置 | 无 | 0 | 211 | 211 | **0** | 7 个，全部列 0 |

**判据 = PASS**（无 BOM、纯 LF、无字面转义换行、`##` 标题独占一行）。

## 8 缺陷清单 FX-R4-1…13

| ID | 级别 | 位置 | 证据（我复跑） | 最小修复 |
| --- | --- | --- | --- | --- |
| **FX-R4-1** | **S2** | 走查单 S7-2（L430-432）＋中止判据 L524 | 原命令实测 **4 命中**：`skill-calorie/package.json:22 ^0.2.0`、`:25 "base-link-core": "^0.1.0"`（devDep，正常）、`plugin-calorie/package.json:28,29 ^0.2.0`；文档写「三行…**出现 ^0.1.0 即未改完**」，L524 判「任一 range 仍指旧版本 → 中止」→ **假红中止**；且 `$($_.Filename)` 对两个同名 `package.json` 无法区分包 | 命令改 `Select-String -Path … -Pattern '"dsh-life-pack"\|"skill-calorie"\|"base-paint"'` 并打印 `$($_.Path)`；期望改「三行全 `^0.2.0`；`base-link-core`（devDep）保持 `^0.1.0` 属正常」 |
| **FX-R4-2** | **S2** | 走查单全部 18 个 `powershell` 块 | raw `[scriptblock]::Create` → **7/18 FAIL**（`The '<' operator is reserved for future use.`）；替换占位符后才 18/18 OK；S0-1 定义 `$V_BASEPAINT/$V_SKILL_CALORIE/$V_DSH_CALORIE/$V_LIFEPACK/$HEAD/$TODAY` 但 S1–S13 **全部**用 `<V_…>` 文本占位符 → 变量成死代码 | ① S0-1 增 `$X='--registry=https://registry.npmjs.org/'`，全篇 `<X>`→`$X`、`<V_…>`→`$V_…`；② 或在 §0 明写「占位符必须替换后再粘贴（PS 5.1 的 `<` 为保留运算符）」并把 C3 的 parse-check 结论限定为「替换后 18/18」 |
| **FX-R4-3** | **S2** | 走查单 §0.1 L56、S7 L402/L461、附录 E L913 | `packages/plugin-calorie/dist/slot.js:17,18 = '0.2.0','0.2.0'`，mtime **13:05:39**（晚于本单修订 12:56:19）；文档称「实测仍是 `0.1.6`/`0.1.1`（未重建）→ 本步必须重建」 | 现状句改成可判命令（`node -e "import('./packages/plugin-calorie/dist/slot.js').then(m=>console.log(m.PLUGIN_VERSION, m.SKILL_VERSION))"` 期望 `0.2.0 0.2.0`）；删「必须重建」，S7-4 的 build 降级为「若 dist 与 src 不一致才重建」 |
| **FX-R4-4** | **S2** | 走查单 L8、§0.1 标题 L42、L227、L401、L413、L914 | `git status --porcelain` = **0 行**；`ca46495` 提交时间 **12:58:28**（本单修订 12:56:19 之后 2 分钟）；`.scratch/t123c1/run-lockfile-frozen.log` 已实测该闸门 **exit 0** | 「工作树含 C1 未提交修复」「12 个 `M`」「该 exit 码仍未实测」三处改为「已由 `ca46495`(12:58) 提交，现场以 `git status --short` 为准」「该命令已实测 exit 0（C1，12:58）」 |
| **FX-R4-5** | S3 | 走查单 S7-3 L439-441、L445 | 原命令 **4 命中**，其中 `tooling/check-publish.mjs:75` 是**注释**（旧实现描述），非硬编码；`gate-pre-now.log` 只有 **2** 行含「同版本线」，L445 写「三行」 | L441 期望改「命中 `assertSameVersionLine` 定义 + 两处调用（:83/:108/:109）；:75 是注释」；L445「三行」→「两行」 |
| **FX-R4-6** | **S2** | 走查单 S7-6 L489-493 ＋ 中止判据 L524 | 原命令实测 **3 命中**：`docs/public-installer-47.md:54,56,65`；注释只豁免 :54,:56（:65「建议 patch 0.1.1」未列）；L524 判「两处外部文件仍命中 `0.1.1` → **中止**」→ **假红中止** | 命令拆两条：① `Select-String -Path packages\skill-calorie\SKILL.md -Pattern '0\.1\.1'` → 期望 0；② `public-installer-47.md` 只断言「命中行 ⊆ {54,56,65}」（白名单），并把 L524 的中止判据改成「SKILL.md 命中 ≠ 0」 |
| **FX-R4-7** | S3 | 走查单 S7-5 L479-482 | 原 pattern 的 `0\\\.2\\\.` 只匹配字面 `0\.2\.`，**匹配不到** `@0.2.0` → 6 命中里没有 `skills-export-47` 行，「期望 skills-export-47 为 @0.2.0」无法由本命令判定 | 追加 `-Pattern '@0\.2\.0'` 并期望「`skills-export-47.test.mjs:57` 命中 1 行」，或把该断言移到 S7-6 第二条命令 |
| **FX-R4-8** | **S2** | 走查单 S8 L556-561、L564、L566 | S8 只跑 `pnpm test` 再 `Select-String 'FAIL\|✖\|not ok\|AssertionError\|处红' \| Measure-Object`（出计数），**没有** delta 命令；验收却是「失败集 delta 为空」；仓内已有可用脚本 `.scratch/t123c1/test-delta.mjs`（输出 `FAIL_NOW/BASELINE/ADDED/FIXED/DELTA_EMPTY`，C1 实测 `DELTA_EMPTY=true`） | S8 增加 `node .scratch/t123c1/test-delta.mjs .scratch/t123w/gate-all-publish-test.log` 并断言 `DELTA_EMPTY=true`；`pnpm test` 的日志改用 `Tee-Object` 同时落盘供该脚本读 |
| **FX-R4-9** | S3 | 走查单 S5 期望表 L343-349 | `npm pack --dry-run --json` 实测 `dsh-calorie entryCount=32 / dist 30`，表里写 `34 / 32 文件`；且「entryCount 随版本串同步会变」的理由不成立（它随**文件数**变） | 表格 dsh-calorie 行改 `32 / 30`；注脚改「entryCount 随 `dist` 文件数变化，执行时以现场输出为准」 |
| **FX-R4-10** | S3 | `docs/research/t123-realmachine-prereq.md` L57、L186、L198 | 三处阶段号错位：L57「走查单 **S11** 已按显式版本写」实为 **S12-1**；L186「按走查单 **S10** 留 `Get-FileHash`」实为 **S11-0/11-3**；L198「走查单 **S11-0／S11-2** 已加判据」实为 **S12-0/12-2** | 三处阶段号改正（走查单 S10=发布后复核、S11=发版后冒烟、S12=真机安装） |
| **FX-R4-11** | **S2** | 走查单 S0-3 L128 ＋ 附录 C L875-876；诊断 §9.3 L474 | `version-tuple.txt` 内容只有 `node/npm/pnpm` ＋ 四包版本；`acceptance:118` 要求元组含 `skills@w` / `opencode@z`；诊断 §9.3 第 1 条仍是 `skills@?` / `opencode@?`（＝R2 FX-R2-6 未返修） | S0-3 追加 `skills=$(npm ls -g skills --depth=0)` 与 `opencode=$(opencode --version)`（或明确写「本票 N/A + 理由」）；诊断 §9.3 第 1 条同步替换占位符 |
| **FX-R4-12** | S3 | 诊断 §5 L238 | 该行写「同步点 = 8 个 `file:line` / **9 次**版本串」，同文件 L251/L263/L557 与闭包计划 L100/L102 均为 **10 次**；独立复算 = 10（SKILL.md 4 ＋ public-installer 1 ＋ skills-export 3 ＋ slot.ts 2） | L238 的「9 次」改「10 次」 |
| **FX-R4-13** | S3 | 诊断 §2.3 第 8/9/10 行（L147-149） | 这三行的 `file:line` 是 C1 前快照：`plugin-p10-boundaries.test.mjs:35,36` 现为 `rangeOf` 兜底与 `for` 循环、`plugin-p10-install.test.mjs:44` 现为 `for` 循环；C1 后落点是 `:34,38,39` 与 `:43,46`（走查单 S7-5 L474-477 已按现值写） | 表尾加注「第 6–10 行的 `file:line` 为诊断快照；C1 落地后落点见走查单 S7-5」 |

## 9 评分表

| 交付物 | 事实准确性 /35 | 证据可复现 /25 | 结论完整性 /20 | 与票面一致 /10 | 风险识别 /10 | 综合分 | 判定 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/research/t123-release-window-diagnosis.md`（C2 返修后） | 32 | 21 | 17 | 9 | 10 | **89** | PASS |
| `.scratch/orch/t123-closure-plan.md`（C2 返修后） | 33 | 22 | 18 | 9 | 9 | **91** | PASS |
| `docs/research/t123-release-runbook.md`（C3 重写） | 26 | 19 | 18 | 9 | 10 | **82** | **FAIL（单项 <85）** |
| `docs/research/t123-realmachine-prereq.md`（C3 增补） | 34 | 22 | 18 | 9 | 10 | **93** | PASS |
| **综合（四份均值）** | — | — | — | — | — | **88.8** | **PASS（≥85 且 0 条 S1）** |

扣分依据：
- 诊断（89）：FX-R2-6 未落地（-2 事实/证据）、§5「9 次」自相矛盾、§2.3 第 8–10 行行号过期。
- 闭包计划（91）：8 处标注全部落地且事实复核成立；仅「5 个窗口外包解析改 registry」仍需编排者裁定（已如实登记）。
- 走查单（82）：**4 处现状过期**（未提交/dist/exit 未测/entryCount）＋ **2 处期望与实测矛盾**（S7-2、S7-6，均可致假红中止）＋ **1 处断言不可由命令判定**（S7-5）＋ **S8 缺 delta 命令** ＋ 7/18 块 raw 不可解析。
- 真机前置（93）：P-1/P-1b/P-2/P-3 全部逐条复现（junction 3 跳、bash 5.1.16/5.2.37、`calorie_data.db` 3,072,000 B、`calories.db` 0 B），仅 3 处走查单阶段号错位。

## 10 维护者执行时最可能卡住的一步（独立判断）

**S7-6「版本串残留检查」（走查单 L489-493 + 中止判据 L524）。** 理由：

1. 命令的**期望值与实测输出直接冲突**：文档写「三处均命中 **0 行**」，实跑是 **3 命中**（`docs/public-installer-47.md:54,56,65`）。
2. 文档的**中止判据点名这一条件**（L524「`SKILL.md`／两处外部文件仍命中 `0.1.1` → **中止**」）——照做即停。
3. 注释只豁免 `:54,:56`（历史登记），**第 3 处 `:65`（「建议 patch 0.1.1」）不在豁免名单**，维护者无法判断是否算残留；且 `public-installer-47.md` 属**旁证文档**，不是本次发版产物，停在这里等于为无关历史文案放弃 2FA 窗口。

次高两位（同样可致假红/空转，建议一并返修）：
- **S7-2 依赖范围检查**（L430-432）：4 命中里 `base-link-core: ^0.1.0` 是正常 devDep，但文档判据是「出现 `^0.1.0` 即未改完」。
- **S8 delta 验收**（L556-561）：验收要求「失败集 delta 为空」，命令却只给失败签名**计数**；21 条基线名要在 112 KB 日志里手工比对——实际执行时最可能被「凑合过」，而这正是 §9-3「机器可判」的关键闸门（现成脚本 `.scratch/t123c1/test-delta.mjs` 未被引用）。

## 11 与编排者闭包计划不一致之处

1. 闭包计划 §3 L100/L102 的「8 个 `file:line` / 10 次版本串」——**我复算一致（10 次）**；但诊断 §5 L238 写「9 次」，两份 C2 文件之间不一致（FX-R4-12）。
2. 闭包计划 §2.7 闸门③「返修窗口内已完成，闸门 3 现为 PASS」——**我复跑静态一致（0 条不一致）**，且补出闭包计划未登记的更强证据：`.scratch/t123c1/run-lockfile-frozen.log` 显示该命令**已实测 exit 0**（闭包计划与走查单均把它记为「未实测」，属低估）。
3. 闭包计划 §2.7 闸门②的「返修时刻实测：命中 0、mtime 断言 True」——**我复跑同类断言成立**（`9.5px/10.5px` 均 MATCH，dist mtime 13:05:38 > src 13:00:39）。
4. 闭包计划 §2.5「5 个窗口外包解析从 link 变 registry 0.1.1，需编排者裁定」——**我复核成立**（`plugin-bill-ilife/chef/home-ilife/memo-ilife/schedule-ilife` 锁文件均为 `^0.1.0 → 0.1.1`），此项**仍未裁定**，执行走查单前应拍。
5. 闭包计划未涉及 C3 走查单的现状句（它不在闭包计划的审查范围内），但走查单 §0.1 的「C1 未提交 / dist 未重建」与闭包计划 §12.2「仍未做：持锁重建 dist」**同源过期**（FX-R4-3/4）。

## 附录：本次复核落盘（`.scratch/t123review-R4/`）

| 文件 | 内容 |
| --- | --- |
| `parse-check.ps1` / `run-parse-check.log` | 18 个 powershell 块的 raw 与替换后 `[scriptblock]::Create` 对照 |
| `rerun.ps1` / `run-rerun.log` | S1/S7-2/S7-3/S7-4/S7-5/S7-6/S7-7/S12-0 + 锁文件 + `.bin` + 基线复跑 |
| `s4check.ps1` / `run-s4.log` | S4 的 5 组只读断言 + dist 文件清单 + mtime |
| `run-npm.log` | `npm whoami`(401)、默认 registry、四包 registry 版本 |
| `run-pack.log` | 三个包 `npm pack --dry-run --json` 的 entryCount/dist/SKILL.md/templates |
| `run-prereq.log` | P-1b junction 逐跳、P-2 bash 版本、P-3 真库路径与文件 |
| `run-last.log` | `git ls-files dist`=0、`.gitignore:2`、`pnpm changeset status` exit 1 |
