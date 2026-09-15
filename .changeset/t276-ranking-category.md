---
'skill-calorie': patch
---

#276（map #155）第三阶段：「接对 4 处」逐处做实。

改到的那一处（票面第 5 条的第 1 处，住本票自己的声明件）：
`packages/skill-calorie/src/diet/routes.ts` 的 `list:'new', order:10`（唤醒词「查高热量排行」）——
它的 `cli` 丢了 `category`，实跑落成「全部排行」而不是高热量榜（#272 实测发现，裁定归本票）。
处理函数 `diet/ranking.ts:24` 的判据是「给了 `category` 才出单榜，否则出五类全榜」⇒ 丢了不报错、只静默换页。
照同一类榜的既有现值补齐 `{"category":"high_calorie","topN":10,"window":"7d"}`，不另造第二套取值口径。

新增接线回归门 `packages/skill-calorie/test/diet-ranking-route-t276.test.mjs`（5 用例）：
声明面（类别取 `RANK_CATEGORIES`）／记录面（生成物与声明逐字一致）／
出口面（照该行 cli 实跑 exit 0、页头落「排行 高热量榜」、读数按单榜出）／
两条派生式守卫（带了的类别必须与词说的榜名对得上，且「全都看」那一族必须不带 `category`；`hasNote` 不许被抹掉）。

另 3 处「接对」住本票声明路径之外（`src/home/routes.ts` 两处、`src/diet/library.ts` 一处），
本票**一行未碰**，只出诊断与转票请求：`docs/skills/skill-calorie/t276-接对四处诊断.md`
（逐处给当刻症状／根因行／建议改法／**是不是加法式**）。
