# 对抗审查 A · 票 #187 决策（事实面证伪）

- 审对象：`docs/skills/skill-home/t187-decision.md`（**当前磁盘版**，46 行，含 ③ 改「要登记」＋② 补账单 `q` 支两处更正）
- 方法：只读；每断言取现行件证据，`grep -n` 定位 ＋ 定点读，未改任何文件
- 裁决：**整改后通过 76/100**（A 事实 32 ／ B 反证 22 ／ C 可执行 22）

## 一、已核实的断言（真的部分，逐条给证据）

1. **`saveHtmlFile` 会自建目录**：`packages/base-render/src/output/saveHtml.ts:355` 无条件 `mkdirSync(dirAbs,{recursive:true})`；件头 `:48-49` 明写「目录建不动」与「候选已存在」是两类错误 ⇒ 居家的 `home_manager_html/` 不存在也能落。
2. 入参 `{dir, stem?, file?, html, onExists?}`、回执 `HtmlReceipt{mode:'file', path 恒绝对, bytes 写后回读}`（`:339-345`、`:244-251`）；`onExists` **四态**：`succession`（缺省：带时间戳＋`_N` 递补，上限 1000，`:94,376-381`）／`overwrite`（逐字覆盖 `:356-360`）／`fail`（`:370-375`）／`{reuse:'byDay'|'byContent'|{byAge}}`（`:361-368`）；`stem` 与 `file` 只许给一个（`:197-205`）。
3. **中文文件名无任何限制或转义**：非法字符集 `ILLEGAL_CHARS=/[/:*?"<>|]/g`（`:92`）不含 CJK；`washName` 按**码点**截断 180（`:90,157`），`sanitizeStem` 另去结尾点／空格（`:151-152,165`）；递补正则 `:220`、复用正则 `:255-257` 对中文主体安全 ⇒ `居家管家_HELP`／`居家管家_速查表` 可落。
4. 断言 2 的**两个符号**确实已搬走：`nextExclusiveCandidate|writeFileExclusiveWithRetry` 全仓只在注释命中（`packages/skill-bill/src/output.ts:5-6`、`packages/skill-calorie/src/output.ts:23,163`、`packages/skill-chef/src/help/output.ts:5`）；`flag:'wx'` 活代码只剩共用件本体 `saveHtml.ts:235`。
5. `mode` 三条**逐字对得上**账单：`packages/skill-bill/src/cli/cmd_read.ts:116`（`q`×`mode` 互斥 → `fail(2)`）、`:117`（非 `lookup` → `fail(2)`）、`:554-555`（`delivery` 只追加、既有一字不改；既有五字段＝`version/skill/shape/key/data`，`packages/base-link-core/src/envelope.ts:104`）；账单 `q` 支确**不落盘**（`:118-121` 无 `deliver`）⇒ ② 新增那句与账单一致。
6. 复用窗口：`HELP_REUSE_DEFAULT_HOURS=24`（`saveHtml.ts:69`）、`helpReuseWindowOf`（`:136-147`，读 `params.reuseHours`、坏参交 `fail(2)`）、五家在用（`:102`）；**居家今天零 reuse 代码**（`packages/skill-home/src` 对 `base-paint|reuse` 零命中）⇒ 沿用＝纯新增，无既有行为被改（`--html` 除外，见缺陷 4）。
7. ②.5 两处取证准确：`packages/skill-home/src/fetch/paths.ts:20-23` 的 `resolveDbPath` 确实自带 `mkdirSync`；今天 `dispatch` 无条件开库（`packages/skill-home/src/cli/cmd_read.ts:54-56`）⇒「开库前分派」确需票 7 落地。
8. ③ 计数核得上（distinct 口径）：`combos.yaml` 去重后 **111**＝calorie 100＋memo 11（`- key:` 行计 126，其中 15 个键各出现 2 次）；`calorie.help.center:111`／`calorie.help.lookup:116`／`memo.help.lookup:556` 在表；`home.*` **0 条**（唯一含 home 的是 `calorie.view.home:11`）；门 `test/combos-p8.test.mjs:107-114` 只锁 memo 键形状 ✅；先例 `docs/skills/skill-memo-ilife/t224-resolution.md:11`「必须登记」✅。

## 二、缺陷（逐条 `文件:行号`）

1. **A/B｜「唯一定义地」在卡路里今天不成立**：决策 `:10,21` 称时间戳通式／命名已收进共用件，但 `packages/skill-calorie/src/output.ts:58-69` 仍自持 `formatStamp`（同一 `YYYYMMDD_HHMMSS`），`:86-99` `countSameSecond`＋`:103` `htmlFileName`＋`:141-147` `resolveDefaultHtmlPath` 仍是「初候选命名真值」（同件 `:137-140` 自认「未把这段计数口径一并收进共用件」），`:50-55` `sanitizeFilenamePart` 与共用件 `washName`（`saveHtml.ts:92,156-157`）又是一套重复清洗（卡路里那套多吃 `[]`／`\`）⇒ 措辞须收窄为「**HELP 产物的写盘路径**」。
2. **A｜①.3 的照抄面与 bill 现行件不对位**：`HELP_HTML_DIR_NAME` 在 `packages/skill-bill/src/render/helpPaths.ts:16`，但 `HELP_FILE_STEM` 在 `packages/skill-bill/src/render/helpFile.ts:24`（卡路里同形 `packages/skill-calorie/src/render/helpFile.ts:26`）——只点 `helpPaths.ts` 会漏抄 HELP 主体常量；且 `:18`（住 `src/help/`）与 `:20`（抄 `helpPaths.ts`）＋票 12 结构设计（`docs/skills/skill-home/t195-structure-design.md:22,32` 把 `helpPaths.ts` 放 `src/render/`）三处不齐。建议照「三值同文件」先例定成 `packages/skill-home/src/help/manifest.ts`（`packages/skill-memo-ilife/src/help/manifest.ts:20,23,26`、`packages/skill-chef/src/help/manifest.ts:21,25`）。
3. **A｜③「改一处 yaml 一行」不完整**（`:37`）：登记后必须重跑生成器——`packages/base-combos/scripts/gen-present.mjs:3`（禁手改、输出带 `@generated`）＋门 `test/combos-p8.test.mjs:115-120`（`present.ts` 逐字相等）与 `:121-137`（`HELP.md` 注入块逐字相等）；先例 `docs/skills/skill-memo-ilife/t224-resolution.md:11` 明写「**并重跑生成器**，不许手改 `present.ts`」。票 7 照本裁决会漏一步而红门。
4. **A/C｜② 缺省口径未覆盖既有 `--html`**：居家今天已解析 `--html <路径>`（`packages/skill-home/src/cli/cmd_read.ts:686-698`）并直写（`:719-727` `writeFileSync`），裁决未说它改走共用件 `file`＋`overwrite`（账单 `packages/skill-bill/src/output.ts:47-50`、大厨 `packages/skill-chef/src/help/output.ts:57` 先例）还是保留原位；大厨在「无 deliver 的键」上仍直写（`packages/skill-chef/src/cli/cmd_read.ts:436`）＝分歧未裁。
5. **C｜②.1 口径边界未写死**（`:27`）：(a) 缺省支载荷——`home.help.lookup` 形状是 `list`（`packages/skill-home/src/render/envelope.ts:26`），账单缺省支把 `data` 换成 `buildHelpIndex()`＋`mode:'file'`＋`bytes`（`packages/skill-bill/src/cli/cmd_read.ts:136`），居家跟不跟未说；(b)「缺省落盘」只限 `home.help.lookup`（账单只在该键分派 `dispatchHelp`，`:526`）未写；(c) 参数名 `reuseHours` 与坏参→`fail(2)` 接线（`saveHtml.ts:136-147`）未写 ⇒ 票 7 易各写一版。
6. **A｜引用未落到活代码**（低）：`:14` 用 `packages/skill-calorie/src/cli/cmd_read.ts:118,133` 作「同形」证据，但 `:118` 是纯 `import type`、`:133` 是注释；卡路里真正的落盘调用在 `packages/skill-calorie/src/output.ts:242-259`。

## 三、反证搜索结果（找过，无一条能推翻「必须走共用件」）

- `grep -rn "writeFileExclusiveWithRetry|nextExclusiveCandidate|flag: 'wx'" packages/*/src --include=*.ts`：**零家自持**（除共用件本体 `saveHtml.ts:235`）；bill／calorie／chef／memo／schedule 五家落盘全走 `saveHtmlFile`（`skill-bill/src/output.ts:49,54`、`skill-calorie/src/output.ts:242,248,259`、`skill-chef/src/help/output.ts:57,63`、`skill-memo-ilife/src/cli/cmd_read.ts:8`、`skill-schedule/src/help/output.ts:32`）。
- 未被推翻：「居家必须走共用件」成立且更强（五家已在用）；被削弱的是「唯一定义地」的**范围**（缺陷 1）。

## 四、打分与裁决

- A 事实准确 **32/40**：断言 1／2（符号面）／4（逐字）／5／6／②.5／③ 计数皆可核；扣在缺陷 1、2、6 与 ③ 漏步。
- B 反证完整 **22/30**：两个符号的反向搜索做了且结论正确；漏掉卡路里仍在的「初候选计数＋时间戳＋清洗」第二份（缺陷 1）、③ 未追生成器门（缺陷 3）。
- C 可执行性 **22/30**：票 6／票 7 能照它做出来，但照抄面会建错件（缺陷 2）、漏重跑生成器会红门（缺陷 3）、`--html` 与载荷边界未裁（缺陷 4、5）。
- **总分 76/100 ⇒ 整改后通过**。整改项＝缺陷 1–5，缺陷 6 随 1 一并订正。
