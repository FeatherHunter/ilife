# 场景页 · 链路总览 · 验收墙 · 样式判据 的现成件清单（居家管家用）

> 干什么用：给 `packages/skill-home` 做「每个唤醒词出一份 HTML ＋ 一条链路总览页 ＋ 双端视觉验收墙」之前，
> 把仓内**现成件**逐件读清——能不能直接复用、要改哪几个常量、输入输出契约是什么。
>
> 调查口径：纯只读。本席未改任何源码、未切分支、未 commit；只新增本报告一份。
> 每条结论给 `文件:行号`；由读数推出来、原件没直说的标 `[推断]`；没读到、读不懂的一律写「未查到」并写明查了什么。
>
> 两处**实跑验证**（不改仓内任何件）：
> 1. `node docs/skills/skill-calorie/scene01-验收墙/gen-wall.mjs --check docs/skills/skill-calorie/scene01-验收墙`
>    → `9 格；链接 49 条（手机墙-390.html 19 ＋ 桌面墙-1280.html 19 ＋ 总索引.html 11）；缺失 0 -> 可发`，**exit 0**。
> 2. 把 `scene01-验收墙/` 整目录复制到系统临时目录、把清单第 1 行 `file` 改成 `不存在的产物.html` 再跑同一条命令
>    → `8 格；链接 49 条；缺失 1 -> 不可发` ＋ stderr 点名 `清单点名却没有文件：1 看今日主页 -> 不存在的产物.html`，**exit 1**。
> 3. `node docs/skills/skill-calorie/t268-链路总览.build.mjs --dry` → 打印 5 行读数、**exit 0**（`--dry` 不落盘）。

---

## A 链路总览

### A.1 件与输入

**生产件**：`docs/skills/skill-calorie/t268-链路总览.build.mjs`（594 行，读工具读数）。
**输入（只读）**：同目录 `t268-链路清单.json`（1145 行）。两个路径各是一个常量：
`PAGE = join(HERE, 't268-链路总览.html')`（`:18`）、`LIST = join(HERE, 't268-链路清单.json')`（`:19`）。

**清单顶层键**（逐键读自 `t268-链路清单.json:2-128`）：

| 顶层键 | 内容 | 被 build.mjs 用在哪 |
|---|---|---|
| `ticket` / `generated_at` / `page` / `chain` | 票号／生成时刻／产物页相对路径／一句话链路 | `chain`／`page` 未上屏（本席核对：`build.mjs` 无引用） |
| `today_pinned` | 本页「当天」的冻结日期（`2026-09-15`） | `:446` 页头「日期口径」 |
| `placeholders` | `<日期>` / `<开始日期>` / `<结束日期>` 三个占位符的代实值 | **不读**（实测 `src.placeholders` 引用 0 次；代实值已烘进 `command_delta` 文本） |
| `frozen_table` | 冻结表路径 `packages/skill-calorie/src/triggers/scene-04-exercise.ts` | **不读**（实测 `src.frozen_table` 引用 0 次；`:484` 出处行里的文件名是**手写字面**） |
| `count` | `{total:39, read7:7, write13:13, other_read19:19}` | `:112-115` 条数三口径自证 |
| `by_page_family` | 十族计数 | `:135` 族分布 |
| `by_template` | 八模板计数 | `:136` 模板分布 |
| `by_product_self_title` | 八种自称页名计数 | `:137` 自称分布 |
| `link_assert` | 链接断言读数（`verdict:"PASS"`／`href_miss:0`／`abs_miss:0`／`tool:"Test-Path -LiteralPath -PathType Leaf"`） | **不读**；这是另一次外部（PowerShell）断言的记录（`:51-61`） |
| `process_page_count` / `process_page_basis` | 过程型页 0 条及其依据 | **不读**（实测两个键引用各 0 次）；页面第 ③ 节那段文案是手写的（`:433`） |
| `runs` | 甲乙两轮跑动读数：`jia_ok:14`／`jia_blocked:25`／`jia_block_classes`／`bytes_range` | `:120-126` 真库实况自证 |
| `real_db` | 真库跑前跑后 sha256／字节／integrity／行数（证明只读） | 不读（`:487` 只在出处行点名日志文件名） |
| `id_binding` | `id:1 → id:8344` | 不读（id 代实从 `command_delta` 正则里取，`:64-65`） |
| `rows` | 39 条逐条记录 | 主体，见下 |

**`rows[]` 逐条字段（24 个，读自首条 `t268-链路清单.json:131-154`）**：
`page_self_title`（产物页自己 title 的名字）／`page_self_h1`（产物页 h1）／`idx`（1 基序号）／`n`（两位零填序号）／
`wake_word`（唤醒词）／`prompt`（你会说的那句话）／`prompt_basis`（prompt 怎么代实出来的一句说明）／
`prompt_param_note`（日期／id 代实的旁注，可 null）／`command`（命令键）／`cli_frozen`（冻结表原文命令行）／
`cli_ran`（实际跑的那行，= 页上「命令」那一列）／`command_delta`（代实说明原文，可 null）／
`subfunction`（下一级子功能名）／`output_type`（receipt／result／process）／`html_template`（用哪个模板）／
`page_family`（页面族，十族之一）／`product_url`（`file:///` URI）／`product_abs`（Windows 绝对路径）／
`product_bytes`（JSON 里的字节数，**build.mjs 不采信**）／`process_page`（"无"）／`verdict_yi`（乙轮结论）／
`block_jia`（甲轮真库阻断原文，可 null）／`bytes_yi`／`bytes_jia`。

**build.mjs 实际消费的只有 10 个字段**：`n`／`wake_word`／`prompt`／`cli_ran`／`command`／`product_abs`／
`page_family`／`page_self_title`／`block_jia`／`command_delta`（`t268-链路总览.build.mjs:79-103`）。

### A.2 输出 HTML 与每格展示的列

**输出**：`docs/skills/skill-calorie/t268-链路总览.html`（89,185 字节；自包含单文件，零 `http`／零 `<link`／零 `@import`）。
拼装顺序在 `:549-570`（hero → 一眼总览 → 怎么用 → 已知遗漏 → 逐条 → 口径与出处 → 页脚）。

页是**卡片流**不是表格（渲染函数 `card()`，`:329-353`），一张卡一个产物，逐格展示：

| 列／块 | 内容 | 行号 |
|---|---|---|
| 序号 | `c.n` | `:332` |
| 唤醒词 | `c.wake`（卡片标题） | `:332` |
| 族徽章 | 族短名，`title=` 里留 JSON 原名 `page_family` | `:332-334` |
| 你会说 | `c.prompt` | `:335` |
| 命令 | `c.cli`（`<pre class="cmd">`，可横滚） | `:336` |
| 代实说明 | 两类形状：占位符按当天代实／示例参数换成真 id；都没有就一行说明 | `:303-327` |
| 打开产物 | `<a class="btn prime" href="${c.href}">打开产物</a>` | `:338-340` |
| 复制路径 | `<button data-copy="${c.abs}">复制路径</button>`；无脚本时 `<noscript><div class="pabs">` 直接印绝对路径 | `:338-340, 352` |
| 体积 | 字节数 ＋ 占最大那份的比例条 | `:340-344` |
| 页首自称 | 产物页自己 title 的名字（前缀／尾段拆开，按 `·` 切） | `:345, 56-57` |
| 念得通／念不通 | 徽章 ＋ 折叠里印真库报错原文 | `:346-351` |

**链接怎么写（A 节要点）**：**绝对 `file:///` URI**，由 `pathToFileURL(r.product_abs).href` 现算（`:91`），
卡上渲染成 `href="file:///D:/ilife/.scratch/t268-link/out/01-记运动.html"`（`:338`）。
**不是相对路径**，所以换机／换检出目录即全表死链；代偿是卡底「复制路径」＋ `<noscript>` 兜底那句话
（`:352`，页面自己解释了为什么这么设计：`:456`「浏览器拦住本地文件时，点『复制路径』把绝对路径拿去文件管理器打开」）。
对照件（本席未逐行读，只作旁证）：`scene02-验收墙/链路总表.html` 走同目录相对路径 `./<文件名>`，是三者里最抗搬的一种
——出处见 `docs/skills/skill-memo-ilife/research/wall-and-linkage-reference.md:226`（**未自读**，标 `[旁证]`）。

### A.3 退出码与自检

- **没有 `process.exit`**（本席通读全文）；判红全靠 `throw`：`:23`（rows 不是 39）／`:81`（链接指向的文件当刻不存在）／
  `:83`（页面族没有短名）／`:113`（条数三口径对不上）／`:120-121`（真库实况对不上）／`:124`（未知阻断类）／
  `:126`（阻断类加总不对）／`:132`（分布加总不是 39）／`:573`（成品里有禁用串 `http`／`<link`／`@import`）／
  `:576`（不是 39 张卡）／`:578`（无脚本兜底路径不是 39 条）。未捕获异常 ⇒ **非 0 退出（实测 `--dry` 走通时 exit 0）**。
- **两个自查开关**：`--dry`（只在内存拼装、打读数、不落盘）、`--out <路径>`（落到别处）（`:579-583`）。
- **字节数的唯一来源是当刻 `statSync`**，不从 JSON 读 `product_bytes`（`:5-7, 49-55, 79-81`）——所以链接与数字同源。
- 清单里那段 `link_assert`（`verdict:"PASS"`）**不是这个脚本产出的**，是外部 PowerShell 断言 `Test-Path -LiteralPath`
  写回 JSON 的记录（`t268-链路清单.json:51-61`）。

### A.4 可复用的程度

结论：**不可直接复用，属「照抄重写」档。** 它不是「改几个常量」的件——数据形状（`rows[]` 的 24 个字段）、
全部文案（39／十族／八模板／场景 04 运动）与四条自证断言都绑死在场景 04 的 39 条上，没有 `--dir`／清单路径参数。
若照抄重写，要改的常量与字段逐处如下（行号＝`t268-链路总览.build.mjs`）：

| 要改的 | 现值 | 行号 |
|---|---|---|
| 输入／输出路径常量 | `PAGE`／`LIST` | `:18-19` |
| 条数硬断言 | `rows.length !== 39` 抛 | `:23` |
| 写／读命令键名单 | `WRITE_KEYS`／`READ7_KEYS` | `:26-27` |
| 真库末条日期 | `REAL_DB_LAST = '2026-07-31'` | `:29` |
| 页面族短名表 | `FAM`（十族 → 短名 ＋ kind） | `:32-43` |
| 三口径条数自证 | `C.write13`／`C.read7`／`C.other_read19` | `:109-115` |
| 真库实况自证 | `src.runs.jia_ok`／`src.runs.jia_blocked` | `:117-126` |
| 三组分布 | `by_page_family`／`by_template`／`by_product_self_title` | `:128-137` |
| 阻断四类归并 | `blockClass()` 四条正则 | `:71-76` |
| 页头／总览／遗漏／出处的中文文案 | 「卡路里技能场景 04 运动」等 | `:441-447, 391-435, 462-476, 484-487` |
| 出处四行的文件名 | `scene-04-exercise.ts` 等 | `:484-487` |

**旁证**（**本席未逐行读**）：同族还有一件更省的 `docs/skills/skill-calorie/t369-链路总表.mjs`（报告称 94 行，
只有「prompt／唤醒词／命令／绝对路径」四列 ＋ 死链自检），来源
`docs/skills/skill-memo-ilife/research/wall-and-linkage-reference.md:20, 282`（旁证）。

| 现成件 | 复用方式 | 要改的常量或字段 | 证据（文件:行号） |
|---|---|---|---|
| `docs/skills/skill-calorie/t268-链路总览.build.mjs`（594 行） | 照抄重写（骨架可抄：卡片流／两类链接兜底／四条自证／`--dry`） | `:18-19` 路径常量、`:23` 条数硬断言、`:26-27` 命令键名单、`:29` 真库日期、`:32-43` 族短名、`:109-137` 三组自证口径、`:391-487` 全部中文文案与出处行 | `t268-链路总览.build.mjs:18,19,23,26,27,29,32-43,79-103,109-137,329-353,572-578,579-583`；清单字段 `t268-链路清单.json:131-154`；实跑 `--dry` exit 0 |
| `t268-链路清单.json`（1145 行） | 改字段（照它的字段集重出一份） | 顶层 17 键中只有 `count`／`by_page_family`／`by_template`／`by_product_self_title`／`runs`／`today_pinned` 被读；行级 24 字段中只有 10 个被读 | `t268-链路清单.json:2-128`（顶层）、`:131-154`（行级）；消费面 `build.mjs:79-103` |
| `t369-链路总表.mjs` | 未查到（本席未逐行读；只从旁证报告得知它是 94 行的最省版） | — | 旁证：`docs/skills/skill-memo-ilife/research/wall-and-linkage-reference.md:20,282` |

---

## B 验收墙生成器

### B.1 四件 `gen-wall.mjs` 各自差在哪

四件同源同形（`scene01`／`scene02`／`scene05`／`scene06`，行数 276／293／284／295），**两个尺度、四种模式**都一样：
位置参数 `node gen-wall.mjs [产物目录] [输出名] [宽] [高]`（缺省 `.`／`手机墙-390.html`／`390`／`820`）＋
`--stage <源目录> <产物目录>`（按清单 `file` 复制进同目录，再出双墙＋索引＋自检）＋ `--check <产物目录>`（只跑自检）。
差异只有三处：

| 件 | 行数 | 索引段差异（`loadManifest` 返回什么 → `buildIndex` 上屏什么） | 自检差异 |
|---|---|---|---|
| `scene01-验收墙/gen-wall.mjs` | 276 | 只返 `notShipped`（`:68`）→ 索引只有「有意不出产物及其原因」一节（`:163-165, 196-201`） | `dropped` ＋ `dead` 一起判（`:208-231`） |
| `scene02-验收墙/gen-wall.mjs` | 293 | 多返 `readings`（`:74`）→ 索引多一节「本批机器读数」（`:148, 172-175`） | 同上（`:225-247`） |
| `scene05-验收墙/gen-wall.mjs` | 284 | 改读 `mf.counts`（`:261, 265, 281`）→ 索引标题的「N 条唤醒词」走 `counts.executableWakeWords`（`:148-150, 198`），不再写死 | 同上（`:216-238`） |
| `scene06-验收墙/gen-wall.mjs` | 295 | 只返 `notShipped`（`:68`） | 同上 **＋ S2**：墙上 `<figure>` 数＝清单行数、总索引 `class="card"` 数＝清单行数，不等即点名 exit 1（`:208-241`） |

四件共同、逐字相同的部分（**这四条是骨架，照抄即可**）：
`MANIFEST='manifest.json'`／`INDEX='总索引.html'`／`WALL_MOBILE='手机墙-390.html'`／`WALL_DESKTOP='桌面墙-1280.html'`；
出双墙的宽高 **390×820 ＋ 1280×860**；列数 `w <= 500 ? 3 : 1`（`:120`／`:126`／`:126`／`:120`）；
缩放 `w <= 500 ? 1 : Math.min(0.5, 600 / w)`（`:121`／`:127`／`:127`／`:121`，**缩的是显示不是视口**）；
必填字段校验 `seq`／`kind`／`wake`／`file` 四非空（`:63-67`）；清单带 BOM 则剥并告警（`:56-59`）；
**不加 `loading="lazy"`**（件头逐字写明，`:31`）；`--stage` 缺件即 `die(1, …)` 并点名（`:81`／`:87`／`:87`／`:81`）。

### B.2 `t154-mobile-wall.mjs`（111 行）——**反面教材**

- 是仓规 `docs/agents/视觉验收墙.md:169` 点名的「起点件」，但**有假绿灯**：先按「盘上有没有」过滤清单
  （`:52-53` 的 `.filter(r => r.file && existsSync(...))`），再只查页面引用（`:107-110`），
  **缺件被静默剔掉、自检照样报「缺失 0」**（自检只有 `missing`，没有 `dropped`）。
- 清单路径硬编码在件头常量：`META = '.scratch/t154/delivery-meta/result.json'`（`:24`）。
- 它值得抄的两处写法：`auto-fill` 自适应列 `grid-template-columns:repeat(auto-fill,minmax(CW+20px,…))`（`:83`）；
  页族分组与组序 `familyOf()` ＋ `ORDER`（`:35-48`）。

### B.3 `t532-wall.mjs`（179 行）＋ `t532-清单.mjs`（173 行）——**最完整的一支**

- **一分为二的清单**：清单文件名只在 `t532-清单.mjs:26` 写一处（`export const MANIFEST`），
  `t532-wall.mjs` 与索引件都 `import { readManifest, split }`（`t532-wall.mjs:33`）——不可能对「哪件在、哪件不在」有两种看法。
- 常量：`CELL_H = 820`（`:36`，两墙格高一致）、`SCALE_OF`（`:38`，同 §6.3-3 算式）、
  `PAIR = [{out:'手机墙.html',w:390},{out:'桌面墙.html',w:1280}]`（`:40-43`，不给输出名时成对出）。
- **不给列数**：`.grid{display:flex;flex-wrap:wrap}`（`:91`），换行铺开而非横滚（对 §7「右边的格子看不见」）。
- 两处值得抄的细节：① `figure` 边框走 `box-shadow: 0 0 0 1px` 而不是 `border`
  ——`border` 在 `box-sizing:border-box` 下把内容盒挤掉 2px、格子右缘会被 `overflow:hidden` 悄悄裁掉（`:92-95`）；
  ② **禁 `loading="lazy"` 的正则断言**：`refCheck()` 里 `/<[a-z][a-z0-9-]*\b[^>]*\bloading\s*=\s*["']?lazy/i`，命中即 `die(1, …)`（`:133-136`）。
- 自检最全：`dropped`（含**字节校验**：盘上字节 ≠ 清单 `bytes` 也算缺件，`t532-清单.mjs:123-126`）＋
  `dead` ＋ `stray`（产物目录里既不在清单、也不是本批墙／索引的 `.html` 一律提示出来，`:172-177`）。
- 清单带 BOM 直接 `die(2, …)` 不剥（`t532-清单.mjs:90`）。

### B.4 清单 JSON 的字段契约

仓规最低要求：序号、类型、标题、文件名（`docs/agents/视觉验收墙.md:101`）。四份实测清单（BOM 均为 False）：

| 层级 | 字段 | scene01 | scene02 | scene05 | scene06 |
|---|---|---|---|---|---|
| 册子级 | `batch`／`madeAt`／`source`／`naming` | ✔ | ✔ | ✔ | ✔ |
| | `ledger` | — | ✔（`t280-真跑台账.json`） | — | — |
| | `rowCount`／`familyCounts`／`readings` | — | ✔ | — | — |
| | `counts.executableWakeWords` | — | — | ✔ | — |
| | `gaps` | — | — | — | ✔（空数组） |
| | `rows`／`notShipped` | ✔ | ✔ | ✔ | ✔ |
| 行级 | `seq`／`kind`／`wake`／`file`（**生成器必填四项**） | ✔ | ✔ | ✔ | ✔ |
| | `family`／`title`／`key`／`check`（索引卡读这四列，缺则印「（清单未给）」） | ✔ | ✔ | ✔ | ✔ |
| | 行数（`seq` 计数／`rowCount`） | 9 | 83 | 45 | 34 |
| | `src`（原名，`--stage` 从哪复制） | — | — | ✔ | — |
| | 另有的旁列 | — | — | — | `cli`／`prompt`／`bytes`／`template`／`complete` |

（四份清单每行都带 `check` 字段，逐份实测：`seq` 计数与 `check` 计数相等，9／83／45／34。）

`t532-清单.mjs` 那一支另有一套（由 `t532-run-all.mjs` 的 `results.json` 派生，行级 12 字段）：
`seq`／`n`／`file`（＝`basename(collectedPath)`）／`wake`／`key`／`order`／`list`／`cli`／`params`／`family`／`kind`／`check`／
`bytes`／`sha256_12`／`title`（`:143-156`）。

### B.5 自检的正反两面（实测）

- 正例：`node .../scene01-验收墙/gen-wall.mjs --check <目录>` → `9 格；链接 49 条（手机墙-390.html 19 ＋ 桌面墙-1280.html 19 ＋ 总索引.html 11）；缺失 0 -> 可发`，**exit 0**。
- 反例（在临时副本上做，未动仓内件）：把清单第 1 行 `file` 改成 `不存在的产物.html` → `8 格；链接 49 条；缺失 1 -> 不可发`，
  stderr 逐件点名 `清单点名却没有文件：1 看今日主页 -> 不存在的产物.html`，**exit 1**。
- 三个「退出码不是 0／1」的旁路：没有清单／清单 rows 为空／缺字段 ⇒ `die(2, …)`（`scene01:54,62,65`）。

### B.6 两个已知坑的现状

| 坑（`docs/agents/视觉验收墙.md:179,181`） | 四件 `gen-wall.mjs` | `t154` | `t532` |
|---|---|---|---|
| `loading="lazy"` | **没踩**：件头逐字「不加」＋代码里不写（`scene01:31`） | 没踩（代码里不写，但**没有断言**） | **没踩且拦得住**：`refCheck` 正则断言，命中即 exit 1（`:133-136`） |
| `dropped` 被静默剔 | **没踩**：`dropped` 与 `dead` 一起判（`scene01:210-221`；`scene06` 另加 S2 格数对账 `:221-236`） | **踩了**：先过滤再只查引用（`:52-53, 107-110`） | 没踩，且多字节校验与 stray 提示（`t532-清单.mjs:123-126`；`t532-wall.mjs:172-177`） |

| 现成件 | 复用方式 | 要改的常量或字段 | 证据（文件:行号） |
|---|---|---|---|
| `scene02-验收墙/gen-wall.mjs`（293 行） | **直接复用**（同目录改名即用；四模式一体） | 只要改索引／墙标题里那句「场景02「饮食」」文案；清单名与三个输出名沿用最省 | `scene02-验收墙/gen-wall.mjs:49-52`（常量）、`:120-127`（列数与缩放）、`:142-206`（索引）、`:225-247`（自检）、`:261-290`（四模式入口） |
| `scene01`／`scene05`／`scene06` 的 `gen-wall.mjs` | 直接复用／按需选一 | 同上；`scene05` 要清单给 `counts.executableWakeWords`（`:149-150`）；`scene06` 要清单 `rows` 与墙格数一致且能过 S2（`:221-236`） | `scene01:43-46,68,163-165,208-231`；`scene05:148-150,261-281`；`scene06:68,208-241` |
| `t532-wall.mjs`（179 行）＋`t532-清单.mjs`（173 行） | 照抄重写（抄它的**两处细节**到 scene02 那一支上） | 要抄：`:133-136` 禁 lazy 断言；`t532-清单.mjs:123-126` 字节校验；`:92-95` box-shadow 边框；`:172-177` stray 提示。清单文件名常量在 `t532-清单.mjs:26` | `t532-wall.mjs:33,36,38,40-43,91-95,133-136,141-179`；`t532-清单.mjs:26,86-96,115-131,143-156` |
| `t154-mobile-wall.mjs`（111 行） | **不可用**（只可抄 `auto-fill` 与页族分组两处写法） | 若要救：补 `dropped` 判据（照 `视觉验收墙.md:115` 三行） | `t154-mobile-wall.mjs:23-24,52-55,107-110`；仓规点名 `docs/agents/视觉验收墙.md:169` |
| 清单 JSON | 照抄字段集 | 册子级 `batch`／`naming`／`notShipped` 必填；行级 `seq`／`kind`／`wake`／`file` 必填，`family`／`title`／`key`／`check` 建议齐（索引卡读它们） | `scene01:63-67,146-151`；`t532-清单.mjs:99-108,143-156` |

---

## C 样式与文案判据

### C.1 每件查哪几列、怎么取数、输入是什么

| 件 | 行数 | 查哪几列 | 怎么取数 | 输入 | 退出码语义 |
|---|---|---|---|---|---|
| `docs/skills/skill-calorie/t351-v8-style-audit.mjs` | 126 | 11 列：820断点／自造可点件／≥44px／触屏三件／样式块／内联style／色值数／分隔符行／英文行／重复句 | **纯正则＋文本分析，无头浏览器 0**：剥 `<title>`／`<style>`／`<script>`／`data-t="…"` 再剥标签取「可见文本行」（`:21-29`） | `--dir <产物目录>`（缺即 exit 2，`:14-17`）；文件名过滤写死 `/^order\d+-.*\.html$/` 或 `/^[a-z][a-z0-9-]*\.html$/`（`:31-34`） | **末行是 `:126` 的 `}`，全文没有 `process.exit`** ⇒ 恒 exit 0；判红只体现在「逐条汇总」那六行（`:105-116`） |
| `docs/skills/skill-bill/t407-v8-style-audit.mjs` | 332 | t351 的 11 列 ＋ **R4 两列**：区外命令名／区外库列名 | 同上；R4 走「命令名三族逐词列举 ＋ 按容器判（载荷区＝`<pre>`／`data-t`）＋ 反向判（载荷区外出现库列名）」（`:174-192`） | `--dir <产物目录>`；**本册 32 份名单硬写在文件里**（`:35-41`），不靠目录筛 | 件头写 `0 全绿／1 有命中或缺件／2 用法错`（`:21`），末行 `process.exit(failed ? 1 : 0)`（`:326-332`） |
| `docs/skills/skill-bill/t417-query-audit.mjs` | 251 | t407 的列 ＋ **共享层 vs 本页两套读数**（断点／44px／flex-wrap／auto-fit／内距／色值，`:147-181, 213-224`）＋ **分隔符按位置四分**：版式位／标题写法位／非版式位／载荷位（`:63-73`） | 同上；分隔符**逐字符判落在哪个元素上**——标签栈单遍扫描器（`:89-111`），不用 `indexOf('>')` 反推（属性值可带换行） | `--dir <产物目录>`；**本册 18 份名单硬写在文件里**（`:32-51`） | `0 全绿／1 有命中或缺件／2 用法错`（`:18`）；`missing` 与三类命中一起进红（`:244-251`） |
| `packages/skill-calorie/scripts/audit-separators.mjs` | 275 | **7 条规则 R1–R7**：R1 `·`／R2 `；`／R3 ≥3 段并列（段 ≤40 字）／R4 `｜`·`\|`／R5 `、`／R6 `~`·`～`／R7 内部标识符七子模式（命令键／命令原文／库表名／蛇形名／驼峰参数名／常量名／票号）（`:32-53, 89-97`） | **无头浏览器 0**；可见文本＝源文件剥 `<style>`／`<script>`／注释／标签 ＋ 解实体，剥壳用**等长哨兵**保留换行 ⇒ **行号与 read 工具一致**（`:79-86`）；**只以「节点级」判红绿**（哨兵切段成节点，附归属元素 class 与所在区 head／body），行级读数会低估只作参考（`:166-191`）；数学记号 `\|X\|` 判前先滤（`:119-125`） | 位置参数若干 `.html` **或** `--dir <目录>`（`:204-232`）；另 `--json <路径>` 落读数、`--quiet` 只打摘要 | **`0` 全绿／`1` 有债（含解析失败件）／`2` 用法错或没有输入件**（`:18-19, 214-232, 275`）；摘要行 `RESULT: <命中 0 的页数>/<总页数>` ＋ 末行 `PASS`／`FAIL`（`:263-264`） |

### C.2 演进关系（谁最新最全）

用提交时间与内容两路对齐（`git log -1 --date=short`）：

1. `t351-v8-style-audit.mjs` — 2026-09-15 `5bdf5861`，卡路里全量页；**无退出码**，文件名过滤绑 `order\d+`。
2. `packages/skill-calorie/scripts/audit-separators.mjs` — 2026-09-15 `bad2e06b`（#516）；同时段但**另一条线**：
   只判分隔符与内部标识符，进包 `scripts/`、可 `--json`、有 7 条判据测试与 `RESULT`／`PASS` 摘要行。
3. `t407-v8-style-audit.mjs` — 2026-09-16 `e075fa66`，**照抄 t351** 并加 R4 两类 ＋ 退出码；名单硬写。
4. `t417-query-audit.mjs` — 2026-09-16 `2d27bc4a`，**照抄 t407** 并按查询域裁剪；加「位置四分」与共享层读数。

**最新最全＝`packages/skill-calorie/scripts/audit-separators.mjs`**（判据最多最严、节点级判红绿、有退出码与 JSON 读数、
可当 `pnpm` 门用）。但**它不是 t407／t417 的超集**，两处口径只在 t407／t417 里有：

- **版式位**：t407／t417 只把落在徽章／阻断条标题／提示行／卡片副行／表头说明上的 `·`／`|` 记作「懒政」，
  表格单元格与表单回显**不算**（`t407:64-70`、`t417:63-73`）；`audit-separators` 不分位置，节点级出现即债。
- **共享层 vs 本页**：t407／t417 把 head 里那份共享样式表单列成「公共层的成绩」，避免把公共层的分记到每页头上
  （`t407:12-16, 271-290`）；`audit-separators` 只看单页文件。
- **`；` 的处置**：t407 明确 `；`／`;` **不进红**（本域大量是正经句末分号，`:324`）；`audit-separators` 的 R2 判红。

### C.3 把它接到新技能要改什么

| 件 | 必改的常量／字段（带行号） |
|---|---|
| `t351-v8-style-audit.mjs` | `:31-34` 文件名过滤（中文发布名不匹配）；`:64` `ASCII_OK` 白名单；`:65` `FIXTURE_DATA` 夹具名；`:76` 自造可点件选择器 `<label\|<summary`；**补 `process.exit`（现在恒 0）** |
| `t407-v8-style-audit.mjs` | `:35-41` `FILES` 32 份名单；`:159` `ASCII_OK`；`:162` `FIXTURE_DATA`；`:178` `CMD_FAMILIES`（命令名三族）；`:179-180` `DB_COLS`（11 个库列名）；`:64-70` 四个位置正则（`ilife-block-*` 公共层类名） |
| `t417-query-audit.mjs` | `:32-51` `FILES` 18 份名单；`:137` `ASCII_OK`；`:139` `FIXTURE_DATA`（空壳）；`:67-73` 四个位置正则（同上，绑公共层类名） |
| `audit-separators.mjs` | `:90` `IDENTIFIERS` 的「命令键」子模式写死 `calorie\.[a-z]…`、`:91` 「命令原文」写死 `calorie-cmd-read`；`:59` `PARALLEL`（并列分隔符集）按新技能口径复核。其余通用 |

**一条居家必须知道的事实**（C 节落点）：居家管家的**普通产物**走自己那份极简 `SHARED_CSS`
（`packages/skill-home/src/render/html.ts` 的 `SHARED_CSS`，类名是 `.page`／`.item`／`.badge`／`.receipt` 一族），
模板 `packages/skill-home/templates/*.html`（每份约 280 字节，只有 `<!--SHARED-CSS-->`／`<!--CONTENT-->` 两个哨兵）；
`base-render`／`ilife-block-*` 只在 HELP 那一支用（`src/help/helpFile.ts:51` import `base-paint/help-shell`）。
⇒ t407／t417 的四个「位置正则」按 `ilife-block-*` 类名判位置，**对居家普通产物会一律落空**
（读数全 0，看着全绿，其实是没查）——接进去必须先按居家自己的类名重写这四个正则，或先照公共层重做页壳。
`[推断：本席核对了 skill-home 的 SHARED_CSS 与 templates，未见 ilife-block-* 类名；未逐页渲染验证]`

| 现成件 | 复用方式 | 要改的常量或字段 | 证据（文件:行号） |
|---|---|---|---|
| `packages/skill-calorie/scripts/audit-separators.mjs`（275 行） | **改常量**（最该接的一件：有退出码、有节点级、可 `--json`） | `:90` 命令键前缀 `calorie.`、`:91` 命令原文 `calorie-cmd-read`、`:59` `PARALLEL` 集 | `audit-separators.mjs:32-53,79-97,166-191,204-232,263-275` |
| `t407-v8-style-audit.mjs`（332 行） | 照抄重写（抄它两处口径：版式位、共享层） | `:35-41` `FILES`、`:64-70` 位置正则、`:159`／`:162`／`:178-180` 白名单与名单、`:326-332` 红判据 | `t407-v8-style-audit.mjs:12-16,35-41,64-73,174-192,271-290,322-332` |
| `t417-query-audit.mjs`（251 行） | 照抄重写（抄它的「位置四分」与共享层读数） | `:32-51` `FILES`、`:63-73` 四个位置正则、`:118-126` 命中认领窗口、`:137-146` 白名单 | `t417-query-audit.mjs:12-18,32-51,63-73,89-126,213-226,244-251` |
| `t351-v8-style-audit.mjs`（126 行） | **不可用**（无退出码＋文件名过滤不匹配；只可抄「11 列」的判据清单） | 要救：`:31-34` 过滤、`:64-65` 白名单、补 `process.exit` | `t351-v8-style-audit.mjs:1-8,21-29,31-34,64-76,105-126` |

---

## D 卡路里骨架与居家差距

### D.1 `t179-180-structure-design.md` 的目录形状决策（摘要）

该件是「必报五步 · 第二步」的形状报单，只报形状不动代码（`docs/skills/skill-calorie/t179-180-structure-design.md:3`）。
四条可复用的决策：

1. **能力目录名＝HELP 一级分组，文件名＝下一级子功能**（`:10-17`）：
   `src/profile/`（基础信息）下 `setup.ts`（设置资料）／`update.ts`（改资料）／`view.ts`（看档案）。
2. **名字映射要逐行给依据**（`:19-30`）：右列写仓内既有说法的出处（例：`profile` 取自 `scene-07-profile.ts:5` 的 key 前缀
   与 `cli/keys.ts:44-46` 的命令名）；英文名一律照仓内既有说法取，不自创。
3. **共用位与能力目录并列、里面不许出现任何能力名**（`:15-16, 72`）：7 处逐字相同的整页装配件合并成
   `src/shared/docPage.ts` 一份；**不取 `src/render/docPage.ts`**——那是把新件放进待重排的工种目录，重排时还得再搬一次（`:72`）。
4. **每个文件对外给几个要数得出来**（`:38-52`，3／1／2 ＋ 共用件 4，都 ≤5），并明写「只在目录内用、不对外给的」有哪些（`:47-50`）。

### D.2 卡路里的能力目录标准件（读 `diet/`、`weight/` 实证）

| 标准件 | 职责（一句） | 证据 |
|---|---|---|
| `src/<能力>/index.ts` | **能力门**：只转出跨能力要用的少数几件（铁律五 ≤5；`weight` 已 6 件并自记越线） | `src/diet/index.ts:1-22`（对外 3 件）、`src/weight/index.ts:1-21`（对外 6 件，`:6-12` 自记「已越铁律五」） |
| `src/<能力>/commands.ts` | **命令声明的权威源**：每条声明给 `kind`／`key`／`shape`（读）／`title`／`wakeWord`／`flows`／`example`／`run`／`doc`（写）；加一条命令＝只改本件＋子功能件 | `src/diet/commands.ts:1-27`（件头把 6 件事写清）、`:43-76`（24 条声明）；`src/weight/commands.ts:1-20, 30-40`（9 条） |
| `src/<能力>/routes.ts` | **路由声明**：键属 `commands.ts` 的键集；每条 `{list, order, wakeWord, scene, kind, key, cli}`；`order` ＝该记录在原列表内的 0 基位次（顺序权威、原值照抄） | `src/diet/routes.ts:1-12`（件头）、`:13-70`（逐条） |
| `src/<能力>/<子功能>.ts` | 取数 ＋ 处理函数（一条命令一个处理函数）；读／写分开住 | `diet/`：`log.ts`（记饮食）／`edit.ts`（改饮食）／`today.ts`（看饮食）／`library.ts`＋`products.ts`（查食品）／`nutrition.ts`／`ranking.ts`／`review.ts`（`commands.ts:14-23` 逐条映射）；`weight/`：`log.ts`／`edit.ts`／`history.ts`／`compare.ts`／`review.ts`／`volatility.ts` |
| `src/<能力>/*Docs.ts`／`*Plate.ts`／`receipt.ts`／`*Ui.ts`／`*Css.ts` | **整页装配**（HTML 串）与页内样式；按页族切 | `src/diet/` 有 `libraryDocs.ts`／`rankingDocs.ts`／`reviewDocs.ts`／`nutritionPortDocs.ts`／`receipt.ts`／`dietUi.ts`；`src/weight/` 有 `plateDocs.ts`／`logReceipt.ts`／`volatilityDoc.ts`／`weightUi.ts` |
| `src/shared/`（共用位） | 跨能力的共用件：命令声明**形状**的唯一定义地、整页装配、字段标签、复制区… | `src/shared/commandSpec.ts:1-10`（形状唯一定义地，写明「谁在用」：各能力声明 ＋ `cli/registry.ts`）；`src/shared/` 实有 21 件（`docPage.ts`／`cmdSpec` 一族／`fieldLabel.ts`／`params.ts`／`copyBlock.ts`／`pageStrips.ts`…） |
| 生成物（**禁手改**） | `cli/keys.ts`／`cli/registry.ts`／`triggers/routes.generated.ts`，由 `scripts/gen-cli.mjs`／`gen-routes.mjs` 派生 | 登记在 `packages/skill-calorie/AGENTS.md`「文件行数告警线 › 范围」一段（剔出的三件生成物） |

一句话记法：**一个能力目录 ＝ 门（`index.ts`）＋ 命令声明（`commands.ts`）＋ 路由声明（`routes.ts`）＋ 若干「子功能件」＋ 若干「装配件」**，
分派层（`cli/cmd_read.ts`）只查生成物表，不装处理逻辑。

### D.3 `packages/skill-home/src/` 现状与差别（一句话一件）

| 家居件 | 一句话 | 与卡路里的差别 | 证据 |
|---|---|---|---|
| `src/cli/cmd_read.ts`（884 行，包内已挂号超线） | **一条 `switch (key)` 装了 21 个 case**（`:175-810`），分派与全部处理逻辑同处一件 | 卡路里的分派层是生成物查表（`cli/registry.ts`）、处理函数住各能力目录；居家的处理函数直接写在 switch 的 case 里 | `packages/skill-home/src/cli/cmd_read.ts:175-810`；超线记录 `packages/skill-home/AGENTS.md:10` |
| `src/policy/` | **口径与校验独立成一层**：`category`（HOME_TOPS／HOME_STATUSES）／`item`（validateAddInput／parseUpdateOp）／`ticket`／`care`／`wakewords`（WAKE_TABLE／routeWakeword） | 卡路里没有这一层——口径随各能力目录走，跨能力共用的才提 `src/shared/` | `src/policy/index.ts:1-8` |
| `src/render/` | envelope 形状（`HOME_KEY_SHAPES`：`key → shape`）＋ 按形状渲染 ＋ 21 份模板装载 ＋ 共享样式串 | 卡路里的对应物是 `src/render/`（工种目录，待重排）＋各能力自己的 `*Docs.ts`；居家的页装配与样式**与能力无关地**集中在这里 | `src/render/index.ts:1-14`；`src/render/envelope.ts:5,29-51`；`src/render/templates.ts:7-25`；`src/render/html.ts`（`SHARED_CSS`） |
| `src/fetch/` | 取数层：`db.ts`（434 行，超线）＋ `domains.ts`（**多域取数同处一件**）＋ `paths`／`backup`／`archive`／`errors` | 卡路里各能力自己带取数件（`diet/log.ts` 等），`src/fetch/` 只装跨能力的源（`body.ts`／`profile.ts`） | `src/fetch/index.ts:1-18`；`src/fetch/db.ts`（22,445 B）、`src/fetch/domains.ts`（11,557 B） |
| **没有 `src/<能力>/` 一级目录** | `src/` 下第一层是 `cli`／`fetch`／`policy`／`render`／`help`，**全是工种名** | 结构标准要求「第一层必须是能力名」（`docs/agents/structure.md:68`） | `Get-ChildItem packages/skill-home/src`（本席实跑，输出见 D.3 上表与 E.2 第 2 条） |
| **没有 `commands.ts`／`routes.ts`／`triggers/`** | 全包文件名的 `command`／`route`／`trigger` 三词 grep **命中 0 个文件** | 卡路里这三样是每个能力目录的标准件（D.2） | 实跑：列 `packages/skill-home/src` 下全部文件、按文件名筛「含 command／route／trigger 三词之一」→ **结果为空** |

**HELP 一级分组（＝要建的域目录名）**：老骨架 9 个域 key —— `items`／`space`／`outfit`／`stats`／`express`／`receipt`／`family`／`setup`／`link`
（`packages/skill-home/src/help/scenarios.yaml:2-12`；`docs/skills/skill-home/map-183-body.md:34` 同）。
`link` 域**只留登记位、不建目录**（`map-183-body.md:95` 记用户 2026-09-12 裁决：`link` 不入组不建目录）。

### D.4 居家缺口清单（按 HELP 一级分组解耦要补的）

1. **建 `src/<域>/`**（`items`／`space`／`outfit`／`stats`／`express`／`receipt`／`family`／`setup` 八项；`link` 不建）。
2. **每域一份 `commands.ts`**——今天 21 条键**没有权威声明源**：`HOME_KEY_SHAPES` 只存 `key → shape` 两列
   （`src/render/envelope.ts:5`），标题／唤醒词／示例／处理函数的落点分散在 `cmd_read.ts` 的 case 与 `policy/wakewords.ts` 里。
3. **每域一份 `routes.ts`**——唤醒词→命令的映射今天住 `src/policy/wakewords.ts`（`WAKE_TABLE`／`routeWakeword`，`policy/index.ts:7`），
   是全包一张表；卡路里是每能力一份 `routes.ts` ＋ 一个生成物汇总。
4. **把 21 个 case 的处理函数从 `cmd_read.ts` 搬进各域**，分派层回到「查表 → 调声明的 `run`」。
5. **每域自己的取数件**取代 `fetch/domains.ts` 的大件（今天 11 个域族的取数住同一件）。
6. **共用位 `src/shared/`**——今天跨域共用的东西散在 `policy`／`render`／`fetch` 三处，没有一处叫「共用位」。

| 现成件 | 复用方式 | 要改的常量或字段 | 证据（文件:行号） |
|---|---|---|---|
| `t179-180-structure-design.md`（126 行） | 直接复用（**文档**：照它的四条决策写居家的必报五步第二步） | 名字映射表 `:19-30` 换成居家 9 域 key → 英文目录名；对外件计数 `:38-52` 按居家重数 | `docs/skills/skill-calorie/t179-180-structure-design.md:10-17,19-30,38-52,47-50,72` |
| `src/diet/commands.ts`（76 行）／`src/weight/commands.ts`（40 行） | **直接复用**（照抄声明形状与件头纪律） | 键前缀 `calorie.` → `home.`；`shape` 取值按居家的 `HOME_KEY_SHAPES`；`flows` 按 HELP 子功能名 | `src/diet/commands.ts:1-27,43-76`；`src/weight/commands.ts:1-20,30-40`；形状定义 `src/shared/commandSpec.ts:40-90` |
| `src/diet/routes.ts`（118 行） | 直接复用 | `scene` 号、`order` 位次、`key`／`cli` 按居家重填；`calorie-cmd-read` → 居家唯一出口名 | `src/diet/routes.ts:1-12,13-70` |
| `src/diet/index.ts`／`src/weight/index.ts` | 直接复用（照抄「门只转出跨能力要用的」那条判据） | 对外件按居家跨域调用面重选 | `src/diet/index.ts:1-22`；`src/weight/index.ts:1-21` |
| `packages/skill-home/src/**`（现状） | 改造目标 | 建 `src/<9 域>`／每域 `commands.ts`＋`routes.ts`；`cmd_read.ts` 的 21 个 case 搬出去；`policy/wakewords.ts` 的 `WAKE_TABLE` 拆到各域 | `skill-home/src/cli/cmd_read.ts:175-810`；`skill-home/src/policy/index.ts:1-8`；`skill-home/src/render/envelope.ts:5`；`skill-home/src/fetch/index.ts:1-18`；`skill-home/AGENTS.md:10` |

---

## E 复用结论与仍不确定的点

### E.1 复用结论（一页话）

1. **墙**：照 `docs/skills/skill-calorie/scene02-验收墙/gen-wall.mjs` 逐字抄，配一份 `manifest.json`（`batch`／`naming`／
   `notShipped` ＋ 行级 `seq`／`kind`／`wake`／`file`／`family`／`title`／`key`／`check`）；再从 `t532-wall.mjs` 补两处加强
   （禁 `loading="lazy"` 的正则断言、字节校验），从 `scene06` 补 S2 格数对账。
2. **判据**：照 `packages/skill-calorie/scripts/audit-separators.mjs` 抄（它有退出码、节点级判红绿、可 `--json`），
   把 `calorie.` 前缀与 `calorie-cmd-read` 两处换掉；「版式位／非版式位」与「共享层 vs 本页」两处口径从 `t407`／`t417` 补。
   **但位置正则绑 `ilife-block-*` 公共层类名，居家普通产物不用这套类名，直接跑会读数全 0（看着全绿）**。
3. **链路总览**：`t268` 那一件不可直接复用，它的骨架值钱、数据形状与文案全绑卡路里场景 04；建议按它的骨架另写一件，
   链接走**同目录相对路径 ＋ 绝对路径并列印出**（`t268` 的 `file:///` 写法换机即死链）。
4. **顺序建议**：先按 D.4 把 `src/<9 域>/` 解耦（含 `commands.ts`／`routes.ts`），再出墙——因为墙的 `rows[].file` 命名规则
   要跟产物来源一致，而提醒一句：**墙与产物必须同目录**（`docs/agents/视觉验收墙.md:186` 末条坑）。

### E.2 仍不确定的点（逐条写明查了什么）

1. **居家 21 条键↔9 域的归属**：本席只做到「`cmd_read.ts:175-810` 的 21 个 case 列表」这一级 grep，
   **未**把 `scenarios.yaml` 的 `domains`／`scenarios` 逐条读出来与 21 个 case 对齐。未查到完整归属表。
   （查了什么：`Select-String scenarios.yaml '^[a-zA-Z_]'` 只拿到顶层 `version`／`domains`／`scenarios` 与 9 个域 key。）
2. **居家是不是已经有墙／链路页生成器**：未查到。
   （查了什么：`Get-ChildItem docs/skills/skill-home -File`，件名全是 `map-`／`review-`／`t1xx-*.md` 与两件调查脚本
   `t183-wire-edges.mjs`／`t185-extract.mjs`，没有墙生成器、没有链路总览生成器；`docs/skills/skill-home/` 下也无 `gen-wall.mjs`。）
3. **`t369-链路总表.mjs` 的实际形状**：本席**未逐行读**，只从旁证报告知道它是「94 行的最省链路页生成器」。
   若要走「最省」路线，应把它与 `t268` 并读后再定。
   （查了什么：`rg 't369-链路总表'` 只命中文档引用；本席未打开该文件。）
4. **`t407`／`t417` 的位置正则在居家产物上的实际读数**：本席只做了静态核对（居家 `SHARED_CSS` 与 `templates/*.html` 里
   未见 `ilife-block-*`），**未真跑一遍验证读数确实是 0**。
   （查了什么：读 `skill-home/src/render/html.ts` 的 `SHARED_CSS` 片段、`templates/item_search.html`、
   grep `base-render|base-paint|ilife-block` 于 `skill-home/src/**`。）
5. **`scene05`／`scene06` 的最新盘面是否与本席所读一致**：本席读的是当刻工作区盘面；两件对应的提交时间都是 2026-09-16，
   仓内在途改动可能使这些行号漂移 `[推断：行号以本报告成文当刻为准]`。
6. **居家为「每个唤醒词出一份 HTML」时发布名怎么定**：未查到。
   （查了什么：`skill-home/src/render/templates.ts:7-25` 只有 21 个模板名（`item_search` 一族），
   `help/manifest.ts` 只给 HELP 文件的 `helpDirName`／`helpFileStem`；普通产物的落盘命名未见统一规则。）

### E.3 本席的判断：最该照抄的 2 件 与 最不该照抄的 1 件

- **最该照抄 ①**：`docs/skills/skill-calorie/scene02-验收墙/gen-wall.mjs` ＋ 同目录 `manifest.json` 的字段集
  ——四模式一体、正反自检实测能红能绿、清单名一处算。
- **最该照抄 ②**：`packages/skill-calorie/scripts/audit-separators.mjs`
  ——唯一一件有退出码 ＋ 节点级判红绿 ＋ `RESULT`／`PASS` 摘要行 ＋ JSON 读数的判据件。
- **最不该照抄**：`docs/skills/skill-calorie/t154-mobile-wall.mjs` ——仓规自己点名的假绿灯
  （`docs/agents/视觉验收墙.md:169`），实测代码层面确实只有 `missing`、没有 `dropped`（`:52-53, 107-110`）。
  次一档要当心的是 `t351-v8-style-audit.mjs`：**全文没有 `process.exit`，恒 exit 0**，不能当门用。

| 现成件 | 复用方式 | 要改的常量或字段 | 证据（文件:行号） |
|---|---|---|---|
| `scene02-验收墙/gen-wall.mjs` ＋ `manifest.json` 字段集 | 直接复用（首选） | 索引／墙标题文案；清单名与三个输出名沿用 | `scene02-验收墙/gen-wall.mjs:25-27,49-52,120-127,142-206,225-247`；`manifest.json:1-17` |
| `packages/skill-calorie/scripts/audit-separators.mjs` | 改常量（首选判据件） | `:90` `calorie.`、`:91` `calorie-cmd-read`、`:59` `PARALLEL` | `audit-separators.mjs:59,89-97,204-232,263-275` |
| `t268-链路总览.build.mjs` | 照抄重写（骨架值钱、内容全绑） | 见 A.4 那张表 | `t268-链路总览.build.mjs:18-19,23,26-27,29,32-43,109-137` |
| `t154-mobile-wall.mjs` | **不可用**（假绿灯） | 若要救：补 `dropped` 判据 | `t154-mobile-wall.mjs:52-55,107-110`；`docs/agents/视觉验收墙.md:169` |
| `t351-v8-style-audit.mjs` | 不可当门（无退出码） | 若要救：补 `process.exit`；`:31-34` 文件名过滤 | `t351-v8-style-audit.mjs:31-34,105-126` |
