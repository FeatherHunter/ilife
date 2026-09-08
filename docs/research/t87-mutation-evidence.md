# #87 变异自证（输出命名规范复刻）

复跑：`node docs/research/t87-mutation-evidence.mjs`（自持 `gate.lock`，finally 释放）。

口径：每个变异只改**本票独占路径**的一处字符串 → `pnpm build` → `node --test packages/skill-calorie/test/output-naming-87.test.mjs`
→ 断言预期用例出现在 TAP 失败集 → 逐字节还原 → 复跑断言全绿。

| 变异 | 文件 | 破坏点 | 预期红 | 实际红用例数 | 命中 | 还原 | 复绿 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M1 同秒冲突计数改成「不加 1」 | `packages/skill-calorie/src/output.ts` | `: command + '_' + stamp + '_' + String(n + 1) + HTML_EXT;` → `: command + '_' + stamp + '_' + String(n) + HTML_EXT;` | #87 ④ | 2 | 是 | 是 | 是 | PASS |
| M2 输出目录名 calorie_html → html_out | `packages/skill-calorie/src/output.ts` | `export const HTML_DIR_NAME = 'calorie_html';` → `export const HTML_DIR_NAME = 'html_out';` | #87 ⑤ | 1 | 是 | 是 | 是 | PASS |
| M3 <中文command> 真值从 title 改成 registry key | `packages/skill-calorie/src/output.ts` | `return sanitizeFilenamePart(hit.title);` → `return sanitizeFilenamePart(key);` | #87 ③ | 6 | 是 | 是 | 是 | PASS |
| M4 时间戳去掉零填充 | `packages/skill-calorie/src/output.ts` | `const p = (n: number): string => String(n).padStart(2, '0');` → `const p = (n: number): string => String(n);` | #87 ② | 6 | 是 | 是 | 是 | PASS |
| M5 CLI 默认落点改成固定名（不跟随 SKILLS_DB_PATH） | `packages/skill-calorie/src/cli/cmd_read.ts` | `const htmlTarget = o.output ?? o.html ?? resolveDefaultHtmlPath(o.key as string);` → `const htmlTarget = o.output ?? o.html ?? resolveExplicitHtmlPath('calorie_html_flat.html');` | #87 ⑥ | 3 | 是 | 是 | 是 | PASS |

## 实际红用例（逐条）

### M1 同秒冲突计数改成「不加 1」

```
#87 ④ 同秒冲突：无冲突 → 无后缀；已有 1 个 → _2；已有 2 个 → _3
#87 ⑦ CLI 同秒冲突：同秒已有同名 → 自动追加 _2（预置未来 10 秒，避免跨秒抖动）
```

### M2 输出目录名 calorie_html → html_out

```
#87 ⑤ 默认落点：<SKILLS_DB_PATH>/calorie_html/<中文command>_<stamp>[_N].html，目录递归创建
```

### M3 <中文command> 真值从 title 改成 registry key

```
#87 ③ <中文command> 真值 = CALORIE_COMBOS[key].title（77 键全量，且清洗为恒等）
#87 ③c 反例：wake_word 不是命令名真值（含空格/括号，且与 CLI 键非一一对应）
#87 ⑤ 默认落点：<SKILLS_DB_PATH>/calorie_html/<中文command>_<stamp>[_N].html，目录递归创建
#87 ⑥ CLI 默认落盘：无 flag 也写 calorie_html，落点经 envelope data.output 回传
#87 ⑥b stat 形状逐键生效：calorie.view.home 落「今日总览_<TS>.html」，metrics 不受 output 影响
#87 ⑦ CLI 同秒冲突：同秒已有同名 → 自动追加 _2（预置未来 10 秒，避免跨秒抖动）
```

### M4 时间戳去掉零填充

```
#87 ② 时间戳：YYYYMMDD_HHMMSS 零填充 ＋ 本地时区
#87 ④ 同秒冲突：无冲突 → 无后缀；已有 1 个 → _2；已有 2 个 → _3
#87 ⑤ 默认落点：<SKILLS_DB_PATH>/calorie_html/<中文command>_<stamp>[_N].html，目录递归创建
#87 ⑥ CLI 默认落盘：无 flag 也写 calorie_html，落点经 envelope data.output 回传
#87 ⑥b stat 形状逐键生效：calorie.view.home 落「今日总览_<TS>.html」，metrics 不受 output 影响
#87 ⑦ CLI 同秒冲突：同秒已有同名 → 自动追加 _2（预置未来 10 秒，避免跨秒抖动）
```

### M5 CLI 默认落点改成固定名（不跟随 SKILLS_DB_PATH）

```
#87 ⑥ CLI 默认落盘：无 flag 也写 calorie_html，落点经 envelope data.output 回传
#87 ⑥b stat 形状逐键生效：calorie.view.home 落「今日总览_<TS>.html」，metrics 不受 output 影响
#87 ⑦ CLI 同秒冲突：同秒已有同名 → 自动追加 _2（预置未来 10 秒，避免跨秒抖动）
```

**总判：PASS（5/5 变异全部红→绿闭环）**
