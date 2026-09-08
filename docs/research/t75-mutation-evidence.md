# #75 变异自证（mutation evidence）— 输出快照

> 可复跑：`node docs/research/t75-mutation-evidence.mjs`（需先 `pnpm build`）。判据：每条变异必须让**指定判据变红**；**命中只从失败行取**（`node --test` 的 `✖` 行／视觉脚本的 `**FAIL**` 表行／导入即抛错的错误文案行，返修 W7）；变异前记录目标文件 sha256、`finally` 逐字节还原并**自证 sha 相同**＋还原后重跑 fail=0。

```
# #75 变异自证（mutation evidence）

| 变异 | 破坏什么 | 结果 | 证据（对应判据是否变红） |
|---|---|---|---|
| M1 | 改一个 token 值（产出层硬编码错误值） | PASS | fail=2；失败行命中预期判据=T4 :root 块逐 token 逐值／T18b :root 块逐字节等于契约 |
| M2a | 去掉一个命名空间（emptyState 根类名改坏） | PASS | fail=2；失败行命中预期判据=T8 每个区都有真实规则 |
| M2b | 去掉一个命名空间（删 helpShell 区实现 → 闭集守卫 fail-fast） | PASS | fail=1；错误文案命中预期判据=CONTROL_STYLE_SECTIONS 闭集缺样式区实现 |
| M3 | 让 extraCss 能改基座（追加改前置） | PASS | fail=3；失败行命中预期判据=T15 extraCss 原样追加／T14 同源 |
| M4 | charts 区重述（不再复用 chartsCss） | PASS | fail=3；失败行命中预期判据=T12 charts 区逐字节复用 |
| M5 | 类名撞车处置失效（errorReceipt 退回裸 .ilife-error） | PASS | fail=2；失败行命中预期判据=T21 类名撞车处置 |
| M6 | **删除 `.ilife-toast` 整条基座规则**（返修③核心变异：旧断言下全绿） | PASS | fail=2；失败行命中预期判据=T8 每个区都有真实规则 |
| M7 | **删除 `.ilife-copy-btn` 整条基座规则**（返修③核心变异：旧断言下全绿） | PASS | fail=2；失败行命中预期判据=T8 每个区都有真实规则 |
| M8 | 掏空 `.ilife-toast` 基座规则（只留 1 条声明 → 声明数下限必须拦住） | PASS | fail=2；失败行命中预期判据=T8 每个区都有真实规则 |
| M9 | 重新加回 `.ilife-toast{flex-wrap:wrap}` 权宜补丁（W1：T23 的「补丁已删」断言必须变红） | PASS | fail=1；失败行命中预期判据=T23 运行时 toast |
| M10 | `.ilife-toast-count` 圆角 8px → 6px（返修②：严格圆角集必须变红） | PASS | exit=1；失败行命中预期判据=H-10c／H-10a |
| M11 | 冻结 token `--blue` 改 `#123456`（返修⑧：契约外部 oracle 必须变红） | PASS | exit=1；失败行命中预期判据=H-01c／H-01d |
| M12 | `.ilife-error-actions` grid → flex（返修⑤：两行 grid 实测必须变红） | PASS | exit=1；失败行命中预期判据=B-12i／B-12j |
| M13 | 删掉 `extraCss` 三禁守卫调用（返修⑨：T24 必须变红） | PASS | fail=1；失败行命中预期判据=T24 extraCss 三禁强制 |
| M14 | 删掉 `.ilife-toast{animation:…}`（W4：入场动效判据必须变红） | PASS | exit=1；失败行命中预期判据=H-21a |
| M15 | `.ilife-copy-btn.copied` 背景改非成功色（W3：copied 变绿判据必须变红） | PASS | exit=1；失败行命中预期判据=B-12m |
| M16 | 删掉 `.ilife-error-actions{max-width:520px}`（W5：旧 `.hm-actions` 等价判据必须变红） | PASS | exit=1；失败行命中预期判据=B-12j |
| M17 | statusBadge ok 字色 `#1f8c3d` → `#1f8f3d`（W2：旧逐值判据必须变红） | PASS | fail=1；失败行命中预期判据=T25 statusBadge |
| M18 | 破坏 helpers 运行时 toast 结构（body 类名改坏 → W1 结构判据必须变红） | PASS | exit=1；失败行命中预期判据=H-12d |
| M19 | 删掉 reduced-motion 下 `.ilife-toast{animation:none}`（W4 归零判据必须变红） | PASS | exit=1；失败行命中预期判据=H-21c |
| P1 | **无变异探针**：`DSH_BROWSER` 指向不存在路径 → 视觉脚本必须显式 exit 1（返修⑦） | PASS | exit=1；错误文案命中预期判据=DSH_BROWSER 显式指向的浏览器不存在 |

变异前 sha256（目标文件）：
  style.js  3f3a886aec4540fc5a40d47510dd0a3d6c1d607add2e09d619d73023f96546bf
  spec/style.js  be91370ca65d2139e74908cce35059dac3fe63834e2e146641d487010767600e
  controls.js  d436f7b34b18a8d2a33a376f3a4b9020fd181a8b434ebdf9ed751d180ffe660e
还原后重跑 style.test.mjs：fail=0（绿，还原有效）
还原自证：上述 sha256 逐文件与变异前**相同**（脚本内断言，不等即 exit 1）。
RESULT: 21/21 变异使对应判据变红
```
