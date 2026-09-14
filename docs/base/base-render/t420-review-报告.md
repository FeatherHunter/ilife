# t420 独立对抗审查报告（审查席 ≠ 实施席）

**判定：PASS**（无 S1／S2；四条 S3；五维 91/100）。被审＝`dc16ba1`／`9a56df3`／`8873b5e`，证据 `docs/base/base-render/t420-page-finish.md`；只认提交号与本席复跑。

## 一、机器证据

复跑三条门禁：`c10465dc-f79c-483d-b557-e8ec8585faea` exit=0（13/13/0）、`7fd6bc53-c2cf-4f4d-92f9-d298f09ed1be` exit=0（46/46/0）、`aa8c36fa-c141-4e0b-867c-fe587f1a739c` exit=0（29/29/0）；同窗口 `a66bb444-f959-41d7-895a-71884cd09ba3` exit=0（`tsc -b` 0＋三条再跑绿）。

证据件 20 条 `GATE-RUN runId=` 全命中 `.scratch/locks/gate-runs.log`，另核 8 条 cmd／exit 相符（`6d509317` exit=1 先红、`4670982b`／`378ee1b9` exit=2、余 0）；后修订版 27 条＝实测 `runs=27`；实施席两处变异日志与其 §3 一致。

**自设变异**（持锁 `88b7ebca-6f92-4c1f-ae36-086a70689d47` exit=0）：**M1** 去 `renderCaliberLine` 转义 → 判据 exit=1（pass 12／fail 1）、逐文件还原 sha256 同值、重建后 exit=0（13/13）；**M2** 打印段注入 `.ilife-page-printable, .ilife-page {…}` → 实施席判据 exit=0（13/13，盲区）、本席探针 exit=1（P2-2 红），还原后探针 20/20。

**探针** `docs/base/base-render/t420-review-probe.mjs`（`ee0148bb-9bf4-4eb0-82bf-3fb24a988a12` exit=0＝22/22）：**P1** 真装配页 `assembleDocPage`（技能侧源码，页长 55230）默认页该类 0 处、样式段有规则零命中；可打印页恰 1 处且落版面根；两页单点插入 delta=`" ilife-page-printable"`、资产段逐字同；缺省≡给假。**P2** 恰一段 `@media print`、段内 at-rule 仅 `@page printable`、3 选择器（逗号逐项）全在类名下、全表裸 `@page` 0、两区 `display:none`、冻结 token 0 个。**P3** 三笔路径＝声明件，`packages/` 面 #397 标志串 0（说明／证据件正文的 3 处属文字）。**P4** `pnpm -C packages/base-render exec tsc -b` exit=0、`pnpm build` exit=0（他席落盘后转绿）。

**新旧对照 A/B**（换入 `dc16ba1^` 原文编译采集再还原，`9bfd832d-b7b9-423f-af3f-24a19d8fed9a` exit=0）：14 键中 **12 键逐字同 sha**（pageShell 三形、kpiCard、kpiGrid、copyBlock、listRows、detailSection、paramForm 两形、disclosure、emptyBlock），差异 3 键＝两新函数＋`blocksCss`。

## 二、逐条核票面

1. 导航：两锚点（类／href／`aria-label`）、空列表空串、非数组／缺 `id`／缺 `text`→`bad-input`，断言齐、复跑绿。
2. 口径行：类名＋五字符转义＋空串／非串→`bad-input`；M1 证判据对转义有鉴别力。
3. 可打印：不给／给假逐字同今天（口径见 D2）＋A/B 12 键；给真才加类且落版面根。
4. 打印段含 `@media print`、选择器全在类名下、无裸 `body{`／`.wrap`、裸 `@page` 0。
5. `pnpm build` 与两条既有测试绿：实跑 exit=0（当刻红在他席 `skill-calorie`，已消解）。
6. 11 冻结 token／12 区闭集未动：T2／T9／T10 绿，`tokens=11`、`sections=12`，`git diff dc16ba1^ HEAD -- packages/base-render/src/spec/ packages/base-render/src/style.ts` 空。
7. 闭集外类名：无 `.ilife-toc`／`.ilife-caliber`／`.ilife-printable`；三新类不落 `buildStyleSheet().css`。
8. 边界：三笔只含声明路径；`skill-calorie`／样张／既有证据零改；#397 在途活按 hunk 过滤。

## 三、本席改动与还原

变异窗口只改 `packages/base-render/src/blocks.ts`（M1／M2／A/B），每段逐文件写回原文并复核 `sha256=fe86b747645789d9` 同值；收尾 `git diff -- packages/base-render/src/blocks.ts` **行数=0**。未 add -A／stash／reset／整目录还原；他席在途与暂存件一律未 add、未还原。`status` 前后哈希 `67B53457…`／`FA13786E…`，差异两行非本席改动面。

## 四、缺陷清单

- **D1（S3·本票范围·判据）** 打印段作用域判定按「行尾 `{` 且含类名」、不拆逗号 → `.ilife-page-printable, .ilife-page {…}` 漏网可全绿（M2 实证）；修法：逗号逐项判。
- **D2（S3·本票范围·判据）** 「逐字同今天」用测试内硬编码 `TODAY_SHELL`，属自证；基线宜取自 `dc16ba1^`（A/B 已补）。
- **D3（S3·本票范围·证据件后修订版 `2e12a49`／`00f0d70`）** §7 计数句自相矛盾（「4 条／3＋2／共 5 条」、RELAX 和 7），实测 **6 条**（exit=1 四＋exit=2 二）；表内 runId／exit 正确；§9 排在 §8 前。
- **D4（S3·范围外发现）** 打印段隐藏区块形态复制区（`.ilife-block-copy-block`），`copyArea.ts` 的 prompt 形态不在面内。转票措辞：「消费方在 #394 融合面决定 prompt 形态复制区是否一并隐藏」。
- **D5（S3·范围外发现）** 可打印开关零消费方接线（全仓 `printable` 仅 base-render 命中），P1 只能以真装配页＋真函数差量合成取证。转票措辞：「回执页族／读页族接线票引用 #420，补技能侧真出口端到端打印取证」。

## 五、五维分

契约一致 27/30（具名页是「`@page` 进公共样式」的偏航，已具理由＋各一条断言）＋证据真实可复现 23/25（扣 D3）＋新旧对照 19/20（A/B 12 键同 sha）＋工程红线 14/15（hunk 级暂存、逐文件还原、零强令）＋文档同步 8/10（扣 D3）＝ **91/100**。
