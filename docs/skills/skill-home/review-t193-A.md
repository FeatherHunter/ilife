# #193 插件侧最小装机：对抗式审查 A（证伪向）

- 审查时点：2026-09-12 18:0x（只读复核；未改任何文件、未跑装机、未重启/未杀进程、未 gh 写操作）
- 被审报告：`docs/skills/skill-home/t193-install-report.md`（357 行）
- 复现方式：自己跑命令取实际输出，不采信报告数字

## 1 八条声明逐条结论

| # | 声明 | 结论 | 复核方式与实测 |
|---|---|---|---|
| 1 | dist/client.js 3541 B、首行 `window.__ModuleLoader__.load({`、无 ESM import | **复现** | `Get-Item` = 3541 B；首行逐字相符；sha256 `3ED78AB3EC…`（与报告 8 位前缀一致） |
| 2 | `test/client-bundle-48.test.mjs` 21 pass / 0 fail | **复现** | 自跑：`# tests 21 / # pass 21 / # fail 0` |
| 3 | skills-provider 7/7、smoke 7/7 | **复现** | 自跑两件各 `# pass 7 / # fail 0`（分开两次跑，未合并计数） |
| 4 | 探针：skill-home／600／dsh-home-ilife／get 正文含 home-cmd-read | **部分复现（弱）** | 未复跑探针；静态核到 `src/skill-provider.ts:22,25,28` = `dsh-home-ilife`／`skill-home`／600，`src/index.ts:14` `inject=['skills']`、`:32` 退让；探针脚本本身未落进 §7 索引 |
| 5 | package.json link 行、bundles 项、lock 3 行、两条 Junction | **复现** | profile package.json `10:` 与 `42:`；lock `29–31:`；Compare-Object 对备份 = **仅这 3 条新增**；两条 Junction `LinkType=Junction`、Target 逐字相符；且 43120 的 pid = **7404** |
| 6 | 回滚命令真能回滚 | **复现（静态）** | 备份存在（1324 B／102492 B）；两份 sha256 与报告**逐字相符**；备份解析后无 `dsh-home-ilife` 依赖、bundles 17 项（现 18）；package.json 与备份差异**恰为 3 行**（无其它漂移） |
| 7 | bill-ilife 3528 B／`69500CC607C3` 未变、未跑根 build、未重启 | **复现** | 3528 B、hash 前 12 位相符；7404 仍监听；`git status` 无构建产物改动 |
| 8 | #58 评论与「进度 100%」未发布 | **#58 复现；票面口径不成立（见 §3.2）** | `gh issue view 58` 评论数 0、updatedAt 停在 2026-09-08；但本地 `t193-body.md:11` 已为「## 进度：100%」且已 staged |

未复现/对不上的：**第 4 条的探针输出**（无独立证据文件）；**第 8 条的票面一侧**（GitHub 干净、本地票面不干净）。其余数字全部对得上。

## 2 必须回答的几项（命令＋实际输出）

- 客户端产物：3541 B，首行 `window.__ModuleLoader__.load({`（自跑）。
- 门禁：`node --test test/client-bundle-48.test.mjs` → 21 pass / 0 fail（自跑）。
- 两条 Junction：`C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\dsh-home-ilife` → Junction `D:\ilife\packages\plugin-home-ilife`；`C:\Users\辰辰洋洋\node_modules\skill-home` → Junction `D:\ilife\packages\skill-home`（`Get-Item` 实查）。
- 装机现状行：profile `package.json:10` 依赖行、`:42` bundles 末项；`pnpm-lock.yaml:29–31` 三行 link 条目（lockfileVersion 9.0，与备份一致）。
- 兄弟件对照：同目录 `dsh-bill-ilife`／`dsh-chef`／`skill-bill` 同为 Junction ⇒ 手工 Junction 是本 profile 的既有形状，不是本票新造的异类。

## 3 实际缺陷（逐条点名）

### 3.1 回滚命令确实能一键恢复 profile 侧，但有一处未覆盖（票 11 有明确兜底，风险低）

`rmdir` 两条链接 ＋ `Copy-Item` 两个备份 ＝ 把 profile 依赖项、bundles 项、lock 3 行全部还原（已验证备份内容与当前差异恰为这 3 行）。缺口：
- `.dsh-module-fallback\node_modules\skill-home` **不在回滚范围**。实测该目录**当前不存在**、兄弟件 `skill-bill` 在 ⇒ 报告 §4.2 自称「未手工建、启动器自管」与实测一致，但票 11 若照 §4.2 命令补建，回滚命令就漏了它。
- 同样漏 `.agents\skills\skill-home`（当前不存在，票面未授权，未建）。
- 仓库侧（`plugin-home-ilife\node_modules\skill-home` Junction、新 dist、根 lock）按报告声明交给 git；§5 已自陈。

### 3.2 报告自相矛盾 / 口径不实（诚实性）

- **证据索引对不上**：§2.3 明说探针是 `.scratch/home-t193/probe-provider.mjs`，但 §7 索引表里**没有这两个脚本**（表内只列 txt 日志）。「可复跑」在报告内自相矛盾。
- **票面口径已不成立**：报告（全文）默认 `t193-body.md` 未被改，而该文件 `LastWriteTime = 17:52:18`（报告 mtime 17:52:12，**+6 秒**）已被改成「## 进度：100%」并已 staged（`git ls-files -s` = `464256b…`）。撰稿人身份无法从磁盘区分（时间线上更像编排方），但「未改票面」这一条**按当前工作树证伪**。
- **§5 清单与工作树不一致**：「本席改动的件」清单里**没有** `t193-body.md`，工作树却显示它被改并 staged。
- **引用不一致**：§6① 写「照 #150 对 #59 的做法」，票面写「照 #143 对 #59 的做法」——两处指代不同，至少一处错。
- **未验写成已验（弱）**：§2.3 称两次（仓库路径／profile junction）输出「逐字段相同」。`plugin-home-ilife` 经 realpath 后两跳落在同一地址 `D:\ilife\packages\plugin-home-ilife`，该对比**证明不了 profile 侧链接那一跳**，不等于安装态已被验证。
- **「#58 收窄口径」未被门禁覆盖**：找不到针对「描述含老家 help_wake_word」之外、票面 B 项收窄文本的门禁；§6① 的正文本身无判据，只能靠人读。

## 4 风险判据：混合态下次会不会炸

- 判据一（本次写的 lock 是否被重算）：新 lock 与备份逐行相同、只多 3 行（Compare-Object：diff 数 3，全为 `=>`）。说明**没有重算依赖树**，只是按 link 条目手写 ⇒ `--frozen-lockfile` 路径能过。
- 判据二（重写链接方向）：profile `pnpm-workspace.yaml` 为 `nodeLinker: hoisted` ＋ `minimumReleaseAge: 0`；一旦跑非 frozen 的 `pnpm install`，pnpm 会按 lock 重挂链接、可能把 Junction 换成 symlink，并重排 `.bin` ⇒ 报告 §4.5「不要跑 install」的判断**有依据**；我未实跑安装，无法给出更强结论。
- 判据三（启动兼容）：Node／cordis 不区分 Junction 与 symlink，只要解析得到即可；且 `skill-home` 在 profile `node_modules` 顶层**不存在**，但 `plugin-home-ilife\node_modules\skill-home` Junction 在 ⇒ `createRequire.resolve('skill-home/package.json')` 从真实路径出发命中，provider 可解析。
- 判据四（真实断链条件）：上述命中依赖「仓库路径一直在」。换机／仓库搬走即断，而 `.dsh-module-fallback\node_modules\skill-home` 当天**不存在**（兄弟件 skill-bill 存在）⇒ 不可移植，票 11 须核。

## 5 打分（满分 100）

| 项 | 分 | 理由 |
|---|---|---|
| A 目标达成 30 | **26** | 四项产物与装机均真达成；扣 4：技能真机可见属票 11、`get` 正文未取（A3 未验）、`.dsh-module-fallback` 未建 |
| B 证据真实性 30 | **27** | 1/2/3/5/6/7 全部独立复现且数字逐字相符；扣 3：探针输出无独立证据、两次 base 对比证明不了安装那一跳 |
| C 纪律合规 20 | **19** | 无根 build、无重启（7404 实证）、未碰别家（bill 3528 B 未变）、GitHub 侧 0 评论、未关票；扣 1：报告自述的「未碰清单」与工作树不一致 |
| D 风险与遗留 20 | **16** | 回滚静态可查、缺口已说明、票 11 清单较全；扣：fallback 缺位可移植性不可忽略、探针自证 |

**总分 88 / 100 ⇒ 通过（≥85）**，但带两条整改要求。

## 6 裁决与整改要求

**通过（88 分）**，整改后合入：
1. 把 `.dsh-module-fallback\node_modules\skill-home` 与 `.agents\skills\skill-home` 写进同一段回滚说明（或标注为票 11 范围），并把 §7 缺的探针脚本路径补齐或删掉「可复跑」字样。
2. 对齐票面引用（#150 与 #143 二择一）并补一句：本地 `t193-body.md` 已由他人改为「进度：100%」（**未发布到 GitHub**，`gh issue view 193` 仍 OPEN、updatedAt 09:39:01Z）——避免与「本席未碰票面」的口径冲突。

未复现项如实标注：条目 4（探针输出）与条目 8 的票面一侧，本次**未**取得独立证据。
