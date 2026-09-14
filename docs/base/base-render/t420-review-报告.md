# t420 独立对抗审查报告（审查席 ≠ 实施席）

**判定：PASS**（无 S1、无 S2；四条 S3 记在 §四；五维合计 91/100）。被审交付＝提交 `dc16ba1`／`9a56df3`／`8873b5e`，证据件 `docs/base/base-render/t420-page-finish.md`。全部读数只认提交号与本席自己复跑，不采信实施席结论。

## 一、机器证据

**复跑三条门禁**（各一次 `node tooling/run-locked.mjs --ticket 420 -- node --test <件>`）：

```
RESULT: ticket=420 runId=c10465dc-f79c-483d-b557-e8ec8585faea exit=0   ℹ tests 13 ℹ pass 13 ℹ fail 0
RESULT: ticket=420 runId=7fd6bc53-c2cf-4f4d-92f9-d298f09ed1be exit=0   ℹ tests 46 ℹ pass 46 ℹ fail 0
RESULT: ticket=420 runId=aa8c36fa-c141-4e0b-867c-fe587f1a739c exit=0   ℹ tests 29 ℹ pass 29 ℹ fail 0
RESULT: ticket=420 runId=a66bb444-f959-41d7-895a-71884cd09ba3 exit=0   （同一持锁窗口：tsc -b 0 ＋ 三条 13/46/29 再跑一遍全绿）
```

**证据件真伪复核**：`8873b5e` 声明的 20 条 `GATE-RUN runId=` **全部命中** `.scratch/locks/gate-runs.log`（存在性），其中本席另逐条核了 8 条的 `cmd=`／`exit=`，与声明一致（`6d509317` exit=1 先红、`8518ee99` exit=0、`2f069c90`／`5b5bf7fd` exit=0、`4670982b`／`378ee1b9` exit=2、`6ac04a70`／`2530462f`／`34ad2b75`／`3a0aa233` exit=0）。后修订版（`2e12a49`／`00f0d70`）声明的 27 条与实测窗口 `runs=27` 相符。实施席变异日志 `.scratch/t420/mutate-one.log`／`mutate-two.log` 的「红 fail=1／fail=2 ＋ 还原 sha256 同值 + 复原后绿」与其 §3 一致。

**自设变异（不照抄实施席那两处，一次持锁内跑完，runId=88b7ebca-6f92-4c1f-ae36-086a70689d47 exit=0）**：

```
M1 去掉 renderCaliberLine 的 esc（改硬插值）→ build exit=0；判据 exit=1 tests=13 pass=12 fail=1；逐文件还原 sha256=fe86b747645789d9 同值=true；重建后判据 exit=0 pass=13 fail=0
M2 打印段注入逗号并列全局选择器 `.ilife-page-printable, .ilife-page { font-size: 11px }`
   → build exit=0；**实施席判据 exit=0 pass=13 fail=0（盲区）**；本席探针 exit=1（P2-2 红：有未加打印作用域的选择器 ["ilife-page"]）；还原后探针 exit=0（20/20 全过）
```

**探针 `docs/base/base-render/t420-review-probe.mjs`（P4 轮 runId=ee0148bb-9bf4-4eb0-82bf-3fb24a988a12 exit=0，22/22 全过；P1–P3 轮 20/20）**：P1 走技能侧真装配 `packages/skill-calorie/src/shared/docPage.ts` 的 `assembleDocPage`（页长 55230）——默认页版面根类=`ilife-block ilife-block-page-shell`、标记里该类 0 处（样式段有规则但零命中）；可打印页恰 1 处且落版面根；两页全文**单点插入** delta=`" ilife-page-printable"`（@32251）、两页 `<style>/<script>` 段逐字相同（无样式漂移）；缺省≡给假、给真≡缺省+1 类。P2 恰一段 `@media print`，段内 at-rule 只有 `["@page printable"]`，3 条规则 3 个选择器（逗号逐项判）全部以 `.ilife-page-printable` 起头，全表 `@page` 仅 1 处且为具名页，导航与复制区块各自 `display:none`，打印段读冻结 token 0 个。P3 `dc16ba1`／`9a56df3` 改动路径恰为声明的两件、`8873b5e` 恰为证据件一件；**只看 diff 不看说明**数 #397 标志串（`optNumeric`／`optOptions`／`renderParamForm`）＝0（提交说明命中 3、证据件正文命中 3，均属文字面）。P4 `pnpm -C packages/base-render exec tsc -b` exit=0 errs=0；`pnpm build` **exit=0 errs=0（他席落盘后已转绿）**，与 HEAD 版 §8 的收尾读数一致。

**新旧对照（自设 A/B：把 `dc16ba1^` 原文换入后编译采集，再逐文件还原，runId=9bfd832d-b7b9-423f-af3f-24a19d8fed9a）**：14 键里 **12 键逐字同 sha**——`pageShell`（最小／三件套／转义+受信正文）、`kpiCard`、`kpiGrid`、`copyBlock`、`listRows`、`detailSection`、`paramForm`（一字段／旧四槽）、`disclosure`、`emptyBlock`；差异 3 键＝两个新件（旧版无此函数）＋`blocksCss`（新增 CSS，应差）。即「不给新参数的老调用方逐字不变」在真产物上成立。

## 二、逐条核票面

1. 导航两锚点含类／`href="#id"`／`aria-label`；空列表＝空串；非数组／项缺 `id`／项缺 `text` → `bad-input`：全部有断言（新测试 4 条），复跑绿。
2. 口径说明行含 `ilife-block-caliber`；`<b>&` 走五字符表转义；空串／非串 → `bad-input`：有断言；本席 M1 实证判据对转义确有鉴别力。
3. `renderPageShell` 不给 `printable` 逐字同今天、给真才加类：有断言（字面量口径见 D2）＋本席 A/B 12 键实证。
4. `blocksCss()` 含 `@media print`、选择器全在 `.ilife-page-printable` 名下、无裸 `body{`／裸 `.wrap`：有断言＋探针 P2 复核；段内只出现具名页 `@page printable`，裸 `@page` 0 处。
5. `pnpm build` 与两条既有测试全绿：本席收尾实跑 `pnpm build` exit=0（`8873b5e` 当刻两轮红、错行全在 `packages/skill-calorie/`，已由他席落盘消解；HEAD 版 §8 已如实改写）。
6. `style.test.mjs` 11 键集断言仍绿且键集不变：T2/T9/T10 绿；实测 `tokens=11`、`BLOCK_STYLE_SECTIONS=12`；`git diff dc16ba1^ HEAD -- src/spec/ src/style.ts` 为空（11 冻结 token 与 9 深色 token 未动）。
7. 闭集外类名：`blocksCss()` 无 `.ilife-toc`／`.ilife-caliber`／`.ilife-printable`；三新类不落 `buildStyleSheet().css`（控件台账面外）。
8. 交付面边界：三笔提交只含声明路径；`packages/skill-calorie/`、两张样张、`docs/skills/skill-calorie/` 零改动；同文件 #397 在途活按 hunk 过滤入 `git apply --cached`（`.scratch/t420/blocks-mine.patch` 复核只含 `PRINTABLE_PAGE_NAME`／`page: printable`／`@page printable`）。

## 三、本席改动与还原读数

变异窗口只改 `packages/base-render/src/blocks.ts`（M1／M2／A/B 三段），每段逐文件写回原文并复核：`sha256(before)=fe86b747645789d9`，三段还原后 `与原文件同值=true`；收尾 `git diff -- packages/base-render/src/blocks.ts` **行数=0**。未 `git add -A`／未 stash／未 reset／未 checkout 整目录；他席在途件（`charts.ts`、`skill-bill/test/cli.test.mjs`、证据件后续修订）一律未 add、未还原。工作区状态读数：`status-before` 哈希 `67B53457…`、`status-after` 哈希 `FA13786E…`，差异两行均非本席改动面。

## 四、缺陷清单（按影响面分级）

- **D1（S3·本票范围·判据）** 打印段作用域判定是「行尾 `{` 且该行含类名」，不拆逗号选择器 → `.ilife-page-printable, .ilife-page { … }` 这类并列漏网可全绿（见 M2 实证）。修法：按 `,` 拆开后逐项判（本席探针 P2-2 即该形态）。
- **D2（S3·本票范围·判据）** 「逐字同今天」用测试内硬编码字面量 `TODAY_SHELL`，属自证；建议基线改从 `dc16ba1^` 取（本席 A/B 已补足该面）。
- **D3（S3·本票范围·证据件后修订版 2e12a49／00f0d70）** §7 计数句自相矛盾：「4 条非零退出（3 条过程读数＋2 条 `pnpm build`／共 5 条）」、`GATE-RELAX` 理由和为 7，而表格与日志实为 **6 条**（exit=1 四条第＋exit=2 两条，本席按声明窗口重算 `runs=27 nonzero=6`）；表内 runId／exit 与日志逐条相符，只是文字计数错。另 §9 排在 §8 之前。
- **D4（S3·范围外发现）** 打印段隐藏的是**区块形态**复制区（`.ilife-block-copy-block`）；技能侧 `shared/copyArea.ts` 的 prompt 形态（`promptCopyArea` 的 `pre` 块＋动作条）不在该面内。转票措辞：「消费方需在 #394 融合面决定 prompt 形态复制区要不要一并隐藏」。
- **D5（S3·范围外发现）** 可打印开关今天零消费方接线（全仓 `printable` 仅 base-render 内命中），P1 只能以「真装配页＋真函数差量」合成取证。转票措辞：「回执页族／读页族接线票引用 #420，补一条技能侧真出口的端到端打印取证」。

## 五、五维分（次要摘要）

契约一致 27/30（三件与票面逐条对上；具名页是票面「`@page` 进公共样式」的偏航、已具理由与测试各一条）＋证据真实可复现 23/25（20/27 条声明逐条命中；扣 D3 计数句）＋新旧对照 19/20（A/B 12 键逐字同 sha）＋工程红线 14/15（hunk 级暂存＋逐文件还原＋零强令）＋文档同步 8/10（证据件齐、未做项如实；扣 D3 编号与计数）＝ **91/100**。
