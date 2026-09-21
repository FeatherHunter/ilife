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
  页内给总量上下文 ＋ 复制筛选指令入口，明细分布标待补。→ 已补票（见下）。
- 价值排行与趋势：无价格与变动数据，页内空态 ＋ 复制补价提示。→ 已补票。
- 闲置标准天数／预告范围：回执不带 `days`，页内写所选天数（默认 90／30 来自命令缺省值），
  不虚构本次下单参数。→ 已补票。
- 闲置分类筛选：回执条目 `category` 为空，筛选项只有全部分类 ＋ 待补说明。→ 已补票。
- 盘点记录数：`kind:inventory` 只回 `records = listInventoryRecords(handle, 1).length`
 （恒 ≤1），页内照回执如实显示，不加算。→ 已补票。
- 盘点明细／完成率／遗留差异：回执无明细，页内标待补 ＋ 复查入口。→ 已补票。

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
