# 事实：插件包与技能包的关系 ＋ 四个引流包地址

调查时间：本次会话（只读调查，未改任何源码）。所有结论带出处；查不到的单列第四节。

## 一、插件包 ↔ 技能包 对照表（含版本）

本地版本取自 `packages/<目录>/package.json` 的 `name`／`version`（grep 结果，行号即该文件第 2／3 行）；
「npm 最新」取自 `npm view <包名> version` 原始输出。

| 插件包目录 | 插件包名 | 插件版本 | npm 最新 | 技能包目录 | 技能包名 | 技能版本 | npm 最新 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `packages/plugin-memo-ilife` | `dsh-memo-ilife` | 0.2.0 | 0.2.0 | `packages/skill-memo-ilife` | `skill-memo-ilife` | 0.2.0 | 0.2.0 |
| `packages/plugin-calorie` | `dsh-calorie` | 0.2.5 | 0.2.5 | `packages/skill-calorie` | `skill-calorie` | 0.2.4 | 0.2.4 |
| `packages/plugin-schedule-ilife` | `dsh-schedule-ilife` | 0.2.0 | 0.2.0 | `packages/skill-schedule` | `skill-schedule` | 0.2.0 | 0.2.0 |
| `packages/plugin-home-ilife` | `dsh-home-ilife` | 0.2.0 | 0.2.0 | `packages/skill-home` | `skill-home` | 0.2.0 | 0.2.0 |
| `packages/plugin-chef` | `dsh-chef` | 0.2.0 | 0.2.0 | `packages/skill-chef` | `skill-chef` | 0.2.0 | **0.1.0（0.2.0 未发布，见四）** |
| `packages/plugin-bill-ilife` | `dsh-bill-ilife` | 0.2.0 | 0.2.0 | `packages/skill-bill` | `skill-bill` | 0.2.0 | 0.2.0 |
| `packages/plugin-manager`（总管） | `dsh-life-pack` | 0.2.0 | 0.2.0 | — | — | — | — |

命名不一致点（逐字核对，非推测）：只有备忘录那一对是「插件名 ↔ 同名技能包」
（`dsh-memo-ilife` ↔ `skill-memo-ilife`）；其余五对的技能包名把 `-ilife` 后缀去掉了，
且 `dsh-calorie`／`dsh-chef` 的技能包不叫 `dsh-*`（技能包一律 `skill-` 前缀）；
`dsh-schedule-ilife`／`dsh-home-ilife`／`dsh-bill-ilife` 的技能包是 `skill-schedule`／`skill-home`／`skill-bill`。

出处（插件内硬编码的技能包名，与上表一致）：

- `packages/plugin-memo-ilife/src/bridge.ts:15` `export const SKILL_PACKAGE = 'skill-memo-ilife' as const;`
- `packages/plugin-bill-ilife/src/bridge.ts:15` `... = 'skill-bill' ...`；`plugin-chef/src/bridge.ts:15` `'skill-chef'`；
  `plugin-home-ilife/src/bridge.ts:15` `'skill-home'`；`plugin-calorie/src/bridge.ts:15` `'skill-calorie'`；
  `plugin-schedule-ilife/src/bridge.ts:15` `'skill-schedule'`
- `packages/plugin-memo-ilife/src/skill-provider.ts:25` `export const SKILL_NAME = 'skill-memo-ilife' as const;`
  （注释：与 `packages/skill-memo-ilife/SKILL.md` frontmatter `name` 同值）

用户截图那行版本串的来源（实证）：`packages/plugin-memo-ilife/src/client.ts:54`

```
`${PLUGIN} ${PLUGIN_VERSION} · ${SKILL_PACKAGE} ${SKILL_VERSION}`
```

配合 `packages/plugin-memo-ilife/src/slot.ts:15,20` 的 `SKILL_PACKAGE = 'skill-memo-ilife'`／`SKILL_VERSION = '0.2.0'`，
即面板显示「`dsh-memo-ilife` 0.2.0 · `skill-memo-ilife` 0.2.0」——版本串用的是**技能包名 `skill-memo-ilife`**，不是目录名。

另一处相关事实（对比用）：引流包 `dsh-mattpocock-skills-deck` 是把技能**打进自己包内**
（其 `package/package.json:24-30` `files` 含 `bundled-skills`），与爱生活的「技能做成独立 npm 包当依赖」是两种形态。

## 二、装插件包是否即带技能（结论 + 证据出处）

**结论一句话：装了插件包，技能就能直接用，不必另外装技能包**——技能包是插件包的**传递依赖**，
由包管理器（`dsh plugin add` ＝ pnpm 薄转发、等价 `pnpm add`）一次落盘，插件运行时按包名解析它。

证据链（四段，缺一不可）：

1. **六个插件都在 `dependencies` 精确 pin 了对应技能包**（`grep -n '"skill-' packages/*/package.json`，
   每件都在第 29 行）：
   - `packages/plugin-calorie/package.json:29` `"skill-calorie": "0.2.4"`
   - `packages/plugin-memo-ilife/package.json:29` `"skill-memo-ilife": "0.2.0"`
   - 同形：`plugin-home-ilife:29` `"skill-home": "0.2.0"`、`plugin-chef:29` `"skill-chef": "0.2.0"`、
     `plugin-schedule-ilife:29` `"skill-schedule": "0.2.0"`、`plugin-bill-ilife:29` `"skill-bill": "0.2.0"`
2. **技能内容没有被打进插件包**：六件均无 `bundledDependencies`／`bundleDependencies`／`peerDependencies`
   （`Select-String` 对 `packages/plugin-*/package.json` 零命中），`files` 只含 `["dist","cordis.patch.yml"]`
   （`packages/plugin-calorie/package.json:13-16`）。即走「依赖落盘」而不是「副本随包」。
3. **插件运行时按包名解析技能包**（不是硬拼单仓相对路径）：
   - `packages/plugin-calorie/src/bridge.ts:132-143`：`createRequire(import.meta.url).resolve(SKILL_PACKAGE + '/package.json')`
     再拼 `dist/cli/cmd_read.js`；解析失败才回退单仓路径，两者皆无由 `assertCliPresent` 抛 `missing-cli`。
   - `packages/plugin-calorie/src/skill-provider.ts:33-41,91-105` 同法按包名定位技能包根，
     读 `SKILL.md` 后以 `source: 'bundled'`、`rank: 600` 注册进 DSH 的技能注册表
     （`ctx.skills.registerProvider`，见 index.ts）。
   - 六个插件都有这一件：`packages/plugin-*/src/skill-provider.ts`（6/6 存在）。
4. **口径文档已经写过这条**：
   - `docs/skill-landing-r2.md:12` 修法①「dependencies 声明＋按包名解析」判定为**胜出**，理由列
     「随 `dsh plugin add` 一次装全，无二次拉取」；同表第 13 行把「随包（skill 代码打进单品包）」
     列为否决项（双份代码腐化）。
   - `docs/skill-landing-r2.md:18,25,28-29` ① 必须含三件：加 skill 依赖（精确 pin）、cliPath 按包名解析、
     `files`/tarball 清单门禁（技能包必须含 `dist/cli/cmd_read.js`）。
   - `packages/plugin-manager/src/install.ts:3-5`：`dsh plugin 是 pnpm 薄转发，add 单品等价 pnpm add，
     传递依赖落盘是`；同文件 6-12 行给出**单命令双包**口径
     `dsh plugin add dsh-life-pack dsh-calorie`，并写明「reconcile 只扫直接 dependencies，传递的 manager 不进 bundles」。
   - 注意这条与上面并不冲突：**技能包靠依赖落盘即可用（不必进 bundles）**；而**总管 `dsh-life-pack`
     必须与单品一起直接 add**（传递依赖不会进 bundles、pnpm 隔离布局下 profile 解析不到它），
     所以「装一个单品」官方的安装命令是**双包**，不是只装单品。
   - `docs/agents/命令事实边界.md`：grep `技能|打包|依赖` 无相关表述（该文件不管打包关系），此处不引用。

补充（与「检测更新」直接相关，实测）：已发布的 `dsh-chef@0.2.0` 声明 `"skill-chef": "0.2.0"`，而 npm 上
`skill-chef` 只有 `0.1.0`（`npm view skill-chef@0.2.0` → E404「No match found for version 0.2.0」）。
即**从 npm 装 `dsh-chef` 现在会因依赖版本不存在而失败**（本地 0.2.0 是未发布的单仓态）。
其余五对的 pin 版本在 npm 上均存在（对照表第一、二列的「npm 最新」）。

## 三、四个引流包的 GitHub 仓库与 npm 包名

四个仓库都在作者 FeatherHunter 名下、均为 PUBLIC（`gh repo view <nwo> --json nameWithOwner,url,visibility,isPrivate` 实证）。

| 包名 | npm 包名／npm 最新 | GitHub 仓库 URL | 出处 |
| --- | --- | --- | --- |
| `dsh-mattpocock-skills-deck` | `dsh-mattpocock-skills-deck` 1.7.22 | https://github.com/FeatherHunter/dsh-mattpocock-skills-deck | `D:\dsh-plugin\dsh-mattpocock-skills-deck\package.json:4-7` `repository.url = https://github.com/FeatherHunter/dsh-mattpocock-skills-deck.git`；`.git/config` remote `origin` 同址（另有两个他仓 remote：21967201／pioneerAlone，非作者）；`gh repo view` 确认 |
| `dsh-opencode-palette` | `dsh-opencode-palette` 1.7.1（本地工作树 1.7.2） | https://github.com/FeatherHunter/dsh-opencode-palette | `D:\dsh-plugin\dsh-opencode-palette\package.json:15-20`（`git+https://github.com/FeatherHunter/dsh-opencode-palette.git`、homepage、bugs 同址）；`.git/config` 同址；`gh repo view` 确认 |
| `dsh-prompt` | `dsh-prompt` 0.1.12 | https://github.com/FeatherHunter/dsh-prompt | 本地 `D:\dsh-plugin\dsh-prompt\package.json` **无 `repository`／`homepage` 字段**（读全 100 行确认）；来源为 `.git/config`：`url = https://github.com/FeatherHunter/dsh-prompt.git`；`gh repo view FeatherHunter/dsh-prompt` 确认同理 |
| `dsh-im-companion` | `dsh-im-companion` 0.1.16 | https://github.com/FeatherHunter/dsh-im-companion | `D:\dsh-plugin\dsh-im-companion\package.json:21-25`（`git+https://github.com/FeatherHunter/dsh-im-companion.git`、homepage）；`.git/config` 同址；`gh repo view` 确认 |

顺带实测（写文案时别抄错数字）：`dsh-opencode-palette` 的**当前**口径是 **38 款**配色
（`package/package.json` description：「让 DeepSeek Harness 穿上 38 款经典皮肤」；仓库简介亦写「38 款」），
用户截图里的「34 款」是旧数。

## 四、查不到的东西（明列）

1. **`dsh-opencode-palette` 已发布版本（1.7.1）的 npm 元数据里没有 `repository`／`homepage`／`bugs`**
   （`npm view dsh-opencode-palette repository homepage` 无输出；本地 1.7.2 的 package.json 才补上了这些字段）。
   仓库地址只能从本地 `.git/config` 与 `gh` 取得——**npm 包页面上点不到仓库**。
2. **`dsh-prompt` 的 npm 元数据同样没有 `repository`**（`npm view dsh-prompt repository homepage` 只有版本号输出）；
   本地 `package.json` 也没有该字段，仓库地址唯一来源是 `.git/config` 的 remote。
3. **`skill-chef@0.2.0` 在 npm 上不存在**（404），而 `dsh-chef@0.2.0` 精确 pin 它 ⇒ 该包当前**从 npm 装不上**；
   本地单仓态是 0.2.0，实际发布与否**本文档查不到**（无发布记录可读）。
4. 更正记录（避免误报）：用 PowerShell `ConvertFrom-Json` 读
   `D:\dsh-plugin\dsh-opencode-palette\package.json` 与 `dsh-im-companion\package.json` 会报
   `Invalid object passed in, ':' or '}' expected.`，但这是 **PowerShell 读取编码造成的假象**——
   `node -e "require('D:/dsh-plugin/dsh-opencode-palette/package.json')"` 解析正常并打印
   `dsh-opencode-palette 1.7.2 {"type":"git","url":"git+https://github.com/FeatherHunter/dsh-opencode-palette.git"}`。
   即两个文件都是合法 JSON；**取字段请用 node／read 工具，不要用 `ConvertFrom-Json`**。
5. `docs/agents/命令事实边界.md` 中**没有**关于「插件包带技能包」的表述（grep `技能|打包|依赖` 零命中），
   故第二节未引用它；该口径的文档出处只有 `docs/skill-landing-r2.md` 与 `packages/plugin-manager/src/install.ts`。
