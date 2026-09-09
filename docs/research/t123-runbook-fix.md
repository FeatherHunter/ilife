# #123 走查单返修报告（C4 · 对 R4 的逐条复验与落地）

- 返修对象：`docs/research/t123-release-runbook.md`（918 行 → 1057 行）；本报告是唯一新增文件。
- 复验时间：2026-09-09（本机时区）。快照：`git rev-parse --short HEAD` = `c6ba6e0`；返修前 `git status --porcelain` = 1 行未跟踪（`docs/research/t123-review-R4.md`）。
- 环境（实测）：Windows PowerShell **5.1.26100.9168**、Node `v24.19.0`、npm `10.9.2`、pnpm `11.8.0`、默认源 `https://registry.npmmirror.com`。
- 只读声明：**未跑 build/test**（未持锁）、未 `npm publish`、未仓内 install、未危险 git、**未 commit**。落盘仅 `.scratch/t123c4/`。未触碰他人文件（`.scratch/t123w`、`.scratch/t123c1`、`.scratch/locks` 只读引用）。
- 方法：R4 的每条 `FX-R4-*` 都**自己跑一遍命令**再判；R4 也有错（见 §3 反驳/更正）。

## 0 逐条结论表

| FX | R4 判定 | 我的复验（命令 → 实测） | 结论 | 改法（本单落点） |
| --- | --- | --- | --- | --- |
| FX-R4-1 | 成立 S2 | 原 `Select-String -Pattern '"\^\d'` → **4 命中**：`skill-calorie/package.json:22 ^0.2.0`、`:25 base-link-core ^0.1.0`(devDep)、`plugin-calorie/package.json:28,29 ^0.2.0`；原判据「出现 `^0.1.0` 即未改完」→ **假红中止** | **成立** | S7-2 改按依赖名筛 ＋ 打印 `$($_.Path)`；期望「4 行（name 行 + 三处 range 全 `^0.2.0`）＋ `DEVDEP-OK` 1 行」 |
| FX-R4-2 | 成立 S2 | 18 个 `powershell` 块逐个 `[scriptblock]::Create`：raw **RAW_BAD=7**（`The '<' operator is reserved for future use.`），占位符替换后 18/18 OK | **成立** | 全篇去占位符：`<X>`→全量 `--registry=…`、`<V_*>`→字面 `0.2.0`；新增 **§0.2 可解析性自检**；返修后 **RAW_BAD=0** |
| FX-R4-3 | 成立 S2 | `dist/slot.js:17,18` = `'0.2.0'`/`'0.2.0'`（mtime `13:05:39`，晚于 src `12:51:56`） | **成立** | §0.1 行改「已完成②」；S7 头部删「必须重建」；S7-4 改「先比对，不一致才重建」 |
| FX-R4-4 | 成立 S2 | `git status --porcelain` = 1 行未跟踪；`ca46495` 提交时间 **12:58:28**；`.scratch/t123c1/run-lockfile-frozen.log` = 3 行（`✓ Lockfile passes supply-chain policies` / `Done in 254ms`） | **成立（但 R4 的「已实测 exit 0」是推断）** | §0.1 标题/首句、S3 ③、S7 头部全部改为「已提交 `ca46495`」；S3 记为「**日志未落显式 exit 码**，仍以现场 exit 为准」 |
| FX-R4-5 | 成立 S3 | 原命令 **4 命中**：`:75` 注释、`:83` 定义、`:108/:109` 调用；`gate-pre` 日志含「同版本线」**2 行** | **成立** | S7-3 期望改「4 命中，`:75` 是注释」；「三行」→「**两行**」 |
| FX-R4-6 | 成立 S2 | 原命令 **3 命中**：`docs/public-installer-47.md:54,56,65`（`:65`「建议 patch 0.1.1」不在任何豁免名单）；中止判据点名该条件 → **假红中止** | **成立** | S7-6 拆三条：`SKILL.md` `0.1.1|0.1.6` 期望 0（中止判据）；发版路径 5 文件期望 0（中止判据）；旁证文档只做白名单 `{54,56,65}` 登记 |
| FX-R4-7 | 成立 S3 | 原 pattern `0\\\.2\\\.` 只匹配字面 `0\.2\.` → **6 命中且无 `skills-export-47` 行**；`-Pattern '@0\.2\.0'` → **2 命中**（`:55` 注释、`:57` 断言） | **成立** | S7-5 追加独立断言 `EXPORT47`（期望 2 命中），原命令期望改为「6 命中」 |
| FX-R4-8 | 成立 S2 | 原 S8 只有 `Select-String … | Measure-Object`（计数），**无 delta 命令**；`.scratch/t123c1/test-delta.mjs` 存在，C1 实测 `FAIL_NOW=21 BASELINE=21 ADDED=0 FIXED=0 DELTA_EMPTY=true` | **成立** | S8 加 `test-delta.mjs`（`pnpm test` 用 `Tee-Object` 单独落 `gate-test.log`），期望 `DELTA_EMPTY=true`；③ 判据改 `ADDED>0 → 中止` |
| FX-R4-9 | 成立 S3 | `npm pack --dry-run --json` ×3：`skill-calorie 400/392`、**`dsh-calorie 32/30`**、`base-paint 69/68` | **成立** | S5 表 `dsh-calorie` 改 `32 / 30`；注脚改「entryCount 随 **dist 文件数**变化」 |
| FX-R4-10 | 成立 S3 | `t123-realmachine-prereq.md:57/186/198` 阶段号确为 S11/S10/S11-0｜S11-2 | **成立（不在写入范围）** | **未改**（属其他交付物）；在走查单附录 E 登记为「跨文档待修」 |
| FX-R4-11 | 成立 S2 | 元组只有 node/npm/pnpm＋四包版本；`npm view skills@latest version` = **1.5.25**、`opencode --version` = **1.18.13**；`npm ls -g skills --depth=0` = `(empty)` **且 exit 1** | **成立（R4 建议的采集命令有坑）** | S0 新增 0-2b 采集（**用 `npm view skills@latest version`，不用 `npm ls -g skills`**——后者 exit 1 会看起来像失败）；0-3 元组加 `skills=`/`opencode=`；附录 C 同步 |
| FX-R4-12 | 成立 S3 | 独立复算同步点 = **8 个 `file:line` / 10 次**（SKILL.md 4＋public-installer:22 1＋skills-export:55,57 3＋slot.ts 2）；诊断 `:238` 写「9 次」 | **成立（不在写入范围）** | **未改**；走查单附录 E 登记 |
| FX-R4-13 | 成立 S3 | 诊断 §2.3 第 8/9/10 行确为 C1 前快照（现 `plugin-p10-boundaries.test.mjs:35` 是 `rangeOf` 兜底、`:36` 是 `for`；`plugin-p10-install.test.mjs:44` 是 `for`） | **成立（不在写入范围）** | **未改**；走查单附录 E 登记 |
| **FX-R2-6** | R4：未落地 | 诊断 `:474` 仍是 `skills@?`/`opencode@?`；走查单 0-3 元组同样缺两项 | **成立** | 走查单侧已补（见 FX-R4-11）；**诊断 `:474` 属 C2 交付物，本单无权改** → 需 C2 或编排者补一行 |

## 1 复跑命令与输出摘录（返修后复核，落盘 `.scratch/t123c4/`）

```text
PS_BLOCKS=18 PS_BLOCKS_BAD=0                      # run-parse-check-final2.log（返修前 RAW_BAD=7）
S7-2  → 4 行：skill-calorie/package.json:2,22；plugin-calorie/package.json:28,29
SKILL_RESIDUE_HITS=0                              # SKILL.md 内 0.1.1|0.1.6
RELEASE_PATH_RESIDUE_HITS=0                       # slot.ts + 三处 package.json + check-publish.mjs
DOC-WHITELIST → public-installer-47.md:54,56,65   # 白名单内，不参与中止
EXPORT47 → 2 命中（skills-export-47.test.mjs:55,57）
gate-pre-live → PRE_EXIT=0；「同版本线」2 行；check-publish --pre：PASS
npm pack → dsh-calorie entryCount=32 dist=30
dist/slot.js:17,18 → '0.2.0','0.2.0'
git status --porcelain → 1 行（未跟踪 R4 报告）；HEAD=c6ba6e0
格式：BOM=False、CRLF=0、1057 行、`##` 标题 21 个各独占一行
```

## 2 我新发现的假红／假绿（R4 漏掉，已一并返修并登记）

| ID | 级别 | 证据（我复跑/读源码） | 后果 | 改法 |
| --- | --- | --- | --- | --- |
| **FX-R4-14** | **S1** | 根 `package.json:11` `build` = **`tsc -b`**（不跑包级 build）；`packages/plugin-calorie/tsconfig.json:15-16` **排除 `src/client.ts`**；`tsdown` 只在 `packages/plugin-calorie/node_modules/.bin`（根 `.bin` 无）；包级 `build` = `build:host(tsc -b) && build:client(tsdown)`；实测 `dist/client.js` mtime `13:21:52` vs 其余 30 文件 `13:05:39` | S4 删 `dist` 后只跑根 `pnpm build` → **`dist/client.js` 不重建** → 4-5 `Select-String` 找不到文件 = **假红中止**；而 `check-publish --tarball` 只断言 `dist/index.js`／`cordis.patch.yml`，**不断言 `client.js`** → 若被忽略则**假绿**（发出缺面板 bundle 的包，只有 wizard 的 pack 检查会咬） | S4 持锁区新增 4-0：`pnpm --filter dsh-calorie run build` ＋ `DIST_CLIENT_EXISTS` 断言；②③ 加判据；S5 ③ 加 `dist/client.js` |
| **FX-R4-15** | **S1** | `SKILLS/npm-publish/SKILL.md:132`「发布命令**不要重定向输出**（`> file` 会让 stdout 非 TTY 而触发 EOTP）」；`wizard-ilife-123.sh:294/452`「输出故意不重定向」；原 S9-1 正是 `npm publish … 2>&1 \| Out-File` | 照单执行可能直接 `EOTP` 卡死在第一个包（**无法在本机实测，禁 publish**；判据来自仓内权威文档＋正在执行的 wizard） | S9-1 去掉重定向，改 `Start-Transcript` 抓屏；默认网页审批流，`--otp` 作备选；③ 增加「EOTP 先分清无 TTY / 码过期」 |
| **FX-R4-16** | **S2** | `tooling/check-publish.mjs:24,29-30` 只解析 `argv[2]` 与 `--only`；`:280` `execFileSync(npm,['view',…])` 无 `--registry` | S10 的 `--post … --registry=…` **被静默忽略** → 实际查 npmmirror：镜像滞后 = **假红**；证据口径声称核 npmjs = **假绿** | S10 用 `$env:npm_config_registry='https://registry.npmjs.org/'` 包裹（C4 实测该变量生效），用后 `Remove-Item` |
| **FX-R4-17** | **S2** | 原 S11-1 `npx … 2>&1 \| Out-File smoke-envelope.json` 后 `ConvertFrom-Json` | npx/npm 往 stderr 打进度/warn（取决于缓存状态，不可控）→ JSON 污染 → `ConvertFrom-Json` 抛错 → `SMOKE1_*` 全灭 → 按 ③ 误判「包不含落盘逻辑」= **假红中止** | S11-1 分开落盘（stdout 只写 JSON、stderr 进 `.err.log`）；③ 加「先排除假红」 |

## 3 对 R4 的反驳／更正（R4 也有错）

1. **R4 FX-R4-4 的证据不完整**：它称 `.scratch/t123c1/run-lockfile-frozen.log`「显示该命令已实测 exit 0」。该日志只有 3 行、**没有 exit 码**；「成功」是从 `Done in 254ms` 推断的。结论方向对（原句「未实测」确实低估），但本单按「日志无显式 exit → 仍以现场 exit 为准」写，不写成「已实测 exit 0」。
2. **R4 FX-R4-11 建议的采集命令会自造假红**：`npm ls -g skills --depth=0` 实测输出 `(empty)` 且 **exit 1**（本机没有全局 `skills`，它只经 `npx skills@latest` 使用）。改用它会把「正常」记成「失败」。本单改用 `npm view skills@latest version`（= `1.5.25`）。
3. **R4 §3 抽检 #13 的「无 skills-export 行」结论正确**，但 R4 未指出这条**同时也是「期望值不可由命令判定」**——本单把该断言独立成 `EXPORT47` 一条命令。
4. **R4 未发现 S4 的 `client.js` 断链**（FX-R4-14）——这是唯一会让**整个窗口卡死**且 R4 评分表未扣分的项；R4 对 S4 的抽检只跑了「只读断言」，未验证「删 dist 后能否重建」。

## 4 未落地项与理由

- **FX-R4-10／12／13**：三处都在 `t123-realmachine-prereq.md` / `t123-release-window-diagnosis.md`，**属其他交付物，本单硬约束禁止改写**。已在走查单附录 E 以「跨文档待修」登记（含正确值与落点），供 C2／编排者一次性补。
- **FX-R2-6 的诊断侧（`:474` 版本元组占位符）**：同上，未改；走查单侧已由 FX-R4-11 补全。
- **未验证项**：`pnpm build`／`pnpm test`／`publish:fresh`／`--tarball`／`--tmp-hygiene` 的 exit 码（C4 未持锁、未跑 build/test）；`npm publish` 全流程（只有维护者能做）。已实测的只读门禁：`pnpm boundaries`=0、`pnpm snapshot:check`=0、`check-publish --pre`=0。
