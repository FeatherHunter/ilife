---
'skill-calorie': minor
---

#363 补记查冲突：`calorie.body.composition-add`（唤醒词「补记体脂」）与 `calorie.body.measure-add`（「补记围度」）在**同一天已有记录**时，回执可见文本**先把既有那条的字段值逐格摆出来**再给本次写库结论——体脂摆「来源／体脂率／皮褶 7 点／备注」，围度摆「13 部位／备注」，**缺项一律写 `—`**（裁定 2 的可见文本那一半；老技能原话「如果那天已有记录，请先告诉我冲突再确认」）。冲突同时进回执 `items[]`（`status=同日已有记录（冲突）`，带既有记录 id／日期），既有多条**逐条**摆出（`ORDER BY id ASC`，不取首条）。

**写库行为本身一行未动**：冲突只加一段可见文本，本次补记照写（不拦、不覆盖、不合并），换一天（无既有记录）时回执**逐字**仍是旧口径那一句（不恒打）。取数新增同日既有记录的**唯一取数口** `fetch/body.ts` 的 `compositionsOnDate`／`measurementsOnDate`（返回原始列值，缺项 `null`，`—` 只由命令层写、不回写库）；13 部位中文名照 `MEASUREMENT_ZH`、7 点站名照 `bodyPlate.ts` 的 `CALIPER_SITE_LABELS`，不抄第二份表。

新增 `test/t363-补记查冲突.test.mjs`（7 用例：逐格对手写样例＋脚本查库值／同日多条／无既有记录不恒打／裁定 2 两条分开／唤醒词接通面）；变异自证两处（冲突检查短路、既有值取错列）改坏必红、还原必绿。`npx tsc -b packages/skill-calorie` exit 0；告警线门 `RESULT: 58/58 PASS`。配套台账行（`src/fetch/body.ts` 挂号线 369、当场实测 406→426）由他席 `--sync` 落在其 `packages/skill-calorie/AGENTS.md`，本票未碰该件。
