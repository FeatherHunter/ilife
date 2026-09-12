## Question

照 `#149`／`#192` 的做法，把「对 AI 说『备忘录 help』会得到什么」写进 `SKILL.md` 说明面：缺省即交付物 ＋ **完成标准**（文件存在且大小＝bytes）／要速查要现找才加参数／`--html` 语义／边界。按 `writing-for-agents` 落笔。

顺带查两件旧账：

- `packages/skill-memo-ilife/scripts/build-help.mjs` 的注入是否**保住检出换行**（记账 `:34-37` 做了、居家 `:28` 没做，备忘录待查）。
- `SKILL.md` 里那段构建期注入的速查表（`<!-- HELP-AUTO-START -->`…`<!-- HELP-AUTO-END -->`）与新的 HELP 交付是什么关系：说明面要写清「速查表是构建期注入的索引，HELP 文件是缺省交付物」。

用词纪律：全文写「help 模板」，不写「壳」；`memo.help.lookup` 叫「命令」，不叫「键」。

完成判据：`SKILL.md` 说明面与真跑行为一致（逐条可核）。

- ⚠️ **HELP 入口只写 1 条**（用户 2026-09-12 裁定）：「<i>就 备忘录 HELP 不分大小写，其他的不需要，太复杂了</i>」⇒ `SKILL.md` 里的 HELP 触发口径**只写 `备忘录 HELP`（注明不分大小写）**；**不要**照老侧那 9 条变体（缩字／口语／slash／`manual`／`guide`）铺开。老侧 9 条的事实留在 `t222-content-reconcile.md` 备查即可。这条只管 HELP 自己的入口，功能类唤醒词的补齐口径不变。
- ⚠️ **顺带修那对断链点**（票 12 同批）：本票要改 `SKILL.md`，而它今天**没有 frontmatter**（首行是 `# 备忘录（memo）SKILL`）——补 frontmatter 是票 12 的活，两票别打架：本票只动正文，frontmatter 归票 12。

## 交接项（复审员 E 指出，必须写进票面而非代码注释）

1. ⚠️ **`packages/plugin-memo-ilife/test/skills-provider.test.mjs:106` 的断言必须翻正向**（行号订正：票 12 两轮整改后已从 `:90` 移位到 **`:106`**，且已改成**条件断言**；辅助函数在 `:21-28`）：它断言「`SKILL.md` 正文**不含** `memo.help.lookup`」，注释自述归 #231。本票改 `SKILL.md` 说明面时**同批翻成正向断言**（与 #229 二选一，谁先落地谁翻，不允许两边都以为对方会翻）。
2. ⚠️ **入口口径逐字＝`备忘录 HELP`（带空格、不分大小写）**。票 12 会话补的 frontmatter description 里写的是「触发词：备忘录HELP」（**无空格**），复审员 E 判「入口口径不合格」⇒ **本票改说明面时把 frontmatter 那句话一并纠形为带空格形**，并确认 `skills-provider.test.mjs:112` 的 `startsWith('「备忘录HELP」')` 同步改成带空格形。同时**补一条真断言**把「list 返回的描述 ＝ frontmatter 实测描述」焊死（今天完全缺失）。
3. **正文速查块与新交付的关系要写清**：`<!-- HELP-AUTO-START -->`…`<!-- HELP-AUTO-END -->` 是**构建期注入的索引**，HELP 文件是**缺省交付物**——说明面里这两句必须同时在场。

## 进度：100%（已交工，报告见 `docs/skills/skill-memo-ilife/t231-doc-report.md`）

- **说明面已成文**：`packages/skill-memo-ilife/SKILL.md` 正文新增 `## HELP 交付（说「备忘录 HELP」走这里，不分大小写）`——缺省即交付物＋**完成标准**（文件存在且大小＝`delivery.bytes`）／`mode:"lookup"` 速查表／`q` 只回命中不落盘／`--html` 显式落点语义／不建库边界／**「速查块＝构建期注入的索引，HELP 文件＝缺省交付物」两句同场**／HELP 入口只认 1 条；`快速开始` 加 1 行 HELP 入口。frontmatter 与 `<!-- HELP-AUTO-* -->` 块内**一字未动**，全文仍 LF。
- **同批翻正向**：`packages/plugin-memo-ilife/test/skills-provider.test.mjs` 旧条件断言（原 `:106`）翻成**无条件正向断言**（现 `:95-101`），并补一条**不被注入块白捡**的同伴断言（缺省产物名通式），删掉已无调用点的兜底函数。`node --test test/skills-provider.test.mjs`：**9/9 绿**；`test/skill.test.mjs`：3/3 绿。
- **真跑核对**（`SKILLS_DB_PATH=D:\2Study\StudyNotes\.db`，只建本包 ＋ `dist/cli/cmd_read.js`）：缺省 exit=0／回执给**绝对路径** `…\memo_html\备忘录_HELP_20260912_133947.html`／该文件 130885 B＝`delivery.bytes`／跑完 **`.db\memo` 仍不存在**；`mode:"lookup"` → `备忘录_速查表_…html`（28 条／6476 B）；`q` 命中 1 条且**零落盘**（回执无 `delivery`）；`q`＋`mode`／非法 `mode` → exit 2；临时库同秒三连跑**真跑复现** `_2`／`_3`（从 `_2` 起）；`--html` 逐字用给定路径、自动建多级父目录、覆盖写（不参与递补）。
- **两件旧账**：① `packages/skill-memo-ilife/scripts/build-help.mjs:29` **不保**检出换行（写死 `'\n'`，无 `eol` 探测；CRLF 检出上真跑得**混合换行** CRLF=30／bareLF=33），四家同形（记账 `:34-37` 与 `base-combos` 保；居家 `:26`／卡路里／大厨／备忘录不保）——本机 `core.autocrlf=false` 故**当前不触发**，本票按「查」的范围**未修**；② 「速查块＝**构建期注入的索引**」与「**HELP 文件是缺省交付物**」两句已同时写进 `SKILL.md:69`。
- **遗留一处待裁**（报告 §7）：frontmatter 第 3 行的「备忘录HELP」（无空格）与 `skills-provider.test.mjs:123` 的 `startsWith` **未动**——用户本轮口径规定 frontmatter 归票 12、本票只动正文，与交接项 2「一并纠形」直接冲突，请编排会话收口。
