# t1 对抗式审查（A：证据核对员）

审查对象：`docs/skills/skill-chef/t1-bill-recipe.md`（68,790 B／601 行，票 `#209`）。
审查方式：只读复核。逐条重跑存在性／尺寸／行号／计数，抽读源码原文，独立重跑跨包 import 搜索与运行时代码计数。未改任何源码，未跑仓级构建与测试，未访问网络。
实验件：`.scratch/chef-help/t1-review-A/recount.mjs`（只读计数脚本）。

## 判定

- **总分：7/10**
- **一句话结论：基本可信但有硬伤**——结论层（照抄件存在性、逐件行为、全部计数、私家大厨跑一次 help 命令就建库、落盘／命名管线消费者 2 家）我逐条独立复核后**几乎全部证实**；硬伤集中在「必须改的件」清单**漏 6 处**，另有 3 处引用／数字不实。
- **证伪条数：3**（另有 2 处行号偏差记入第四章「数字对账」）

## 一、逐项核对结果

### 核对组 1：每个「照抄」件真的存在、真的干那件事

| # | 报告的原话／结论 | 我的独立证据（命令＋输出／路径:行号） | 判定 | 影响 |
|---|---|---|---|---|
| 1 | 点名的一批 `packages/skill-bill/**` 件存在 | 我重跑 `Test-Path`＋`Get-Item`：`helpFile.ts`／`helpPaths.ts`／`output.ts`／`wake-assets.ts`／`gen-wake-assets.mjs`／`build-help.mjs`／`cmd_read.ts`／四份测试／`SKILL.md`／`package.json`／`render/index.ts`／`render/errors.ts`／`plugin-bill-ilife` 四件**全部 OK** | 证实 | 无 |
| 2 | 逐件字节／行数 | 我逐件重数：`helpFile.ts` 8958/182、`helpPaths.ts` 3488/55、`output.ts` 5037/86、`wake-assets.ts` 38556/986、`gen-wake-assets.mjs` 12837/254、`build-help.mjs` 2096/42、`cmd_read.ts` 30711/526、测试 8267/146・4410/72・9915/171・5366/93、`SKILL.md` 14639/126、`package.json` 948/36、`plugin-bill-ilife` 5079/128・2240/56・3098/49・5680/107 —— **与报告逐字相同，0 差异** | 证实 | 无 |
| 3 | `output.ts`：`wx` 独占 ＋ `EEXIST` 递增递补 ＋ 上限 1000 ＋ 绝对路径归一；`HtmlDelivery` 只有 `file` 一态 | `packages/skill-bill/src/output.ts:30`（正则 `/^(.*_\d{8}_\d{6})(?:_(\d+))?(\.[^.]+)$/`）、`:42-58`（`mkdirSync` → `writeFileSync(flag:'wx')`，仅 `EEXIST` 重试，超限抛）、`:61-65`、`:72-86`（`explicit` 覆盖写／`target` 独占／两处 `resolve()`）逐行读原文 | 证实 | 无 |
| 4 | `helpPaths.ts`：目录名常量、扩展名、速查支主体、时间戳通式、`_N` 缺省不带 | `helpPaths.ts:22`= `biscuit_accountant_html`、`:24`= `.html`、`:28`= `饼干记账_速查表`、`:31-38`（本地时区零填充、非法 Date 即抛）、`:41-49`（`n===undefined` 不带 `_N`）、`:53-55`（`join(resolve(dbDir), …)`）；`:15-17` 的「只出初候选」注释原样在 | 证实 | 无 |
| 5 | `helpFile.ts:19` 是 `import { renderHelpShellHtml } from 'base-paint/help-shell'` | 读 `helpFile.ts:19` 原文即此句；`:151-153` 一行 `return renderHelpShellHtml(data)` | 证实 | 无 |
| 6 | `bill.help.lookup` 在**开库之前**分派 | `cmd_read.ts:494` `const help = key === 'bill.help.lookup' ? dispatchHelp(params) : null;`（三元短路 ⇒ `dispatch` 不执行 ⇒ `:121` 的 `openBillDb` 不执行）；`:449-451` 是 `dispatch` 里的守卫（不可达）；`:503-510` 交付分支；`:522-523` 回执顶层追加；`dispatchHelp` 住 `:88-111`、`helpInitialized` 住 `:84-86`（`existsSync(resolveDbPath())`） | 证实 | 无 |
| 7 | 未把卡路里的专有做法当成 bill 的通用做法 | bill 三件（`output.ts`／`helpPaths.ts`／`helpFile.ts`）全文无 `chineseCommandFor`／`LEGACY_COMMAND_OVERRIDES`／`dynamicSegmentFor`／`writeSuffixFor`／`inline` 态；这些只在 `packages/skill-calorie/src/output.ts:58`／`:257`／`:272`／`:284`／`:189-191`（三态联合）／`:182`（只读类码表）。报告点名的卡路里行号**逐条命中**，未串味 | 证实 | 无 |
| 8 | bill `build-help.mjs` 有两处 chef 那份没有的东西（主入口守卫、换行保持）；chef `:17` 写死「8 联动」 | bill `scripts/build-help.mjs:21-26`（`isMainEntry`）、`:34-37`（`\r\n` 检出保持 eol）、`:42`（`if (isMainEntry)`）；chef `scripts/build-help.mjs` **无**主入口守卫（顶层直接 `writeFileSync`）、`:17` 字面「（8 联动」、`:26` 直接拼 `'\n'` | 证实（报告写 chef `:27`，实测拼 `'\n'` 在 `:26`，差 1 行） | 票 7 按行号找会看到 `writeFileSync`，不影响判断 |
| 9 | 四份 bill 测试文件的行数／用例数与用例名 | `help-delivery-144`：`describe`×4／`it`×9（:21／:47／:77／:134）；`help-file-145`：×1／×5；`help-exit-148`：`^test(` **恰 5** 条；`wake-assets`：`it`×6 —— 与 §5.2 逐条对得上；`:95` 确为 `assert.equal(readdirSync(db).filter((f) => f.endsWith('.db')).length, 0, '看帮助不建记账库')` | 证实 | 无 |
| 10 | bill `SKILL.md:112-120` 是「HELP 交付」节（六条） | 读原文：`:112` 节标题、`:114-115` 缺省即交付物＋完成标准、`:116` 速查表、`:117` 现找、`:118` `--html` 语义、`:119` 边界、`:120` 触发词总表；chef 的 `SKILL.md` 只有 `:29-73` 注入块、**无**该节 | 证实 | 无 |
| 11 | bill `package.json`：`base-paint ^0.3.0`／`files` 含 `SKILL.md`／有 `gen:wake-assets` | `packages/skill-bill/package.json:24-27`、`:16-20`、`:31-35`；chef `package.json:24-26` 只有 `base-link-core`、`scripts` 无资产生成器（`files` 的 `SKILL.md` 已由并发会话补上，与报告「复核时刻」记法一致） | 证实 | 无 |
| 12 | chef 现状：无 `src/output.ts`、无 `src/render/helpPaths.ts`、`SKILL.md` 无「HELP 交付」节；`files`／frontmatter 两处在取证时刻缺、复核时刻已补 | 我实测：`packages/skill-chef/src/output.ts`、`src/render/helpPaths.ts` 均 MISSING；`SKILL.md` 现 7756 B／78 行，`:1-4` 已有 `--- name: skill-chef / description …`，`:5` 才是 `# 私家大厨（chef）SKILL`；`git diff --stat` 显示该两件各 +4／+3 −1（并发会话在改） | 证实 | 无 |

### 核对组 2：私家大厨跑一次 help 命令就建库

| # | 报告的原话／结论 | 我的独立证据 | 判定 | 影响 |
|---|---|---|---|---|
| 13 | `probe-chef-default/chef_data.db` 是那一跑**新建**的（282,624 B） | `CreationTimeUtc`：目录 `2026-09-12T03:22:40.460Z`、库文件 `…:40.626Z`（晚 0.17 秒），目录内**只有**这一个文件，`LastWriteTimeUtc …:40.648Z`；`Length = 282624` —— 物证自洽，是这一跑新建的 | 证实 | 无 |
| 14 | 因：chef `dispatch` 第一行就 `openChefDb`（`cmd_read.ts:97-99`） | 读原文：`:97` 函数签名、`:98` `const dbPath = resolveDbPath();`、`:99` `const handle: ChefDb = openChefDb(dbPath);`；`fetch/db.ts:166-189` 的 `openChefDb` 用 `new DatabaseSync(dbPath)` ＋ `for (const ddl of DDL) db.exec(ddl)` ⇒ **文件由它建出来**；`fetch/paths.ts:21` 的 `mkdirSync` 在 `resolveDbPath` 里（目录先建） | 证实（「第一行」实为第二行，`openChefDb` 在 `:99`——报告两处都写了 `:99`，可用） | 无 |
| 15 | `chef.help.lookup` 是 `dispatch` 里的一个 `case`（`:327-331`） | 读原文 `:327` `case 'chef.help.lookup': {` … `:331` `}`，函数体只调 `buildHelpLookup()` ＋ `buildHelpItems()`，无落盘 | 证实 | 无 |
| 16 | bill 在 help 这条路上跑完不建库 | 代码：`helpInitialized()`（`:84-86`）用 `existsSync(resolveDbPath())`，`dispatchHelp` 不开库，`:494` 短路使 `dispatch` 不执行；物证：`probe-bill-default/` 下只有 `biscuit_accountant_html/饼干记账_HELP_20260912_112225.html`（129,990 B），`.db` 计数 0；`help-delivery-144.test.mjs:95` 锁住这一条 | 证实 | 无 |
| 17 | E3 输出摘要：stdout 是 37 条列表、无 `delivery`，stderr 有 `NOTE: 大厨 DB 已初始化` | 留档里**没有** `probe-chef-default.stdout.json`（只有物证库文件），该段无原始 stdout 可核；我用源码补证：`buildHelpItems(all, undefined)` 在 `q` 缺省时回全量 37 条、`main` 里无 `delivery` 拼装、`dispatch:101` 的 `if (handle.initialized) note('大厨 DB 已初始化：' + dbPath)` 与 `db.ts:183 h.initialized = !existed`（新建即 true）一致 | 报告结论**成立**，但那一段的**原始输出未留档**（证据缺口） | 低：结论另有源码支撑，票 4 可放心引用 |

### 核对组 3：「跨技能 import 实测 0 处」→ 消费者 2 家

| # | 报告的原话／结论 | 我的独立证据 | 判定 | 影响 |
|---|---|---|---|---|
| 18 | 跨技能 import 该管线 **0 处** | 我的搜索式①：441 个文件（`packages/`、`tooling/`、`test/`，排除 `node_modules`／`dist`）搜 `from\s+['"]skill-(bill\|calorie)` → **命中 1 处**：`packages/plugin-bill-ilife/test/skills-provider.test.mjs:13: import { WAKE_TABLE } from 'skill-bill/policy';`——这是**插件→技能**、且取的是口径层唤醒词表，**不是**落盘／命名管线。搜索式②：`require('skill-bill…`／`import('skill-bill…` → **0 处**。搜索式③：`output\.js'\|helpPaths` → 13 处，**全部落在各自包内**（bill 的 `cmd_read.ts:30`／`render/index.ts:17`／测试；calorie 的 `cmd_read.ts:96,118`／测试） | **结论证实**；但报告用的搜索式（`skill-calorie/src\|skill-bill/src` ＋ `from '.*output.js'\|helpPaths`）**看不见包名式 import**（如 `skill-bill/policy`），因此 E5 与自检 C 里「跨技能 import 命中 0 处」这句话按其原搜索式**不足以支撑**——我换成上面的搜索式才把这一条钉死 | 中：票 4 的裁量依据是对的，但若照抄报告那句「0 处」当证据，被追问时会站不住；建议票 4 引用我的搜索式与那 1 处命中 |
| 19 | 产物目录名常量只有两处（bill:22／calorie:20） | 全仓搜 `_html'` 得 `packages/skill-bill/src/render/helpPaths.ts:22`（`biscuit_accountant_html`）与 `packages/skill-calorie/src/render/helpPaths.ts:20`（`calorie_html`） | 证实 | 无 |
| 20 | 通用 help 模板的消费者今天 2 家（calorie、bill） | `Select-String -Path 'packages/*/package.json' -Pattern 'base-paint'` → 3 行：`base-render/package.json:2`（包名定义）、`skill-bill/package.json:26`、`skill-calorie/package.json:22`；`base-render/package.json:11` 有 `"./help-shell"` 子路径 | 证实 | 无 |
| 21 | `cook_html` 在本图尚无任何代码实现 | 全 `packages/` 搜 `cook_html\|CookHub` → **1 处命中**，是 `packages/skill-chef/src/fetch/paths.ts:2` 的一句注释（内容为 `CookHub`；`cook_html` 本身 0 命中） | 证实 | 无 |
| 22 | 居家那条线已到同一道门前（`t184-bill-recipe.md:27-28` 建议照抄 `helpPaths.ts`／`output.ts`；居家裁决票 `#187` 仍 OPEN、`#190` 被阻塞） | 文件侧证实：`docs/skills/skill-home/t184-bill-recipe.md:27-28` 原文确实是「照抄通式，换常量」「照抄」两行；但**两张 issue 的状态我核不了**（本审查不访问网络） | 文件内容：证实；issue 状态：无法判定 | 低：票 4 若要引用「#187 仍 OPEN」，请自行复核一次 |

### 核对组 4：「必须改 8 件」是否成立、有没有漏

| # | 报告的原话／结论 | 我的独立证据 | 判定 | 影响 |
|---|---|---|---|---|
| 23 | 结论摘要的「最少 5 件 ＋ 3 件收尾 ＝ 8 件」 | 5 件（资产／渲染接线／命名通式／独占落盘点／出口分派）与 3 件（真 spawn 锁／`SKILL.md` 节／插件侧最小装机）在 §2 表里都有对应行；但 §2 表自己标为**必改**的 `tooling/check-boundaries.mjs`（一行数组）与 `packages/skill-chef/package.json`（依赖闭包／`files`／`scripts`）**不在摘要这 8 件里**，且未移出 `SKILLS_BASE_FROZEN` 会直接 `FAIL`（`tooling/check-boundaries.mjs:39-44`、`:56-60`） | **部分成立**：件不缺，但摘要的「8 件」读起来像全集，实为下界 | 中：只读摘要的票 6／7 会漏掉边界门与依赖闭包，先撞门再返工 |
| 24 | 「chef 今天没有 exit 5 的落盘失败路径」 | 反例：`packages/skill-chef/src/cli/cmd_read.ts:372-377` 就是 `--html` 落盘分支，`catch { fail(5, 'HTML 写盘失败：' + o.html) }`；另有 `ChefRenderError → fail(5)`（`:381`） | **证伪**（详见第二章第 1 条） | 中：票 7 照此会以为退出码映射要从零加 |
| 25 | 逐件「真的必须改吗」——有没有过度改动 | 逐件追了一遍：`check-boundaries.mjs`（不移出名单必红，实测名单 `:37` 含 `skill-chef`）、`package.json`（不闭包就 import 不到）、`SKILL.md` 节（说明面与行为对不上）、`build-help.mjs` 两处补正（chef 那份**无主入口守卫**＝import 即改 `SKILL.md`，属结构纪律「就地摆正」）——**没找到「不必改却写必改」的件** | 证实（无过度改动） | 无 |
| 26 | 有没有漏掉的件 | 我拿 `skill-bill` 与 `skill-chef` 做了一次结构对照（`src/`／`scripts/`／`test/`／`templates/` 全量列文件），发现 6 处漏件 | **证伪（漏件）**（详见第三章） | 高：其中 1 条会让票 7 的验收用例当场红 |

### 核对组 5：票面覆盖

| # | 票面 `t1-body.md` 的问 | 报告是否作答 | 判定 |
|---|---|---|---|
| 27 | 起点八件逐件读懂（`helpFile.ts`／`helpPaths.ts`／`output.ts`／`wake-assets.ts`＋生成器／`cmd_read.ts` 分派／#148 用例＋#144・#145・#146 提交／`SKILL.md` 节／插件侧提供方） | 八件全部有「它干什么＋照抄／改／不抄＋理由」的行（§2 表），提交侧另有 E6 表 | 有答案 |
| 28 | 产出「逐件一行」的照抄清单 | §2 表（20 行）＋§2.1 补充八条 | 有答案（**但缺 §三列出的 6 件**） |
| 29 | 「哪些件不要」（例：卡路里特有的命令名→中文段落映射与动态段） | §2 表 4 行「不抄」＋自检④逐条点名 | 有答案 |
| 30 | 专门记下 #147 的三条合流触发点 | §4.2 逐字引原文（与 `.scratch/chef-help/t1/issue-147-body.md:35-39` 一致），§4.3 给了「第 1 条是否命中」的实测 | 有答案 |
| 31 | 本票不出决定（命名落盘管线归属留给票 4） | 报告头第 6 行与 §6.2 明写，§4.4 只摆三条路的代价 | 有答案 |
| 32 | 产出落 `docs/skills/skill-chef/t1-bill-recipe.md` | 文件在位（68,790 B／601 行，无 BOM） | 有答案 |

**票面覆盖：漏答 0 问**（缺的是清单里的件，不是票面的问）。

### 其它抽查（报告引用的外部文档与门）

| # | 报告的原话／结论 | 我的独立证据 | 判定 |
|---|---|---|---|
| 33 | §4.1 的 #147 原文引用（「45 行左右」「排除 (a) 三条理由」「排除 (c)」「两个坑」） | `issue-147-body.md:23`（45 行左右）、`:21`／`:22`／`:23`（排除 a 三条）、`:27`（排除 c）、`:62-63`（两个坑：不过 `assertWritablePath` 的 tmp 哨兵／不写固定名镜像 Q10=A）逐字对上 | 证实 |
| 34 | §4.4 Q7 说明页的行号与推荐 | `决策待确认-Q7-管线归属.html:174-183`（甲）／`:185-195`（乙）／`:197-206`（丙）／`:191`（「边界门解冻只需改一个数组一行＋补一条注释」）／`:210`（「为什么我原来推丙、现在改推乙」）逐条命中 | 证实 |
| 35 | §6.1-7：改缺省产物「应当不红」`check-publish`（报告自认未跑） | 我读了该门的断言生成段：`tooling/check-publish.mjs:203-213` 只要求 `exit 0`＋回执 JSON＋`env.key===key`＋`env.data` 非空＋`shape` 是字符串，随后 `readViaCli` 非空；`dsh-chef` 的契约命令是 `chef.help.lookup --params {}`（`:63`）——换成「缺省落 HELP 文件」后这几条仍成立 | 报告的「应当不红」**成立**（比报告自己给的把握更强） |
| 36 | 地图／票面行号（`map-chef-body.md:28`／`:30`／`:31`／`:36`／`:92`；`t4-body.md:10`／`:14-17`／`:19`／`:21`） | 逐条 Read：`:28`（`$.scenarios[].domain` 只覆盖 13/48）、`:30`（老通式与 `_N` 从 1 起步）、`:31`（`cook_html/help` 已定案）、`:36`（字段名两代不兼容）、`:92`（速查支命名待裁）、t4 `:10`（三条触发点＋第 1 条已命中）、`:14-17`（缺省出口口径）、`:19`（老通式＋`check-publish:63`）、`:21`（combo 登记） | 证实 |
| 37 | §5.3 与 §2 里 `help-exit-148.test.mjs` 的行号（`:14` 四常量 import、`:17` `BIN`、`:18` `NODE_BIN`、`:25` `envOf`、`:27-32` `run`、`:34` 串行注释、`:35-46` `runAsync`、`:48-54` `runOk`、`:6` 只经真 spawn、`:95-97` 逐字断言、`:123-129` 同秒槽位） | 逐条 Read 该文件，**全部命中**（我一开始用 `Get-Content` 复核得到 4 行左右偏移，是**本机 pwsh 默认编码吃行**造成的假象；换 `read` 工具复核后报告无误——见第五章提示） | 证实 |

## 二、证伪与硬伤（最重要的一节）

### 1. 「chef 今天没有 exit 5 的落盘失败路径」——假

- **报告说什么**（§5.4 第 ⑤ 行）：「退出码口径 chefs 与 bill 同源（0／1／2／3／4／5，`packages/skill-chef/src/cli/cmd_read.ts:35-38` 同一套 `fail()`）；**但 chef 今天没有 exit 5 的落盘失败路径**，这一格要新加。」
- **实际是什么**：chef 的 `--html` 落盘失败**已经**走 exit 5。
- **反例证据**：`packages/skill-chef/src/cli/cmd_read.ts:372-377`
  `if (o.html) { const html = renderEnvelopeHtml(env); assertHtmlSize(html); try { writeFileSync(o.html, html, 'utf8'); } catch (e) { fail(5, 'HTML 写盘失败：' + o.html); } }`；另 `:381` `if (e instanceof ChefRenderError) fail(5, '渲染失败：' + e.message);`。
  chef 真正**没有**的是「按通式算落点、独占落盘」这条路（因为它今天根本不落 HELP 文件），不是「exit 5 落盘失败」这一格。
- **会误导谁**：票 7（`#215` 出口与命名落盘）。照抄这句会把退出码映射当成「从零新加」，甚至可能在 `--html` 分支上再叠一层映射，把已有的 `ERR 5` 语义改掉；而 bill 的对照口径（`cmd_read.ts:511-521`：`BillRenderError → 5`、`/^E[A-Z]+$/` 的 errno → 5）在 chef 侧**已有对应物**。

### 2. 「地图正文（`map-chef-body.md:31`）…都写着『三家今天其实早就在跑同一套动作，只是各抄了一份』」——引用不实

- **报告说什么**（§4.3 最后一条）：「地图正文（`map-chef-body.md:31`）与 Q7 说明页（`…Q7-管线归属.html:167`）都写着『三家今天其实早就在跑同一套动作，只是各抄了一份』」。
- **实际是什么**：这句话只在 Q7 说明页 `:167`。`map-chef-body.md:31` 是「本次落盘位置已改判」那一段（讲 `cook_html/help` 与 `calorie_html`／`biscuit_accountant_html`／`home_manager_html`／`memo_html`／`schedule_html` 同形），**没有**「三家／同一套动作／各抄了一份」这些字。
- **反例证据**：`Select-String -Path 'docs/skills/skill-chef/map-chef-body.md' -Pattern '三家|同一套动作|各抄了一份'` → 只命中 `:167`，内容是用户原话「你说的 搬到公共区让三家共用 我感兴趣…」；`决策待确认-Q7-管线归属.html:167` 命中原文「说白了：**三家今天其实早就在跑同一套动作，只是各抄了一份。**」。
- **会误导谁**：票 4（`#212`）。这份报告的主要价值之一就是「用代码纠正文档」——但它把「文档说过三家」的账记到了地图正文头上。票 4 若按此去地图里找原话会找不到，且可能误判「地图正文本身已断言三家」，从而对「纠正文档」的范围判断失真（真正过时的是说明页那句，加上 t4 票面 `:8` 的「已经是第三、四处在做同一件事」）。

### 3. 自检②／E1 的算术与留档不符——「42 条存在」「唯二 MISSING」两处都不对

- **报告说什么**：§E1「全部 44 条里唯二 `MISSING`：`packages/plugin-chef/src/skill-provider.ts`…与 `packages/skill-chef/src/output.ts`」；自检②「逐条 `Test-Path`（E1，44 条）…结果（取证时刻）：**42 条存在**」。
- **实际是什么**：留档 `.scratch/chef-help/t1/Test-Path-results.txt` 共 **44 行**，其中 **43 行 OK、1 行 MISSING**（只有 `packages/plugin-chef/src/skill-provider.ts`）；`packages/skill-chef/src/output.ts` 与 `src/render/helpPaths.ts` **都不在那 44 条里**（0 命中）。
- **反例证据**：`(Get-Content …).Count = 44`；`Where-Object { $_ -match ' OK ' }` = **43**；`-match 'MISSING'` = **1**；`-match 'skill-chef/src/output\.ts'` = **0**。
- **会误导谁**：全体下游的信任成本。**注意：这条是账目错，不是结论错**——我实测 `packages/skill-chef/src/output.ts` 与 `src/render/helpPaths.ts` 今天确实都不存在（`Test-Path` = False），报告「chef 今天一个消费者都不是」的判断成立。但自检②被报告称为「照抄清单里的每个仓内路径都真实存在」的机械验收点，这个点现在算错了，等于验收点失效。

### 附：两处轻微偏差（不算独立证伪条，记在数字对账）

- chef `scripts/build-help.mjs` 拼 `'\n'` 的行号：报告写 `:27`，实测在 `:26`（`:27` 是 `writeFileSync`）。
- §4.1 写 `tooling/check-boundaries.mjs:28-56`「专门为 base-* 变更影响面立了断言」；实际这段是 `:30-60`（`SKILLS_BASE_FROZEN` 在 `:37`，依赖闭包断言 `:39-44`，源码／模板扫描 `:45-60`）。这条报告是从 #147 原文转述（原文写「第 30–56 行」），偏差不大。

## 三、漏件（报告没提但下游会踩的）

我用 `skill-bill` 与 `skill-chef` 的结构对照（`src/`、`scripts/`、`test/`、`templates/` 全量列文件）＋「bill 在 #144／#145 那两张票里到底动了哪些文件」（`git show --stat bfc51bf f312f88`）找出的 6 处：

| # | 漏掉的件 | 证据 | 谁会被带偏 |
|---|---|---|---|
| 1 | **`packages/skill-chef/test/cli.test.mjs` 要改** | chef 现有 `test/cli.test.mjs:59-61`：`const all = run(['chef.help.lookup']); … assert.equal(JSON.parse(all.stdout).data.total, 37)`。缺省一改成 bill 的模型（域级索引：`data.total` = 域数 10，另加顶层 `delivery`，实测 bill 侧 `data.total = 7`），这一例**必红**。bill 的 #144 提交里就带了这一件：`git show --stat bfc51bf` → `packages/skill-bill/test/cli.test.mjs \| 8 +-` | **票 7（最重）**：验收用例会红，且报告 §5 只讲了「要新加哪些锁」，没讲「要修哪条既有锁」 |
| 2 | **`packages/skill-chef/src/render/errors.ts` 要动** | chef 的 `ChefRenderError.code` 联合只有 6 格（`:2-4`：`CHEF_UNKNOWN_KEY`／`CHEF_BAD_PAYLOAD`／`CHEF_SHAPE_MISMATCH`／`CHEF_TEMPLATE_MISSING`／`CHEF_MARKER_INVALID`／`CHEF_HTML_TOO_LARGE`），**没有** help 缺数据这一类。bill 侧对应物是 `packages/skill-bill/src/render/errors.ts:2-5` 里的 `BILL_HELP_MISSING_DATA`（`helpFile.ts:92`／`:119`／`:135` 三处抛）。照抄 `helpFile.ts` 必然要在这个联合里加一格，否则 TS 编译不过 | 票 6：写渲染接线时才发现要改类型面，且 §1.8 只在正文描述了 bill 那份，§2 清单没有 chef 侧这一行 |
| 3 | **`packages/skill-chef/src/render/index.ts` 要动** | chef 的 `render/index.ts` 现在 7 行（`:1-7`），转发表里没有 help 渲染件／命名件；bill 的 `render/index.ts:8-17` 正是为这两件加的转发（`#145` 提交里 `render/index.ts \| 5 +`，`#144` 又 `7 +-`） | 票 6：新增件「从哪儿出」没写，容易出现 CLI 直接摸内部件（与铁律一的判据不合） |
| 4 | **`pnpm-lock.yaml` ＋ `pnpm install` 建 junction** | `git show --stat f312f88` → `pnpm-lock.yaml \| 3 +`；实测 `packages/skill-chef/node_modules` 今天**只有** `base-link-core` 一个 junction（`packages/skill-bill/node_modules` 有 `base-paint` → `packages/base-render`）。只往 `package.json` 加依赖不装，`import 'base-paint/help-shell'` 解析不到 | 票 6：改完依赖直接 `tsc -b` 会报模块找不到，多一轮排查 |
| 5 | **`_N` 起步值的口径冲突没记** | 报告 §2 让「时间戳与通式（`helpPaths.ts:31-49`）逐字照抄」，即 bill 语义：首个冲突是 `_2`（`output.ts:33` `n = m[2] ?? 1; … String(n+1)`；`help-delivery-144` 用例名也写「从 `_2` 起」）。而地图 `map-chef-body.md:30` 与票面 `t4-body.md:19` 都把「老通式 **`_N` 从 1 起步**、绝不覆盖」列为要带上桌的既有事实，地图 `:31`／`:170` 并写「**文件名主体与通式不变**」。报告只记了「落点两段」这一处形状差异，还写「这是与 bill 形状不同的**唯一一处**」 | **票 4／票 7**：照抄 bill = `_2` 起步，与老家口径与「通式不变」的定案对不上；这是维护者肉眼终审会看见的那类差异，报告本该把它摆到桌上（可以不下结论） |
| 6 | **`packages/skill-bill/test/help-file-145.test.mjs`（72 行）没进 §2 的照抄清单** | 该文件只在 §5.1／§5.2 出现；§2「逐件一行」表里没有它，§5.4「私家大厨也必须有的锁」表里也没有独立一行（它锁的是：全页 HTML、5 键取值、三块可选键、`init_banner` 状态驱动、同一 `now` 可复现＋坏 Date 即抛） | 票 6：这份是本图渲染接线的**唯一模块级锁**，不列出来容易被写成「§5 那些都是出口锁」 |

**没找到的**：报告没有把「不必改的件」写成「必改」（无过度改动）；`packages/skill-chef/templates/help.html`（266 B／16 行，标题「现找」）、`tooling/skill-html-snapshot.mjs:45`（chef 条目）与 `tooling/skill-html.snapshot.json`（`chef/frag/` 8 条＋`chef/tpl/` 8 条，与报告 E6-4 的记法一致）这几处报告的处理都对。

## 四、数字对账（报告的数 vs 我数出来的数）

| 项 | 报告 | 实测 | 差异 |
|---|---|---|---|
| bill 十三件字节／行数 | 8958/182、3488/55、5037/86、38556/986、12837/254、2096/42、30711/526、8267/146、4410/72、9915/171、5366/93、14639/126、948/36 | 逐件相同 | **0** |
| `plugin-bill-ilife` 四件 | 5079/128、2240/56、3098/49、5680/107 | 逐件相同 | **0** |
| 资产计数（bill） | 7 域／20 组／74 场景；`write 3/16`・`query 3/17`・`analysis 7/25`・`goal 2/4`・`account 1/4`・`link 1/2`・`setup 3/6`；4 条 HELP 唤醒词 | 用 `node .scratch/chef-help/t1-review-A/recount.mjs` 跑构建产物：`WAKE_GROUPS 7 / WAKE_ASSETS 74 / SCENE_BY_ID 74`，七个域逐条相同，`HELP_WAKE_WORDS ["饼干记账 HELP","饼干记账帮助","查帮助","能做什么"]` | **0** |
| 资产计数（chef） | 37 条；`help.lookup 4`／`view 7`／`search 8`／`write 4`／`cooking.run 4`／`shopping.query 4`／`history.record 3`／`history.query 3`；4 条 HELP 短语 | 同一脚本：`WAKE_TABLE 37`，分组计数逐条相同，短语 `["私家大厨HELP","菜谱HELP","查帮助","能做什么"]` | **0** |
| E2 产物 | 129,990 B；`groups=7 scenes=74`；`meta=help_summary,help_wake_words`；`subtitle=7 功能域 · 74 场景 · 版本 2.0 · 更新于 2026-09-12 11:22`；顶层 8 键；`version 2.0`／`skill_name 饼干记账`／`contact 3` | 直接解析留档 HTML：`bytes 129990`，其余逐项相同 | **0** |
| E3 物证 | `chef_data.db` 282,624 B、那一跑新建 | 282,624 B；`CreationTimeUtc 03:22:40.626Z`（目录 `…:40.460Z`）；目录内唯一文件 | **0** |
| E1／自检② | 「44 条里**唯二** MISSING」「**42 条存在**」 | 留档 44 行 = **43 OK ＋ 1 MISSING**；`skill-chef/src/output.ts` **不在**那 44 条里 | **对不上（2 处）**：OK 数 42 vs 43；MISSING 数 2 vs 1，且第二个路径不在留档 |
| E5／自检C | 「跨技能 import 命中 0 处」 | `from 'skill-(bill\|calorie)` → **1 处**（`plugin-bill-ilife/test/skills-provider.test.mjs:13`，插件→技能、口径层表）；管线件 import 跨包 = 0 | 数字一致（该 1 处不属该管线），但**报告搜索式盖不住包名式 import** |
| E6 提交表 `#145` | 落了 `helpFile.ts`＋`render/index.ts`＋`render/errors.ts`＋`package.json`＋base-render 三件＋`check-boundaries.mjs` | `git show --stat f312f88` 另有 **`pnpm-lock.yaml`（3+）** 与 **`packages/skill-bill/test/help-file-145.test.mjs`（72+）** 未列 | **少 2 件** |
| E6 提交表 `#144` | `output.ts`＋`helpPaths.ts`＋`cmd_read.ts`＋`help-delivery-144`＋`cli.test.mjs` | `git show --stat bfc51bf` 另有 **`src/render/helpFile.ts`（29+）**、**`src/render/index.ts`（7+-）** 未列 | **少 2 件** |
| chef `build-help.mjs` 拼 `'\n'` 的行号 | `:27` | `:26` | 差 1 行 |
| §4.1 `check-boundaries.mjs` 断言段 | `:28-56` | `:30-60`（`SKILLS_BASE_FROZEN` `:37`、闭包 `:39-44`、扫描 `:45-60`） | 差 2–4 行（转述自 #147 的「30–56」） |
| 报告本体 | 68,790 B／601 行 | 68,790 B／601 行（首 3 字节 `35 32 116`，**无 BOM**） | **0** |

## 五、无法判定的项（说明为什么）

1. **E3 那一次 chef 真跑的 stdout／stderr 没有留档**（证据目录里只有 `chef_data.db`，没有 `probe-chef-default.stdout.json`，而 bill 那次有）。报告的「只回 37 条列表、无 `delivery`」「stderr 有 `NOTE: 大厨 DB 已初始化`」两句无法从留档核对；我用源码（`buildHelpItems(all, undefined)`、`main` 无 `delivery` 拼装、`dispatch:101` 的 `note()`）判断结论成立，但「未留原始输出」这件事本身是证据缺口。
2. **票面与地图引用的 issue 状态**（居家 `#187` 仍 OPEN、`#190` 被阻塞、`#184` CLOSED）。本审查不访问网络，核不了 `gh` 侧状态；`docs/skills/skill-home/t184-bill-recipe.md:27-28` 的文件内容我核了，属实。
3. **#147 说的「发布态本来就缺 `./help-shell`」**：仓内 `packages/base-render/package.json:11` 有这个子路径，工作区 linking 也在；「发布态」（npm 上已发的 0.3.0）缺不缺，离线核不了。对本图无影响（报告自己也说本机 junction 不受影响）。
4. **`pnpm snapshot:html:check` 会不会被误伤**：报告如实声明未跑，我也未跑（只读审查＋工作树有并发改动）。可说的只有：本图只新增 HELP 产物、不动 `packages/skill-chef/templates/*.html` 与 `src/render/*` 的话，快照清单里 chef 那 8 条 `frag`／8 条 `tpl` 记录不受影响。
5. **老厨 HELP 载荷的字段（10 键 vs 6 键、`type` vs `types`）与 10 域逐条归属**：报告已归票 2／票 3／票 5，本审查同样无权定案。
6. **给后来复核者的工具提示（不是报告的错，是我踩过的坑）**：本机 `pwsh` 的 `Get-Content` 对含中文的 UTF-8 文件会**默认按本地编码解码并吃掉换行**，行号会整体偏移 2–4 行（我一开始据此误判了 `help-exit-148.test.mjs` 的行号，换 `read` 工具／`Select-String` 复核后与报告一致）。复核行号请用 `read` 工具或 `Select-String`，不要用 `Get-Content` 计数。

## 六、给下游票（4／6／7／10）的修正提示

**票 4（`#212` 命名落盘管线的归属）**

- 按报告 §4.3「跨技能 import 0 处」当唯一依据会被带偏：该结论成立，但报告给的搜索式（`skill-calorie/src|skill-bill/src`）**看不见包名式 import**；实际存在 1 处插件→技能的 `from 'skill-bill/policy'`（`plugin-bill-ilife/test/skills-provider.test.mjs:13`），不属落盘／命名管线。引用时请用「管线件的跨包 import = 0」这个说法，别用「跨技能 import = 0」。
- 按报告「地图正文 :31 说三家」会被带偏：那句话只在 Q7 说明页 `:167`；地图正文里没有。真正需要纠正的是说明页那句与 t4 票面 `:8` 的「已经是第三、四处在做同一件事」。
- 报告没有把 **`_N` 起步值**（老口径 `_1` vs bill `_2`）摆上桌，而这是票面 `t4-body.md:19` 自己点名要带的事实、地图 `:31`／`:170` 又写「通式不变」——请自行补一张对照再裁。

**票 6（渲染接线）**

- 按报告 §2 表会被带偏：它漏了 `packages/skill-chef/src/render/errors.ts`（`code` 联合要加 help 缺数据这一格，否则照抄 `helpFile.ts` 编译不过）与 `packages/skill-chef/src/render/index.ts`（新件的转发出处）。
- 依赖闭包加 `base-paint` 之后，还要 `pnpm install` 建 junction（`packages/skill-chef/node_modules` 今天只有 `base-link-core`）＋`pnpm-lock.yaml` 会变；bill 那一次就是 `f312f88` 里带的。
- 别漏 `packages/skill-bill/test/help-file-145.test.mjs`（72 行，5 例）——那是渲染接线唯一的模块级锁。

**票 7（出口与命名落盘）**

- 按报告 §5.4 第 ⑤ 行会被带偏：**chef 已经有 exit 5 的落盘失败路径**（`packages/skill-chef/src/cli/cmd_read.ts:376` 的 `--html` 写失败、`:381` 的渲染失败），要加的不是「exit 5 这一格」，而是「按通式算落点＋独占落盘」这条路。
- 报告没提**既有用例会红**：`packages/skill-chef/test/cli.test.mjs:59-61` 断言缺省 `data.total === 37`；bill 的 `#144` 就同步改了 `test/cli.test.mjs`（`git show --stat bfc51bf`）。缺省一改，这一例必须一起改。
- 报告没提 `_N` 起步值冲突（见上）；`check-publish` 那条门我核过断言（`tooling/check-publish.mjs:203-213`：只要 exit 0 ＋ 回执 `key`／`data`／`shape`），改缺省产物仍会绿——这一点报告猜对了，可以放心。

**票 10（插件侧装机）**

- 报告「取证时刻 `plugin-chef/src/skill-provider.ts` 不存在、复核时刻已由并发会话建出（5,074 B／125 行）」两句都对；`packages/plugin-chef/test/smoke.test.mjs:50-70` 今天已在用 `chef.help.lookup` 并断言 `shape === 'list'`、`data.total >= 1`，且自带 tmp `SKILLS_DB_PATH`——缺省改成落盘后**这一例仍会绿**（前提是保持 `shape: 'list'`、`data` 非空），不必按报告「照抄清单」再排一遍活。
