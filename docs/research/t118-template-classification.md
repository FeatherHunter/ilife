# #118 模板分型 · 脚本输出快照（可复跑）

- 脚本：`tooling/classify-templates.mjs`（**唯一真相**：判定只读 `packages/base-render/dist/index.js` 的冻结常量 `TEMPLATE_MARKERS`／`TEMPLATE_KINDS`／`TEMPLATE_KIND_RULE`／`PAYLOAD_SLOT_RULE`，脚本内不自带任何标记字面量或分型表副本）。
- 复跑：`pnpm build` 之后执行 `node tooling/classify-templates.mjs --inventory`（`--inventory` 缺省比对 `.scratch/t118/template-inventory.md`）。
- 结论：**65 个模板 = 数据页 6 ／ 内容页 53 ／ 遗留 6**，逐一命中且仅命中一型（无「两类都不属于且非 legacy」），载荷槽零冲突，数据页的 `INJECT-DATA` 全部落在自带容器内，与清单 65 条**逐条一致**。
- 本文件是**输出快照**（#118 收工取证），不是第二真相：口径变更只改契约常量，脚本输出随之变化。

```text
# #118 模板分型（冻结契约判定，可复跑）

判定规则来源：data-page ／ content-page ／ legacy（`TEMPLATE_KIND_RULE`，required 须恰 1 次／forbidden 须 0 次）
载荷槽规则：injectData 与 content 恰有其一（`PAYLOAD_SLOT_RULE`）

| 技能 | 模板 | 标记（行号） | 包裹形态 | 容器 | 分型 |
|---|---|---|---|---|---|
| skill-bill | account_query.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | account_write.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | analysis_compare.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | analysis_overview.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | analysis_trend.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | goal_query.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | goal_write.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | help.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | link_submit.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | record_add.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | record_detail.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | record_range.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | record_search.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | record_today.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | record_update.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-bill | setup_run.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-calorie | diet.html | sharedHelpers@37 · sharedCss@7 | sharedHelpers=bare · sharedCss=style | — | legacy |
| skill-calorie | exercise.html | sharedHelpers@37 · sharedCss@7 | sharedHelpers=bare · sharedCss=style | — | legacy |
| skill-calorie | goal.html | sharedHelpers@37 · sharedCss@7 | sharedHelpers=bare · sharedCss=style | — | legacy |
| skill-calorie | help.html | sharedHelpers@37 · sharedCss@7 | sharedHelpers=bare · sharedCss=style | — | legacy |
| skill-calorie | home.html | sharedHelpers@37 · sharedCss@7 | sharedHelpers=bare · sharedCss=style | — | legacy |
| skill-calorie | photo-gallery.html | sharedHelpers@37 · sharedCss@7 | sharedHelpers=bare · sharedCss=style | — | legacy |
| skill-chef | cooking_run.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-chef | help.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-chef | history_query.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-chef | history_record.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-chef | recipe_search.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-chef | recipe_view.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-chef | recipe_write.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-chef | shopping_query.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | care_query.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | care_receipt.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | help.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | inventory_records.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | inventory_round.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | item_detail.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | item_receipt.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | item_search.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | item_update_receipt.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | location_query.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | location_receipt.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | outfit_pick.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | shopping_query.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | shopping_receipt.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | stats_alert.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | stats_overview.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | tag_query.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | tag_receipt.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | ticket_query.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | ticket_receipt.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-home | trip_receipt.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-memo-ilife | change_category.html | injectData@110 · sharedHelpers@111 · sharedCss@7 | injectData=script · sharedHelpers=script · sharedCss=style | payload（type=application/json） | data-page |
| skill-memo-ilife | init_report.html | injectData@107 · sharedHelpers@108 · sharedCss@8 | injectData=script · sharedHelpers=script · sharedCss=style | payload（type=application/json） | data-page |
| skill-memo-ilife | memo_query.html | injectData@64 · sharedHelpers@65 · sharedCss@7 | injectData=script · sharedHelpers=script · sharedCss=style | payload（type=application/json） | data-page |
| skill-memo-ilife | sync_report.html | injectData@324 · sharedHelpers@325 · sharedCss@8 | injectData=script · sharedHelpers=script · sharedCss=style | payload（type=application/json） | data-page |
| skill-memo-ilife | wish_complete.html | injectData@92 · sharedHelpers@93 · sharedCss@7 | injectData=script · sharedHelpers=script · sharedCss=style | payload（type=application/json） | data-page |
| skill-memo-ilife | wish_plan.html | injectData@95 · sharedHelpers@96 · sharedCss@7 | injectData=script · sharedHelpers=script · sharedCss=style | payload（type=application/json） | data-page |
| skill-schedule | help.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-schedule | plan_day.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-schedule | plan_receipt.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-schedule | record_compare.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-schedule | record_day.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-schedule | record_detail.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-schedule | record_range.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |
| skill-schedule | record_receipt.html | content@12 · sharedHelpers@14 · sharedCss@6 | content=bare · sharedHelpers=bare · sharedCss=bare | — | content-page |

## 汇总

| 分型 | 数量 |
|---|---|
| data-page | 6 |
| content-page | 53 |
| legacy | 6 |
| **合计** | **65** |

分型计数：数据页 6 ／ 内容页 53 ／ 遗留 6 ／ 合计 65
技能分布：skill-bill 16 · skill-calorie 6 · skill-chef 8 · skill-home 21 · skill-memo-ilife 6 · skill-schedule 8
[OK] 65 个模板逐一命中且仅命中一型（无「两类都不属于且非 legacy」）
[OK] 载荷槽零冲突（无模板同时含 INJECT-DATA 与 CONTENT）
[OK] 数据页的 INJECT-DATA 全部落在自带容器内
[OK] 与清单逐条一致（65 条）：.scratch\t118\template-inventory.md
```
