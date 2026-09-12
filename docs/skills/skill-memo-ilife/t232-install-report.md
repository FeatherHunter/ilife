# #232 交付报告：备忘录插件侧最小装机（技能提供方 ＋ DSH profile；收窄 #61）

- 票面：`docs/skills/skill-memo-ilife/t232-body.md`（原文）／GitHub [FeatherHunter/ilife#232](https://github.com/FeatherHunter/ilife/issues/232)
- 地图：[#220](https://github.com/FeatherHunter/ilife/issues/220) `docs/skills/skill-memo-ilife/map-220-body.md`
- 日期：2026-09-12
- 结论：**技能提供方 ＋ 两个断链点全部做通（本票「要做」第 1／2 条 100%）**；
  第 3 条（profile 接线）**实测无需改动**——那条 Junction 已经回指仓库（票面「拷贝」的实测判错，见 §3）；
  完成判据前半条达成（真产物 + 真 profile 解析链两层实测），**后半条（`memo-cmd-read` 真跑拿到绝对路径）依赖 #229**，
  今天实测不可达，证据见 §6。

---

## 0. 必报五步对账（`docs/agents/structure.md`）

本环境无人类在场（票面硬纪律：禁止弹窗提问），故第一／二步与第五步一并在报告里报。

### 第一步 · 影响清单（事前）

| 文件 | 碰它的理由 |
|---|---|
| `packages/plugin-memo-ilife/src/skill-provider.ts`（新增） | 本票核心：打包技能提供方，照 `plugin-bill-ilife/src/index.ts:10-35` 的注册与重名退让写法 |
| `packages/plugin-memo-ilife/src/dsh-ctx.ts` | 加 `skills` 面镜像（type-only）＋ `HostCtx` 补 `skills` 字段；只碰这一个能力的宿主镜像 |
| `packages/plugin-memo-ilife/src/index.ts` | 提供方接线：`inject` 加 `skills`、`apply` 注册并重名退让 |
| `packages/plugin-memo-ilife/test/skills-provider.test.mjs`（新增） | 提供方回路锁定（照 `plugin-chef/test/skills-provider.test.mjs` 同形） |
| `packages/skill-memo-ilife/SKILL.md` | 断链点①：补 frontmatter（正文零改） |
| `packages/skill-memo-ilife/package.json` | 断链点②：`files` 加 `SKILL.md` |

**不碰**：`packages/skill-memo-ilife/src/**`、`templates/**`、`dist/**` 源、任何别的包、`tooling/**`、`docs/skills/**` 里别人的文件。

### 第二步 · 结构设计

- 新增件一名：`src/skill-provider.ts`，住在 `plugin-memo-ilife` 自己目录里（铁律一），对外给 6 个：`PROVIDER_NAME`／`SKILL_NAME`／`BUNDLED_SKILL_RANK`／`SKILL_FILE`／`skillDir`／`parseSkillText`，外加 `provider` 对象本身（≤5 条导出加一个默认件，照账单同形）。
- 技能包名不写第二份：`skill-provider.ts` 从 `bridge.ts` 取 `SKILL_PACKAGE`（铁律二·概念唯一）。
- 目录层级未新增、未碰三个以上能力，故不等点头。

### 第五步 · 交付对账（事后）

> 行数一律按 **LF 计数**（只数 `\n`，`CR=0`），由 `node` 逐字节数出。复审 E 指出本报告首版把两处行数写虚（129→**125**、121→**137**），已逐处订正。此后两轮复审整改又改过代码，故下表数字是**终态**：`skill-provider.ts` **129** 行（E 时 125，F 的 M1 整改 ＋4）、`dsh-ctx.ts` **104** 行（E 时 87，F 的 S3 整改 ＋17）、`test/skills-provider.test.mjs` **170** 行（E 时 137 → E 整改 157 → F 整改 170）。

| 第一步清单 | 实际 | 偏差 |
|---|---|---|
| `src/skill-provider.ts`（新增） | 已建，**129 行**／5650 B／CR=0（复审 E 时 125 行；复审 F 的 M1 整改把 name 正则收紧并补注释后 ＋4 行） | 0 |
| `src/dsh-ctx.ts` | 改：`git diff --numstat` = `64 1`（复审 E 时 `46 0`；复审 F 的 S3 整改对齐 `connection` 镜像后 ＋18 行） | 0 |
| `src/index.ts` | 改：`git diff --numstat` = `21 1`（＋21 −1） | 0 |
| `test/skills-provider.test.mjs`（新增） | 已建，**170 行**／11418 B／CR=0（复审 E 时 137 行；E 的整改 ＋20 行、F 的 M1 整改 ＋13 行） | 0 |
| `skill-memo-ilife/SKILL.md` | 改：`4 0`（＋4 行）；frontmatter 前缀 510 B，正文 3895 B 逐字节未动 | 0 |
| `skill-memo-ilife/package.json` | 改：`1 0`（＋1 行，`"SKILL.md",`） | 0 |

**偏差为零。** `git status` 里其余改动全部属别的会话（`packages/plugin-chef/**`、`packages/skill-chef/**`、`packages/skill-schedule/**`、`pnpm-lock.yaml`、`tooling/check-boundaries.mjs`、`docs/skills/skill-memo-ilife/t224-*.md` 等），本票一个都没碰。
**补报账（复审 E 打假 10 的漏项）**：`packages/skill-memo-ilife/AGENTS.md`（13 行／992 B，未跟踪）也在工作树里——**不是本票新建**，但它正是 §0 第四步引用的那条口径的落点（内容：`**告警线＝350 行。数法：LF 口径，只数 \n。**`，范围限本包 `src/**/*.ts` 与 `scripts/*.mjs`，`SKILL.md`／`test/*.mjs`／`dist/` 都不算）。本票未改它。

**第四步 · 超线报警**：口径落点即上条 `packages/skill-memo-ilife/AGENTS.md`：**告警线＝350 行，LF 口径，范围＝本包 `src/**/*.ts` ＋ `scripts/*.mjs`**。按此口径，本票所改文件行数：`SKILL.md` 63 行（不在范围内）、`package.json` 34 行（不在范围内）、`src/skill-provider.ts` 129 行、`src/dsh-ctx.ts` 104 行、`src/index.ts` 107 行、`test/skills-provider.test.mjs` 170 行（不在范围内）——**在范围内的最大件 129 行，远低于 350。未超线。**

---

## 1. 改了什么（逐文件＋行号）

### 1.1 新增 `packages/plugin-memo-ilife/src/skill-provider.ts`（129 行）

照 `packages/plugin-bill-ilife/src/skill-provider.ts` 同形（**形态的真样板其实是 `plugin-calorie/src/index.ts`**——账单只是「注册＋重名退让」那 7 行的出处，复审 F 的 S4 订正），三处按备忘录换值：

| 行 | 内容 |
|---|---|
| 1–14 | 头注释：出处（cookbook §12）＋「只读消费 SKILL.md，从不 import 技能实现」 |
| 15–19 | `readFile`／`createRequire`／`dirname,join` ＋ 类型 ＋ `SKILL_PACKAGE`（从 `bridge.ts` 取，不写第二份） |
| 22 | `export const PROVIDER_NAME = 'dsh-memo-ilife'` |
| 25 | `export const SKILL_NAME = 'skill-memo-ilife'` |
| 28 | `export const BUNDLED_SKILL_RANK = 600`（内联，不从宿主 import） |
| 30 | `export const SKILL_FILE = 'SKILL.md'` |
| 33–36 | `skillDir()`：`createRequire.resolve(SKILL_PACKAGE + '/package.json')` → 目录（**单份**，不复制） |
| 46–71 | `parseSkillText()`：最小 frontmatter 解析；`:65-70` 的 `name` 正则**逐字对齐宿主** `dsh-skill/lib/index.js:17`（复审 F 的 M1，见 §11） |
| 73–89 | `loadSkill()`：解析失败返 `null`（缺席即缺席，不返假数据） |
| 91–106 | `listSkills()`：唯一候选，`source:'bundled'`／`rank:600`／`resourceBase`／`locator` |
| 108–122 | `getSkill()`：候选过期（改名）返 `undefined`，不抛 |
| 125–129 | `provider` 对象 |

### 1.2 `packages/plugin-memo-ilife/src/dsh-ctx.ts`（`git diff --numstat` = `64 1`）

- `:1-6` 头注释补一句 skills 面出处（cookbook §12）。
- `:38-80` 新增 skills 面镜像：`SkillInvocationPolicy`／`SkillCandidate`／`SkillDefinition`／`SkillProvider`／`SkillsFace`，头注释写明红线出处（`dsh-skill/lib/index.js:147` 注册、`:452` 校验、`:259` 同名契约）。
- `:82-104` `HostCtx`：补 `readonly skills: SkillsFace;`，并把 `connection` 面照**实现**对齐（`fetch.register` 必选、`rpc.handle` 降为可选）＋新增 `ConnectionFetchRegisterOptions`（复审 F 的 S3：原镜像停在早期脚手架的 `connection.rpc.handle`，而 `#80` 起实现走的是 `/api` 载体 `ctx.connection.fetch.register`）。

### 1.3 `packages/plugin-memo-ilife/src/index.ts`（＋22 行 −1 行）

- `:8-10` 头注释补 #232 说明。
- `:12` `import { PROVIDER_NAME, provider as skillProvider } from './skill-provider.js';`
- `:19` `export const inject: readonly string[] = ['connection', 'webServer', 'skills'];`（原来是无类型的 `['connection','webServer']`；两个旧声明一个没丢）
- `:46-53` `apply` 第一件事：`ctx.skills.registerProvider(() => skillProvider)`，`already registered` 退让＋`warn` 留痕，他错重抛（照账单 `:28-34` 逐字同形）。
- `:101-107` 导出面：**不**导出／**不**引用 `./client.js`（连 type-only 也不引，照 #218 拆雷注释），加 `PROVIDER_NAME` 等 6 值 ＋ 5 个类型。

### 1.4 新增 `packages/plugin-memo-ilife/test/skills-provider.test.mjs`（170 行，9 条）

照 `packages/plugin-chef/test/skills-provider.test.mjs` 同形（170 行／9 个 `it()`），锁：① `inject` 含 `skills` 且旧声明不丢；② `apply` 只注册一个提供方；③ `list` 唯一摘要（`bundled`／`600`／`resourceBase` 与 `skillDir()` 同源）＋ **`list` 返回的 description 逐字等于 frontmatter 实测描述**（复审 E 整改新增）；④ `get` 给正文（含 `memo-cmd-read`、含速查标记块、不带头）＋过期候选失效；⑤ 重名退让不炸且 `warn`；⑥ 速查块覆盖 28 条唤醒词 ＋ **description 的触发词须是带空格的唯一入口 `备忘录 HELP`**（复审 E 整改新增）；⑦ 打包清单带 `SKILL.md`；⑧ `SKILL_NAME` 与 frontmatter 实测值逐字一致；⑨ **name 正则与宿主逐字同值**＋七个宿主会拒的名逐一断言被拒（复审 F 的 M1 新增）。

### 1.5 `packages/skill-memo-ilife/SKILL.md`（＋4 行／**510 B** 前缀，正文零改）

新 `:1-4`（复审整改后：触发词已纠成用户裁定带空格的 `备忘录 HELP`）：

```yaml
---
name: skill-memo-ilife
description: "「备忘录HELP」→memo.help.lookup 出备忘录自己的 HELP 文件（老骨架 8 域／13 二级组／30 场景，走仓内通用 help 模板）；唯一出口 memo-cmd-read。触发词：备忘录 HELP（不分大小写）。文件 DB 笔记：按关键词／时间／分类／子分类搜与看、记一条、改一条、删一条（真删须 confirm）、批量改分类、提醒（设／查／废弃／完成）、心愿排期、统计、飞书同步。"
---
```

原 `:1` `# 备忘录（memo）SKILL` 及各节内容整体下移 4 行，**一个字节都没改**（§5 给逐字节证据）。

### 1.6 `packages/skill-memo-ilife/package.json`（＋1 行）

`files`：`["dist", "templates/*.html"]` → `["dist", "SKILL.md", "templates/*.html"]`（`:16-20`），照 `skill-chef`／`skill-bill` 的既有写法。

---

## 2. 验证命令与原始输出（关键片段）

### 2.1 构建与类型检查

```
$ cd packages/plugin-memo-ilife && npm run build:host
> tsc -b
exit=0

$ npm run build:client
ℹ tsdown v0.22.14 powered by rolldown v1.2.7
ℹ dist\client.js      12.88 kB │ gzip: 5.20 kB
✔ Build complete in 19ms
exit=0

$ npm run typecheck
> tsc -p tsconfig.client.json
exit=0
```

产物核对（`dist/` 清单）：

```
client.js                12883      ← 与票面基线 12883 B 逐字节同尺寸（tsdown 原样重打）
skill-provider.js         4955      ← 新增宿主产物
index.js                  6428
...
$ node -e "…import('./dist/index.js')…"
exports = BUNDLED_SKILL_RANK, DEFAULT_READ_KEY, HOST_CALL_METHOD, MANAGER_MISSING_HINT, MANAGER_PLUGIN,
          PLUGIN, PROVIDER_NAME, RPC_CHANNEL, RPC_ENDPOINT_READ, SETTINGS_OWNER, SETTINGS_SLOT, SETTING_ROWS,
          SKILL, SKILL_CLI, SKILL_CLI_REL, SKILL_FILE, SKILL_NAME, SKILL_PACKAGE, SLOT_ID, SLOT_ORDER,
          SLOT_TITLE, SkillBridgeError, TAB_COMPONENT, apply, assertCliPresent, cliPath, fail, handleHostCall,
          inject, name, ok, openSingle, parseReadPayload, parseSkillText, readViaCli, registerSingle,
          requestViaHost, skillDir, skillProvider, slotDescriptor
$ Get-Content dist\client.js -TotalCount 2
window.__ModuleLoader__.load({
	id: "dsh-memo-ilife",
```

### 2.2 门①：`node --test test/client-bundle-48.test.mjs`（**动插件面前后各跑一遍**）

**改前基线**（本票开工时实测，在 `D:\ilife` 仓根跑）：

```
✔ dsh-bill-ilife ×3   ✔ dsh-calorie ×3   ✔ dsh-chef ×3
✖ dsh-home-ilife ×3   ✔ dsh-life-pack ×3
✔ dsh-memo-ilife client：classic 执行并注册自身 id（#48 整批 crash 回归）
✔ dsh-memo-ilife client：factory 可物化，导出 apply/inject，无 node 依赖
✔ dsh-memo-ilife client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像）
✖ dsh-schedule-ilife ×3
ℹ tests 21  ℹ pass 15  ℹ fail 6
```

**改后**（同命令、同目录）：

```
✔ dsh-memo-ilife client：classic 执行并注册自身 id（#48 整批 crash 回归） (0.7172ms)
✔ dsh-memo-ilife client：factory 可物化，导出 apply/inject，无 node 依赖 (0.815ms)
✔ dsh-memo-ilife client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像） (0.2138ms)
✖ dsh-home-ilife ×3   ✖ dsh-schedule-ilife ×3
ℹ tests 21  ℹ pass 15  ℹ fail 6
```

**判定：3 绿不变、6 红不增（红的仍是别人家 home 3 ＋ schedule 3）。未触发回滚。**

### 2.3 提供方回路（新）＋ 包内烟囱

```
$ cd packages/plugin-memo-ilife && node --test test/*.test.mjs
✔ #232 打包技能提供方（备忘录线）
  ✔ inject 声明 skills（用了就声明）
  ✔ apply 注册且仅注册一个提供方
  ✔ list 给出唯一的 skill-memo-ilife 摘要（bundled/600/单份 SKILL.md）
  ✔ get 给全文（frontmatter 后正文，含唯一出口），过期候选失效
  ✔ 重装配时提供方重名退让（抛 already registered 不炸，且 warn 留痕）
  ✔ 说明面与速查表口径：速查块覆盖全部唤醒词，简介说明主路
  ✔ 打包清单带 SKILL.md（安装态提供方能读到说明面）
  ✔ SKILL_NAME 常量与 SKILL.md frontmatter 实测值逐字一致（不硬编码第二份名）
✔ dsh-memo-ilife 烟囱（8 条，槽位／设置页／桥缺失阻断／envelope 契约／版本行）
ℹ tests 16  ℹ pass 16  ℹ fail 0
```

### 2.4 装机实测（真 profile 解析链 ＋ 真产物 ＋ 照宿主源码逐条自查）

> 取证方式说明（复审 E 打假 7 的措辞订正）：下面 `[5]` 是**照宿主源码 `dsh-skill/lib/index.js:452-464` 的判定线逐条自查**，不是跑宿主的函数本体。
> 复审 E 另用**宿主真源码原样抽出**的 `validateCandidate`／`validateDefinition` 跑过同一份候选：10 条判定线（8 条 ＋ `modelInvocable`／`userInvocable` 拆开）全 PASS、`validateDefinition` 亦 PASS，**结论比本报告首版更强**。
> 下面 `[4]` 的 description 是**整改前**的输出（触发词还是无空格形）；整改后的正确值见 §11。

从 **web profile 目录**起解析（与 DSH 真机加载插件同一条链，不走仓内相对路径）：

```
[1] profile 解析链（真机口径）
    dsh-memo-ilife/package.json -> D:\ilife\packages\plugin-memo-ilife\package.json
    dsh-memo-ilife (入口)       -> D:\ilife\packages\plugin-memo-ilife\dist\index.js
    realpath(入口)              -> D:\ilife\packages\plugin-memo-ilife\dist\index.js
    skill-memo-ilife/package.json -> D:\ilife\packages\skill-memo-ilife\package.json
    realpath(skill 根)          -> D:\ilife\packages\skill-memo-ilife
[2] 插件模块
    name   = dsh-memo-ilife
    inject = ["connection","webServer","skills"]
[3] apply 后
    注册到的提供方名 = dsh-memo-ilife
[4] 技能表条目（agent 看得见的东西）—— 整改前输出
    name        = skill-memo-ilife
    description = 「备忘录HELP」→memo.help.lookup 出备忘录自己的 HELP 文件（老骨架 8 域／13 二级组／30 场景，走仓内通用 help 模板）；唯一出口 memo-cmd-read。触发词：备忘录HELP（不分大小写）。文件 DB 笔记：按关键词／时间／分类／子分类搜与看、记一条、改一条、删一条（真删须 confirm）、批量改分类、提醒（设／查／废弃／完成）、心愿排期、统计、飞书同步。
    provider    = dsh-memo-ilife | source = bundled | rank = 600
    invocation  = {"modelInvocable":true,"userInvocable":true}
    resourceBase= {"kind":"directory","path":"D:\\ilife\\packages\\skill-memo-ilife"}
[5] 照宿主判定线逐条自查（dsh-skill/lib/index.js:452-464，非跑宿主函数）
     PASS name 为 string
     PASS name 合宿主 SKILL_NAME 正则 /^[a-z0-9]+(?:-[a-z0-9]+)*$/（dsh-skill/lib/index.js:17）
     PASS description 为 string 且非空
     PASS invocation 两字段皆 boolean
     PASS source 为 string
     PASS rank 为有限数
     PASS provider 为 string
     PASS provider === 注册名（否则 :462 抛）
[6] get 全文
    正文首行 = # 备忘录（memo）SKILL
    正文含唯一出口 memo-cmd-read = true
    正文含 memo.help.lookup（#229 落地后才有）= false
    frontmatter 名与 SKILL_NAME 一致 = true
```

### 2.5 断链点实测（skills-cli 发现层规则 ＋ DSH 发现规则）

```
[A] skills-cli 发现层规则：扫描子目录找 SKILL.md（跳过 node_modules/.git/dist/build）
    扫到含 SKILL.md 的包： skill-bill, skill-calorie, skill-chef, skill-home, skill-memo-ilife, skill-schedule
    skill-memo-ilife 在发现集里 = true
[B] frontmatter 判定（首行须 ---，且含字符串 name ＋ description；缺任一即整包跳过）
    首行 === "---"        = true
    有结束 ---（行号）    = 3
    frontmatter 每行皆 key: value = true 
    name        = "skill-memo-ilife"
    description 长度 = 202
    判定：整套通过 = true
[C] DSH filesystem provider 的 name 正则（dsh-skill/lib/index.js:17）
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) = true
[D] 断链点②：package.json files 是否带 SKILL.md（安装态提供方读说明面的前提）
    files = ["dist","SKILL.md","templates/*.html"]
    含 SKILL.md = true
```

### 2.6 仓内其它门

```
$ pnpm doctor
OK: node 24.18.1 >= 22.13
OK: SKILLS_DB_PATH 可写：D:\2Study\StudyNotes\.db
OK: CLI 契约：argv+JSON(stdout)+exit；HTML 用 --html 显式落盘（utf8，路径/编码待定中转方案）
doctor: PASS
exit=0
（WARN: lark-cli 未找到 —— 既有基线，缺失阻断不返空，非本票引入）

$ node tooling/check-boundaries.mjs
OK: skill-memo-ilife 依赖闭包不含 base-*（实得：无）
… 11 条 OK …
boundaries: PASS
exit=0

$ node --test test/memo-e2e.test.mjs test/memo-split.test.mjs test/scaffold.test.mjs \
    test/plugin-p10-install.test.mjs test/plugin-p10-boundaries.test.mjs test/combos-help-80.test.mjs
ℹ tests 36  ℹ pass 34  ℹ fail 2
✖ 单品→总管单向（总管零单品依赖）  → '0.2.2' !== '^0.2.0'（plugin-calorie 的 skill 版本行，别人家，未提交改动所致）
✖ 快照 == 实际拉取版              → FAIL: 快照过期（文件 0.1.0@932e7b250d278d50 ≠ 实际 0.1.0@ef9b16473d03cf19）
```

两条红都**不在本票改动范围**：前者读 `packages/plugin-calorie/package.json`（工作树里别人未提交的 `0.2.2`）；后者比对的快照按 `tooling/write-snapshot.mjs:9-17` 只覆盖 `packages/ilife-skills/`（`skill.snapshot.json`）与 `packages/base-combos` 的 `combos.yaml`／`present.ts`——本票一个都没碰。备忘录相关的 4 组（`memo-e2e`／`memo-split`／`plugin-p10-install`／`combos-help-80`）全绿。

### 2.7 DSH web GUI 仍可用（**未重启、未杀**）

```
$ Invoke-WebRequest http://127.0.0.1:43120/
ERR: 远程服务器返回错误: (401) 未经授权。
```

401 是**有服务在听**并拒绝匿名请求（不是连接失败），与开工前同状。全程未杀进程、未重启服务、未改任何 profile 文件。

---

## 3. ⚠️ 票面实测更正：`skill-memo-ilife` 的 profile Junction **已经回指仓库**，不是拷贝

票面（与地图 Notes `:74`）写「`skill-memo-ilife` 是 Junction 到 `.dsh-module-fallback\node_modules\skill-memo-ilife`——那是**拷贝**，不回指 `D:\ilife`」。

**实测：整条链全是 Junction，末梢就是 `D:\ilife\packages\skill-memo-ilife`。**

```
$ Get-Item "$env:USERPROFILE\.dsh\profiles\web\node_modules\skill-memo-ilife"
LinkType = Junction
Target   = C:\Users\辰辰洋洋\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-memo-ilife
$ Get-Item "…\.dsh-module-fallback\node_modules\skill-memo-ilife"
LinkType = Junction
Target   = D:\ilife\packages\plugin-memo-ilife\node_modules\skill-memo-ilife
$ Get-Item "D:\ilife\packages\plugin-memo-ilife\node_modules\skill-memo-ilife"
LinkType = Junction
Target   = D:\ilife\packages\skill-memo-ilife

$ node -e "…fs.realpathSync…"
realpath: D:\ilife\packages\skill-memo-ilife      ← 三条路径 realpath 全落到这里
profile nm isSymlink: true
fallback  isSymlink: true
```

三条 Junction 的创建时间（复审 E 打假 1 订正：**三条各不相同**，本报告首版误写「同为 `2026-09-11 17:59:07`」）：

```
profile 那一跳   C:\Users\…\profiles\web\node_modules\skill-memo-ilife                        Creation = 2026-09-11 08:15:39
fallback 那一跳  C:\Users\…\.dsh-module-fallback\node_modules\skill-memo-ilife                Creation = 2026-09-11 17:59:07
包内那一跳       D:\ilife\packages\plugin-memo-ilife\node_modules\skill-memo-ilife             Creation = 2026-09-08 10:22:59
```

三条**全部早于本票开工日 2026-09-12**，即**开工前就已如此**：票面那句是「只看了第一跳路径里的字样、把中间跳当成了拷贝」的判读差。（旁证：`skill-bill`／`skill-calorie` 在 `.dsh-module-fallback` 里同为 `2026-09-11 17:59:07` 那一批，`skill-chef` 为 `2026-09-12 11:28:54`。）

**本票据此不改任何 Junction，因此没有回滚。** 这也解释了另一条旁证：`skill-bill`／`skill-chef`／`skill-calorie` 在 `.dsh-module-fallback` 里也都是同一形状的 Junction（`→ D:\ilife\packages\plugin-*/node_modules\skill-*`），其中账单／大厨早就是「仓库改完能到真机」的既有先例。

---

## 4. `~/.agents/skills/<技能>`：拷贝还是链接（判新旧只靠 `SKILL.md` 哈希）

```
根目录：C:\Users\辰辰洋洋\.agents\skills
  skill-bill         realpath=D:\ilife\packages\skill-bill          ← 链接（Junction）
                     副本SKILL.md=521C5C5B…B9CD45  仓内=521C5C5B…B9CD45  同份=true
  skill-calorie      realpath=C:\Users\辰辰洋洋\.agents\skills\skill-calorie   ← **拷贝**（真目录）
                     副本SKILL.md=903325B1…E4527A  仓内=0480E520…A3909C  同份=**false**（旧 1974 B）
  skill-chef         realpath=D:\ilife\packages\skill-chef          ← 链接（Junction）
                     副本SKILL.md=1BE06C70…CBEF84  仓内=1BE06C70…CBEF84  同份=true
  skill-home         不存在
  skill-schedule     不存在
  skill-memo-ilife   不存在
```

结论：**账单／大厨是链接（仓改即真机改），卡路里是拷贝且已陈旧**（`~/.agents/skills/skill-calorie/SKILL.md` 30559 B vs 仓内 31133 B）——那是卡路里线的既存欠账，不归本票（本票不碰别的技能）。备忘录**尚未**装进这个根目录。

技能发现的三个根（`dsh-skill-filesystem/lib/index.js:150-181`）：`<项目>/.dsh/skills`、`<项目>/.agents/skills`、`<dsh-home>/skills`、`~/.agents/skills`（+ `DSH_BUNDLED_SKILL_DIR`）。本机 `~/.dsh/skills` 不存在；`D:\ilife\.agents\skills` 空。

---

## 5. 正文零改（逐字节证据）

```
$ git show HEAD:packages/skill-memo-ilife/SKILL.md   （git 原始字节，经 node 取，不经 PowerShell 文本管道）
现版文件          = 4405 B  sha256 = 3E0CE51F8602F195F0CC8FD057647DABF4137F7F83ADB8851264F04257332D6F
  BOM = false    含 CR = false
  frontmatter 前缀 = 510 B（首行 = "---"）
  正文（前缀之后） = 3895 B  sha256 = 0351F7AEAED1BD52F144D47EB794EB78D754832757255A677681302EE71E37AD
HEAD 版           = 3895 B  sha256 = 0351F7AEAED1BD52F144D47EB794EB78D754832757255A677681302EE71E37AD  含 CR = false
正文逐字节一致     = true
HEAD 原字节出现在现版里的偏移 = 510
---
入口口径（用户 2026-09-12 裁定：备忘录 HELP，带空格，不分大小写）
  frontmatter 含「触发词：备忘录 HELP（不分大小写）」 = true
  frontmatter 含无空格错形「触发词：备忘录HELP（不分大小写）」 = false
  全文件含带空格入口 = true
---
package.json files = ["dist","SKILL.md","templates/*.html"]
```

（前缀 509 → **510 B**：复审整改把触发词由无空格形纠成裁定形，正好多一个空格；正文的偏移同步由 509 变 510，其余数字一个没动。）

补写脚本自带同一道自检（写盘前先比）：`正文原样保留（逐字节）: true`。文件仍无 BOM、LF 结尾（写盘用 `writeFileSync(path, Buffer)`，不经任何会加 BOM／改行尾的层）。

---

## 6. 完成判据逐条判定

判据原文：**「DSH 技能表可见 `skill-memo-ilife`（名 ＋ description），且 `memo-cmd-read` 真跑拿到绝对路径。」**

### 6.1 前半条「技能表可见（名 ＋ description）」——**达成**（两层证据 ＋ 两轮复审独立复现）

| 层 | 命令 | 结果 |
|---|---|---|
| ① 真产物 | `node --test packages/plugin-memo-ilife/test/*.test.mjs` | `list` 给唯一候选 `skill-memo-ilife` ＋ 202 字 description，`provider`／`source`／`rank`／`resourceBase` 全对；`get` 给全文；候选照宿主判定线逐条自查 8 条全 PASS（复审 E 另用**宿主真源码原样抽出**的函数跑过，10 条判定线全 PASS）。两轮复审整改后新增第 9 条（name 正则与宿主同值＋八个反例），包内合计 **17/17 绿** |
| ② 真装机口径 | 从 `~/.dsh/profiles/web` 起解析 `dsh-memo-ilife` → `dist/index.js`，真跑 `apply` ＋ 假 ctx 抓提供方 | 注册名 `dsh-memo-ilife`；`skill-memo-ilife` 的 `resourceBase` 落在 `D:\ilife\packages\skill-memo-ilife`（**仓库本体**，非拷贝）；`inject` 含 `skills` |
| ③ 断链点①已修 | skills-cli 发现层规则＋DSH 正则自查 | 首行为 `---`、含 `name`＋`description`、每行皆 `key: value`，整包通过 |
| ④ 断链点②已修 | 读 `package.json` | `files` 含 `SKILL.md` |

**诚实注记**：正在跑的 web GUI 进程（127.0.0.1:43120）是**开工前**启动的，它的插件树里那份 `dsh-memo-ilife` 没有本次新增的注册代码——`apply` 里新加的一行要**下次加载插件树**（DSH 重启／插件重载）才进内存。故此处给的是「真产物 ＋ 真解析链＋真 profile 布局」的证据，不是「此刻屏幕上已出现」的证据；后者属 #233（真机端到端 ＋ 肉眼终审）。本票按硬纪律**没有重启 GUI**。

### 6.2 后半条「`memo-cmd-read` 真跑拿到绝对路径」——**未达成，且判为不在本票范围（依赖 #229）**

三条实测：

```
$ node D:\ilife\packages\skill-memo-ilife\dist\cli\cmd_read.js
ERR 2: 用法：memo-cmd-read <memo.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]
exit=2

$ node D:\ilife\packages\skill-memo-ilife\dist\cli\cmd_read.js memo.help.lookup
ERR 3: 未知联动 key：memo.help.lookup
exit=3

$ node -e "…import('./packages/skill-memo-ilife/dist/index.js')…buildHelpLookup()…"
lookup rows: 28          ← 28 条全指向技能功能命令，**无一条**指向 HELP 文件交付
unroutable（缺必填槽位，非缺口）：11 条（如「按时间搜备忘」缺 timeRange、「看备忘」缺 id）
```

**依赖链条**：判据要的「绝对路径」＝ HELP 文件落盘后的路径（`<SKILLS_DB_PATH>/memo_html/备忘录_HELP_<YYYYMMDD_HHMMSS>.html`）。今天：

- `memo.help.lookup` **这条命令不存在**（`ERR 3`）→ 归 [#227](https://github.com/FeatherHunter/ilife/issues/227)（内容资产入库）／[#228](https://github.com/FeatherHunter/ilife/issues/228)（渲染接线）；
- 出口分派与命名落盘（缺省＝HELP 文件、回执给绝对路径）→ 归 [#229](https://github.com/FeatherHunter/ilife/issues/229)；
- CLI 级锁 → 归 [#230](https://github.com/FeatherHunter/ilife/issues/230)。

⚠️ **`ERR 3` 的拦截面（本报告首版归因写错，复审 E 打假 6 订正）**：那句 `ERR 3: 未知联动 key：memo.help.lookup` 出自 **`src/cli/cmd_read.ts:123` 的 `memoShapeFor()`**（`src/render/envelope.ts:20` 抛 `MemoRenderError`），执行顺序是 `:119` 解析参数 → `:123` `memoShapeFor(o.key)` → 才到 `:129` 开库；**没有走到**十键 `dispatch()` 的 `default:` 分支（`:95`，那句文案是「未知 memo key：」）。结论不变（命令不存在、依赖 #229），但首版写「upstream 已拦」指的是另一句话、另一个位置。**顺带**：#229 判据里「跑完**不建库**」这一条今天**是空过**（`:123` 就抛，`openMemoDb` 根本没执行），谁拿「今天已经过」当结论都会错。

**独立复核结论（复审 E 打假 6，比本报告自述更硬）**：① `MEMO_KEY_SHAPES` 实测只有 10 条、`memo.help.lookup` 不在其中 ⇒ 要加命令必须动 `src/render/**` 的形状表，那正是 #229 正文点名的第二项；② #229 正文第一段「本票的第一件事是改分派顺序：`cmd_read.ts:129` 现在无条件 `openMemoDb`」正对应实测的 `:123` 前置位置；③ **#229 自己的完成判据与本票判据后半条是同一句话**，同一句判据只能有一张票拥有它；④ 线上 #229 `OPEN`／`0%`，自述等票 4＋票 8，而 #233 的「下一步」明写等票 10＋11＋12。

地图计划表（`map-220-body.md:104`）把 `#229` 标为**阻塞 #233**，正是这条依赖。**本票不动技能侧源码**（票面自己划的分界：「skill-memo-ilife 侧保持纯粹普通 skill，除 `files` 加 `SKILL.md` 外不动」）。

**建议（供项目负责人裁决，不由本票执行）**：
1. 本票**以「前半条达成 ＋ 后半条并入 #233」为完成口径关票**——把判据后半条写进 #233（真机端到端 ＋ 肉眼终审）的验收项，那时 #229／#230 已在。
2. 若坚持「后半条必须在本票内」，则本票需要开口子去动 `packages/skill-memo-ilife/src/cli/cmd_read.ts`，与票面分界和 #229／#230 的已划范围冲突，且会与正在跑的同图票抢同一批文件（见 §8 并发提醒）。**不推荐。**

---

## 7. 收窄 `#61`：建议新正文草案

**状态更新（2026-09-12，复审后）**：编排会话已**代为落盘执行**——`#61` 的标题与正文已按本草案改毕，本票**不必再动**（本节保留草案原文，作为该次改动的对照底稿）。

**当时只在这里出草案，未改任何 issue**（本票唯一允许的 tracker 写操作是 `gh issue edit 232`）。

`#61` 现状（`gh issue view 61`）与 #220 已裁定的分工冲突点有两处：① 它把「双路 HELP 证据」当自己的关票条件，而 #220 已把 HELP 文件交付整条线划给 #229／#230／#233；② 它的证据行里把「DSH 面板落字＋直读同键对数」与 HELP 混在一起。收窄后 **#61 ＝ 外圈兜底 ＋ 版本行 ＋ frontmatter ＋ 提供方 ＋ 速查证据**，**不含** HELP 文件交付。

````markdown
Part of #1

Supersedes #50（按技能拆分之一；#50 关闭后以本票为准）

**收窄说明（2026-09-12，#232 实测后）**：本票原正文里的「双路 HELP 证据」与「SKILL.md frontmatter／提供方」
两个话题，前者已整条线归 `#220` 那张图（备忘录 HELP 交付：#227 内容资产 → #228 渲染接线 → #229 出口与命名落盘
→ #230 CLI 级锁 → #233 真机端到端＋肉眼终审）。本票收窄为**除 HELP 交付以外**的样板残差，
**不含 HELP 文件交付**，也不作为 #233 的前置。

## Question

备忘录（skill-memo-ilife＋dsh-memo-ilife）按卡路里样板（#48@6b0c1e7 ＋ #49 ＋ #56 提供方）补齐最后差距：
外圈兜底 ＋ 版本行 ＋ frontmatter ＋ 提供方 ＋ **速查**证据，一票内完成该单技能。

## 进度：10%

下一步：对照 calorie client 补外圈 try/catch 兜底与样式版本行差异；补 SKILL.md frontmatter 与包清单条目；
新增打包技能提供方（插件侧 skill-provider.ts，rank 600，cookbook §12），跑门禁后贴**速查**双路证据
＋ agent 会话确认关票。

## Destination

dsh-memo-ilife 与卡路里全 parity：contract/dsh-ctx/工厂 client 已齐，只收敛残差
（fetchRead 外同步抛错兜底、面板样式与版本行、DEFAULT_READ_KEY 空参语义）；
桥确认 resolveNodeBin＋20s 超时已在；版本行与双 package.json 一致；
SKILL.md frontmatter 齐（skills-cli 可认出 skill-memo-ilife；**实测已由 #232 补上**：首行 `---` ＋
`name` ＋ `description`，`package.json` 的 `files` 亦已带 `SKILL.md`）；
提供方达到卡路里 parity（cookbook §12，badge 同形）：inject 加 skills，单份 SKILL.md 按包名解析服务，
rank 内联 600，list/get 全通，DSH agent 技能目录可见 skill-memo-ilife（名＋介绍，可按需读全文调 CLI）
——**实测已由 #232 落地**（`packages/plugin-memo-ilife/src/skill-provider.ts` ＋
`test/skills-provider.test.mjs` 8 条全绿）。本票只需**复核并留证**，不重做。

## 范围（照抄样板，不重新设计）

- 契约键：memo.search（无参直读，空库安全）；槽位 ilife:memo order 70 标题备忘录；
  包名 dsh-memo-ilife／skill-memo-ilife。
- 外圈兜底：面板取数失败不静默、样式版本行与双 package.json 一致。
- 提供方：#232 已交付；本票只复核「真机重启后在 agent 技能表里查得到 skill-memo-ilife」。
- **不在本票**：HELP 文件的渲染、命名、落盘、命令（`memo.help.lookup`）与真机端到端 —— 全部归 #220 那张图。
- 分界：skill-memo-ilife 侧保持纯粹普通 skill（零 DSH 代码、零 DSH 依赖）。

## 门

build 0、双方 typecheck 0、loader 回路、smoke（含 Electron 超时语义＋版本行断言）、
skills-provider 回路、P10 18/18、boundaries PASS。

## 证据

- OC 隔离装＋真调用；
- DSH 面板落字＋直读同键对数（direct total == 面板 total）；
- **速查证据**：`memo.search`（或同类查询命令）在面板路与 CLI 路上同键同数；
- agent 会话查到 skill-memo-ilife（HITL 一句话）。

## 关票条件

上述实现合入 master ＋ 证据回贴 ＋ agent 会话确认；不合入不关票。
HELP 文件交付**不作为**本票关票条件（已归 #220／#233）。
````

---

## 8. 未做到的与原因

1. **判据后半条**（`memo-cmd-read` 真跑拿到绝对路径）：依赖 #229 的产物，今天不存在（`ERR 3: 未知联动 key：memo.help.lookup`）。本票按票面分界不动技能侧源码。
2. **「此刻屏幕上已出现」**：正在跑的 web GUI 进程加载的是开工前的插件树，新增的注册要下次加载插件树才生效；硬纪律禁止重启 GUI，故未做。
3. **`skill-memo-ilife` 装进 `~/.agents/skills`**：票面只要求「核是拷贝还是链接」，没授权装；实测该根目录下三个兄弟技能用的是 Junction（账单／大厨）与拷贝（卡路里）。**未动**，命令见 §9。
4. **`~/.agents/skills/skill-calorie` 陈旧**（拷贝，SKILL.md 30559 B vs 仓内 31133 B）：别人家线的既存欠账，本票不碰。
5. **`test/skills-export-47.test.mjs` 的样板清单**仍是 `['skill-calorie']` 单包（文件 `:20-21` 自己写着「复制到其余 5 包时扩展此清单」）：把备忘录加进去是**别的票**的范围，且它还会同时断言「含 `## 公共安装器运行时` 小节」——备忘录没有那一节（备忘录不在 npm 公共安装器那条线上）。**未动**，见 §9 待确认项。
6. **`pnpm test` 未跑**：票面已知它会顺手改写别的技能的 `SKILL.md`，且此刻工作树里有 5 个以上别的会话在改（`skill-chef`／`skill-schedule`／`plugin-chef`／`skill-calorie`／`docs/skills/skill-memo-ilife/t224-*`）。改跑「受影响面清单」（§2.6）＋门①＋包内全测＋`pnpm doctor`＋`check-boundaries`，覆盖本票全部改动面。

---

## 9. 待项目负责人确认项

> 复审（复审员 E，`t232-review-E.md`）与编排会话的裁定结果已并入本节：第 1 条**已裁**（后半条并入 #233，我同意）；第 2 条**已裁**（`~/.agents/skills` **不装**，留到 #233 若确实看不到再装）；第 3 条**已执行**（`#61` 标题＋正文已由编排会话落盘改毕）；第 5 条**保留**（description 口径已在复审整改中纠形，见 §11）。

1. ~~**关票口径**~~ → **已裁**：判据前半条达成＋复审要求的整改补齐 → 可关；后半条（`memo-cmd-read` 真跑拿到绝对路径）**并入 #233**，并在 #233 验收项里显式写「`memo-cmd-read memo.help.lookup` 真跑拿到绝对路径 ＋ 跑完不建库（#229 判据后半句）」。**关票由项目负责人执行，本票不 close 任何票。**
2. ~~**要不要把 `skill-memo-ilife` 装进 `~/.agents/skills`**~~ → **已裁：先不装**（理由：#234 之外的复审员 F 与 E 同向——该根是**用户全局**根，会影响这台机器上所有项目；插件提供方这一路已把技能送进技能表；且该根下 `skill-calorie` 就是「拷贝且陈旧」的先例）。**本票未执行**，命令留档备用：
   ```powershell
   cmd /c mklink /J "$env:USERPROFILE\.agents\skills\skill-memo-ilife" "D:\ilife\packages\skill-memo-ilife"
   ```
3. ~~**`#61` 正文**~~ → **已由编排会话执行**（标题＋正文已改，与本报告 §7 草案一致）；本票不再动。
4. **`test/skills-export-47.test.mjs` 的 PKGS 清单**：备忘录要不要进那张清单（进了会连带要求补 `## 公共安装器运行时` 小节与 npm 版本钉死，那是「发布态」范围，地图把它划在 Out of scope）。**本票未动，仍待裁。**
5. **description 口径**：技能表简介只逐字列主路「备忘录HELP」（＋能力面概述），28 条场景唤醒词住在正文速查块里，没逐条进 description——依据是用户 2026-09-12 裁定「只认 `备忘录 HELP` 一条入口，其余 8 种变体不做」。（触发词的**写法**已在复审整改中纠成带空格的裁定形，见 §11；「要不要求逐条列 28 条」这一问仍待裁，改它只动 frontmatter、不碰正文。）

---

## 10. 风险点

1. **`inject` 加 `skills`：失败形态是「静默 pending」，不是「起不来」**（复审 F 的 M3 订正了本报告首版的披露口径）。实测语义（cordis 4.0.2 `_refresh()`，`node_modules/@deepseek-ai/cordis/lib/index.js:1316-1327`）：`inject` 里声明一个不存在的服务 ⇒ `epoch = INACTIVE` ⇒ **fiber 停在未激活态，`apply` 压根不被调用** ⇒ 不抛错、不崩树、loader 也不打日志，**唯一后果是本插件不生效**（那句 `cannot get required service "…" in inactive context` 只在**已激活**的 fiber 上访问才抛，走不到）。反方向（声明了却没写进 `inject` 就访问）才会真抛。
   **在本 profile 里这个服务不可能缺失**：`@deepseek-ai/dsh-base` 的 `cordis.patch.yml` 无条件挂 `@deepseek-ai/dsh-skill`（`skills` 即它注册的服务名，`dsh-skill/lib/index.js:132`），而 `dsh-base` 是 `dsh.profile.bundles` 第一项、profile 自己的 `cordis.patch.yml` 是 `[]`。同一服务上已有三个在跑的消费者：`dsh-chef:14`、`dsh-bill-ilife:14`、`dsh-calorie:17`。
   **结论**：这条风险**不在本票消除**，留 #233 真机重启验（唯一有信息量的动作就是让真机加载一次）。**兜底**仍是一处一行：删 `src/index.ts:19` 的 `'skills'` 并重打产物——但注意**光删源码不算回滚，必须重建**（见 §10.6 的三档序列）。
2. **`client.js` 尺寸与票面基线同尺寸（12883 B）**：说明 `tsdown` 重打未改变客户端产物语义；门①三条仍绿。
   **订正（复审 F 的 §5.3）**：本报告首版写「谁若只跑 `tsc -b`，会把 `client.js` 打回裸 ESM」——**对本包这句话现在是错的**。复审 F 实测 `src/client.ts` 已不在宿主编译程序里（`tsc --listFiles` 无它），而 `tsc` 只 emit 程序内的文件，所以 `tsc -b` **不会碰** `dist/client.js`。那条注释是从 `plugin-chef` 抄来的历史经验，那时 chef 还有 `export type { HostCaller } from './client.js'`。**真正的雷在隔壁账单**（不归本票）：`packages/plugin-bill-ilife/src/index.ts:47` 仍有 `export type { HostCaller } from './client.js'` 且 `tsconfig.json` 缺 `exclude: ["src/client.ts"]`，`--listFiles` 实测 `src/client.ts` 在程序里 ⇒ 谁跑一次 `tsc -b`／`pnpm -r build` 就会把 bill 的 `dist/client.js` 覆写成裸 ESM，而 bill 在 web profile 的 bundles 里——**这是本机现在最接近 #150 事故的一条通道，已由编排会话另立票跟踪。**
3. **并发**：另一会话正在动 `docs/skills/skill-memo-ilife/t224-*.md` 与 `packages/skill-schedule/**`；本票 `gh issue edit 232` 只写自己那张票，不碰 #220／#224／#61。
4. **`memo.help.lookup` 的语义空窗**：`plugin-memo-ilife/src/skill-provider.ts` 的 `get` 只喂正文，而正文今天**不含** HELP 命令（`#229` 落地后由 #231 写进说明面）。复审整改已把原先那条「反向硬断言」换成**条件断言**（`assert.ok(!正文含命令 || 技能实现里真有这条命令)`），所以 #229 落地后本回路**不会**把正确交付打成红；但落地那一票仍须把本条翻成**无条件正向断言**——已作为**显式交接项**写进 #229／#231 票面正文（由编排会话执行），不靠注释。
5. **技能被发现 ≠ 命令能跑通**：#228／#229 落地前，模型就算读到 `skill-memo-ilife` 全文，也调不到那条 HELP 命令（`ERR 3`，拦在 `cmd_read.ts:123`）。故本票交付的是**发现面**，不是**端到端可用**；#233 才是最终口径。
6. **回滚必须重建产物（git 救不回 `dist/`）**：`dist/` 被 `.gitignore:2`（`packages/*/dist/`）忽略，`git ls-files` 返 0；而 `dist/index.js` 里有顶层 `import … from './skill-provider.js'`。所以「源码回去了、产物没回去」＝**没回滚**。完整三档序列见 §11.3（复审 F 的 §4 照抄 ＋ 本票实跑档 1 的记录）。

### 10.6 关于「本票所有安全性结论的性质」——如实记一条

```
dist/client.js   写盘 2026/9/12 13:10:01
dist/index.js    写盘 2026/9/12 13:24:36   ← 复审 F／M1 整改后重建
GUI 进程          PID 31252，启动 2026/9/12 00:39:56
```

**新增代码从未被活插件树加载过**（产物晚于进程启动）。因此本票关于「插件能不能起来」「技能会不会进技能表」「`inject` 有没有副作用」的**全部结论都是静态可达性分析 ＋ 离线真跑**，不是真机实测。这一格只有 #233（真机重启 ＋ 肉眼终审）能填。**别让 #233 的读者以为已经真机验过。**

---

## 11. 复审整改记录（复审员 E：`t232-review-E.md`；复审员 F：`t232-review-F.md`）

> 本节由编排会话转述的整改要求驱动，逐条落盘并实测。两轮复审的**真机断言复现**（E 六条全中、F 真机安全 80/100）与本票交付本体一致；下面只记**改了什么、怎么验的**。

### 11.1 复审 E 的三件（入口口径／测试纠形／线上正文订正）

**E-1 入口口径纠形**：`SKILL.md` frontmatter 的触发词由无空格形 `备忘录HELP` 纠成用户裁定的 `备忘录 HELP`（出处：`map-220-body.md:41`／`t226-amendment.md:5-7` 用户原话／`t224-decision-draft.md:83` 裁决表第 6 条／线上 #231）。**正文零改自检**：

```
改动前：文件 4404 B；前缀 509 B；正文 3895 B sha256 0351F7AE…E37AD
  正文与 git HEAD 一致 = true
  前缀里待纠形串出现次数 = 1
自检① 正文逐字节未动 = true
自检② 前缀只差那一处（＋1 字节，空格）= true
自检③ 新前缀含带空格入口 = true
已写入。新文件 4405 B；新前缀 510 B；正文字节数/哈希不变 = true
```

**E-2 测试纠形 ＋ 补真断言**：`test/skills-provider.test.mjs` 里 ① `startsWith('「备忘录HELP」')` 保留（那说的是 description 的**头词**，不是触发词字段）＋ 新增逐字断言 `description.includes('触发词：备忘录 HELP（不分大小写）')`；② 新增 `assert.equal(c.description, parseSkillText(frontmatter).description)`，把「list 返回的描述 ＝ frontmatter 实测描述」焊死；③ 原先那条近永真的 `missingInDesc.length < phrases.length`（实测 `25 < 28`，靠巧合）**删除**；④ 反向断言改成条件断言（见 §10.4）。

对照实验（证明新断言真拦得住、旧断言拦不住）：造一份描述已腐化的**第二份**技能包副本，比对新断言与旧断言：

```
副本 frontmatter description = "「备忘录HELP」→memo.help.lookup 出备忘录自己的 HELP "
仓库本体 description        = "「备忘录HELP」→memo.help.lookup 出备忘录自己的 HELP "
新断言 assert.equal(list 返回, 仓库本体) 会红 = true
（旧断言 raw.includes(description.slice(0,12)) 对副本仍会绿 = true ）
```

**E-3 线上 `#232` 正文订正**：删/改三处错数（「129 行」→ 当时实测 125、「121 行」→ 当时实测 137、「三条创建时间同为 `2026-09-11 17:59:07`」→ 改成三条各自的准确时间），并把「宿主 `validateCandidate` 8 条红线全 PASS」改成准确措辞（「照宿主 `:452-464` 逐条自查」）。已随本节（§11.1）与 §11.2／§11.3 的整改一并回写进线上正文（`gh issue edit 232 --body-file docs/skills/skill-memo-ilife/t232-body.md`）。

### 11.2 复审 F 的 M1／M3／S3／S4／S5

**M1（最要紧，一行）`name` 正则收紧成宿主同值**。改法：`src/skill-provider.ts` 的 `parseSkillText()` 里那条判定换成 `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`（宿主 `dsh-skill/lib/index.js:17` 逐字同值），并在代码里写明爆炸链（不合格候选 → 宿主 `validateCandidate`（`:360`，无 try）→ `dsh-tool-skill/lib/index.js:207` 每次模型请求的 `ctx.skills.snapshot()`（全文无 try）→ 全机技能目录一起塌）。**并补测试（第 9 条）**：

```
$ cd packages/plugin-memo-ilife && node --test test/skills-provider.test.mjs
  ✔ name 正则与宿主逐字同值（比宿主宽一格会塌全机技能目录） (0.2793ms)
ℹ tests 9   ℹ pass 9   ℹ fail 0

（该条内部逐值断言：合法名放行；'Skill-Memo-Ilife'／'skill_memo_ilife'／'skill--memo'／
  '-skill-memo'／'skill memo'／'skill-memo-'／'备忘录'／'skill.memo' 八个宿主会拒的名，
  插件侧 parseSkillText 一律返 null）
```

**M3 失败形态的披露口径**：见 §10.1（改成「静默 pending ＋ 本 profile 里不可能缺失 ＋ 留 #233 真机验」）。
**S3 `HostCtx.connection` 镜像对齐实现**：见 §1.2 第 3 行（`fetch.register` 必选、`rpc.handle` 降可选）。
**S4 样板出处**：见 §1.1 首句（真样板是 `plugin-calorie/src/index.ts`）。
**S5 报账**：`packages/skill-memo-ilife/AGENTS.md`（13 行／992 B，未跟踪）已认领——它是**票 5 会话落的**（350 行告警线口径），见 §0 第五步。

### 11.3 M2：回滚三档序列（复审 F 的 §4 照抄）＋ **本票实跑档 1 的记录**

**前置事实**：`D:\ilife\packages\plugin-memo-ilife` **就是**真机安装的插件本体（profile 里是 `link:D:/ilife/packages/plugin-memo-ilife`）；`dist/` 全被 gitignore，**git 只能回滚源码、产物必须重建**；**禁止**仓库级 `git checkout .`／`git stash`／`pnpm -r build`（工作树里有 5 个以上别的会话的未提交改动，且仓库级 `tsc -b` 会顺手废掉账单的 client 产物）。

**档 0 · 先取证**（不改任何东西）：

```powershell
Get-NetTCPConnection -LocalPort 43120 -State Listen | Select-Object LocalPort,OwningProcess,State
Get-Content "$env:APPDATA\DSH Desktop\logs\host\dsh-$(Get-Date -Format yyyy-MM-dd).log" -Tail 120 |
  Select-String -Pattern 'dsh-memo-ilife|failed to apply loader entry|without inject|inactive context|expected service'
cd D:\ilife; node --test test/client-bundle-48.test.mjs        # 期望：21 条里 memo 3 绿、home/schedule 6 红（基线）
```

**档 1 · 最小回滚（保留备忘录面板）**：

```powershell
cd D:\ilife
# 1) 只回滚本票改过的两个源文件（路径级，绝不碰别人的改动）
git checkout -- packages/plugin-memo-ilife/src/index.ts packages/plugin-memo-ilife/src/dsh-ctx.ts
# 2) 移走本票新增的两个文件
Remove-Item packages\plugin-memo-ilife\src\skill-provider.ts
Remove-Item packages\plugin-memo-ilife\test\skills-provider.test.mjs
#   （test 必须一起移走：它 import 的 PROVIDER_NAME 等 6 个符号已随回滚消失，留着会红）
# 3) 重建宿主产物（必须！dist 是 gitignore 的；且 dist/index.js 有顶层 import 指向 skill-provider.js）
cd packages\plugin-memo-ilife
npm run build:host            # == tsc -b；src/client.ts 已被 exclude，dist/client.js 不会被碰
Remove-Item dist\skill-provider.js* -ErrorAction SilentlyContinue
# 4) 验证
Select-String -Path dist\index.js -Pattern 'skill-provider|skills'   # 期望：0 命中
Get-Content dist\client.js -TotalCount 1                             # 期望：window.__ModuleLoader__.load({
node --test test\smoke.test.mjs
cd D:\ilife; node --test test/client-bundle-48.test.mjs               # 期望：memo 3 绿、总数 15/6 不变
```

**本票实跑档 1 的原始输出（2026-09-12，跑完已按 §11.3 末的还原步骤逐字节还原）**：

```
=== 档 1 第 1 步：路径级 git checkout 两个源文件 ===
exit=0
=== 档 1 第 2 步：移走本票新增的两个文件 ===
=== 档 1 第 3 步：重建宿主产物 ===
> tsc -b
=== 档 1 第 4 步：验证 ===
dist\index.js 里 skill-provider|skills 命中数 = 0
dist\client.js 首行 = window.__ModuleLoader__.load({
ℹ tests 8   ℹ pass 8   ℹ fail 0            ← smoke
ℹ tests 21  ℹ pass 15  ℹ fail 6            ← 门① 与基线一致、memo 3 绿
GUI: 远程服务器返回错误: (401) 未经授权。   ← 全程未重启、未杀
```

**⚠️ 实跑踩到的一条新事实（补进档 1，复审 F 的原文没有）**：档 1 第 3 步的 `Remove-Item dist\skill-provider.js*` 会让 `tsconfig.tsbuildinfo` 与 `dist/` **不一致**——之后把源文件恢复回去、再跑 `tsc -b`，**增量构建会跳编**（实测：`dist/index.js` 停在 4697 B 的旧版、`dist/skill-provider.js` 干脆没重新生成，包内测试 8/9 红）。**恢复时的正确做法是强制全量重建**：

```powershell
cd packages\plugin-memo-ilife
Remove-Item tsconfig.tsbuildinfo -Force ; npm run build:host    # 全量重建
```

（本票按此重建后，逐字节核过 6 个文件全部与回滚前同哈希：`SAME` × 6，`全部逐字节相同 = true`，包内 17/17 绿、门① 15/6 不变、GUI 仍 401。）

**档 2 · 完全回滚（连技能包清单一起退回）**：

```powershell
cd D:\ilife
git checkout -- packages/skill-memo-ilife/SKILL.md packages/skill-memo-ilife/package.json
# 注意：packages/skill-memo-ilife/AGENTS.md 是【未跟踪】文件，git 不会动它；是否删除另行判断（不属本票清单）
# 然后重复档 1 的第 3、4 步
```

**档 3 · 应急：不重建也要停**（只在「构建本身不可信／跑不动」时用；仓内先例 `docs/agents/plugin-webserver-inject.md:64-72`，当年就是这么把三个插件停掉的）。二选一：

```powershell
# 3a) 从 profile 的 bundles 里摘掉这一行（照先例；文件里 dependencies 保留不删）
notepad "C:\Users\辰辰洋洋\.dsh\profiles\web\package.json"    # 删 "dsh-memo-ilife", 这一行
# 3b) 或用 profile 的补丁层按 id 禁用（row id 就是 dsh-memo-ilife，见该包 cordis.patch.yml）
#     把 "C:\Users\辰辰洋洋\.dsh\profiles\web\cordis.patch.yml"（现为 []）写成：
#       - id: dsh-memo-ilife
#         disabled: true
```

两者都**要重启 GUI 才生效**（profile 在启动期组装）；代价是备忘录面板与设置页一起消失，故只作最后手段。

**回滚后算成功的三条判据**：① `Invoke-WebRequest http://127.0.0.1:43120/` 仍 **401**；② `node --test test/client-bundle-48.test.mjs` → **21 / 15 绿 / 6 红**且 memo 3 条绿；③ 若已重启 GUI，当日日志里**没有** `failed to apply loader entry dsh-memo-ilife`，也没有 memo 相关的 `[E]`。

### 11.4 复审 F 裁掉的两件 ＋ 留给 #233 的

- **`~/.agents/skills` 不建 Junction**（F 的机制层证据：`dsh-skill/lib/index.js:299-305` 的 `collectFresh` 是 `layers=[global, ...chainLayers]` ＋ `merged.set` 覆盖 ⇒ **跨层「最近者赢」，rank 600 不起作用，且覆盖不打日志**；本提供方进 global 层，`~/.agents/skills` 那份进预设作用域层 ⇒ 那份会**无条件盖掉**本提供方。旁证：`skill-calorie` 的陈旧拷贝**此刻正在生效**）。**已并入 §9 第 2 条（已裁：先不装）。**
- **M4 越界告警**：`plugin-bill-ilife` 缺 `exclude: ["src/client.ts"]` ＋ `src/index.ts:47` 仍 `export type { HostCaller } from './client.js'` ⇒ 下一次 `tsc -b`／`pnpm -r build` 会把 bill 的 `dist/client.js` 覆写成裸 ESM，而 bill 在 web profile 的 bundles 里。**不归本票**，编排会话已另立票（`docs/skills/skill-memo-ilife/t232-bill-client-bundle-hazard.md`）。
- **留 #233**：T1 重启后核 `skill-memo-ilife` 真在 agent 技能表里（唯一能证伪「静默 pending」的动作）；T2 重启后核日志无 `failed to apply loader entry dsh-memo-ilife`、面板／设置页照旧；T3 判 `~/.agents/skills/skill-memo-ilife` 建不建（前置：卡路里线的陈旧拷贝）；T4 判 `inject` 三连（`connection`／`webServer`／`skills`）在本机是否全部需要；T5 `memo.help.lookup` 落地后把条件断言翻成正向。

### 11.5 ⚠️ 交接项的行号已过期（#229／#231 票面须订正，本票不能改别人的 issue）

编排会话已把两处交接项写进 `docs/skills/skill-memo-ilife/t229-body.md:27-29` 与 `t231-body.md:17-20`，**方向完全正确**；但两处都引用了 `test/skills-provider.test.mjs:90` 那一行——**经本票两轮复审整改后行号已移位**：

| 交接项里写的 | 终态实际位置 |
|---|---|
| `test/skills-provider.test.mjs:90`（反向断言） | **`:106`**（条件断言；`:102-105` 是说明注释，`:21-28` 是判定用的 `skillsHelpCommandExists()` 辅助函数） |

内容也不再是「反向断言」，而是**条件断言**：`assert.ok(!正文含命令 \|\| 技能实现里真有这条命令)`——#229 落地后它**不会**把正确交付打成红，但**仍须翻成无条件正向断言**（交接项的原意不变）。**这两张票的正文由编排会话／项目负责人订正，本票不碰别人的 issue。**

### 11.6 本票未做／不能做的（复审 F 的越界项）

- **M4 账单的 client 产物隐患**：`plugin-bill-ilife` 缺 `exclude: ["src/client.ts"]` ＋ `src/index.ts:47` 仍 `export type { HostCaller } from './client.js'`。**不属本票范围**，且会碰别人的包；编排会话已另立说明件 `docs/skills/skill-memo-ilife/t232-bill-client-bundle-hazard.md`。**本票一个字都没动**（`git status` 里 `packages/plugin-bill-ilife/**` 无改动）。
- **S1（把提供方注册挪到 RPC 通道之后）／S2（把解析器严格度差异写成测试）**：复审 F 列为「建议改，可与 #233 一起」。本票**未做**——S1 会与卡路里样板分叉（需在注释里写明理由），S2 的解析器差异已在 `skill-provider.ts:65-70` 的注释里写明爆炸链，测试侧的新反例断言覆盖了最要紧的一格（name 正则）。两项留 #233 判。
