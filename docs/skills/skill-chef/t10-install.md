# 票 10／11 交付报告：插件侧最小装机（技能提供方＋DSH profile；收窄 #57）

- **票**：[#218 私家大厨HELP（10/11）插件侧最小装机（技能提供方＋DSH profile；收窄 #57）](https://github.com/FeatherHunter/ilife/issues/218)
- **地图**：[#208 私家大厨HELP](https://github.com/FeatherHunter/ilife/issues/208)（本图唯一无阻塞的实施票）
- **日期**：2026-09-12
- **目的地口径**：在 DSH 对 AI 说「私家大厨help」→ 明确拿到 help HTML 文件。**本票只负责插件侧**（DSH 真机认得 `skill-chef`、`chef-cmd-read` 运行时可解析），**不实现 HELP 渲染与落盘**（那是票 6／7）。

---

## 第一步 · 影响清单（事前报，动手前写就）

新增或改动 **9 个文件**，逐行指向**一个**能力：

| # | 文件 | 一句话 | 碰它的理由 |
|---|---|---|---|
| 1 | `packages/plugin-chef/src/dsh-ctx.ts`（新增） | 宿主 skills 面的最小镜像，type-only | 提供方要 `ctx.skills.registerProvider` 的类型；照 `plugin-bill-ilife` 同形 |
| 2 | `packages/plugin-chef/src/skill-provider.ts`（新增） | 打包技能提供方：`list` 给摘要、`get` 给全文 | 让 DSH 里的 agent 知道有 `skill-chef` 这个技能 |
| 3 | `packages/plugin-chef/src/index.ts`（改） | `inject` 加 `skills`、`apply` 注册提供方并重名退让；去掉 `./client.js` 的值导出 | 接线提供方；值导出在客户端产物变成 loader 工厂包后会让插件树启动期直接抛（#150 血教训） |
| 4 | `packages/plugin-chef/src/client.ts`（改） | 补 loader 契约要的 `inject`（空数组）与 `apply`（占位空实现） | 仓库自带门 `test/client-bundle-48.test.mjs` 就按这条契约写 |
| 5 | `packages/plugin-chef/tsdown.config.ts`（新增） | 客户端打包配置：loader 工厂包（browser/CJS ＋ 注册包装） | 装进 web profile 的前置条件（#150 事故：裸 ESM 让整条客户端脚本死） |
| 6 | `packages/plugin-chef/tsconfig.client.json`（新增） | 客户端面的独立 typecheck 工程 | 与 `tsdown.config.ts` 同一件事的另一半 |
| 7 | `packages/plugin-chef/package.json`（改） | `build` 改 `build:host && build:client`，加 `typecheck`，加 `tsdown@0.22.14` | 照 `plugin-bill-ilife` 逐件同形 |
| 8 | `packages/plugin-chef/test/skills-provider.test.mjs`（新增） | 提供方 8 例（含两处实测断链点的锁与名字一致性锁） | 把本票的回路钉死 |
| 9 | `packages/skill-chef/{SKILL.md, package.json}`（改） | `SKILL.md` 补 frontmatter；`files` 补 `SKILL.md` | 缺 frontmatter＝skills-cli 整包跳过；缺 `files` 条目＝安装态提供方读不到说明面（实测的两处断链点） |

**装机侧（非源码，全部可回滚）**：`~/.dsh/profiles/web/{package.json, pnpm-lock.yaml}`、**四个链接位**（profile 的 `node_modules/skill-chef`、profile 的 `node_modules/dsh-chef`、profile 的 `.dsh-module-fallback/node_modules/skill-chef`、`~/.agents/skills/skill-chef`）。

**明确不碰**：`packages/skill-calorie/**`（别的会话在改）、`skill-home`／`skill-schedule`／`plugin-home-ilife`／`plugin-schedule-ilife`、`tooling/check-boundaries.mjs` 的 `SKILLS_BASE_FROZEN`（移出名单是票 6 的事）。

## 第二步 · 结构设计（事前报）

新增的目录树（插进 `packages/plugin-chef/`，与 `plugin-bill-ilife` 同形）：

```
packages/plugin-chef/
├── src/
│   ├── dsh-ctx.ts          ← 新增：宿主 skills 面最小镜像（type-only，零运行时）
│   ├── skill-provider.ts   ← 新增：打包技能提供方（只读消费 SKILL.md 文本）
│   ├── index.ts            ← 改：cordis 形态 name/inject/apply ＋ 对外导出
│   └── client.ts           ← 改：浏览器侧入口（补 inject/apply 占位）
├── test/
│   ├── smoke.test.mjs              （不动）
│   └── skills-provider.test.mjs    ← 新增
├── tsdown.config.ts        ← 新增
├── tsconfig.client.json    ← 新增
└── package.json            ← 改
```

**每个文件的职责与对外给什么（数得出，各不超过 5 个公开件）**：

| 文件 | 职责 | 对外给什么 |
|---|---|---|
| `src/dsh-ctx.ts` | 只描述宿主 `ctx.skills` 那一面的形状 | 6 个 **interface**（`SkillInvocationPolicy`／`SkillCandidate`／`SkillDefinition`／`SkillProvider`／`SkillsFace`／`SkillHostCtx`），**全是类型，构建期擦除，零运行时** |
| `src/skill-provider.ts` | 读技能包的 `SKILL.md`（文本），给出候选摘要与全文 | 7 个：常量 `PROVIDER_NAME`／`SKILL_NAME`／`BUNDLED_SKILL_RANK`／`SKILL_FILE`，函数 `skillDir()`／`parseSkillText()`，对象 `provider` |
| `src/index.ts` | 插件入口：声明依赖、注册提供方 | cordis 三件（`name`／`inject`／`apply`）＋ 转发既有导出（`slot`／`settings`／`bridge` 各件＋本票新增的 `skill-provider`／`dsh-ctx` 转发） |
| `src/client.ts` | 浏览器侧入口（占位） | 7 个：`CLIENT_COMPONENT`／`CLIENT_METHOD`／`inject`／`apply`／`mountSingleClient`／`openSingleClient`／`requestReadViaHost`，＋ 1 个 type `HostCaller` |

**共用件被哪两个能力用**：本票**没有新增共用件**。`skill-provider.ts` 只往技能包里**读文本**（`SKILL.md`），从不 import 任何技能实现；技能包与插件包之间的唯一接口面就是那个文件路径（按包名解析）。铁律一（能力自治）的判据在此成立：`skill-provider.ts` 里的东西全属 `dsh-chef` 一个能力。

**名字出处（铁律四）**：目录／文件名沿用 `plugin-bill-ilife` 与 `plugin-calorie` 已有的 `skill-provider.ts`／`dsh-ctx.ts` 两个名字，不自创。铁律二的落地：技能包名**只写一处**（`src/bridge.ts` 的 `SKILL_PACKAGE`），`skill-provider.ts` 引用它，不在第二个文件里再写一遍 `'skill-chef'`。
> ⚠️ **2026-09-12 对抗式审查改正：这句话为假。** 实测 `packages/plugin-chef/src/skill-provider.ts:25` **另有一处硬写** `export const SKILL_NAME = 'skill-chef' as const;`（与 `bridge.ts` 的 `SKILL_PACKAGE` 各一处，grep 单引号字面量确认）。**缓解措施已在**：`test/skills-provider.test.mjs:111` 有「`SKILL_NAME` 与 `SKILL.md` frontmatter 逐字一致」的锁，能防两者漂移；但「只写一处」这个结构断言**不成立**，如实记录，不粉饰。

**目录层级**：本票**不新建目录层级**，也不碰三个以上能力（只碰 `plugin-chef` 与 `skill-chef` 两个能力，其中 `skill-chef` 只动两个文件的两行）。按 `structure.md`「新建目录层级、或者要碰三个以上能力时，等用户点头再动」——本票两条都不触发，故按票面开工。

### 第四步 · 超线报警（实测：不触发）

本票改到的 7 个源码文件实测行数：`skill-provider.ts` 125、`bridge.ts` 95（未改）、`dsh-ctx.ts` 56、`index.ts` 49、`tsdown.config.ts` 47、`slot.ts` 47（未改）、`client.ts` 43、`settings.ts` 20（未改）。

**`packages/plugin-chef/` 当前没有行数告警线**：该目录下没有 `AGENTS.md`，全树搜「告警线」在该包内零命中（`docs/skills/skill-chef/map-chef-body.md` 的「告警线」一节只给 `packages/skill-chef/` 定了 **350 ＋ LF 口径**，且那条要写进 `packages/skill-chef/AGENTS.md`——那是本图别的票的事）。按 350 这个现成数字衡量，本票最大的新件 `skill-provider.ts` 125 行、`plugin-chef` 最大的件 `bridge.ts` 95 行，**均未超线**，故第四步不报警。

---

## 改了什么（逐文件）

### 仓库内代码

| 文件 | 改了什么 |
|---|---|
| `packages/plugin-chef/src/dsh-ctx.ts` | **新增**（56 行）。照 `plugin-bill-ilife/src/dsh-ctx.ts` 同形，仅改注释里的出处票号（`#56 卡路里样板，#150 记账同形，#218 大厨同形`）。skills 面出处逐条记：`ctx.skills.registerProvider`＝`dsh-skill/lib/index.js:147`；candidate 校验红线＝`validateCandidate` 同文件 `:452`；`get` 回定义须与候选同名＝同文件 `:259`（均在 `docs/agents/dsh-client-contract.md` §12）。 |
| `packages/plugin-chef/src/skill-provider.ts` | **新增**（125 行）。`PROVIDER_NAME='dsh-chef'`、`SKILL_NAME='skill-chef'`、`BUNDLED_SKILL_RANK=600`（内联，零依赖）、`SKILL_FILE='SKILL.md'`。`skillDir()` ＝ `createRequire(import.meta.url).resolve(SKILL_PACKAGE + '/package.json')` 再取目录（**不复制**，不走 `exports` 子路径）；`content` 取 frontmatter 后正文；`source='bundled'`；`resourceBase` 给目录。`parseSkillText` 的 name 正则 `/^[\p{L}0-9]+(?:-[\p{L}0-9]+)*$/u` 放行 `skill-chef` 这种连字符名。 |
| `packages/plugin-chef/src/index.ts` | `inject` 由 `[]` 改 `['skills']`；`apply(_ctx: unknown)` 改 `apply(ctx: SkillHostCtx)`：建 logger → `ctx.skills.registerProvider(() => skillProvider)` → 重名退让（`already registered` 时 `warn` 留痕，他错重抛）；**删掉 `export { CLIENT_COMPONENT, CLIENT_METHOD, mountSingleClient, openSingleClient, requestReadViaHost } from './client.js';` 这一整行值导出**（`export type { HostCaller }` 当时保留）；补 `skill-provider` 与 `dsh-ctx` 的转发导出。**※ 2026-09-12 结构拆雷时该 type 导出也一并删除**——它是把 `client.ts` 拉进宿主 `tsc -b` 编译程序的唯一一根线，留着就等于留着覆写 `dist/client.js` 的路。详见文末「结构拆雷记录」。 |
| `packages/plugin-chef/src/client.ts` | 新增 `export const inject: readonly string[] = []` 与 `export function apply(): void {}`（占位空实现，注释写明真接线属 #57），照 `plugin-bill-ilife/src/client.ts` 同形。 |
| `packages/plugin-chef/tsdown.config.ts` | **新增**（47 行）。与 `plugin-bill-ilife` 逐字同形，只改 `PLUGIN_ID = 'dsh-chef'`；注释把「为什么必须有这一步」记成 #150 事故复盘。 |
| `packages/plugin-chef/tsconfig.client.json` | **新增**。与 `plugin-bill-ilife` 同形，`include` 收 `src/{client,slot,settings,bridge,dsh-ctx}.ts`。 |
| `packages/plugin-chef/package.json` | `scripts.build` 由 `tsc -b` 改 `npm run build:host && npm run build:client`；加 `build:host`／`build:client`／`typecheck`；加 `devDependencies: {"tsdown": "0.22.14"}`。 |
| `packages/plugin-chef/test/skills-provider.test.mjs` | **新增**（8 例）。照 bill 的 6 例同形（inject 声明／只注册一个／list 摘要与单份 `SKILL.md` 同源／get 全文＋过期候选失效／重名退让／说明面与路由表不漂移），另加两把锁：**打包清单必须带 `SKILL.md`**、**`SKILL_NAME` 常量与 `SKILL.md` frontmatter 实测值逐字一致**。description 覆盖断言从 `skill-chef/policy` 的 `WAKE_TABLE` 抽（37 条逐条过）。 |
| `packages/skill-chef/SKILL.md` | 首行前插入 frontmatter：`name: skill-chef` ＋ `description`（带头词「私家大厨HELP」，其后 37 条唤醒词全部逐条入 description）。唤醒词**不手抄**——由 `scripts/add-frontmatter-218.mjs` 从 `src/policy/wakewords.ts` 的 `WAKE_TABLE` 机械抽取拼成。正文一字未改。无 BOM、无 CRLF。 |
| `packages/skill-chef/package.json` | `files` 由 `["dist","templates/*.html"]` 改 `["dist","templates/*.html","SKILL.md"]`。 |
| `packages/skill-chef/scripts/add-frontmatter-218.mjs` | **新增**（一次性脚本，幂等，住包内 `scripts/`）。做上面那件事；保留作为凭据（重跑即幂等）。 |

**分界守住**：`skill-chef` 仍是纯粹普通技能——零 DSH 代码、零 DSH 依赖；本票只动它的 `SKILL.md` 与 `files` 两处。

### 装机（DSH 真机，全部可回滚）

| 动作 | 细节 | 备份 |
|---|---|---|
| profile 依赖 | `~/.dsh/profiles/web/package.json` 的 `dependencies` 加 `"dsh-chef": "link:D:/ilife/packages/plugin-chef"` | `package.json.bak-218`（1148 B，= 改动前那一份） |
| profile 装配 | 同文件 `dsh.profile.bundles` 数组末尾加 `"dsh-chef"`（位置：`… dsh-bill-ilife, dsh-calorie, dsh-memo-ilife, dsh-chef`） | 同上 |
| lockfile | `dsh plugin --profile web install` 重算，记 `link:D:/ilife/packages/plugin-chef` | `pnpm-lock.yaml.bak-218`（102012 B） |
| 运行时解析（profile） | `~/.dsh/profiles/web/node_modules/skill-chef` → **Junction** → `D:\ilife\packages\skill-chef`（原先不存在，无需备份） | — |
| 运行时解析（回退位） | `~/.dsh/profiles/web/.dsh-module-fallback/node_modules/skill-chef` → **Junction** → `D:\ilife\packages\plugin-chef\node_modules\skill-chef`（我先建成直指仓库包，随后**被 `dsh plugin install` 改指到这条一跳中转**；两者 realpath 都是 `D:\ilife\packages\skill-chef`，实测同一个目录，见下） | — |
| agent 侧发现 | `~/.agents/skills/skill-chef` → **Junction** → `D:\ilife\packages\skill-chef`（原先只有 `skill-bill`／`skill-calorie`） | — |
| 仓库 lockfile | 加 `tsdown` 到 `packages/plugin-chef` 的 devDependencies 后跑 `pnpm install --offline` | `D:\ilife\pnpm-lock.yaml.bak-218` |

`dsh plugin --profile web install` 实测输出：`Packages: +2`（`dsh-chef` 与 `skill-chef` 两个链接位）→ `Done in 2s using pnpm v11.8.0`。安装后 `node_modules/dsh-chef` 确为 Junction → `D:\ilife\packages\plugin-chef`。收尾时**再跑一次**确认可重复：`Already up to date` / `Done in 204ms`（`--offline` 与联网都不是必需，本次两次都在本机既有存储上完成，未访问网络）。

**回滚方法（逐条可执行）**：

```powershell
# 1) profile 两文件回滚（依赖、装配、lockfile 一次还原）
Copy-Item 'C:\Users\辰辰洋洋\.dsh\profiles\web\package.json.bak-218'    'C:\Users\辰辰洋洋\.dsh\profiles\web\package.json'    -Force
Copy-Item 'C:\Users\辰辰洋洋\.dsh\profiles\web\pnpm-lock.yaml.bak-218'  'C:\Users\辰辰洋洋\.dsh\profiles\web\pnpm-lock.yaml'  -Force
# 2) 拆**四个**链接位（rmdir/Junction 只删链接、不动目标；四个位置改前都实测不存在，故拆掉即回到原状）
cmd /c rmdir "C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\skill-chef"
cmd /c rmdir "C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\dsh-chef"
cmd /c rmdir "C:\Users\辰辰洋洋\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-chef"
cmd /c rmdir "C:\Users\辰辰洋洋\.agents\skills\skill-chef"
# 3) 【B 席改正 3 补：原回滚块到此为止，不完整】把 node_modules 拉回与锁文件一致
#    跑完 1)、2) 之后，node_modules 里可能仍留着 dsh-chef／skill-chef 的残留链接位，
#    与已回滚的 package.json、pnpm-lock.yaml 不再一致。让包管理器按锁文件重算一次：
dsh plugin --profile web install
#    （本票**没有执行**这一步——它属回滚路径，执行前先确认上两条 Copy-Item 已生效。）
#    若不便跑插件命令，就手工核对：删净 profile\node_modules\{dsh-chef,skill-chef}
#    两条 Junction 后，node_modules 应与回滚后的 pnpm-lock.yaml 一致（其余条目本票未动）。
# 4) 重启 DSH 实例后生效
```

> **关于两份 lockfile 备份的归属（B 席改正 3 附带澄清）**：`D:\ilife\pnpm-lock.yaml.bak-218` 属**源码侧**（备份的是往 `packages/plugin-chef` 加 `tsdown` devDependency 后重算的**仓库**锁文件），**不在 profile 回滚路径上**，回滚 profile 时**不需要**动它；profile 侧要还原的是 `~/.dsh/profiles/web/pnpm-lock.yaml.bak-218`。两份同名不同物，别混。

**没有留备份的项及原因（如实）**：四个链接位的目标都是仓库包本身，拆链接不动仓库；建链接前那四个位置**实测都不存在**，故无需备份（若将来发现过陈旧拷贝的现场，照 #150 先例应备份为 `<名>.bak-<日期>` 再换，本机不是这种情况）。

---

## 门（逐条贴实测输出）

### 门 1 · `node --test test/client-bundle-48.test.mjs`

**修前（本票开工基线，实测）**：`tests 21 / pass 12 / fail 9`——3 个包各 3 例红：`dsh-chef`／`dsh-home-ilife`／`dsh-schedule-ilife`。

**修后（实测）**：

```
✔ dsh-chef client：classic 执行并注册自身 id（#48 整批 crash 回归）
✔ dsh-chef client：factory 可物化，导出 apply/inject，无 node 依赖
✔ dsh-chef client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像）
✖ dsh-home-ilife client：classic 执行并注册自身 id（#48 整批 crash 回归）
✖ dsh-home-ilife client：factory 可物化，导出 apply/inject，无 node 依赖
✖ dsh-home-ilife client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像）
✖ dsh-schedule-ilife client：classic 执行并注册自身 id（#48 整批 crash 回归）
✖ dsh-schedule-ilife client：factory 可物化，导出 apply/inject，无 node 依赖
✖ dsh-schedule-ilife client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像）
ℹ tests 21
ℹ pass 15
ℹ fail 6
```

**结论**：9 红 → **6 红**，`dsh-chef` 三例转绿。剩下 6 例属 `dsh-home-ilife`／`dsh-schedule-ilife`——**预存**，不在本票范围（票面明示不要碰）。

修后 `dsh-chef/dist/client.js` 首三行：

```
window.__ModuleLoader__.load({
	id: "dsh-chef",
	factory: (require) => {
```

### 门 2 · `node --test packages/plugin-chef/test/*.test.mjs`

```
✔ #218 打包技能提供方（大厨线）
✔ dsh-chef 烟囱
ℹ tests 15
ℹ pass 15
ℹ fail 0
```

### 门 3 · `node --test packages/skill-chef/test/*.test.mjs`

```
ℹ tests 24
ℹ pass 24
ℹ fail 0
```

（没有为了让它绿去改别的技能的 `SKILL.md`；也没有跑仓级 `pnpm test`。）

### 门 4 · `npx tsc -b`

```
（无输出）
exit=0
```

### 门 5 · `npm run boundaries`

```
OK: skill-chef 依赖闭包不含 base-*（实得：无）
OK: skill-home 依赖闭包不含 base-*（实得：无）
OK: skill-schedule 依赖闭包不含 base-*（实得：无）
OK: skill-memo-ilife 依赖闭包不含 base-*（实得：无）
OK: 未迁移技能源码／模板不 import base-*（命中：无）
boundaries: PASS
exit=0
```

**现状如实记录**：`skill-chef` **仍在** `tooling/check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN` 名单里（`['skill-chef','skill-home','skill-schedule','skill-memo-ilife']`），本票**没有动它**——本票不使用共享 help 模板，移出名单是票 6 的事。
> **注记（行号是 HEAD 版，不是报告之错）**：引的 `:37` 四元素版是 **HEAD** 版；工作树现为 **`:41` 三元素**（`['skill-chef','skill-home','skill-memo-ilife']`，`skill-schedule` 已被**另一个会话按 #199 移出**）。A 席改正 5 已记此事，B 席 2026-09-12 复核确认工作树现状即 `:41` 三项。`npm run boundaries` **PASS 结论不受影响**（本票一件未碰该文件）。

### 门 6 · `npm run snapshot:html:check`

```
OK: 5 技能 HTML 快照 == 实际（185 件产物，base-* 指纹 6fb8f1117564334955005b5f2a3352f1，base-* 文件 26 件）
RESULT: artifacts=185 changed=0 added=0 removed=0 base-* fingerprint=6fb8f1117564334955005b5f2a3352f1
exit=0
```

### 门 7 · `npm run snapshot:check` —— **红，且已证明与本票无关（预存）**

```
FAIL: 快照过期（文件 0.1.0@932e7b250d278d50 ≠ 实际 0.1.0@ef9b16473d03cf19），请跑 pnpm snapshot 重写
exit=1
```

**归因证据（不是猜）**：`tooling/write-snapshot.mjs:18` 的 sha 只由**三样**算出——`packages/ilife-skills/package.json` 的 version ＋ `packages/base-combos/combos.yaml` ＋ `packages/base-combos/src/present.ts`。这三样本票**一件都没碰**。逐值重算：

```
HEAD 三源 sha        = 932e7b250d278d50   ← 与快照文件里那份逐字相同
快照文件里的 sha     = 932e7b250d278d50
工作树三源 sha       = ef9b16473d03cf19   ← 就是门报的那个「实际」
```

即：**快照文件与 HEAD 一致**，是工作树里 `combos.yaml`／`present.ts` 有别的会话的未提交改动（`git diff --stat`：`combos.yaml +5`、`present.ts +1`）把 sha 推走了。**本票不动、也不该动这两份文件**（不属于本票范围），故如实记为预存红。

---

## 真机证据

### 8a · `dsh --profile web --dump-config` 含 `# == dsh-chef`

```
# == dsh-bill-ilife
- id: dsh-bill-ilife
  name: dsh-bill-ilife
# == dsh-calorie
- id: dsh-calorie
  name: dsh-calorie
# == dsh-memo-ilife
# == dsh-chef
- id: dsh-chef
  name: dsh-chef
```

### 8b · 提供方 `list` / `get` 回路（在 profile 上下文里跑）

两个解析锚点都实测落在同一个真目录（**其中回退位那条 Junction 的目标在 install 时被 pnpm 改指过**，故两个锚点都验一遍）：

```
anchor = node_modules/dsh-chef/dist/index.js
  resolve -> D:\ilife\packages\skill-chef\package.json
  realpath-> D:\ilife\packages\skill-chef\package.json
  SKILL.md 在 = true
anchor = .dsh-module-fallback/node_modules/skill-chef/dist/index.js
  resolve -> D:\ilife\packages\skill-chef\package.json
  realpath-> D:\ilife\packages\skill-chef\package.json
  SKILL.md 在 = true
```

用一个 `createRequire` 锚在 `~/.dsh/profiles/web/node_modules/dsh-chef/dist/index.js` 的脚本，复刻 bridge 的解析姿势：

```
resolve(skill-chef/package.json) = D:\ilife\packages\skill-chef\package.json
skillDir                         = D:\ilife\packages\skill-chef
SKILL.md 真在                    = true
cmd_read.js 真在                 = true
host exports                     = 34
host name                        = dsh-chef
host inject                      = ["skills"]
SKILL_NAME                       = skill-chef
PROVIDER_NAME                    = dsh-chef
RANK                             = 600
list.length                      = 1
list[0].name                     = skill-chef
list[0].rank                     = 600   source = bundled   provider = dsh-chef
resourceBase                     = {"kind":"directory","path":"D:\\ilife\\packages\\skill-chef"}
descr.head                       = 「私家大厨HELP」→chef.help.lookup 查怎么办；唯一出口 chef-cmd-r
get.name                         = skill-chef   content.bytes = 6984
get.content head                 = # 私家大厨（chef）SKILL |  | 本地菜谱：搜菜/查看/加菜、跟着做（烹饪步
get.content 含 chef-cmd-read     = true
```

**另一条当场实证**：本会话（正在跑的那个 DSH agent 进程）的可用技能目录**在装完 Junction 之后当场多出了 `skill-chef`**，条目文字即上面那份 description（带头词「私家大厨HELP」＋ 37 条触发词）。这条不需构造桩，是同一进程里的发现层真读到了。
> ⚠️ **2026-09-12 对抗式审查 B 改正：上一条不能当插件侧的真机证据。** 技能目录当场多出 `skill-chef`，走的是 **`~/.agents/skills/skill-chef` 这条目录发现路**——DSH 按目录热读，与本票新写的 `ctx.skills.registerProvider` **不是同一条路**。两条路互相独立：目录发现在**进程运行中**就能读到新目录，而提供方注册只在**插件装配期**发生一次。
>
> **时间线实测（编排方与 B 席各测一次，读数一致）**：本 GUI 的 host（pid 31252）启动于 **2026/9/12 00:39:56**；`dsh-chef` 进 profile 是 **11:27:39**（`pnpm-lock.yaml` 落盘时刻，`package.json` 11:27:35）——**host 比它早约 10 小时 48 分**。插件装配在 host 启动时就已经走完，**晚 11 小时才进 profile 的 `dsh-chef` 不可能被这个进程装配过**。
>
> **⇒ 结论：插件半（`skill-provider.ts` 的 `ctx.skills.registerProvider`）尚未在本 GUI 生效。** 上面 8b 节那段 `list`／`get` 回路是**在 profile 上下文里另起脚本**跑出来的，它只证明「产物与解析正确」，**不证明**「本 GUI 已装载提供方」。**票 11 必须重启 DSH 后复验**（重启前此条一律按未生效记）。
>
> **另一条同类证据也不能用（如实记）**：B 席查过 host 日志 `%APPDATA%\DSH Desktop\logs\host\dsh-2026-09-12.log`，对 `dsh-chef` **0 命中**——但**对照组里 `bill`／`calorie`／`memo`／`dshmarket`／`prompt` 也全是 0 命中**（这些是已经跑起来的老插件）。⇒ 该日志**不按包名记录装载**，0 命中既不能证明「没装载」，也不能证明「装载了」，**这条不能当证据**。

### 8c · `chef-cmd-read` 运行时可解析

```
cliPath  = D:\ilife\packages\skill-chef\dist\cli\cmd_read.js     ← 与 bridge.resolveSkillCli() 同形解析出来
cli 真在  = true
exit     = 0
envelope.key = chef.help.lookup   shape = list   total = 37
```

**如实记录一处未做到（见「不确定项」第 1 条）**：`chef-cmd-read` **不在系统 PATH 上**。本机 PATH 上只有 `calorie-cmd-read`（`D:\2Study\nodejs\` 下有一份手工 shim），`bill-cmd-read`／`memo-cmd-read` 也都只在 `node_modules/.bin` 里、没进 PATH。本票**没有**在 `D:\2Study\nodejs\` 里造 shim（那是仓库外的系统目录，票面划的边界是「只碰 `packages/plugin-chef/**` … `~/.agents/skills/**`」）。

### 8d · 探针实例（**GUI 不崩的证明**，最重要的一条）

起法：`dsh --profile web --port 3081 --no-open`（后台作业起，验完即停；**全程没碰用户正在用的 43120**，收尾时复核 `127.0.0.1:43120 LISTENING pid=31252` 仍在）。

起服务期日志（无一处「插件树挂」）：

```
[bundled] provider registered at …\dsh-mattpocock-skills-deck\bundled-skills rank 600 (25 skills expected)
dsh web: http://127.0.0.1:3081/?token=…
[info]: [ 'client ready' ]
[info]: [ 'event-dispatch is ready' ]
```

页面与组合包（把 boot 清单里的 67 个模块**逐个抓下来**落盘再数，`.scratch/chef-help/probe-modules/`）：

```
页面 http 状态        = 200   字节 = 351404
页面含 __DSH_BOOT__   = True
页面含 Failed to load = False
boot.entries 总数     = 67
含 dsh-chef 段        = True
dsh-chef url          = /plugins/??dsh-chef/client.js&rev=5694c703b4eeb23e-54
含 dsh-bill-ilife 段  = True

--- dsh-chef/client.js（探针实际返回的那一份）---
字节数          = 3557
LOAD 注册数     = 1
注册 id         = dsh-chef
行首 ESM 处数   = 0
node: 导入      = 0
首行            = window.__ModuleLoader__.load({
含 client.ts 标记 = true

--- 全 manifest 汇总（67 个模块）---
落盘模块数      = 67
字节总数        = 16663701
LOAD 注册总数   = 68
行首 ESM 总处数 = 0
异常模块        = @deepseek-ai/dsh-client-modules:LOAD=2 | dsh-mattpocock-skills-deck:注册id=undefined | dsh-vision-router:注册id=undefined
```

> **注（B 席点出，非矛盾）**：上面 `dsh-chef/client.js` 那行的 `字节数 = 3557` 是**探针服务端返回**的字节数（本节已写明是「探针实际返回的那一份」），**在盘** `packages/plugin-chef/dist/client.js` 是 **3511**。差的 46 字节是 DSH 供片时把 `sourceMappingURL` 改写成**绝对地址**所致——**内容同一份**，不是两个版本，也不是报告前后打架。2026-09-12 结构拆雷复核时在盘值仍为 **3511**（sha256 `7EDF7A88EB693CE48A73C34F170B947A05EEF23BFDEAAAED2D9D59AFC6BD02FF`）。

**逐条判读**：

- **行首 ESM 0 处**（16,663,701 字节里一处都没有）——`#150` 那条事故链路（一处 ESM 语法错 → 整条脚本不执行 → 所有插件注册不上）在本次装机下**不复现**。
- `LOAD 注册总数 = 68` 对 67 个模块，多出来的那 1 是 `@deepseek-ai/dsh-client-modules` 自注册两次（它是模块系统自举件，实测如此）；**不是**重复注册的插件。
- 两个 `注册id=undefined` 的模块（`dsh-mattpocock-skills-deck`／`dsh-vision-router`）是它们自己的注册头写法与前 65 个不同（正则取不到 `id: "…"`），两件的 `LOAD` 注册数都恰好是 1、行首 ESM 都是 0，**不是异常**。
- 探针实例**已停**（收尾复核 `port 3081 free`）。

---

## 第五步 · 交付对账

第一步清单 9 行，逐行对实际：

| # | 第一步写的 | 实际碰到 | 偏差 |
|---|---|---|---|
| 1 | `packages/plugin-chef/src/dsh-ctx.ts` 新增 | 新增 56 行 | 无 |
| 2 | `packages/plugin-chef/src/skill-provider.ts` 新增 | 新增 125 行 | 无 |
| 3 | `packages/plugin-chef/src/index.ts` 改 | 改（`inject`＋`apply`＋导出行），49 行 | 无 |
| 4 | `packages/plugin-chef/src/client.ts` 改 | 改（补 `inject`／`apply`），43 行 | 无 |
| 5 | `packages/plugin-chef/tsdown.config.ts` 新增 | 新增 47 行 | 无 |
| 6 | `packages/plugin-chef/tsconfig.client.json` 新增 | 新增 14 行 | 无 |
| 7 | `packages/plugin-chef/package.json` 改 | 改（scripts＋devDependencies） | 无 |
| 8 | `packages/plugin-chef/test/skills-provider.test.mjs` 新增 | 新增 8 例 | 无 |
| 9 | `packages/skill-chef/{SKILL.md, package.json}` 改 | `SKILL.md` 加 frontmatter；`package.json` 的 `files` 加一项 | 无 |

**清单外实际多碰的两件（如实报，不藏）**：

1. `packages/skill-chef/scripts/add-frontmatter-218.mjs`（**新增**，一次性脚本）——第一步清单里**没写**。它是第一步第 9 行的做法件：唤醒词不手抄，从 `WAKE_TABLE` 机械抽取拼 description。住包内 `scripts/`（合 `structure.md`「一次性脚本住包内 `scripts/`」）。**这是一处事前没报的偏差，如实标出。**
2. `D:\ilife\pnpm-lock.yaml`（**改**，留 `pnpm-lock.yaml.bak-218`）——第一步清单里**没写**。为了让新加的 `tsdown@0.22.14` devDependency 真链上（`packages/plugin-chef/node_modules/tsdown` → `.pnpm` 存储），跑了 `pnpm install --offline`。**同样是一处事前没报的偏差。**

**第五步结论**：第一步 9 行**全部有着落、零偏差**；另有 **2 处清单外改动**已在上表逐条标出（一处源码 `scripts/` 脚本、一处仓库 lockfile），非静默偏差。

---

## 收窄 #57（第 11 项）

照 #150 对 #59 的做法，**三处**收窄（标题／正文／评论）：

- **标题**：`chef复制样板线（桥＋面板＋frontmatter＋提供方＋双路证据）` → `chef复制样板线（桥＋面板＋双路证据）`；
- **正文**：顶部加「范围收窄（2026-09-12，地图 #208 票 10）」注记，指向 #218 与 `docs/skills/skill-chef/t10-install.md`；`Destination` 里那两句（`SKILL.md` 补 frontmatter／提供方达 parity 且真机可见）移出并加括号说明；`下一步` 与`范围`两节同步去掉这三项；
- **评论**：[#57 comment](https://github.com/FeatherHunter/ilife/issues/57#issuecomment-5643215760)，含三行对照表（原属 #57 ↔ 现落点 #218）、两处断链点的说明，外加一条**给 #57 的前置提醒**：`dist/client.js` 现在由 tsdown 产出，改 `src/client.ts` 后要跑 `npm run build:client`，不能只跑 `tsc -b`。
> ⚠️ **2026-09-12 对抗式审查 B 改正：这条提醒把触发面写窄了，已改口径。** 原文说成「改了 `client.ts` 忘了跑 `build:client`」，实际是——**只要单跑一次 `tsc -b`，它就会重写 `dist/client.js`**（把它从 loader 工厂包覆写成 tsc 直出的裸 ESM），**改 `src/` 下任何文件都触发**，不必碰 `client.ts`。危险面也不止「忘了跑 `build:client`」这一种：仓级 `npm run build` 与 `npm run test:types` **本身就是 `tsc -b`**（根 `package.json:11`／`:12`，根 `tsconfig.json:22` 引到 `./packages/plugin-chef`），所以最普通的仓级构建就是这条雷的引爆器。
>
> **⇒ 结构性拆雷已于 2026-09-12 完成**（本次改正的同一批工作）：修完后**任何人任何一次单跑 `tsc -b` 都不再能覆写 `dist/client.js`**，实测留证见文末「结构拆雷记录」。**原提醒的那句「不能只跑 `tsc -b`」现已不再成立**，`#57` 那条评论下已追加一条评论更正（见文末）。

**边界守住（复核实测）**：`state = open`、`comments = 1`、`blocked_by = {"blocked_by":0,"total_blocked_by":0,"blocking":0,"total_blocking":0}`——**状态未改、阻塞边未建**。

---

## 不确定项与未做到的事（如实，不粉饰）

1. **`chef-cmd-read` 不在系统 PATH 上（未做到）**。本机 PATH 上只有 `calorie-cmd-read`。票面给的口径是「确认 PATH 上有这个命令（profile 的 `node_modules/.bin`，或照 bill 的『PATH 全局短路』形态）」——实测两条都不成立：profile 的 `.bin` 里**没有** `chef-cmd-read`（`skill-chef` 是我用 Junction 手工接的，pnpm 没为它建 shim），而 bill 自己也**没有** PATH 全局短路（`bill-cmd-read` 只在 `~/.dsh/profiles/web/node_modules/.bin` 与 `~/node_modules/.bin` 里）。`~/node_modules/.bin/chef-cmd-read.cmd` 是存在的，但它所在目录不在 PATH 上。**我没有在 `D:\2Study\nodejs\` 造 shim**（票面划的只读边界不含那个系统目录）。**插件侧不受影响**：`bridge.ts` 是按包名解析出绝对路径再 spawn（实测 exit 0＋envelope 全字段），从不依赖 PATH。**若要让 agent 在对话里直接敲 `chef-cmd-read`，需要另开一件事**（照 `calorie-cmd-read` 的样子放一份 shim 进 `D:\2Study\nodejs\`）。

2. **profile 的 `node_modules/.bin/chef-cmd-read` 缺失（未做到）**。`skill-chef` 进 profile 靠的是我手工建的 Junction，pnpm 没把它的 `bin` 收进来；`skill-bill` 之所以在 `.bin` 里有，也不是本次 install 建的（是更早留下的）。要让 pnpm 建 shim，得把 `skill-chef` 变成 profile 的**直接依赖**（会动 profile 的依赖面，超出本票划的范围）。

3. **`npm run snapshot:check` 红（预存，非本票引入）**。已按上面的「归因证据」证明：快照文件与 HEAD 一致，红的来源是工作树里 `combos.yaml`／`present.ts` 的他人未提交改动。**我没有跑 `pnpm snapshot` 去重写**（那会把那两份他人改动的结果写进快照，越过本票范围）。

4. **`dsh-home-ilife`／`dsh-schedule-ilife` 各 3 例仍红（预存，不在本票范围）**。票面明示不要碰，如实记为预存。修法与 chef 这次完全相同（补 `tsdown` 打包＋去宿主 `./client.js` 值导出＋`client.ts` 补 `inject`/`apply`）。

5. **两个 `注册id=undefined` 的探针模块没能进一步定位**。`dsh-mattpocock-skills-deck` 与 `dsh-vision-router` 的注册头写法与前 65 个不同，我的正则取不到 id；两者的 `LOAD` 注册数都恰好为 1、行首 ESM 都是 0，判为「不是异常」。**这是判读，不是证明**——没有去读这两个包的构建配置确认它们为何不同。

6. **`pnpm install --offline` 改动了仓库 `pnpm-lock.yaml`**。已留 `D:\ilife\pnpm-lock.yaml.bak-218`。我没有 `git add`／`git commit`（票面明示由你统一处理）。

7. **`packages/skill-chef/scripts/add-frontmatter-218.mjs` 是事后可删的一次性脚本**。保留是为让那次 frontmatter 注入可复现（幂等）。若你的口味是不留一次性脚本，删掉它不影响任何门（`SKILL.md` 已经是注入后的样子）。

8. **`~/.agents/skills/skill-chef` 这条 Junction 不在票面点名的边界里**。票面给的只读边界是「`packages/plugin-chef/**`、`packages/skill-chef/{SKILL.md,package.json}`、`~/.dsh/profiles/web/**`、`~/.agents/skills/**`」——`~/.agents/skills/**` 确实在列，且第 9 项明确点了这个 Junction。此处**没有越界**，写出来只为让账目完整。

9. **`.dsh-module-fallback/node_modules/skill-chef` 这条 Junction 的目标被 pnpm 改指过（事后才发现，如实记）**。我建的时候直指 `D:\ilife\packages\skill-chef`；装完并跑过 `dsh plugin --profile web install` 之后，它变成指向 `D:\ilife\packages\plugin-chef\node_modules\skill-chef`（那也是一条 Junction → 同一个仓库包）。**两个锚点 realpath 都是 `D:\ilife\packages\skill-chef`，实测解析与 `SKILL.md` 读取都正常**，故功能上无差别。它的成因（是谁、什么时候改的方向）**我没有进一步查证**，只把实测到的事实与校验结果记在这里。事后为确认可重复，**又跑了一次 `dsh plugin --profile web install`**（实测 `Already up to date` / `Done in 204ms`），三个 Junction 的方向**与上一致、未被重置**。
> ⚠️ **2026-09-12 对抗式审查 B 改正：这不是异常，是标准形状。** B 席实测回退位里 **`skill-bill`／`skill-calorie`／`skill-memo-ilife` 全都是同形一跳中转**——都指向 `D:\ilife\packages\plugin-<件>\node_modules\skill-<件>`（`dsh-chef` 这条与它们逐字同形）。连 `base-link-core`／`base-paint` 也指向 `C:\Users\辰辰洋洋\node_modules\skill-bill\node_modules\…`。⇒ 这是 `dsh plugin install` 给**所有**这类包建的**标准形状**，**不是本票装歪了，也不是异常**。原文那句「成因未查证」的口气可以撤掉：无异常可言，也不必再查。**实操含义**：以后看到这类一跳中转不要当成问题去「修」它。

10. **`.scratch/` 与 `pnpm-lock.yaml.bak-218` 未纳入版本控制**。凭据件落在 `.scratch/chef-help/`（该目录是既有约定，本图的地面真相六份证据也在这里）；`pnpm-lock.yaml.bak-218` 是回滚用的临时件。两者都没有 `git add`。`docs/skills/skill-chef/` 下有本图别的票留下的未跟踪文件（`?? docs/skills/skill-chef/`），本票只往里新增了 `t10-install.md`。

11. **⚠️ 插件半尚未在本 GUI 生效（B 席硬伤 2；最重要的一条未做到）**。本 GUI 的 host（pid 31252）启动于 **2026/9/12 00:39:56**，`dsh-chef` 进 profile 是 **11:27:39**——**host 比它早约 10 小时 48 分**，插件装配期早已过去。故 **`ctx.skills.registerProvider` 这个提供方在被测 GUI 里从未被装配过**；报告 8a／8b／8c 三节证明的是「产物正确、解析正确、profile 配置正确」，**都不能替代「重启后真的装载了」**。**⇒ 票 11 必须重启 DSH 后复验**：重启后确认提供方 `dsh-chef` 出现、`list` 返回 `skill-chef`。**在重启复验之前，本票只能算「配置已就位」，不能算「已生效」。**（附带如实记：host 日志 `%APPDATA%\DSH Desktop\logs\host\dsh-2026-09-12.log` 对 `dsh-chef` 0 命中，但 `bill`／`calorie`／`memo`／`dshmarket`／`prompt` 这些**已经跑起来的老插件也全是 0 命中** ⇒ 该日志不按包名记录装载，**这条不能当证据**，两头都不能。）

12. **⚠️ 还有第四份 `skill-chef` 拷贝，且 `chef-cmd-read.cmd` 正指着它（B 席点出；实测复核）**。`C:\Users\辰辰洋洋\node_modules\skill-chef` 是 **2026-09-07 16:40 的普通目录**（`LinkType=[]`，**不是** Junction），内容只有 `dist`／`templates`／`package.json`，**无 `SKILL.md`**，`package.json` 里 `files` 缺 `SKILL.md` 且 **`base-link-core@^0.1.0` 是旧 pin**。关键：`C:\Users\辰辰洋洋\node_modules\.bin\chef-cmd-read.cmd`（336 B）里写的是 `"%dp0%\..\skill-chef\dist\cli\cmd_read.js"`——**它指的就是这份 09-07 的陈旧拷贝**，不是仓库包。
    **今天不在发现路上**（提供方走 `createRequire` 从 profile 上下文解析，实测落到 `D:\ilife\packages\skill-chef`），**但只要走「把 `~/node_modules\.bin` 加进 PATH」这条捷径，就会踩到它**：`chef-cmd-read` 会去跑那份没有 `SKILL.md`、依赖旧 pin 的老拷贝。
    **⇒ 硬提醒：PATH 方案别走 `~/node_modules\.bin`。**（本票不确定项 1 记的 PATH 缺口仍在；若将来要补，照 `calorie-cmd-read` 的样子在 `D:\2Study\nodejs\` 放 shim，指向**仓库包**，不要启用 `~/node_modules\.bin`。）

13. **⚠️ 票 9（#217）补「HELP 交付」节时的解析器约束（B 席点出，报告原缺）**。提供方的 frontmatter 是**自写最小解析器**（`packages/plugin-chef/src/skill-provider.ts:46-67`，宿主零依赖、不引 yaml），两条硬约束：
    - `:48` 要求 frontmatter **必须在文件头**（`text.startsWith('---\n')`）；
    - `:54` 的 `^([A-Za-z0-9_-]+):\s*(.*)$` 要求 frontmatter 里**每一行都是 `键: 值`**。
    **⇒ 票 9 若把 `description` 折行（YAML 的 `>`／`|` 块标量）或加嵌套键，`:55` 直接 `return null`——`list` 会静默返空：不抛错、不记日志，技能从目录里消失。** 兜底是 `test/skills-provider.test.mjs:97-104`（description 须覆盖 `WAKE_TABLE` 全部唤醒词）与 `:111-116`（`SKILL.md` 须有合法 frontmatter、`name` 与 `SKILL_NAME` 逐字一致）——**门会红，但票 9 得知道去跑这一门**。（已在 `#57` 评论下追加提醒，见文末。）

14. **⚠️ 给票 6／7／11 的两条验收尺子（B 席点出，报告原缺）**：
    - **「门是本来红的，还是我弄红的」——报告没给分辨办法。** 建议沿用只读复算法：不碰 `git stash`，用 `git show HEAD:<文件>` 取 HEAD 版逐源重算，或对照 `.scratch/` 里的留证建立基线。本票 `snapshot:check` 那条红就是靠这个办法两次独立复算定案的（见门 7 归因证据），**这个办法可复用**。
    - **同一工作树里有别的会话在写**：`git status` 约 **30 个 `skill-calorie`／`base-render` 未提交改动**。⇒ **任何门都可能因他人改动转红**，与你的改动无关。**这是票 6／7／11 验收可信度的真正威胁**：看见红先做上面的基线和归因，**不要默认是自己弄的，也不要默认不是**。验收前先记一次 `git status --short` 当基线。

---

---

## 审查发现与处置（2026-09-12 对抗式审查 A）

审查报告：`docs/skills/skill-chef/t10-review-A.md`。门复跑 **5/7 逐字一致**、`snapshot:check` 红**独立复算证实真预存**、装机面 3 备份字节数逐项对上、`#57` 三处收窄全部成立、**安全结论：留着安全，不必回滚**。以下为本报告据其改正与补记的五条：

### 改正 1（真缺陷，票面漏项）：`~/node_modules` **不是 Junction**，是本票没做的那一半

票面原话要求「profile 与 `~/node_modules` 走 Junction（可回滚）」。实测（编排方复核，2026-09-12 11:47）：

| 路径 | 形态 | 判定 |
|---|---|---|
| `~/.dsh/profiles/web/node_modules/skill-chef` | Junction → `D:\ilife\packages\skill-chef` | ✔ 本票做对 |
| `~/.dsh/profiles/web/node_modules/dsh-chef` | Junction → `D:\ilife\packages\plugin-chef` | ✔ 本票做对 |
| `~/.dsh/profiles/web/.dsh-module-fallback/node_modules/skill-chef` | Junction（pnpm 事后改指一跳中转） | ✔ |
| `~/.agents/skills/skill-chef` | Junction → `D:\ilife\packages\skill-chef` | ✔ |
| **`~/node_modules/skill-chef`** | **普通目录**（`LinkType=[]`、无 ReparsePoint），内容仅 `dist`／`templates`／`package.json`(844 B)，**无 `SKILL.md`**，`files` 仍是旧版 | ✘ **本票未做** |
| **`~/node_modules/dsh-chef`** | **普通目录** | ✘ **本票未做** |
| 对照 `~/node_modules/skill-bill` | **Junction**（#150 做对了） | 参照 |

**影响评估（有限）**：提供方 `skillDir()` 走 `createRequire.resolve('skill-chef/package.json')`，从 profile 上下文解析到的是**仓库包**（实测 `D:\ilife\packages\skill-chef\package.json`），**不读** `~/node_modules`；插件桥也经 `repoRoot`／包名解析。故**当前功能不受影响**。但这是**票面要求的一半没做**，且 `~/node_modules/skill-chef` 那份**陈旧副本**（无 `SKILL.md`）将来可能咬人（#150 在 bill 上就遇到过陈旧 tarball 拷贝）。
**处置**：不擅自改（`~/node_modules` 是用户级共享目录，且 #150 先例要求换之前先备份为 `<名>.bak-<日期>`）。**如实记入本票，转票 11 的真机前置清单**。

### 改正 2：回滚命令漏第 4 个链接位（已补）

原回滚块只 `rmdir` 三个 Junction，**漏了 `profile\node_modules\dsh-chef`**（本票 install 新建）。功能性回滚本来也成立（profile `package.json` 同时被还原、`dsh-chef` 从 `bundles` 移除，GUI 能起），但状态不完整。**上文回滚块已补为四处。**

### 改正 3：「技能包名只写一处」为假（已在第一步节就地改正）

见上文第一步节的红字改正。

### 改正 4（读数瑕疵，非产物缺陷）：两处测量口径

- **「行首 ESM 0 处」依赖正则口径**：用更宽的正则扫同一批 67 件会命中 **2 处**，都在 `dsh-better-sidebar.js`（L8596／L8666），内容是 **SQL 关键字列表字符串**（`"…export extends false finally for…"`），**非真 ESM 语法**。⇒ 「不会重演 #48」的结论仍成立，但「0 处」是**该正则下的读数**，不是文件的绝对性质。
- **`dsh-mattpocock-skills-deck`／`dsh-vision-router` 取不到注册 id 的理由写错了**：报告称「写法不同」，实读两件注册头是 `id: 'dsh-mattpocock-skills-deck'`／`id: 'dsh-vision-router'`（**单引号**）——是**我的正则只认双引号**，不是它们写法不同。结论（不是异常）对，理由已更正。

### 改正 5（环境漂移，非本票）：`boundaries` 的名单已被别的会话改动

报告「门」一节引的 `tooling/check-boundaries.mjs:37` 是 **HEAD 版**（4 元素：`skill-chef`／`skill-home`／`skill-schedule`／`skill-memo-ilife`）；工作树现为 **3 元素**（line 41），因**另一个会话按 #199 改过**。⇒ 报告里「chef 仍在 `SKILLS_BASE_FROZEN` 名单里…」那句**是过期句**；`npm run boundaries` **PASS 结论仍成立**（A 席实测 PASS）。**本票一件未碰该文件**（影响清单第 28 行的「明确不碰」已含它）。

---

## 结构拆雷记录（2026-09-12，由审查 B 的「触发面写宽了」引出）

### 雷是什么

`packages/plugin-chef/tsconfig.json` 是 `outDir: "./dist"` ＋ `include: ["src"]`，而 `src/client.ts` **在这个 include 里**。于是 **`tsc -b` 会写 `dist/client.js`**——写出来的是 **tsc 直出的裸 ESM**，而 `dist/client.js` 按 `package.json` 的 `exports["./client"]` 是 **tsdown 打的 loader 工厂包**（`window.__ModuleLoader__.load({id, factory})`）。两者同名同路径，**后跑的覆盖先跑的**。

**实测（修前，把 tsc 的产物落到 `.scratch/chef-help/t10-fix/probe-before/` 抓下来，不动 `dist/`）**：

| 项 | 值 |
|---|---|
| tsc 直出的 `client.js` | **1660 字节** |
| 首行 | `/** dsh-chef 客户端存根（P10 脚手架）。` |
| 含 `__ModuleLoader__` | **False** |
| 含行首 `export` | **True**（裸 ESM） |
| tsdown 打的 `client.js`（在盘） | **3511 字节**，首行 `window.__ModuleLoader__.load({` |

⇒ 落回 #150 的形态。DSH 把所有插件客户端拼成**一条**普通 `<script>`，一处 ESM 语法错 = 整条不执行 = 所有插件注册不上 = 页面 `Failed to load plugins` = **整个 GUI 起不来**。

**触发面（逐条实测，比原提醒宽得多）**：

| 路径 | 修前后果 | 实测 |
|---|---|---|
| 冷构建（无 `tsconfig.tsbuildinfo`，如全新克隆） | **写出**裸 ESM | 实测 |
| `tsc -b --force` | **重写**裸 ESM | 实测 |
| `tsc -b --clean` | **删掉** `dist/client.js`（下一次构建再写成裸 ESM） | 实测 |
| 改 `src/client.ts` 本身 | **重写**裸 ESM | 实测 |
| **仓级 `npm run build`／`npm run test:types`** | 同 `tsc -b` | 根 `package.json:11`／`:12` 就是 `tsc -b`，根 `tsconfig.json:22` 引 `./packages/plugin-chef` |

> **⚠️ 一处与编排方口径的出入（如实记）**：编排方转述的说法是「改 `src/` 下**任何**文件后跑 `tsc -b` 都会重写 `dist/client.js`」。**我实测这条不成立**：增量稳态下，改 `src/skill-provider.ts` **没有**重写它，改 `src/slot.ts`（仅动注释）也**没有**——tsc 按文件增量跳过未变的产物（`.scratch/chef-help/t10-fix/inc-probe/` 留证：`client.js` mtime 不动，被改的文件 mtime 前进）。
> **但这不构成保护**：跳过与否是 tsc 的记账结果，不是设计约束；上表四条路（冷构建／`--force`／`--clean`／改 `client.ts`）**全部绕过它**，且**每一次都真的发生了**。所以结论方向不变——**雷是真的，只是「任何文件」这个说法要收窄成「凡那一次真的走到 emit 的 `tsc -b`」。**

**关键证据（比 mtime 更硬）**：`tsconfig.tsbuildinfo` 的**程序文件表**——
- 修前（`backup-dist/tsconfig.tsbuildinfo.before`，46,797 B）：表里有 `"./src/client.ts"` ⇒ **它在编译程序里**；
- 修后（`packages/plugin-chef/tsconfig.tsbuildinfo`，46,536 B）：表里**已无** `./src/client.ts`（只剩 `undici-types/*client*.d.ts` 这类无关同名）⇒ **它已不在编译程序里**。

### 为什么不能照抄邻居的 `exclude`

邻居 `plugin-calorie`／`plugin-memo-ilife`／`plugin-manager` 的 `tsconfig.json` 里都有 `"exclude": ["src/client.ts"]`——看起来是现成答案。**对 `dsh-chef` 不成立，照抄会两头落空。**

原因：宿主半 `src/index.ts` 有一行 `export type { HostCaller } from './client.js';`。类型引用虽被擦除，**却会把 `client.ts` 拉进编译程序**。实测（`.scratch/chef-help/t10-fix/probe-after/`）：

1. **报错**：`src/index.ts(47,33): error TS6307: File '…/src/client.ts' is not listed within the file list of project`（`composite: true` 要求列出全部程序文件），`exit=2` ⇒ **`npm run build` 的 `build:host` 会直接失败**；
2. **且照样覆写**：即便如此，tsc **仍然把 `client.js` 写了出来**（emit 集里赫然有它）。

那三个邻居之所以能用 `exclude`，是因为**它们的 `index.ts` 都没有引用 `./client.js`**（实测 grep）：`calorie`／`memo`／`manager` 零引用，而 `chef`／`bill`／`home`／`schedule` 四家都有。
⇒ 所以这不是「全仓既有形态」，而是**两种形态**；`dsh-chef` 属于「有引用」那一类，**修法必须与 `calorie` 不同**。（`dsh-bill-ilife` 与本票同形，同样有此雷；`dsh-home-ilife`／`dsh-schedule-ilife` 更重——它们的 `index.ts:19` 是**值**导出，插件树在启动期就抛，正是当前 6 例红的成因。）

### 落地的修法（两个文件，五处）

**① `packages/plugin-chef/src/index.ts`**：删掉 `export type { HostCaller } from './client.js';` 这一行（连带把注释改成实情）。这是把 `client.ts` 拉进宿主编译程序的**唯一一根线**，剪掉它 `exclude` 才有意义。`HostCaller` 现只住 `client.ts`（浏览器侧）；宿主侧同形结构本就在 `bridge.ts:71` 的 `requestViaHost` 参数里就地声明。
**② `packages/plugin-chef/tsconfig.json`**：`include: ["src"]` 后加 `"exclude": ["src/client.ts"]`（与三个邻居同形）。

**运行时影响为零**：`export type` 构建期就被擦除，`dist/index.js` 的运行时行为一字未变；`dist/index.d.ts` 少一个无人消费的类型再导出（全仓 grep：`HostCaller` 只有各包自己的声明与自转发，**没有任何消费方**）。**客户端产物字节不变**（见下）。

**为什么没走另外两条候选**：

- **让 host 半 emit 到别的目录**（如 `dist-host`）：会改 `package.json` 的 `main`／`exports`／`files`＝**改已发布产物的版图**。profile 里 `dsh-chef` 是指向 `D:\ilife\packages\plugin-chef` 的 Junction（实测），改了目录版图，**用户正在用的那份装法下次重启就可能解析不到**。风险不可接受，**不采用**。
- **只加构建期守卫**（如 `build:host` 之后校验 `dist/client.js` 仍含 `__ModuleLoader__`，不满足即非零退出）：**它挡不住这次要挡的那条路**——守卫住在 `build:host` 里，而**裸 `tsc -b` 根本不经过 npm 脚本**，正是最危险的走法。守卫只能在雷炸完之后「报丧」（此时覆写已发生），**不满足票面判据「任何人任何一次单跑 `tsc -b` 都不再能毁掉它」**。故**不作为主修法**；已有的 `test/client-bundle-48.test.mjs` 本来就是这个不变量的事后探测网，再加一道同性质的守卫只是重复。**不采用**。

**残留（如实记，不粉饰）**：`client.ts` 既已不在宿主编译程序里，`dist/client.d.ts` 与 `dist/client.d.ts.map` **不会再被 `tsc` 重新生成**，现盘上那两份（1,753 B／745 B，mtime 2026/9/12 11:25:06）是**拆雷前的遗留件**。它们无害（`exports` 不引它们），但会**过期**——将来 #57 改 `client.ts` 后不会同步。**我没有删**（属生成物，不在本票边界，且删它无收益）；**这是留给 #57 的一条已知项**。

### 实测留证（缺一不可，逐条）

| # | 动作 | 结果 |
|---|---|---|
| 1 | 修前记录在盘 `dist/client.js` | **3511 字节**，首三行 `window.__ModuleLoader__.load({` / `id: "dsh-chef",` / `factory: (require) => {`，sha256 `7EDF7A88…02FF` |
| 2 | 改完 `tsconfig.json` 后**真跑一次 `npx tsc -b`** | `exit=0`（**无 TS6307**）；`dist/client.js` **未被覆写**：仍 **3511 字节**、sha256 **逐字相同**、**mtime 都未变**（`09/12/2026 11:39:35`）、仍含 `__ModuleLoader__` |
| 3 | 跑 `npm run build`（host＋client，在 `packages/plugin-chef`） | `exit=0`；两半都正常（`build:host` 无输出，`build:client` 产出 `dist\client.js 3.51 kB`）；产物 sha256 **与审查过的原件逐字相同** |
| 4 | `node --test test/client-bundle-48.test.mjs` | **tests 21 / pass 15 / fail 6**——`dsh-chef` **3 例全绿**；6 红＝`dsh-home-ilife` 3 ＋ `dsh-schedule-ilife` 3（**预存，不在本票范围**）。**与修前基线红数一致，未变** |
| 5 | `npx tsc -p packages/plugin-chef/tsconfig.client.json --noEmit` | `exit=0` |
| 6 | `npm run boundaries` | **PASS**（`exit=0`） |
| 7 | 修法抗性复核（`.scratch/chef-help/t10-fix/fix-probe/`，修后配置的隔离副本，放一份仿 loader 工厂包当靶子） | `tsc -b`／`tsc -b --clean`／重建／`tsc -b --force` **四路全部「靶子存活、sha 不变」**；其 `tsbuildinfo` 程序表**从不含** `src/client.ts` |

**没有回滚**：本修法未使任何门转红（第 4 条红数与修前基线一致，6 例红归属 `home`／`schedule`，与本改动无关）。

---

## 审查发现与处置（2026-09-12 对抗式审查 B）

审查报告：`docs/skills/skill-chef/t10-review-B.md`（**7.6/10**）。与 A 席同结论：**留着是安全的，不必回滚**；差异全在「以后」。以下逐条对账（**7 条全部已补**）：

| # | B 席发现 | 处置 | 落点 |
|---|---|---|---|
| 1 | 给 `#57` 的提醒**把触发面写宽了**（说成「忘了跑 `build:client`」） | **已改口径**：改成「单跑 `tsc -b` 就会覆写，改 `client.ts` / 冷构建 / `--force` / `--clean` / 仓级 `npm run build` 都触发」；并写明**结构性拆雷已完成** | 收窄 #57 节内联改正 ＋ 上文「结构拆雷记录」 |
| 2 | **硬伤：插件半还没在这个 GUI 里生效**；报告拿「技能目录当场多出 `skill-chef`」当插件侧真机证据——**那是错的** | **已改正**：那条走的是 `~/.agents/skills/skill-chef` **目录发现路**，不是 `ctx.skills.registerProvider`；host（pid 31252）起于 **00:39:56**，`dsh-chef` 进 profile **11:27:39**，**host 早约 10 小时 48 分** ⇒ **插件半尚未生效，票 11 必须重启后复验**；host 日志 0 命中那条**因对照组也全 0 命中，不能当证据**，一并写明 | 8b 节内联改正 ＋ 不确定项 **11** |
| 3 | **硬伤：回滚仍不完整** | **已补**：第四个 `rmdir` 之外，新增「**把 `node_modules` 拉回与锁文件一致**」一步（`dsh plugin --profile web install`，或手工核对），并澄清 `D:\ilife\pnpm-lock.yaml.bak-218` 属**源码侧**、不在 profile 回滚路径上 | 回滚块新增第 3 步 ＋ 其下注 |
| 4 | **第四份拷贝** `C:\Users\辰辰洋洋\node_modules\skill-chef`（09-07 普通目录）＋ `.bin\chef-cmd-read.cmd` **正指着它** | **已写进不确定项**，并给出硬提醒：**PATH 方案别走 `~/node_modules\.bin`** | 不确定项 **12** |
| 5 | `src/skill-provider.ts:46-67` 是**自写最小解析器**；票 9（#217）补 HELP 交付节时**折行／嵌套键会让 `list` 静默返空** | **已写进报告**；并在 `#57` 与我们追加的评论里提醒票 9 去跑兜底门（`test/skills-provider.test.mjs:97-104`／`:111-116`） | 不确定项 **13** ＋ issue 评论 |
| 6 | 两条验收尺子（交票 6／7／11）：**怎么分辨门是本来红还是自己弄红**；**同树有别的会话在写，任何门都可能因他人改动转红** | **已写进报告**（只读复算法 ＋ `git status` 基线） | 不确定项 **14** |
| 7 | 两处小更正（**别当偏差记**）：①「pnpm 事后改指、成因未查证」——bill／calorie／memo **全是同形一跳中转，是标准形状**；②`3557` 是**探针服务端返回**字节数，在盘 `dist/client.js` 是 **3511**，差的是 `sourceMappingURL` 改写 | ①**已改成正确说法**（并复核确认：四个 `skill-*` 回退位全是同形一跳中转）；②**已补注**；另：`check-boundaries.mjs` 现为 `:41` **三项**（A 席改正 5 已记，B 席复核确认），**不是报告之错** | 不确定项 **9** 内联改正 ／ 8d 节注 ／ 门 5 节注 |

> **两席一致的最终口径（不改）**：**留着是安全的**；本票产物、装机、回滚三面均无「现在就必须回滚」的缺陷。B 席 7 条**全部是「以后」的风险与口径修正**，已逐条落纸。

---

## 复核复跑门（2026-09-12，结构拆雷后）

```
node --test test/client-bundle-48.test.mjs
  ℹ tests 21   ℹ pass 15   ℹ fail 6
  ✔ dsh-chef client：classic 执行并注册自身 id（#48 整批 crash 回归）
  ✔ dsh-chef client：factory 可物化，导出 apply/inject，无 node 依赖
  ✔ dsh-chef client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像）
  ✖ dsh-home-ilife  3 例（预存，不在本票范围）
  ✖ dsh-schedule-ilife  3 例（预存，不在本票范围）

npm run build                    （在 packages/plugin-chef，host＋client）  exit=0
npx tsc -b                       （在 packages/plugin-chef）                exit=0，dist/client.js 未被覆写
npx tsc -p packages/plugin-chef/tsconfig.client.json --noEmit              exit=0
npm run boundaries                                                          boundaries: PASS
```

**未跑（并说明原因）**：`pnpm snapshot`（会把别的会话未提交的改动写进快照）、仓级 `npm run build`（＝`tsc -b`，会覆写 `dsh-bill-ilife`／`dsh-home-ilife`／`dsh-schedule-ilife` 的 `dist/client.js`，伤及他票产物）、任何 `dsh plugin … install/remove` 与对 `~/.dsh/profiles/web/**` 的写入、任何 Junction 改动、任何 DSH 服务启停。

---

## 落盘凭据（供复查）

- `.scratch/chef-help/probe-modules/`（67 个模块原件，含 `dsh-chef.js`）
- `.scratch/chef-help/probe-boot.json`（探针实例的 boot 清单）
- `.scratch/chef-help/probe-index.html`（探针实例首页原文）
- `.scratch/chef-help/probe-capture.ps1`／`probe-analyze.mjs`（抓取与逐条数数）
- `.scratch/chef-help/issue57-body.md`／`issue57-comment.md`（收窄 #57 用的原文）

### 结构拆雷的凭据（2026-09-12 新增，全在 `.scratch/chef-help/t10-fix/`）

- `backup-dist/`（改前留底：`client.js.before` 3511 B、`client.d.ts.before`、`index.d.ts.before`、`index.ts.before`、`tsconfig.json.before`、`tsconfig.tsbuildinfo.before` 46797 B）
- `probe-before/`（**修前** tsc 会写出的 `client.js`：1660 B 裸 ESM，含 `export`、不含 `__ModuleLoader__`）
- `probe-after/`（**只加 `exclude` 不剪类型引用**的后果：TS6307 报错 ＋ **照样写出** `client.js`）
- `probe-fixed/`（修后 emit 集：**不含** `client.js`，`exit=0`）
- `inc-probe/`（修前形态的增量行为逐路实测：冷构建写出／改无关文件不写／改 `client.ts` 写出／`--force` 重写／`--clean` 删除）
- `fix-probe/`（**修后**配置的隔离副本：`tsc -b`／`--clean`／重建／`--force` **四路靶子全部存活**）
- `gate-client-bundle-48.txt`（门 1 的完整原始输出）
