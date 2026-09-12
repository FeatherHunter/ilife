## Question

让 DSH 真机读得到改动（照 `#150`／`#193`）。

**现状实测（2026-09-12）**：

- `plugin-memo-ilife`：profile 里已有 Junction，**回指仓库** ✓
- `skill-memo-ilife`：profile 里是 Junction 到 `.dsh-module-fallback\node_modules\skill-memo-ilife`——那是**拷贝**，不回指 `D:\ilife` ✗ → 仓库改完到不了真机
- **客户端产物已合规** ✓：`node --test test/client-bundle-48.test.mjs` 里 `dsh-memo-ilife` **3/3 绿**（产物含 `__ModuleLoader__` 注册头，12883 B）。私家大厨那张图踩过的地雷（`dist/client.js` 是 tsc 直出的裸 ESM → 一处 ESM 语法错 → 所有插件注册不上 → 整个 web GUI 起不来）**在备忘录这边不存在**，不需要先把它打成 loader 工厂包。该门当前基线 6 红全在别人家（`dsh-home-ilife` 3、`dsh-schedule-ilife` 3，都没装进任何 profile）——**动插件面前先跑这道门**。
- ⚠️ **那对断链点两处都在**：`packages/skill-memo-ilife/SKILL.md` **无 frontmatter**（首行是 `# 备忘录（memo）SKILL`）；`package.json` 的 `files` **不含 `SKILL.md`**（只有 `dist` ＋ `templates/*.html`）。这是 `#150` 在账单上实测出的同一对：缺 frontmatter → skills-cli 整包跳过 → **DSH 里根本看不到这个技能**；缺 `files` 条目 → 装上也只有 `dist`／`templates`，提供方读不到说明面 → `list` **静默返空**。本票一并修。

要做：

1. 技能提供方（照 `plugin-bill-ilife/src/index.ts:10-35` 的注册与重名退让写法；`plugin-memo-ilife` 今天只有 `bridge.ts`／`client.ts`／`contract.ts`／`dsh-ctx.ts`／`index.ts`／`settings.ts`／`slot.ts`，缺 `skill-provider.ts` 一类）。
2. 修上面那对断链点（补 frontmatter ＋ 把 `SKILL.md` 加进 `files`）。
3. profile 侧接线（Junction 可回滚），并核 `~/.agents/skills/<技能>` 是拷贝还是链接（判新旧只靠 `SKILL.md` 哈希）。
4. **收窄 `#61`**（那张票覆盖桥／面板／frontmatter／提供方与速查证据，**不含** HELP 文件交付）。

本票**无阻塞**，是 frontier 上唯一能立刻开工的实施票。

完成判据：DSH 技能表可见 `skill-memo-ilife`（名 ＋ description），且 `memo-cmd-read` 真跑拿到绝对路径。

## 进度：0%

下一步：读 `plugin-memo-ilife` 现状与 `#61` 票面，报第一步影响清单后动手。
