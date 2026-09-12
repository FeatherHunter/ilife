# t179＋t180 结构设计（必报五步 · 第二步）

> 票：`#179`（场景 07 基础信息 · 页面装配与那条只读页面命令）＋ `#180`（唤醒词数据里的脚本命令清理）。**本文件只报形状**，不动代码、不建目录。
> `#179` 会先在 `src/cli/cmd_read.ts` 里加一条命令分派；重构票 **#181** 会把那条分派一并纳入（细节见第一节末）。
> 结构判据 `docs/agents/structure.md`；用词沿 `docs/agents/wording.md`（配置型页面的中文一律写「预检确认页」；整页模板写「共享页面模板」）。
> 行数口径：本文件用 LF 计数（`[IO.File]::ReadAllText` 数 `\n`）；既有结论里的行号按各文件当时的原文。

## 一、能力目录落点（#179）

```
packages/skill-calorie/src/profile/        ← 目录名＝能力名（HELP 一级分组「基础信息」）
├─ setup.ts                                ← 文件名＝该组下一级子功能（「设置资料」）
├─ update.ts                               ← 「改资料」
└─ view.ts                                 ← 「看档案」
packages/skill-calorie/src/shared/         ← 共用位（与能力目录并列，里面不出现任何能力名）
└─ docPage.ts                              ← 整页装配共用件
```

### 名字映射：HELP 说法 → 英文名（用户 2026-09-11 裁定「代码目录一律用英文名」）

一行对应一处，右列是仓内既有说法的出处；英文名一律照仓内既有说法取，不自创：

| HELP 说法 | 英文名 | 依据（仓内既有说法） |
| --- | --- | --- |
| 基础信息（一级分组）→ 能力目录 | `src/profile/` | `src/triggers/scene-07-profile.ts:5` 的 `key` 前缀 `profile_setup`／`profile_set_activity`／`profile_update`／`profile_view`；命令名 `calorie.profile.set`／`calorie.profile.activity`／`calorie.profile.update`（`src/cli/keys.ts:44-46`）与 `calorie.view.profile`（`:107`） |
| 设置资料（子功能，含设置档案／设活动量两条写入词）→ 文件名 | `setup.ts` | `src/triggers/scene-07-profile.ts:5-6` 的 `key` `profile_setup` |
| 改资料（子功能，含改档案）→ 文件名 | `update.ts` | `scene-07-profile.ts:7` 的 `key` `profile_update` |
| 看档案（子功能，含查档案）→ 文件名 | `view.ts` | `scene-07-profile.ts:8` 的 `key` `profile_view` |

中英两边是同一批子功能，一一对上：设置资料→`setup.ts`、改资料→`update.ts`、看档案→`view.ts`；能力目录名 `profile` 与四条命令的 `profile` 段一致。三条写入词（设置档案／设活动量／改档案）共用的那**一页**住 `setup.ts`：这一页的字段面（身高／年龄／性别／活动量／备注）就是该子功能的题目（`scene-07-profile.ts:5-7`）。`update.ts` 要用就从**同目录**取用，不另起一个只做转手的包装（铁律五）。反过来把这一页放 `update.ts` 也合规，只要全仓只有一处定义。

起名只许取 HELP 的现成说法这条不变（铁律四）；「一律用英文名」是用户的裁定，压在铁律四之上，`docs/agents/structure.md:44-49` 待同批改。

那条只读页面命令的四处登记（票面已列，此处只记落点，避免实施时漏）：`src/cli/keys.ts:134-137` 之后追加一条；`packages/base-combos/combos.yaml` 镜像一条；`src/triggers/routing.ts:671-674` 之后追加一条；`src/cli/cmd_read.ts:545-551` 那个 `case` 同形。

**与重构票的关系**：这条只读页面命令要在 `src/cli/cmd_read.ts` 里加一条命令分派；那个文件今天 1209 行、超告警线，已另立一张跨批的独立重构票 **#181**（「卡路里：命令分派重构（cmd_read.ts 1209 行，超告警线）」，**不是 #152 的子议题**）。本票先在这个文件里加那一条分派，#181 会把这条分派一并纳入，并让分派层回到告警线以内。

## 二、每个文件对外给什么

| 文件 | 职责（一句） | 对外给几个 | 各一句 |
| --- | --- | --- | --- |
| `profile/setup.ts` | 设置档案／设活动量两条写入词的写前页（三条写入词共用的预检确认页）与写后回执页 | 3 | ① `buildProfileSettingView(db, raw)`：写前页取数——改前值（走 `src/fetch/profile.ts:58` `getProfile`，不用会抛 `missing-data` 的 `buildProfileView`）＋待写草稿＋活动量五档（`src/fetch/profile.ts:22`）＋复制 prompt；② `buildProfileSettingDoc(v)`：写前页整页；③ `buildProfileSettingReceiptDoc(receipt)`：两条写命令的回执页（吃 `src/render/receipt.ts:43-54` 的 `CrudReceipt`） |
| `profile/update.ts` | 改档案的写后回执页（改前→改后对照） | 1 | `buildProfileUpdateReceiptDoc(receipt)`：吃 `CrudReceipt` 出整页回执 |
| `profile/view.ts` | 查档案结果页 | 2 | ① `buildProfileView(db)`：取数（今天在 `src/render/profilePlate.ts:21-33`，搬进本目录，同一个取数不留两处）；② `buildProfileViewDoc(v)`：结果页整页（`src/cli/cmd_read.ts:1014-1022` 的产出换成它） |
| `src/shared/docPage.ts`（共用位） | 把区块拼成整页 | 4 | ① `assembleDocPage({title,eyebrow,subtitle,content,charts})`：整页装配；② `promptCopyArea(prompt)`：复制 prompt 区；③ `dataCopyArea(title,input)`：复制数据区；④ `metricsOf(obj)`：度量投影（只收确定数字） |

**只在目录内用、不对外给的**（`structure.md:94`「只有出这个目录才算对外」）：

- 「档案现值 ＋ 最新体重」那一句查询（今天在 `src/render/profilePlate.ts:27`；`docs/skills/skill-calorie/t163-reusable-inventory.md:99` 已把它标成本票的选择点）：结果页与写前页都要它，在目录里只写一份（放 `profile/view.ts`），另一处从同目录取用，不对外给。
- 写前页整页函数被 `profile/update.ts` 取用：同目录内部调用，不进对外清单。

核对：三个文件的对外件是 3／1／2，共用件 4，都 ≤5（铁律五）；视图类型的字段按 ≤8 设计（写前页视图预计 5 个：改前值／草稿／活动量五档／prompt／已填数）。

## 三、共用位：整页装配件 7 份 → 1 份

今天那件东西被抄了 7 份，逐份给位置（`const DOC_SHELL` ＋ `function assemble`）：

| 文件 | 共享页面模板常量 | 装配函数 |
| --- | --- | --- |
| `src/render/wizardPortDocs.ts` | `:41`（无图表变体） | `:49` |
| `src/render/dietDocs.ts` | `:60`／`:67` | `:75` |
| `src/render/nutritionPortDocs.ts` | `:45`／`:52` | `:60` |
| `src/render/sportDocs.ts` | `:57`／`:64` | `:72` |
| `src/render/sportPortDocs.ts` | `:48`／`:55` | `:63` |
| `src/render/trendDocs.ts` | `:44`／`:51` | `:59` |
| `src/render/trendMiscPortDocs.ts` | `:38`／`:45` | `:53` |

本席逐份取原文比对：7 处的模板除 `<title>` 一行外**逐字相同**——每处标题各不相同（例：`dietDocs.ts:63` 是「卡路里·饮食」、`trendMiscPortDocs.ts:41` 是「卡路里·趋势其他移植」），所以共用件必须把标题当参数收；6 处装配函数逐字相同，`wizardPortDocs.ts` 那一处只是少了图表分支。

同一性质、一起算的还有三样：`copyBlock` 6 份（`dietDocs.ts:90`／`nutritionPortDocs.ts:75`／`sportDocs.ts:87`／`sportPortDocs.ts:78`／`trendDocs.ts:74`／`trendMiscPortDocs.ts:68`）、`metricsOf` 6 份（`wizardPortDocs.ts:64`／`nutritionPortDocs.ts:85`／`sportDocs.ts:97`／`sportPortDocs.ts:88`／`trendDocs.ts:93`／`trendMiscPortDocs.ts:78`）、`promptCopy` 1 份（`wizardPortDocs.ts:78-80`）。

**放哪**：`packages/skill-calorie/src/shared/docPage.ts`（共用位）。理由：结构纪律的「能力目录：`src/` 下第一层必须是能力名」——把新文件放在 `src/` 根上，第一层就多了一个非能力名的条目；共用位与能力目录并列才合规（`shared/` 里不许出现任何能力名，`structure.md:67`）。src 根上那几个旧共用文件（`kcal.ts`／`paths.ts`／`schema.ts`／`output.ts`）属存量，按「就地摆正、不顺手扩大范围」这次不动。票面 `甲-1` 写的 `src/render/docPage.ts` 不取：那是把新件放进待重排的工种目录，重排时还得再搬一次。`profile/` 的三个文件与 7 个页面文件都按 `../shared/docPage.js` 引用它。

**谁引用（写得出哪两个能力在用）**：**`profile`（HELP 说法「基础信息」）**（新页与回执页，`profile/*.ts`）与**身体细节／身材照片**（`src/render/wizardPortDocs.ts` 那四页：记围度／记体脂／记身材照／GIF，`src/cli/keys.ts:134-137`）。7 个文件全改完后，饮食／运动／分析也一并引用它。

**要不要改那 7 个既有文件：要。** 不改成引用，定义就从 7 处变 8 处（旧 7 ＋ 新 1），那正是铁律二禁止的。改法每个文件一样：删三样（模板常量／装配函数／同名小件）＋加一行 import，**调用点一字不动**；`wizardPortDocs.ts` 的 `copyBlock` 多一个没用的 `key` 参数（`:72` `void key`），顺手去掉。

新页自己不需要再抄任何一件：区块全走 `base-paint/blocks` 的公开接口，复制按钮走现成的 `src/render/copy.ts`（`copyActionHtml`，`wizardPortDocs.ts:33` 同路数）；`copy.ts` 今天只有一份定义，不是本次要合并的对象。

## 四、这次不动的

- 不搬 `src/` 其余按工种分的目录（`cli/`／`fetch/`／`db/`／`migrate/`／`analysis/`／`triggers/`）与 `src/render/` 里另外 30 多个文件：整包按域重排要连带改 30～40 个调用点与 6 个测试文件，属单独一张票（`structure.md:68`「就地摆正」不等于顺手扩大范围）。
- 不改其余 9 个场景数据文件：`#179` 只碰 `scene-07-profile.ts:5-7` 的 prompt 文本。
- 不合并 `fmt`（6 个 `*Docs.ts` 各一份，`src/render/html.ts:66` 那份签名还多一个 suffix）与 `DOC_VERSION`／`DOC_SKILL`（7 份各一份；它们的正本本应是 `src/cli/keys.ts:14-15`，但页面那一侧不允许反向引用 `cli/`）——登记为已知偏差，留给整包重排那张票。
- 不动 `templates/` 六件模板（`packages/skill-calorie/test/skill-t11.test.mjs:55-69` 钉住清单）、不动 `base-render`／`base-paint`（`#163` 已裁：预检确认页留卡路里公共层）。
- 不改 `src/render/index.ts` 的出口：今天四个预检页也不经它（`src/cli/cmd_read.ts:77`／`:80` 直接引用），新件照同一路数。

## 五、#180 的两个落点（只给落点，不动手）

**① 23 条补偿字符串的落点：`src/triggers/routing.ts`，就地写成字面文本**——`:152-160`（9 处）、`:374-383`（10 处）、`:389`（1 处）、`:534-535`（2 处），共 22 处 `cli` 值；同时删掉 `:33` 那一行 import。第 23 条 `goal_view_predict`（`src/triggers/help-lookup.ts:95`）在生产代码里没有用它的地方，只有 `test/calorie-routing-81.test.mjs:158` 引用，随那套常量的重导一起处理。

`help-lookup.ts:154`／`:162` 这两处合成首命中的命令文本，建议改为取入参 `triggers` 里那条唤醒词的 `main_prompt.cli`（`:38` 已经是同一来源）：既不留第二份字面（铁律二），也不必让 `help-lookup.ts` 反向引用 `routing.ts`。

**票面漏的第四处源码**：`src/triggers/index.ts:15` 在同一行再导出了 `HELP_EXEC_OVERRIDES` 与 `execCliFor`，删表必须同批改这一行，否则编译断（`execCliFor` 数据干净后退化成原样返回，同批删）。注释里的数同批改：`src/render/helpCenter.ts:22`（341/436）、`:25-26`（376/436）、`:28`（95 条）。

**② `src/triggers/help-lookup.ts` 该不该挪：不挪。** 它不是 10 个能力里任何一件——它装的是技能级查找入口（唯一出口是 `src/cli/cmd_read.ts:839-852` 的 `calorie.help.lookup`），铁律四的「能力目录名取自一级分组」管不到它；今天住 `triggers/` 是整包按工种分目录的存量问题，一起留给重排那张票。若一定要挪，代价是：源码 2 处（`triggers/index.ts:15`；`routing.ts:33` 在 `#180` 做完后已删）、测试 2 个文件（`test/calorie-routing-81.test.mjs:6`、`packages/skill-calorie/test/diet-homogeneity-108.test.mjs:18`）、`docs/research/` 下 4 个证据脚本（`t63-line1-review-probe.mjs`／`t63-line1-review-paramflips.mjs`／`t81-route-evidence.mjs`／`t106-probe-cli.mjs`），外加 `docs/skills/skill-calorie/py-hardcode-scan.md:49` 一类文档里的行号全部失效。

**③ 一次性脚本的落点**：快照重算脚本住 `packages/skill-calorie/scripts/gen-sot-snapshot.mjs`（`structure.md:69`；同目录已有 `build-help.mjs`／`check-examples.mjs`／`migrate-calorie.mjs`）。

## 六、需要用户点头的那一句

> 「我准备在 `packages/skill-calorie/src/` 下新建一个能力目录 `profile/`（里面三个文件 `setup.ts`／`update.ts`／`view.ts`——名字取自 HELP 的「基础信息」组和它下面三个子功能「设置资料」／「改资料」／「看档案」，按用户 2026-09-11 的裁定写成英文，映射见第一节），并新建一个共用位 `shared/docPage.ts`：把今天被抄成 7 份的整页装配件合并成一份，7 个既有页面文件（分属饮食／运动／分析／身体细节／身材照片 5 个能力）改成引用它。请点头或改道。」

两条触发条件都在这句话里：新建目录层级（`structure.md:88` 第一句），以及要碰三个以上能力（同一条第二句，实测 5 个）。

## 七、风险与顺序

结构这三步（`#179` 里插在原顺序的第 2～4 步）：

1. **先落 `src/shared/docPage.ts`**（只加不删，7 个文件不动）→ 期望零测试红。
2. **落 `profile/` 三个文件 ＋ 那条只读命令的四处登记 ＋ 生成器两处** → 9 个固定计数断言当场红（逐个见 `t179-impact-list.md` §6A／§6B：`packages/skill-calorie/test/cmd-read-t11.test.mjs:80`、`cmd-write-40.test.mjs:72`、`output-naming-119.test.mjs:56`、`output-naming-87.test.mjs:111`、`render-t41.test.mjs:71`、`skill-t11.test.mjs:52`、`test/combos-42.test.mjs:145`、`calorie-routing-81.test.mjs:104/121/122`、`db-readonly-93.test.mjs:287`），另加 `scripts/check-examples.mjs`（示例缺一条即抛）与两个生成物未重跑（`test/combos-p8.test.mjs:115-127`）。
3. **7 个 `*Docs.ts` 逐个改成引用共用件** → 每改一个跑该域测试，并做「改前改后产物逐字比对」。受影响：`diet-homogeneity-108`／`sport-homogeneity-109`／`trend-homogeneity-110`／`exercise-port-111`／`nutrition-port-112`／`trend-misc-port-113` 六个域同质测试，加 `wizard-86`／`delivery-83`／`cli-smoke-t41`。这些测试只查形状（`wizard-86.test.mjs:53-59`：doctype／无残留标记／`ilife-page`／`<style>`／`<script>`），**不查字节**，所以字节比对要自己做（改前各落一份产物，改后逐字比）。

改的顺序：先 `wizardPortDocs.ts`（与新页同形、有 `wizard-86.test.mjs` 9 个用例兜着），再按域走 `dietDocs.ts` → `nutritionPortDocs.ts` → `sportDocs.ts` → `sportPortDocs.ts` → `trendDocs.ts` → `trendMiscPortDocs.ts`，一次一个文件、一步一跑。

**超线报警（第四步）**：这次要碰的既有文件里，超 350 行的有 `src/cli/cmd_read.ts` 1209／`src/cli/write.ts` 903／`src/triggers/routing.ts` 810／`src/render/dietDocs.ts` 652／`src/render/html.ts` 651／`src/render/sportDocs.ts` 609／`src/render/sportPortDocs.ts` 543／`src/render/trendMiscPortDocs.ts` 489／`src/render/trendDocs.ts` 484／`src/render/helpCenter.ts` 483／`src/render/nutritionPortDocs.ts` 374（`wizardPortDocs.ts` 313 不超）。动它们时当场报「已超线，需要根据规则进行重构。」，并说明这次只删不拆：各自装的是一个域的多页内容，拆它要连带动 6 个测试文件与 30～40 个调用点，属整包重排那张票。

**与 `#180` 的先后：`#180` 先、`#179` 后**（已定）。结构上 `#180` 不做任何搬迁，所以本设计的目录树不受它影响；两票同改 `scene-07-profile.ts`／`test/calorie-sot.snapshot.json`／`test/calorie-routing-81.test.mjs` 那套常量，一律排队。基线那条红（`docs/research/t81-exec-smoke.md:18` 自报「非零（失败）1」，而 `test/calorie-routing-81.test.mjs:300` 要求 0）与结构无关，但会挡住两票的「测试全绿」，开工前先裁。

## 八、我不确定／待核实

1. **目录名已定：`profile`**（用户 2026-09-11 裁定「代码目录一律用英文名」）。本设计原先按铁律四的判据取 HELP 给用户看的标签（`基础信息`），今天已改成英文：能力目录 `src/profile/`、三个文件 `setup.ts`／`update.ts`／`view.ts`，逐条依据见第一节的映射表。本仓 `packages/` 今天 0 个非 ASCII 目录名／文件名，这条裁定与既有事实一致。**这一条与第六节的点头绑在一起。**
2. **行数口径**：本席用 LF 计数，`cmd_read.ts` 1209／`routing.ts` 810／`html.ts` 651；两张影响清单上的数（1155／780／642）比这低约 4%，**推测**它们按 `Get-Content` 计数（本席同法复现出 1155）。告警线按哪个口径判请裁；另外「350」这个数字今天只见于两张清单，没写在包内自己的地方（`structure.md:70` 要求写在各包自己那儿，`packages/skill-calorie/` 下无 `AGENTS.md`）。
3. **`update.ts` 会不会只剩一个转手件**：若「改档案回执页」与「设置档案回执页」的整页内容逐字相同（只差 `scene`／`summary` 两字），就不该留两个函数——合成一个、另一个文件从同目录取用，甚至直接并进 `setup.ts`。到写代码时按内容比对定，别为了凑齐三个子功能名硬造一个文件（铁律五）。**推测**：三条写命令的回执数据不同（改档案有改前→改后），大概率留得住。
4. **写前页要不要显示「最新体重」**：`t163-reusable-inventory.md:99` 把这一步标成选择点。要，就按第二节那样在目录里只写一份取数；不要，`profile/view.ts` 那一句查询仍只在目录内一处。
5. **`help-lookup.ts:154`／`:162` 取数据来源**：本设计取入参 `triggers` 的 `main_prompt.cli`；另一种做法是从 `routing.ts:779` 的 `routesFor()` 取。两者今天同值（`#180` 之后由 `test/calorie-routing-81.test.mjs:176-180` 逐字钉住），选前者是为了不让同层两个文件互相引用。
