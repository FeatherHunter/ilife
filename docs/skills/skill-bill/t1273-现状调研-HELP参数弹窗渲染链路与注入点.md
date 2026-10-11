# t1273 现状调研：HELP 参数弹窗的渲染链路与生成期注入点

- 票据：wayfinder 地图 [#1268](https://github.com/FeatherHunter/ilife/issues/1268) → 子票 [#1273](https://github.com/FeatherHunter/ilife/issues/1273)（`wayfinder:task` + `wayfinder:research`）。
- 基线：提交 `8a41aa97`（主目录 `master`；本票**只读**，不改源码、不编译、不切分支、不提交）。
- 调研对象：技能源码 `packages/skill-bill`；共享渲染层 `packages/base-render`（npm 包名 **`base-paint`**，`packages/base-render/package.json:2`）。
- 对照副本：`C:\Users\辰辰洋洋\.dsh\profiles\desktop\node_modules\skill-bill`（`0.3.53`，与源码同版本；本文结论以仓内源码为准）。
- 题眼：装控件／注入候选／定编码三票都压在这五条读数上。

## 结论速览（五条各一句）

| # | 问题 | 一句话结论 |
|---|---|---|
| 1 | 渲染链路 | 8 份域声明的 `editable_fields` → `wakeTable` 汇总 → `wake-assets.toGroup` 投影 → `helpFile.buildHelpFileData` → `helpShell.renderHelpShellHtml` 把整份 JSON 注入 `<script id="help-data">` → **参数弹窗由模板页面侧 JS 现拼**（`normalizeScenes` → `fieldControlHTML`），生成期不做控件。 |
| 2 | `kind` 取值 | 闭集 8 值 `text/number/select/date/week/month/year/time`（`spec/help.ts:32`）；kind→控件的唯一分派函数是 `assets/help-template.html:1825-1863 fieldControlHTML`；记账当前只用 4 值（text 89／number 20／date 12／select 3）。 |
| 3 | 生成期取数 | **现在一条都读不到**——HELP 路**不开库**（`src/cli/cmd_read.ts:110-142`），只做一次 `existsSync(resolveDbPath())`；五条读点各自存在且都能单独跑通，接不接是新增接线的事。 |
| 4 | `reuseHours` 命中 | **照渲染、不落盘**：`cmd_read.ts:132` 无条件先渲染，命中时 `saveHtmlFile` 返回已有文件、一个字节不写（`base-render/src/output/saveHtml.ts:361-367`）⇒ 复用窗口内产物内容被冻结。 |
| 5 | 模板引用方 | 所有者 `base-paint`；消费方 **6 家技能**：skill-bill、skill-calorie、skill-chef、skill-home、skill-memo-ilife、skill-schedule。 |

---

## 一、渲染链路：`editable_fields` 从定义到最终 HELP HTML 的每一跳

### 1.1 逐跳表（文件 ＋ 行号 ＋ 经手函数）

| 跳 | 文件:行 | 函数／动作 |
|---|---|---|
| ① 定义 | `packages/skill-bill/src/<域>/declaration.ts`（8 份：`write:35`、`query:60`、`analysis`、`goal:33`、`account:32`、`link:30`、`setup:79`、`help`） | 域声明里的 `scenes[].editable_fields` 字面量；形状类型是 `WakeSceneDecl.editable_fields`（`src/triggers/routeSpec.ts:50-59`，字段在 `:58`）。记账现用法：字段的 `value` **全部为空串**（0/124 非空），`options` 只在 3 个 `select` 上出现。 |
| ② 汇总 | `packages/skill-bill/src/triggers/wakeTable.ts:17-24`（import 8 份）、`:28-31`（`DECLARATIONS`）、`:48`（`ordered()` 按 `order` 排） | `DECLARATIONS` 是声明的**唯一汇总位**；本跳不改字段，只排序。 |
| ③ 投影 | `packages/skill-bill/src/triggers/wake-assets.ts:27-52`（`toGroup`），拷贝语句在 **`:36-39`** | 词条 → 场景卡：`...(s.editable_fields !== undefined ? { editable_fields: s.editable_fields } : {})`；零参场景**缺席**该键（不发明空数组）。`WAKE_GROUPS` 在 `:55-57` 生成。 |
| ④ 装配 | `packages/skill-bill/src/help/helpFile.ts:142-157`（`buildHelpFileData`） | 产出 HELP JSON；**`:152` `groups: WAKE_GROUPS`**（模块级常量直引，不 clone——见 §6.1）。 |
| ⑤ 渲染成整页 | `packages/skill-bill/src/help/helpFile.ts:160-162`（`renderHelpFileHtml`）→ `packages/base-render/src/helpShell.ts:73-80`（`renderHelpShellHtml`） | `JSON.stringify(data).replace(/</g,'\\u003c')` 塞进 `HELP_SHELL_DATA_OPEN`（`helpShell.ts:48`，即 `<script id="help-data" type="application/json">`）两段之间；前缀/后缀是常量（`:42`／`:45`）。`groups` 为空即抛 `HelpShellError('missing-data')`（`:74-76`）。 |
| ⑥ 调用点 | `packages/skill-bill/src/cli/cmd_read.ts:110-142`（`dispatchHelp`），渲染在 **`:132`** | `renderHelpFileHtml(buildHelpFileData(now, { initialized: helpInitialized() }))`——**无条件先渲染**（见 §4）。 |
| ⑦ 交付 | `packages/skill-bill/src/delivery/landing.ts:42-49` → `packages/skill-bill/src/output.ts:54-59` → `packages/base-render/src/output/saveHtml.ts:339-382` | 落盘唯一入口 `saveHtmlFile`；名字通式 `〈主体〉_<YYYYMMDD_HHMMSS>[_N].html` 也住这一件（`helpPaths.ts:6-8` 明确「本模块只剩名字」）。 |
| ⑧ 页面侧成形 | `packages/base-render/assets/help-template.html:1705-1709`（`normalizeScenes`）→ `:1785-1790`（`fieldKindOf`）→ **`:1825-1863`（`fieldControlHTML`）** → `:2025-2028`（塞进 `<div class="pform">`） | 打开场景卡时页面 JS 现拼参数表单（`readParams` `:1801-1806`、`buildPrompt` `:1807-1824`、`getMissing` `:1864-1866`）。**控件不在生成期存在**。 |

### 1.2 模板源与生成物（改控件要走的门）

- 唯一真相源＝`packages/base-render/assets/help-template.html`（2240 行）；
- 生成器＝`packages/base-render/scripts/gen-help-shell.cjs`（`SRC_HTML` `:15`、`OUT_SRC` `:16`），命令 `pnpm --filter base-paint gen:help-shell`（`base-render/package.json:30`，`--check` 在同文件 `:31`）；
- 生成物＝`packages/base-render/src/helpShell.ts`（禁手改；模板全文被切成 `HELP_SHELL_PREFIX`＋`HELP_SHELL_SUFFIX` 两段常量）。

> 结论：**改参数弹窗控件＝改 `help-template.html` ＋ 重跑 `gen:help-shell`**，属于共享层改动；技能侧只剩「给哪些字段、给什么 `kind`／`options`」。

---

## 二、`editable_fields[].kind` 现在支持哪些取值？各渲染成什么控件？

### 2.1 闭集（契约面，两处同源）

| 位置 | 内容 |
|---|---|
| `packages/base-render/src/spec/help.ts:30-32` | `export type SceneFieldKind = 'text' \| 'number' \| 'select' \| 'date' \| 'week' \| 'month' \| 'year' \| 'time';`（注释记沿革：#966 定案、#969 落契约、#978 扩 month／year、#975 扩 time） |
| `packages/base-render/src/spec/help.ts:204` | JSON-Schema 的 `kind: { enum: [...] }` —— 与 TS 类型同 8 值 |
| `packages/base-render/src/spec/help.ts:34-46` | 一条字段的完整形状：`name/label/value` 必填 ＋ `hint/required/kind/options/min/max/step/placeholder` 选填 |

### 2.2 kind → 控件的**唯一分派点**

`packages/base-render/assets/help-template.html:1825-1863` 的 `fieldControlHTML(p)`（`:1826` 先过 `fieldKindOf`）：

| kind | 渲染出的控件 | 行号 | 附属属性 |
|---|---|---|---|
| `select` | `<select data-p=…>` ＋ 空选项（必填「请选择」／选填「（选填，未选）」）＋ 逐 `options`（字符串或 `{value,label}`） | 1828-1838 | 当前值相等即 `selected` |
| `number` | `<input type="number" inputmode="decimal">` | 1840-1845 | 吃 `min`／`max`／`step` |
| `date` | `<input type="date">` | 1847-1849 | — |
| `week` | `<input type="week">` | 1850-1852 | — |
| `month` | `<input type="month">` | 1853-1855 | — |
| `year` | `<input type="number" inputmode="numeric">`（**不是** `type="year"`，HTML 无此型） | 1856-1858 | — |
| `time` | `<input type="time">` | 1859-1861 | — |
| `text`（缺省／非法值回落） | `<input type="text">` | 1862（回落分支） | — |

**非法 kind 的处理**：两处白名单归一，非法值**降级 text 并 `console.warn`**，不抛错——
`help-template.html:1706-1707`（`normalizeScenes`）与 `:1787-1788`（`fieldKindOf`）。
即「生成期不校验 kind，页面侧静默降级」。

### 2.3 记账当前实际用量（运行时读数，非文本统计）

```
node --input-type=module -e "const m=await import('file:///D:/ilife/packages/skill-bill/dist/triggers/wake-assets.js');const c={};for(const s of m.WAKE_ASSETS)for(const f of (s.editable_fields||[]))c[f.kind||'(缺省=text)']=(c[f.kind||'(缺省=text)']||0)+1;console.log(m.WAKE_ASSETS.length, JSON.stringify(c))"
```

本机实测：`74 [{number:20, text:89, date:12, select:3}]`——**124 个字段／60 个有参场景／14 个零参场景**。
`week`／`month`／`year`／`time` 四型**契约里有、记账一处未用**（全仓 grep `kind: 'week'` 命中的是词条 `preset.kind`，不是字段 kind：`src/analysis/declaration.ts:76`）。

---

## 三、生成 HELP 时能否读到库里的数据（五条各给可执行读数）

### 3.0 先说结论：现在**一条都没接**

- HELP 路在**开库之前**分派：`src/cli/cmd_read.ts:236-239`（`dispatchHelp` 先于 `runRegistered`／`dispatch`），设计口径写在 `:65-80` 的文件头注释（「全程**不开库**」）。
- 生成期唯一的「盘上读数」是初始化状态：`cmd_read.ts:106-108 helpInitialized()` → `existsSync(resolveDbPath())`。
  ⚠️ 注意副作用：`resolveDbPath()` 内部有 `mkdirSync(dir,{recursive:true})`（`src/fetch/paths.ts:97-100`）⇒ 取这份读数会**建库目录**，但不建库文件、不建表。
- `buildHelpFileData(now, opts)` 的入参只有 `now` 与 `{initialized}`（`src/help/helpFile.ts:93-96、142`），**没有 DB 句柄、没有 goals、没有备份目录** ⇒ 任何注入都得先加一条取数接线。

下面五条是「接得上吗／从哪儿接」的读数；**本条只做只读验证**（`DatabaseSync(..., {readOnly:true})`、直接读文件），没有跑任何会开库写盘的技能命令。

### 3.1 bills 表的分类去重

- 读点：`src/fetch/db.ts:103-113 fetchAll()`（`SELECT * FROM bills WHERE …`）；现成的分类去重函数只有 `src/write/recentPicks.ts:32-40 distinctOf(recent,'category')`——**只从「近期记录」里取前 12 个**，不是全库去重。
- 可执行读数（只读）：

```
node -e "const{DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('D:/2Study/StudyNotes/.db/biscuit_accountant.db',{readOnly:true});const r=d.prepare('SELECT DISTINCT category FROM bills WHERE deleted_at IS NULL ORDER BY category').all();console.log('distinct=',r.length);d.close()"
```

- 本机实测：**141 个不同分类值**（含三级路径；L1 去重后 19 个：餐饮/出行/其他收入/社交/居家/工资/宠物/健康/玩乐/穿着/学习/投资/奖金/交通/赔偿金/其他/借贷/分期/兼职）。库共 7362 行（含软删）。

### 3.2 账户表

- **不在 SQLite 里**：账户表是 `goals.json` 顶层 `accounts` 键（`src/account/accounts.ts:1-14`、`src/fetch/db.ts:230-231`），读函数 `src/account/accounts.ts:96-104 accountsOf(goals)`，装载 `src/fetch/db.ts:233-251 loadGoals(path)`（**纯读**，文件不在即返三空数组，不建文件；写盘是另一函数 `saveGoals` `:253-261`）。
- 可执行读数（只读）：

```
node -e "const g=require('D:/2Study/StudyNotes/.db/goals.json');console.log('accounts=',g.accounts.length, g.accounts.map(a=>a.name+'/'+a.type).join(', '))"
```

- 本机实测：**15 个账户**（建设银行储蓄卡(0709)/银行卡、支付宝/支付、微信/支付、现金/现金、美团月付/信用 …）。

### 3.3 账本列表

- 读点：`bills.ledger` 列（DDL 默认值 `'生活'`，`src/fetch/db.ts:37`；行形状 `:13`）；去重仍只在 JS 侧做（`src/query/list-tag.ts:97`、`src/query/ticket-day.ts:137`），**没有专门的账本清单命令**。
- 可执行读数（只读）：

```
node -e "const{DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('D:/2Study/StudyNotes/.db/biscuit_accountant.db',{readOnly:true});console.log(d.prepare('SELECT DISTINCT ledger FROM bills WHERE deleted_at IS NULL ORDER BY ledger').all().map(r=>r.ledger).join(', '));d.close()"
```

- 本机实测：**3 个账本**——借贷、旅行、生活。

### 3.4 `#tag` 去重

- **没有 tag 列**：标签写在 `note` 文本里，读法只有「给定标签做精确整词匹配」——`src/fetch/db.ts:155-170 tagMatch()`（分隔符闭集在 `:155 isSep`）、`:172-177 listByTag()`；正则是死的（`:156 TAG_SEP_UNUSED2` 已弃用）。**全仓没有「枚举所有标签」的函数。**
- 可执行读数（只读，按 `isSep` 同口径扫 `note`）：

```
node -e "const{DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('D:/2Study/StudyNotes/.db/biscuit_accountant.db',{readOnly:true});const notes=d.prepare('SELECT note FROM bills WHERE deleted_at IS NULL').all().map(r=>String(r.note||''));d.close();const isSep=c=>c===''||c.charCodeAt(0)<=32||'.,?!;:|/()[]{}、，。？！；：（）「」『」'.includes(c);const t=new Set();for(const n of notes)for(let i=0;i<n.length;i++){if(n[i]!=='#')continue;let j=i+1;while(j<n.length&&!isSep(n[j]))j++;const s=n.slice(i+1,j);if(s)t.add(s);i=j-1}console.log(notes.length,'notes =>',t.size,'raw #tokens')"
```

- 本机实测：7360 条备注 → **131 个 `#…` 词**，但里面绝大多数是淘宝订单号（`#0`、`#10385` …）。**真标签只有 10 个左右**：借入／借出／借给小明／向小红借／未还／分期／待报销／报销到账／退款／MHL。
  ⇒ 读得到，但**「去重」必须先按 `tagMatch` 口径或白名单筛**，裸扫会把订单号当标签；这条对「注入候选」票是个真坑。

### 3.5 `backup.dir` 下的备份文件列表

- 目录算式：`src/fetch/paths.ts:110-112 resolveBackupDir()`（配置 `backup.dir`，空串＝`<库目录>/backups`；`:91-94 backupDirOf`）。
- 目录清单：`src/setup/backups.ts:79-88 listBackups(dir)`——**目录不存在返空表、不报错**（`:77-78` 注释），条目形状 `BackupEntry`（`:24-38`）；另有 `findBackup` `:91-94`／`selectedBackup` `:97-101`。用户面读法是 `bill.setup.run --params '{"op":"backup-list"}'`（op 闭集 `src/setup/params.ts:21-24`；处理体 `src/setup/run.ts:148-164`）。
- 可执行读数（只读，直接调源码函数，**没有跑会开库的 CLI**）：

```
node --input-type=module -e "import {listBackups} from 'file:///D:/ilife/packages/skill-bill/dist/setup/backups.js';console.log(JSON.stringify(listBackups('D:/2Study/StudyNotes/.db/backups')))"
```

- 本机实测：`[]`——`D:\2Study\StudyNotes\.db\backups` 目录**尚不存在**（`ENOENT`），所以按「还没有备份过」返空表。

### 3.6 接线的三个硬约束（给「注入候选」票）

1. **开库有副作用**：`openBillDb()` 会 `mkdirSync`＋建表＋建索引＋老库补列（`src/fetch/db.ts:52-77`），与 HELP 路「看帮助不该建库」的现口径冲突（`cmd_read.ts:78-79`）。要读 SQLite 就得决定：接受建库，还是用 `new DatabaseSync(path,{readOnly:true})` 另开一条只读连接。
2. **纯读的两条没有副作用**：`loadGoals()`（`db.ts:233-251`）与 `listBackups()`（`backups.ts:79-88`）都不建文件、不建目录 ⇒ 账户表与备份列表可以无副作用地接进生成期。
3. **注入进哪一层**：`buildHelpFileData()`（`helpFile.ts:142`）是唯一的装配点，它现在直引模块级 `WAKE_GROUPS`（`:152`，`:8` 注释「只读引用不 clone」，且 `Object.isFrozen(WAKE_GROUPS) === false`）⇒ 若要在 `options`／`value` 上做每调用一次的注入，**必须先 clone**，否则同进程内多次渲染会互相污染（当前 CLI 一次进程只渲染一次，暂无现场故障）。

---

## 四、`reuseHours` 复用窗口命中：直接复用已有文件，但**仍然重新渲染**

结论：**渲染照跑（结果丢弃），落盘被跳过**。

| 步 | 文件:行 | 事实 |
|---|---|---|
| ① 参数换算 | `src/cli/cmd_read.ts:97-102`（`windowOf`／`windowForHelpDelivery`）→ `base-render/src/output/saveHtml.ts:136-147 helpReuseWindowOf` → `:112-123 reuseWindowOfHours` | 缺省窗口 **24 小时**（`saveHtml.ts:69 HELP_REUSE_DEFAULT_HOURS = 24`）；`0`＝每次都落新件；坏参 exit 2。只对两个 HELP 主体生效（`cmd_read.ts:88-90`），`--html` 那支不吃复用（`output.ts:47-50`）。 |
| ② 渲染 | `cmd_read.ts:132` | `renderHelpFileHtml(buildHelpFileData(...))` **无条件执行**，在交付裁决（`:250-253 landHtml`）之前。 |
| ③ 判据 | `saveHtml.ts:361-367` | `reuse:'byAge'` → `reuseByAge(dirAbs, stem, now, ms)`（`:302-320`）：**按落盘名里的时间戳算**（不看 mtime），不超龄即返回已有那份。 |
| ④ 命中后 | `saveHtml.ts:367` | `if (hit !== null) return receiptOf(hit);`——**不新建、不覆盖**；回执 `bytes` 是**已有那份的实际字节数**（`:80-85` 注释）。 |

⇒ **对「生成期快照注入」的直接含义**：
- 用户默认（不给 `reuseHours`）在 24 小时内反复看 HELP，打开的**一直是窗口内第一次落的那份 HTML**；期间新注入的分类／账户／备份快照**不会出现在用户眼前**（虽然每次都在内存里算了一遍）。
- 要让快照跟着更新，只有三条路：把注入值纳入复用判据（如改走 `reuse:'byContent'`，`:320-333`）、命中时也重写、或让用户显式 `reuseHours:0`。
- 反过来，**「模板层装控件」不受这条影响**（控件是页面 JS 现拼，模板一变、产物一变，但产物被复用冻住时用户看到的仍是旧模板页）⇒ 改模板后要验证「用户真能看到」得先清旧产物或 `reuseHours:0`。

---

## 五、这套共享 help 模板被哪几家技能引用（列全）

### 5.1 所有者

| 项 | 值 |
|---|---|
| 包名／位置 | `base-paint` ＝ `packages/base-render`（`package.json:2`，版本 `0.3.53` `:3`） |
| 子路径出口 | `"./help-shell": "./dist/helpShell.js"`（`packages/base-render/package.json:12`） |
| 实现 | `packages/base-render/src/helpShell.ts:73-83`（`renderHelpShellHtml`／别名 `renderHelpShell`） |
| 模板源 | `packages/base-render/assets/help-template.html`（生成器 `scripts/gen-help-shell.cjs`） |

### 5.2 消费方（6 家，全部是「`helpFile.ts` 里一行 import ＋ 一行转发」）

| # | 包名 | 引用点（`base-paint/help-shell` 的 import） | 调用点 | 声明依赖 |
|---|---|---|---|---|
| 1 | **skill-bill**（饼干记账） | `packages/skill-bill/src/help/helpFile.ts:20` | `:161`（`renderHelpFileHtml`） | `packages/skill-bill/package.json:26` |
| 2 | **skill-calorie**（卡路里） | `packages/skill-calorie/src/photo/helpShell.ts:16-17`（**转发件**，标 `@deprecated`） | `src/photo/helpShell.ts:22-23` → 被 `src/photo/helpFile.ts:28` import、`:174` 调用 | `packages/skill-calorie/package.json:21` |
| 3 | **skill-chef**（私家大厨） | `packages/skill-chef/src/help/helpFile.ts:58` | `:201` 附近（`renderHelpFileHtml`） | `packages/skill-chef/package.json:26` |
| 4 | **skill-home**（居家管家） | `packages/skill-home/src/help/helpFile.ts:51` | `:266` 附近 | `packages/skill-home/package.json:27` |
| 5 | **skill-memo-ilife**（备忘录） | `packages/skill-memo-ilife/src/help/helpFile.ts:35` | 同件转发 | `packages/skill-memo-ilife/package.json:22` |
| 6 | **skill-schedule**（作息管家） | `packages/skill-schedule/src/help/helpFile.ts:23` | `:189`（`renderHelpShellHtml(payload)`） | `packages/skill-schedule/package.json:26` |

复跑（认口：只列 `src/` 下的 import，不列测试）：

```
rg -n "base-paint/help-shell" packages/*/src
```

> 注：卡片/场景数据契约另有一份 `renderHelpShell`（带 schema 校验，走包根 `base-paint` 主入口，`packages/base-render/src/help.ts`），它**不是** HELP 壳渲染路——别混。全仓共 6 个技能包（`packages/skill-*`，逐包 package.json 已核），**全部在列、无遗漏**；`packages/plugin-*` 与 `dsh-*` 插件不引这套 help 模板（其余用到 HELP 视觉的地方是各自转抄 CSS，不是这套壳）。

---

## 六、给下游三票的直读结论

1. **装控件票**：控件只有一处实现（`assets/help-template.html:1825-1863`），且必须走 `gen:help-shell` 生成器；技能侧只需给 `kind`／`options`／`min/max/step`。记账现用 4 型，扩 `week/month/year/time` 属**未用但已支持**，不需要改共享层。
2. **注入候选票**：可注入的挂点只有 `buildHelpFileData`（`helpFile.ts:142`）；账户表（`loadGoals`）与备份列表（`listBackups`）能**无副作用**接入，分类／账本／标签要先开只读 SQLite 连接（`openBillDb` 有建库副作用）。且注入值会被 `reuseHours` 窗口冻住（§4）。
3. **定编码票**：产物是一份 JSON 载荷（`<script id="help-data">`）＋页面侧 JS，字段的 `value` 目前**全为空串**、`options` 只 3 处 ⇒ 「注入候选值」与「预填值」在现有形状里是同一个位置，改动面比想象小。

## 七、复跑清单（全部只读）

```powershell
# ① kind 分布（运行时）
node --input-type=module -e "const m=await import('file:///D:/ilife/packages/skill-bill/dist/triggers/wake-assets.js');const c={};for(const s of m.WAKE_ASSETS)for(const f of (s.editable_fields||[]))c[f.kind||'text']=(c[f.kind||'text']||0)+1;console.log(m.WAKE_ASSETS.length, JSON.stringify(c))"
# ② 分类去重 / 账本去重
node -e "const{DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('D:/2Study/StudyNotes/.db/biscuit_accountant.db',{readOnly:true});console.log('cat',d.prepare('SELECT DISTINCT category FROM bills WHERE deleted_at IS NULL').all().length,'ledger',d.prepare('SELECT DISTINCT ledger FROM bills WHERE deleted_at IS NULL').all().length);d.close()"
# ③ 账户表
node -e "const g=require('D:/2Study/StudyNotes/.db/goals.json');console.log('accounts',g.accounts.length)"
# ④ 备份列表
node --input-type=module -e "import {listBackups} from 'file:///D:/ilife/packages/skill-bill/dist/setup/backups.js';console.log(listBackups('D:/2Study/StudyNotes/.db/backups'))"
# ⑤ 模板引用方
rg -n "base-paint/help-shell" packages/*/src
```

（`D:\2Study\StudyNotes\.db` 是本机 `~/.ilife/bill.yaml` 的 `db.dir`；换机器按该配置改路径。）
