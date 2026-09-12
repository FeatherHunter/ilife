## Question

把「老骨架」与「新表」逐条对上，给内容入库票一张可执行的对照表。

**起点不是零**：兄弟图 `#183` 的票 2 已产出 `docs/skills/skill-home/t185-content-reconcile.md` ＋ `t185-skeleton.json` ＋ `t185-extract.mjs`（只读抽取脚本，六模式）＋ `t185-evidence/`。本票**复用它的方法**（脚本抽取 ＋ 机器可读骨架 ＋ 原始输出落盘），换成备忘录的事实源。

两份事实源（居家的先例是：`scenarios.yaml` 之外还有一份老路由表，91 条唤醒词里 17 条出自那里）：

- `D:\2Study\StudyNotes\SKILLS\备忘录\references\scenarios.yaml`（v1.3.0）：8 域／13 二级组／30 场景／29 个唯一唤醒词／76 个 `editable_fields`；4 处「分类下只有一个子功能 → 走『基础』兜底」。
- 老 `SKILL.md`：HELP 触发词（`备忘录 HELP` 及 7 种变体）与唤醒词总表。

新表：`packages/skill-memo-ilife/src/policy/wakewords.ts` 的 `WAKE_TABLE`（28 条短语）＋ 10 条命令。

要交的三组数（**脚本数出，不抄票面**）：① 老 30 场景里几条无落点、几条逐字命中新表；② 新表几条是老骨架没有的；③ 域／二级组／场景逐级计数与名称清单（含中英名对照，供结构设计票与资产票用）。

产出（全在 `docs/skills/skill-memo-ilife/`）：对账报告 `t<本票号>-content-reconcile.md` ＋ 机器可读骨架 `t<本票号>-skeleton.json` ＋ 只读抽取脚本 `t<本票号>-extract.mjs` ＋ 原始输出 `t<本票号>-evidence/`。末尾把「要用户拍板」的条目单列，交内容裁决票。

## 进度：0%

下一步：派 research 子代理跑这张票。
