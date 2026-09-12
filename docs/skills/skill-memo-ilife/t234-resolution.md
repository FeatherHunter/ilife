## 决议

**关票**。报告落 `docs/skills/skill-memo-ilife/t234-cli-inventory.md`（48094 B）。只读调查：只写这一个文件，未改票 2 的产物（`t222-skeleton.json`／`t222-content-reconcile.md` 未动），老仓全程只读，无 git 写、无 gh 写。

### U5 的直接答复：没有（票 2 的结论不反转）

老技能**无 `stats` 子命令，也无任何统计类场景卡**。八处读遍的证据链：

1. `memo_cli.py` 全文 1816 行，`add_parser` 恰 **21 个**（`:1544-1687`），无 `stats`；
2. `stats|统计|总数|overview|kpi|汇总|图表|chart` 在 `memo_cli.py` **命中 0**；
3. 21 个 `if args.command ==` 分支无统计分支；
4. `scenarios.yaml` 全文 560 行、30 条场景逐条核过，无 `memo_stats_*`；
5. `memo_render.py:40-46` 的 `COMMAND_CN_MAP` 仅 5 键、无 stats；
6. `DIM_LABEL_MAP` 19 键无统计维度；
7. `_scenarios_to_contract_data:527-599` 纯透传、不新增场景；
8. 全域扫描老侧「统计」仅 5 处，**全是** `sync-from-feishu` 的 11 个对账字段（`SKILL.md:905/906/967` ＋ `test_payloads.py:99`）；唯一那处 `SKILL.md:268 ### 统计` 是**图例计数表标题**，不是命令。

### 子命令全集：21 条（两套独立计数同值）

`add`／`search`／`update`／`delete`／`complete-wish`／`get`／`search-date`／`update-category`／`update-sub-category`／`set-due`／`wish-batch-plan`／`wish-complete`／`batch-update-category`／`sync-from-feishu`／`remind`／`due`／`dismiss`／`reminders`／`completed`／`init-report`／`help`。

`add_parser` 21 ↔ `if args.command ==` 分支 21，**差集 0**。

### 双向对账：漏列风险实测为 2 条，均非统计类

- **表有码无：0 条**——票 2 担心的「两表漏列」基本不存在。
- **码有表无：2 条**——`due`（`:1653`，cron 内部入口、零测试覆盖）与 `init-report`（`:1673`，两表无但 `SKILL.md:343/427` 有散文）。

### U6：老「删 X」归独立子命令 `delete`

`:1571`／`:1704`／`:323`。**老代码 21 个 parser 里根本没有 `remove` 这个名字**；`update`（`:1562-1568`）的参数表无任何删除／废弃能力。另有两个不同的「废弃」子命令：`dismiss`（提醒，`:1657`）与 `complete-wish`（心愿＝删心愿＋建打卡，`:1579`）。

⇒ 本席建议票 6：老 4 条「删 X」场景（`scenarios.yaml:89/424/469/510`）**整体归 `memo.remove`**。

### 三项附带发现（第 3 条已并进票 7）

1. **名不符实**：`SKILL.md:165` 写「`wish-complete` 或 `complete-wish`」看着像别名，实为**向导 vs 执行两步**（`:1622` vs `:1579`）；`:166` 的 `wish-batch-plan`／`set-due` 同病。
2. **文档裂缝**：`SKILL.md:292` 指的守门测试 `tests/test_html_trigger_coverage.py` **已不存在**（只剩 pyc）；`:1145` 写「`test_help.py` 22 用例」，实测 **52**。
3. ⚠️ **老侧存在第三类**：「有唤醒词、有场景卡、有 CLI，却不在**两张表**里」——Init 类（首次使用）。⇒ **票 7 若只按两表建别名表会漏掉它**；资产源头必须是「yaml ＋ 三张表 ＋ 21 条子命令」三处合起来。

### 本票没有关掉的雾

报告「没读透」15 条（`feishu_sync.py`／`memo_cli.py.bak.20260701`／`CHANGELOG.md`／`templates/`／老实物 `备忘录.html`／`.scratch/` 各 spec 未读；§6.3 测试门表基于 grep 定位可能不全）。零测试覆盖的命令 ≥2（`due`／`dismiss`）——**都不挡本图的目的地**（HELP 交付），留作后续那张「补齐被偷工减料的唤醒词与命令」的地图的下手材料。

### 计数自证

子命令 21 条由两套独立计数（`add_parser` 与 `if args.command ==` 分支）交叉验过、差集 0；U5 的八处证据、U6 的出处，每条带「老仓路径:行号」。
