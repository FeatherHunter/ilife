# #1081 判定导出件落点（verdicts/）

负责人逐格判完后，把墙上的清单导出成 JSON 丢进本目录，跑一条命令就汇进「各域逐格结论 ＋ 94 行总账」。**不要手写这些 JSON**——它们由墙自己产出。

## 一、怎么导出（墙右上角两个按钮）

| 按钮 | 做什么 | 存成什么 |
|---|---|---|
| **导出清单JSON** | 浏览器下载一份 JSON | `docs/skills/skill-bill/verdicts/<墙名>.json`（文件名随意，本器只读内容） |
| **复制** | 把同一份 JSON 复制到剪贴板 | 粘进文本文件、同样存成 `.json` |

逐格操作：**满意**＝ok；**不满意**会弹出**必填原因**的框，填完＝不ok＋原因原文；**没点的格＝未判**。

## 二、形状（墙产的，别手改）

```json
{
  "wall": "<墙名>", "total": 17, "ok": 3, "no": 1, "unjudged": 13,
  "items": [ { "wall": "1074-query-17", "seq": 42, "wake": "查今天",
               "prod": "…真跑产物.html", "proto": "…判地原型.html",
               "verdict": "ok", "reason": "" } ]
}
```

`verdict` 三个取值：`ok`（满意）／`no`（不满意，`reason` 是原因原文）／`""`（没勾）。

## 三、不 ok 的格还要点去处

`verdicts/if-not-ok.json`：

```json
{ "w09": "#1234" }
```

缺了它，那一格**报红并点名**（#1081 票面红线：不ok 必须带原因原文与去处票号）。

## 三·补、来源要能追到「谁、什么时候、在哪份件里、对哪一版产物说的」

- **墙导出**的格：汇入器把来源写成导出件自己的路径（`…/verdicts/<墙>.json`）＋ 导出件时刻，原话片段＝不ok 的原因原文（ok 写「满意（墙上勾选）」）。
- **#1078 机读件**的格：只对**登记过人原话的域**开转抄口（本器常量 `HUMAN`：say／setup-help／w09 三条），来源写成「件:行 用户原话…（日期；判于当刻产物）」。**没登记的域报红**，不许只凭机读件把判定上屏。
- 逐行汇总表：`node docs/skills/skill-bill/1081-verdict汇入.mjs --source` ⇒ `docs/skills/skill-bill/1081-verdict溯源.md`。**没来源的格写「未判（无来源）」**。
- **快照口径**：判定是对**当刻产物**说的；之后若渲染又变（如皮肤改动），负责人复看新墙后**重勾重跑即覆盖**（同输入幂等）。

## 四、#1078 那 24 格不用再导

`docs/skills/skill-bill/1078-24页-verdict.json` 已经是机读件（say 16 ＋ w09 ＋ 设置速查 7），本器直接读它。

## 五、跑

```
node docs/skills/skill-bill/1081-verdict汇入.mjs          # 真跑：写判定列 + 打印读数
node docs/skills/skill-bill/1081-verdict汇入.mjs --dry     # 只算不写
node docs/skills/skill-bill/1081-95check.mjs docs/skills/skill-bill/1081-95页-ok总账.md
```

读数四行：`VERDICTS ok n／不ok m／未判 k`、`COVERAGE 墙未覆盖…`、`FILES …`、`RESULT …`；有红则逐条 `RED` 并 exit 1。
