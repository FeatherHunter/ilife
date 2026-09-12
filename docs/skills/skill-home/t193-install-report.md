# #193 居家管家HELP（10/11）插件侧最小安装报告

- **日期**：2026-09-12（实施会话）
- **票面**：`docs/skills/skill-home/t193-body.md`（线上 #193）
- **地图**：`docs/skills/skill-home/map-183-body.md`（#183）
- **结论**：**过**（仓库侧四项判据全部实测通过、把技能装到 agent 读得到的位置已完成并逐字给出回滚；「重启后技能表可见 `skill-home`」一条属票 11，本席按红线未重启 DSH 进程）
- **红线遵守**：未跑仓根 `pnpm build`／`pnpm test`；未重启／未杀任何 DSH 进程（用户 GUI 全程 `pid=7404` 占 `127.0.0.1:43120`，开工 17:19:01 起、收工仍在监听）；未动其它插件的条目与产物；未 `gh issue edit`／未发评论／未关票。

---

## 0 一句话

照 `plugin-bill-ilife`／`plugin-schedule-ilife` 的现成做法，给居家侧补齐了**打包技能提供方**（`skill-provider.ts` ＋ `dsh-ctx.ts` ＋ `index.ts` 接线）、修掉了**客户端产物缺陷**（`dist/client.js` 837 B 裸 ESM → 3541 B loader 工厂包，门禁 18/3 → **21 pass / 0 fail**）、修掉 skill-home 的**两处断链**（缺 frontmatter／`files` 缺 `SKILL.md`），并把 `dsh-home-ilife` 装进 web profile（两条 Junction ＋ profile 两处配置，含备份与回滚）。

---

## 1 做了什么（逐件）

### 1.1 技能提供方（新增 2 件 ＋ 接线 1 件）

| 件 | 动作 |
|---|---|
| `packages/plugin-home-ilife/src/dsh-ctx.ts` | **新建**。照 `plugin-bill-ilife/src/dsh-ctx.ts` 同形（type-only 宿主面镜像：`SkillsFace`／`SkillCandidate`／`SkillDefinition`／`SkillProvider`／`SkillHostCtx`），注释改成居家线与本票出处 |
| `packages/plugin-home-ilife/src/skill-provider.ts` | **新建**。照 `plugin-bill-ilife/src/skill-provider.ts` 同形：`PROVIDER_NAME='dsh-home-ilife'`、`SKILL_NAME='skill-home'`、`BUNDLED_SKILL_RANK=600`（内联，零依赖）、单份 `SKILL.md` 按包名解析（`createRequire.resolve('skill-home/package.json')`，**不复制**）、`parseSkillText` 最小 frontmatter 解析、`list` 给摘要／`get` 给 frontmatter 后正文、过期候选返 `undefined` |
| `packages/plugin-home-ilife/src/index.ts` | `inject` 由 `[]` 改 `['skills']`；`apply` 由空实现改为注册提供方（**已注册即退让**：抛错信息含 `already registered` 时 `warn` 留痕，他错重抛）；**删掉**客户端再导出的两行（`export { CLIENT_COMPONENT, … } from './client.js';` 与 `export type { HostCaller } from './client.js';`），补上提供方与镜像的导出 |
| `packages/plugin-home-ilife/test/skills-provider.test.mjs` | **新建**，照 `plugin-bill-ilife/test/skills-provider.test.mjs`。锁 7 条：inject 声明 skills／只注册一个提供方／list 唯一摘要（bundled·600·单份 SKILL.md）／get 全文（含唯一出口 `home-cmd-read`、不带头）＋过期候选失效／重名退让不炸且留痕／**description 含老家 `help_wake_word`**／**`files` 含 `SKILL.md`** |

> 说明面口径（不越界）：本票只做「最小可用」的前言面——`name`＋`description`＋`help_wake_word`。**全量唤醒词清单与正文「HELP 交付」节属票 9（#192）**，故用例**不**锁「description 覆盖 WAIT_TABLE 全部唤醒词」（那是记账线的锁法），只锁主唤醒词。

### 1.2 客户端产物缺陷（照 `t193-client-bundle-defect.md` §4 配方，6 件逐件照抄，未重新调查）

| # | 文件 | 动作 |
|---|---|---|
| 1 | `packages/plugin-home-ilife/tsconfig.json` | 加 `"exclude": ["src/client.ts"]` |
| 2 | `packages/plugin-home-ilife/tsconfig.client.json` | **新建**（`composite:false`／`noEmit:true`；include `src/client.ts`＋`src/slot.ts`＋`src/bridge.ts`） |
| 3 | `packages/plugin-home-ilife/tsdown.config.ts` | **新建**，与 `plugin-schedule-ilife` 逐字同形，只改 `PLUGIN_ID = 'dsh-home-ilife'` |
| 4 | `packages/plugin-home-ilife/src/client.ts` | 补 loader 契约两件：`export const inject: readonly string[] = [];`＋`export function apply(): void {}`（空实现，只为产物在 loader 里是合法插件）；头注释补 tsdown 一句 |
| 5 | `packages/plugin-home-ilife/src/index.ts` | 删两行客户端再导出（见 1.1） |
| 6 | `packages/plugin-home-ilife/package.json` | `build` 改 `npm run build:host && npm run build:client`，加 `build:host`／`build:client`／`typecheck`，`devDependencies` 加 `"tsdown": "0.22.14"`；随后 `pnpm install --filter dsh-home-ilife --config.minimumReleaseAge=0` |

> 连带（配方的一部分）：仓根 `pnpm-lock.yaml` 的 `packages/plugin-home-ilife` importer 多了 4 行（`devDependencies: tsdown: 0.22.14`）。这是**本席改动**，随本票一起提交。
> 另注：第一次 `pnpm install` 报 `Lockfile is up to date, resolution step is skipped`（当时 lock 未变），这 4 行实际是随后 `pnpm --filter dsh-home-ilife run build` 的隐式 install 写下的（`pnpm-lock.yaml` mtime `17:44:42`）。两次都 `exit=0`。

### 1.3 skill-home 两处断链

| 件 | 动作 |
|---|---|
| `packages/skill-home/package.json` | `files` 由 `["dist","templates/*.html"]` 改 `["dist","SKILL.md","templates/*.html"]`（与 bill／memo／schedule 逐字同序） |
| `packages/skill-home/SKILL.md` | **补扁平 YAML frontmatter**（原先首行就是 `# 居家管家（home）SKILL`，skills-cli 会整包跳过）：`name: skill-home`／`description`（「居家管家HELP」+ `home.help.lookup` + 唯一出口 `home-cmd-read` + 老骨架 9 域／30 组／73 场景 + 触发词，含老家 `help_wake_word`）／`help_wake_word: "居家管家 帮助"` |

正文**一字未改**（票 9 的地盘）：改动只有文件头 5 行，`<!-- HELP-AUTO-START -->` 标记块与全文其余部分原样。

### 1.4 把技能装到 agent 读得到的位置（profile ＋ `~/node_modules`，两条 Junction）

先实地查现状再动手，照 bill／schedule／memo／chef 已装好的形状：web profile 的依赖写 `link:<仓库路径>`，`node_modules` 里是 Junction，`dsh.profile.bundles` 加一项。

---

## 2 判据：逐条实际命令 ＋ 实际输出

### 2.1 客户端产物（票面判据一）

```text
# 修前（baseline，2026-09-12 17:42:34）
packages\plugin-home-ilife\dist\client.js = 837 B
首行 = /** dsh-home-ilife 客户端存根（P10 脚手架）。
含 __ModuleLoader__ = False
node --test --test-reporter=tap test/client-bundle-48.test.mjs  →  # tests 21 / # pass 18 / # fail 3
  not ok 10 - dsh-home-ilife client：classic 执行并注册自身 id（#48 整批 crash 回归）
  not ok 11 - dsh-home-ilife client：factory 可物化，导出 apply/inject，无 node 依赖
  not ok 12 - dsh-home-ilife client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像）
```

```text
# 修后（强制重建：先删 dist 与 tsconfig.tsbuildinfo）
$ pnpm --filter dsh-home-ilife run build
> dsh-home-ilife@0.1.0 build:host   → tsc -b                      （exit 0）
> dsh-home-ilife@0.1.0 build:client → tsdown
  ℹ dist\client.js      3.54 kB │ gzip: 1.92 kB
  ✔ Build complete in 19ms                                        （exit 0）

$ "{0} B" -f (Get-Item packages\plugin-home-ilife\dist\client.js).Length
3541 B
$ [System.IO.File]::ReadAllLines((Resolve-Path packages\plugin-home-ilife\dist\client.js))[0]
window.__ModuleLoader__.load({
含 __ModuleLoader__ = True    含 ESM import = False

$ node --test --test-reporter=tap test/client-bundle-48.test.mjs
# tests 21 / # pass 21 / # fail 0 / # cancelled 0 / # skipped 0
（not ok 行为空）
```

**判据达成**：21 pass / 0 fail ✅；首行 `window.__ModuleLoader__.load({` ✅；3541 B（数千字节，不是 837 B）✅。

### 2.2 本包用例

```text
$ node --test --test-reporter=tap packages/plugin-home-ilife/test/skills-provider.test.mjs
# tests 7 / # pass 7 / # fail 0

$ node --test --test-reporter=tap packages/plugin-home-ilife/test/smoke.test.mjs
# tests 7 / # pass 7 / # fail 0
```

### 2.3 提供方真回路（从「安装态那一跳」加载）

**复跑命令（整改会话亲自复跑，两次都 `exit=0`；选「补齐脚本路径」这一支，不删「可复跑」）**：脚本在仓库 `.scratch/home-t193/probe-provider.mjs`（`.scratch/` 已被 gitignore ⇒ 非提交物；脚本以 `argv[2]` 收 base 目录，自包含、无需改动即可重跑）：

```powershell
node .scratch/home-t193/probe-provider.mjs "D:\ilife\packages\plugin-home-ilife"
node .scratch/home-t193/probe-provider.mjs "C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\dsh-home-ilife"
```

```text
① base = D:\ilife\packages\plugin-home-ilife
② base = C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\dsh-home-ilife   ← profile junction

两次输出逐字段相同 —— **这是弱证据，别当强证据读**：两次的 `resourceBase.path` 都落在 `D:\ilife\packages\skill-home`（同一地址，因为技能正文一律按包名从仓库读、不复制），所以「逐字段相同」恰恰说明②没有走出一条**不同的**路径；②真正证明的只是**插件半能从 profile junction 加载起来**，不证明技能已进 agent 技能表（那要重启，属票 11），也不证明存在安装态的技能副本：
 inject: ["skills"]            providerName: "dsh-home-ilife"
 SKILL_NAME: "skill-home"      BUNDLED_SKILL_RANK: 600
 listCount: 1
 candidate.name = skill-home   rank = 600   source = bundled   provider = dsh-home-ilife
 candidate.invocation = {modelInvocable:true, userInvocable:true}
 candidate.resourceBase = {kind:"directory", path:"D:\\ilife\\packages\\skill-home"}
 candidate.locator = {path:"D:\\ilife\\packages\\skill-home\\SKILL.md"}
 descriptionHead = 「居家管家HELP」→home.
 definition.bodyBytes = 12535   bodyHasHomeCmdRead = true   bodyStartsWithDashes = false
 staleIsUndefined = true
 skillMdFirstLineViaResourceBase = "---"
```

### 2.4 兼跑（读只读门，确认没碰坏别家）

```text
$ node --test --test-reporter=tap test/plugin-p10-boundaries.test.mjs   → # tests 13 / # pass 13 / # fail 0
$ node --test --test-reporter=tap test/plugin-p10-install.test.mjs      → # tests  5 / # pass  5 / # fail 0
   （13 + 5 = 18，即 #58 关票条件里的「P10 18/18」）
$ node --test --test-reporter=tap test/skills-export-47.test.mjs        → # tests  3 / # pass  3 / # fail 0
$ node --test --test-reporter=tap test/scaffold.test.mjs                → # tests  2 / # pass  2 / # fail 0
   （skill-home 的 test 目标：boundaries ＋ snapshot --check 均绿）
$ node tooling/check-boundaries.mjs                                      → boundaries: PASS（exit 0）
      OK: skill-home 依赖闭包不含 base-*（实得：无）
```

### 2.5 断链修复自检（skills-cli 发现规则，照 `test/skills-export-47.test.mjs` 口径）

```text
$ node .scratch/home-t193/frontmatter-selfcheck.mjs        （exit 0）
PASS  首行 ---
PASS  frontmatter 有结束 ---
PASS  每行 key: value（不合规行=null）
PASS  name === 目录名 skill-home
PASS  name 匹配 ^[a-z0-9-]+$
PASS  description 非空
PASS  frontmatter 键=name/description/help_wake_word
PASS  正文仍在（含 #）
PASS  HELP-AUTO 标记成对
PASS  无 BOM
PASS  文件字节=12979／description 字节=363
```

```text
$ node -e "const j=require('./packages/skill-home/package.json'); console.log(JSON.stringify(j.files))"
["dist","SKILL.md","templates/*.html"]     含 SKILL.md = true
```

### 2.6 防误伤：全仓 `dist/client.js` 指纹比对（构建前后）

```text
plugin-bill              831 B  7E28D04AB0A8   （未变）
plugin-bill-ilife       3528 B  69500CC607C3   （未变，首行仍是 loader 工厂包头）  ← 用户 GUI 正用
plugin-calorie         13937 B  80D126F96822   （未变）
plugin-chef             3511 B  7EDF7A88EB69   （未变）
plugin-home-ilife        837 B  9FC2214AF966 → 3541 B  3ED78AB3ECD7   ← 只有本包变
plugin-manager         10269 B  1313F736B249   （未变）
plugin-memo-ilife      12883 B  FBC20B206A27   （未变）
plugin-schedule-ilife   3576 B  D4F8D2950D53   （未变）
```

构建前先 `tsc -b --dry` 确认只有本包会被构建：

```text
Project 'D:/ilife/packages/plugin-manager/tsconfig.json' is up to date
A non-dry build would build project 'D:/ilife/packages/plugin-home-ilife/tsconfig.json'
```

---

## 3 安装现状与安装后差异（文件路径 ＋ 关键行）

### 3.1 安装前的现状实测（只读）

- profile 目录：`C:\Users\辰辰洋洋\.dsh\profiles\web`
- 兄弟件早已在位：`node_modules\{dsh-bill-ilife,dsh-calorie,dsh-chef,dsh-memo-ilife,dsh-schedule-ilife}` 全是 `LinkType=Junction`；`dsh-life-pack` 是真实目录（非 Junction）
- `C:\Users\辰辰洋洋\node_modules` 里 `skill-bill` 是 `LinkType=Junction → D:\ilife\packages\skill-bill`（本票第二处链接位的先例）
- 五个候选链接位**当时全不存在**：profile 的 `node_modules\dsh-home-ilife`、profile 的 `node_modules\skill-home`、profile 的 `.dsh-module-fallback\node_modules\skill-home`、`~\node_modules\skill-home`、`~\.agents\skills\skill-home`

### 3.2 备份（原路径 ＋ 原内容）

| 备份文件 | 原文件 sha256（装前） |
|---|---|
| `C:\Users\辰辰洋洋\.dsh\profiles\web\package.json.bak-t193-20260912-174612` | `0B7C6392D1A30CC45FFA6F25AFB34B86A55FB79AEB53DE1D72192F712B530126` |
| `C:\Users\辰辰洋洋\.dsh\profiles\web\pnpm-lock.yaml.bak-t193-20260912-174612` | `A486E352434B5CA40057AB40F488AA9A494F1CE546C68F982E8BAE9534BF05A2`（102,492 B） |

同一对备份另存一份到仓库 `.scratch/home-t193/`（`profile-web-package.json.bak-t193-20260912-174612`、`profile-web-pnpm-lock.yaml.bak-t193-20260912-174612`），以免 profile 目录被后人清理。

### 3.3 安装后差异

**① `C:\Users\辰辰洋洋\.dsh\profiles\web\package.json`**（sha 装后 `B178CAB9AF3AACD984CFC8937E6A2620C3B1D9EAABE7D1B5FE4A82A7E713BC7F`）

```text
第 10 行（新增）  "dsh-home-ilife": "link:D:/ilife/packages/plugin-home-ilife",
第 41 行（新增）        "dsh-schedule-ilife",
第 42 行（新增）        "dsh-home-ilife"        ← dsh.profile.bundles 末尾追加
```

**② `C:\Users\辰辰洋洋\.dsh\profiles\web\pnpm-lock.yaml`**（sha 装后 `553E62613F1186397E2B41996C30807EE79F330FF8BAD93C8E0EE5D92C81F90E`）

```text
第 29-31 行（新增，插在 dsh-chef 与 dsh-im-companion 之间，保持字母序）
      dsh-home-ilife:
        specifier: link:D:/ilife/packages/plugin-home-ilife
        version: link:D:/ilife/packages/plugin-home-ilife
```

> 为什么连 lock 一起改：兄弟件都在 profile lock 里有对应 `link:` 条目。只改 `package.json` 而不改 lock，会让 profile 的任何一次 `--frozen-lockfile` 安装（例如 `dsh plugin add` 别的插件）直接判红；改齐之后两边一致。

**③ 三条 Junction（前两条本席建的；第 3 条由 DSH 启动器自管，本席未手工建）**

```text
C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\dsh-home-ilife
    LinkType=Junction   Target=D:\ilife\packages\plugin-home-ilife     （经链接读 package.json.version = 0.1.0）
C:\Users\辰辰洋洋\node_modules\skill-home
    LinkType=Junction   Target=D:\ilife\packages\skill-home            （经链接读 SKILL.md 首行 = ---）
C:\Users\辰辰洋洋\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-home
    LinkType=Junction   Target=D:\ilife\packages\plugin-home-ilife\node_modules\skill-home
    （整改会话实测存在：CreationTime=2026-09-12 18:00:28，经链接读 SKILL.md 首行 = ---。
     兄弟件 bill／calorie／chef／memo／schedule **同样都在这条路上**且形状一致 ⇒ 启动器自管，**无需手工补建**。）
```

**④ 未改动的相邻件**：`dsh-bill-ilife`／`dsh-calorie`／`dsh-chef`／`dsh-memo-ilife`／`dsh-schedule-ilife`／`dsh-life-pack`／`dsh-prompt`／其余第三方包的条目与产物**一律未碰**；`cordis.yml`／`cordis.patch.yml`／`pnpm-workspace.yaml` 未动。

### 3.4 回滚命令（一条，逐字可粘贴）

```powershell
cmd /c rmdir "C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\dsh-home-ilife"; cmd /c rmdir "C:\Users\辰辰洋洋\node_modules\skill-home"; cmd /c rmdir "C:\Users\辰辰洋洋\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-home"; Copy-Item "C:\Users\辰辰洋洋\.dsh\profiles\web\package.json.bak-t193-20260912-174612" "C:\Users\辰辰洋洋\.dsh\profiles\web\package.json" -Force; Copy-Item "C:\Users\辰辰洋洋\.dsh\profiles\web\pnpm-lock.yaml.bak-t193-20260912-174612" "C:\Users\辰辰洋洋\.dsh\profiles\web\pnpm-lock.yaml" -Force
```

回滚后自检（可选，只读）：

```powershell
Get-Item "C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\dsh-home-ilife","C:\Users\辰辰洋洋\node_modules\skill-home","C:\Users\辰辰洋洋\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-home" -Force -ErrorAction SilentlyContinue; Select-String -Path "C:\Users\辰辰洋洋\.dsh\profiles\web\package.json" -Pattern 'dsh-home-ilife'
```

期望：三条 `Get-Item` 都**取不到**（链接已删）、`Select-String` **无命中**。

**第 4 处链接位 `~/.agents/skills/skill-home`：本票没建过，回滚无需处理**——整改会话实测该目录今天只有 `skill-bill`（Junction）／`skill-chef`（Junction）／`skill-memo-ilife`（Junction）／`skill-calorie`（陈旧拷贝），**没有** `skill-home`；`skill-schedule` 也不在那条路上却已装齐 ⇒ 这条路是**备选**不是必需（见 §4.3）。若票 11 按 §4.3 建了，回滚时逐字执行 `cmd /c rmdir "C:\Users\辰辰洋洋\.agents\skills\skill-home"`（**属票 11 范围**）。
说明：`cmd /c rmdir` 只删链接本身，**不动** `D:\ilife\packages\...` 里的仓库件；仓库侧的改动（源码／构建产物／根 lock）不在本条回滚范围内，要退仓库侧用 `git`（本席未提交，逐件见 §5）。

---

## 4 待票 11（#194）的事项

1. **重启 DSH 后复验技能表**：本席**没有**重启／杀掉用户正在用的 DSH（红线）。实测当前 host 进程 `pid=7404`（`DSH Desktop`，起于 `2026/9/12 17:19:01`，占 `127.0.0.1:43120`），而 `dsh-home-ilife` 进 profile 是 `17:46:37` ⇒ **插件半（`ctx.skills.registerProvider`）要下次启动才在这个 GUI 里生效**（同 #218 大厨线复审指出过的坑）。重启后应能在技能表看到 `skill-home`：名 `skill-home`、rank 600、source `bundled`、描述头「「居家管家HELP」→home.help.lookup …」。
2. **`.dsh-module-fallback\node_modules\skill-home`——已升为「确定项」**：整改会话实测该链接**已经存在**且是启动器自管的形状，**本席未手工建、也无需补建**：`C:\Users\辰辰洋洋\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-home` ＝ `LinkType=Junction`，`Target=D:\ilife\packages\plugin-home-ilife\node_modules\skill-home`，`CreationTime=2026-09-12 18:00:28`，经链接读 `SKILL.md` 首行 = `---`；兄弟件（bill／calorie／chef／memo／schedule）**同样都有这一条**、形状一致（`…\plugin-<x>-ilife\node_modules\skill-<x>`）。核验命令（逐字可粘贴）：
   ```powershell
   Get-Item "C:\Users\辰辰洋洋\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-home" -Force | Select-Object LinkType,Target,CreationTime
   ```
   **路径别找错**：它在 **web profile 下**（`.dsh\profiles\web\.dsh-module-fallback\…`）；用户主目录根的 `C:\Users\辰辰洋洋\.dsh-module-fallback\…` **不存在**。
3. **`~/.agents/skills/skill-home` 要不要建（另一条发现路，本票未授权，故未做）**：memo 线（#220 裁决 25）实测过「DSH 认技能的入口就是这个目录，建完**立刻生效、无需重载**」；该目录今天有 `skill-bill`（Junction→仓库）／`skill-chef`（Junction）／`skill-memo-ilife`（Junction）／`skill-calorie`（**陈旧拷贝**），**没有** `skill-home`。本票票面只点名「profile 与 `~/node_modules`」两处，故本席**未越界**。若票 11 重启后发现技能表仍未出现，这条路是**备选**（原稿写「首选」，改正：`skill-schedule` 不在那个目录、也已装齐（§3.1 反例），可见它**不是**必需的一条；原稿据「memo 线裁决 25」把它当首选，缺反例佐证），命令：
   ```powershell
   cmd /c mklink /J "C:\Users\辰辰洋洋\.agents\skills\skill-home" "D:\ilife\packages\skill-home"
   ```
4. **端到端那一段仍要等票 7／票 8**：`home.help.lookup` 今天只回速查列表（本席实测 `data.total >= 1`），**还没有 HELP 文件交付**；票 11 要的「裸跑 `home-cmd-read home.help.lookup` → 拿到绝对路径＋产物文件」必须等票 7／票 8 实施完成。
5. **不要为了「刷新」跑 `dsh plugin install`**：当前 profile 是「手工 Junction ＋ 手改 lockfile」的形态（与 chef 线同样的混合态）。跑 install 会重写链接方向与 `.bin`，把本报告记录的方向改掉。
6. **不要跑仓根 `pnpm build`**：会把 `plugin-bill-ilife` 的 loader 工厂包覆写成裸 ESM（#241 已立票），用户正开着的 GUI 会起不来。
7. **判据复跑命令**（票 11 收尾时贴证据用）：
   ```powershell
   "{0} B" -f (Get-Item packages\plugin-home-ilife\dist\client.js).Length
   [System.IO.File]::ReadAllLines((Resolve-Path packages\plugin-home-ilife\dist\client.js))[0]
   node --test test/client-bundle-48.test.mjs
   node --test packages/plugin-home-ilife/test/skills-provider.test.mjs
   ```

---

## 5 踩到的坑与未解决项

1. **票面「取值照老家的 `name`」不能逐字照做**（本席实测踩到的最大一个坑）：老家 frontmatter 是 `name: 居家管家`，但
   - 中文名今天**不会被 `test/skills-export-47.test.mjs` 判红**：该用例第 21 行是 `const PKGS = ['skill-calorie'];`，今天只扫卡路里一条线，**不含** `skill-home`（规则「`name` 须等于目录名且匹配 `^[a-z0-9-]+$`」仍在，但本轮范围里没有本件）。
   - **真正会拦住中文名的是宿主，不是本件的提供方**：`@deepseek-ai/dsh-skill/lib/index.js:17` 的 `const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;`（纯 ASCII），`:454` 一旦不匹配即抛 `skill provider "…" returned invalid skill name "…"`。本件提供方自己的正则（`packages/plugin-home-ilife/src/skill-provider.ts:69`）为 `/^[\p{L}0-9]+(?:-[\p{L}0-9]+)*$/u`，**接受**中文名 ⇒ 提供方这一层拦不住。
   - 提供方要求 candidate `name` 与 frontmatter 同值（`skill-provider.ts:112`），而兄弟件的技能名一律是包名风格（`skill-bill`／`skill-calorie`／`skill-memo-ilife`／`skill-schedule`）。
   故取 `name: skill-home`，老家那个中文名只保留在「触发词」与 `help_wake_word` 里。**若后来有人照「老家 frontmatter 逐字迁」，会在宿主加载时抛错（`dsh-skill/lib/index.js:454`），整个技能在 agent 侧看不见**——建议编排方把这条写进票 9／票 11 的注意事项。
2. **老家的 `metadata.openclaw.requires`（`python: ">=3.7"`）故意不迁**：那是 Python 时代的要求，新件是 Node／TS；而且**嵌套** `metadata:` 子块会让提供方的最小解析器（只认扁平 `key: value`）直接返 `null` ⇒ 整个技能在宿主里**看不见**。故本票的 frontmatter 只写扁平三键。
3. **`~/.agents/skills` 那条路本席没做**（票面未授权，属用户全局目录，会影响这台机器上所有项目）：风险与命令见 §4.3，留给票 11 用真机证据裁。
4. **并发会话的改动（非本席，未碰、未提交）**：`packages/base-render/{assets/help-template.html,src/helpShell.ts,test/help-shell-136.test.mjs}` 在本席会话期间（17:44:07／17:44:36）出现未提交改动。本席核过：全仓**没有任何** `pre*`／`post*` 钩子，本席跑的命令（`pnpm install --filter`／`pnpm --filter … run build`／`node --test …`）都不会生成这三个文件（生成器是 `packages/base-render/scripts/gen-help-shell.cjs`，本席从未调用），且 diff 内容是 help 模板的 `smartSelect`／`hm-fold` 样式与脚本改动（大厨／help 模板那条线）⇒ 判为**并发会话的在途工作**，按红线未碰、未还原、未提交。
5. **`pnpm-lock.yaml`（仓根）是本席改的**：`packages/plugin-home-ilife` importer `+4` 行（`devDependencies: tsdown 0.22.14`），属配方第 6 件的连带，随本票提交。
6. **未跑的门（按红线主动不跑）**：仓根 `pnpm test`（会顺手改写别的技能的 `SKILL.md`）；`pnpm --filter skill-home build`（会跑 `scripts/build-help.mjs` 重写 `SKILL.md` 的标记块，干扰票 9 的地盘）。本席改 `SKILL.md` 只动文件头 —— 核过 `scripts/build-help.mjs:26-28` 是按 `indexOf(START/END)` 切片重写，**frontmatter 会被原样保留**。
7. **未重建 `packages/skill-home/dist`**：本票没改 `skill-home/src`，dist 里 `dist/cli/cmd_read.js` 已在位（smoke 用例第 5、6 条真 spawn 它，7/7 绿），故无需重建。
8. **未提交**：本席只按红线 `git add` 自己的件（见 §5 末尾清单），**没有 `git commit`**——提交时机交编排方。

**本席改动的件（逐件）**（状态＝`git status --porcelain` 两列：X＝索引、Y＝工作区；`A `＝已入索引、`M `＝只入索引、`MM`＝索引与工作区都有改动。本清单已按整改会话实测订正——原稿那几个 `??` 已过期）

```text
MM packages/plugin-home-ilife/package.json          （build 分 host/client ＋ devDependencies: tsdown；test 串加 `test/skills-provider.test.mjs` 只在工作区）
M  packages/plugin-home-ilife/src/client.ts         （补 inject／apply 两件 loader 契约）
M  packages/plugin-home-ilife/src/index.ts          （inject skills ＋ 注册提供方 ＋ 删客户端再导出）
M  packages/plugin-home-ilife/tsconfig.json         （exclude src/client.ts）
M  packages/skill-home/SKILL.md                     （文件头补扁平 frontmatter）
M  packages/skill-home/package.json                 （files 补 SKILL.md）
M  pnpm-lock.yaml                                   （plugin-home-ilife importer +4 行 tsdown）
A  packages/plugin-home-ilife/src/dsh-ctx.ts        （已入索引）
A  packages/plugin-home-ilife/src/skill-provider.ts （已入索引）
AM packages/plugin-home-ilife/test/skills-provider.test.mjs （已入索引；工作区另有 7 → 9 两条未入索引）
A  packages/plugin-home-ilife/tsconfig.client.json  （已入索引）
A  packages/plugin-home-ilife/tsdown.config.ts      （已入索引）
AM docs/skills/skill-home/t193-install-report.md    ← 本报告（已入索引）
MM docs/skills/skill-home/t193-body.md              （已入索引；工作区「进度：100%」未入索引）
```

**未碰清单（红线对账）**：`packages/plugin-bill-ilife/**`、`packages/plugin-schedule-ilife/**`、`packages/plugin-memo-ilife/**`、`packages/plugin-calorie/**`、`packages/plugin-manager/**`、`packages/skill-chef/**`、`packages/skill-bill/**`、`packages/skill-calorie/**`、`packages/base-render/**`、`docs/skills/skill-chef/**`、`docs/skills/skill-memo-ilife/**`、`docs/skills/skill-home/map-220-body.md` 全部未碰；未 `gh issue edit`、未发评论、未关票；未启停任何 DSH 服务、未碰 43120。

**必报五步对账（整改会话补记，口径照 `docs/agents/structure.md:72-107`）**

- **第一步（影响清单）／第二步（结构设计）：本席未单独报批**——依据地图 `docs/skills/skill-home/map-183-body.md` 的编排句「票 10（插件侧最小安装）无阻塞、**不占用户决策时间**，可与票 12 并行交给子代理先做」；票面已把件逐条列明（`skill-provider.ts`／`dsh-ctx.ts`／两条 Junction／`files` ＋ frontmatter），子代理授权下直接开工。**如实记为「未单独报批」，不补记账。**
- **第三步（写代码）**：即上面 §1 逐件 ＋ 本节件清单。
- **第四步（超线报警）：不触发**——`packages/plugin-home-ilife/` **没有** `AGENTS.md`，本包**没有**定义告警线数字，故无「已超线」可报（本包最大源文件 `src/skill-provider.ts` 121 行）。
- **第五步（交付对账）**：实际碰到的件＝上面「本席改动的件（逐件）」14 件。与票面逐条对：① `skill-provider.ts` ✓；② `dsh-ctx.ts` ✓；③ profile ＋ `~/node_modules` 两条 Junction ✓（另加启动器自管的第 3 条，非本席建）；④ `SKILL.md` frontmatter ＋ `files` 补 `SKILL.md` ✓；⑤ 收窄 #58——**文本已备、未发**（红线不许发，故此项是「备妥」不是「已交付」）。**偏差不为零，逐条列**：多出 4 件 `src/client.ts`／`tsconfig.json`／`tsconfig.client.json`／`tsdown.config.ts`（客户端产物那组，属票面「顺带修掉实测断链」的同类实测发现），多出 1 件 `test/skills-provider.test.mjs`（回路用例，票面未逐件明列），多出 2 件文档（本报告、`t193-body.md`）。

**分区提交提醒（整改会话补）**

- 索引里**混着别家的在途件**：实测 `docs/skills/skill-chef/**`（`t236-structure-design.md`／`t6-render-wiring.md`）、`packages/skill-chef/**`（`AGENTS.md`／`SKILL.md`／`src/cli/cmd_read.ts`／`src/help/output.ts`／`scripts/**`）、`docs/skills/skill-memo-ilife/**`（`map-220-body.md`／`t240-latent-eeexist-note.md`）、`packages/base-render/**`（`assets/help-template.html`／`src/helpShell.ts`／`src/output/saveHtml.ts`／两个 test）、`packages/skill-bill/**`、`packages/skill-calorie/src/output.ts`、`packages/skill-memo-ilife/**` 都有改动。
- **提交必须分区**：只提本票那 14 件（本节清单），**别把别家的在途件一起提走**；用路径白名单 `git add -- <本票路径…>`，**不要** `git add -A`／`git add .`。
- **另一件事实**：本地 `docs/skills/skill-home/t193-body.md` 已被改成「进度：100%」，**尚未发布**（实测 `gh issue view 193`：`state=OPEN`、`comments=0`，票面正文里仍是「进度：0%」）。

---

## 6 准备但**未发布**的文本

### ① 建议的 #58 收窄评论正文（照 #143 对 #59 的做法，不建阻塞边）

```markdown
## 交叉引用：本票范围内的四项已由 #193 做完，本票按其收窄（不改状态、不建阻塞边）

按地图 #183 的 [插件侧最小安装 #193](https://github.com/FeatherHunter/ilife/issues/193)（照 #143 对 [#59](https://github.com/FeatherHunter/ilife/issues/59) 的同一做法），本票原先并入的**四项**已在那里完成，本票不再重复实现：

| 原属本票 | 现落点（#193） |
|---|---|
| `SKILL.md` 补 frontmatter（skills-cli 可认出 skill-home） | `packages/skill-home/SKILL.md` 文件头补扁平 YAML 头（`name: skill-home`／`description`／`help_wake_word: "居家管家 帮助"`），`packages/skill-home/package.json` 的 `files` 补 `SKILL.md` |
| 打包技能提供方（cookbook §12，badge 同形） | `packages/plugin-home-ilife/src/skill-provider.ts`（PROVIDER_NAME=dsh-home-ilife／SKILL_NAME=skill-home／rank 600 内联／单份 SKILL.md 按包名解析、不复制）＋ `src/dsh-ctx.ts` 镜像 ＋ `src/index.ts` 的 `inject` 加 `skills` ＋ 重名退让；回路 `packages/plugin-home-ilife/test/skills-provider.test.mjs` 7/7 绿 |
| client 工厂包（**产物形态**这一层） | `tsconfig.json` 排除 `src/client.ts` ＋ 新建 `tsconfig.client.json`／`tsdown.config.ts` ＋ `package.json` build 分 host/client；实测 `dist/client.js` 由 837 B 裸 ESM 变 3541 B loader 工厂包（首行 `window.__ModuleLoader__.load({`），`node --test test/client-bundle-48.test.mjs` **21 pass / 0 fail** |
| 把技能装到 agent 读得到的位置（profile 与 `~/node_modules` 走 Junction） | 已装进 web profile：`link:D:/ilife/packages/plugin-home-ilife` ＋ `dsh.profile.bundles` 加一项 ＋ profile 与 `~/node_modules` 两条 Junction（备份与逐字回滚命令见 `docs/skills/skill-home/t193-install-report.md`） |

**本票剩余范围**（不变）：面板达到卡路里 parity（sidebar 槽 order 85 真面板、软依赖有界重试 10 次、AbortSignal 超时、三态渲染、`inject` 含 `connection` ＋ effect 外圈兜底）、通道单段 read 端点（host 真注册 RPC）、桥 `resolveNodeBin` ＋ 20s 超时、版本行与双 package.json 一致、**双路 HELP 证据里「面板落字」那一路**。其中「DSH agent 技能目录可见 skill-home」由 #183 的[真机端到端 #194](https://github.com/FeatherHunter/ilife/issues/194) 复验——#193 未重启 DSH 进程，插件半要下次启动才在用户当前 GUI 生效。

**状态仍为 open，不加阻塞边。**
```

### ② 票 10（#193）的建议进度与「下一步」一句话

```markdown
## 进度：100%

下一步：无阻塞——技能提供方、客户端产物缺陷、skill-home 两处断链、profile 装到 agent 读得到的位置四件全部做完（实测证据见 `docs/skills/skill-home/t193-install-report.md`）；本票无待办，票 11（#194）重启 DSH 后复验技能表即可。
```

---

## 7 证据文件索引（本席留在 `.scratch/home-t193/`，非提交物）

| 文件 | 内容 |
|---|---|
| `baseline.txt` | 修前 baseline（837 B／首行／门禁 18-3） |
| `gate-before-tap.txt` / `gate-after-tap.txt` | 门禁 ① 修前 / 修后 TAP 全文 |
| `skills-provider-tap.txt` / `smoke-tap.txt` | 本包两套用例 TAP 全文 |
| `p10-boundaries-tap.txt` / `p10-install-tap.txt` / `scaffold-tap.txt` | 兼跑门 TAP 全文 |
| `build.txt` | 强制重建全过程（tsc -b ＋ tsdown 输出） |
| `before-client-js.txt` | 全仓 `dist/client.js` 修前指纹 |
| `probe.txt` | 提供方真回路探针（仓库目录 ＋ profile junction 两次） |
| `frontmatter-selfcheck.txt` | skills-cli 发现规则逐条自检 |
| `install.txt` | `pnpm install --filter dsh-home-ilife` 全过程 |
| `install-profile.txt` / `install-junction.txt` | 安装前备案与 sha、两条 Junction 的创建与验证 |
| `profile-web-package.json.bak-t193-20260912-174612` / `profile-web-pnpm-lock.yaml.bak-t193-20260912-174612` | profile 两个配置文件的备份副本 |
| `probe-provider.mjs` / `frontmatter-selfcheck.mjs` | 上面两个探针脚本（可复跑） |
