---
'skill-calorie': patch
---

#125（map #63，由 #120 审查 R-3 转出）写层回执与软删幂等语义统一：按 id 的 `updateRecord`／`deleteRecord`
同样跳过软删行（与 `listWindow`／`softDeleteWhere`／#120 `EX_ALIVE` 同款 `COALESCE(is_deleted, 0) = 0`；
`COALESCE` 保住 `is_deleted IS NULL` 的历史活行）。修复前同一张表两套幂等语义：按 id 改／重复删对已软删行
仍 exit 0 报成功（E1／E2），而按日／按范围路径已按活行过滤并对重复删报 exit 4 缺失（E3）。
修复后软删＝不存在：三路径首删 exit 0，重复删除一律 exit 4（按 id 删与“删不存在 id”同错同码）。

**改动**：`src/fetch/exercise.ts`（`updateRecord:199`／`deleteRecord:226` 的取行加活行谓词，
删的落库 `UPDATE` 同加谓词防 race）；`test/cmd-write-40.test.mjs:177` 的旧断言（重复删 id 期望 exit 0，
即 E2 缺陷本身）改为 exit 4。

**证据**：复现探针（修复前 E1＝0／E2＝0／E3＝4，修复后 E1＝4／E2＝4／E3＝4）；
回归测试 `test/softdelete-125.test.mjs` 4 用例（三路径×活行/软删行矩阵／跨路径幂等／活行防过度过滤／
NULL 活行护栏）；2 处 src 级变异自证（update／delete 各自回退即红 `actual: 0 / expected: 4`，还原＋重建即绿，
还原 sha256 `802C358C…F9BA` 一致；期间发现 `tsc -b` 增量 stale 一次，touch 源文件强制重建后对齐，记账备查）。
