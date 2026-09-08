# #75 变异自证（mutation evidence）— 输出快照

> 可复跑：`node docs/research/t75-mutation-evidence.mjs`（需先 `pnpm build`；脚本会在 `dist/` 上施加变异并**自动还原**，末行 `RESULT: n/m`，任一变异未变红即 exit 1）。

```
# #75 变异自证（mutation evidence）

| 变异 | 破坏什么 | 结果 | 证据（对应测试是否变红） |
|---|---|---|---|
| M1 | 改一个 token 值（产出层硬编码错误值） | PASS | fail=2；命中预期用例=T4 :root 块逐 token 逐值／T18b :root 块逐字节等于契约 |
| M2a | 去掉一个命名空间（emptyState 根类名改坏） | PASS | fail=2；命中预期用例=T8 每个区都有真实规则 |
| M2b | 去掉一个命名空间（删 helpShell 区实现 → 闭集守卫 fail-fast） | PASS | fail=1；命中预期用例=CONTROL_STYLE_SECTIONS 闭集缺样式区实现 |
| M3 | 让 extraCss 能改基座（追加改前置） | PASS | fail=2；命中预期用例=T15 extraCss 原样追加／T14 同源 |
| M4 | charts 区重述（不再复用 chartsCss） | PASS | fail=3；命中预期用例=T12 charts 区逐字节复用／T13 零装饰渐变 |
| M5 | 类名撞车处置失效（errorReceipt 退回裸 .ilife-error） | PASS | fail=1；命中预期用例=T21 类名撞车处置 |

还原后重跑：fail=0（绿，还原有效）
RESULT: 6/6 变异使对应测试变红
```

