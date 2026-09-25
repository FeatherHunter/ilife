---
'base-link-core': minor
'base-paint': minor
---

#952 数据族·公共层：envelope 形状集合新增 `resultset`（结果集，一次或多次查询的产物；数据族用，不参与渲染）。

正本 `packages/base-link-core/src/envelope.ts` 的 `ENVELOPE_SHAPES` 由 6 形状扩到 7（新项追加在末尾），
并新增 `EnvelopeDataByShape.resultset` 与 `assertShapeData` 的 `resultset` 分支——只判 `results` 必须为数组
（空集 `{ results: [] }` 合法，是事实不是错误）；项内字段（`rows`／`fields`／`total`／`next`／`error`）由数据族
装配决定，不在信封层加码。同步 `base-paint` 的零依赖副本 `STRICT_ENVELOPE_SHAPES`、冻结面签名串
（`src/spec/index.ts`）与 `docs/base-paint-contract.md` §3.1 标记区表格（三处同步，由签名测试钉死）。

既有六形状的语义、字段名与校验强度一字未动；渲染路径行为不变——`SERIALIZABLE_SHAPES` 仍是那 5 个
（七形状去掉 `fallback` 与 `resultset`）。证据：`docs/base/base-link-core/t952-证据.md`。
