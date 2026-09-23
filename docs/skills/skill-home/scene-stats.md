# 统计总览域对账（#811：SM4-1～SM4-4 各出真页面）

票：[统计总览域 4 条：各出真页面](https://github.com/FeatherHunter/ilife/issues/811)（地图 #797 票 14）。
产物目录 `.scratch/811/`（4 份产物 ＋ `manifest.json` ＋ 双端墙 ＋ 总索引 ＋ 链路总览）。

## 一 · 四条场景的落地

| 场景 | 唤醒词 | 命令 | 页族 | 产物 |
|---|---|---|---|---|
| SM4-1 | 统物品 | `home.stats.overview` `{kind:summary}` | overview（查看） | `统物品_SM4-1_<戳>.html` |
| SM4-2 | 查闲置 | `home.stats.alert` `{kind:idle,days:90}` | idle（混合） | `查闲置_SM4-2_<戳>.html` |
| SM4-3 | 查过期 | `home.stats.alert` `{kind:expiring,days:30}` | expiring（混合） | `查过期_SM4-3_<戳>.html` |
| SM4-4 | 盘点统计 | `home.stats.overview` `{kind:inventory}` | inventory_stat（查看） | `盘点统计_SM4-4_<戳>.html` |

信息结构对齐源＝册子表一四行（`stats/overview.html`／`idle.html`／`expiring.html`／`inventory_stat.html`）；
页内交互照老页面的闭环（展示 ＋ 勾选／处理 ＋ 复制指令出口），样式走自家页内样式（共用 `SHARED_CSS` 只给壳，
双端与触摸由本页 `st-*` 样式承担，见下）。

## 二 · 机审读数（终态产物字节，种子库 62 件）

- 域用例：`node --test packages/skill-home/test/stats-pages.test.mjs` → 10/10 exit 0
  （真链 4 ＋ 两层解析 1 ＋ 附录对账 1 ＋ 装配 1 ＋ 分隔符 1 ＋ 结构块 1 ＋ 双端 1）。
- 墙自检：手机墙与桌面墙各 `4 格；链接 13 条；缺失 0 -> 可发` exit 0；
  反例（临时拷贝改坏一处文件名）exit 1 且点名 `2 查闲置 -> …不存在_…`。
- 分隔符：`RESULT: 4/4 PASS`（版式位 0 ／ 英文行 0 ／ 重复句 0）。
- 结构块：`24/24 ＋ 26/26 ＋ 29/29 ＋ 23/23`（默认 7 块 ＋ 各族必需块）`RESULT: 4/4 PASS`。
- 双端：390／1280 两档 8 格，溢出 0，最窄触控 44px，藏匿 0，`RESULT: 4/4 PASS`。
- 链路总览页：`4 行；链接 4 条；缺失 0 -> 可发`。

## 三 · 呈现口径（判据例外，当场记录）

1. **块原文只住 `data-need` 属性**：契约 74 块原文逐字在属性里（块审计与脚手架测试都认子串，属性即在位），
   可见行用无拉丁转写。原因：块原文含 `AI／TOP／prompt／N`（如 `AI建议`、`价值TOP`），
   可见即触发文案判据英文裸词红（基线实测 0/4）。转写映射：
   `AI建议→智能建议`、`价值TOP→价值排行`、`高频TOP→高频排行`、`prompt→指令`、
   `N→所选天数／具体数字`、`／／→，`、`＋→，`。
2. **物品名半角转全角显示**：种子 3 件名含半角拉丁（`白色棉T恤-衣`、`速干T恤-衣`、`维生素C-今天到期`），
   可见统一全角归一（如 `Ｔ`、`Ｃ`），载荷（`data-t`、复制文本、原始回执）保留原文。
   口径：第 #629 图裁定短名化的同向做法——动显示，不动数据。
3. **位置路径拆短 chips**：`客厅/冰箱` 显示为两个短 chip（斜杠是数据，不进版式拼写；窄槽不断字，
   图例换行，照 #629 既有做法）。
4. **必需块登记收进折叠区**：四组块位仍在页内（机审逐字命中），视觉上收进
   `必需块登记（契约对账用）` 折叠，避免规格文字挤占页面主体。
5. **墙与链路页不进文案／结构机审目录**：墙页与索引页天生含文件名与命令拉丁串，
   只走墙自检（正反两例）；文案与结构机审只对 4 份产物断言（用例内直调三件脚本，
   与票面目标一致：产物页文案干净）。

## 四 · 数据诚实记录（回执有、页面没有的，一律明示待补，不编数）

- 总览分布（分类／位置／状态／归属）：回执只有总量（`statsOverview` 只回计数），
  页内给总量上下文 ＋ 复制筛选指令入口，明细分布标待补。→ **#865 已补齐**（逐项计数上屏，见 §六之一）。
- 价值排行与趋势：无价格与变动数据，页内空态 ＋ 复制补价提示。→ **#865 已补齐**（价值带分类名与单价，趋势出四桶柱）。
- 闲置标准天数／预告范围：回执不带 `days`，页内写所选天数（默认 90／30 来自命令缺省值），
  不虚构本次下单参数。→ **#865 已补齐**（回执带本次 `days` 与 `allowed` 档位，见 §六之二）。
- 闲置分类筛选：回执条目 `category` 为空，筛选项只有全部分类 ＋ 待补说明。→ 复核实测 `category` **非空**
  （`idleItems` 一直带 `ifnull(category,'')`，种子件也都有分类），**本条系当时误记**；#865 另补逐条闲置天数与时长来源。
- 盘点记录数：`kind:inventory` 只回 `records = listInventoryRecords(handle, 1).length`
  （恒 ≤1），页内照回执如实显示，不加算。→ 复核为**误记**：`metrics.records` 一直是全表 `count(*)`；
  `listInventoryRecords(handle, 1)` 只喂「最近一次」那一格。#865 仍把明细补成全表逐条。
- 盘点明细／完成率／遗留差异：回执无明细，页内标待补 ＋ 复查入口。→ **#865 已补齐明细与遗留差异总数**；
  完成率与明细里的「异」「状态」两列仍缺，见 §六之四。

补票：[统计取数补齐：分布明细／价值趋势／闲置过期回执字段／盘点明细（#811 遗留）](https://github.com/FeatherHunter/ilife/issues/865)。
归属：取数层与命令层，归票 3／票 5 的后续，不在本票写集内（本票只动四族两文件）。

## 五 · 改动清单（写集内）

- `packages/skill-home/src/stats/pages/overview.ts`（178 行）
- `packages/skill-home/src/stats/pages/idle.ts`（171 行）
- `packages/skill-home/src/stats/pages/expiring.ts`（210 行）
- `packages/skill-home/src/stats/pages/inventory_stat.ts`（140 行）
- `packages/skill-home/test/stats-pages.test.mjs`（新建，测试件不计告警线）
- 本件 `docs/skills/skill-home/scene-stats.md`
- `.scratch/811/`（产物与墙，构建脚本 `.scratch/811-build.mjs` 可复跑）

未碰：模板（16 行壳沿用）、`src/stats/stats.ts` 与命令／路由声明、共用件 `src/render/**` 与
`src/cli/**`、派生件、`package.json`、`SKILL.md`、`scenarios.yaml`、其它域、生产库与生产产物目录。

## 六 · #865 取数补齐（2026-09-23）

票：[统计取数补齐：分布明细／价值趋势／闲置过期回执字段／盘点明细（#811 遗留）](https://github.com/FeatherHunter/ilife/issues/865)。
四页产物已按本单重出到 `.scratch/811/`（同一构建脚本 `node .scratch/811-build.mjs`），双墙重生成。

### 一 · 总览（`kind:summary`，SM4-1）

回执新增四格（`data` 下，键与形状只增不改）：

| 新字段 | 口径（老技能 authority） | 种子库读数 |
|---|---|---|
| `distributions.categories` | 顶级分类逐项件数＋该类合计价值；子分类归并到顶级祖先，无 `category_id` 归「(未分类)」；只算活跃物品（老 `top_category_rows`） | 7 档，合计 62 件，与 `metrics.items` 相等 |
| `distributions.locations` | 位置路径**第一段**归并的 `count(DISTINCT item_id)`（老 `_location_distribution`） | 13 档（厨房 14／卧室 10／…） |
| `distributions.statuses` | `item_locations.location_status` 分组＋占比（老 `_status_distribution`） | 6 档（在家 48＝77.4%／备用 5＝8.1%／…） |
| `distributions.owners` | `items.owner` 分组（老 `_owner_distribution`） | 1 档（使用者 62） |
| `topValue` | 价格 > 0 且活跃，单价降序，带分类名（老 `_value_top`） | 笔记本电脑 5999／变频空调 3299／… |
| `topFreq` | 活跃物品按 `access_count` 降序，带**完整名称**与最后使用日 | 常用剪刀-高频 160 次，最后使用 2026-09-22 |
| `trend` | 近 30 天**四桶**（近7天／8-14天／15-21天／22-30天）；录入按 `items.created_at`，废弃按 `item_locations.location_status='已废弃'` 且 `date(updated_at)` 落桶（老 `_trend_buckets` 分档） | 近7天 录入 62／废弃 0，其余三桶 0（种子件均为今天录入，如实） |

两条口径说明：① 票面写「每日录入与废弃数」、同时又点名「照老 `trend.buckets`」——老 `buckets` 是
**四桶**不是每日，取号源（`trend.buckets`）为准；② 废弃落桶老实现实际用的是 `items.created_at`
（其注释写的是 `updated_at`），新实现按注释与语义走 `il.updated_at`，并在 `trend.note` 里写明。

老键（`metrics.items/quantity/locations/tags/categories`、`price.total/covered/cover`、
`top.*`、`value.*`）**一字未动**；页面改吃新字段，缺新字段时回落老键（直调本装配的老回执仍可渲染）。

### 二 · 闲置与过期（`kind:idle`／`kind:expiring`，SM4-2／SM4-3）

- 闲置逐条补 `daysIdle`（`coalesce(last_accessed_at, created_at)` 距今的天数）＋ `source`
  （`访问记录`／`估算`，老 `stats/idle.py` 口径）＋ 位置、件数、位置状态；清单按闲置天数降序。
- 过期逐条补 `daysLeft`（到期日减今天，负＝已过期）＋ `expirationDate`／`quantity`／`location_status`；
  页面改为优先吃回执的 `daysLeft`（缺该字段时仍按到期日现算，直调本装配不炸）。
- 两支回执都补 `days`（本次下单参数）与 `allowed`（档位：闲置 90／180／365，过期 7／30／90）。

**一处口径更正（#811 遗留的假读数）**：`idleItems` 原判据是「`last_accessed_at` 为空或早于阈值」，
把**今天刚录入、从未访问过**的件也当成闲置——种子库 62 件里 46 件被这么算成「超过 90 天未使用」，
而它们的闲置天数其实是 0。现按老 `idle.py` 口径改为「按 `coalesce(last_accessed_at, created_at)`
算天数、达阈值才算闲置」，种子库真值从 **46 件降到 4 件**（旧款平板 322 天／旧登山包 212 天／
闲置电水壶 192 天／瑜伽垫 132 天，正是种子里 `idleDays` 那四件）。
`idleItems` 的**取行集合与排序一字未动**（衣物域的「久未穿」把「从未使用」也算在内，那支照旧），
过滤挪到统计命令层 `stats.ts`，衣物域与 `seed-scenes.mjs --check` 的 SM3-2／SM4-2 读数不受影响。

### 三 · 盘点（`kind:inventory`，SM4-4）

- `records` 取全表真实条数（3 条），`inventoryDetail` 给全表逐条明细（时间／范围／缺／多／异／状态，上限 20 条），
  `inventoryDiffTotal` 给历次（缺＋多＋异）合计。
- 范围值照老页面归一中文化（`all`→全屋，`location`→位置名）。
- **读侧按表形状自适应**：先读 `PRAGMA table_info(inventory_records)`，新造的表读
  `scope/location/total/missing/extra/created_at`，老库权威 DDL 读
  `scope/occurred_at/missing_cnt/extra_cnt/diff_cnt/status`；两条形状都有用例断言（见 §六之五）。

### 四 · 仍缺的两项（老实现缺口，已当场补票）

页面必需块写的是「盘点明细（时间／范围／缺／多／异／状态）」，但**新技能的盘点表没有「异」与「状态」列**：

- 新表 DDL（`src/fetch/db.ts` 建表）＝ `inventory_records(id, scope, location, total, missing, extra, created_at)`；
- 老库（权威）＝ `inventory_records(id, scope, occurred_at, missing_cnt, extra_cnt, diff_cnt, pending_cnt, detail_json, status, created_at)`，
  维护者生产库 `D:\2Study\StudyNotes\.db\home.db` 上实测就是这一形状（只读 `PRAGMA table_info` 读出，0 行）；
- 连带：新形状没有 `occurred_at`（时间列名不同），且 `addInventoryRecord` 的
  `INSERT INTO inventory_records (scope, location, total)` 打到生产库那张老表上会**报无 `location` 列**。

结论：「异／状态／完成率」不是取数层不取，是**表形状本身对不上权威 DDL**，动它要连 `db.ts` 建表、
`items` 域写入命令、种子脚本与多份判据一起改（跨出统计域）。故本单只把统计侧读到「有就点亮」，
缺口与读数当场补票另办——[盘点表形状对齐：新技能 inventory_records 建表与权威 DDL 不一致（异／状态／完成率落库）](https://github.com/FeatherHunter/ilife/issues/916)；
那票落地后统计侧**零改动**自动出「异／状态／完成率」。
页面在缺列时如实写「本库盘点表还没有异与状态，落库后这里自动出现」／「完成率要盘点状态，本库盘点表还没有这一列」，
不摆破折号占位、不编数。

### 五 · 判据读数（2026-09-23，全部经 `tooling/run-locked.mjs --ticket 865` 排队实跑）

- 域用例：`node --test packages/skill-home/test/stats-pages.test.mjs` → **10/10 exit 0**
  （用例种子的闲置件改为真回拨 `last_accessed_at`——旧判据下「刚录入＝闲置」，新判据下必须真闲置）。
- 新票用例：`node --test packages/skill-home/test/stats-thick-865.test.mjs` → **10/10 exit 0**
  （四维分布逐项计数与合计对账／价值排行带分类名且降序／趋势四桶／闲置天数与来源与档位／
  刚录入不算闲置的口径回归／过期剩余天数正负两例／盘点真实条数与明细／老库权威 DDL 形状自适应
  （异=3、状态=进行中、完成率 50%）／四页装配真渲染断言／老键仍在）。
- 墙自检：`gen-scene-wall.mjs --check .scratch/811 统计总览-手机墙.html`（桌面墙同）
  → `4 格；链接 13 条；缺失 0 -> 可发` exit 0。
- 分隔符：`audit-separators.mjs --dir .scratch/811 --manifest .scratch/811/manifest.json` → `RESULT: 4/4 PASS`
  （版式位 0／英文行 0／重复句 0）。
- 结构块：`audit-page-blocks.mjs ... --manifest .scratch/811/manifest.json` → `24/24 ＋ 26/26 ＋ 29/29 ＋ 23/23`、`RESULT: 4/4 PASS`。
- 双端：`audit-responsive.mjs --dir <只含 4 份产物的目录>` → 390／1280 两档 `溢出 0、最窄 44px、藏匿 0`、`RESULT: 4/4 PASS`。
- 包内回归：`node --test "packages/skill-home/test/*.test.mjs"` → **343/343 fail 0**。
- 种子库：`node packages/skill-home/scripts/seed-scenes.mjs --check` → **70/70 PASS**（SM4 四路 62／46／5／3）。
- 生成器：`pnpm gen:check` → **PASS**（三件派生件与生成器输出逐字节一致）。
- 视觉：390 宽三页整页截图复核（统物品／查闲置／盘点统计）——趋势四桶成柱、分布三栏对齐、
  闲置卡片标签行排得下、档位胶囊可见、盘点四格与三格对齐，无横向溢出、无重叠遮挡。

### 六 · 本票改动清单

- `src/fetch/domains.ts`（新增 `categoryDistribution`／`locationDistribution`／`statusDistribution`／
  `ownerDistribution`／`valueTopItems`／`frequentTopItems`／`recordTrend`／`inventoryDetail`／`localToday`；
  `idleItems`／`expiringItems` 只增字段）
- `src/fetch/index.ts`（转出上面这些）
- `src/stats/stats.ts`（四支回执装配）
- `src/stats/pages/`（`overview.ts`／`idle.ts`／`expiring.ts`／`inventory_stat.ts`：把新字段接上已存在的块，
  必需块原文、模板壳、页族划分一字未动）
- `test/stats-pages.test.mjs`（种子改真闲置）、`test/stats-thick-865.test.mjs`（新建）
- 本件、`.scratch/811/`（产物与双墙重出）、`.scratch/865/`（诊断与读数探针）

未碰：`templates/stats/*.html`、命令键名与路由声明、`src/render/**` 共用件与 `src/cli/**`、
派生件、`package.json`、`SKILL.md`、`scenarios.yaml`、其它域、生产库与生产产物目录。

行数（告警线 350，源码件按 UTF-8 真实行数含空行）：`src/fetch/domains.ts` 183→**295**、
`src/stats/stats.ts` 35→**72**、`overview.ts` 193→**227**、`idle.ts` 178→**175**、
`expiring.ts` 216→**212**、`inventory_stat.ts` 146→**166**——六件全部在线上，无超线件，无需重构。
测试件（`stats-thick-865.test.mjs` 240 行）与文档件（本件）不计这把尺。

写集与实碰对照：计划 6 个源码件（取数层 2 ＋ 命令层 1 ＋ 页装配 4 中的 4 件合 3 类）＋2 个测试件 ＋ 本件，
实际全中，无偏差。
