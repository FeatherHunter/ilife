# R2（#46）定稿：DSH 插件自带 skill 落地修法（#48 样板线记录）

定级：**断链可修**（不断链假设不成立，断链需改结构亦不成立）。
证据：已发布 `dsh-calorie@0.1.0` dependencies 仅 `dsh-life-pack: workspace:*`（无 skill 声明，`npm view` 实证）；
桥 `cliPath()` 硬拼单仓相对路径 `packages/skill-calorie/dist/...`（bridge.ts L31-L37），npm 安装态该路径不存在 → `missing-cli`。
两处各缺一件，合起来即断链；补齐即通，无需改 DSH 装配结构。

## 三选一对比（A3，先定①胜出再动手）

| 修法 | 机制 | 断链否 | 离线可用 | 维护成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| ① dependencies 声明＋按包名解析 | 单品 dependencies 声明 `skill-X ^0.1.0`（npm 传递落盘）；桥 `createRequire` 按包名定位 `skill-X/dist/cli/cmd_read.js` | 通（包管理器保证落盘＋解析） | 可（随 `dsh plugin add` 一次装全，无二次拉取） | 低（跟随 semver，changeset 联动） | **胜出，本票执行** |
| ② 随包（skill 代码打进单品包） | 单品 files 捆绑 skill dist 副本 | 通但腐（双份代码，skill 升级需重发 6 单品，envelope 漂移无人拦） | 可 | 高（N×M 发布矩阵） | 否决 |
| ③ 装时钩子（postinstall 拉 skill） | 单品 scripts 钩子装时再装 skill | 悬（DSH 装配未暴露插件安装钩子位，无处可挂；即便可挂也多一次网络） | **否（离线前提：用户环境可能离线，钩子二次拉包不可用）** | 中 | 否决 |

## ① 必须含三件（A1，缺一即不断链）

1. **加 skill 依赖**：`dsh-calorie` dependencies 追加 `skill-calorie: ^0.1.0`（正式版号）；`dsh-life-pack: workspace:*` 同步改为 `^0.1.0`。
   pnpm 机制坑（本票 CI 实证）：pnpm v9+ 起 range 默认走 registry（`prefer-workspace-packages` 已被移除，
   `.npmrc` 的 `link-workspace-packages` 亦不生效），`^` 会直接把锁文件写成 registry 地址——CI 供应链策略
   （`MINIMUM_RELEASE_AGE_VIOLATION`＋`TARBALL_URL_MISMATCH`）必红，且破坏单仓 dev 环。
   必须同步在 `pnpm-workspace.yaml` 置 `linkWorkspacePackages: true`（`preferWorkspacePackages: true` 同行），
   锁文件永保 `version: link:../x`；`pnpm add` 会顺手把 spec 改写成 `workspace:^`/exact，事后须手工对回 `^` 并以
   `pnpm install --frozen-lockfile` 验一致。不加此条，复制到其余 5 对时 CI 必重蹈。
2. **cliPath 按包名解析**：bridge.ts `repoRoot()+SKILL_CLI` 硬拼改为 `createRequire(import.meta.url).resolve('skill-calorie/package.json')`
   再拼包内 `dist/cli/cmd_read.js`；解析失败回退单仓路径，最终缺席仍由 `assertCliPresent` 抛 `missing-cli`；全程不 `import` 技能实现（只读消费 dist/CLI，spawn）。
   前提：skill 包 exports 补 `"./package.json": "./package.json"`（否则 exports 映射拦包名解析）。
3. **files 同步**：tarball 清单门禁——skill 必含 `dist/cli/cmd_read.js`（有运行时模板加载器的必含 `templates/`）；
   单品必含 `dist/index.js` + `cordis.patch.yml`。skill-calorie 无运行时模板加载（render 自包含），files 保持 `["dist"]` 即够，门禁实证覆盖。

## 版本范围策略（B②）：同版本 `^` ＋契约测试＋changeset 联动，不用 exact

- 单品声明 skill **同版本 `^`**（如 `skill-calorie ^0.1.0` 配 `dsh-calorie ^0.1.0`），随行升级不锁死。
- 不用 exact：exact 会逼 13 包锁步重发（任一 patch 即全链发版）；`^` 的漂移风险由**烟囱契约测试**在 CI 即拦
  （每单品 spawn 契约键断言 envelope `key/skill/shape/data` 全字段，见 `packages/plugin-calorie/test/smoke.test.mjs`）。
- changeset 全链联动：一次变更同时列单品＋skill（如 `.changeset/skill-landing-48-calorie.md`），`updateInternalDependencies` 自动带补丁位。

## 重发清单与新版本号（A2，`npm view` 全链实证）

已发布 0.1.0 外泄现状（`npm view <pkg> dependencies`）：6 单品 `dsh-life-pack: workspace:*` 且无 skill 声明；
6 skill `base-*: workspace:^0.1.0`；`base-combos` 同病；`dsh-life-pack/base-link-core/base-paint/ilife-skills` 四包干净。

样板线（本票）：

| 包 | 本地 | registry | 动作 |
| --- | --- | --- | --- |
| `skill-calorie` | 0.1.0＋三件 | 0.1.0（含 `base-paint: workspace:^0.1.0`） | 重发 **0.1.1**（patch） |
| `dsh-calorie` | 0.1.0＋三件 | 0.1.0（无 skill 声明） | 重发 **0.1.1**（patch） |
| `dsh-life-pack` | 0.1.0 未动 | 0.1.0 干净 | 不动，仅复核在位 |
| `base-paint` | 0.1.0（devDep 去 workspace 化，零运行时影响） | 0.1.0 干净 | 不动，仅复核在位 |

复制到其余 5 对时（待办，不在本票）：`dsh-chef/dsh-bill-ilife/dsh-home-ilife/dsh-memo-ilife/dsh-schedule-ilife`、
`skill-chef/skill-bill/skill-home/skill-memo-ilife/skill-schedule`、`base-combos` 共 11 包同法重发 **0.1.1**；
`base-link-core/ilife-skills` 干净不动。17 包总数不变（本票动 2 发 2）。
发布流：`pnpm publish:plan --live` 按 `tooling/publish-chain.mjs` 依赖序执行（publish-all 已删，此为重建流程）；
发布后 `check-publish.mjs --post` 做 registry 侧复核。

## 门禁（B③，`tooling/check-publish.mjs`＋CI `publish-gates`）

- G1 `--pre`：作用域内 package.json 整文件零 `workspace:` 命中＋单品同版本 `^` 声明抽查。
- G2 `--tarball`：`npm pack --dry-run` 清单断言（上文 files 同步）。
- G3 `--fresh-tmp`：打实包 → fresh tmp `npm install` → 安装态断言（cliPath 落 `node_modules/<skill>` 内＋SKILL 直执行＋面板路 `readViaCli` 双路打通）。
- `--post`：`npm view <pkg>@<ver> dependencies` 复核零 `workspace:`（带重试，应对复制延迟）。
- 样板期 `--only dsh-calorie,skill-calorie,dsh-life-pack,base-paint`；复制后去掉跑全量。

## 复制清单（其余 5 对逐项照抄卡路里样板）

- [ ] 5 单品 package.json：`dsh-life-pack ^0.1.0`＋`skill-X ^0.1.0`；5 skill＋base-combos 去 `workspace:`；5 skill 补 `./package.json` 导出
- [ ] 5 桥 `cliPath` 按包名解析（同 `resolveSkillCli`，仅包名常量不同）＋ `SKILL_CLI_REL` 导出
- [ ] 5 烟囱：安装布局断言＋契约键 envelope 测试（help 键各包自定，须空库安全）
- [ ] 去掉门禁/脚本/CI 中的 `--only`，跑全量 13 包；changeset 追加 11 包 patch
- [ ] 全链 `pnpm publish:plan --live`＋`--post` 复核
