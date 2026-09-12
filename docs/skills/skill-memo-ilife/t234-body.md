## Question

票 2 的对账表在「CLI 子命令全集」这件事上留了空档：老 `script/memo_cli.py`（78635 B）**未逐行读**，子命令全集只取自老 `SKILL.md` 的两张表（`:147-172` 的口语→CLI 反向表 ＋ `:226-292` 的 HTML 生成对照表）。**风险**：可能漏列子命令——而这会让票 6 的 **U5 结论反转**（U5 现在裁的是「`memo.stats` 有 shape 而老骨架 0 条内容，HELP 展不展」）。

要查的：

1. 读老 `D:\2Study\StudyNotes\SKILLS\备忘录\script\memo_cli.py` 的子命令分派（`argparse`／`if cmd ==`／`COMMAND_CN_MAP` 之类），列出**子命令全集**：逐条给「名字 ＋ 一句话 ＋ 出处行号」。
2. 与老 `SKILL.md` 那两张表**双向对账**：表里有而代码里没有的、代码里有而表里没有的，各列一行。
3. **专答 U5**：老技能到底有没有 `stats`／统计类内容？若有——它的场景卡长什么样（标题／唤醒词／prompt／types／dimensions），照票 2 的骨架形状给出来；若确实没有——给出「读遍哪几处、都没有」的证据。
4. **顺带核 U6**：老「删 X」类命令在代码里归哪个子命令（`remove` 还是 `update`）。
5. 老 `script/validate_scenarios.py` 与老 `tests/` 里与 HELP／场景相关的断言也一并读——它们定义了「什么算合法场景」的门。

产出：`docs/skills/skill-memo-ilife/` 下本票号前缀的报告（`t<本票号>-cli-inventory.md`）：子命令全集 ＋ 双向对账 ＋ U5／U6 的直接答复 ＋ 「没读透」清单。

纪律：只读源码与老技能目录；只写上面那一个文件；无 git 写、无 gh 写；不写 `.scratch/`。

## 进度：0%

下一步：派 research 子代理跑这张票。
