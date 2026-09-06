# 私家大厨迁移拆分确认（一期 #18）

老家只读对照 `D:/2Study/StudyNotes/SKILLS/私家大厨`：py 84（核心约 73，余为 tmp 调试杂项与 .scratch，不迁），SKILL.md 782 行，17 表（recipes/ingredients/steps/history 主 4 + 营养/分类/计划扩展 13），scenes/ 10 域（recipe/view/search/write/cooking/shopping/history/help/plan/stock/link），scenarios 61 + alias（合计 35 唤醒词，HELP 现找 4 条含内），文件 DB（chef_data.db；老家无 DB 描述按 issue #18，TS 新建 sqlite，见下）。

## 三层去向（包 packages/skill-chef，新建零冲突面，布局对标 skill-bill）

| 层 | TS 去向 | 老家对照 | 归属 |
|---|---|---|---|
| 取数 | src/fetch/db.ts（node:sqlite：recipes/ingredients/steps/history 主表 + 扩展表幂等建表；SKILLS_DB_PATH 必设，_fallback_db_dir 不继承）+ paths.ts（必设 + tmp 隔离哨兵 CHEF_FORCE_PROD） | scripts/db.py + init_db.py（17 表 schema） | 取数 |
| 口径 | src/policy/difficulty.ts（难度 5 档）+ status.ts（状态 4 种）+ heat.ts（火候 5 档）+ category.ts（食材 11 类）+ rating.ts（评分 0-5）+ wakewords.ts（35 短语→8 key，最长匹配） | SKILL.md 782 行口径段 + references/scenarios（61 场景 + alias） | 口径 |
| 渲染 | src/render/envelope.ts（8 key×shape）+ views.ts（8 键数据装配：详情/列表/采购合并/历史统计/体检排序）+ html.ts（section+三标记）+ templates/8（1 键 1 模板） | scripts/_base_render.py 对应 + templates/ 10 域子目录 | 渲染 |
| 出口 | src/cli/cmd_read.ts（argv+JSON+exit，8 键分发，写走 receipt：recipe.write + history.record 全 receipt；缺 key 2/未知 3/缺失 4/预检 1；超时 terminate+TOAST） | scripts 各域 cli（view/search/write/cooking/shopping/history/help） | 出口 |
| SKILL | SKILL.md 重写+HELP 互联注入（35 行速查表，构建期静态文本） | SKILL.md 782 行（含 Language/command_cn/scenario/HELP 保留字） | SKILL |
| 收尾 | 8 联动对表+tmp 单测+仓内零 py（老家只读不动） | tests/ + .scratch/ + tmp_*.py 调试杂项（只读不迁） | 收尾 |

## 联动 key×shape 映射（8 处；key 字符串后续票落表时冻结）

```chef-keys
chef.recipe.view | detail
chef.recipe.search | list
chef.recipe.write | receipt
chef.cooking.run | list
chef.shopping.query | list
chef.history.record | receipt
chef.history.query | list
chef.help.lookup | list
```

老家联动对照（消费侧，combos.yaml 已冻结，本票不登记，后续票落表）：L5.1 食谱推荐/L5.2 食材到食谱/L5.3 饮食计划/L5.4 高蛋白/L5.5 低卡/L5.6 低碳水/L5.7 快手菜/L5.8 早餐（→recipe.search，q/preset 分流，高蛋白/快手菜为 preset 短语）+ L3.2 库存到饮食（消费侧只读 search/view，不直写他库）+ 查菜谱详情/查看食材（→recipe.view，最长匹配：查看食材不落 search）+ 加菜/新建菜谱（→recipe.write）+ 开始做菜/做菜步骤（→cooking.run）+ 买菜清单/采购合并（→shopping.query）+ 记录做菜/打分（→history.record）+ 做菜历史（→history.query）+ HELP 现找 4（→help.lookup）。跨 skill 路由为消费侧，沿卡路里/饼干侧声明，本技能只暴露上表 8 键。

## 出 scope（不迁）

- 定时任务：老家零定时代码，外部定时以外置为准。
- 面板（二期单 MAP）、本技能外联动登记（combos.yaml 一律不碰，走后续票；shopping/recipe 跨技能按钮仅复制 prompt，AI 调目标技能，不直写他库）。
- 真实数据禁迁（测试 tmp 隔离，CHEF_FORCE_PROD 哨兵）；二进制照片（photo_url 只存串，识别以外置为准）；.scratch/tmp 调试杂项、__pycache__/.pytest_cache/、docs/ 历史规格、一次性迁移脚本（不进运行时）。

## 写走 receipt 口径

写走 receipt（直通即真相，饼干 precedent）：recipe.write（加菜/新建菜谱全 op）/ history.record（记录/打分）全 receipt；读走 list/detail（search/cooking.run/shopping.query/history.query/help.lookup 走 list，view 走 detail）。

## 环境与验收

- SKILLS_DB_PATH（必设，无默认值）+ CHEF_FORCE_PROD 哨兵（非 tmp 写库须 opt-in），见 docs/env.md；真实数据禁迁，测试 tmp 隔离；仓内零 py（本包全 TS，老家只读对照）。
- 验收：按此表开工；test/chef-split 对应 5 单测钉死映射合法性（key 命名空间+3 形状）与定时/联动出 scope、写走 receipt。
## 测试兼容偏离说明

难度/状态/食材分类以遗产 `references/enums.py` 为准，C 首稿误写的 `新手`/`进行中`/`已完成`/`水产` 已改回 `快手菜`/`已做`/`熟练`/`海鲜`。
