# t10 对抗式审查（A：装机事实核对员）

审查对象：`docs/skills/skill-chef/t10-install.md`（409 行），对应 wayfinder #208 的票 #218。
默认立场：报告里的每个「已完成」「门全绿」都可能是过期、自证、或只在他自己条件下成立。
本审查只读：未跑 `dsh plugin install/remove`、未改 `~/.dsh/profiles/web/**`、未动任何 Junction、未起停任何服务。开工与收尾各核一次端口 **43120 仍 LISTENING（pid=31252）**，探针用过的 **3081 已释放**。

## 判定

- **总分：7.5/10**
- **一句话结论**：本票的仓库侧代码、六道门、装机四个链接位、#57 三处收窄**逐条经得起独立复核且多数逐字对上**，`snapshot:check` 红确属预存并有可复算的铁证；但票面「`~/node_modules` 走 Junction」**只做了一半**（那一处实测是普通目录且是 09-07 的陈旧拷贝），报告「技能包名只写一处」**为假**，回滚命令**漏第四个链接位**，另有 2 处自曝不足的测量瑕疵与 1 句过期引用。**结论：留着是安全的，不必回滚。**
- **证伪条数：3 条硬证伪（票面漏项 1／结构断言假 1／回滚不完整 1）＋ 3 条报告未自曝的测量与文档瑕疵。**

## 一、逐项核对结果

| # | 报告的原话 | 我的独立证据（命令＋输出） | 判定 | 影响 |
|---|---|---|---|---|
| 1 | 新增 `src/skill-provider.ts`，125 行 | `[IO.File]::ReadAllBytes` 计 `\n`：bytes=5074 LF=**125** CR=0 no-BOM | 证实 | 无 |
| 2 | `PROVIDER_NAME='dsh-chef'`／`SKILL_NAME='skill-chef'`／`BUNDLED_SKILL_RANK=600` 内联 | 读 `skill-provider.ts:22,25,28`：`'dsh-chef'`／`'skill-chef'`／`600` 逐字对 | 证实 | 无 |
| 3 | 技能包名**只写一处**（`bridge.ts` 的 `SKILL_PACKAGE`） | `bridge.ts:15 SKILL_PACKAGE='skill-chef'` **加上** `skill-provider.ts:25 SKILL_NAME='skill-chef'`；全 `src/*.ts` 单引号字面量计数：bridge 1／skill-provider 1 | **证伪** | 结构断言不成立；漂移风险由测试锁兜住 |
| 4 | 单份 SKILL.md 按包名解析**不复制** | `skill-provider.ts:34 createRequire(import.meta.url).resolve(SKILL_PACKAGE + '/package.json')` 后 `dirname`；全文件无 `copyFile`／`writeFile` | 证实 | 无 |
| 5 | 新增 `src/dsh-ctx.ts`，56 行，6 个 interface，type-only | LF=**56**；grep `interface`：`SkillInvocationPolicy`／`SkillCandidate`／`SkillDefinition`／`SkillProvider`／`SkillsFace`／`SkillHostCtx` 恰 6 个 | 证实 | 无 |
| 6 | `inject` 由 `[]` 改 `['skills']` | `index.ts:14 export const inject: readonly string[] = ['skills']` | 证实 | 无 |
| 7 | **删掉** `./client.js` 那一整行值导出 | `index.ts:47` 只剩 `export type { HostCaller } from './client.js';`；全文件无 `export {...} from './client.js'` | 证实 | 无 |
| 8 | `client.ts` 补 loader 契约的 `inject` 空数组＋`apply` 占位 | LF=**43**；`client.ts:21 inject=[]`、`:29 export function apply(): void {}`；`git diff` 显示只增这 14 行 | 证实 | 无 |
| 9 | 新增 `tsdown.config.ts`，47 行，与 bill 同形只改 PLUGIN_ID | LF=**47**；`PLUGIN_ID='dsh-chef'`；与 bill 逐行 diff 仅注释与 ID 差异；无幽灵票号 | 证实 | 无 |
| 10 | 新增 `tsconfig.client.json`，`include` 收 5 个 src 文件 | LF=**14**；与 `plugin-bill-ilife/tsconfig.client.json` **逐字节相同**（`git diff --no-index` exit 0），两边 include 都是那 5 个文件 | 证实 | 无（报告用 `src/{…}.ts` 简写，非 glob） |
| 11 | 改 `package.json`：`build:host && build:client`／`typecheck`／`tsdown@0.22.14` | 实读：`"build": "npm run build:host && npm run build:client"`、`"typecheck": "tsc -p tsconfig.client.json"`、`devDependencies:{"tsdown":"0.22.14"}` | 证实 | 无 |
| 12 | 新增 `test/skills-provider.test.mjs`，8 例 | LF=**117**；`it(` 计数 = **8**；`smoke.test.mjs` = 7 → 8+7=15 与门 2 实测吻合 | 证实 | 无 |
| 13 | `SKILL.md` 首行插 frontmatter，正文一字未改，无 BOM、无 CRLF | 首 3 字节 = **45 45 45**（无 BOM）；LF=78 CR=0；line1 `---`、line2 `name: skill-chef`、line3 `description: "…"`、line4 `---`；`git diff --numstat` = **4 增 0 删**（纯插入，正文零改动） | 证实 | 无 |
| 14 | description 覆盖 `WAKE_TABLE` 全部 **37** 条 | 我自解析 `src/policy/wakewords.ts` 的 `{ phrase: '…'` → **37** 条；逐条 `desc.Contains` → **missing=0**；且**顺序与源码一致** | 证实 | 无 |
| 15 | `skill-chef/package.json` 的 `files` 补 `SKILL.md` | 实读 `["dist","templates/*.html","SKILL.md"]` | 证实 | 无 |
| 16 | 清单外新增 `scripts/add-frontmatter-218.mjs` | LF=29，存在于包内 `scripts/`；逻辑确为「从 WAKE_TABLE 抽取拼接」且幂等分支正确 | 证实（且报告已自曝） | 无 |
| 17 | 清单外改 `pnpm-lock.yaml` | `git diff --no-index bak-218 → 现行` = **4 增 0 删**，内容恰为 `packages/plugin-chef` 的 `devDependencies: tsdown` 块 | 证实（且报告已自曝） | 无 |
| 18 | 报告引宿主出处：`dsh-skill/lib/index.js:147/452/259` | 实地核 `…@deepseek-ai/dsh-skill/lib/index.js`（565 行）：147 = `registerProvider(create) {`；452 = `function validateCandidate(candidate, providerName) {`；259 = `if (definition.name !== match.candidate.name) {`；宿主 `BUNDLED_SKILL_RANK = 600` 在 line 23；`already registered` 抛错文案在 line 101 | 证实（**报告没吹但确实成立**） | 无 |
| 19 | 重名退让靠 `includes('already registered')` | 宿主 line 101 逐字 `` `a skill provider named "${name}" is already registered` `` → 子串匹配成立 | 证实 | 无 |
| 20 | 「`skill-chef` 仍在 `check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN` 里，4 元素名单」 | 工作树现为 **line 41、3 元素** `['skill-chef','skill-home','skill-memo-ilife']`；`git show HEAD:` 才是 line 37、4 元素 | **证伪（过期）** | 实质结论（chef 未移出）仍对；只是该句抄的是 HEAD |
| 21 | 四道源码门报告值 | 见第三节；6/7 与报告逐字一致 | 见第三节 | — |

## 二、证伪与硬伤（最重要）

### 证伪 1（票面漏项，最重要）· 票面「profile 与 `~/node_modules` 走 Junction」只做了一半

票面 `docs/skills/skill-chef/t10-body.md:6` 逐字要求：「profile 与 `~/node_modules` 走 Junction（可回滚）」。

实测：

```
Get-ChildItem $env:USERPROFILE\node_modules | ? Name -match chef | % { Get-Item -Force $_.FullName }
skill-chef   LinkType=[]   Attributes=Directory   Target=(空)
dsh-chef     LinkType=[]   Attributes=Directory   Target=(空)

Get-Item -Force $env:USERPROFILE\node_modules\skill-chef   → Attributes=Directory, ReparsePoint=0
   条目：dist, templates, package.json   ← 没有 SKILL.md
   package.json: files = ["dist","templates/*.html"]   ← 旧版，缺 SKILL.md
   package.json: base-link-core ^0.1.0                  ← 仓内已是 ^0.3.0
   mtime = 2026-09-07 16:40:20/21                        ← 早于本票（09-11 备份 / 09-12 建链）
```

三点结论：

1. **`~/node_modules/skill-chef` 与 `~/node_modules/dsh-chef` 都不是 Junction，是普通目录**——票面点名的第二处链接位**根本没做**。报告全文未提这一处，而它的「装机」表与「回滚」块都只覆盖 profile 侧。
2. 二者是 **09-07 就存在的陈旧拷贝**（比本票早 5 天），本票既没建也没清理、也没记录。
3. `~/node_modules/skill-chef` **没有 SKILL.md**。这与本票修掉的那处断链是同一个类：若任何解析落到这一份，提供方 `list` 会静默返空。

**影响判定（我实测为「当前不致命」）**：`bridge.ts` 的 `resolveSkillCli()` 与 `skill-provider.ts` 的 `skillDir()` 都从**插件自身位置**（`import.meta.url`）往上找，profile 那份 `node_modules/skill-chef` 是 Junction 已落在同层，Node 更近的解析位会命中它，**不会走到 `~/node_modules`**。故功能面此刻无碍——但票面这一条**记为未完成**，不能算已做。另外这处陈旧拷贝里 `description` 仍是旧版，与 #208 该图「安装副本要回指仓库」的既有教训（`docs/research/t82-review.md:57`、`docs/skills/skill-memo-ilife/map-220-body.md:46` 都记过「四处安装副本」）同类，属该图已知的坑。

### 证伪 2 · 「技能包名只写一处」为假

报告 §第二步「名字出处（铁律四）」原话：「技能包名**只写一处**（`src/bridge.ts` 的 `SKILL_PACKAGE`），`skill-provider.ts` 引用它，不在第二个文件里再写一遍 `'skill-chef'`。」

实测（`Get-ChildItem src/*.ts` + 正则数单引号字面量）：

```
bridge.ts         : 1 处   ← SKILL_PACKAGE = 'skill-chef'
skill-provider.ts : 1 处   ← SKILL_NAME    = 'skill-chef'   ← 第二处，报告断言说没有
client.ts / dsh-ctx.ts / index.ts / settings.ts / slot.ts : 0 处
```

**「不在第二个文件里再写一遍」这句被 `skill-provider.ts:25` 直接反驳。** 缓解事实：`skills-provider.test.mjs:111` 有「`SKILL_NAME` 与 `SKILL.md` frontmatter 实测值逐字一致」的锁，两处不能静默漂移；但**结构断言本身是假的**，报告把它当成了铁律二的落地证据。

### 证伪 3 · 回滚命令漏第四个链接位

报告回滚块只处理 3 个 Junction：

```powershell
cmd /c rmdir "…\profiles\web\node_modules\skill-chef"
cmd /c rmdir "…\profiles\web\.dsh-module-fallback\node_modules\skill-chef"
cmd /c rmdir "…\.agents\skills\skill-chef"
```

但本票的 `dsh plugin --profile web install` 还建了**第四个**：`…\profiles\web\node_modules\dsh-chef` → `D:\ilife\packages\plugin-chef`（实测确认，`LinkType=Junction`）。**回滚后它会作为悬空 Junction 留下。**

**功能性判定：回滚仍然成立、GUI 能起。** 因为回滚同时还原了 `profile/package.json`（`dsh-chef` 从 `dependencies` 与 `dsh.profile.bundles` 双删）——DSH 的装配清单来自 `dsh.profile.bundles`，不是「node_modules 里有什么就装什么」，所以第四个链接位不被读。但**报告说「逐条可执行」「回到原状」不完整**，且它没把这处写进「没有留备份的项」清单。另：回滚块亦未处理仓库 `pnpm-lock.yaml`（有 `bak-218` 可原）与 `packages/plugin-chef/node_modules/tsdown`（`pnpm install` 可复现），这两项属源码侧、不涉真机启动，报告在「不确定项」第 6 条自曝过 lockfile。

### 瑕疵 4 · 「行首 ESM 0 处」是正则口径造出来的，不是文件的性质

用更宽的正则扫同一批 67 件（`^\s*(import|export)\s`）会命中 **2 处**，都在 `dsh-better-sidebar.js`：

```
line 8596: "  export extends false finally for from function get if implements import in instanceof interface"
line 8666: "    import interface map package range return select struct switch type var nil iota make new len"
```

实读内容：这是 **SQL 关键字列表字符串**（两侧带缩进的普通字符串行），**不是 ESM 语法**。

判定：报告的 `probe-analyze.mjs:10` 正则更严（要求 `import … from '…'` 或 `export` 后接 `default|const|function|class|{|*`），所以它得 0；我的宽口径得 2、且 2 处都是假阳性。**#48／#150 那类「裸 ESM → 整条脚本死」的结论仍然成立**（16,663,701 字节里确无真 ESM），但报告把「0 处」当成绝对事实，实际它是**依赖特定正则的读数**。写「0 处」严格说不错，写「一处都没有」则略过头。

### 瑕疵 5 · 「注册头写法不同」是循环论证

报告「不确定项」第 5 条称 `dsh-mattpocock-skills-deck`／`dsh-vision-router` 「注册头写法与前 65 个不同，我的正则取不到 `id`」。实读两件注册头：

```
dsh-mattpocock-skills-deck.js:  __ModuleLoader__.load({\n  id: 'dsh-mattpocock-skills-deck',\n  factory: …
dsh-vision-router.js:           __ModuleLoader__.load({\n  id: 'dsh-vision-router',\n  factory: …
dsh-chef.js（对照）:            __ModuleLoader__.load({\n\tid: "dsh-chef",\n\tfactory: …
```

真相：**写法没有不同，只是这两件用单引号**、其余用双引号；是报告自己的正则 `probe-analyze.mjs:12 id:\s*"([^"]+)"` **只认双引号**。「取不到 id」是正则的限制，报告却据此推断「它们写法不同」并写进不确定项——**理由循环**。结论（不是异常）我用宽松解析器复核后**确认成立**（67 件全部能解出 id；`LOAD!==1` 的只有 `@deepseek-ai/dsh-client-modules` 一件，恰好 2 次）。

### 瑕疵 6 · `check-boundaries.mjs:37` 那句是过期引用

报告门 5 写：「`skill-chef` **仍在** `tooling/check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN` 名单里（`['skill-chef','skill-home','skill-schedule','skill-memo-ilife']`）」。

实测同一个文件：`git show HEAD:` → line 37、4 元素；**工作树 → line 41、3 元素**，`skill-schedule` 已被另一个会话按 #199 移出。报告抄的是 HEAD 版。PASS 结论与「chef 未被本票移出」均不受影响，但行号与数组内容都过期了。

### 瑕疵 7（安全提示，非报告错误）· `dsh plugin install` 会重写链接方向，回滚卡里的操作顺序要小心

报告「不确定项」第 9 条已自曝：`.dsh-module-fallback/node_modules/skill-chef` 的目标在 install 后被 pnpm 从「直指仓库包」改指为「经 `plugin-chef/node_modules` 一跳」。我实测两个锚点 `fs.realpathSync.native` **确实都落回 `D:\ilife\packages\skill-chef`**，报告这条如实。

要提醒票 11 的是：**回滚后再跑一次 `dsh plugin --profile web install` 会由 pnpm 重新生成链接位与 `.bin`，与手工 Junction 的形态不同**；报告自己也记了「profile 的 `.bin` 没有 `chef-cmd-read`（skill-chef 是手工接的，pnpm 没建 shim）」。即**当前形态是「手工 Junction ＋ pnpm 部分接管」的混合态**，可复现性依赖「不要再跑 install」。这一点报告在不确定项 2／9 有所触及，但没有把「不要再跑 install」写成一句明确警告。

## 三、门复跑结果（逐门：报告值 vs 我实测值）

| 门 | 报告 | 实测 | 一致？ |
|---|---|---|---|
| 1 · `node --test test/client-bundle-48.test.mjs` | tests 21 / pass 15 / **fail 6**；红 = `dsh-home-ilife` 3 ＋ `dsh-schedule-ilife` 3；`dsh-chef` 3 例绿 | **tests 21 / pass 15 / fail 6**；逐包红数：`dsh-home-ilife` **3**、`dsh-schedule-ilife` **3**；`dsh-chef`／`dsh-bill-ilife`／`dsh-calorie`／`dsh-life-pack`／`dsh-memo-ilife` 各 3 绿 | **一致（逐包红数也是 3＋3）** |
| 1b · `dsh-chef/dist/client.js` 首三行 | `window.__ModuleLoader__.load({` / `id: "dsh-chef",` / `factory: (require) => {` | 逐字相同 | 一致 |
| 2 · `node --test packages/plugin-chef/test/*.test.mjs` | tests 15 / pass 15 / fail 0 | **tests 15 / pass 15 / fail 0**（suites 2；8 例 + 7 例） | 一致 |
| 3 · `node --test packages/skill-chef/test/*.test.mjs` | tests 24 / pass 24 / fail 0 | **tests 24 / pass 24 / fail 0**（suites 5）。另核：该批用例**只读**（`skill.test.mjs` 仅 `readFileSync` ＋ 导入 `build-help.mjs` 的纯函数，不触发其 `writeFileSync`）——不会改 SKILL.md | 一致 |
| 4 · `npx tsc -b` | 无输出 exit=0 | 按审查约束**未真跑**（会写 dist）；改跑 `npx tsc -p packages/plugin-chef/tsconfig.client.json --noEmit` → **exit 0**，事后 `git status packages/*/dist` 为空 | 部分（方向一致，未逐一复现仓级 `-b`） |
| 5 · `npm run boundaries` | 4 行技能 OK（chef／home／schedule／memo）＋ 未迁移扫描，`PASS` exit=0 | **3 行技能 OK**（chef／home／memo，**无 schedule**）＋ 同上扫描，`boundaries: PASS` exit=0 | **不一致（报告多一行 schedule）**；原因见瑕疵 6，另一会话按 #199 改了名单 |
| 6 · `npm run snapshot:html:check` | `185 件产物，changed=0 added=0 removed=0 base-* 指纹 6fb8f1117564334955005b5f2a3352f1，base-* 文件 26 件` | 逐字相同（stderr 另有一条 schedule dist 陈旧 WARN，与 chef 无关） | 一致 |
| 7 · `npm run snapshot:check` | **红** `FAIL: 快照过期（文件 0.1.0@932e7b250d278d50 ≠ 实际 0.1.0@ef9b16473d03cf19）` | **红，逐字相同** | 一致 |
| — 仓级 `pnpm test` | 报告称**未跑** | 我亦未跑（会改写别的技能 SKILL.md） | 一致（均未跑） |

**关于门 5 的不一致要说清**：报告写这 4 行时，工作树里该名单**已**被 #199 会话改成 3 元素。故这不是「报告造假」，而是**报告抄了 HEAD 的注释与行号**（`SKILLS_BASE_FROZEN` 的 `skill-chef` 成员身份与 PASS 结论都不受影响）。

## 四、装机面只读核对（profile／3 个 Junction／3 个备份／回滚命令）

### 4.1 profile `C:\Users\辰辰洋洋\.dsh\profiles\web\package.json`

| 项 | 报告 | 实测 | 判定 |
|---|---|---|---|
| `dependencies["dsh-chef"]` | `"link:D:/ilife/packages/plugin-chef"` | 逐字相同 | 证实 |
| `dsh.profile.bundles` 含 `dsh-chef` | 末尾追加，位置 `… dsh-bill-ilife, dsh-calorie, dsh-memo-ilife, dsh-chef` | `bundles` 共 16 项，末尾 4 项逐字相同 | 证实 |
| 改动前那份 | `package.json.bak-218` = 1148 B | 存在，**1148 B**；与现行 Compare-Object 差异**恰为那 3 处**（+dsh-chef 依赖、+尾逗号、+dsh-chef 装配项，其余零差异） | 证实 |

### 4.2 链接位（`Get-Item -Force` 看 `LinkType`／`Target`）

| 位置 | 报告称 | 实测 `LinkType` | 实测 `Target` | 判定 |
|---|---|---|---|---|
| `profile/node_modules/skill-chef` | Junction → `D:\ilife\packages\skill-chef` | **Junction** | `D:\ilife\packages\skill-chef` | 证实 |
| `profile/.dsh-module-fallback/node_modules/skill-chef` | Junction → 经 `plugin-chef/node_modules` 一跳 | **Junction** | `D:\ilife\packages\plugin-chef\node_modules\skill-chef` | 证实（目标确如报告所记） |
| `~/.agents/skills/skill-chef` | Junction → `D:\ilife\packages\skill-chef` | **Junction** | `D:\ilife\packages\skill-chef` | 证实 |
| （报告未列）`profile/node_modules/dsh-chef` | — | **Junction** | `D:\ilife\packages\plugin-chef` | 存在，报告漏记 |
| 中转一跳 `plugin-chef/node_modules/skill-chef` | 报告称「也是一条 Junction」 | **Junction** | `D:\ilife\packages\skill-chef` | 证实 |
| **票面要求的** `~/node_modules/skill-chef` | 报告未提 | **空（普通目录）** | — | **证伪，见第二节** |

两个锚点 realpath 复核（`fs.realpathSync.native`）：`profile/node_modules/skill-chef` 与 `profile/.dsh-module-fallback/node_modules/skill-chef` **都落 `D:\ilife\packages\skill-chef`** —— 报告 8b 这条如实。

### 4.3 三个备份

| 备份 | 报告字节数 | 实测 | 判定 |
|---|---|---|---|
| `profile/package.json.bak-218` | 1148 B | **1148 B**，mtime 09-11 16:19:18 | 证实 |
| `profile/pnpm-lock.yaml.bak-218` | 102012 B | **102012 B**，mtime 09-11 16:19:25 | 证实 |
| `D:\ilife\pnpm-lock.yaml.bak-218` | （报告未给字节数） | 存在，51954 B，mtime 09-12 17:27；与现行 lock 差异**恰为** `plugin-chef` 的 `tsdown` devDependencies 块（4 增 0 删） | 证实（且可回滚） |

### 4.4 回滚命令正确性（照它跑能不能真回到装前状态）

逐条检查报告回滚块：

| 命令 | 路径/目标对否 | 评估 |
|---|---|---|
| `Copy-Item package.json.bak-218 → package.json -Force` | 路径对，备份在位且差异恰为本票 3 处 | **成立** |
| `Copy-Item pnpm-lock.yaml.bak-218 → pnpm-lock.yaml -Force` | 路径对，备份在位 | **成立** |
| `rmdir profile\node_modules\skill-chef` | 实测该位是 Junction，`rmdir` 只删链接不动目标 | **成立** |
| `rmdir profile\.dsh-module-fallback\node_modules\skill-chef` | 同上，实测是 Junction | **成立** |
| `rmdir ~\.agents\skills\skill-chef` | 同上，实测是 Junction | **成立** |
| —— | **漏 `profile\node_modules\dsh-chef`** | **不完整，见证伪 3** |
| 重启 DSH 后生效 | 与「装配清单来自 `dsh.profile.bundles`」一致 | **成立** |

**裁定：照它跑能把用户 GUI 正确恢复到装前（能起、bundle 清单干净），但会留下一个悬空 Junction，且未覆盖仓库 lockfile；「逐条可执行 → 回到原状」应降级为「GUI 功能面回到原状」。** 三个 Junction 拆掉后不会伤仓库包（`rmdir` 语义），这点报告写对了。

**取证过程未越界复核**：全程未执行回滚块、未建/删任何链接；仅做 `Test-Path`／`Get-Item -Force`／`Get-Content`／`git status/diff`／`gh api` 读操作。

## 五、真机证据的可核性（逐条：已核／无法判定）

| 证据 | 报告结论 | 我的处理 | 判定 |
|---|---|---|---|
| 8a `dsh --profile web --dump-config` 含 `# == dsh-chef` | 有 | **未起服务**。改为只读查配置根据：`packages/plugin-chef/cordis.patch.yml` 含 `- insert: - id: dsh-chef / name: 'dsh-chef'`，且该文件 `git status` **未被本票改动**（P10 脚手架既有）；profile `dsh.profile.bundles` 末尾确含 `dsh-chef`。**结论「可能成立且根据齐备」** | **部分可核（配置根据成立）；最终输出本身：无法判定（需起服务，本审查不动真机）** |
| 8b 提供方 list/get；`resolve('skill-chef/package.json')` = `D:\ilife\packages\skill-chef\package.json` | 该绝对路径 | **只读可核**：从 `profile/node_modules/skill-chef` 出发 `realpathSync.native` = `D:\ilife\packages\skill-chef`，其 `package.json` 与 `SKILL.md` 均在（`Test-Path` true） | **已核（解析落点成立）** |
| 8b 其余数值（`host exports=34`／`list.length=1`／`get.content.bytes=6984`／`RANK=600` 等） | 各值 | 常量与逻辑已核（provider 只 list 一件、`SKILL_NAME`/`PROVIDER_NAME`/`600` 逐字对）；**运行时那一次读数**无法复现 | **无法判定（需起服务）** |
| 8b 「本会话技能目录当场多出 `skill-chef`」 | 发现层真读到 | 依赖活进程状态，只读无法取 | **无法判定** |
| 8c `chef-cmd-read` 运行时可解析（`exit=0`、`envelope.key=chef.help.lookup`、`total=37`） | 通过 | 按约束**未执行** `chef-cmd-read`（会建库）。只读核：`cliPath()` 逻辑与 `SKILL_CLI_REL` 一致；`packages/skill-chef/dist/cli/cmd_read.js` 与 `SKILL.md` 均在 | **无法判定（需执行，本审查不执行）** |
| 8c 「`chef-cmd-read` 不在 PATH」 | 未做到，如实记 | **我复核成立**：profile `.bin` 无 `chef-cmd-read`；`~/node_modules/.bin/chef-cmd-read.cmd` 在但 `~/node_modules/.bin` 不在 PATH（PATH 只有两处 `D:\2Study\nodejs`） | **已核，报告如实** |
| 8d 探针 67 模块／16,663,701 B／LOAD 68／行首 ESM 0 处 | 各值 | **已核**（用落盘凭据 `.scratch/chef-help/probe-modules/` 与 `probe-boot.json` 独立复算）：文件 **67**、字节 **16,663,701**、`__ModuleLoader__.load(` 计数 **68**、`boot.entries` **67**、`dsh-chef` 段存在且 url `…rev=5694c703b4eeb23e-54` 逐字相同。**行首 ESM「0」有口径依赖，见瑕疵 4** | **数值已核；「0 处」口径需附注** |
| 8d 「67 模块 vs LOAD 68 差 1」 | 报告 line 336 有解释：多出的 1 是 `@deepseek-ai/dsh-client-modules` 自注册两次（自举件），不是重复注册的插件 | **已核且成立**：我的独立分析显示 `LOAD!==1` 的模块**只有** `@deepseek-ai/dsh-client-modules`（loads=2），其余 66 件各 1 | **已核（报告有解释，且解释正确）** |
| 8d 「两个 `注册id=undefined` 模块不是异常」 | 判读，非证明 | 结论成立（两件 id 可解析、loads 均 1、行首 ESM 均 0），**但理由错**（见瑕疵 5） | **结论已核／理由证伪** |
| 8d 探针实例已停（3081 free） | — | `Get-NetTCPConnection -LocalPort 3081` → 未监听 | **已核** |
| 「全程没碰 43120」 | — | `43120 LISTENING pid=31252` | **已核** |

## 六、#57 收窄核对

| 项 | 报告称 | `gh api` 实测 | 判定 |
|---|---|---|---|
| 标题 | `chef复制样板线（桥＋面板＋双路证据）` | **逐字相同** | 证实 |
| 正文加范围收窄注记 | 顶部注记，指向 #218 与 `t10-install.md` | 现行正文第 9 行逐字为「> **范围收窄（2026-09-12，地图 #208 票 10）**：原本并入本票的「`SKILL.md` frontmatter ＋ 打包技能提供方 ＋ DSH 真机装机」三项，已由 [#218…] 落地…本票**只留桥＋面板＋双路证据**…两票不建阻塞边（照 #143 对 #59 的做法）」 | 证实 |
| `Destination` 两句移出 | 加括号说明 | 现行 `Destination` 段下确有「> （原「SKILL.md 补 frontmatter…」与「提供方达到卡路里 parity…」两句已移出本票——见上方范围收窄注记与 #218。）」；`下一步` 与 `范围` 两节也已同步去掉 | 证实 |
| 评论存在 | `#issuecomment-5643215760` | `gh api …/comments`：**id=5643215760**、`html_url` 与报告给的 URL **逐字相同**、author=FeatherHunter；正文含三行对照表 + 两处断链点说明 + 「`dist/client.js` 现由 tsdown 产出，改 `src/client.ts` 后要跑 `npm run build:client`」这条前置提醒 | 证实 |
| 状态 | 仍 `open` | `"state":"open"` | 证实 |
| 阻塞边 | 全 0 | `blocked_by` = 0、`blocking` = 0 | 证实 |
| 评论条数 | 1 | `comments` = 1（只有本票这一条） | 证实 |

**一处额外确认（报告没写但很关键）**：那条前置提醒「改 `src/client.ts` 后要跑 `npm run build:client`，不是只跑 `tsc -b`」**是真的且必要**。实读 `packages/plugin-chef/tsconfig.json`：`outDir=./dist`、`include=["src"]` —— `tsc -b` 会把 `src/client.ts` 重新编译成**裸 ESM 覆写 `dist/client.js`**，正好毁掉 loader 注册头。报告的警告有实据支撑。

## 七、票面覆盖

票面原文见 `docs/skills/skill-chef/t10-body.md`（12 行）。

| 票面要求 | 判定 | 依据 |
|---|---|---|
| 新增 `src/skill-provider.ts`：技能提供方（名与介绍可查、可按需读全文） | ✅ | 文件在位 125 行；`list` 给 name/description，`get` 给 `content` 全文 |
| rank **600** | ✅ | `BUNDLED_SKILL_RANK = 600`，与宿主 `dsh-skill/lib/index.js:23` 的 `BUNDLED_SKILL_RANK = 600` 同值 |
| 单份 `SKILL.md` 按包名解析（**不复制**） | ✅ | `createRequire.resolve(SKILL_PACKAGE + '/package.json')` → `dirname`；代码里无任何复制/写入 |
| `inject` 加 `skills` | ✅ | `index.ts:14 ['skills']`；测试 8 例中第 1 例锁此 |
| 重名退让 | ✅ | `index.ts:28-34` try/catch `includes('already registered')` → `warn` 留痕、他错重抛；宿主抛错文案在 line 101 |
| **profile 与 `~/node_modules` 走 Junction（可回滚）** | ❌ **半做** | profile 侧 3 处 Junction ✅；**`~/node_modules` 侧实测是普通目录（09-07 陈旧拷贝），报告未提** |
| 顺带修断链①：`package.json` 的 `files` 缺 `SKILL.md` | ✅ | 现为 `["dist","templates/*.html","SKILL.md"]`；旧版可从 `~/node_modules` 那份陈旧拷贝反证（`files=["dist","templates/*.html"]`）；测试第 7 例上锁 |
| 顺带修断链②：`SKILL.md` 缺 frontmatter | ✅ | 现行首行 `---`＋name＋description；`git show HEAD:` 版无 frontmatter（diff 4 增 0 删）；description 37 条覆盖已独立复算 |
| 跑通后**收窄 #57**：范围去掉 ＋ 留评论（照 #143 对 #59，不建阻塞边） | ✅ | 标题／正文／评论三处均已成立；`state=open`、`blocked_by=0`、`blocking=0` |
| 「照 #150 的做法」 | ✅ | 文件名与 `plugin-bill-ilife` 同名同形（`tsdown.config.ts` 逐行同构、`tsconfig.client.json` 逐字节相同、`client.ts` inject/apply 补法同形、`index.ts` 去 `./client.js` 值导出同形） |

**漏项：1 条**（`~/node_modules` 走 Junction）。其余 9 条全部落实。

## 八、给票 11 的提示

1. **`~/node_modules` 那处要么补做、要么在票 11 里明确记为「不做并说明理由」。** 现状是**票面要求了一件、报告声称做了、实测没做**——这是账目问题，不是功能问题，但会误导下一个票。
2. **`~/node_modules/skill-chef` 是没有 `SKILL.md` 的陈旧拷贝**（09-07，`files` 缺项，`base-link-core ^0.1.0`）。`~/node_modules/dsh-chef` 同样陈旧（`build` 还是裸 `tsc -b`、无 tsdown）。若票 11 打算「让 agent 直接敲 `chef-cmd-read`」而走 PATH 全局短路（照 `calorie-cmd-read` 放 shim 进 `D:\2Study\nodejs\`），**先别信 `~/node_modules` 那一份**——它解析出来会读到没有 SKILL.md 的包。
3. **`dist/client.js` 现在只由 tsdown 产出。** 实读 `packages/plugin-chef/tsconfig.json`（`outDir: ./dist`、`include: ["src"]`）确认：单独跑 `tsc -b`／`npm run build:host` 会用裸 ESM **覆写** `dist/client.js`，`test/client-bundle-48.test.mjs` 的 3 例立刻转红，若该产物已被 profile 加载则整条客户端脚本死（#150 事故复现路径）。改完 `src/client.ts` 一律 `npm run build:client` 或整条 `npm run build`。
4. **当前装机形态是「手工 Junction ＋ pnpm 部分接管」的混合态**：`.dsh-module-fallback` 那条的目标已被 `dsh plugin install` 改指过一次，profile `.bin` 也没有 `chef-cmd-read`（pnpm 没为手工接的技能建 shim）。**票 11 若不需要新装依赖，建议不要为了「刷新」再跑 `dsh plugin install`**——它会重写链接方向，把报告辛苦记录的方向再次改掉，也可能动 `.bin`。
5. **回滚卡若要用，先补第 4 行**：`cmd /c rmdir "C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\dsh-chef"`。其余 5 行我逐条核过路径与语义，成立。
6. **`check-boundaries.mjs` 的 `SKILLS_BASE_FROZEN` 现在是 3 元素、在 line 41**（`skill-schedule` 已被 #199 移出）。别照报告里的「line 37 / 4 元素」去改——#208 该图「把 `skill-chef` 移出名单」仍是票 6 的事，本票确实没动。
7. **仓库 `pnpm-lock.yaml` 有他人未提交改动 ＋ 本票的 tsdown 块，`snapshot:check` 在工作树里必然红。** 复算 sha 只看 `ilife-skills/package.json` ＋ `combos.yaml` ＋ `present.ts` 三源（`tooling/write-snapshot.mjs:18`）；HEAD 三源重算 = `932e7b250d278d50` = 快照文件现值，工作树 = `ef9b16473d03cf19` = 门报的「实际」。**别为了让这个门绿去跑 `pnpm snapshot`**——那会把他人改动的结果写进快照。
8. **可信度加分项**：报告引的宿主出处全部可核（`dsh-skill/lib/index.js:147 registerProvider(create)`、`:452 validateCandidate`、`:259` 同名校验、line 23 `BUNDLED_SKILL_RANK = 600`、line 101 `already registered` 文案）。票 11 照这套姿势继续引出处，是可以信任的。

---

### 审查边界与不做的事（如实）

- 未跑 `dsh plugin install/remove`、未改 `~/.dsh/profiles/web/**`、未动任何 Junction、未启停 DSH、未碰 43120。
- 未执行 `chef-cmd-read`（会建库）；未真跑 `npx tsc -b`（会写 dist），改跑 `--noEmit`。
- 未跑仓级 `pnpm test`（会改写别的技能 SKILL.md）。
- `gh` 只用读操作（`gh api … --jq`）；`git` 只用 `status`／`diff`／`show`，未 `add`／`commit`／`checkout`／`stash`。
- 实验件在 `.scratch/chef-help/t10-review-A/`（`count-modules.mjs`／`find-esm.mjs`／`diff-issue57.mjs`／`issue57-live-utf8.md`）。
- 「无法判定」项已逐条标出，未用推断冒充实测。
