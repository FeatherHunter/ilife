# t269 → #276 交接：`write.ts` 插入点（本票留空，未代写）

> 归属 `docs/skills/skill-calorie/t269-handover-276.md`。编排者合并用；#276 席按此插入，不要改本票已提交行。

## 精确插入点

- 文件：`packages/skill-calorie/src/cli/write.ts`
- 导入区锚点：第 44 行 `import { dietReceiptDoc } from '../diet/receipt.js';` 的下一行。#276 如需新增能力目录的整页端口，在此按同形状加一行直引（例如 `import { xxxReceiptDoc } from '../xxx/receipt.js';`），不经能力 `index.ts` 转出亦可（本票未动 `src/diet/index.ts` 即为先例）。
- 分派锚点：第 68 行 `return { data: { ...res.data, receipt }, html: profileReceiptDoc(key, params, receipt, db) ?? dietReceiptDoc(key, params, receipt, db) ?? res.html };`。#276 在 `dietReceiptDoc(...)` 与 `res.html` 之间按 `?? 下一个Doc(key, params, receipt, db)` 续接（第 67 行注释即此意）。对地图目标的帮助：同一条真出口保持“按序试门、未命中放行”，新增命令的回执页与饮食 13 条同路，不另起第二条出口。
- 禁止：不要在本文件写任何 `calorie.*` 字面量比较（`case`／`===`／就地键集查询一律不写；棘轮 `test/cmd-registry-294.test.mjs` 按行为口径数，塞一条当场变红）。具名键集住各自能力目录的 `receipt.ts` 数据位。

## 本票已交付形状（供合并时核对）

- `src/diet/receipt.ts` 导出 1 个：`dietReceiptDoc(key, params, receipt, db)`（13 条命中整页，其余返回 null）。
- `src/cli/write.ts` 第 68 行是唯一分派改动；其余行与基线一致（`git diff -- packages/skill-calorie/src/cli/write.ts` 只有导入 3 行＋注释 2 行＋分派 1 行）。

## 下一手缺什么

- #276 提交可构建状态后，本票重跑：`pnpm build` exit 0、13 条逐条实跑完整文档、其余 29 条逐 sha256 不变、全包测试不新增红，并补 `GATE-RUN` 对账。
- 当前挡住现场：`.scratch/t269/build-after.log`（`TS2820`，`src/diet/routes.ts:36`，#276 未提交）。
