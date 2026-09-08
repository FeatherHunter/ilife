---
'skill-calorie': patch
---

#93（map #63）只读取证路径：新增 `src/db/readonly.ts`（`openDbReadOnly`——只读打开、**不建表不迁移**、库文件不存在直接抛），并让**读键**经只读句柄打开（写键或库文件尚不存在时仍走 `openDb`，语义未改）。

- **零风险取证基线**：`docs/research/t93-readonly-baseline.md` ＋ 可复跑 `docs/research/t93-baseline.mjs`（真库 sha256/size/mtime 前后全等；3 个已验证历史日期；六形取样；`fallback` 形 CLI 不可达的实测结论）。
- **自证**：8 条单测（读键可用／不触发迁移／写入被拒）＋ 变异（去掉 `readOnly` → 「写入被拒」红）＋ 77 键实跑 361 记录零非零退出；接线前后 48/48 键 exit＋stdout 完全一致。
