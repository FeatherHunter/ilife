## Question

照 `#149`／`#192` 的做法，把「对 AI 说『备忘录 help』会得到什么」写进 `SKILL.md` 说明面：缺省即交付物 ＋ **完成标准**（文件存在且大小＝bytes）／要速查要现找才加参数／`--html` 语义／边界。按 `writing-for-agents` 落笔。

顺带查两件旧账：

- `packages/skill-memo-ilife/scripts/build-help.mjs` 的注入是否**保住检出换行**（记账 `:34-37` 做了、居家 `:28` 没做，备忘录待查）。
- `SKILL.md` 里那段构建期注入的速查表（`<!-- HELP-AUTO-START -->`…`<!-- HELP-AUTO-END -->`）与新的 HELP 交付是什么关系：说明面要写清「速查表是构建期注入的索引，HELP 文件是缺省交付物」。

用词纪律：全文写「help 模板」，不写「壳」；`memo.help.lookup` 叫「命令」，不叫「键」。

完成判据：`SKILL.md` 说明面与真跑行为一致（逐条可核）。

- ⚠️ **HELP 入口只写 1 条**（用户 2026-09-12 裁定）：「<i>就 备忘录 HELP 不分大小写，其他的不需要，太复杂了</i>」⇒ `SKILL.md` 里的 HELP 触发口径**只写 `备忘录 HELP`（注明不分大小写）**；**不要**照老侧那 9 条变体（缩字／口语／slash／`manual`／`guide`）铺开。老侧 9 条的事实留在 `t222-content-reconcile.md` 备查即可。这条只管 HELP 自己的入口，功能类唤醒词的补齐口径不变。
- ⚠️ **顺带修那对断链点**（票 12 同批）：本票要改 `SKILL.md`，而它今天**没有 frontmatter**（首行是 `# 备忘录（memo）SKILL`）——补 frontmatter 是票 12 的活，两票别打架：本票只动正文，frontmatter 归票 12。

## 进度：0%

下一步：等票 9（出口与命名落盘）关票。
