---
"skill-calorie": patch
---

feat(444): 对比体脂未知来源校验与体成分看命令同口径

`calorie.view.body-composition-compare` 复用 `src/fetch/body.ts` 已有 `assertSourceFilter`
（#398 同一道门）：未知来源抛错并点名合法值（`home_caliper / hospital / gym` 或 `all`）；
`all`＝不按来源过滤（与 `listCompositions` 同式）。对比围度无来源入口（围度表无来源列），行为不动。
用例：新增 `t444-对比来源校验.test.mjs` 6/6，变异改坏必红／还原必绿两行读数见证据。
