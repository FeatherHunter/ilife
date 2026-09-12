## 观察项：`writeFileExclusiveWithRetry` 把 `mkdirSync` 的 `EEXIST` 误判成「候选已存在」

来源：地图 `#220` 票 10（`#230`）的交付报告「拿不准」第 1 条，由实施方在写并发用例时察觉。**本席记在此处，因为共用件 `saveHtmlFile` 会继承这同一小块逻辑。**

### 现象

`packages/skill-memo-ilife/src/help/memoOutput.ts` 的 `writeFileExclusiveWithRetry`（照抄自 `packages/skill-bill/src/output.ts:42` 的通式）结构是：

```
for (let i = 0; i < 1000; i++) {
  try { mkdirSync(dirname(candidate), {recursive:true}); writeFileSync(candidate, html, {flag:'wx'}); return candidate; }
  catch (e) { if (e.code === 'EEXIST') { candidate = nextExclusiveCandidate(candidate); continue; } throw e; }
}
```

**问题**：`mkdirSync` **自己也会抛 `EEXIST`**——当 `memo_html` 这个路径**已被一个同名文件占住**（不是目录）时。此时循环把它误读成「候选文件已存在」，于是**空转 1000 次重试**，每次换一个 `_N` 名字再撞同一个 `mkdirSync` 错误，最后由重试上限抛 `EEXIST`（退出码 **5**）。

⇒ **退出码是对的、不会静默写坏数据**，但**语义错位**：真实原因是「落点目录被文件占位」，报出来的却是「重试超限」。

### 为什么要记在 `#240` 而不是就地修

- 这一小块是**本图裁决 3 判「甲」时照抄的通式**（`skill-bill/src/output.ts` 的现役实现）——本图**故意不改**它，改了会偏离「只抄通式那一小块、不自创」的硬条件；
- 该缺陷**不是备忘录独有**：`packages/skill-bill/src/output.ts` 与 `packages/skill-calorie/src/output.ts` 是同一形态 ⇒ **共用件 `saveHtmlFile` 会把它一起继承**；
- 共用件票 `#237` 正在设计 `onExists` 四态与「写后回读校验」，**正是把这类错误分类理顺的时机**。

### 建议

1. `#237` 设计 `saveHtmlFile` 时，**把「目录建不动」与「候选已存在」分成两类错误**（例如只对 `writeFileSync` 的 `EEXIST` 递补，对 `mkdirSync` 的 `EEXIST` 直接报「落点被占」）；
2. 若要更稳，`mkdirSync` 之后再 `statSync` 确认它是目录；
3. 本票（`#240`）迁移到共用件时**顺带消掉**这一处——迁移本身就是换实现，不需要单独动备忘录的自持件。

### 附：本席已核的边界

- 该路径**不会静默出错**（失败时 stdout 为空、退出码 5，`#230` 的例⑤已锁住这条）；
- 触发前提是「`memo_html` 被同名**文件**占位」，属**退化场景**，正常使用不会遇到；
- 故**不单独开票**，作为 `#240` 的观察项随迁移一并处理。

### 收口（2026-09-12，`#240` 迁移落地）

已随迁移**构造性**消掉：共用件 `saveHtmlFile` 的 `mkdirSync(dirAbs)` 在递补循环**之外**、一次调用只调一次，
`mkdirSync` 抛出的 `EEXIST` 直接上抛，不再被误读成「候选已存在」而空转 1000 次。

实测（`%TEMP%` 下用共用件真跑两条退化入口，证据见 `t240-resolution.md` §四）：

| 入口 | 共用件的 code 与消息 | 与迁移前 |
|---|---|---|
| 默认支：`SKILLS_DB_PATH` 落在一个文件之下 | `ENOTDIR: not a directory, mkdir '…\sub\memo_html'` | **逐字相同** |
| 显式支：`--html` 的父级是文件 | `EEXIST: file already exists, mkdir '…'` | **逐字相同** |

两者都由出口原样归到 exit 5（`ERR 5: 落盘失败：…`），与迁移前逐字一致。

