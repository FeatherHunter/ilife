# t1 调查：饼干记账 HELP 交付实现逐件读懂 → 私家大厨照抄清单

> **2026-09-12 第二轮修补（编排方直改）**：本报告经两轮整改后由 `t1-verify.md` 验证——B 席 6 条硬伤**全部真落地**，但 A 席那半张账基本未处理、并新引入 5 条矛盾。本轮按验证判决逐条补齐：A 席证伪 3 条（exit 5 假句／引用不实／43-1 账目）＋ A 席漏件 6 条（新增 §10.4）＋ 新引入矛盾 5 条（§8.4／§8.3 引用、`TYPE_DEFAULT` 10 键改正、表格裸竖线、「另有两处」→三处）＋ 摘要「8 件」标注为下界。

> 票：`#209`（地图 `#208`「私家大厨HELP真标准」票 1，research）。
> 只读调查：**未改任何 `packages/` 下文件**、未改 `SKILL.md`、未 `git add`／`git commit`／`git checkout`／`git stash`、未跑仓级 `pnpm build`／`pnpm test`／`pnpm snapshot:*`、未访问网络。
> 事实出处一律「仓内路径:行号」或「命令 ＋ 输出」。写法照 `docs/agents/wording.md`（写「help 模板」，不写「壳」；`bill.help.lookup` 这类叫「命令」，不叫「键」）。
> 本票**不出决定**：命名落盘管线的归属（自持一份 vs 收成共用位）是票 4（`#212`）的事，本报告只摆事实与代价、**不选**。
> ⚠️ **取证时刻与工作树漂移**：本报告的行数／字节数／`Test-Path` 结果取自**本会话的实测时刻**（实测输出里带时间戳，见 §11.2 产物名 `饼干记账_HELP_20260912_112225.html`）。工作树里**有别的会话正在并发改 `skill-chef`**（`git status` 实测：`packages/skill-chef/SKILL.md`、`packages/skill-chef/package.json` 已改，`packages/skill-chef/scripts/add-frontmatter-218.mjs`、`packages/plugin-chef/src/skill-provider.ts`、`packages/plugin-chef/src/dsh-ctx.ts` 等为新增未跟踪）——即票 10（`#218`）的活**已经在别人手里开工了**。凡与这些并发改动相关的结论，本报告在改动前后各记一次（见 §2.1 第 7／8 条与 §8 的自检②）。

---

## 整改记录（本报告第二版 · 按对抗式审查就地修补）

> 本报告初版经对抗式审查判定 **6.5/10、硬伤 6 条**（审查报告：`docs/skills/skill-chef/t1-review-B.md`，38,897 字节；判定原文见该文件第 11-20 行）。本节逐条对号记下第二版补了什么、改了什么、以及**哪一条审查结论被复核推翻**。
> **A 席审查报告 `docs/skills/skill-chef/t1-review-A.md` 未就位**（`Test-Path` 实测 `False`，截至本次整改时刻该文件不存在）——**A 席发现未纳入本次整改**。若其后落地，其发现需另起一轮增补。
> 仍然只改本文件；未改任何 `packages/` 下文件、未动 GitHub、未 `git add`／`commit`／`checkout`／`stash`、未联网、未跑仓级 `pnpm build`／`pnpm test`、未跑 `chef-cmd-read`（该命令会建库）。本次新增的实测证据落 `.scratch/chef-help/t1/`（清单见 §11.8）。

| 硬伤（`t1-review-B.md`） | 第二版怎么修 |
|---|---|
| 1 · 新增三件在 chef 侧住哪个目录没定 | 新增 **§三「chef 侧建议落点（不定案）」**：`helpFile`／`helpPaths`／落盘件（＝审查席说的 `output` 那个角色，本图仓内三件都还不存在）逐件给候选落点与代价，并单列「为什么不落 `src/render/` 与 `src/triggers/`」；**不下结论**（定案属「结构设计闸门票」） |
| 2 · 三层中间层无事实源、无归属 | 新增 **§2.2「三层机械换算表」**：`10 域＝groups`／`33 组＝subgroups`／`48 场景＝scenes`，表体**引用审查席算好的 33→10 换算**（`t1-review-B.md:54`，注明出处），并补本席复核（逐组按 `html.template` 目录名机械归属，**33/33 与审查席一致、10 域合计 48**） |
| 3 · 告警线口径与落点零命中、超线两件未当场报 | 新增 **§五「告警线 ＋ 必报五步」**：口径 **350 ＋ LF**；落点 `packages/skill-chef/AGENTS.md`（实测**今天不存在**，`packages/` 下 `AGENTS.md` 计数＝0）；两件当场报**「已超线，需要根据规则进行重构。」**（`src/cli/cmd_read.ts` LF=388、`src/fetch/db.ts` LF=451） |
| 4 · 必报五步整节缺席 | 同上 §五后半节：逐票写明票 5／6／7 的第一步（影响清单）／第二步（结构设计）先报用户点头、交付报第五步（交付对账），并抄上「一行里出现两个能力名要写理由」的判据 |
| 5 · 字段换算没落到件，且两处字段名写错 | 新增 **§四「字段两代换算」**：8 行映射表（详见该节），**以 `packages/base-render/assets/help-template.html:1658-1682` 的契约注释与归一化代码为唯一权威**；并就地改掉初版照抄地图正文的 `scenario_title→name`／`scenario_id→key` 两处错写（§2.1 第 6 条处留了一行改正注记） |
| 6 · 门没报全 | 新增 **§六「门」**：必绿／会红（`tooling/test/skill-html-snapshot.test.mjs:103-104` 是**硬编码数字**，机制见该节）／装插件前必须先跑（`test/client-bundle-48.test.mjs`，依据 `B2:389` 的教训）／`snapshot:html:check` 实测绿（`changed=0`，185 件产物） |

**初版 §6.1 第 4 条原写「`pnpm snapshot:html:check` 应当绿（我没跑）」——本席已实测复核：`node tooling/skill-html-snapshot.mjs --check` → `OK: 5 技能 HTML 快照 == 实际（185 件产物）`，`changed=0 added=0 removed=0`。** 该条由「应当绿（未跑）」升为「实测绿」，见 §六。另初版 `§6.1` 第 6 条原写「本票没有核实 `wake-assets.ts` 那 6 个字段是否够装老厨的 10 键」——本席已按模板归一化代码实测换算并落到 §四，该不确定项关闭。

**被本席复核推翻、不予采纳的一条**：审查报告第四节漏项第 6 条（及第六节最小整改清单第 6 条）称「**票 7 票面里的落点与地图正文冲突**，须在票 7 开工前改票面」。**本席复核判定该条不成立**：GitHub 上 `#215` 的**现行正文**写的是 `cook_html/help/`，与地图 `Decisions`（`map-chef-body.md:31`）一致；**陈旧的只是本地 `docs/skills/skill-chef/t7-body.md:5` 这一份副本**（副本内容停在 `CookHub/help/`）。因此：

- 本报告**不采纳**「票 7 票面需改」这条整改项，也不在正文里照抄它；
- 但**保留**一条对下游有用的提醒：本仓 `docs/skills/skill-chef/t*-body.md` 是票面的**本地副本**，与 GitHub 现行正文可能漂移；**票 7 实施者若要核落点，以 GitHub `#215` 现行正文与地图 `Decisions` 为准，不以本地副本为准**——这条由 §2.1 第 9 条承接。

以上六条之外，本次另补三处审查报告点到的漏项：**`html`／`result`／`variants` 三个字段的归属**（§2.3）、**「内容不丢」总账**（§2.3 末）、**§2.1 第 6 条那两处字段名的就地改正**。章节编号因新增 §三（chef 侧建议落点）／§四（字段两代换算）／§五（告警线＋必报五步）／§六（门）而**整体后移两位**，且原 §三／§四／§五／§六／§七的**小节号一并跟着章号改**（避免「两个 4.1」「两个 5.1」）：原 §三 命令分派与出口 → **§七**（3.1-3.4 → 7.1-7.4）；原 §四 #147 裁决 → **§八**（4.1-4.4 → 8.1-8.4）；原 §五 bill 的锁 → **§九**（5.1-5.4 → 9.1-9.4）；原 §六 不确定项 → **§十**（6.1-6.3 → 10.1-10.3）；原 §七 证据目录 → **§十一**（E1-E7 → 11.1-11.7，另加 11.8）。§2.1／§2.2／§2.3 与「自检」节的编号未动。

---

## 结论摘要

1. **私家大厨要复刻这条交付线，最少 5 件**（顺序照 bill 的票序）：①内容资产（typed const ＋生成器）②渲染接线（资产＋派生 → `base-paint/help-shell`，零 IO）③命名与落点通式（零 IO，只出初候选）④独占落盘点（`wx` ＋ `EEXIST` 递补 ＋ 绝对路径回执）⑤出口分派（`chef.help.lookup` 在**开库之前**走专用分支）。再加 3 件收尾：真 spawn 锁、`SKILL.md`「HELP 交付」节、插件侧最小装机。
2. **最省事的走法是「照抄 bill 的三件通用件、换常量」**，但这条走法今天有一个硬冲突：新架构规则（`docs/agents/structure.md` 铁律一）明写「把对方那份抄一遍放进自己目录，不算走了接口」，而 `#147` 自己写下的**合流触发点第 1 条＝出现第三个消费者**——落盘／命名这份管线的消费者今天恰是 2 家（卡路里、记账），私家大厨一来即第 3 家，**第 1 条命中**。所以 (b) 对本图不再自然适用，这正是票 4 要裁的。
3. **最大的坑不是抄哪一份，是「抄了以后还得摆正三处 chef 现状」**：①`chef.help.lookup` 现在**在开库之后**分派（`packages/skill-chef/src/cli/cmd_read.ts:97-99` → `dispatch` 第一行 `openChefDb`），实测跑一次就会把 `chef_data.db`（282,624 B）建出来；②chef 包的 `SKILL.md` **没有 frontmatter**、`package.json` 的 `files` **不含 `SKILL.md`**——这两处会让插件侧「真机可见」静默失败（bill 已踩过，见 `#150`；**取证后已被并发会话补上**，见 §2.1 第 8 条）；③`tooling/check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN` 名单里还有 `skill-chef`，一 import `base-paint` 就红。
4. **不能照抄的是卡路里的产物模型**：`chineseCommandFor`（命令名→中文段落映射）、`LEGACY_COMMAND_OVERRIDES`、`DYNAMIC_COMMAND_SEGMENTS`／`dynamicSegmentFor`、`writeSuffixFor`、三态 `HtmlDelivery`（含只读回退 `inline` 态）、`resolveReceiptHtmlPath`。bill 有意一件都没搬（`packages/skill-bill/src/output.ts:1-22` 写明），私家大厨同理。

---

## 一、bill 交付线逐件解剖

行数／字节数一律实测，命令：

```powershell
cd D:\ilife
foreach ($f in @(<文件列表>)) {
  $b = (Get-Item $f).Length
  $lf = ([regex]::Matches([IO.File]::ReadAllText($f), "`n")).Count
  "{0,-62} bytes={1,-8} LF={2}" -f $f, $b, $lf
}
```

原始输出留档：`.scratch/chef-help/t1/Test-Path-results.txt`。下面「行数」＝ LF 计数（`\n` 出现次数）。

### 1.1 `packages/skill-bill/src/render/helpFile.ts` — 8,958 B ／ 182 行

**它干什么**：内容资产 ＋ 派生 → 全量 HELP JSON → 通用 help 模板全页 HTML。**零 IO、零落盘**（:3 写明「落点与写盘全在 CLI 交付管线」）。

**导出（签名级）**：

| 导出 | 签名 | 干什么 |
|---|---|---|
| `HELP_FILE_STEM` | `'饼干记账_HELP' as const`（:24） | 文件名主体，接线层写死 |
| `HELP_FILE_SKILL_NAME` / `HELP_FILE_TITLE` / `HELP_FILE_VERSION` | `'饼干记账'` / `'饼干记账 · 使用手册(HELP)'` / `'2.0'`（:26／:27／:29） | 5 键头 ＋ 技能数据世代版本 |
| `HELP_INIT_SCENE_ID` | `'setup_init_wizard'`（:31） | 首次使用横幅 prompt 的来源场景 id |
| `HELP_CONTACT` | `HelpContact`（:46-53） | 联系作者三项（邮箱／GitHub／Issues）＋ `copy_all:true` |
| `formatHelpMinute(now: Date)` | `=> string`（:90-97） | `%Y-%m-%d %H:%M`，非法 Date 即抛 |
| `deriveSummaryLine(now?)` | `=> string`（:100-103） | `7 功能域 · 74 场景 · 版本 2.0 · 更新于 …`，**计数与版本全派生** |
| `buildMetaBlocks(summaryLine)` | `=> readonly HelpMetaBlock[]`（:106-111） | 两块：`help_summary`（＝同一条 summaryLine）／`help_wake_words` |
| `buildInitBanner(initialized)` | `=> HelpInitBanner`（:115-130） | 五键 ＋ `hidden`；prompt 取自 `SCENE_BY_ID[HELP_INIT_SCENE_ID]`，**缺位即抛**（:118-121） |
| `buildHelpFileData(now?, opts?)` | `=> HelpFileData`（:133-148） | 纯函数，空资产即抛（:134-136） |
| `renderHelpFileHtml(data)` | `=> string`（:151-153） | **一行**：`return renderHelpShellHtml(data)` |
| `buildHelpIndex()` | `=> HelpIndex`（:172-181） | 域级索引（`items/total/sceneTotal/subgroupTotal`），计数全派生 |

**关键分支／行号**：`import { renderHelpShellHtml } from 'base-paint/help-shell'`（:19）；三块可选键的取舍写在模块头 :11-17（`version` 是**技能数据世代**不是 npm 包版本；`init_banner` 键常在、显隐走 `hidden`）；`HelpFileData` 接口 :73-82；失败码 `BILL_HELP_MISSING_DATA`（:92／:119／:135）。

### 1.2 `packages/skill-bill/src/render/helpPaths.ts` — 3,488 B ／ 55 行

**它干什么**：命名与落点的**初候选**（零 IO，不建目录、不写盘）。归属裁决在模块头 :3-6 逐字记着（走 (b) 自持一份最小管线）。

**导出**：`HELP_HTML_DIR_NAME = 'biscuit_accountant_html'`（:22）、`HELP_HTML_EXT = '.html'`（:24）、`LOOKUP_FILE_STEM = '饼干记账_速查表'`（:28）、`formatHelpStamp(now)`（:31-38，本地时区零填充，非法 Date 即抛）、`buildHelpFileName(stem, date, n?)`（:41-49）、`resolveStemTarget(dbDir, stem, now)`（:53-55，`join(resolve(dbDir), 'biscuit_accountant_html', …)`）。

**关键分支**：:15-17 的注释写死「只出初候选，最终名由 `output.ts:writeFileExclusiveWithRetry` 的 `wx` 独占＋`EEXIST` 递补仲裁——判存与写入之间无独占性，check-then-write 并发同秒必交叉覆盖（#128 的因果）」；`n` 缺省＝不带 `_N`（:46-48）。

### 1.3 `packages/skill-bill/src/output.ts` — 5,037 B ／ 86 行

**它干什么**：HTML 产物的**唯一落盘点**。

**导出**：`nextExclusiveCandidate(currentAbs)`（:27-39，正则 `/^(.*_\d{8}_\d{6})(?:_(\d+))?(\.[^.]+)$/`，无 `_N` 则 `_2`）、`writeFileExclusiveWithRetry(initialAbs, html)`（:42-58，`mkdirSync(recursive)` → `writeFileSync(flag:'wx')`；**仅** `EEXIST` 递增重试，上限 1000 次后抛）、`HtmlDelivery` 接口（:61-65，**只有 `file` 一态**）、`deliverHtml({explicit?, target?, html})`（:72-86，`explicit` → 覆盖写 `w`；`target` → 独占＋递补；`resolve()` 归一为绝对路径）。

**关键取舍（:1-22 头注释，逐条是花钱买来的）**：`#128` 的因果（`readdirSync` 计数选名 ＋ `w` 覆盖两步之间无独占性）；`#83` 返修 R-1（回执必须 `resolve()` 成绝对路径，因为 `SKILLS_DB_PATH` 本身可以是相对路径）；**不引入**卡路里的只读回退（`EACCES`／`EROFS` → inline）——「写不进去就是真失败，应当 exit 5」。

### 1.4 `packages/skill-bill/src/triggers/wake-assets.ts` — 38,556 B ／ 986 行（**生成物**）

**它干什么**：内容资产 typed const，三层「域 → 二级组 → 场景」。

**导出**：`WakeSceneType`（:28，5 个词 `采集／查看／选择／向导／回执`）、`WakeSceneAsset`／`WakeSubgroupAsset`／`WakeGroupAsset` 三个接口（:30-52）、`WAKE_GROUPS`（:55-965，**7 域／20 二级组／74 场景**）、`WAKE_ASSETS`（:968-970，扁平派生）、`SCENE_BY_ID`（:973-975）、`WAKE_ASSET_TOTAL`（:978，派生）、`HELP_WAKE_WORDS`（:984-986，**从口径层 `WAKE_TABLE` 派生**，不落第二份字面量）。

实测（命令见 §11.4）：

```
WAKE_GROUPS 7 / WAKE_ASSETS 74 / SCENE_BY_ID keys 74
HELP_WAKE_WORDS ["饼干记账 HELP","饼干记账帮助","查帮助","能做什么"]
domains write/写入/3sub/16sc | query/查询/3sub/17sc | analysis/分析/7sub/25sc |
        goal/目标/2sub/4sc | account/账户/1sub/4sc | link/联动/1sub/2sc | setup/开始使用/3sub/6sc
```

**关键**：:8-10 写死「本文件由生成器机器生成，**禁止手工改词**」；:12-18 记三处「非纯搬运」（新增 3 条场景／`status` 全空／`types` 沿用老词）。

### 1.5 `packages/skill-bill/scripts/gen-wake-assets.mjs` — 12,837 B ／ 254 行

**它干什么**：读仓外事实源 → 逐字 `JSON.stringify` → 落盘。**一次性入口，不进 build／test 管线**（:5）。

**关键函数**：`readPayload(src)`（:87-96，只认 `<script id="help-data" type="application/json">` 锚点，缺锚点／未闭合即 fail-closed）、`assertShape(groups)`（:99-118，数量／字段／id 唯一／`types` 在老词表内／`status` 全场同一取值）、`withAddedScenes(groups)`（:121-133，3 条新增接在对应二级组**末尾**）、`renderFile(groups)`（:136-222，「头 ＋ JSON 中段 ＋ 尾」）。常量：`DEFAULT_SRC`（:25，仓外老实物 HTML）、`EXPECT = {groups:7, subgroups:20, scenes:71, uniqueWakeWords:70}`（:30）、`ADDED_SCENES`（:34-84）。CLI：`--check` 只比对（:243-249，不一致 exit 1）。

### 1.6 `packages/skill-bill/scripts/build-help.mjs` — 2,096 B ／ 42 行

**它干什么**：构建期把唤醒词速查块注入 `SKILL.md` 的 `<!-- HELP-AUTO-START/END -->` 标记块内，其余不动。导出 `START`／`END`（:9-10）、`buildHelpBlock()`（:12-19）、`injectHelpBlock()`（:28-40）。**两处细节是 chef 那份没有的**：主入口守卫 `isMainEntry`（:22-26，import 无副作用，便于单测）＋**换行保持**（:34-37，`text.includes('\r\n')` 决定 eol，只重写标记块）。

### 1.7 `packages/skill-bill/src/cli/cmd_read.ts` — 30,711 B ／ 526 行

**它干什么**：唯一出口。HELP 那一块住在 :69-111（`DeliverIntent` :79／`HelpDispatch` :80／`helpInitialized()` :84-86／`dispatchHelp()` :88-111），路由在 :493-495，交付在 :503-510，回执顶层追加在 :522-523。详见 §七。

### 1.8 `packages/skill-bill/src/render/index.ts`（1,368 B ／ 17 行）＋ `src/render/errors.ts`（389 B ／ 11 行）

`index.ts` :8-17 把上面两份模块的导出统一转发（渲染接线件与命名件都从这里出）；`errors.ts` 的 `BillRenderError.code` 联合类型 :2-5 里有 `BILL_HELP_MISSING_DATA`。`cmd_read.ts` 的异常映射 :511-521（`BillRenderError` → exit 5；`/^E[A-Z]+$/` 的 errno → exit 5 落盘失败）。

### 1.9 `packages/skill-bill/package.json` — 948 B ／ 36 行

`dependencies` 有 `base-paint: ^0.3.0`（与 kcal 同版本线）；`scripts` 有 `gen:wake-assets`；`files` 是 `["dist","SKILL.md","templates/*.html"]`（**`SKILL.md` 是 `#150` 补进去的**，见 §8.3）。

### 1.10 `packages/skill-bill/SKILL.md` — 14,639 B ／ 126 行

:112-120 是「HELP 交付」节（六条），:26-110 是构建期注入的联动速查块，:3 是 frontmatter `description`（77 条唤醒词逐条入内）。逐条摘录在 §7.3。

### 1.11 三份锁 ＋ 一份资产锁（见 §九）

### 1.12 插件侧 `packages/plugin-bill-ilife/src/skill-provider.ts` — 5,079 B ／ 128 行

**它干什么**：打包技能提供方。导出 `PROVIDER_NAME='dsh-bill-ilife'`（:22）／`SKILL_NAME='skill-bill'`（:25）／`BUNDLED_SKILL_RANK=600`（:28）／`SKILL_FILE='SKILL.md'`（:30）／`skillDir()`（:33-36，`createRequire.resolve('skill-bill/package.json')` 再拼 `SKILL.md`，**不复制**）／`skillFile()`（:38-40）／`parseSkillText(text)`（:49-70，最小 frontmatter 解析，缺头／缺字段返 null）／`provider`（:124-128，`list` 给摘要、`get` 给全文）。配套还有 `src/dsh-ctx.ts`（2,240 B ／ 56 行，宿主 skills 面的 type-only 镜像）、`src/index.ts`（3,098 B ／ 49 行，`inject:['skills']` ＋ 注册 ＋ 重名退让）、`test/skills-provider.test.mjs`（5,680 B ／ 107 行，6 例）。

---

## 二、私家大厨照抄清单（逐件一行）

> ⚠️ **摘要里的「必须改 8 件」是下界，不是全量**：它**不含**同属必改的 `tooling/check-boundaries.mjs`（移出 `SKILLS_BASE_FROZEN`）与 `packages/skill-chef/package.json`（加 `base-paint` 依赖）——只会读摘要的人会**先撞边界门**。以本章表格为准。

| bill 的件 | 干什么 | 私家大厨：照抄／改／不抄 | 理由（或要改什么） |
|---|---|---|---|
| `packages/skill-bill/src/render/helpFile.ts`（182 行） | 资产＋派生 → 全量 HELP JSON → 通用 help 模板全页（零 IO） | **改**（形状照抄，常量与文案全换） | 接线做法与派生做法照抄（:19 的 import；:100-103／:106-111／:172-181 的派生）。必换：`HELP_FILE_STEM`＝`私家大厨_HELP`、`HELP_FILE_SKILL_NAME`＝`私家大厨`、`HELP_FILE_TITLE`、`HELP_FILE_VERSION`（语义是技能数据世代，chef 有没有这个数要票 3／6 定）、`HELP_INIT_SCENE_ID`、`HELP_CONTACT` 三项、`buildInitBanner` 的标题／副标题／按钮文案。**另**：`groups` 类型要接 chef 自己的 10 域／33 组／48 场景资产 |
| `packages/skill-bill/src/render/helpPaths.ts`（55 行） | 命名与落点通式（零 IO，只出初候选） | **改**（通式照抄，常量与目录层级换） | `HELP_HTML_DIR_NAME` 要换成 `cook_html/help`（**两段**，bill 是一段 `biscuit_accountant_html`）；文件名主体换 `私家大厨_HELP`；时间戳与通式（:31-49）逐字照抄。`LOOKUP_FILE_STEM`（:28）是 bill 自造的速查支名字（老家没有这一支），chef 要不要分名、叫什么是票 4 的事 |
| `packages/skill-bill/src/output.ts`（86 行） | 唯一落盘点：`wx` 独占 ＋ `EEXIST` 递补 ＋ 绝对路径回执；`explicit` 覆盖写 | **不抄，或另裁**（这一件就是票 4 的核心） | 语义要一模一样，但**归属未定**：`#147` 的合流触发点第 1 条已命中（消费者将达 3 家），铁律一又禁止「把对方那份抄一遍放进自己目录」。三条路与代价见 §8.4。**注意 `#147` 原文说这份只需「45 行左右」** |
| `packages/skill-bill/src/triggers/wake-assets.ts`（986 行，生成物） | 内容资产 typed const（7 域／20 组／74 场景）＋派生表 | **改＋换落点** | 派生段照抄（:968-970／:973-975／:978／:984-986）。**内容全换**（归票 5）。落点 `src/triggers/` 是**工种名**，不合铁律四；且该目录早于 `docs/agents/structure.md` 立规——chef 侧应落 HELP 域目录下（票 6 结构设计定） |
| `packages/skill-bill/scripts/gen-wake-assets.mjs`（254 行） | 读仓外事实源 → 逐字序列化 → 落盘；`--check` | **改**（做法照抄，读取段重写） | 照抄：`--check` 分支（:243-249）、形状断言（:99-118）、新增条目段（:34-84）、`renderFile` 三段式（:136-222）、用法注释。**要重写**：bill 的事实源是老实物 HTML 的 `<script id="help-data">` payload（:25-31）；chef 老家的事实源是 `references/scenarios.yaml` ＋ `templates/` 目录名（地图 Notes 的地面真相），读取与形状断言都得重写；chef 的期望形状是老骨架 10 域／33 组／48 场景（不再是 bill 的 7／20／71） |
| `packages/skill-bill/scripts/build-help.mjs`（42 行） | 构建期把唤醒词速查块注入 `SKILL.md` 标记块 | **改**（chef 已有同形件，补两处） | `packages/skill-chef/scripts/build-help.mjs`（1,452 B ／ 28 行）已在：缺的是①**主入口守卫**（bill :22-26）②**换行保持**（bill :34-37；chef :27 直接拼 `'\n'`）。另 chef :17 把「8 联动」写死（同数字两份拷贝，铁律二）——票 7 已点名列进本次必动 |
| `packages/skill-bill/src/cli/cmd_read.ts` 的 :69-111 ＋ :493-510 ＋ :522-523（526 行里的关键段） | 出口分派：三支分支、开库前分派、交付、回执顶层追加 | **改**（这一段形状必须照抄，chef 现状相反） | chef 现状：`chef.help.lookup` 是 `dispatch` 里的一个 `case`（`packages/skill-chef/src/cli/cmd_read.ts:327-331`），而 `dispatch` 第一行就 `openChefDb`（:97-99）→ 实测**跑一次就把 `chef_data.db`（282,624 B）建出来**。照 bill 的做法要把 HELP 分支抬到 `main` 里、`dispatch` 之外 |
| `packages/skill-bill/SKILL.md` 的 :112-120（126 行里的这一节） | 说明面「HELP 交付」节 | **改**（结构照抄，文字全换） | chef 的 `SKILL.md` 已有联动速查注入块，**没有**「HELP 交付」节。另：取证时刻 chef 的 `SKILL.md:1` 是 `# 私家大厨（chef）SKILL`（**没有 YAML 头**），而插件提供方要求 frontmatter；**复核时刻已由并发会话补上 `name:`／`description:`**（见 2.1 第 8 条），票 10 的那处断链已不成立 |
| `packages/skill-bill/test/help-delivery-144.test.mjs`（146 行） | 模块级锁：命名通式／独占递补／`explicit` 覆盖／端到端冒烟／失败 exit 5 | **改**（用例形状照抄，常量与计数换） | 九例清单见 §九；其中「不建库」一例（:95）chef 今天**必然红**，是本次要摆正的行为 |
| `packages/skill-bill/test/help-exit-148.test.mjs`（171 行） | 真 spawn 出口锁五例 | **改**（用例形状照抄，常量与计数换） | 从 `base-paint/help-shell` 直接取 `HELP_SHELL_PREFIX/SUFFIX/DATA_OPEN/TITLE_SLOT` 做逐字断言（:14／:95-97）；并发必须用异步 `spawn`（:35-46，注释写明 `spawnSync` 会把并发串成串行）；:123-129 只断言「同秒各次占不同槽位且必有一次拿本体名」，**不**把进程调度当契约。归票 8 |
| `packages/skill-bill/test/wake-assets.test.mjs`（93 行） | 资产锁：三层计数／域顺序／字段／老条目摘要锁／与口径层双向对账 | **改**（锁法照抄，数字换） | 摘要锁（:14／:50-55）比逐字抄一份更耐改；双向对账（:68-84）——chef 要对着自己的 37 条唤醒词／8 条命令做。归票 5 |
| `packages/skill-bill/package.json` 的 `dependencies.base-paint` ＋ `files` ＋ `scripts` | 依赖闭包加 `base-paint`；`files` 带 `SKILL.md`；`gen:wake-assets` 脚本 | **改（三处都得动）** | chef 今天 `dependencies` 只有 `base-link-core`，`files` 是 `["dist","templates/*.html"]`（**缺 `SKILL.md`**），`scripts` 有 `build`／`test`、没有资产生成器脚本。包名与目录名不同：目录 `base-render`／包名 `base-paint` |
| `tooling/check-boundaries.mjs:37` | `SKILLS_BASE_FROZEN` 名单 | **必改（一行）** | `skill-chef` 在名单里（:37），一 import `base-paint` 就被两道断言拦下（:39-44 依赖闭包、:45-60 扫源码）。`#145` 对 bill 就是这么做的，:34-36 有先例注释 |
| `packages/plugin-bill-ilife/src/skill-provider.ts`（128 行）＋ `src/dsh-ctx.ts`（56 行）＋ `src/index.ts`（49 行）＋ `test/skills-provider.test.mjs`（107 行） | 插件侧最小装机：按包名解析单份 `SKILL.md`／rank 600／`inject:['skills']`／重名退让 | **改**（照抄，chef 侧当时缺件；现已由并发会话开工） | **取证时刻**：`packages/plugin-chef/src/skill-provider.ts` **不存在（经查）**；`plugin-chef/src/` 只有 `bridge.ts`／`client.ts`／`index.ts`／`settings.ts`／`slot.ts`，无 `dsh-ctx.ts`。**复核时刻**：该目录已出现 `skill-provider.ts`（5,074 B）／`dsh-ctx.ts`（2,281 B）／`test/skills-provider.test.mjs`，即票 10（`#218`）正被并发会话实施——chef 侧照抄这份的工作不必重复派 |
| `packages/skill-calorie/src/output.ts`（386 行） | 卡路里那一套：`chineseCommandFor`（:58）／`htmlFileName`（:88）／`LEGACY_COMMAND_OVERRIDES`（:257）／`dynamicSegmentFor`（:272）／`writeSuffixFor`（:284）／回执落点（:239）／三态 `HtmlDelivery`（:189）／只读回退（:184） | **不抄** | 这是卡路里自己的产物模型，与「明确拿到文件」的目的地无关。bill 一件都没搬，理由写在 `packages/skill-bill/src/output.ts:3-6` 与 `helpPaths.ts:4-6`（逐字：「calorie 的 `key→中文command`／`LEGACY_COMMAND_OVERRIDES`／动态段／内容标识段一律不搬」）。**本票重点核对的「不能照抄」就是这一行** |
| `packages/skill-calorie/src/render/helpPaths.ts`（63 行） | 卡路里版命名与落点（`calorie_html`／`卡路里_HELP`／`SHEET_FILE_STEM`） | **不抄** | 与 bill 版是同一件事的两份实现；chef 要抄就抄 bill 那份（更窄、且已有 CLI 级锁）。**它的存在本身就是票 4 的输入**（说明这份管线今天已有 2 个消费者） |
| `packages/skill-calorie/src/render/helpShell.ts`（31 行） | 卡路里侧的转发件（转发到 `base-paint/help-shell`） | **不抄** | 多一层转发＝铁律五判据里的「白占一层」。bill 的做法是直连公共层出口 |
| `packages/skill-calorie/src/render/helpCenter.ts`（485 行）／`helpFile.ts`（73 行） | 卡路里的 HELP 中心页与渲染接线 | **不抄** | 卡路里是三态交付（`mode:"file\|inline\|text"`，`packages/skill-calorie/src/cli/cmd_read.ts:15`），chef 的目的地只要 `file` 一态 |
| `packages/base-render/src/helpShell.ts`（83 行）＋ `assets/help-template.html`（106,968 B）＋ `scripts/gen-help-shell.cjs`（301 行） | 通用 help 模板的出口与真相源 | **不抄、不改，只 import** | 直连 `renderHelpShellHtml(data)`。**生成物禁手改**：改模板要改 `gen-help-shell.cjs` 再跑 `pnpm --filter base-paint gen:help-shell`，手改会被 `gen:help-shell:check` 判红（`#145` 已踩过） |
| `packages/skill-chef/templates/help.html` | chef 自带的「现找」页模板 | **不抄、不要** | 归宿与 bill 的 `templates/*.html` 一样：那是 `--html` 收据页那一支用的，不是 HELP 全页。chef 今天 `templates/help.html` 的标题是「现找」——若票 4 定「速查支走显式参数」，这一支的模板语义要跟着对齐 |

### 2.1 对每一条「改」的补充说明

1. **落点目录是两段不是一段**（`helpPaths.ts` 那条）：`#147` 与 bill 的落点是 `<SKILLS_DB_PATH>/biscuit_accountant_html/`（一段），而本图已定案的是 `<SKILLS_DB_PATH>/cook_html/help/`（**两段**，`docs/skills/skill-chef/map-chef-body.md:31`／:170 用户原话）。照抄时 `HELP_HTML_DIR_NAME` 这一个常量不够用，要么拆成两个常量、要么把「子目录相对路径」做成一个入参。这是与 bill **形状不同的唯一一处**落点差异。
2. **`resolveStemTarget` 的 `resolve(dbDir)` 要保留**：bill 在 `helpPaths.ts:54` 与 `output.ts:75／:83` 三处 `resolve()` 归一——因为 `SKILLS_DB_PATH` 本身可以是相对路径（`#83` 返修 R-1 的学费）。
3. **`HELP_FILE_VERSION` 那一格 chef 未必有**：bill 的 `'2.0'` 是**技能数据世代**（bill 的 `init-status` 自述「v2.0 特征 deleted_at」），不是 npm 包版本 `0.1.0`。chef 有没有同名概念，本票无仓内依据，归票 3（取值调查）／票 6。
4. **`buildInitBanner` 的「缺位即抛」要保留**：bill :118-121 对 `SCENE_BY_ID['setup_init_wizard']` 缺位直接抛错、不静默把横幅降级掉。chef 的初始化场景 id 要重新定（老厨骨架里有「开始使用」域 1 组 1 卡）。
5. **`dispatchHelp` 要在 `main` 里、不在 `dispatch` 里**：这是「看帮助不建库」的唯一实现路径。chef 的 `dispatch` 第一行（`packages/skill-chef/src/cli/cmd_read.ts:99`）就是 `openChefDb`，且 `resolveDbPath` 自己会 `mkdirSync`（`packages/skill-chef/src/fetch/paths.ts:21`）——照 bill 的做法，`helpInitialized()` 要绕开它。
6. **`wake-assets.ts` 的落点不能照抄**：`src/triggers/` 是工种名（铁律四）。居家的同类调查（`docs/skills/skill-home/t184-bill-recipe.md:29`）已就这一点写过同样的判断，可作为 chef 侧的先例参考（不构成规定）。**第二版补**：这一条已提升为 §三 里逐件的「候选排除」，并**扩到 `src/render/` 与 `src/` 根位**（bill 的 `helpFile.ts`／`helpPaths.ts` 住 `src/render/`、`output.ts` 住 `src/` 根位，两处都不能照抄）。
   > ⚠️ **此处曾写错，以模板 :1658-1682 为准**：本报告初版与地图 Notes 的字段映射表（`map-chef-body.md:40`）都写作 `scenario_title→name`／`scenario_id→key`。**这两行写的是模板「原型内部名」，不是注入要用的契约字段名**——仓内模板注入层实际读 `s.title`／`s.id`（`packages/base-render/assets/help-template.html:1663-1664`），注入 `name`／`key` 会被忽略。正确换算见 **§四 换算表**（`scenario_id→id`、`scenario_title→title`）。
7. **资产生成器的「事实源在仓外」这条要重判**：bill 的 `--check` 在 CI 不跑（:12-13 写明），因为事实源在老技能目录。chef 的 10 域／48 场景同样来自老件，但地图 Notes 已实测「`$.scenarios[].domain` 只覆盖 13/48」——**事实源本身不完整**，域归属要靠 `html.template` 目录名反推（`map-chef-body.md:28`）。这条差异归票 2（对账）／票 5（入库）。
8. **`SKILL.md` 的 frontmatter 与 `files` 两处：取证时刻缺、复核时刻已被并发会话补上**。取证时刻 chef 的 `SKILL.md:1` 是 `# 私家大厨（chef）SKILL`（**无 YAML 头**）、`package.json` 的 `files` 是 `["dist","templates/*.html"]`；复核时刻 `SKILL.md:1-4` 已有 `name: skill-chef` ＋ `description`（含 38 条唤醒词），`files` 已补 `"SKILL.md"`（`git diff` 实测）。**这正是 bill 在 `#150` 踩过的两处断链**（缺 frontmatter＝整包静默跳过；`files` 缺 `SKILL.md`＝提供方读不到说明面）。⚠️ 但现 frontmatter 的 description 写的是「`chef.help.lookup` **查怎么办**」——这是**改行为之前**的旧口径（今天缺省只回列表）；票 4 若改缺省口径（`t4-body.md:14-17`），这一行 description 要跟着改，否则说明面与实际行为对不上。
9. **（第二版补）本地票面副本与 GitHub 现行正文可能漂移，以后者为准**：本仓 `docs/skills/skill-chef/t*-body.md` 是各票票面的**本地副本**。审查席据 `t7-body.md:5`（副本里写 `CookHub/help/`）判定「票 7 票面与地图冲突」，**本席复核后该判定不成立**——GitHub 上 `#215` 的现行正文已是 `cook_html/help/`，与地图 `Decisions`（`map-chef-body.md:31`）一致，陈旧的只是这份本地副本。**下游若要核票面落点，读 GitHub 现行正文，不读本地副本**；本报告正文也照此口径写（`cook_html/help`），不另记「票面待改」。详见开头「整改记录」末段。

### 2.2 三层机械换算：48 场景 → 33 老组 → 10 域（**表体引用审查席，出处已注明**）

**为什么要有这一节**：通用 help 模板的契约是**三层**，老件是**两层**，中间那一层是模板要求的新东西，谁提供它必须写死。

| 层 | 模板契约字段（`help-template.html:1658-1682`） | 老件对应物 | 数目 |
|---|---|---|---|
| 域 | `groups[]`（读 `g.id`／`g.icon`／`g.label`） | **老件没有这一层**（`$.scenarios[].domain` 只覆盖 13/48，页面不渲染），须由 `dirname($.scenarios[].html.template)` 反推 | **10** |
| 组（中间层） | `subgroups[]`（读 `sg.label`，且 `scenes` 必须非空） | `$.wake_words[]`（老件的一级分组） | **33** |
| 场景 | `subgroups[].scenes[]`（读 `s.id`／`s.title`／`s.wake_word`／`s.types`／`s.status`／`s.prompt_template`／`s.editable_fields`） | `$.scenarios[]` 的 48 条叶子 | **48** |

**表体出处**：下表体逐字取自审查报告 `docs/skills/skill-chef/t1-review-B.md:54`（审查席已算好），**本席未另算一份**，只做复核：

| 域（＝`groups[].label`） | 中间层（＝`subgroups[].label`，老件的一级组） | 组合计 | 场景合计 |
|---|---|---|---|
| 做菜 | 做菜模式 | 1 | 5 |
| 查看 | 查看食谱／查看食材／查看步骤／查看营养／查看背景 | 5 | 8 |
| 搜索筛选 | 搜索食谱／筛选菜系／筛选食材／筛选难度／筛选时间／筛选炊具／筛选口味／筛选季节／筛选状态／查看全部 | 10 | 13 |
| 修改 | 修改食谱／修改步骤／修改食材／废弃食谱 | 4 | 4 |
| 历史 | 记录做菜／查看历史／查看统计 | 3 | 4 |
| 采购 | 生成清单 | 1 | 1 |
| 录入 | 录入食谱／导入食谱 | 2 | 6 |
| 派生 | 添加派生关系／查看派生关系／从已有派生新菜 | 3 | 3 |
| 开始使用 | 首次使用 | 1 | 1 |
| 数据管理 | 体检／批量改／备份 | 3 | 3 |
| **合计** | **33 个老一级组，无遗漏、无重复** | **33** | **48** |

**本席对这张表的复核（本次实测，脚本 `.scratch/chef-help/t1/check-33-groups.mjs`，输出留档 `.scratch/chef-help/t1/check-33-groups.out.txt`）**：

- 机械规则：**老一级组的域＝该组内所有场景的 `html.template` 目录名**（`dirname`）。实测 **33 个组里冲突组＝0**（即每个老一级组**只落一个域**），故这条换算是**机械的、不需要人裁**。
- 逐项对账：**一致 33/33**，差异 0 条；审查席表里 33 个组，实测也 33 个组，两边集合相同。
- 计数闭合：**域内组数合计＝33**；**10 域场景合计＝48**（搜索筛选 13／查看 8／录入 6／做菜 5／修改 4／历史 4／派生 3／数据管理 3／采购 1／开始使用 1）。与地图 `map-chef-body.md:29` 记的域与卡数逐项相同。
- 组名来源：`.scratch/chef-help/legacy-chef-help-payload.json` 的 `$.wake_words[].name`，顺序即文件顺序（做菜模式 5／查看食谱 3／查看食材 2／……／从已有派生新菜 1）；组内场景合计＝48，叶子场景＝48，两边 `scenario_id` **交集 48、无一方独有**。

**这一层的归属（写死，供票 5 照填）**：

1. **事实源**：三层都来自老件（老实物 HTML 的 `window.__HELP__` 载荷；仓内副本 `.scratch/chef-help/legacy-chef-help-payload.json`）。**域这一层是反推的**，不是老件直接给的——反推规则就是上表的 `dirname(html.template)`，这条规则必须写进生成器（§二第 5 行那份 `gen-wake-assets.mjs` 的读取与形状断言段）。
2. **定案者**：三层的最终名单**由票 2（内容资产对账）定**，票 5 照填（`t5-body.md:11`：「新增件住的能力目录，目录名取自 HELP 一级分组（对私家大厨＝票 2 对账表里那 10 个域的英文名）」）。
3. **末句（本席特别提醒票 5 的一句话）**：**33 个老一级组属于 `subgroups` 位，不是 `scenes` 位**。若照数字直觉把 33 个老一级组塞进 `scenes`，会得到「48 张场景卡降到 33 张、每张卡的 `wake_word` 与 `prompt_template` 全错位」的产物——页面能开、内容全错，是这一条路上最难发现的一种失败。

### 2.3 `html`／`result`／`variants` 三个字段的归属（初版未记，本次补）

**为什么要写这一节**：老场景 10 键里，`html`／`result`／`variants` 三个在**地图 Notes 的字段映射表里没有落法**（该表只写了 `scenario_title`／`scenario_id`／`dimensions` 三项，见 `map-chef-body.md:40`）。不写清这三件的归属，实施者会各自临场决定，而**内容不丢**是本图目的地第 ③ 条的一部分。

实测形状（本次，脚本 `.scratch/chef-help/t1/probe-legacy-fields.mjs`，输出留档 `probe-legacy-fields.out.txt`）：

| 字段 | 实测形状 | 归属 | 理由 |
|---|---|---|---|
| `html` | **48/48 都有**，键恒为 `{template, command_cn, data_source}`；`html.command_cn` **去重恰 33 个，且 48/48 等于同条的 `wake_word`**；`html.template` 的目录名恰 **10 种**；`data_source` 48/48 非空 | **迁，但只迁「反推域」这一用，不整块进模板** | 模板契约的场景字段里**没有 `html` 这一格**（`help-template.html:1660-1674` 只读 `id`／`title`／`wake_word`／`types`／`status`／`prompt_template`／`editable_fields`）。它的价值有两处：①`dirname(template)` 是**域归属的唯一机械事实源**（§2.2 那张表的算法），进生成器；②`command_cn`／`data_source` 与票 2 的「命令名↔场景」对账有关，进对账表。**不许**把它当 `types` 用——那是两回事（`type` 才是类型，见 §四） |
| `result` | **48/48 非空**，长度 13–91 字符（中位 38）；其中 6 条提到 HTML | **不迁进模板页，转投票 2／票 3 的对账表** | 模板契约同样**没有 `result` 这一格**。但它是老件里唯一逐条写明「这一卡做完会得到什么」的文字，属**老内容资产**，**不许直接丢**。处置：进票 2 的对账表作为场景说明的一部分；若用户要求 HELP 页上显示它，那是**改共享 help 模板**（公共层变更，另立票），不在本图内 |
| `variants` | **48/48 都是 `array(len=0)`**，非空 **0 条** | **不迁** | 空数组，无内容可迁。若生成器要照抄老载荷形状，落 `[]` 或干脆不落该键皆可——**但要在生成器的形状断言里写死「老件 `variants` 恒空」**，否则将来老件更新出非空值时会静默丢弃 |

**另两个初版没记、本次一并交代的键**（同一次实测）：

- **`domain`**：只有 **13/48** 条有（取值 8 种：搜索筛选 1／修改 2／历史 1／采购 1／录入 1／派生 3／开始使用 1／数据管理 3）。**不迁进模板**（模板无此格），**只作反推域的交叉校验**：13 条有 `domain` 的条，其 `domain` 值与 `dirname(html.template)` 反推出的域**同属 10 域名单**；剩下 35 条须靠 `template` 反推。这正是地图 `map-chef-body.md:28` 记的「域这一层在源头只写了一半」。
- **`dimensions`**：**48/48 都有**（地图 Notes 里「41 键」的记法与本次实测不一致，实测**去重 42 个键**；本报告取实测 42）。换算见 §四表。**2/48 是空对象**（`list_all_recipes`／`first_use`）——即这两条没有可填参数，模板的 `params` 位应当是空表单，**不是缺字段**。

**「内容不丢」总账（一句话版本）**：

| 老件的内容 | 进哪 |
|---|---|
| 48 条场景的 `scenario_title`／`prompt`／`wake_word`／`type`／`status` | **进新页**（换算成 `title`／`prompt_template`／`wake_word`／`types`／`status`，见 §四） |
| 48 条的 `dimensions`（42 键） | **进新页**（换算成 `editable_fields`，即模板的参数表单；空对象的两条落空表单） |
| 10 域名单 | **进新页**（作 `groups`，作底部 tab 栏——这是「换信息架构」的那一层，见 `map-chef-body.md:40`） |
| 33 个老一级组名 | **进新页**（作 `subgroups[].label`，场景行上方的分组标题） |
| `result`（48 条说明文字） | **不整块进新页**（模板无此格）→ 转投票 2 对账表；要显示就得改共享模板，另立票 |
| `html.data_source`（48 条） | **不整块进新页** → 转投票 2 对账表 |
| `html.template` 的目录名 | **进新页的算法**（域反推规则的输入），不进页面 |
| `variants`（48/48 空） | **不进**（无内容） |
| 4 条别名与 `aliases_expanded_count=37`、`alias_names[]` | **不进新页**（模板契约无别名位）；口径层对账归票 2（见 `map-chef-body.md:40` 同一条） |
| `$.wake_words[].pending_count`（33 个恒 0） | **不进**（恒零字段） |

---

## 三、chef 侧建议落点（不定案）

> **本节性质**：只给候选与代价，**不下结论**。落点的定案属**「结构设计闸门票」**——即该票的第二步「结构设计」（`docs/agents/structure.md:83-88`），先报用户点头再动。本票（调查票）不替它裁。
> 写法参照同题先例：`docs/skills/skill-home/t184-bill-recipe.md:46-54`（居家那节标题逐字是「居家要新建哪些件（候选清单＋建议落点，**不定案**）」）。

**清单里那三件新增件在 bill 的原住址**（本图要照抄／改的对象）：

| bill 的件 | 原住址 | chef 侧今天有没有 | 这一件是干什么的 |
|---|---|---|---|
| `helpFile.ts`（182 行） | `packages/skill-bill/src/render/helpFile.ts` | **没有** | 内容资产＋派生 → 全量 HELP JSON → 通用 help 模板全页 HTML。零 IO、零落盘 |
| `helpPaths.ts`（55 行） | `packages/skill-bill/src/render/helpPaths.ts` | **没有** | 命名与落点的**初候选**（零 IO，不建目录、不写盘） |
| 落盘件 | `packages/skill-bill/src/output.ts`（86 行，在 `src/` **根位**） | **没有**（`Test-Path` 实测 `False`） | 唯一落盘点：`wx` 独占 ＋ `EEXIST` 递补 ＋ 绝对路径回执 |

⚠️ **术语对齐**：审查席用 `output` 指第三件（沿用票面 `t6-body.md` 的叫法）；本报告初版把它记成 `packages/skill-bill/src/output.ts` 并标「不抄，或另裁」（§二第 3 行）。**两者是同一件**——本图的仓内三件今天**一件都不存在**，所以下面给的是「**要新建的件该住哪**」，不是「已存在的件搬到哪」。

**候选清单（逐件，不定案）**：

| 要新建／改动的件 | 建议落点候选 | 代价与理由 |
|---|---|---|
| 内容资产（typed const，机器生成） | **(A)** `src/help/assets.ts`（与既有 HELP 出口同目录）／**(B)** 票 2 判定的那个域目录下（如 `src/<域英文名>/assets.ts`） | **A 的代价**：「HELP 交付」这一件事全挤在 `src/help/` 一个能力目录里，文件数会到 5+，但只要对外只开一个出口就仍然合规（铁律五）。**B 的代价**：内容资产一旦落进某个域目录，那个域目录就成了「内容 ＋ 该域自己的活」两件事的混合体；且 HELP 短语本身不属任何域（老件 33 组里没有它），必须另找位置。**共同前提**：**不要新开 10 个域目录**——10 个域各开一个目录＝声明 10 个能力，每个都要有自己的公开接口，那是铁律五与第二步的范围，远超本图（`t1-review-B.md:47` 同此建议） |
| 内容资产生成器 | `packages/skill-chef/scripts/gen-wake-assets.mjs` | **代价最低、争议最小**：结构标准已写死「一次性脚本住包内 `scripts/`，与源码目录分开」（`docs/agents/structure.md:69`），且 chef 包内已有 `scripts/build-help.mjs` 与之并列。**唯一要定的是脚本名**（bill 叫 `gen-wake-assets.mjs`） |
| 渲染接线（资产＋派生 → 全量 HELP JSON → 通用 help 模板） | **(A)** `src/help/fileData.ts`（bill 叫 `helpFile.ts`）／**(B)** 与内容资产同目录，文件名按票 2 的「下一级子功能名」定 | bill 的这份是**零 IO 纯函数**（`helpFile.ts:1-3`）。**A 的代价**：`fileData` 这个名字是自造的（铁律四说「名字只许从 HELP 的现成说法里取，不许自创」），要么在票 2 的对账表里给它找到一个现成说法，要么承认它只是「下一级子功能名」的一个描述。**与内容资产同目录**这条几乎无争议：两者同属「HELP 交付」这件事 |
| 命名与落点通式（零 IO） | **(A)** `src/help/paths.ts`（bill 叫 `render/helpPaths.ts`）／**(B)** 票 4 若判「收成共用位」，这一件**不在 chef 侧落**，改为 import 共用件 | **A 的代价**：与 bill 同形，但 chef 侧的落点是**两段**（`cook_html/help`，bill 是一段 `biscuit_accountant_html`），`HELP_HTML_DIR_NAME` 一个常量不够用——要么拆两个常量、要么把「子目录相对路径」做成入参（§2.1 第 1 条）。**B 的代价**：这一件的存在与否**取决于票 4**（`#212`），票 4 未裁之前不能定案（§8.4 三条路） |
| 落盘点（独占创建 ＋ 递补 ＋ `file` 态交付） | **(A)** `src/help/output.ts`（bill 把它放在 `src/` 根位）／**(B)** 票 4 若判「收成共用位」，同样改为 import 共用件 | **A 的代价**：按铁律摆进能力目录比 bill 的「根位」更合规矩；但**这一件正是票 4 的核心**（§8.4 甲／乙／丙三条路），本票只列不选。**若有人图省事在 `src/` 根建 `output.ts`**，就地摆正时还要再搬一次——卡路里那次结构设计为同一条否掉过 `src/render/docPage.ts` 这个落点（`docs/skills/skill-calorie/t179-180-structure-design.md:72`） |
| 出口分派（HELP 分支抬到 `main` 里） | 改 `src/cli/cmd_read.ts`（bill 把 `dispatchHelp` 内联在 `cmd_read.ts:69-111`） | 照抄 bill 的形状最省事。**代价**：该文件实测 **LF=388，已超告警线**（§五），本图还要往里加 HELP 分支与交付分支——第四步报警与拆法必须在票 7 当场给（`t7-body.md:11` 也把「超告警线当场报」写进了票面） |
| 口径层唤醒词 | 改 `src/policy/wakewords.ts`（`WAKE_TABLE` 唯一上游，`packages/skill-chef/src/help/lookup.ts:1`） | HELP 短语（4 条）与场景唤醒词的**单一事实源**在口径层；bill 的 `HELP_WAKE_WORDS` 就是从 `WAKE_TABLE` 派生、不落第二份字面量（`wake-assets.ts:984-986`）。**代价**：内容资产与口径层必须双向对账（`wake-assets.test.mjs:68-84` 的锁法），这条对账归票 5 |
| 说明面 | 改 `packages/skill-chef/SKILL.md` 补「HELP 交付」节 | 无争议（说明面不是能力目录）。**代价**：frontmatter 的 description 今天写的是旧口径，票 4 若改缺省口径要同批改（§2.1 第 8 条） |
| 插件侧最小装机 | `packages/plugin-chef/src/skill-provider.ts` ＋ `dsh-ctx.ts` ＋ `index.ts` 注册 ＋ `test/skills-provider.test.mjs` | 归票 10（`#218`），**本图唯一的无阻塞实施票**，且并发会话已开工（§二第 14 行「复核时刻」） |

**为什么不落 `src/render/` 与 `src/triggers/`（这一条是本节的硬话，不是候选）**：

铁律四逐字：「能力目录名取自 **HELP 的一级分组**；目录里的文件名与公开接口名取自**下一级**（子功能）。名字只许从 HELP 的现成说法里取，不许自创。」判据是「把目录名念给用户听，他能在 HELP 里指出这是哪一组」（`docs/agents/structure.md:44-49`）。据此：

- **`src/render/` 不合铁律四**：`render`（渲染）是**工种名**，不是 HELP 的任何一个一级分组——用户拿着「渲染」这两个字在 HELP 里指不出任何一组。bill 那两份 `helpFile.ts`／`helpPaths.ts` 住在 `src/render/` 里，是**立规之前**的存量位；chef 照抄的是**件的内容**，不是**件的住址**（铁律一管「抄一份放进自己目录不算走了接口」，铁律四管「住址的名字从哪来」——同一条照抄清单上这是两件事）。
- **`src/triggers/` 不合铁律四**：`triggers`（触发器）同样是**工种名**。bill 的 `wake-assets.ts` 住在这里，且该目录早于 `docs/agents/structure.md` 立规。同题先例：居家那份调查已就这一点写过同样的判断（`docs/skills/skill-home/t184-bill-recipe.md:29`：「落点 `src/triggers/` 是**工种名**，且这份早于 `docs/agents/structure.md` 立规——居家不该照搬这个目录名」）。**先例不构成规定**；本报告初版 §2.1 第 6 条已记同一判断，本节把它从「一句提示」提升为「落在清单上的候选排除」。
- **`src/` 根位也不落**：结构标准逐字「**能力目录**：`src/` 下第一层必须是能力名，不能是工种名」（`docs/agents/structure.md:64`）。在 `src/` 根新建 `output.ts` 会让第一层多出一个非能力名的条目——`packages/skill-chef/src/` 今天根位只有 `index.ts` 一个文件（实测），**不要再添第二个**。卡路里那次结构设计为同一条否掉过 `src/render/docPage.ts` 这个落点（`docs/skills/skill-calorie/t179-180-structure-design.md:72`：「把新文件放在 `src/` 根上，第一层就多了一个非能力名的条目」）。

**chef 侧现成的一条 HELP 目录（三条实测事实，供第二步用）**：

- `packages/skill-chef/src/help/` **存在**：`lookup.ts`（49 行，`WAKE_TABLE` 的唯一上游）＋ `index.ts`（1 行，转发出口）。这是 chef 侧唯一一个「名字站得住」的一级目录。
- `packages/skill-chef/src/` 一级目录实测 5 个：`cli`／`fetch`／`help`／`policy`／`render`；根位文件 1 个：`index.ts`。
- ⚠️ **但 `help` 是不是「HELP 的一级分组」要看票 2**：地图 `map-chef-body.md:51` 记着「chef 的 HELP 一级分组名单仓内不可知——仓里只有 8 条命令、5 个命令段（recipe／cooking／shopping／history／help），那是命令段不是 HELP 显示分组」。票 2 交出的 10 域英文名里**如果没有 `help` 这一域**，那把新件放进 `src/help/` 就只是「沿用既有目录」，而不是「名字取自一级分组」——**这一格必须由票 2 的对账表回答，本票不裁**。

**收敛句**：票 2 交出 10 域英文名之前，票 5／6 写不出第一步与第二步（`map-chef-body.md:51` 的结语；票 5 票面 `t5-body.md:11`、票 6 票面 `t6-body.md:13` 都指向同一张表）。**落点这一格今天能给的只有候选；定案要等票 2 的表 ＋ 用户点头。**

---

## 四、字段两代换算（**以模板契约与归一化代码为唯一权威**）

**为什么要有这一节**：老件是**上一代字段名**，通用 help 模板是**下一代契约**，两代不兼容且**没有中间态**（`map-chef-body.md:36`）。审查席指出本条初版只躺在 §6.1 第 6 条（不确定项）里，没有落到「**哪个件、改成什么**」——本节把它提升为清单级内容。

**权威出处（唯一）**：`packages/base-render/assets/help-template.html:1658-1682`。契约注释原文（:1658-1659）：

```
契约 v1 (groups[{id,icon,label,subgroups[{id,label,scenes[]}]}])
   -> 原型内部结构 (key/icon/name + subgroups[{name,scenes}])
```

归一化代码（:1660-1673）逐字：

```js
function normalizeScenes(scenes){
  return (scenes || []).map(function(s){
    return {
      id: s.id,
      name: s.title,
      chip: s.wake_word,
      types: (s.types && s.types.length ? s.types : []),
      dev: (s.status === '【待开发】'),
      prompt: s.prompt_template,
      params: (s.editable_fields || []).map(function(f){
        return { key: f.name, label: f.label, value: f.value || '', req: !!f.required, hint: f.hint || '' };
      })
    };
  });
}
```

**读法（这一句是本节的关键）**：注入层读的是 **`s.id`／`s.title`／`s.wake_word`／`s.types`／`s.prompt_template`／`s.status`／`s.editable_fields[{name,label,value,required,hint}]`**；`key`／`name`／`chip`／`prompt`／`params`／`dev` 是**模板内部的原型名**——注入 `key`／`name` 会被**忽略**（`s.id` 取不到就 `undefined`，卡片 id 空、`SCENE` 索引失效）。组那一层同理：注入 `key`／`name` 也无效，模板读的是 **`g.id`／`g.label`** 与 **`sg.label`**。

### 4.1 换算表（**八行**，逐行给「老载荷字段 → 契约字段」）

| 老载荷字段（实测形状） | 契约字段 | 换法与理由 |
|---|---|---|
| `scenario_id`（如 `update_ingredient`） | **`id`** | 直传。⚠️ **不是 `key`**——`key` 只是模板内部给 `g.id` 起的原型名（`GROUPS` 的 `key: g.id`，:1677），场景那层读的是 `s.id` |
| `scenario_title`（如 `修改食材(用量/添加/关联步骤)`） | **`title`** | 直传。⚠️ **不是 `name`**——`name` 只是模板内部给 `s.title` 起的原型名（:1664）。**地图 Notes 的字段映射表（`map-chef-body.md:40`）与本报告初版照抄的那两行（`scenario_title→name`／`scenario_id→key`）写的都是「原型内部名」，不是注入用的契约字段名**——本报告初版在此处写错，已就地改正，见 §2.1 第 6 条后的改正注记 |
| `prompt`（如 `请加载「私家大厨」技能，帮我修改食材…`） | **`prompt_template`** | 改名直传。这是**最要命的一条**：不换则模板抽屉里的 prompt 整片空白（`prompt: s.prompt_template` 取不到 ⇒ `undefined`）。老件 48/48 都有 `prompt` |
| `type`（**单数**字符串，实测 11 型） | **`types`**（**数组**） | 老件 11 型取值实测：`查看`(25)／`采集+回执`(7)／`向导+选择+回执`(5)／`对比+确认+回执(过程型)`(3)／`采集+确认+回执(过程型)`(2)／`查看+选择`(1)／`确认+回执`(1)／`查看+勾选(过程型)`(1)／`采集+确认+回执`(1)／`向导+回执`(1)／`转移(下载)`(1)。**模板里 `type` 没有任何读取点**，只在 `:1727` 渲染 `s.types`——**不换就整批徽章消失**（页面不报错、只是没有徽章）。词表硬约束（**2026-09-12 复核改正**）：模板 `TYPE_DEFAULT` 是 **`help-template.html:1698-1709` 的 10 键表**——`采集／查看／结果／向导／批量／校验／选择／过程／回执／录入`；未命中者回退「查看」色（`typeBadgeHTML`，`:1710` 起，`:1714` 的未命中回退）。此前写「:1698-1699 只给 5 个词配色（采集／查看／选择／向导／回执）」**是错的**：既把行号截短，又把那 5 个词当成了模板表——**那 5 个词实际是 `packages/skill-bill` 的 `WakeSceneType`**。**票 5 要么把 11 型收进这 10 个词，要么改用 `{text,bg,fg}` 形式**（模板 :1697 的注释写明数组元素可为字符串或 `{text,bg,fg}`）。本票不裁词表 |
| `status`（实测 **48/48 都是空串 `""`**） | **`status`**（`''` 或 `【待开发】`） | **同名直传**。模板判据是 `dev: (s.status === '【待开发】')`——空串即「可用」，与老页恒显「✓ 可用」一致（`map-chef-body.md:41` 记的同一件事）。注入器硬校验也只认这两个取值（`map-chef-body.md:39`） |
| `dimensions`（实测 **48/48 都有**，去重 **42 个键**；其中 2 条是空对象） | **`editable_fields`**（表单）／chip | 映射见下 §4.2（本报告 §四 的小节）。模板把 `editable_fields` 读成参数表单：`{name,label,value,required,hint}`；`chip`（＝`wake_word`）是另一格，两者不是一回事 |
| `wake_word`（如 `修改食材`） | **`wake_word`** | **同名直通**（模板 `chip: s.wake_word`）。实测 48/48 都有、非空；`html.command_cn` 48/48 与它相等（§2.3），可作交叉校验 |
| （老件**没有**这一格） | **`icon`**（组那层） | `groups` 的 `icon` 老件没有：模板 `icon: g.icon \|\| 'grid'`（:1677）**有缺省**，不传即 `grid`。**要不要给 10 个域各配图标是票 6 的取舍**，不是入库阻塞项 |

**另有三处模板读、老件缺的契约点**（一并交代，避免票 5 临场发现）：

- **注入器硬校验**（`map-chef-body.md:39` 引公共组件 `injector.py` 的 `validate_help_data`）：场景必带 `id`／`title`／`wake_word`／`prompt_template` **四元组**；`subgroups` 必带 `label` ＋ **非空 `scenes`**；`status` 仅 `''` 或 `【待开发】`；**group id 与 scene id 共用一个唯一集合 → 全局唯一**。⚠️ 最后这条对本图**不是空话**：老件的组名（`做菜模式`／`查看食谱`…33 个）与场景 id（`cooking_start_fresh`…48 个）**是两个不同的名字空间**；若有人把组名当 `groups[].id` 用，要确认不与任何场景 id 撞名。本席实测：33 个组名与 48 个 `scenario_id`（英文）**无一处同名**（组名是中文、场景 id 是英文），但**组名也不能直接当 `groups[].id`**——模板的 `key` 位是给程序用的（`g.key` 进 `SCENE` 索引与 tab 锚点），中文名宜落 `label`、`id` 另取票 2 的域英文名。
- **`editable_fields[].value`**：模板 `value: f.value || ''`（:1670）——老 `dimensions` 的**值本身是提示文字**（如 `"指定菜名"`／`"改用量 / 添加食材 / 关联步骤"`），不是用户填的值。**票 5 要决定**：把提示文字放 `label`（表单标签）还是 `hint`（说明），`value` 留空。这是「内容不丢」的一格，见 §4.2。

### 4.2 `dimensions`（42 键）→ `editable_fields` 的换算口径

实测 `dimensions` 去重 **42 个键**（本报告取实测值；地图 Notes 记的「41 键」与本次实测不一致，按实测记）：`action`／`backdate`／`change_summary`／`child`／`confirm`／`cookware`／`cuisine`／`differences`／`difficulty`／`exclude_optional`／`extra`／`feedback`／`field`／`flavor`／`focus`／`group_by`／`history`／`include_archived`／`ingredient`／`ingredient_exclude`／`ingredient_swap`／`input`／`keyword`／`new_value`／`parent`／`progress`／`rating`／`recipe`／`relation_type`／`scope`／`season`／`servings`／`source`／`status`／`step`／`step_type`／`stock_check`／`tab`／`target`／`time_max`／`user_state`／`默认不含)`。

逐键映射表**不在本票产出**（那是票 2 的对账表 ＋ 票 5 的入库活）。本节只写死三条口径：

1. **一个 `dimensions` 键 → 一个 `editable_fields` 元素**，`name` 取老键名（程序用）、`label` 取老值（给人看）。**空对象的两条**（`list_all_recipes`／`first_use`）落**空数组 `[]`**，不是缺字段——模板 `(s.editable_fields || []).map(...)` 对 `[]` 与缺字段行为相同（都渲染成没有参数的表单），但**载荷形状应当一致**，便于下游断言同一组字段（`t184-bill-recipe.md:78` 的同一口径）。
2. **`dimensions` 的值不是值，是提示**：老值形如 `"指定菜名"`／`"选填,默认今天"`。放 `label` 还是 `hint` 由票 5 定，`value` 一律留空串。
3. **一处**源资产 bug 要带上**：`map-chef-body.md:41` 实测 `references/scenarios.yaml` 的 `exclude_optional: 默认不含)` 多一个右括号 → 载荷里出现畸形键 `默认不含)=null`（本次实测在字典序末尾可见）。**入库时要就地摆正成 `默认不含`**，否则这个畸形键会原样渲染到新页的表单上。这条属票 5 的「就地摆正」。

---

## 五、告警线 ＋ 必报五步（四条新规里被初版整节漏掉的两条）

### 5.1 告警线：口径、落点、当场报警

**口径**：**350 ＋ LF**（只数 `\n`，不数 CR）。出处：用户原话 Q4b「350 ＋ LF 口径，写进 `packages/skill-chef/AGENTS.md`」（`map-chef-body.md:53` 记同一句）。

**落点**：`packages/skill-chef/AGENTS.md`。**本席实测：该文件今天不存在**（`Test-Path` → `False`），且 **`packages/` 下 `AGENTS.md` 计数＝0**。结构标准要求告警线数字「由各包自己定，写在各包自己的地方」（`docs/agents/structure.md:70`）——所以这一件是**要新写的**，且**本图的任何一张票今天都没有认领它**。本报告只能点出这一格，**谁写要在票面上点名**（建议挂票 6／票 7 之一，因为那两张票才真正碰超线件）。

**已超线的两件（当场报警，照第四步的句式）**：

> **`packages/skill-chef/src/cli/cmd_read.ts`：已超线，需要根据规则进行重构。** 理由：LF=**388**（> 350）。本次要摆正的行为恰在这一件里——HELP 分支要从 `dispatch` 里抬到 `main` 里、`dispatch` 之外（§7.4），并要新加独占落盘的交付分支与 exit 5 路径。**拆法建议**：把 `dispatchHelp` 与它的两个局部类型（`DeliverIntent`／`HelpDispatch`）抽成一个独立件（bill 内联在 `cmd_read.ts:69-111`，抽出去约 −45 行）；或按命令段拆分派表。**注意**：票 7 票面（`t7-body.md:11`）已要求「超告警线当场报」，本条即为该票第四步的输入。
>
> **`packages/skill-chef/src/fetch/db.ts`：已超线，需要根据规则进行重构。** 理由：LF=**451**（> 350；地图 `map-chef-body.md:53` 记「约 433」，本席与审查席实测均为 451，**对账取实测值**）。本图**不碰这一件**（无票涉及），故属**存量超线**：按第四步的口径，须写明「**这次先不拆**」及其理由——本图的地图 `Decisions` 已裁「整包按 HELP 一级分组重排不在本图内（另立票）」（`map-chef-body.md:49`），这一件归那张票。

⚠️ **这两条初版只有数字、没有口径**。初版 §11.1 与 §9.4 里出现的 `LF=388`／`LF=451` 是**实测值**（本次复核一致），本节把它们接到「350 ＋ LF」这个口径与第四步的报警句式上。

**校验命令（LF 计数，本报告全篇沿用同一法）**：

```powershell
cd D:\ilife
foreach ($f in @('packages/skill-chef/src/cli/cmd_read.ts','packages/skill-chef/src/fetch/db.ts')) {
  $lf = ([regex]::Matches([IO.File]::ReadAllText($f), "`n")).Count
  "{0,-48} LF={1}" -f $f, $lf
}
```

### 5.2 必报五步：票 5／6／7 各自要报什么

**初版全文零命中**（审查席原话：「必报五步（第一步影响清单、第二步结构设计、第五步交付对账）全文零命中」，`t1-review-B.md:65`）。五步的定义在 `docs/agents/structure.md:72-107`：五步是**动作**——「改管辖范围内任何一件的源码时，按序做，每步报给用户」。

| 票 | 第一步 · 影响清单 | 第二步 · 结构设计 | 交付 · 第五步 · 交付对账 |
|---|---|---|---|
| **票 5**（`#213`，内容资产入库） | 报：新增／改动哪些目录与文件，每个一句话与理由。**每行必须指向一个能力目录**（判据：一行里出现两个能力名就是这一步没做对；要给两个能力时写明走的是哪个公开接口或为什么属共用件，`structure.md:80-81`）。本票的落点见 §三 | 报：新增的目录树、每个文件的职责、**每个文件对外给什么（导出几个、各一句）**、共用件被哪两个能力用（`structure.md:83-88`）。**新建目录层级或要碰三个以上能力时，等用户点头再动** | 报：实际碰到的目录，**逐行与第一步的清单对，偏差为零**（`structure.md:103-107`，唯一机械验收点） |
| **票 6**（`#214`，渲染接线） | 同上；本票还要把 `tooling/check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN` 移出 `'skill-chef'` 一项写成清单里的一行 | 同上；本票还要写死**三层中间层的来源**（§2.2：`33 组＝subgroups`，由票 2 的表定、票 5 提供），否则渲染层的 `groups` 类型对不上 | 同上；另需在第五步里附**门的对账**（§六） |
| **票 7**（`#215`，出口与命名落盘） | 同上；本票要碰的 `cmd_read.ts` **LF=388 已超线**，第一步就要把这一条写出来 | 同上；本票要写死只读判据（**不许调 `resolveDbPath()`**——它自己 `mkdirSync`，`packages/skill-chef/src/fetch/paths.ts:20-22`）与落盘件归属（票 4 裁后才有件） | 同上；＋第四步报警（第五步之前先报，见 §5.1） |

**本图的三张实施票票面都自己写着这两步**（原文出处）：`t5-body.md:14`「**第一步「影响清单」与第二步「结构设计」先报用户点头**再动手；交付时报第五步「交付对账」；任何文件超告警线当场报」；`t6-body.md:15` 同句；`t7-body.md:11` 同句。**本报告的作用是让这三张票不必各自去读 `structure.md`。**

**给票 4 的三条路补的一格**（铁律五／第二步行内两能力名的写法，`structure.md:81`）：票 4 若判**乙路**（三家一起改成走共用件），那份共用件**要写得出哪两个能力在用**——写不出来就不许放共用位，只能留在某个能力目录里（`structure.md:67`）。这是乙路在第二步必须回答的问题，本报告在此点出。

---

## 六、门（哪些必绿、哪些会红、装插件前必须先跑）

**初版报到的不全**（审查席原话：「`client-bundle-48` 全文零命中；`tooling/test/skill-html-snapshot.test.mjs` 里把 chef 命令数与模板数写死成 8 的三条断言没提」，`t1-review-B.md:79`）。本节把门补齐。

### 6.1 必绿的门（红了不许关票）

| 门 | 命令 | 现状（实测／出处） |
|---|---|---|
| 边界门 | `pnpm boundaries`（＝`node tooling/check-boundaries.mjs`） | **今天必红**：`skill-chef` 在 `SKILLS_BASE_FROZEN` 名单里（`tooling/check-boundaries.mjs:37`），一 import `base-paint` 就被两道断言拦下（:39-44 依赖闭包、:45-60 扫源码）。**须先移出名单**（§二第 13 行），并照 bill 先例在 `:34-36` 的注释区补记移出理由。移出后**必绿** |
| 页面产物快照门 | `pnpm snapshot:html:check`（＝`node tooling/skill-html-snapshot.mjs --check`） | **实测绿**（本席实测，非「应当」）：输出 `OK: 5 技能 HTML 快照 == 实际（185 件产物）`，`changed=0 added=0 removed=0`。⚠️ 初版 §6.1 第 4 条只写「应当绿，未跑」——本节把它升级为**实测绿**，并给出基线数字 `185` |
| 快照门（另一道） | `pnpm snapshot:check` | 本图不碰页面模板则不动。票 6 票面（`t6-body.md:9`）要求移出名单后跑它与上面那道一起确认 |
| 包内测试 | `pnpm --filter skill-chef test`（＝`node --test test/*.test.mjs`，见 `packages/skill-chef/package.json` 的 `scripts.test`） | 必绿。**注意它不是全量门**：见 §6.3 的两条 |

### 6.2 会被本图碰红的门（同一批改，别当预存失败）

**`tooling/test/skill-html-snapshot.test.mjs`（固定数字断言）**——机制是**硬编码数字**，本席与审查席实测一致：

```js
// tooling/test/skill-html-snapshot.test.mjs:103-104
const EXPECT_KEYS = { bill: 16, chef: 8, home: 21, schedule: 8, memo: 10 };
const EXPECT_TPL  = { bill: 16, chef: 8, home: 21, schedule: 8, memo: 6 };
```

- `:110` 断言 `chef/frag/` 片段数 == `EXPECT_KEYS.chef`（**8**）；`:111` 断言 `chef/tpl/` 模板页数 == `EXPECT_TPL.chef`（**8**）；`:119-123` 还按这两张表算**产物总数**（`want`）并断言 `ids.length == want`。
- **后果**：本图**新增一条命令**或**新增一个模板页**，这两个数字就要**同批改**，否则这道门红。**不是「8/8 断言」这种含糊说法——就是这两个常量对象里的 `chef: 8` 字面量**（审查席 `t1-review-B.md:36` 已把机制点明，本席复核一致）。
- **同类**：`tooling/test/skill-html-snapshot.test.mjs:57` 断言标记白名单为空（票 6 票面 `t6-body.md:9` 已记）。

### 6.3 装插件之前必须先跑的门（**代价最贵的一条教训**）

**`node --test test/client-bundle-48.test.mjs`**——文件实测存在于 `D:\ilife\test\client-bundle-48.test.mjs`。依据是邻居复盘里最硬的那条配方点（`.scratch/chef-help/B2-recipe-bill-map143.md:389`，逐字）：

> 「**纪律教训（写进票面）**：装任何插件进 profile 之前，先跑 `test/client-bundle-48.test.mjs`——它是这条契约的门；『预存失败』不等于"与本次无关"，动了对应面就要复跑。」

同处另记的数字（`:389` 同一段）：全仓 `node --test` 当时有 **14 例预存失败**（`client-bundle-48`／`calorie-routing-81`／`plugin-p10-boundaries` 三个文件），本席**没有复跑这份全量、也没有复跑 `client-bundle-48`**（本票只读调查且工作树有他人未提交改动）——**票 10（`#218`）开工前必须自己跑一次并把 pass／fail 记成基线**，否则对账说不清哪些红是自己引入的。

**同类的第二条教训**（`B2:391` 的配方点）：**把「预存失败清单」当待办，不当背景噪声**——碰了哪个面就复跑那个面的那几例。

### 6.4 本票没有跑的门（如实声明，接初版 §11.7）

初版 §11.7 声明「没有跑任何门」，理由是只读调查 ＋ 工作树有他人未提交改动。**本次整改补跑了唯一一道纯读、不改动任何产物的门**：`node tooling/skill-html-snapshot.mjs --check` → **绿**（`185` 件产物，`changed=0`）。**其余门仍未跑**：`pnpm boundaries`／`pnpm test`／`pnpm snapshot:check`／`npx tsc -b`／`check-publish`／`client-bundle-48`——理由同上，且本次整改只改一个 Markdown 文件。

---

## 七、命令分派与出口（bill 的 help 命令怎么跑起来）

### 7.1 分派位置与顺序（`packages/skill-bill/src/cli/cmd_read.ts`）

```powershell
Select-String -Path 'packages/skill-bill/src/cli/cmd_read.ts' -Pattern 'dispatchHelp|bill.help.lookup|开库之前'
```

实测命中（原样）：

| 行号 | 原文（摘） | 作用 |
|---|---|---|
| :69-78 | `/* ── #144 · 「饼干记账help」的交付装配（**在开库之前**走） ──` | 该段的模块头 |
| :79-80 | `interface DeliverIntent { readonly html?: string; readonly target: string; }` / `interface HelpDispatch { readonly data: unknown; readonly deliver?: DeliverIntent; }` | 两个局部类型 |
| :84-86 | `function helpInitialized(): boolean { try { return existsSync(resolveDbPath()); } catch { return false; } }` | 初始化判定（**DB 文件存在**；异常 ⇒ false＝横幅照显，fail-open） |
| :88-111 | `function dispatchHelp(params)` | 三支分支（见 3.2） |
| :449-452 | `case 'bill.help.lookup':` → `fail(1, '内部错误：bill.help.lookup 须走 dispatchHelp（开库之前）')` | `dispatch` 里的**守卫**（不可达，路由坏了才走到） |
| :493-495 | `// #144：HELP 在开库之前分派…`；`const help = key === 'bill.help.lookup' ? dispatchHelp(params) : null;`；`const built = buildBillEnvelope(key, help ? help.data : dispatch(key, params));` | **真正的分派点**：三元表达式短路，`bill.help.lookup` **不进 `dispatch`** |
| :503-510 | `if (help?.deliver !== undefined) { … deliverHtml({ explicit: o.html, target: help.deliver.target, html }) } else if (o.html) { … }` | 交付分支：本键产物 vs 其它命令的收据页 |
| :522-523 | `process.stdout.write(JSON.stringify(delivery ? { ...env, delivery } : env) + '\n')` | 回执**顶层追加** `delivery{mode,path,bytes}`，既有五字段一字不改、序不变 |

**在开库之前还是之后**：**之前**。证据有两层：①:494 的三元短路（`dispatch` 未被调用 ⇒ :121 的 `openBillDb` 不执行）；②实测产物目录里 `.db` 计数为 0（`test/help-delivery-144.test.mjs:95` 就断言这一条，我的实跑见 §11.2）。

**参数怎么进**：`parseArgs`（:460-472）只认 `--params`／`--html`／`--timeout`；`--params` 经 `JSON.parse` ＋「须为对象」（:481-484）。`dispatchHelp` 里 `params.mode`／`params.q` 各自 `String()`（:91-92），互斥与非法值都在这里 `fail(2, …)`（:93-94）。

**产物怎么回执**：`delivery{mode:'file', path, bytes}`，`path` 是 `deliverHtml` 归一后的绝对路径；`data` 里另有一份 `mode:'file'` ＋ `bytes`（:108）。实跑样例（§11.2）：

```json
{"version":"0.1.0","skill":"bill","shape":"list","key":"bill.help.lookup",
 "data":{"items":[{"id":"write","icon":"✏️","label":"写入","subgroupCount":3,"sceneCount":16}, …],
         "total":7,"sceneTotal":74,"subgroupTotal":20,"mode":"file","bytes":129990},
 "delivery":{"mode":"file","path":"D:\\ilife\\.scratch\\chef-help\\t1\\probe-bill-default\\biscuit_accountant_html\\饼干记账_HELP_20260912_112225.html","bytes":129990}}
```

### 7.2 `dispatchHelp` 三支（:88-111，逐行）

| 入参 | 走哪一支 | 产物 | 落盘 |
|---|---|---|---|
| 无参数 | :106-110 | 通用 help 模板全页 HTML（`renderHelpFileHtml(buildHelpFileData(now, { initialized: helpInitialized() }))`） | `resolveStemTarget(dbDir, HELP_FILE_STEM, now)` → `<SKILLS_DB_PATH>/biscuit_accountant_html/饼干记账_HELP_<stamp>[_N].html` |
| `{"mode":"lookup"}` | :99-105 | 全量速查表（`buildHelpItems(buildHelpLookup(), undefined)`） | `resolveStemTarget(dbDir, LOOKUP_FILE_STEM, now)` → `饼干记账_速查表_<stamp>[_N].html`（**分名**） |
| `{"q":"…"}` | :95-98 | 现找命中（`help.deliver` 为 `undefined`） | **不落盘**（给了 `--html` 才写，:508-509） |

`q` 与 `mode` 互斥 → exit 2（:93）；`mode` 只认 `lookup` → exit 2（:94）。

### 7.3 bill 的 `SKILL.md` 怎么描述它（:112-120，六条）

原文（`Select-String -Path 'packages/skill-bill/SKILL.md' -Pattern 'HELP'` 命中 :112-120）：

1. 节标题：`## HELP 交付（说「饼干记账help」或「查帮助」走这里）`。
2. **缺省就是交付物**：`bill-cmd-read bill.help.lookup` **原样调用**即落一份能打开的 HELP 文件——`<SKILLS_DB_PATH>/biscuit_accountant_html/饼干记账_HELP_<YYYYMMDD_HHMMSS>.html`（7 域／74 场景，与卡路里同一套共享 help 模板）；stdout 的 `delivery.path` 是绝对路径、`delivery.bytes` 是文件字节数；**完成标准**：`delivery.path` 指向的文件真的存在，且大小＝`delivery.bytes`。
3. **要全量速查表才加参数**：`--params '{"mode":"lookup"}'` → `饼干记账_速查表_<时间戳>.html`（与 HELP 文件分名）。
4. **要现找才加参数**：`--params '{"q":"查今天"}'` → 只回 JSON 不落盘；`q` 与 `mode` 互斥、`mode` 只认 `lookup`，违反即 exit 2。
5. **`--html <路径>`＝显式落点**：逐字使用、覆盖写、缺父目录自动建（不参与同秒 `_N` 递补）；其它 15 条命令的 `--html` 语义不变。
6. **边界**：面板／侧栏的 HELP 入口不在本技能范围；不写固定名镜像；触发词总表见上「联动速查」构建期注入块。

### 7.4 chef 侧对照（现状，只读实测）

| 维度 | bill（已实现） | chef（今天） |
|---|---|---|
| 分派位置 | `main` 里、`dispatch` 之外（`cmd_read.ts:494`） | `dispatch` 里的 `case 'chef.help.lookup'`（`packages/skill-chef/src/cli/cmd_read.ts:327-331`），而 `dispatch` 第一行 `openChefDb`（:97-99） |
| 跑完建库？ | **不建**（实测产物目录 `.db` 计数 0） | **建**（实测 `probe-chef-default/chef_data.db`，282,624 B） |
| 缺省产物 | HELP 文件（129,990 B）＋顶层 `delivery` | 只回 stdout 一份 37 条速查列表（`data.items` 37 条，无 `delivery`） |
| 唯一出口 | `bill-cmd-read` | `chef-cmd-read`（`packages/skill-chef/package.json` 的 `bin`） |
| HELP 唤醒词 | 4 条（`饼干记账 HELP`／`饼干记账帮助`／`查帮助`／`能做什么`） | 4 条（`私家大厨HELP`／`菜谱HELP`／`查帮助`／`能做什么`；`packages/skill-chef/src/policy/wakewords.ts:13-16`） |
| 速查数据源 | `buildHelpLookup()` ／ `buildHelpItems()` | 同形（`packages/skill-chef/src/help/lookup.ts` ＋ `src/render/views.ts:buildHelpItems`，37 短语） |
| 命令名被外部钉住 | `tooling/check-publish.mjs:63` 钉 `bill.help.lookup` | `tooling/check-publish.mjs:63` 钉 **`chef.help.lookup`** —— **换命令名会让那道门红**（票 4 票面已记这条） |

---

## 八、#147「命名落盘管线归属」裁决原文与三条合流触发点

### 8.1 裁决 (b) 的原话（`gh issue view 147`，`.scratch/chef-help/t1/issue-147-body.md` 留档；B2 摘录见 `.scratch/chef-help/B2-recipe-bill-map143.md:83-86`）

> ## 裁决：走 **(b)**——bill 自持一份**最小**落盘＋命名管线；本图内不与卡路里合流；合流触发点写死在下面

三条路的代价（#147 原文）：

> - **(a) 上移 `base-paint`，两边共用一份**：真共享、零漂移。代价是动共享层（`packages/base-render`），连带影响卡路里；发布态本来就缺 `./help-shell`（用户 Q11 已把发版出本图，本机 junction 不受影响）。
> - **(b) 复制一份进 `skill-bill`**：零共享层改动、本图闭环最快。代价是两份实现将来必漂移，尤其独占递补这类并发细节。
> - **(c) 让 `skill-bill` 依赖 `skill-calorie`**：最省代码。代价是技能之间互相依赖，破了「技能之间零依赖」的分界。

排除 (a) 的三条理由（#147 原文摘要）：①「base-paint 是被冻结面主动管理着的包，不是随手加工具的抽屉」——`docs/base-paint-contract.md` 是 130 条签名的正本、`packages/base-render/test/contract-signatures.test.mjs` 锁主入口出口、`tooling/check-boundaries.mjs:28-56` 专门为「base-* 变更影响面」立了断言（#96），且「落盘是 IO，不是渲染，塞进『渲染包』在主题上也错位」；②连带面比看起来大（要么动 calorie 的 `output.ts`（386 行、与 key→中文 command／`--output`／回执落点深度耦合），要么在共享层新开子路径＝给发布态再添一条 `exports` 缺口）；③「**收益侧只有 2 个消费者**」——为 45 行左右的通用件动冻结包不划算。

**排除 (c)**（#147 原文）：「技能包之间零依赖是本仓的分界……`skill-bill` 的 `package.json` 里出现 `skill-calorie` 会让两条技能线从此绑死版本与发布节奏。省下的代码量（45 行）远小于代价。」

**为什么 (b) 的重复这次可接受**（#147 自称「对抗式：这条最该被质疑」）：复制的面很窄且窄于原件；重复的是「不变量」（`#128` 并发同秒不得互相覆盖、`#83` 绝对路径回执）不是业务；紧接着的锁票（`#148`）会用 CLI 级真 spawn 用例把它钉住——「两条技能各有一份自己的锁，反而比共享件更早暴露漂移」。

**不搬的三样**（#147 原文）：`inline`／`text` 两态、`DELIVERY_TEMPLATES` 分类表、calorie 的 `key→中文command`／`LEGACY_COMMAND_OVERRIDES`／动态段命名。

**两个 bill 特有的坑**（#147 要求写进实现注释）：

> - HELP 落盘**不要**过 `assertWritablePath` 的 tmp 哨兵——那是写库写键的测试隔离守卫，真机 `SKILLS_DB_PATH` 不是 tmp，过了就会把真机交付拦死；
> - 不往技能目录写固定名镜像（用户 Q10=A，照 #131 口径）。

两处已在仓内落地：`packages/skill-bill/src/fetch/paths.ts:32-44` 的 `assertWritablePath`（HELP 落盘路径不过它，只有 `bill.record.add`／`bill.record.update`／`bill.goal.write`／`bill.account.write` 过，见 `cmd_read.ts:118-120`）；固定名镜像无源码（`helpPaths.ts` 只出时间戳件）。

### 8.2 三条合流触发点（#147 原文，一字未改）

> ### 将来合流的触发点（任一条命中即起票把两边合流到 base-*，并把 #96 的冻结面重新划线）
>
> 1. 出现**第三个**消费者；或
> 2. base-paint 因别的原因要开交付类子路径；或
> 3. 这份逻辑出现**第二次 bugfix**（第一次＝#128／#83 已沉淀，若再改一次，说明不变量没稳，两份必然分叉）。

### 8.3 核对：私家大厨是不是第三个消费者？第 1 条是否已命中？

**先说清楚「消费者」指的是哪一份管线**（这一步决定结论）。`#147` 的问题句原文（`issue-147-body.md`）：

> 「饼干记账help」这次要交付两份产物（HELP 文件 ＋ 速查产物），它们的**落盘**与**命名**这两件事现在都住在 `packages/skill-calorie/src/` 里：`output.ts:deliverHtml`（`wx` 独占 ＋ `EEXIST` 递补 ＋ 绝对路径回执）与 `render/helpPaths.ts`（文件名主体与落点通式）。

所以「消费者」＝**落盘／命名管线**的消费者，不是通用 help 模板的消费者。两者数目不同，逐条实测：

**① 通用 help 模板（`base-paint/help-shell`）的消费者**：命令

```powershell
Select-String -Path 'packages/*/package.json' -Pattern 'base-paint'
```

实测命中 3 行：`packages/base-render/package.json`（`"name": "base-paint"`，定义处）、`packages/skill-calorie/package.json`、`packages/skill-bill/package.json`。**今天 2 家**（卡路里、记账）。chef 一旦加依赖即 **3 家**——但这一层 `#145` 已经裁过（模板必须走共享层，本图地图也照抄了这条），**不属票 4 要裁的对象**。

**② 落盘／命名管线的消费者**：命令

```powershell
Select-String -Path 'packages/*/src/**/*.ts' -Pattern "_html'|_html\""      # 找目录名常量
Select-String -Path 'packages/*/src/**/*.ts' -Pattern "from '.*output.js'|helpPaths"  # 找跨技能 import
```

实测：

- 产物目录名常量只有两处：`packages/skill-bill/src/render/helpPaths.ts:22`（`biscuit_accountant_html`）与 `packages/skill-calorie/src/render/helpPaths.ts:20`（`calorie_html`）。**今天 2 家**。
- 跨技能 import 该管线的：**0 处**（全文搜 `skill-calorie/src`／`skill-bill/src` 的 import，命中只有注释与文档引用）。即两份实现各自独立，谁也不走谁的接口——这正是 `#147` 说的「两份」。

**结论（只摆事实，不裁）**：

- **按落盘／命名管线算：私家大厨是第三个消费者。** chef 包今天**没有** `src/output.ts`（`Test-Path` 实测 `False`），也没有 `src/render/helpPaths.ts`——它今天**一个消费者都不是**；本图要交出「缺省落 HELP 文件」这个功能，就必然成为这一小块的消费者。**第 1 条因此命中**（与票面 `t1-body.md:18`、`t4-body.md:10` 的记法一致）。
- **按通用 help 模板算：私家大厨也是第三个**（卡路里、记账之后），但这一层本图已定案走共享层，不构成新裁决点。
- **另一个必须摆上桌的事实（本票新增）**：**居家管家那条并行线已经到了同一道门前**。`docs/skills/skill-home/t184-bill-recipe.md`（票 `#184`，**CLOSED**）已经产出与 bill 同形的照抄清单（:27 建议照抄 `helpPaths.ts` 换常量、:28 建议照抄 `output.ts`），而居家的裁决票 `#187`（「决策：命名落盘管线的归属＋缺省出口口径」）**今天仍 OPEN**，居家的出口票 `#190` 被 `#187` 阻塞（`gh issue list --search 'in:title 居家管家HELP'` 实测）。也就是说：**这一刻仓库里有两张地图（居家 `#183`、大厨 `#208`）同时等同一道裁决**，谁先落地谁就先成为「第三个」。这条只作为票 4 的输入摆出，本票不替它裁。
- **文档与代码不一致的第三点**：地图正文（`map-chef-body.md:31`）与 Q7 说明页（`docs/skills/skill-chef/决策待确认-Q7-管线归属.html:167`）都写着「三家今天其实早就在跑同一套动作，只是各抄了一份」——**代码实测只有两份**（卡路里、记账；居家与大厨都还没落）。仓内规则是「以代码为准，不以文档为准」，故本报告按「2 家 + 待落的第 3 家」记。
- **顺带实测到的一处现状漂移（复核时刻）**：`packages/skill-chef/SKILL.md:1-4` 的 frontmatter 已由并发会话补上，description 里写的是「`chef.help.lookup` **查怎么办**」——「怎么办」这一层意思就是「回一份该做什么的列表」，即**今天缺省行为的口径**。票 4 若判「缺省＝HELP 文件」，这一行 description 与「HELP 交付」节要同批改，否则说明面与行为对不上。

### 8.4 票 4 的三条路与代价（只列，不选）

出处：`packages/skill-bill/src/render/helpPaths.ts:3-6`／`output.ts:3-6`（裁决原文摘要）＋ `docs/skills/skill-chef/决策待确认-Q7-管线归属.html:171-211`（本图已备好的说明页，含用户 Q7 追问的原话）。

| 路 | 内容 | 代价（出处） |
|---|---|---|
| 甲 | 私家大厨自己再写第三份（＝照抄 bill 那两件，换常量） | 最小、最快，本图毫不耽误；与饼干记账当年的选择完全同形。代价：仓库里三份同逻辑，以后改命名要改三处；新规铁律一明写「把对方那份抄一遍放进自己目录，不算走了接口」——甲在新规下就是留违规（`决策待确认-Q7-管线归属.html:174-183`） |
| 乙 | 现在就建共用件，三家一起改成走它 | 一次摆正新规下唯一会留违规的地方；不丢自定义（目录／文件名主体／整页 HTML 三个入参照传）。代价：要新建一个**发布包**（不能塞进 base-paint——那是零依赖纯渲染包、且被主动冻结），动到边界门与发布门；多一张票的工作量（同上 :185-195） |
| 丙 | 本图先自持把文件交出来；「要不要合并」单独立票 | 本图该交付的照交不误；拿到三份代码摆一起看清了再裁。代价：中间那段时间仓库里确实多一份抄件；合并被推迟（同上 :197-206） |

**量过的代价（同一页 :191／:210）**：边界门解冻「只需改一个数组一行 ＋ 补一条注释」（与我在 `tooling/check-boundaries.mjs:34-37` 实测一致）；发布门是显式清单（`tooling/check-publish.mjs:53-65` 的 `SKILLS`／`PLUGINS`／`PINNED`／`ALL13` 四个数组）。同页另记：说明页作者「原来推丙、现在改推乙」，理由是把两道门的实际代价量出来后，乙的代价从「动发版线」降成「多一张票」——**这是该页的推荐，不是裁决**；票 4 的答案仍在用户手里（用户 Q7 首轮原话：「Q7 问题没听懂是什么决策」，见 `map-chef-body.md:144`／:159）。

---

## 九、bill 的锁（用例）

### 9.1 四份测试文件（实测字节／行数由 §11.1 给）

| 文件 | 字节 | 行 | 覆盖 |
|---|---|---|---|
| `packages/skill-bill/test/help-delivery-144.test.mjs` | 8,267 | 146 | 模块级：命名通式／独占递补／`explicit` 覆盖／真 spawn 冒烟／失败 exit 5 |
| `packages/skill-bill/test/help-file-145.test.mjs` | 4,410 | 72 | 渲染接线：全页 HTML／5 键取值／三块可选键／`init_banner` 状态驱动／可复现 |
| `packages/skill-bill/test/help-exit-148.test.mjs` | 9,915 | 171 | **只经真 spawn**的 CLI 级出口锁 5 例 |
| `packages/skill-bill/test/wake-assets.test.mjs` | 5,366 | 93 | 内容资产：三层计数／字段／老 71 条摘要锁／与 `WAKE_TABLE` 双向对账 |

### 9.2 用例名逐条（从源文件抽，脚本 `.scratch/chef-help/t1/extract-tests.mjs`，输出留档 `bill-help-test-names.txt`）

`help-delivery-144.test.mjs`（`describe` ×４／`it` ×９）：

- `#144 命名与落点（零 IO）`：①时间戳与通式照老口径（本地时区、零填充、同秒 `_N` 从 `_2` 起）②落点＝`<dbDir>/biscuit_accountant_html/<主体>_<stamp>.html`（只出初候选、不建目录）③下一独占候选：`_N` 递增，无 `_N` 则 `_2`
- `#144 落盘（唯一入口）`：④独占写：同秒连写三次得本体／`_2`／`_3`，且各自内容不被覆盖 ⑤`deliverHtml`：返回绝对路径 ＋ 字节数；`explicit` 优先且为覆盖写；缺落点即抛
- `#144 端到端冒烟（真 spawn 出口）`：⑥缺省＝HELP 文件：stdout 给绝对路径，路径上真有全页 HTML，**且不建库**（:95 断言 `.db` 计数 0）⑦显式参数两支：`mode=lookup` 落速查表文件；`q` 只回命中不落盘 ⑧`--html` 显式覆盖：写到用户逐字给的路径（缺父目录也建）
- `#144 落盘失败＝exit 5`：⑨父级是文件时真跑 exit 5 且 stderr 有 `ERR 5`

`help-file-145.test.mjs`（`describe` ×１／`it` ×５）：全页 HTML：标题不重复技能名 ＋ 7 域／74 场景都在；5 键取值照老实样、`subtitle` 由计数派生；三块可选键照传；`init_banner` 状态驱动（已初始化 ⇒ `hidden`，键仍在）；可复现（同一 `now` 两次渲染逐字节一致；坏 Date 即抛）。

`help-exit-148.test.mjs`（`test` ×５）：

| # | 用例名 | 断言什么 |
|---|---|---|
| ① | 缺省＝HELP 文件：名字通式／落点／回执绝对路径，data 换成域级索引 | 名字匹配 `/^饼干记账_HELP_\d{8}_\d{6}(_\d+)?\.html$/`；落在 `biscuit_accountant_html/`；`delivery.path` 绝对且**存在**；`delivery.bytes` ＝ 落盘字节；`Object.keys` 恰为 `['version','skill','shape','key','data','delivery']`；`data` 域级索引 7／74／20 |
| ② | 壳层锁：产物 ＝ 共享 help 模板前后缀逐字 ＋ `help-data` 载荷 | 从 `base-paint/help-shell` 取 `HELP_SHELL_PREFIX/SUFFIX/DATA_OPEN/TITLE_SLOT`：前缀逐字（仅填标题槽）、后缀逐字、标题槽不许留占位；载荷 7 域／74 场景／两块 meta（逐字含 4 条 HELP 短语）／`subtitle` 含「74 场景 · 版本 2.0」／`contact` 三项 |
| ③ | 独占与递补：并发 6 次落点两两不同、内容互不覆盖 | 异步 `spawn` 起 6 个进程；六个落点互不相同、目录恰 6 份、每份内容与自己的回执字节数一致；同秒时各次占**不同槽位**且必有一次拿到本体名（**不**断言「首个不带 `_N`」——那是把进程调度当契约） |
| ④ | 两支产物互不串：缺省 HELP 文件 vs `mode=lookup` 速查表 | 两份名字不同、内容不同、**同时在**（互不覆盖）；速查表**不是** help 模板页（无 `help-data`）而是 `<section>` 分节页；速查 77 条 vs 缺省 7 行 |
| ⑤ | 参数与退出码矩阵（真出口）＋ 失败时 stdout 空 | `q`＋`mode` 互斥 → 2；`mode` 非法 → 2；未知 key → 3；缺 `SKILLS_DB_PATH` → 1；坏落点（父级是文件） → 5；失败时 **stdout 必须空**、stderr 带 `ERR <code>` |

`wake-assets.test.mjs`（`it` ×６）：三层结构 7／20／74（老 71 ＋ 新增 3）；场景字段齐／id 唯一／`status` 全空／`types` 用老词；老 71 条逐字锁（摘要）＋二次生成可复现；新增 3 条落在对应域/组；与口径层 `WAKE_TABLE` 双向对账（77 ＝ 4 HELP ＋ 73）；`HELP_WAKE_WORDS` 由口径层派生（4 条，不在场景目录）。

### 9.3 「真 spawn」是怎么做的

- 被测对象是**构建产物**：`const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js')`（`help-exit-148.test.mjs:17`），`NODE_BIN` 取 `process.execPath`（:18）。
- 同步版 `run()`（:27-32）用 `spawnSync(NODE_BIN, [BIN, ...args], { encoding:'utf8', maxBuffer: 64MB, env: envOf(dir) })`，`envOf(dir)` 只改 `SKILLS_DB_PATH`（:25）。
- 异步版 `runAsync()`（:35-46）用 `spawn`，注释写明「`spawnSync` 会把并发串成串行，测不出独占递补」（:34）。
- 断言前的统一守卫 `runOk()`（:48-54）：exit 0、stdout 是一行可解析 JSON、行数为 1。
- 该文件**不直接 import 任何被锁模块**（:6 写明「只经真 spawn，不直接调模块」）；唯一 import 的是 `base-paint/help-shell` 的四个字面量常量（:14），用于逐字比对。
- 红→绿用**变异自证**两次（MUT-A 改文件名主体、MUT-B `wx`→`w`），并踩实「还原源文件后必须 `tsc -b --force` 干净重建」，否则旧 `dist` 会造成「还原后仍红」的假红（B2 §7.1 引 #148 原文）。

### 9.4 这些锁里，哪些是私家大厨也必须有的

| 锁 | 私家大厨要不要 | 说明 |
|---|---|---|
| ① 名字通式／落点／回执绝对路径 | **要** | 通式换 `私家大厨_HELP_…`，落点换 `cook_html/help/`（**两段**，`basename(dirname(p))` 那一行要改写法） |
| ② help 模板前后缀逐字 ＋ `help-data` 载荷 | **要** | 常量与计数换（10 域／33 组／48 场景）；`HELP_SHELL_*` 从 `base-paint/help-shell` 直接取，不复制字面量 |
| ③ 并发独占递补 | **要** | 这一条是「绝不覆盖」的唯一机械保证；chef 侧必须同形（异步 `spawn`） |
| ④ 两支产物互不串 | **取决于票 4** | 若票 4 判「速查走显式参数」，就要有这一条；若判「不分名」则不需要 |
| ⑤ 参数与退出码矩阵 ＋ stdout 纯净 | **要** | 退出码口径 chef 与 bill 同源（0／1／2／3／4／5，`packages/skill-chef/src/cli/cmd_read.ts:35-38` 同一套 `fail()`）。⚠️ **改正（2026-09-12 复核）**：本格此前写「chef 今天没有 exit 5 的落盘失败路径」——**该句为假**。chef **已有两处 exit 5**：`packages/skill-chef/src/cli/cmd_read.ts:372-377` 的 `--html` 落盘分支（`catch { fail(5, 'HTML 写盘失败：' + o.html) }`）与 `:381` 的渲染失败分支。故这一格**不是「新加」而是「并入 HELP 那条路」**：HELP 落盘失败要与 bill 同形归到 exit 5，别新造第二套口径 |
| 「不建库」（144 的第 ⑥ 例 :95） | **要，且 chef 今天必红** | 实测 chef 跑一次 `chef.help.lookup` 就建出 `chef_data.db`（282,624 B）——这是本次要摆正的行为 |
| 「同名同秒三写不被覆盖」（144 第 ④ 例） | **要** | 模块级锁，与出口锁互补 |
| 资产锁（`wake-assets.test.mjs` 那 6 例） | **要** | 数字全换（10 域／33 组／48 场景；唤醒词换 chef 的 37 条／8 条命令），摘要锁的对象换成老厨骨架 |

---

## 十、不确定项与给票 4 的输入

### 10.1 不确定项（缺证据，本票无法定案）
1. **chef 有没有「技能数据世代版本」这个概念**：bill 的 `HELP_FILE_VERSION='2.0'` 是老口径 `summary.version`，语义不是 npm 包版本（`helpFile.ts:13-14`）。chef 老件的 `window.__HELP__` 载荷我**没有实测读**（`.scratch/chef-help/legacy-chef-help-payload.json` 是别的会话在 10:11 抽的，我未复核其对应字段），归票 3（取值调查）。
2. **chef 的「已初始化」怎么判**：bill 是「`existsSync(resolveDbPath())`」（`cmd_read.ts:85`）。chef 的库文件名是 `chef_data.db`（`packages/skill-chef/src/fetch/paths.ts:7`），但老厨家的初始化语义（有没有 `init-status` 之类）我没查，归票 3／票 6。
3. **chef 的首次使用横幅文案与 prompt 来源场景 id**：bill 取 `setup_init_wizard`，chef 老骨架里对应哪一条（「开始使用」域）**未定**，归票 2（对账）／票 3。
4. **`tooling/skill-html-snapshot.mjs` 的快照会不会被误伤**：`tooling/skill-html-snapshot.mjs:45` 的清单含 chef（`{ id:'chef', dir:'skill-chef', prefix:'CHEF', camel:'Chef', fill:'fillTemplate' }`，`tooling/skill-html.snapshot.json` 里有 8 条 `chef/frag/*` ＋ 8 条 `chef/tpl/*` 记录）。本图只**新增** HELP 文件、不动 `packages/skill-chef/templates/*.html` 与 `src/render/*` 的话，`pnpm snapshot:html:check` 应保持绿——但**我没有跑这道门**（只读调查，且工作树里有别的会话的未提交改动，跑门会踩到别人），故这一条是「应当」而非「实测」。
5. **§8.3 里「谁先落地谁就是第三个」的时序**：居家 `#187`（同题裁决票）与大厨 `#212` 都还 OPEN，仓内**没有**任何文件规定两张地图的先后。本票只报「两张图同时等这一道裁」。
6. **老厨 HELP 的载荷字段名两代不兼容**（地图 Notes :36）：老厨用单数 `type`（字符串）／10 键场景，通用 help 模板契约用复数 `types`（数组）／6 键场景。票 5 入库时必须二选一——本票没有核实 `wake-assets.ts` 那 6 个字段是否够装老厨的 10 键（bill 是 7 域／20 组／74 场景的同代老件，形状未必与老厨相同），归票 2／票 5。
7. **`chef.help.lookup` 改行为会不会撞别的门**：`tooling/check-publish.mjs:63` 把 `dsh-chef` 钉在 `chef.help.lookup` 上（**命令名**，不是行为），故只改缺省产物、不改命令名应当不红——但**我没有跑 `check-publish`**。

### 10.2 只能由票 4（`#212`）裁的问题

1. **命名落盘管线：自持第三份 / 现在就建共用件 / 本图自持＋合并另立票**（三条路与代价见 §8.4）。第 1 条合流触发点已命中（§8.3 的两条实测），铁律一又禁止原地抄一份——**这一格本票不出答案**。
2. **缺省出口口径**：照 `#139`／`#144` 的判法「缺省＝HELP 文件、速查走显式参数」，还是保留今天 `chef.help.lookup` 回一份列表的缺省行为（`t4-body.md:14-17`）。
3. **速查支的产物名与落点**：老家没有这一支（老技能只有一个 HELP）；卡路里给了 `卡路里_速查台_<TS>.html`、记账给了 `饼干记账_速查表_<TS>.html`（`map-chef-body.md:92`）。私家大厨要不要分名、叫什么。
4. **`combo` 侧要不要同步登记**（`t4-body.md:21`）。
5. **若判「收成共用位」，共用件住哪个包、子路径叫什么**：`#147` 只说「合流到 `base-*` 并把 `#96` 的冻结面重新划线」，没说落点（B2 §未解第 2 条同此）。

### 10.2b 已定案的一条（不是不确定项，票 4／票 7 照此办）

8. **`_N` 递补起步值：chef 用 `_1` 起，不照抄 bill 的 `_2`**（2026-09-12 编排方实测裁定，票 4／票 7 必读）。
   - **bill 的真源码是 `_2` 起**：`packages/skill-bill/src/render/helpPaths.ts:13`「同秒递补从 `_2` 起」、`src/output.ts:26`「无 `_N` 则 `_2`」。
   - **老家的真源码是 `_1` 起**：`D:\2Study\StudyNotes\SKILLS\私家大厨\scripts\align_08.py:52-65`——`# ── 2. `_N` 后缀防覆盖(12.X 共同基础 · N=1 起步)`，docstring「首次 → `<stem><ext>`；冲突 → `<stem>_1<ext>` / `<stem>_2<ext>` …(N=1 起步)」，实现 `n = 1; while ...exists(): n += 1`。
   - **裁定：chef 照老家 `_1` 起**。三条理由：① 用户已定「通式不变」；② `CookHub/help/` 里躺着老产出（`私家大厨_HELP_20260820_154416.html`），同一目录下编号语义须与历史件一致；③ 肉眼验收第一眼即文件名。
   - 两套语义差别：bill 的 `_N`＝「第 N 次落盘」（首试无后缀 ＝ 第 1 件），老家 `_N`＝「第 N 件带后缀的递补」（无后缀 ＝ 首件）。**等价但数字差 1，不许混用。**

### 10.3 本票给票 4 的三个「带上桌」事实（比票面已有的更新）

1. **落盘／命名管线的消费者今天实测是 2 家，不是 3 家**：跨技能 import 该管线 **0 处**（代码为准）；居家与大厨都还没落。票面与说明页写的「三家早就在跑同一套动作」与代码不符。
2. **居家管家那条线已经到了同一道门前**：`#184`（居家票 1）**CLOSED** 且已产出「照抄 bill 的 `output.ts`／`helpPaths.ts`」清单（`docs/skills/skill-home/t184-bill-recipe.md:27-28`），居家的裁决票 `#187` **OPEN**。两张地图同时等同一道裁。
3. **`chef.help.lookup` 现在会建库**：实测跑一次得 `chef_data.db` 282,624 B。这是票 4 裁「缺省出口口径」时绕不开的现状——bill 的对应行为是「跑完不建库」（`test/help-delivery-144.test.mjs:95` 锁住）。

---



### 10.4 A 席审查点出、本席复核属实的六条漏件（票 6／票 7 必读）

2026-09-12 编排方逐条复核（证据：`docs/skills/skill-chef/t1-review-A.md` ＋ 本席独立实测），六条**均成立**，补入此处：

1. **`packages/skill-chef/test/cli.test.mjs` 必改（最贵的一条）**：`:59-61` 是
   `const all = run(['chef.help.lookup']); assert.equal(all.status, 0); assert.equal(JSON.parse(all.stdout).data.total, 37);`
   ——**这条既有锁钉死了「缺省回 37 条列表」**。票 7 一改缺省为「落 HELP 文件」，它**必红**。bill 当初同步改了 `packages/skill-bill/test/cli.test.mjs`（提交 `bfc51bf`），chef 侧要同办。
2. **`packages/skill-chef/src/render/errors.ts` 要加 help 缺数据码**：现值是 6 格联合，**没有** HELP 缺数据这一类；bill 侧对应的是 `BILL_HELP_MISSING_DATA`。归票 6。
3. **`packages/skill-chef/src/render/index.ts` 要转发新件**：现值恰 **7 行**；bill 的 `src/render/index.ts:8-17` 就是为新件加转发而存在的。归票 6。
4. **`pnpm-lock.yaml` ＋ `pnpm install` 要建 junction**：chef 的 `node_modules` 今天**只有 `base-link-core`**（实测），**没有 `base-paint`**；bill 的 `node_modules` 有 `base-link-core` ＋ `base-paint`。要 import `base-paint/help-shell` 必须先建链（bill 的 `f312f88` 带了 lock）。归票 6。
5. **`_N` 起步值冲突**：见本章第 8 条（已裁定 `_1` 起）。归票 4／票 7。
6. **`test/help-file-145.test.mjs`（72 行）未进 §二清单**：它是 bill 侧 HELP 交付的内容锁，chef 侧要有对应件。归票 6。

---

## 十一、证据目录

实验件全部落 `D:\ilife\.scratch\chef-help\t1\`（本票只写这里与交付文件本身）。

| 文件 | 内容 |
|---|---|
| `issue-147-body.md` | `gh issue view 147 --json body -q .body` 的原文（8,396 B），第八章 8.1／8.2 的 verbatim 出处 |
| `issue-147.json` / `issue-183.raw.json` / `issue-183-body.md` | #147／#183 的 JSON 与正文留档 |
| `bill-help-test-names.txt` | 四份测试文件的 `describe`／`it`／`test` 名（§9.2 的出处） |
| `extract-tests.mjs` | 抽用例名的脚本（只读） |
| `Test-Path-results.txt` | 44 条仓内路径的存在性 ＋ 字节数 ＋ LF 数（自检②的原始输出） |
| `probe-bill-default/` | bill 缺省分支的真跑产物目录（含 `biscuit_accountant_html/饼干记账_HELP_20260912_112225.html`，129,990 B） |
| `probe-bill-default.stdout.json` | 上面那次调用的 stdout（回执原文） |
| `probe-chef-default/` | chef 现状真跑后的目录（只多出 `chef_data.db`，282,624 B）——「看帮助会建库」的物证 |
| `probe-legacy-fields.mjs` | **（第二版新增）**只读解析老载荷的脚本：组结构／场景键集／`dimensions` 键集／`html`·`result`·`variants` 归属证据（§2.3、§四的出处） |
| `probe-legacy-fields.out.txt` | **（第二版新增）**上面那份脚本的输出（117 行） |
| `check-33-groups.mjs` | **（第二版新增）**「33 老组 → 10 域」机械换算与逐项对账脚本（§2.2 的复核出处；表体本身引用 `t1-review-B.md:54`，不是本脚本重算） |
| `check-33-groups.out.txt` | **（第二版新增）**上面那份脚本的输出：域数 10／组数 33／冲突组 0／与审查席一致 33/33／场景合计 48 |
| `gate-html-snapshot-check.txt` | **（第二版新增）**`node tooling/skill-html-snapshot.mjs --check` 的实测输出（§六：`changed=0`，185 件产物） |

### 11.1 · 逐件量尺寸与存在性（自检②的原始命令）

```powershell
cd D:\ilife
$paths = @( <第十一章开头列出的 44 条路径> )
foreach ($p in $paths) {
  if (Test-Path $p) {
    $b = (Get-Item $p).Length
    $lf = ([regex]::Matches([IO.File]::ReadAllText($p), "`n")).Count
    "{0,-62} OK   bytes={1,-8} LF={2}" -f $p, $b, $lf
  } else { "{0,-62} MISSING" -f $p }
}
```

输出（留档 `Test-Path-results.txt`，节选关键行）：

```
packages/skill-bill/src/render/helpFile.ts                     OK   bytes=8958     LF=182
packages/skill-bill/src/render/helpPaths.ts                    OK   bytes=3488     LF=55
packages/skill-bill/src/output.ts                              OK   bytes=5037     LF=86
packages/skill-bill/src/triggers/wake-assets.ts                OK   bytes=38556    LF=986
packages/skill-bill/scripts/gen-wake-assets.mjs                OK   bytes=12837    LF=254
packages/skill-bill/scripts/build-help.mjs                     OK   bytes=2096     LF=42
packages/skill-bill/src/cli/cmd_read.ts                        OK   bytes=30711    LF=526
packages/skill-bill/test/help-delivery-144.test.mjs            OK   bytes=8267     LF=146
packages/skill-bill/test/help-file-145.test.mjs                OK   bytes=4410     LF=72
packages/skill-bill/test/help-exit-148.test.mjs                OK   bytes=9915     LF=171
packages/skill-bill/test/wake-assets.test.mjs                  OK   bytes=5366     LF=93
packages/skill-bill/SKILL.md                                   OK   bytes=14639    LF=126
packages/plugin-bill-ilife/src/skill-provider.ts               OK   bytes=5079     LF=128
packages/plugin-chef/src/skill-provider.ts                     MISSING
packages/skill-chef/src/cli/cmd_read.ts                        OK   bytes=22335    LF=388
packages/skill-chef/scripts/build-help.mjs                     OK   bytes=1452     LF=28
packages/skill-chef/SKILL.md                                   OK   bytes=6985     LF=74
packages/skill-chef/package.json                               OK   bytes=844      LF=33
```

改正（2026-09-12 复核 `Test-Path-results.txt` 逐行）：**44 条里恰好 1 条 MISSING**——`packages/plugin-chef/src/skill-provider.ts`（票 10 的交付物，取证时尚未存在；复核时已由本图票 10 建成，属并发改动）。此前写「唯二 MISSING」并把 `packages/skill-chef/src/output.ts` 算进去是**错的**：该路径**根本不在那 44 条清单里**（它只在正文里作为「chef 今天没有落盘点」的反证使用，`Test-Path` 实测 `False`，但未列入清单）。

### 11.2 · bill 缺省分支真跑（本票最重的一条实测）

```powershell
cd D:\ilife
$probe = 'D:\ilife\.scratch\chef-help\t1\probe-bill-default'
New-Item -ItemType Directory -Force -Path $probe | Out-Null
$env:SKILLS_DB_PATH = $probe
node packages/skill-bill/dist/cli/cmd_read.js bill.help.lookup
```

输出（exit 0；完整 JSON 留档 `probe-bill-default.stdout.json`）：

```
{"version":"0.1.0","skill":"bill","shape":"list","key":"bill.help.lookup",
 "data":{…,"total":7,"sceneTotal":74,"subgroupTotal":20,"mode":"file","bytes":129990},
 "delivery":{"mode":"file","path":"D:\\ilife\\.scratch\\chef-help\\t1\\probe-bill-default\\biscuit_accountant_html\\饼干记账_HELP_20260912_112225.html","bytes":129990}}
```

产物核对（PowerShell ＋ 正则）：

```
bytes=129990
title=饼干记账 · 使用手册(HELP)
has help-data open: True
groups=7   scenes=74
meta_blocks=help_summary,help_wake_words
subtitle=7 功能域 · 74 场景 · 版本 2.0 · 更新于 2026-09-12 11:22
version=2.0   skill_name=饼干记账   contact items=3
top-level keys=contact,groups,init_banner,meta_blocks,skill_name,subtitle,title,version
```

同一目录下 `.db` 文件计数 **0**（`Get-ChildItem -Recurse -File -Filter '*.db' | Measure-Object` → `Count = 0`）→ 印证「看帮助不建库」。

### 11.3 · chef 现状真跑（对照）

```powershell
cd D:\ilife
$probe = 'D:\ilife\.scratch\chef-help\t1\probe-chef-default'
New-Item -ItemType Directory -Force -Path $probe | Out-Null
$env:SKILLS_DB_PATH = $probe
node packages/skill-chef/dist/cli/cmd_read.js chef.help.lookup
```

输出（exit 0）：stdout 是一份 `{"version":"0.1.0","skill":"chef","shape":"list","key":"chef.help.lookup","data":{"items":[ … 37 条 … ],"total":37}}`——**没有 `delivery`**；stderr 有 `NOTE: 大厨 DB 已初始化：…\chef_data.db`。

跑完后目录内容：

```
chef_data.db  282624 bytes
```

→ ①默认只回列表、不落文件；②**会把库建出来**。

### 11.4 · 内容资产计数（以运行时代码为准，不用 grep 数数）

```powershell
cd D:\ilife
node -e "import('./packages/skill-bill/dist/triggers/wake-assets.js').then(m=>{ … })"
node -e "import('./packages/skill-chef/dist/policy/index.js').then(m=>{ … })"
```

输出：

```
WAKE_GROUPS 7 / WAKE_ASSETS 74 / WAKE_ASSET_TOTAL 74 / SCENE_BY_ID keys 74
HELP_WAKE_WORDS ["饼干记账 HELP","饼干记账帮助","查帮助","能做什么"]
domains write/写入/3sub/16sc | query/查询/3sub/17sc | analysis/分析/7sub/25sc |
        goal/目标/2sub/4sc | account/账户/1sub/4sc | link/联动/1sub/2sc | setup/开始使用/3sub/6sc
--- chef ---
total 37
  chef.help.lookup -> 4 ; chef.recipe.view -> 7 ; chef.recipe.search -> 8 ; chef.recipe.write -> 4
  chef.cooking.run -> 4 ; chef.shopping.query -> 4 ; chef.history.record -> 3 ; chef.history.query -> 3
HELP phrases: ["私家大厨HELP","菜谱HELP","查帮助","能做什么"]
```

### 11.5 · 三个消费者计数（第八章 8.3 的出处）

```powershell
cd D:\ilife
Select-String -Path 'packages/*/package.json' -Pattern 'base-paint'
Select-String -Path 'packages/*/src/**/*.ts' -Pattern "_html'|_html\"" 
Select-String -Path 'packages/*/src/**/*.ts','test/*.mjs' -Pattern "skill-calorie/src|skill-bill/src"
```

输出摘要：`base-paint` 出现在 `base-render`（定义）＋`skill-calorie`＋`skill-bill`；目录名常量只有 `calorie_html`（`skill-calorie/src/render/helpPaths.ts:20`）与 `biscuit_accountant_html`（`skill-bill/src/render/helpPaths.ts:22`）；跨技能 import 命中 0 处（只有注释／文档引用）。另 `cook_html`／`CookHub` 在 `packages/` 下**只有 1 处命中**，是 `packages/skill-chef/src/fetch/paths.ts:2` 的一句注释——即**本图的新落点尚未有任何代码实现**。

### 11.6 · 实跑过的其它只读命令

```powershell
git status --porcelain=v1          # 工作树状态（别的会话有未提交改动，本票未碰）
git rev-parse --abbrev-ref HEAD    # master
git log --oneline -15 --all -- packages/skill-bill/src/render/helpFile.ts packages/skill-bill/src/output.ts packages/skill-bill/test/help-exit-148.test.mjs
git show --stat --oneline 848b7a4 f312f88 bfc51bf 1f86e7b 0364326 fe1117e
gh issue view 147/183/208/209 --repo FeatherHunter/ilife --json …
gh issue list --repo FeatherHunter/ilife --state all --search 'in:title 居家管家HELP'
```

`git show --stat` 的六个提交（bill 侧八个件的落点，与 `docs/skills/skill-home/t184-bill-recipe.md:12-19` 记的一致）：

| 票 | 提交 | 落的件 |
|---|---|---|
| `#146` | `848b7a4` | `scripts/gen-wake-assets.mjs`（254）＋`src/triggers/wake-assets.ts`（986）＋`test/wake-assets.test.mjs`（93）＋`package.json` |
| `#145` | `f312f88` | `src/render/helpFile.ts`（153）＋`render/index.ts`＋`render/errors.ts`＋`package.json`；连带 `base-render/scripts/gen-help-shell.cjs`＋`src/helpShell.ts`＋`test/help-shell-136.test.mjs`；`tooling/check-boundaries.mjs` |
| `#144` | `bfc51bf` | `src/output.ts`（86）＋`src/render/helpPaths.ts`（55）＋`src/cli/cmd_read.ts`（92 行改动）＋`test/help-delivery-144.test.mjs`（146）＋`test/cli.test.mjs` |
| `#148` | `1f86e7b` | `test/help-exit-148.test.mjs`（171，单文件） |
| `#149` | `0364326` | `SKILL.md`（＋12 −2） |
| `#150` | `fe1117e` | `plugin-bill-ilife/src/dsh-ctx.ts`＋`skill-provider.ts`＋`index.ts`＋`test/skills-provider.test.mjs`＋`skill-bill/SKILL.md`＋`package.json` |

另：`c95892d chore(wording): bill 侧「共享壳」全量改「共享 help 模板」`——用词纪律那一次返修也在这条线上。

### 11.7 · 未跑的门（如实声明）

**没有跑**任何门（`pnpm boundaries`／`pnpm test`／`pnpm snapshot:*`／`npx tsc -b`／`check-publish`）。原因有二：①本票是只读调查；②工作树里有别的会话的未提交改动（`git status` 的 30 项，含 `packages/skill-calorie/**` 与 `docs/skills/skill-calorie/**`），仓级命令会踩到别人。故 §10.1 的第 4、7 两条是「应当绿」而非「实测绿」。

---

## 自检（交付前做完，结果如下）

### ① 每个结论都可追溯

本报告每条结论后面都带路径:行号或命令＋输出。抽查三条复核：

| 抽查 | 结论 | 复核动作 | 结果 |
|---|---|---|---|
| A | `bill.help.lookup` 在**开库之前**分派 | `read packages/skill-bill/src/cli/cmd_read.ts` :493-495 读原文 `const help = key === 'bill.help.lookup' ? dispatchHelp(params) : null;`；＋ §11.2 实跑产物目录 `.db` 计数 0 | **成立**（两条独立证据） |
| B | chef 的 `chef.help.lookup` 今天**会建库** | `read packages/skill-chef/src/cli/cmd_read.ts` :97-99（`dispatch` 第一行 `openChefDb`）＋ :327-331（HELP 是 `dispatch` 里的 `case`）；＋ §11.3 实跑得 `chef_data.db` 282,624 B | **成立**（代码 ＋ 实跑一致） |
| C | 落盘／命名管线的消费者今天实测 2 家 | §11.5 三条 `Select-String`：目录名常量只有 `calorie_html`／`biscuit_accountant_html` 两处；跨技能 import 0 处；`cook_html` 在 `packages/` 下只 1 处注释命中 | **成立**；并据此纠正了票面／说明页「三家早就在跑同一套」的说法（标为待票 4 注意的更正项） |

### ② 照抄清单里的每个仓内路径都真实存在

逐条 `Test-Path`（§11.1，44 条），原始输出留档 `Test-Path-results.txt`。结果（**取证时刻**）：**43 条存在／1 条 MISSING**（改正：此前写「42 条存在」，按留档逐行实数应为 43）；`packages/plugin-chef/src/skill-provider.ts` 标为「不存在（经查）」（票 10 的交付物，复核时刻已由并发会话新建）；`packages/skill-chef/src/output.ts` 亦不存在，报告里只作为「chef 今天没有落盘点」的反证使用，未列入清单的「照抄」列。

⚠️ **工作树在漂移**（`git status` 复核，本会话之外）：`packages/skill-chef/SKILL.md`、`packages/skill-chef/package.json` 已被改（frontmatter ＋ `files` 补 `SKILL.md`）；`packages/skill-chef/scripts/add-frontmatter-218.mjs`、`packages/plugin-chef/src/skill-provider.ts`／`dsh-ctx.ts`／`test/skills-provider.test.mjs`／`tsconfig.client.json`／`tsdown.config.ts` 为新增未跟踪。故本报告凡涉及这些路径的行都写了「取证时刻／复核时刻」两段；**报告里的键结论（分派位置、建库行为、消费者计数、落点差异）不依赖这些漂移件**。`packages/skill-chef/src/output.ts` 在两次检查中都不存在——这一条不受漂移影响。

### ③ 数字都用命令实测

行数（LF 计数）、字节数（`Get-Item .Length`）、出现次数（`Select-String`）全部来自命令输出；JSON 计数（7 域／20 组／74 场景／37 条唤醒词）用 `node -e` 跑构建产物里的运行时代码数出来，**不用 `grep` 数**（地图 Notes :35 的计数陷阱：payload 里 `scenario_id` 出现 96 次但只有 48 个场景对象）。原始输出全部留档于 `.scratch/chef-help/t1/`。

### ④ 「卡的专有」与「bill 的通用」没搞混

逐一核对：

- **不抄卡路里的**：`chineseCommandFor`（命令名→中文段落映射）、`LEGACY_COMMAND_OVERRIDES`、`DYNAMIC_COMMAND_SEGMENTS`／`dynamicSegmentFor`、`writeSuffixFor`、三态 `HtmlDelivery`（含 `inline` 只读回退）、`resolveReceiptHtmlPath`、`resolveDefaultHtmlPath` 的多段拼接、`helpShell.ts` 转发件、`helpCenter.ts`。清单里这 3 行全部标「**不抄**」，且给出 bill 侧的原话依据（`packages/skill-bill/src/output.ts:3-6`、`helpPaths.ts:4-6`）。
- **不抄 bill 专有的**（清单里已逐条标出）：`biscuit_accountant_html`／`饼干记账_HELP`／`饼干记账_速查表`／`bill.help.lookup`／`bill-cmd-read`／7 域 20 组 74 场景／`version='2.0'`／`HELP_INIT_SCENE_ID='setup_init_wizard'`／`HELP_CONTACT` 三项／首次使用横幅的三段文案。私家大厨对应换 `cook_html/help`／`私家大厨_HELP`／`chef.help.lookup`／`chef-cmd-read`／10 域 33 组 48 场景。
- **通用、可整段搬的**（与技能名无关的机制层）：「缺省＝交付物 ＋ 显式参数走速查」的判法、`wx` 独占 ＋ `EEXIST` 递补 ＋ 绝对路径回执的语义、回执顶层追加 `delivery` 只加不改、真 spawn 锁 ＋ 变异自证的锁法、只读页不开库、计数一律派生、`init_banner` 键常在而显隐走 `hidden`、`--check` 生成器纪律。
- **一处易混点已单独标出**：`packages/skill-chef/templates/help.html`（chef 自带的「现找」页模板）与共享 help 模板是**两件不同的东西**，清单里已写明「不抄、不要」。

### 11.8 · 第二版（整改轮）新增的实测（**全部只读、只新增文件，未改任何 `packages/` 下文件**）

```powershell
cd D:\ilife
node .scratch/chef-help/t1/probe-legacy-fields.mjs      # 老载荷分组／键集／字段归属
node .scratch/chef-help/t1/check-33-groups.mjs          # 33 老组 → 10 域 的机械换算与逐项对账
node tooling/skill-html-snapshot.mjs --check            # 快照门（只读）
```

实测输出（节选）：

```
# probe-legacy-fields.out.txt
wake_words(老一级组) = 33 ; scenarios(叶子) = 48
场景键集：count=35 keys=…(10 键) ; count=13 keys=…(多一个 domain)
dimensions：48/48 都有；去重键数 = 42；空对象 2 条（list_all_recipes, first_use）
status：唯一取值 ""
type（单数）去重数 = 11
html keys=command_cn,data_source,template（48/48）；template 目录名 10 种；command_cn 去重 33 且 48/48 = wake_word
result 非空 48/48；长度 min/中位/max = 13/38/91
variants：48/48 = array(len=0)；非空 0 条
含 {…} 占位符的条数 = 16 / 48（占位符去重 {N} {菜名}）
叶子 48 条都能在组内找到归属 = true

# check-33-groups.out.txt
域数 = 10；组数 = 33；冲突组 = 0
与 t1-review-B.md:54 的表逐项对账：一致 = 33 / 33；差异条数 = 0
场景数按域合计 = 48；域内组数合计 = 33

# gate-html-snapshot-check.txt
OK: 5 技能 HTML 快照 == 实际（185 件产物，base-* 指纹 6fb8f1117564334955005b5f2a3352f1，base-* 文件 26 件）
RESULT: artifacts=185 changed=0 added=0 removed=0 base-* fingerprint=6fb8f1117564334955005b5f2a3352f1
```

**本席实测、但初版写错或没写的三处数字更正**（都已在正文就地改）：`dimensions` 去重键 **42**（地图 Notes 与初版记 41）；`{…}` 占位符 **16/48**（占位符只有 `{N}` 与 `{菜名}` 两种；⚠️ 本席第一版脚本用 `/g` 正则的 `.test()` 数出 9/48 的**错值**——`lastIndex` 跨调用推进会漏记，已改成每次重造正则并复查为 16）；`src/fetch/db.ts` **LF=451**（地图记「约 433」）。
