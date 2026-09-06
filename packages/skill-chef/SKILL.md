# 私家大厨（chef）SKILL

本地菜谱：搜菜/查看/加菜、跟着做（烹饪步骤）、买菜清单合并、做菜记录与历史、体检排序、HELP 现找。唯一出口 `chef-cmd-read <chef.key>`，argv+JSON(stdout)+exit，非 0 走 stderr。写走 receipt（直通即真相）。

## 快速开始

```sh
chef-cmd-read chef.recipe.search --params '{"q":"虾"}'
chef-cmd-read chef.recipe.view --params '{"name":"宫保虾球"}'
chef-cmd-read chef.help.lookup --params '{"q":"搜菜"}'
```

## 口径

- 难度 5 档：快手菜/简单/中等/困难/大师（validateDifficulty，大小写/空串/未知档一律阻断）。
- 状态 4 种：未做/已做/熟练/已废弃（validateStatus；废弃= status 置已废弃，只增不删，无物理删除，列表默认过滤已废弃）。
- 火候 5 档：微火/小火/中火/大火/猛火（validateHeat，步骤 heat_level 必落此表）。
- 食材 11 类：肉类/海鲜/蛋类/蔬菜/葱姜蒜/香草/调料/豆制品/主食/干货/其他（validateCategory，未知类阻断）。
- 评分 0-5（含 0/5 端点，步长 0.5，超界/非数字阻断；history.record 必带 name，rating 可选）。
- 空查询与空结果阻断不返空：search 空 q 抛 exit 2；查无对条/区间无记录抛 exit 4，不返空数组冒充正常。
- 真实数据禁迁，测试 tmp 隔离（SKILLS_DB_PATH 指向 mkdtemp，见 test/fetch.test.mjs）。
- 跨技能只复制 prompt 不直调：shopping/recipe 跨技能按钮仅复制 `chef-cmd-read ...` 文本，AI 调目标技能，不直写他库。

## 联动速查（构建期注入，勿手改）

<!-- HELP-AUTO-START -->
| 唤醒词 | key | shape | 例 |
|---|---|---|---|
| 私家大厨HELP | chef.help.lookup | list | `chef-cmd-read chef.help.lookup` |
| 菜谱HELP | chef.help.lookup | list | `chef-cmd-read chef.help.lookup` |
| 查帮助 | chef.help.lookup | list | `chef-cmd-read chef.help.lookup` |
| 能做什么 | chef.help.lookup | list | `chef-cmd-read chef.help.lookup` |
| 查看食谱 | chef.recipe.view | detail | `chef-cmd-read chef.recipe.view --params '{"name":"宫保虾球"}'` |
| 查看食材 | chef.recipe.view | detail | `chef-cmd-read chef.recipe.view --params '{"name":"宫保虾球"}'` |
| 查看步骤 | chef.recipe.view | detail | `chef-cmd-read chef.recipe.view --params '{"name":"宫保虾球"}'` |
| 查看营养 | chef.recipe.view | detail | `chef-cmd-read chef.recipe.view --params '{"name":"宫保虾球"}'` |
| 查看背景 | chef.recipe.view | detail | `chef-cmd-read chef.recipe.view --params '{"name":"宫保虾球"}'` |
| 查看全部 | chef.recipe.view | detail | `chef-cmd-read chef.recipe.view` |
| 搜索食谱 | chef.recipe.search | list | `chef-cmd-read chef.recipe.search --params '{"q":"排骨"}'` |
| 搜菜 | chef.recipe.search | list | `chef-cmd-read chef.recipe.search --params '{"q":"排骨"}'` |
| 查食材 | chef.recipe.search | list | `chef-cmd-read chef.recipe.search --params '{"q":"排骨"}'` |
| 筛选菜系 | chef.recipe.search | list | `chef-cmd-read chef.recipe.search --params '{"filter":"川菜"}'` |
| 筛选食材 | chef.recipe.search | list | `chef-cmd-read chef.recipe.search --params '{"filter":"川菜"}'` |
| 筛选口味 | chef.recipe.search | list | `chef-cmd-read chef.recipe.search --params '{"filter":"川菜"}'` |
| 筛选季节 | chef.recipe.search | list | `chef-cmd-read chef.recipe.search --params '{"filter":"川菜"}'` |
| 录入食谱 | chef.recipe.write | receipt | `chef-cmd-read chef.recipe.write --params '{"op":"add","name":"宫保虾球"}'` |
| 修改食谱 | chef.recipe.write | receipt | `chef-cmd-read chef.recipe.write --params '{"op":"update","name":"宫保虾球"}'` |
| 废弃食谱 | chef.recipe.write | receipt | `chef-cmd-read chef.recipe.write --params '{"op":"deprecate","name":"宫保虾球"}'` |
| 加菜 | chef.recipe.write | receipt | `chef-cmd-read chef.recipe.write --params '{"op":"add","name":"宫保虾球"}'` |
| 做菜模式 | chef.cooking.run | list | `chef-cmd-read chef.cooking.run --params '{"name":"宫保虾球"}'` |
| 开始做菜 | chef.cooking.run | list | `chef-cmd-read chef.cooking.run --params '{"name":"宫保虾球"}'` |
| 继续做菜 | chef.cooking.run | list | `chef-cmd-read chef.cooking.run --params '{"name":"宫保虾球"}'` |
| 完成做菜 | chef.cooking.run | list | `chef-cmd-read chef.cooking.run --params '{"name":"宫保虾球"}'` |
| 生成清单 | chef.shopping.query | list | `chef-cmd-read chef.shopping.query --params '{"names":["宫保虾球","鱼香肉丝"]}'` |
| 排除可选 | chef.shopping.query | list | `chef-cmd-read chef.shopping.query --params '{"names":["宫保虾球","鱼香肉丝"]}'` |
| 查清单 | chef.shopping.query | list | `chef-cmd-read chef.shopping.query` |
| 清空清单 | chef.shopping.query | list | `chef-cmd-read chef.shopping.query` |
| 记录做菜 | chef.history.record | receipt | `chef-cmd-read chef.history.record --params '{"name":"宫保虾球"}'` |
| 补录做菜 | chef.history.record | receipt | `chef-cmd-read chef.history.record --params '{"name":"宫保虾球"}'` |
| 改评分 | chef.history.record | receipt | `chef-cmd-read chef.history.record --params '{"name":"宫保虾球"}'` |
| 查看历史 | chef.history.query | list | `chef-cmd-read chef.history.query --params '{"name":"宫保虾球"}'` |
| 查看统计 | chef.history.query | list | `chef-cmd-read chef.history.query` |
| 体检 | chef.history.query | list | `chef-cmd-read chef.history.query` |

相关场景：chef.cooking.run、chef.help.lookup、chef.history.query、chef.history.record、chef.recipe.search、chef.recipe.view、chef.recipe.write、chef.shopping.query（8 联动，key 字符串后续票落表时冻结）。
<!-- HELP-AUTO-END -->

## 环境与出 scope

- SKILLS_DB_PATH（必设，无默认值）+ CHEF_FORCE_PROD 哨兵（非 tmp 写库须 opt-in），见 docs/env.md。
- 出 scope：定时任务（老家零定时代码，外部定时以外置为准）、面板（二期单 MAP）、combos.yaml 一律不碰（走后续票；shopping/recipe 跨技能仅复制 prompt）；真实数据禁迁，测试 tmp 隔离；Python 老家只读对照（D:/2Study/StudyNotes/SKILLS/私家大厨）。
