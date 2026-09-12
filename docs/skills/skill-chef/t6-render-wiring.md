# 私家大厨HELP（6/11）渲染接线 · 交付报告（`#214`）

> **票**：[`#214` 私家大厨HELP（6/11）渲染接线](https://github.com/FeatherHunter/ilife/issues/214)（assignee＝FeatherHunter）
> **交付判据**（票面）：**零 IO 出全页 HELP HTML**——把 `#213` 已入库的内容资产喂进通用 help 模板，产出可落盘的整页 HTML 字节；**解冻边界门 ＋ 加公共层依赖**。
> **不在本票**：CLI 出口（票 7 `#215`）、调用 `saveHtmlFile` 的那条出口接线（本票只把**落盘点**摆好，`saveHtmlFile` 已由 `base-paint/save-html` 就位）。
> **用词**：照 `docs/agents/wording.md`——说「help 模板」，不写「壳」。**行数口径**：350 ＋ LF（只数 `\n`），照 `packages/skill-chef/AGENTS.md`（本票新建）。
> **日期**：2026-09-12。**工作树**：`D:\ilife`（另一会话有数十项未提交改动，本票只 `git add` 自己的文件、显式路径）。

---

## 零、一句话结论

内容资产 → **全量 HELP JSON**（`buildChefHelpFileData`）→ **整页 HTML**（`renderChefHelpHtml` → 共享 help 模板）→ **落点意图**（`buildChefHelpDelivery`）→ **落盘**（`deliverChefHelp` → 共用件 `saveHtmlFile`）四段全通、**零 IO 出字节**：

| 量 | 实测值 |
|---|---|
| 渲染产物（固定 `now`＝2026-09-12 14:30） | **127,155 B ／ 2,055 LF** |
| 其中载荷段（`help-data` 内的 JSON） | 20,775 B |
| 产物 sha256（UTF-8 字节） | `801b6c90af2187d4923e7289b31df3c65bcf7a83b4e61b61c43037501ce808b7` |
| 留档实物（gitignored，供复核席直接打开） | `.scratch/chef-help/t214-rendered-help.html` |

---

## 一、第一步 · 影响清单（引用 `#236` 正本 ＋ 实际偏差）

**正本**：`docs/skills/skill-chef/t236-structure-design.md`（`#236` 的第一／二步，已于 2026-09-12 拿到用户点头 ⇒ 本票不重新设计形状，照它施工）。本票的行＝该正本 §1.2 的 **A4／A5／B4／B6／B7** ＋ 票面 B 段点名的 `src/help/index.ts` 转发出口；**范围裁剪**照 §1.2 末（A2／B1／B3／B5／C1 属票 7）。

| 正本行 | 件 | 实际碰到的 | 偏差 |
|---|---|---|---|
| §1.2 A4（`:91`） | `src/help/helpFile.ts`（装配 ＋ 交付意图） | ✅ 新建 **226 LF**；`buildChefHelpFileData`／`buildChefHelpDelivery`／`renderChefHelpHtml`／`formatHelpMinute` | 无 |
| §1.2 A5（`:92`） | `src/help/output.ts`（落点） | ✅ 新建 **47 LF**；`deliverChefHelp` 调 `base-paint/save-html` 的 `saveHtmlFile` | 无 |
| 票面 B 段 | `src/help/index.ts` 加转发出口 | ✅ 2 LF → **6 LF**（5 个运行名 ＋ 2 个类型） | 无 |
| §1.2 B4（`:102`） | `tooling/check-boundaries.mjs` 解冻 | ⚠️ 数组项**在我开工前已被他会话摘掉并提交**（见 §六 第 1 条）⇒ 本票只剩「补理由段」：新增 `:49-54` 六行，数组落在 `:55` | **偏差（环境已变）**，动作已补 |
| §1.2 B6（`:104`） | `packages/skill-chef/AGENTS.md` 新建（350 ＋ LF） | ✅ 新建 23 LF | 无 |
| §1.2 B7（`:105`） | `packages/skill-chef/package.json` 加 `base-paint` | ✅ `"base-paint": "^0.3.0"`（与解冻同批） | 无 |
| §1.2 B2（`:100`） | `src/render/index.ts` 登记新出口 | ❌ **未碰**。本票把新件的公开出口登记在 `src/help/index.ts`（票面 B 段点名的落点）；`src/index.ts:4` 已 `export * from './help/index.js'` ⇒ 包根可及（测试锁住）。两处都登记＝同一个出口两个定义地 | **与正本 B2 的落点措辞不同（有意，见 §六 第 7 条）** |
| 本票新增（正本未列） | `scripts/gen-help-assets.mjs` ＋ `src/help/sceneData.ts` | ✅ 各改一处（`title` 就地摆正到老家原文 ＋ `version` 出处注释）；生成器 `--check` 复绿 | **超出正本清单**，理由＝票面 C 条要求，见 §三·1／§三·3 |
| 本票新增（正本未列） | `test/help-file-214.test.mjs` | ✅ 新建 135 LF（7 用例；票面要求「每步留可复算的证据」） | 超出正本清单，属证据件 |

**没碰的**（票面明令归票 7）：`src/cli/cmd_read.ts`（**LF 388 未动**，哈希 `044ec51f3954a341…` 前后一致）、`src/policy/wakewords.ts`、`src/render/index.ts`、`src/fetch/db.ts`（**LF 451 未动**，哈希 `7f356d557ce44ae8…` 前后一致）、`packages/skill-chef/SKILL.md`（他会话的未提交改动，哈希 `1be06c703d707803…` 本票前后一致）。

**新建目录层级：0 个**（三个新源码件都落进**已存在**的 `src/help/`）。

---

## 二、第二步 · 结构设计（导出数逐个点名）

```
packages/skill-chef/
├─ AGENTS.md                      ← 新建（B6）：350 ＋ LF 口径 ＋ 三件超线挂号
├─ scripts/gen-help-assets.mjs     （存量，改：两处注释 ＋ 一个常量）
├─ src/
│  ├─ cli/cmd_read.ts              （存量，**本票未碰**；help 分支与开库顺序归票 7）
│  ├─ render/index.ts              （存量，**本票未碰**）
│  └─ help/                        ← 已存在的技能级入口目录（非能力目录，`#236` §1.1）
│     ├─ lookup.ts                （存量，未碰＝速查信封，与本票无关）
│     ├─ sceneData.ts             （存量，`#213`；改：`title` ＋ 头注释）
│     ├─ index.ts                 （存量，改：转发新出口，2 LF → 6 LF）
│     ├─ helpFile.ts              ← 新建（A4）226 LF
│     └─ output.ts                ← 新建（A5）47 LF
└─ test/help-file-214.test.mjs     ← 新建（证据件）135 LF
```

| 文件 | 对外给几个 | 逐个点名 |
|---|---|---|
| `src/help/helpFile.ts` | **4**（全部运行名，0 类型导出） | ① `formatHelpMinute(now)`：老 `%Y-%m-%d %H:%M`（本地时区、零填充，坏 `Date` 即抛）；② `buildChefHelpFileData(now, opts?)`：**纯函数零 IO**，出全量 HELP JSON；③ `renderChefHelpHtml(data)`：整页 HTML（转发共享 help 模板）；④ `buildChefHelpDelivery(dbPath, now)`：`{html, target}` 交付意图。<br>**内部不导出**：`ChefInitBanner`（6 字段）、`ChefHelpFileOptions`、`chefHelpInitialized`、`initPromptFrom`、`fail`、`HELP_DIR_SEGMENTS`／`HELP_FILE_STEM`／`CHEF_HELP_CONTACT` |
| `src/help/output.ts` | **3**（1 运行 ＋ 2 类型） | ① `deliverChefHelp({explicit, target, html})` → `{mode, path, bytes}`（唯一落盘点，调共用件 `saveHtmlFile`）；② `ChefHtmlDelivery`（＝共用件回执 `HtmlReceipt` 的别名，不另立定义）；③ `HtmlLanding`（转出共用件形状给出口用） |
| `src/help/index.ts` | 转发 5 运行名 ＋ 2 类型 | `buildChefHelpFileData`／`buildChefHelpDelivery`／`renderChefHelpHtml`／`formatHelpMinute`／`deliverChefHelp` ＋ `ChefHtmlDelivery`／`HtmlLanding` |
| `src/help/sceneData.ts`（`#213`） | 2（未变） | `CHEF_SCENES`（全量 groups）／`buildChefSceneData()`（全量 `SceneData`）——**本票不改它的导出面** |

**类型字段数核对**（铁律五：一个类型 ≤8 字段）：本票新造的 `ChefInitBanner` **6** 字段；`buildChefHelpFileData` 的内联返回类型 **7** 字段；`deliverChefHelp` 的内联入参 **3** 字段；其余复用公共层契约（`SceneData`／`SceneGroup`／`HelpShellData`／`HtmlLanding`／`HtmlReceipt`，**本票一个新契约类型都不造**）。

**租户与依赖方向**（单向，全向下）：

```
票 7 的出口（src/cli/cmd_read.ts）
  └─> src/help/helpFile.ts（零 IO）        ──> base-paint/help-shell   renderHelpShellHtml
        └─> src/help/output.ts（唯一碰 fs） ──> base-paint/save-html    saveHtmlFile
              └─> src/render/errors.ts（同包错误面，不向上引）
```

- **共用件谁在用**（结构标准「共用件要从第二个用法里长出来」）：`saveHtmlFile` 现在有 **bill（`src/output.ts:46`）／calorie（`src/output.ts:199`）两家**在用，本票是第三家——**本票不自持第二份 `nextExclusiveCandidate`**；`renderHelpShellHtml` 有 **bill／calorie／memo／schedule 四家**在用，本票第五家。
- **`src/help/` 不是共用位**：它是 chef 自己的技能级入口（`#236` §1.1），件里不出现任何能力名。
- **不牵连只要渲染的消费者**：`helpFile.ts` **不 import** `base-paint/save-html`（带 `mkdirSync`／`writeFileSync`／`readdirSync`／`crypto` 的那一件），纯渲染路径（`buildChefHelpFileData`／`renderChefHelpHtml`）**零 IO**；真正碰写盘的只有 `output.ts`，它经子路径 `base-paint/save-html` 调共用件（`base-paint` 的包根本身零文件系统依赖）。
  ⚠️ **一处如实说明**：`helpFile.ts:1` 确实 `import { existsSync } from 'node:fs'`——那是 `buildChefHelpDelivery` 的**只读探针**（见 §三·2）。这一处是本票的取舍：探针也可以做成入参（`buildChefHelpDelivery(dbPath, now, initialized?)`）让本件彻底零 IO，但那会把「只读页不建库」的口径推给票 7 的出口，且与 `#236` A4 的签名（`buildChefHelpDelivery(dbPath, now)`）不符 ⇒ 取现在的落法，在此登记。

---

## 三、三条小口径的实测取证（各给文件:行号）

### 1. `version` 取什么 —— **值不变（`0.1.0`），改的是出处与口径注释**

**先实测兄弟件（渲染件／资产件逐行读）**：

| 家 | 取值与出处 | 行号 |
|---|---|---|
| 记账 bill | `HELP_FILE_VERSION = '2.0'`；注释逐字「老口径 `str(summary.get("version","2.0"))`，语义是**技能数据世代**…**不是** npm 包版本 `0.1.0`」 | `packages/skill-bill/src/render/helpFile.ts:13-14`／`:28-29`／`buildHelpFileData` 用在 `:148` |
| 作息 schedule | `HELP_FILE_VERSION = '2.0'`；注释逐字「技能数据世代版本（照 bill 口径：**不是** npm 包 `skill-schedule@0.1.0`）」 | `packages/skill-schedule/src/help/helpFile.ts:34-35`／用在 `:179` |
| 备忘录 memo | **从资产的公开导出取**：`const version = String(buildHelpSceneIndex().version);`；值住在资产生成件里（取自老 `references/scenarios.yaml` 顶层＝`1.3.0`） | `packages/skill-memo-ilife/src/help/helpFile.ts:179-181`；资产 `src/help/sceneData.ts:9`／`:37-39`／`:63` |
| 卡路里 calorie | **不传 `version`**（注释：可选能力「传了即第二真相源，漂移面无收益」） | `packages/skill-calorie/src/render/helpFile.ts:13-14` |

**chef 的单一事实源**：老载荷 `meta.version`——`.scratch/chef-help/legacy-chef-help-payload.json` 的 `meta` ＝ `{"skill":"私家大厨","version":"0.1.0","generated_at":"2026-07-27","help_wake_word":"私家大厨 HELP"}`（逐字引用见 `.scratch/chef-help/A2-legacy-chef-delivery-contract.md:199-204`）；生成器把它**逐字断言**：`scripts/gen-help-assets.mjs:67`（值）／`:186`（`eq('载荷 meta.version', payload.meta.version, HELP_VERSION)`）。

⇒ **记账口径确实不是「npm 包版本」**，但 chef 的 `0.1.0` **恰好与之同值**（老件数据世代就是 `0.1.0`）。所以本票**不动这个值**（`test/scene-data.test.mjs:169` 仍绿），改两处：

- **摆正①（声明处写清口径）**：`scripts/gen-help-assets.mjs:55-64` 的注释重写为「`version` 取老载荷 `meta.version`＝**技能数据世代**，**不是** npm 包 `skill-chef@0.1.0`——两者同值是巧合」，并点出依据＝bill `:13-14`／schedule `:34-35`；重新生成后 `src/help/sceneData.ts` 头注释同步（`:30-33`）。
- **摆正②（不落第二份字面量）**：装配层**不写** `CHEF_HELP_VERSION = '0.1.0'`，而是从资产公开导出取——`src/help/helpFile.ts:164-175`（`const version = String(scene.version);` ＋ 空值即抛）。依据＝memo `helpFile.ts:179-181`（「从它的公开导出取，而不是在本模块写第四份副本」）。

### 2. 初始化状态怎么判 —— **只读探针，绝不建库；读失败照显**

**病灶（票 1 实测，本票复核成立）**：`packages/skill-chef/src/cli/cmd_read.ts:98-99`（`const dbPath = resolveDbPath(); const handle: ChefDb = openChefDb(dbPath);`）在**同一个 `dispatch()` 里**，而 help 分支在 `:327` ⇒ 说一句 help 就会走 `packages/skill-chef/src/fetch/db.ts:182`（`for (const ddl of DDL) db.exec(ddl);`）把库 DDL 自愈建出来；连目录都是 `src/fetch/paths.ts:21` 的 `mkdirSync` 建的。（**本票不修它**，归票 7。）

**记账口径（逐行读）**：bill `src/cli/cmd_read.ts:77-78` 逐字「全程**不开库**：初始化状态用「DB 文件是否存在」判定…免得「看帮助」把记账库 `new DatabaseSync` 出来并跑 DDL 自愈」＋ `:83-87` 的实现（`try { return existsSync(resolveDbPath()); } catch { return false; }`）；schedule `src/cli/cmd_read.ts:75`／`:83-86` 同（且自述照 bill）。

**chef 落地**：`src/help/helpFile.ts:127-129`（`chefHelpInitialized(dbPath)`：只 `existsSync` 一次，**异常 ⇒ `false`**＝横幅照显）＋ `:216-226`（`buildChefHelpDelivery` 里一次性调用；落点只做字符串拼接，不建目录）。

**证据（可复算）**：`test/help-file-214.test.mjs` 的 `#214 交付意图` 用例断言三件——`existsSync(dbPath) === false`（库没被建出来）、`existsSync(target.dir) === false`（落点目录没被建出来）、库目录里的条目**前后逐字一致**。另：本票生成留档实物时用的探针路径 `.scratch/chef-help/t214/` **至今不存在**（`Test-Path` 实测 `False`）。

**显隐开关**：`init_banner` **键常在**、显隐只走 `hidden`（不删字段 ⇒ payload 形状不随状态变）——口径见 bill `render/helpFile.ts:15-17`／`buildInitBanner:118-133`；chef 落点 `src/help/helpFile.ts:192-199`（`hidden: opts.initialized === true`），`closable: true` 照 bill／schedule 传。测试用例 `#214 初始化横幅` 断言两次调用的**键集逐字相同**、只有 `hidden` 翻转、`prompt` 取自资产里 `first_use` 那张卡的 `prompt_template`（单源）。

### 3. `subtitle` 与 `contact` —— `title` 照老家原文；两项取值照记账

**`title`（本票实际改动的值）**：老家产物 `<title>私家大厨 HELP · 能力速查</title>`——证据 `.scratch/chef-help/A1-legacy-chef-help-skeleton.md:340`（老产物结构实读）／`:398`（原文建议「`title` 可取页面 `<title>` 的私家大厨 HELP · 能力速查」），`docs/skills/skill-chef/t3-template-contract.md:244` 同；`composeDocTitle`（`packages/base-render/src/helpShell.ts:66-70`）判 `title` 含技能名 ⇒ 走「原样」支，标签页不重复。
⇒ **就地摆正**：`#213` 交付的是 t2 §七 草案值「私家大厨 · 能力速查」，本票改到生成器声明 `scripts/gen-help-assets.mjs:66` 并**重新生成** `src/help/sceneData.ts:181`；与草案的**有意偏离**在生成器的对账里写死（`:282-284`：仍逐字断言草案原值 ＋ 断言生成件「含技能名」），`test/scene-data.test.mjs:168` 的既有断言不受影响。

> ⚠️ **本段首版的理由写错了，已就地改正（审查席 B 实测）**：首版写「票面点名的值」——`gh issue view 214` 正文**无** `title`／`标题`／`取值` 字样、**0 条评论**，票面**没有**点名这个值。真正的授权链是：`t3-template-contract.md:244`（取值表）＋ `:718`（列为待定项）＋ `:501`（**明写「属票 6 第一／二步要报用户点头的范围」**）⇒ 这一项属本票的「5 项」之一，改在**声明处 ＋ 重新生成 ＋ 对账写死有意偏离**，范围没扩大、可回退。
> **如实保留的欠账**：`t3:501` 要求的那次**用户点头没有留档**（票面 0 评论、本报告也无记录）。⇒ 不另开一轮打扰，改由**肉眼终审时一并点给维护者看**（页面大标题与标签页都会显示这个值），并把本条写进关票评论。

**`subtitle`**：式子照记账 bill `src/render/helpFile.ts:102-106`（`〈域数〉 功能域 · 〈场景数〉 场景 · 版本 〈version〉 · 更新于 〈本地分钟〉`）；chef 落点 `src/help/helpFile.ts:180-183`，计数全部派生、不写死。实测值：`10 功能域 · 48 场景 · 版本 0.1.0 · 更新于 2026-09-12 14:30`。
**只数两级（域 ＋ 场景）的理由**：记账那一式同样只数它的两级（`WAKE_GROUPS` 一级域 ＋ `WAKE_ASSETS` 场景），二级层不进摘要行；chef 的 33 组正好是二级层（对应 bill 的 20 个 subgroups）。t3 `§10.2` 第 8 条把「10 功能域 · 48 场景」还是「10 功能域 · 33 组 · 48 场景」列为待定 ⇒ 本票取前者，理由如上，**这是本票的一处自决**。

⚠️ **共享层缺陷，如实登记**：A 路模板 `assets/help-template.html:1652` 有 `var SUBTITLE = HELP.subtitle || '';`，而全文 `SUBTITLE` **只出现 1 次**（＝声明处；本席亲自复算）⇒ **这一项写什么都看不见**。B 路 `src/help.ts:403` 的注释逐字把它记为缺陷（「`subtitle` 必须渲染，F3 读而不渲染属缺陷」）。本件按裁决 6 照记账取值，**不是**以「反正不渲染」为理由（照 `t236` §6.4 的连带修正）——缺陷留在共享层，本票**不改公共层**。

**`contact`**：老 chef 件**无对应物**（A2 §6.2 实测老载荷顶层只有 `meta/generated_at/wake_words/scenarios/aliases_expanded_count`；老页面是 `window.__HELP__` 血统）⇒ 照记账取值：bill `:46-53`／schedule `:52-59` 是同一份三项（邮箱／GitHub／Issues）＋ `copy_all: true`；chef 落点 `src/help/helpFile.ts:75-87`。A 路**真渲染**（`assets/help-template.html:1808-1820`；`it.url && value 以 http 开头` ⇒ `<a>`，见 `:1811`）。

### 路由方式的结论（票面 D 条）：**不补路由字段**

**权威**＝`packages/base-render/src/spec/help.ts`（其头注释 `:9` 逐字「`SCENE_DATA_SCHEMA` 是**唯一机读权威**」）：

- 顶层 `required` 只有 `skill_name`／`title`／`groups`（`:112`）；
- `scenes[]` 的 `properties` 只有 `id`／`title`／`wake_word`／`types`／`status`／`prompt_template`／`editable_fields` 七键，且 `additionalProperties: false`（`:151-189`）——**没有任何指向命令／CLI／路由的字段**；
- 四家兄弟的装配层同样一律不传（memo `src/help/helpFile.ts:96-107` 反而要**剥掉**资产侧的 `aliases`：①`ScenePayload` 只留闭集 7 键）。

**chef 侧「短语 → 命令」的路由另有其位**：`src/help/lookup.ts:28-36` 的 `buildHelpLookup()`（`WAKE_TABLE` 唯一上游）出的是**速查信封**数据（`phrase/key/shape/cli/desc`），与页面载荷无关；`sceneData.ts` 也没有 `lookupCall` 一类字段（实测：该文件只有 `CHEF_SCENES`／`buildChefSceneData` 两个导出）。⇒ **本票不补**，`groups` 直接引资产本体（`test` 断言 `payload.groups === CHEF_SCENES`，同一引用、不 clone）。

---

## 四、第四步 · 超线报警

**「已超线，需要根据规则进行重构。」**

| 件 | LF | 为什么超 | 这次的处置 |
|---|---|---|---|
| `scripts/gen-help-assets.mjs` | **436**（`#213` 交付时 420；本票改注释 ＋ 一个常量，净增 16） | 一个一次性生成器里塞了五件事：载荷读取／十域与组→域声明表／字段映射与清洗／三把 sha256 摘要锁与双向对账／`sceneData.ts` 的文本渲染 | **本次不拆**：拆它要动「事实源读取 → 断言 → 渲染」三段之间的共享状态与摘要锁，属 `#213` 那件交付物的重构，本票只碰两处注释与一个常量（净增 16 LF 是注释）；拆法＝`scripts/help-assets/{declarations,assertions,emit}.mjs` 三件（已写入 `packages/skill-chef/AGENTS.md` 的挂号表） |
| `src/cli/cmd_read.ts` | **388** | 一个文件装全部命令分派 ＋ argv 解析 ＋ envelope 打印 | **未碰**（归票 7；本票前后哈希一致） |
| `src/fetch/db.ts` | **451** | 建库 ＋ 迁移 ＋ 全部查询混在一处 | **未碰**（同上） |

**本票新件均在 350 以内**：`helpFile.ts` 226／`output.ts` 47／`index.ts` 6／`sceneData.ts` 185／`AGENTS.md` 23／`test/help-file-214.test.mjs` 135。

---

## 五、第五步 · 交付对账（**偏差为零**）

对账对象＝**票面的必做清单**（A1 解冻两半／B 三个新件 ＋ `index.ts` ＋ AGENTS.md／C 三条口径／D 路由确认）：

| 票面清单行 | 实际 | 偏差 |
|---|---|---|
| A1 · `SKILLS_BASE_FROZEN` 删 `'skill-chef'` ＋ 补理由段 | 数组实测已是 `['skill-home']`（他会话已摘并提交）；本票补上 `:49-54` 六行理由段（写明依据＝`#236` 裁决 ＋ 地图 `#208`），格式照 bill／schedule／memo 三段；**只改数组那一项周边 ＋ 追加自己那一段，未整篇覆盖** | 无（数组删除在开工前已生效，见 §六 第 1 条） |
| A2 · `package.json` 加 `"base-paint": "^0.3.0"` | 已加（35 LF，`dependencies` 两条） | 无 |
| B · `src/help/helpFile.ts`（`buildChefHelpFileData`＋`buildChefHelpDelivery`，形状照 memo `:158`／`:217`、schedule `:169`／`:232`） | 226 LF，4 导出，两个能力都在 | 无 |
| B · `src/help/output.ts`（`deliverChefHelp` → `{mode,path,bytes}`，形状照 memo `:115`／schedule `:71`；**必须调 `base-paint/save-html` 的 `saveHtmlFile`**） | 47 LF；`import { saveHtmlFile } from 'base-paint/save-html'`（`:24`）＋两态调用（`:41`／`:46`） | 无 |
| B · `src/help/index.ts` 加转发出口 | 2 → 6 LF | 无 |
| B · `packages/skill-chef/AGENTS.md` 新建（350 ＋ LF） | 23 LF，含口径出处 ＋ 三件超线挂号 | 无 |
| C1 · `version` 照记账口径、必要时就地摆正 | 值不变，出处＋注释摆正两处（§三·1） | 无 |
| C2 · 只读页不建库、读失败照显、显隐走 `hidden` 不删字段 | `chefHelpInitialized` 只 `existsSync`；`init_banner` 键常在、`hidden` 驱动；测试锁住「不建库」 | 无 |
| C3 · `title` 照老家原文；`subtitle`／`contact` 照记账取值；不以「不渲染」为理由 | `title` 已摆正到 `私家大厨 HELP · 能力速查`（生成器 ＋ 重新生成资产）；`subtitle` 照 bill 式子；`contact` 照 bill 三项；缺陷如实登记 | 无 |
| D · 路由字段要不要补（以 `spec/help.ts` 为权威） | 结论＝**不补**，证据见 §三·路由 | 无 |
| 产物 · 零 IO 出全页 HTML 字节 | 127,155 B／2,055 LF；同 `now` 两次渲染逐字节一致 | 无 |

**未接 CLI 出口、未碰 `saveHtmlFile` 本体**（票面明令）——`saveHtmlFile` 一行未改，本票只在 `output.ts` 里调它。

---

## 六、实测复核到的与既有记法不符处（如实登记，不美化）

1. **票面说「工作树现在是 `['skill-chef','skill-home']`，改完应是 `['skill-home']`」——实测已在 `['skill-home']`。** `tooling/check-boundaries.mjs` 在我开工前就是干净工作树（`git diff`／`git diff --cached` 均为空），数组在 `HEAD` 版就已如此，`SKILLS_BASE_FROZEN` 上一段 `:45-48` 还留着他会话的说明（「大厨图代摘 skill-chef…14:02 落盘…**善意越界**」）⇒ **票面的解冻二分之一已由他会话完成**，本票的动作只剩「照 bill／schedule／memo 先例补一段自己的理由」（已补在 `:49-54`）。连带：**`boundaries` 在开工前就已是 PASS**（票面记的「今天红一处：`FAIL: 未迁移技能源码不 import base-*（命中 …sceneData.ts）`」已过期，实测该行是 `OK: …（命中：无）`）。
2. **票面说 `pnpm snapshot:check` 红（预存）——实测绿**：`node tooling/write-snapshot.mjs --check` → `OK: 快照 == 实际拉取版（0.1.0@3505369be1e98cb6）`，exit 0。本票**未碰**那三个源（`ilife-skills/package.json`／`combos.yaml`／`present.ts`），故这是他会话已把工作树与快照对齐的结果，不是本票的功劳。
3. **数 LF 别用 PowerShell**：票面给的 `cmd_read.ts 388`／`db.ts 451` 用 node 数 `\n` 一致；但 `Get-Content -Raw` ＋ 正则数 `` `n `` 会得到 **372／449**（同一份文件两个数）。本报告一律用 `node -e` 数 `\n`（与 `AGENTS.md` 的 LF 口径同法）。
4. **`snapshot:html:check` 的两处差异确系他会话**：开工前读数＝`artifacts=186 changed=1 added=1 removed=0`，差异 `~ memo/keys` ＋ `+ memo/frag/memo.help.lookup`，指纹 `da0ec38d6ababe46944e9632473fdf93`；收工后**同一读数、同一指纹**（见 §七）。⇒ 本票对 186 件产物**零影响**。
5. **`tooling/test/skill-html-snapshot.test.mjs:57`／`:103-104`（白名单为空、chef 命令数／模板数＝8）：本票不新增命令／模板，未碰**。但**本席没跑 `pnpm gate:selftest:html`**（它要持锁包装器 `tooling/run-locked.mjs`，且会把门运行写进审计日志的 `gate-runs.log`）——如实记为**未跑**，替代读数＝`--check` 的 186 件产物与基线逐字相同（命令数／模板数是该文件从技能 dist 现算的，本票没动 `templates/` 与命令表）。
6. **`HelpShellData` 必填坑（`#236` §2.2 预警）实测成立**，另**多踩到一个 tsc 细节**：`Array.isArray(groups)` 会把 `readonly SceneGroup[]` **收窄成 `any[]`**，后续 `reduce` 回调参数因此隐式 `any`（TS7006 报 `m`／`sg` 两个参数），改成 `const groups: readonly SceneGroup[] = scene.groups;` 后过。⇒ 类型坑的预警之外，收窄副作用这条建议补进 `#236` 的记法。
7. **`t236` §1.2 B2 的落点措辞（`src/render/index.ts` 登记出口）本票没照做**：新件的公开出口登记在 `src/help/index.ts`（票面 B 段点名的落点），`src/index.ts:4` 的 `export *` 已让包根可及。两处都登记＝同一个出口两个定义地（铁律二）。⇒ 若维护者要的是 `render/index.ts` 那条，请回话，本票补一行转发即可（成本一行）。
8. **`first_use` 那张卡是「14 张待开发卡」之一，而它是初始化横幅 `prompt` 的单源**：`sceneData.ts:161` 的 `first_use` 带 `status: '【待开发】'`。⇒ 横幅文案指向的「首次使用」路径在新技能里当前**不可路由**。这不是本票的选择题（照 `t236` §零 基准 3「HELP 页是能力目录，不是可用性报告」＋票面要求「老 HELP 里有的内容都呈现出来」），但**用户点开横幅那条 prompt 会走到一张待开发的卡**，如实登记。
9. **A 路 `subtitle` 读了不渲染**（本席自算：`assets/help-template.html` 里 `SUBTITLE` 出现 **1 次**＝声明处）——缺陷留在共享层，本票未改公共层、也未把它当取值理由（见 §三·3）。

---

## 七、读数与复现命令（逐条实测，可复算）

```powershell
# 0 事实源与生成器（#213 的资产自检；本票改过生成器，必须复绿）
node packages/skill-chef/scripts/gen-help-assets.mjs --check
#   → OK：sceneData.ts 与生成结果字节一致（185 LF；--check 不落盘）        exit 0

# 1 逐包构建（禁仓级 tsc -b）
node node_modules/typescript/bin/tsc --build packages/skill-chef/tsconfig.json
#   → exit 0

# 2 包内测试（本票新件 ＋ 既有件）
node --test "packages/skill-chef/test/*.test.mjs"
#   → tests 41 / suites 5 / pass 41 / fail 0        （开工前基线：34 / 5 / 34 / 0）
#   → 其中本票新件：node --test packages/skill-chef/test/help-file-214.test.mjs
#       → tests 7 / pass 7 / fail 0
#       → 打印读数：「#214 读数：HTML 127155 B／2055 LF；载荷段 20775 B」

# 3 公共层测试（本票未改公共层，保险跑）
node --test "packages/base-render/test/*.test.mjs"
#   → tests 502 / suites 81 / pass 502 / fail 0

# 4 边界门（解冻的验收点）
node tooling/check-boundaries.mjs
#   → OK: 未迁移技能源码／模板不 import base-*（命中：无）
#   → boundaries: PASS        exit 0

# 5 产物快照门（HTML 逐件 sha256）
node tooling/skill-html-snapshot.mjs --check      # ＝ pnpm snapshot:html:check
#   → FAIL: 5 技能 HTML 快照差异 2 件（变化 1／新增 1／消失 0）
#      ~ memo/keys …   + memo/frag/memo.help.lookup …        ← 两件都在 memo，非本票
#   → RESULT: artifacts=186 changed=1 added=1 removed=0 base-* fingerprint=da0ec38d6ababe46944e9632473fdf93
#     （与开工前读数逐字相同 ⇒ 本票零影响；exit 1，红因＝他会话在飞的 memo 支）

# 6 快照门（版本／combos／present 三源）
node tooling/write-snapshot.mjs --check           # ＝ pnpm snapshot:check
#   → OK: 快照 == 实际拉取版（0.1.0@3505369be1e98cb6）        exit 0

# 7 渲染字节／LF／sha256（留档实物，gitignored）
node --input-type=module -e "import {writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {buildChefHelpDelivery} from './packages/skill-chef/dist/help/helpFile.js';const o=buildChefHelpDelivery('D:/ilife/.scratch/chef-help/t214/chef_data.db',new Date(2026,8,12,14,30,0));writeFileSync('.scratch/chef-help/t214-rendered-help.html',o.html,'utf8');console.log(JSON.stringify(o.target),Buffer.byteLength(o.html,'utf8'),(o.html.match(/\n/g)||[]).length,createHash('sha256').update(o.html,'utf8').digest('hex'));"
#   → {"dir":"D:\\ilife\\.scratch\\chef-help\\t214\\cook_html\\help","stem":"私家大厨_HELP"} 127155 2055 801b6c90af2187d4923e7289b31df3c65bcf7a83b4e61b61c43037501ce808b7
#   → 备注：探针只算落点、不建目录（.scratch/chef-help/t214 至今不存在）
```

**未碰件的前后哈希**（证明没污染别人的活）：`src/cli/cmd_read.ts` `044ec51f3954a341…`、`src/fetch/db.ts` `7f356d557ce44ae8…`、`src/policy/wakewords.ts` `ac18fb3c87039ac7…`、`src/render/index.ts` `32dd993f1516cfed…`、`SKILL.md` `1be06c703d707803…`——五件在本票开工前后**逐字一致**（`SKILL.md` 那份 `M` 是他会话的未提交改动，跑包内测试会重放一次幂等注入，哈希不变）。

**`git add`（显式路径，只加自己的）**：
`packages/skill-chef/package.json`、`packages/skill-chef/AGENTS.md`、`packages/skill-chef/src/help/helpFile.ts`、`packages/skill-chef/src/help/output.ts`、`packages/skill-chef/src/help/index.ts`、`packages/skill-chef/src/help/sceneData.ts`、`packages/skill-chef/scripts/gen-help-assets.mjs`、`packages/skill-chef/test/help-file-214.test.mjs`、`tooling/check-boundaries.mjs`、`docs/skills/skill-chef/t6-render-wiring.md`（本文件）。

---

## 八、编排方收工复核与一处连带整改（2026-09-12，本会话补记）

1. **编排方亲手复验本票读数，全部对得上**：`--check` **OK（185 LF）**；包内测试 **41/41**；`base-render` **505/505**（本票基线 502）；`boundaries` **PASS**；渲染产物 **127,155 B／2,055 LF** 且同 `now` 两次逐字节一致；页面级三项实测 `title=私家大厨 HELP · 能力速查`／`version=0.1.0`／`skill_name=私家大厨`；载荷 7 键 `skill_name,title,subtitle,contact,groups,version,init_banner`、`init_banner.hidden=false`（未初始化照显）。**另**：独立重跑编排方自己的探针渲染得 **126,497 B**（差 658 B＝探针自己的 `subtitle` 文案与 `contact:null` 不同），`parsed groups=10 cards=48` 且载荷 JSON 与传入对象 **byte-identical** ⇒ 注入层无丢字段。
2. **本票 `output.ts:41` 的调用点已随共用件整改改成 `file`**：`skill-chef/src/help/output.ts` 的 `explicit` 支从 `stem: basename(abs)` 改为 `file: basename(abs)`（共用件 #237 把「名字怎么给」与「撞名怎么办」拆成两个正交口子，`overwrite` 不再让 `stem` 兼作完整文件名）。行为不变（仍是 `join(dir, basename(abs))` 逐字落、仍覆盖写）。**本票的 `output.ts` 复算命令**：`node node_modules/typescript/bin/tsc --build packages/skill-chef/tsconfig.json` → exit 0；`node --test packages/skill-chef/test/*.test.mjs` → 41/41 绿。
3. **未核实项如实保留**：本票报的「`t236` §1.2 B2 未照做（出口登记落 `src/help/index.ts` 而非 `src/render/index.ts`）」**编排方接受**——两处都登记才是铁律二禁的「同一个出口两个定义地」；`src/index.ts` 的 `export *` 已让包根可及且有测试锁住。**不补** `render/index.ts`。
4. **回填 `#236` 的两条预警**（本票 §六 第 6／8 条）：`Array.isArray(readonly T[])` 会把类型收窄成 `any[]` 并触发 TS7006；`first_use` 那张待开发卡是初始化横幅 `prompt` 的单源（页面横幅会指向一张待开发的卡，属基准 3 的如实呈现，不是缺陷）。
5. **10 个域的 `icon` 判定＝**照老家**（emoji，不改）**：模板 `assets/help-template.html:1742-1746` 的 `tabIconHTML` 对 `icon` **本来就有两支合法输入**——命中 `SVG_ICONS` 出 SVG，不命中当 emoji 出（`<span class="t-emoji">`）。`groups[].icon` 的法源是 `domain.icon`（`t3-template-contract.md` §2.2），老家十份域文件逐字就是 emoji（`scenes\做菜.yaml:39 icon: "🍳"` 等十处，本会话已逐件核过）。`SVG_ICONS` 只有 **6 个** key，覆盖不了 10 个域；硬映射一张没权威出处的对照表＝语义降级 ＋ 违铁律二（概念唯一）⇒ **维持 emoji**，它走的是模板自己留的那一支，不是绕开模板。
6. **`title` 的授权链已就地改正**（见 §三·3 的改正框）：授权来自 `t3:244／:501／:718`「属票 6 的 5 项之一」，**不是**「票面点名」；`t3:501` 要求的那次用户点头**没有留档**，欠账如实登记、在肉眼终审时点给维护者。
7. **出口落点正本已就地改**：`t236-structure-design.md` 的 B2 行（`:100`）＋ 目录树（`:147`）＋ 就地摆正表（`:195`）＋ 交付对账（`:226`）四处都从 `src/render/index.ts` 改成 `src/help/index.ts`，并记明「首版写错、经编排方接受改判」——免得下一张照 B2 施工的票真造出第二定义地。
