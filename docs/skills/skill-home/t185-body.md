## Question

把老内容骨架与新表**逐条对账**，产出可入库的骨架清单：

- 老：`D:\2Study\StudyNotes\SKILLS\居家管家\references\scenarios.yaml`（**9 域／30 子功能／73 场景**；域已有英文名 items／space／outfit／stats／express／receipt／family／setup／link）。
- 新：`packages/skill-home/src/policy/wakewords.ts` 的 `WAKE_TABLE`（91 条唤醒词／21 条命令）与 `packages/skill-home/SKILL.md` 的 HELP-AUTO 区。

要回答：

1. 老 73 条场景每一条在新表里的落点（有／无／改名／合并）。
2. 新表多出的条目，各自补进哪个域、哪个子功能。
3. 3 条带 `(HTML)` 的唤醒词（查物品(HTML)／看物品(HTML)／统物品(HTML)）进不进 HELP；进了写在哪。
4. 老家有、新表没有的那几条（记到记账／记到卡路里／联动总览）怎么落——`SKILL.md` 已写「废弃词（联动 3 词）不路由，combos 登记走后续票」。
5. 每个域／子功能的中英名对照表（照 `docs/skills/skill-calorie/t179-180-structure-design.md` 第一节映射表的格式；名字只许从 HELP 的现成说法里取，不许自创）。

产出：`docs/skills/skill-home/t<本票>-content-reconcile.md`（逐条对账表 ＋ 可入库骨架的机器可读清单草案）。

票 5（内容资产入库）照它做；票 6 的能力目录名也取自这份对照表。

## 进度：0%

下一步：research 子代理已派（与画图同批），报告回来即贴票面并关票。
