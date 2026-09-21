# 墙与链路总览页生成器说明（票 7）

票：[生成器：双端验收墙＋链路总览页（清单驱动，文件名从清单读）](https://github.com/FeatherHunter/ilife/issues/804)。
两份生成器：`gen-scene-wall.mjs`（验收墙）＋ `gen-chain-page.mjs`（链路总览页），都在本目录下。

## 一句话

清单是唯一权威：文件名只从 `manifest.json` 的 `file` 字段读，生成器不自己算名字、也不裁命名规则。
名字的唯一算法在票 2 契约里、由票 4 在产出侧实施，所以本票不被命名裁决阻塞。

## 清单契约

与墙、链路页共用同一份 `<产物目录>/manifest.json`（不带 BOM 的 UTF-8）。

册子级：`batch`（批名，上屏用）／`naming`（命名说明）／`notShipped`（有意不出产物及其原因，
数组 `{what, why}`，索引页末尾原样列出）／`readings`（本批机器读数，原样上索引，生成器不自己算）／
`rows`（必填，非空数组）。

行级必填：`seq`（序号）／`wake`（唤醒词）／`file`（文件名）／`domain` 或 `kind`（域，二者至少其一；
都给即都印）。

行级可选：`title`（场景标题）／`prompt`（prompt，给链路页用）／`command`（命令，给链路页用；
`key`／`cli`／`cli_ran` 作同义备选）／`kind`（页面类型）／`family`（页面族，索引按它分组，
缺则按域分组）／`check`（这一格该确认什么）／`aliases`（别名附注数组）／`bytes`（字节校验期望值，
有即比对盘上大小）／`src`（造册时源文件名，缺则与 `file` 同名）。

别名位（票 22「唤醒词层规格」④）：变体与无场景词不占新格、不占新行，只作宿主场景那一行／那一格的
别名附注。清单行给 `aliases` 数组即在墙格内与链路行内印出「别名：……（不占新格／不占新行）」；
没给即不印。生成器永远不为别名另起格、另起行。

## 墙生成器四模式

```sh
# 出墙（一张墙 ＋ 重出索引 ＋ 自检）
node docs/skills/skill-home/gen-scene-wall.mjs <产物目录> <输出名> [宽] [高]
node docs/skills/skill-home/gen-scene-wall.mjs .scratch/804-demo 手机墙-390.html 390 820
node docs/skills/skill-home/gen-scene-wall.mjs .scratch/804-demo 桌面墙-1280.html 1280 860

# 造册（按清单 file 把产物复制进同目录，再出双墙 ＋ 索引 ＋ 自检；双端成对）
node docs/skills/skill-home/gen-scene-wall.mjs --stage <源目录> <产物目录>

# 出索引（只重出总索引页）
node docs/skills/skill-home/gen-scene-wall.mjs --index <产物目录>

# 自检（反例测试就是这条，改清单即红；第二个参数可选，指定连哪张墙一起查）
node docs/skills/skill-home/gen-scene-wall.mjs --check <产物目录> [墙文件名]
```

形制照仓规 §6.3：每格一件真产物（`iframe` 真渲染，不塞缩略图）；成对出（手机 390 宽 × 3 列、
桌面 1280 宽 × 1 列）；宽产物整体缩显示（`SCALE = min(0.5, 600 / 宽)`，缩的是显示不是视口）。
自检把 `dropped`（清单点名却没有文件）与 `dead`（页上引用却落不到）一起判，另加字节校验
（行给 `bytes` 即比对）与禁 `loading="lazy"` 正则断言（命中即红，仓规 §7 第一坑）。
墙页、索引页与产物必须同目录（`iframe` 走相对路径）；页面与产物同目录也是本机视觉工具的要求
（只吃工作区内文件）。

验收（仓规 §4）：

```sh
# 正例 → 打印「N 格；链接 M 条；缺失 0 -> 可发」且 exit 0
node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/804-demo 手机墙-390.html
# 反例 → 在清单里故意写一个不存在的文件名再跑 → exit 1 且点名那份（走过才算过）
```

## 链路总览页生成器

```sh
node docs/skills/skill-home/gen-chain-page.mjs <产物目录> [输出名]
node docs/skills/skill-home/gen-chain-page.mjs .scratch/804-demo 链路总览.html
# 显式路径写法
node docs/skills/skill-home/gen-chain-page.mjs --manifest <清单路径> --out <输出路径>
```

每行：序｜域｜场景标题｜prompt｜唤醒词｜命令｜绝对产物路径（表格，窄屏自动堆成卡片）。
行内既印绝对路径文本，也把该文本做成 `file:///` 可点链接（含「复制路径」按钮与
`<noscript>` 绝对路径兜底；脚本关掉时路径照样在）。
绝对路径与字节都是生成当刻在盘上现算的（`resolve(产物目录, file)`），不从清单抄，
所以链接与数字同源，换机／换检出目录重跑即对上。
自检：缺件、字节对不上、成品含禁用串（`<link`／`@import`／`http://`／`https://`）、
行数或兜底数对不上，一律 exit 1 且点名；正例打印「N 行；链接 M 条；缺失 0 -> 可发」。

## 假清单跑通

两份生成器都能拿一份假清单跑通，不依赖真页面先存在。本票自证在 `.scratch/804-demo/`：
6 行假清单（`items` 3 行 ＋ `space` 3 行，其中一行带 `aliases`、一行带 `bytes`）＋
6 份最小自包含假产物。跑法与读数见本票评论（含正例 exit 0 与反例 exit 1 点名的完整回执）。

## 不许动的东西（本票遵守）

没改卡路里／记账那两份原件；生成器不对任何域硬编码（标题取 `batch`、分组取 `family`／`domain`、
域列取行内 `domain`／`kind`，代码里没有居家域名字面量）；清单不带 BOM（读到 BOM 剥并告警）。

## 遗留出口（本票结论：无冲突，无需补票）

清单字段契约与命名规则若与 #183 已定的落点值冲突，当场补票，不在脚本里私改。
核对结论：#183 定的是 HELP 文件的落点（`home_manager_html` ＋ `居家管家_HELP` 文件名主体），
场景页的命名待票 2 契约、由票 4 在产出侧实施——两边管的不是同一批文件，无冲突，故未补票。
若票 2 契约改了字段或命名，本说明与两份生成器的清单契约节同步改。
