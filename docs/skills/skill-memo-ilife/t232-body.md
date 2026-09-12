## Question

让 DSH 真机读得到改动（照 `#150`／`#193`）。

**现状实测（2026-09-12）**：

- `plugin-memo-ilife`：profile 里已有 Junction，**回指仓库** ✓
- `skill-memo-ilife`：profile 里是 Junction 到 `.dsh-module-fallback\node_modules\skill-memo-ilife`——**票面原判「那是拷贝」有误**，见文末「票面实测更正」：整条链全是 Junction，末梢就是仓库本体 ✓
- **客户端产物已合规** ✓：`node --test test/client-bundle-48.test.mjs` 里 `dsh-memo-ilife` **3/3 绿**（产物含 `__ModuleLoader__` 注册头，12883 B）。私家大厨那张图踩过的地雷（`dist/client.js` 是 tsc 直出的裸 ESM → 一处 ESM 语法错 → 所有插件注册不上 → 整个 web GUI 起不来）**在备忘录这边不存在**，不需要先把它打成 loader 工厂包。该门当前基线 6 红全在别人家（`dsh-home-ilife` 3、`dsh-schedule-ilife` 3，都没装进任何 profile）——**动插件面前先跑这道门**。
- ⚠️ **那对断链点两处都在**：`packages/skill-memo-ilife/SKILL.md` **无 frontmatter**（首行是 `# 备忘录（memo）SKILL`）；`package.json` 的 `files` **不含 `SKILL.md`**（只有 `dist` ＋ `templates/*.html`）。这是 `#150` 在账单上实测出的同一对：缺 frontmatter → skills-cli 整包跳过 → **DSH 里根本看不到这个技能**；缺 `files` 条目 → 装上也只有 `dist`／`templates`，提供方读不到说明面 → `list` **静默返空**。本票一并修。

要做：

1. 技能提供方（照 `plugin-bill-ilife/src/index.ts:10-35` 的注册与重名退让写法；`plugin-memo-ilife` 今天只有 `bridge.ts`／`client.ts`／`contract.ts`／`dsh-ctx.ts`／`index.ts`／`settings.ts`／`slot.ts`，缺 `skill-provider.ts` 一类）。
2. 修上面那对断链点（补 frontmatter ＋ 把 `SKILL.md` 加进 `files`）。
3. profile 侧接线（Junction 可回滚），并核 `~/.agents/skills/<技能>` 是拷贝还是链接（判新旧只靠 `SKILL.md` 哈希）。
4. **收窄 `#61`**（那张票覆盖桥／面板／frontmatter／提供方与速查证据，**不含** HELP 文件交付）。

本票**无阻塞**，是 frontier 上唯一能立刻开工的实施票。

完成判据：DSH 技能表可见 `skill-memo-ilife`（名 ＋ description），且 `memo-cmd-read` 真跑拿到绝对路径。

**判据收口口径（2026-09-12 两轮复审后裁定）**：前半条**已达成**（真产物 ＋ 真 profile 解析链 ＋ 照宿主判定线逐条自查／复审员用宿主真源码复跑）；后半条**判为不在本票分界内**——`memo.help.lookup` 落在 `MEMO_KEY_SHAPES`（10 条）与 `cmd_read.ts:123` 的分派前置位置，两处都写在 `#229` 正文里，且 `#229` 的完成判据与本条**是同一句话**；`#229` 今天 `OPEN`／`0%`。**后半条并入 `#233`**，并在其验收项里显式写「`memo-cmd-read memo.help.lookup` 真跑拿到绝对路径 ＋ **跑完不建库**（`#229` 判据后半句；今天 `:123` 就抛，那条是空过的，不能当已验过）」。

- ⚠️ **票面实测更正（2026-09-12 本票实测）**：`skill-memo-ilife` 的 profile Junction **不是拷贝**——`.dsh-module-fallback\node_modules\skill-memo-ilife`（Junction）→ `plugin-memo-ilife\node_modules\skill-memo-ilife`（Junction）→ `D:\ilife\packages\skill-memo-ilife`，三条 `realpath` 全落仓库本体；三条创建时间**各不相同**（包内 2026-09-08 10:22:59／profile 2026-09-11 08:15:39／fallback 2026-09-11 17:59:07），但**全部早于本票开工日 2026-09-12**。票面那句是「只看了第一跳路径里的字样」的判读差。**故本票不改任何 Junction。**

## 进度：100%

下一步：**已关票（2026-09-12，编排会话执行）**。关票口径＝完成判据**前半条**「DSH 技能表可见 `skill-memo-ilife`（名 ＋ description）」**达成**（复审员 E 独立复现到「宿主 `validateCandidate` 真校验 ＋ 真 profile 解析链 ＋ 真 `apply`」），**后半条**「`memo-cmd-read` 真跑拿到绝对路径」判为**不在本票分界内**、**并入 `#233` 的验收项**（依据：`memo.help.lookup` 同时写在 `#229` 正文两处，`#229` 的完成判据与本条是同一句话，往本票里拽＝同时越 `#229`／`#230` 的界）。

两轮对抗式复审的整改**已全部落地并实测**（E：真机断言真伪 93/100；F：真机安全 80/100）：M1 `name` 正则收紧成宿主同值 ＋ 八个反例断言（包内 **17/17 绿**）；M2 回滚三档照抄并**实跑档 1**（7 个文件逐字节还原，另踩到 `tsbuildinfo` 增量跳编的坑并补进档 1）；M3 失败形态披露改成实测语义（静默 pending、本 profile 不可能缺失、留 `#233`）；E 的三件（入口口径纠成带空格的 `备忘录 HELP`、新增 `c.description === parseSkillText(frontmatter).description` 硬断言 ＋ 腐化副本对照实验、线上正文错数订正）全部收口。

**如实记**：`dist/client.js` 与 `dist/index.js` 的写盘时间均晚于 GUI 进程启动（00:39:56）⇒ 新增代码**从未被活插件树加载过**，本票全部安全性结论是**静态可达性 ＋ 离线真跑**，不是真机实测——这一格只有 `#233` 能填。

**留给 `#233` 的 T1–T5**：真机重启核技能表真可见／核日志无 `failed to apply loader entry dsh-memo-ilife`／判 `~/.agents/skills` 要不要建（已裁「先不建」）／判 `inject` 三连是否全需／`test/skills-provider.test.mjs:106` 那条断言在说明面落地后翻正向。**另**：报告 §9 第 4 条（`test/skills-export-47.test.mjs` 的 PKGS 要不要收备忘录）在本票**未决**，随 `#233` 一并裁。

<details>
<summary>本票实测摘要（逐条证据见 t232-install-report.md）</summary>

- 新增 `packages/plugin-memo-ilife/src/skill-provider.ts`（终态 **129 行**，照账单 `src/index.ts:10-35` 的注册与重名退让写法；形态真样板是 `plugin-calorie/src/index.ts`）；`src/dsh-ctx.ts` `git diff --numstat` = `64 1`（skills 面镜像 ＋ `connection` 镜像照实现对齐）；`src/index.ts` = `21 1`（`inject` 加 `skills`、`apply` 注册并退让）；新增 `test/skills-provider.test.mjs`（终态 **170 行／9 条全绿**）。
- 断链点①：`packages/skill-memo-ilife/SKILL.md` 补 frontmatter（**510 B** 前缀）——正文 3895 B 与 `git HEAD` 版**逐字节一致**（sha256 `0351F7AE…E37AD`）。断链点②：`package.json` 的 `files` 加 `SKILL.md`。
- 门①：动插件面前后各跑 `node --test test/client-bundle-48.test.mjs`，均 `tests 21 / pass 15 / fail 6`；`dsh-memo-ilife` **3/3 绿不变**，6 红仍是别人家（home 3＋schedule 3）。
- 装机实测：从 `~/.dsh/profiles/web` 起解析 `dsh-memo-ilife` → `dist/index.js` 真跑 `apply`，注册名 `dsh-memo-ilife`，`list` 给出唯一候选 `skill-memo-ilife`（名＋202 字简介，`bundled`／`rank 600`／`resourceBase` 落仓库本体）；候选**照宿主 `dsh-skill/lib/index.js:452-464` 的判定线逐条自查** 8 条全 PASS（复审 E 另用**宿主真源码原样抽出**的 `validateCandidate`／`validateDefinition` 跑过，10 条判定线全 PASS）。
- `pnpm doctor: PASS`、`check-boundaries: PASS`、`plugin-memo-ilife` 包内 **17/17 绿**、`memo-e2e`／`memo-split`／`plugin-p10-install`／`combos-help-80` 全绿。DSH web GUI（127.0.0.1:43120）**未重启、未杀**，仍拒绝匿名请求（401＝有服务在听）。
- **复审整改（两轮）**：① 入口口径纠形（frontmatter 触发词 → 带空格的 `备忘录 HELP`，正文逐字节零改）；② 新增「`list` 返回的 description ＝ frontmatter 实测描述」的硬断言（原先没有，正是错形能跑过去的原因）＋ 删除一条近永真断言；③ `name` 正则收紧成宿主同值 `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`（宽一格 → 宿主 `validateCandidate` 无 try → 每次模型请求崩全机技能目录）＋ 八个反例断言；④ 回滚三档序列落报告并**实跑档 1**（回滚后命中 0、门 15/6 不变、GUI 仍 401；按实测补一条「恢复须删 `tsconfig.tsbuildinfo` 强制全量重建」，否则增量跳编）；⑤ 失败形态改成「静默 pending（apply 不被调用、不抛不崩无日志）＋ 本 profile 不可能缺失 ＋ 留 #233 真机验」；⑥ `HostCtx.connection` 镜像照实现对齐。
- **如实记**：`dist/client.js` 写盘 13:10:01、`dist/index.js` 13:24:36，**均晚于 GUI 进程启动 00:39:56** ⇒ 新增代码**从未被活插件树加载过**，本票全部安全性结论是**静态可达性 ＋ 离线真跑**，不是真机实测；这一格只有 `#233` 能填。
- 唯一允许的 tracker 写操作：`gh issue edit 232`；未碰 `#220` 正文、未碰 `#61`、未 close 任何 issue、未 commit。

</details>
