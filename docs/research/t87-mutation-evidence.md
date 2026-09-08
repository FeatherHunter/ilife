# #87 变异自证（输出命名规范复刻 · 返修轮）

复跑：`node docs/research/t87-mutation-evidence.mjs`（自持 `.scratch/locks/gate.lock`，`finally` 释放）。

**本文件是 2026-09-09 实跑抄录**；脚本自身的输出写 `.scratch/t87/mutation-evidence-<ts>.md`（施工草稿，gitignore），
**不再覆写本文件**（返修 F7：否则每次复跑都会把工作树弄脏）。

口径：记目标文件 sha256 → 只改**本票独占路径**的一处字符串 → `pnpm build` → `node --test packages/skill-calorie/test/output-naming-87.test.mjs`
→ 断言预期用例出现在 TAP 失败集 → **逐字节还原** → 复跑断言全绿 → **断言还原后 sha256 与跑前相同**。
变异 M5 的「固定落点名」落在脚本**独占临时根**（`t87-mutation-<随机>`，协议 §2.1-4）内，跑完按**路径守卫**删除；
收尾自证仓库根无 `calorie_html_flat.html` 残留。

| 变异 | 文件 | 破坏点 | 预期红 | 实际红用例数 | 命中 | 还原(字节+sha256) | 复绿 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M1 同秒冲突计数改成「不加 1」 | `packages/skill-calorie/src/output.ts` | `String(n + 1)` → `String(n)` | `#87 ④` | 3 | 是 | 是 | 是 | PASS |
| M2 输出目录名 calorie_html → html_out | 同 | `HTML_DIR_NAME = 'calorie_html'` → `'html_out'` | `#87 ⑤` | 1 | 是 | 是 | 是 | PASS |
| M3 `<中文command>` 真值从 title 改成 registry key | 同 | `sanitizeFilenamePart(hit.title)` → `sanitizeFilenamePart(key)` | `#87 ③` | 7 | 是 | 是 | 是 | PASS |
| M4 时间戳去掉零填充 | 同 | `String(n).padStart(2, '0')` → `String(n)` | `#87 ②` | 7 | 是 | 是 | 是 | PASS |
| M5 CLI 默认落点改成固定名（不跟随 `SKILLS_DB_PATH`） | `packages/skill-calorie/src/cli/cmd_read.ts` | `resolveDefaultHtmlPath(o.key)` → `resolveExplicitHtmlPath('<独占临时根>/calorie_html_flat.html')` | `#87 ⑥` | 5 | 是 | 是 | 是 | PASS |
| **M6 截断改回按 UTF-16 码元（返修 F1）** | `packages/skill-calorie/src/output.ts` | `[...s].slice(0, 32).join('')` → `s.slice(0, 32)` | `#87 ①b` | 1 | 是 | 是 | 是 | PASS |
| **M7 同秒计数改回大小写敏感（返修 F2）** | 同 | 两侧 `toLowerCase()` 比较 → 原样比较 | `#87 ④b` | 1 | 是 | 是 | 是 | PASS |
| **M8 落点解析失败不包渲染失败（返修 F4）** | `packages/skill-calorie/src/cli/cmd_read.ts` | `try/catch → fail(5, '渲染失败：…')` → 裸 `const htmlTarget = …` | `#87 ⑨` | 1 | 是 | 是 | 是 | PASS |

## 还原自证（sha256 前 16 位）

| 文件 | 跑前 sha256 | 跑后 sha256 | 相同 |
| --- | --- | --- | --- |
| `packages/skill-calorie/src/output.ts` | `49f9331d7d5706b1` | `49f9331d7d5706b1` | 是 |
| `packages/skill-calorie/src/cli/cmd_read.ts` | `7622528a1d0897f2` | `7622528a1d0897f2` | 是 |

## 实际红用例 ＋ 破坏后实测诊断（逐条）

> TAP 会把用例名首字符 `#` 转义成 `\#`（TAP 注释语法），下表为逐字抄录。

### M1 同秒冲突计数改成「不加 1」

```
\#87 ④ 同秒冲突：无冲突 → 无后缀；已有 1 个 → _2；已有 2 个 → _3
\#87 ④b 同秒计数大小写不敏感（旧 glob 在 Windows 走 normcase）：.HTML 也算冲突，原文件不被覆盖
\#87 ⑦ CLI 同秒冲突：同秒已有同名 → 自动追加 _2（预置未来 10 秒，避免跨秒抖动）
```

破坏后诊断：`expected: '今日总览_20260726_123000_2.html' / actual: '今日总览_20260726_123000_1.html'`

### M2 输出目录名 calorie_html → html_out

```
\#87 ⑤ 默认落点：<SKILLS_DB_PATH>/calorie_html/<中文command>_<stamp>[_N].html，目录递归创建
```

破坏后诊断：`expected: 'calorie_html' / actual: 'html_out'`

### M3 `<中文command>` 真值从 title 改成 registry key

```
\#87 ③ <中文command> 真值 = CALORIE_COMBOS[key].title（77 键全量，且清洗为恒等）
\#87 ③c 反例：wake_word 不是命令名真值（含空格/括号，且与 CLI 键非一一对应）
\#87 ④b 同秒计数大小写不敏感（旧 glob 在 Windows 走 normcase）：.HTML 也算冲突，原文件不被覆盖
\#87 ⑤ 默认落点：<SKILLS_DB_PATH>/calorie_html/<中文command>_<stamp>[_N].html，目录递归创建
\#87 ⑥ CLI 默认落盘：无 flag 也写 calorie_html，落点经 envelope data.output 回传
\#87 ⑥b stat 形状逐键生效：calorie.view.home 落「今日总览_<TS>.html」，metrics 不受 output 影响
\#87 ⑦ CLI 同秒冲突：同秒已有同名 → 自动追加 _2（预置未来 10 秒，避免跨秒抖动）
```

破坏后诊断：`calorie.diet.add 命令名必须逐字等于注册表 title | expected: '记一餐' / actual: 'calorie.diet.add'`

### M4 时间戳去掉零填充

```
\#87 ② 时间戳：YYYYMMDD_HHMMSS 零填充 ＋ 本地时区
\#87 ④ 同秒冲突：无冲突 → 无后缀；已有 1 个 → _2；已有 2 个 → _3
\#87 ④b 同秒计数大小写不敏感（旧 glob 在 Windows 走 normcase）：.HTML 也算冲突，原文件不被覆盖
\#87 ⑤ 默认落点：<SKILLS_DB_PATH>/calorie_html/<中文command>_<stamp>[_N].html，目录递归创建
\#87 ⑥ CLI 默认落盘：无 flag 也写 calorie_html，落点经 envelope data.output 回传
\#87 ⑥b stat 形状逐键生效：calorie.view.home 落「今日总览_<TS>.html」，metrics 不受 output 影响
\#87 ⑦ CLI 同秒冲突：同秒已有同名 → 自动追加 _2（预置未来 10 秒，避免跨秒抖动）
```

破坏后诊断：`expected: '20260726_123000' / actual: '2026726_12300'`

### M5 CLI 默认落点改成固定名

```
\#87 ④b 同秒计数大小写不敏感（旧 glob 在 Windows 走 normcase）：.HTML 也算冲突，原文件不被覆盖
\#87 ⑥ CLI 默认落盘：无 flag 也写 calorie_html，落点经 envelope data.output 回传
\#87 ⑥b stat 形状逐键生效：calorie.view.home 落「今日总览_<TS>.html」，metrics 不受 output 影响
\#87 ⑦ CLI 同秒冲突：同秒已有同名 → 自动追加 _2（预置未来 10 秒，避免跨秒抖动）
\#87 ⑨ 落点解析失败：exit 5 ＋「渲染失败」文案，不得落到「未知失败」的 exit 4
```

破坏后诊断：`默认目录须在 SKILLS_DB_PATH 下：C:/Users/…/Temp/t87-mutation-v1HW9O/calorie_html_flat.html | expected: true / actual: false`

### M6 截断改回按 UTF-16 码元（返修 F1）

```
\#87 ①b 截断按码点（旧 Python s[:32]）：emoji 不劈代理对，回传名与落盘名逐字节一致
```

破坏后诊断：`expected: 'a😀×20（21 码点）' / actual: 'a😀×15 + \ud83d（17 码点，孤立代理项）'`

### M7 同秒计数改回大小写敏感（返修 F2）

```
\#87 ④b 同秒计数大小写不敏感（旧 glob 在 Windows 走 normcase）：.HTML 也算冲突，原文件不被覆盖
```

破坏后诊断：`目录内已有 .HTML → 必须选 _2（否则 Windows 上覆盖原文件） | expected: '今日总览_20260726_123000_2.html' / actual: '今日总览_20260726_123000.html'`

### M8 落点解析失败不包渲染失败（返修 F4）

```
\#87 ⑨ 落点解析失败：exit 5 ＋「渲染失败」文案，不得落到「未知失败」的 exit 4
```

破坏后诊断：`须 exit 5（渲染/落盘），实得 4 stderr=ERR 4: 未知失败：EEXIST: file already exists, mkdir '…\calorie_html' | expected: 5 / actual: 4`

## 工作区残留自证

- 仓库根 `calorie_html_flat.html` 残留：**无**
- 变异用独占临时根（跑完按路径守卫删除）：`C:\Users\<user>\AppData\Local\Temp\t87-mutation-v1HW9O`

**总判：PASS（8/8 变异全部红→绿闭环）**
