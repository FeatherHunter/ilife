## 决议：关票 —— 活分解，不单独实施

**为什么关**：本票原意是「一张全局实施票，把路由表纠错与补全一次做完」。经**第一性重推 ＋ 对抗审查**（`docs/skills/skill-memo-ilife/t820-图重设计-第一性.md` §三），判定它是**伪必要**：

它的四件活，每一件的**正确住处**都不是「一张全局票」，而是**结构规格 ＋ 各域自己的声明**：

| 原票的活 | 分解去向 |
|---|---|
| 补 10 条 HELP 主名行 | [结构规格 #823](https://github.com/FeatherHunter/ilife/issues/823) 定「每域 `commands.ts` 声明自己的唤醒词与命令、全局表由生成器派生」这个形状之后，**由各域票在各自的域声明里填** |
| 改 3 条指错键（`删心愿`／`删打卡`／`删情绪日记` → `memo.remove`） | 分属 wish／checkin／mood 三域的域声明；**「删」这条模式由 #823 写进形状**，不靠各域自由发挥 |
| 新开「首次使用」命令 | init 域票（[#833](https://github.com/FeatherHunter/ilife/issues/833)） |
| 2 条命令层通道（`timeRange`／`noteId`） | search 域票（[#827](https://github.com/FeatherHunter/ilife/issues/827)）／remind 域票（[#828](https://github.com/FeatherHunter/ilife/issues/828)） |

**保留它当一张独立票的代价**：它阻塞 8 张域票**全部** —— 一个纯串行点，而它做的事本来可以跟在域票里一起完成。

**跨域一致性会不会破？**（这是关票的唯一真风险）三条「删X」是同一模式，三张域票分做可能做出三种做法。
**反制（已写入下游票面）**：① [命令面四问 #837](https://github.com/FeatherHunter/ilife/issues/837) 的 Q⑦ 先把「`删X` 的 `confirm` 从哪来」定死；② [#823](https://github.com/FeatherHunter/ilife/issues/823) 把「删这条模式」写进**域声明形状**。⇒ 一致性由**形状 ＋ 裁定**保证，不需要全局实施票。

**边图处置**：本票的 8 条「域票 blocked_by #838」边已由脚本删除（`docs/skills/skill-memo-ilife/t820-wire-edges.mjs` 会按目标图做 diff）。本票自身与 #837 的边保留，作历史。

**无遗留**：四件活逐件有去向（上表），撤线 11 行里那 10 条别名仍以 `aliases` 身份住在 HELP 资产里，撤的只是总表行。
