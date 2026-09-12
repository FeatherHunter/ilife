## Question

让「备忘录 help」**缺省就交付 HELP 文件**（照 `#144`／`#190`）：产物落 `<SKILLS_DB_PATH>/memo_html/备忘录_HELP_<YYYYMMDD_HHMMSS>[_N].html`，回执顶层给绝对路径。

（原票面正文见本票历史版本；本版为关票时的终版。）

## 决议

- **缺省＝HELP 文件**，**速查走显式参数**（裁决 2）：`mode:"lookup"` → `备忘录_速查表_<stamp>.html`；`q` → 只回命中、**零落盘**；`--html` → 逐字覆盖写；`q` 与 `mode` 互斥 → `exit 2`。
- **落盘扁平**（裁决 1）：`<SKILLS_DB_PATH>/memo_html/`，**不加 `help/` 层**。
- **管线自持**（裁决 3 判「甲」）：`src/help/memoOutput.ts`（9 导出，命名与落盘合一件），件头写明「第 4 份同逻辑 ＋ 指向共用件票 `#237` ＋ 指向迁移票 `#240`」；**`_N` 从 `_2` 起**（同秒连跑三次得本体／`_2`／`_3`）。
- **分派先于开库**：`src/cli/cmd_read.ts` 把 `memo.help.lookup` **在 `openMemoDb` 之前**分派（`dispatchHelp` 不需要 `MemoDb`），并补内部断言防止它走回开库分支；初始化判据＝「memo 库目录存在」（只 `stat`，**绝不建库**）。
- **命令表 10 → 11**：`src/render/envelope.ts` 补 `'memo.help.lookup': 'list'`，并**同批**处理裁决 13 的四处连带：D1（`docs/memo-migration-split.md` 标题 10→11 处 ＋ 围栏块补行 ＋ `test/memo-split.test.mjs:15` 10→11）／D2（`test/render.test.mjs` 计数 10→11 ＋ `GOOD` 夹具补第 11 条载荷）／D3（**不改测试**——`packages/base-combos/combos.yaml` 加一条 + 重跑 `gen-present.mjs`）／D4 归 `#231`。
- **裁决 16 复验**：包根运行时出口仍 **49**，新名字一个都没进；`src/help/index.ts` 未改。

## 完成判据（编排会话**亲自复跑**，非采信汇报）

```
$env:SKILLS_DB_PATH = "D:\2Study\StudyNotes\.db"
node packages/skill-memo-ilife/dist/cli/cmd_read.js memo.help.lookup
EXIT CODE = 0
"delivery":{"mode":"file","path":"D:\\2Study\\StudyNotes\\.db\\memo_html\\备忘录_HELP_20260912_134016.html","bytes":130885}
```

- 产物**绝对路径**在回执顶层，文件真在盘上（`130 885` B，与回执 `bytes` 一致），目录件数 **211 → 212**；
- **跑完 `<db>\memo` 目录仍不存在**（跑前 `False` → 跑后 `False`）——这条判据原先**是空过的**（命令在开库前就抛，开库那段根本没走到），本票**真验**；
- 载荷自报 **8 域／13 二级组／30 场景**、`version 1.3.0`；
- 产物由**通用 help 模板**渲染：与同流水线产出、已被维护者终审过的 `calorie_html\卡路里_HELP_20260912_001033.html` **指纹逐项同形**（`help-data`×2／`<title>`×1／`@media`×6／老家世代的 `window.__DATA__`×0），`<title>备忘录 · 使用手册</title>`。

## 三支显式口径（本票真 spawn 实测）

`{"mode":"lookup"}` → `备忘录_速查表_<stamp>.html` 6476 B／`total: 28`；`{"q":"查提醒"}` → **无 `delivery`、`total: 1`，连 `SKILLS_DB_PATH` 目录本身都没建**（零落盘）；`--html <路径>` 两次 → 覆盖写不递补；`q+mode` 互斥／坏 `mode` → `exit 2`；落盘失败 → `exit 5`。

## 门（本票 ＋ 编排会话复核）

`pnpm boundaries → PASS`（10 条 OK）｜`check-combos → OK: combos 111 注册 + channels 15 对 + scenarios 30 + fallbacks 6 + l6 空位 6`｜`combos-p8 9/9`／`memo-split 2/2`／memo 包内 `48/48`／plugin-memo `17/17`｜`tsc --build packages/skill-memo-ilife/tsconfig.json → exit 0`。

## 如实记的三条

1. **本票超清单改了两件**（已在报告 §7 偏差 2 标注）：`scripts/build-help.mjs:18` 把自述计数从写死的「10 联动」改成派生（该块被 `test/skill.test.mjs:32` 逐字钉死，命令表 11 条后不派生就会自述「11 个键（10 联动）」自相矛盾），并重跑生成器 ⇒ `SKILL.md` **块尾 1 行**随之变化（**正文未碰**、frontmatter 未碰）。
2. **踩坑留证**：连带测试读的是 `packages/base-combos/dist/present.js`（**gitignore 产物**）⇒ **只改 `src` 不重建会红**（实测撞过一次 `RegistryError: 未知 registry key：memo.help.lookup`）；重建 `base-combos` 后转绿（该包闭包只含 `base-link-core`，**不含 `plugin-bill-ilife`**）。
3. **速查支写的是 envelope 片段、不是第二张整页**（跟着 `--html` 既有语义；本包无 `templateFor` 映射，塞 `memo_query.html` 会撞 3 处取不到的字段）。若验收要速查表**也能独立打开**，需**另开一票**（要新增页面模板）——**不在本票**。

## 进度：100%

下一步：已关票。下游 `#230`（CLI 用例锁）／`#231`（说明面）接续；`#233` 真机端到端 ＋ 维护者肉眼终审。
