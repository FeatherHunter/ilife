---
"skill-calorie": patch
---

feat(364): 身体细节两条写词（「删体脂」／「删围度」）删除取快照——删前先取这条记录（`fetch/body.ts` 新增 `compositionSnapshot`／`measurementSnapshot`，`delete*` 在置废之前读并随返回值带回），回执摘要与 `items[0].detail` 按中文标签表带出**逐字段的删前值**（缺项 `—`，唯一来源 MEASUREMENT_ZH／CALIPER_SITE_LABELS／SOURCE_LABELS）；软删语义一字未动。附 7 条判据测试（逐格等于删前查库值／主键读侧查不到／落盘页可读／裁定 2 两条分开）＋四处源码级变异与归属探针。
