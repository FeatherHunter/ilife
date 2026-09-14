---
'skill-calorie': patch
---

#384f：修 compare 页「日均总消耗」的用户可见错读数。原式的对比期读 `buildSeries` 的 `tdee` 字段，
而该字段每行恒为 70 kg parity 的常量（`src/analysis/series.ts:172-176`）⇒ Δ 恒 +79「上升」，
且 |Δ| 最大而霸占「前 3 项变化量」头条与页头摘要。修法：两期同源真体重口径——
新增 `energyOfWindow(prof, series)`（档案四要素 ＋ 该期窗口内最后一次称重，内部仍是原来那句 `energyOf`），
底座改调它（本期逐值不变），对比期改调同一算式；行名不变，口径注同步写实。
不读序列的 `tdee` 字段（70 kg parity 是既有设计，`deficit` 静态口径依赖它，本票不动 `series.ts`）。
补前 7d／30d Δ 皆 +79、产物出现 4 次；补后 7d Δ -4、30d Δ -23、产物出现 0 次。
`test/analysis-report-384.test.mjs` 增 `#384f` 断言（按 `utils.ts` 的 Mifflin-St Jeor 权威算式独立复算对账
＋ 两窗 Δ 必须不同 ＋ 不得等于 79），并更正 `docs/skills/skill-calorie/t384-证据.md` §六 把
`deltaTdee=-46` 判为「自洽」的误判（原文不改，末尾追加「整改更正」一节）。
