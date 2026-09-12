## 决议

**关票**。调查报告落 `docs/skills/skill-home/t184-bill-recipe.md`（22.5 KB；只读调查，未改源码、未提交、未动 issue）。其中两条会改下游票内容的硬事实，本席自己开源码复核过：

- `tooling/check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN` 确实含 `skill-home`（`:34-36` 是 #145 把 bill 移出名单时留的先例注释）。
- `packages/skill-home/src/cli/cmd_read.ts:54-56`：`dispatch` 第一行就 `resolveDbPath()` ＋ `openHomeDb(...)`——**今天说一句「居家管家 帮助」会把库建出来**。

### 下游必须知道的九条

1. **提交对账**：`#146`=848b7a4／`#145`=f312f88／`#144`=bfc51bf／`#148`=1f86e7b／`#149`=0364326／`#150`=fe1117e；`#147` 的裁决只留在源码注释里（`packages/skill-bill/src/render/helpPaths.ts:3-6`「(b) bill 自持一份最小管线」）。
2. **照抄三件**：`packages/skill-bill/src/output.ts`（`wx` 独占＋`EEXIST` 递补＋绝对路径回执）、`src/render/helpPaths.ts`（换 `HELP_HTML_DIR_NAME`＝`home_manager_html`、文件名主体＝`居家管家_HELP`）、`src/render/helpFile.ts`（`import { renderHelpShellHtml } from 'base-paint/help-shell'`，常量与文案全换）。
3. **不抄两处**：卡路里 `src/output.ts`（命令名映射／动态段／三态回退）与卡路里 `src/render/helpShell.ts`（转发件，铁律五）。
4. **两处禁手改生成物**：`packages/base-render/src/helpShell.ts`（源 `assets/help-template.html`，跑 `gen:help-shell`）与 bill 的 `wake-assets.ts`（源生成器）。
5. **边界名单**：不移出 `SKILLS_BASE_FROZEN` 里的 `skill-home`，一 import `base-paint` 就 `pnpm boundaries` FAIL → 已并进票 6（`#189`）。
6. **开库顺序**：「看帮助不许把库建出来」→ 已并进票 7（`#190`）。
7. **换行**：居家 `scripts/build-help.mjs:28` 不保检出换行（bill `:34-37` 做了）→ 已并进票 9（`#192`）。
8. **票 10（`#193`）要多抄两份**：居家侧缺 `plugin-home-ilife/src/skill-provider.ts` 与 `dsh-ctx.ts`；注册与重名退让的写法照 `plugin-bill-ilife/src/index.ts:10-35`。
9. **仍未定、不属本票**：`title`／`contact`／`version`／`init_banner` 五字段取值（票 3 `#186`／票 6 `#189`）；HELP 那几件的目录名（票 2 `#185`／票 4 `#187`）。

### 本票没有关掉的雾

报告第 4 节列了 9 条「没读透／拿不准」，其中与目的地相关的三条已挂到既有票上（第 5／6／7 条）；其余是下游动手时的读码量（bill 的 `resolveDbPath`、卡路里三份实现），不另立票——票 4 若要判「收成共用位」，那时再读。

### 计数自证

报告第 1 节 19 行逐件表、第 3 节 18 条陷阱；报告里每个结论都带「仓内路径:行号」，本席抽查两条命中。
