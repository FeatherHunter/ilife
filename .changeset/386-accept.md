---
"skill-calorie": patch
---

test(386): 场景 10B 锁·真正的交付出口用例 —— 以唤醒词为起点的六组断言（新增 `packages/skill-calorie/test/analysis-accept-386.test.mjs`）

31 条词（预测模拟 20＋报告 8＋缺口 1＋归属本图的 new 别名 2）全部**由权威声明派生**（冻结表 `scene-10-analysis.ts`
＋ `analysis/routes.ts`），不写手写计数。六组断言：① 以唤醒词为起点（`lookupWake` 拿命令**原样跑** →
`exit 0`＋绝对路径＋落盘字节如实＋完整文档）；② 两处定义地对账（冻结表 `main_prompt.cli` ↔ `routes.ts` `cli`
逐字相同）；③ 页面归属（8 报告各拿自己那页、20 预测各拿自己参数页、缺口拿缺口页，拿错页即红）；
④ 阻断（空库／不足 14 天：明确提示、不预测、不落盘、不编默认值）；⑤ 回归灵敏度（换掉一处模板件名即红）；
⑥ 产物形态不得回退（完整文档＋首尾完整＋三格式复制区）。完整文档断言只读复用
`test/doc-page-assert.mjs::assertDocPage`，既有三份五连未动。

**本票不改被测命令行为**：两处源码级变异（`analysis/commands.ts` 拿错页／`analysis/reportDoc.ts` 换件名）
只作自证，逐文件点名还原并 sha256 复核。真库只读：跑前后 `sha256`／字节数／逐表行数／`mtime` 四项全同。
遗留出口：降级文案读数缺陷已开票 #466；HELP 两边词不一致（2 条 new 别名在速查台 0 条目）已点名报告。
