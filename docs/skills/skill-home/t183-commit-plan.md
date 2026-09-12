# 地图 #183 改动面的提交拆分建议（编排方拟，**未执行**）

- 状态：本图全部改动**仍未提交**；本文件只是建议，执行与否由维护者定。
- 惯例：照仓里既有提交信息（`<type>(<scope>): #<issue> <中文摘要>`，例：`feat(base-paint,skill-calorie): #247 …`）。

## 一、先说三条会影响拆分的事实

1. **`packages/skill-home/package.json` 一处文件被三张票碰过**：`test` 串（票 5 起、票 8 加件）＋ `base-paint` 依赖（票 6）＋两条 `gen:help-assets` 脚本（票 5）。**严格按票拆要 `git add -p` 手工分块**——不值得；建议随「主交付」一次提交，在信息里点明它承载的三处。
2. **`pnpm-lock.yaml`** 同理（票 6 的 `base-paint` 链接、票 10 的 tsdown）。
3. **别家会话在途 1 件**：`docs/skills/skill-schedule/t197-验收汇报与待决策.html`（**不属本图，别一起提**）。

## 二、建议的六次提交（按「一次一件事」）

| # | 建议信息 | 主要件 |
|---|---|---|
| 1 | `feat(skill-home): #188 内容资产入库（老骨架 yaml 入库＋机器生成资产＋生成器三件＋契约锁）` | `src/help/scenarios.yaml`／`src/help/helpAssets.ts`／`scripts/gen-help-assets.mjs`／`scripts/lib/{help-assets,yaml-subset}.mjs`／`test/help-assets.test.mjs`／`AGENTS.md` |
| 2 | `feat(skill-home): #189 #190 渲染接线＋出口与命名落盘（缺省＝HELP 文件，速查走 mode）` | `src/help/helpFile.ts`／`manifest.ts`／`output.ts`／`index.ts`／`src/cli/cmd_read.ts`／`tooling/check-boundaries.mjs`／`package.json`／`pnpm-lock.yaml` |
| 3 | `chore(base-combos): #190 登记 home.help.lookup＋重生成 present＋重写快照` | `packages/base-combos/{combos.yaml,src/present.ts}`／`test/combos-p8.test.mjs`／`packages/ilife-skills/skill.snapshot.json` |
| 4 | `test(skill-home): #191 交付面真 spawn 锁（11 用例，含 ④⑥ fail-closed）` | `test/help-delivery-190.test.mjs`（＋`package.json` 的 test 串若愿分块） |
| 5 | `docs(skill-home): #192 SKILL.md 说明面（HELP 交付节＋安装器运行时节＋description 订正）＋ build-help 保检出换行` | `SKILL.md`／`scripts/build-help.mjs`／`test/skills-export-47.test.mjs` |
| 6 | `feat(plugin-home-ilife): #193 插件侧最小装机（技能提供方＋客户端产物修复＋DSH profile 装机）` | `packages/plugin-home-ilife/**`（8 件）＋`pnpm-lock.yaml`（tsdown 那几行） |

**为什么这么拆**：① 1 与 2 分开＝「内容」与「行为」两件事，回滚时能只退其一；② 3 单列＝它动的是**共享包的产物与快照**，影响面与技能包不同，出问题时最好一眼定位；③ 4、5 单列＝测试与文档各自成件，符合仓里 `test:`／`docs:` 先例；④ 6 单列＝票 10 那批与 HELP 交付无耦合（可独立回滚）。

## 三、提交前**必须**先跑的四条（本图新建的门都在里面）

```powershell
cd D:\ilife
node tooling/check-boundaries.mjs                 # 期望 boundaries: PASS
node tooling/write-snapshot.mjs --check           # 期望 OK（改了 base-combos 必须重写快照）
node --test test/combos-p8.test.mjs               # 期望 9/9
node --test test/skills-export-47.test.mjs        # 期望 5/5
node packages/skill-home/scripts/gen-help-assets.mjs --check   # 期望 exit 0
cd packages\skill-home; npm test; cd ..\..        # 期望 26/26（资产锁＋交付锁＋scaffold）
```

（CI 另有 `pnpm build`／`pnpm doctor`／`pnpm snapshot:check`／`pnpm snapshot:html:check`；本图期间 `snapshot:html:check` 实测 186 件产物 changed/added/removed 全 0。）

## 四、已知的「别家一起被带走」风险

提交时若用 `git add -A` 或 `git commit -a`，会**连带提交**别家会话的在途件（上表第三节那条 schedule 文档，以及工作区里若有其它会话新写的件）。**建议按上面的表逐组 `git add <具体路径>`**，提交前用 `git status --short` 过一眼。
