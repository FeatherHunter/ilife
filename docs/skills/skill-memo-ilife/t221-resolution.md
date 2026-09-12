## 决议

**关票**。报告落 `docs/skills/skill-memo-ilife/t221-bill-recipe.md`（231 行：§0 复核兄弟图／§1 逐件表 21 行／§2 陷阱 24 条／§3 差异点／§4 提交对账／§5 没读透 11 条 ＋ 交付对账）。只读调查：未改源码、未写 git、未动 issue。

### 兄弟图那份报告的复核结果

- 行号锚点与行数**逐条抽验全部命中**（`helpFile` 182／`helpPaths` 55／`output` 86／`wake-assets` 986／`cmd_read` 526／三个用例 146・171・93 行）。
- 六笔账单提交 sha 今天**仍指向同一批提交与文件**（都是 HEAD `60ba041` 的祖先）；但**其件清单对 `#146`／`#145`／`#144` 各漏 1／3／3 件**。
- 兄弟图的陷阱 18「`dist` 是提交进来的」**不成立**（`.gitignore` 有 `packages/*/dist/`，`git ls-files '*dist*'`＝0 件）。⇒ 下游别照抄这条。

### 五条下游必用

1. **可整块照抄三块**：`packages/skill-bill/src/output.ts:27-39`／`:42-58`／`:72-86`（`wx` 独占 ＋ `EEXIST` 递补 ＋ `resolve` 绝对路径）；常量换 `packages/skill-bill/src/render/helpPaths.ts:22`（→ `memo_html`）与文件名主体（老名 `备忘录_HELP`，出处老 `script/memo_render.py:602`——**不必改老名**）。
2. ⚠️ **出口方向相反，实施票必须先解决**：`packages/skill-memo-ilife/src/cli/cmd_read.ts:129` 在分派前**无条件 `openMemoDb`**，而 `src/fetch/db.ts:21-29` 缺目录即抛 ⇒ 只读实测 `memo.search` 退出码 4；`memo.help.lookup` 不存在（`src/render/envelope.ts:5-16` 只有 10 条命令）。账单是 `packages/skill-bill/src/cli/cmd_read.ts:493-495` **在开库之前**分派。⇒ 备忘录今天**没有库就看不了帮助**。已并进票 4（口径）与票 9（实施）。
3. **内容形态差异**：老备忘录场景多一个 `editable_fields`（老 `memo_render.py:562-567`），而共享模板**认它**（`packages/base-render/assets/help-template.html:1669`）；账单没有这个字段。横幅步骤卡可直接用（`help-template.html:1776` 读 `INIT_BANNER.steps`）。已并进票 8。
4. **两处同批必修**：`tooling/check-boundaries.mjs:37` 把 `'skill-memo-ilife'` 移出 `SKILLS_BASE_FROZEN`（否则 `:39-60` 拦下——正是票 8 的事）；`tooling/skill-html-snapshot.mjs:48` 的**备忘录条目填充器是 `fillSharedMarkers`**（其余四件是 `fillTemplate`）——**别误伤快照**。已并进票 8。
5. **两处禁手改生成物**：`packages/base-render/src/helpShell.ts`（源 `assets/help-template.html`，跑 `pnpm --filter base-paint gen:help-shell`）与 `packages/skill-bill/src/triggers/wake-assets.ts`（源 `scripts/gen-wake-assets.mjs:144-146`）；**备忘录要按 YAML 重写读取段与形状断言**（`scripts/gen-wake-assets.mjs:29-30`／`:99-118`）。已并进票 7／票 8。

### 现状三句话

老目录 `memo_html`、文件名主体 `备忘录_HELP`——**两者都无需改老名**；老侧事实源是 `references/scenarios.yaml`（8 域／13 二级组／30 场景／29 唯一唤醒词／76 个 `dimensions`）经转换层出 scene-data 契约 v1；备忘录比账单**多一层第二事实源**（老 `SKILL.md` 三张表 ＋ 新 `policy/wakewords.ts` 28 条短语）。**备忘录今天一件 HELP 交付件都没有。**

### 本票没有关掉的雾

报告 §5 列了 11 条「没读透／拿不准」；其中与目的地相关的两条（出口方向、生成器读取段）已挂到票 4／票 7／票 8／票 9，其余属下游动手时的读码量（账单的 `resolveDbPath`、卡路里三份实现），不另立票——票 4 若要判「收成共用位」，那时再读。

### 计数自证

§1 逐件表 21 行、§2 陷阱 24 条，每条带「仓内路径:行号」；§4 提交对账用只读 `git log`／`git show --stat` 逐笔核过。
