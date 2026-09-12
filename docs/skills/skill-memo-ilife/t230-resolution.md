## 关票决议（2026-09-12）

**结论：出口行为已被五道锁钉住，验收通过；编排会话独立复跑验证。**

### 交付物

- `packages/skill-memo-ilife/test/cli-help-230.test.mjs`（15 254 B／**5 例**）——真 spawn 出口；
- `packages/skill-memo-ilife/package.json`：`scripts.test` 从 `node --test ../../test/scaffold.test.mjs` 补成 **`node --test ../../test/scaffold.test.mjs test/*.test.mjs`**（＝裁决 5 §五-4 那条「包内 `test` 脚本盖不到包内用例」的账，**同批修**）；
- 交付报告 `t230-report.md`。

### 五例（真 spawn，编排会话复跑）

| 例 | 锁什么 |
|---|---|
| ① | **名字通式与落点**（`备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html`，扁平 `memo_html/`） |
| ② | **help 模板前后缀逐字** |
| ③ | **并发 6 次独占递补**（`_2` 起） |
| ④ | **三支互不串**（缺省／`mode:"lookup"`／`q`） |
| ⑤ | **退出码矩阵**（0／2 参数错／5 落盘失败／3 未知 key） |

**编排会话独立复跑**：`node --test packages/skill-memo-ilife/test/cli-help-230.test.mjs` → **`tests 5 / pass 5 / fail 0`（exit 0）**。

### 两次变异自证（红 → 绿）——**本席亲验还原的字节级证据**

| 变异 | 预测 | 实测 |
|---|---|---|
| 改「文件名主体」 | ①④红 | **①④红**（例③**有意不**断言名字通式，故仍绿 ⇒ 变异签名指向唯一一处） |
| `wx` → `w` | ③红 | **③红** |

**还原证据（本席复核）**：它把变异用过的两个源件**逐字还原、净改动为零**，并记了 sha256。本席实测 `src/help/manifest.ts` ＝ **`B5550525605D3BE95DC8B2ACBF008489D759075E3F525C84E15A30722F72761F`**，**与报告记录逐字相同**；`src/` 内已无变异标记 `HELPX`。

### 一处值得记账的坑（它踩到并处置正确）

**还原后若只重跑 `tsc --build` 会因 `tsconfig.tsbuildinfo` 陈旧而增量跳编** ⇒ 可能给出**假红或假绿**。它按本席简报的警告**先删 `tsbuildinfo` 再 `--force` 全量重建**（记账那张图与票 12 都在这里栽过）。这条已写进报告 §3.3。

### 回归：生产件被碰过，但产物未变（本席亲验）

本票为做变异自证**临时改过两个生产件**（`src/help/manifest.ts`／`src/help/memoOutput.ts`）。本席在它交付后**重新构建 ＋ 真跑端到端**：

```
BUILD EXIT = 0 ；  E2E EXIT = 0
delivery.bytes = 130825        ← 与之变更前验证过的产物逐字节相同
SHA-256 = 7CBE622A31849573B1AB5598…（与 13:44 那份完全一致）
.db\memo 仍不存在               ← 「跑完不建库」的不变量未被破坏
```

⇒ **它的接缝改动没有改变行为**。这类「为了锁行为而去动被锁的行为」是上锁工序最容易反噬的地方，故本席逐次回归。

### 边界与纪律

**未跑**仓根 `tsc -b`／`pnpm -r build`；**未重启／未杀** GUI；**未动暂存区**；`packages/base-render/**` 未碰；仓库根 `.scratch-*` ＝ **0**。
