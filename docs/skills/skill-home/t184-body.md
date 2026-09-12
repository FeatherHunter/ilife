## Question

把饼干记账（`skill-bill`，地图 #143 八张子票全关）的 HELP 交付实现**逐件读懂**，产出一份「居家照抄清单」：哪些件直接照抄、哪些件必须按居家的情况改、哪些件不要（例：卡路里特有的命令名→中文段落映射与动态段）。

起点（不限于此，读到哪算哪）：

- `packages/skill-bill/src/render/helpFile.ts`（渲染接线：内容资产 → 通用 help 模板全页）
- `packages/skill-bill/src/render/helpPaths.ts`（命名：目录／文件名主体／时间戳通式）
- `packages/skill-bill/src/output.ts`（独占落盘 `wx` ＋ `EEXIST` 递补、file 态交付）
- `packages/skill-bill/src/triggers/wake-assets.ts` ＋ `packages/skill-bill/scripts/gen-wake-assets.mjs`（内容资产入库）
- `packages/skill-bill/src/cli/cmd_read.ts` 里 `bill.help.lookup` 那条命令的分派（在开库之前分派）
- #148 那套 CLI 级用例（真 spawn 出口的锁）＋ #144／#145／#146 三张票的实现提交
- `packages/skill-bill/SKILL.md` 的「HELP 交付」节
- `packages/plugin-bill-ilife/src/skill-provider.ts`（插件侧最小装机）

产出：`docs/skills/skill-home/t<本票>-bill-recipe.md`，逐件一行（仓内路径／它干什么／居家照抄还是改／改什么或不抄的理由）。

本票**不出决定**：命名落盘管线的归属（自持还是收成共用位）是票 4 的事，本票只把事实摆清。

## 进度：0%

下一步：research 子代理已派（与画图同批），报告回来即贴票面并关票。
