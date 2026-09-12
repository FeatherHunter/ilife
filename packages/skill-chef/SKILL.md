---
name: skill-chef
description: "「私家大厨HELP」→chef.help.lookup 落一份 HELP 文件并回执绝对路径；唯一出口 chef-cmd-read（本地菜谱：搜菜／查看／加菜、跟着做、买菜清单合并、做菜记录与历史、体检排序）。触发词：私家大厨HELP、菜谱HELP、查帮助、能做什么、查看食谱、查看食材、查看步骤、查看营养、查看背景、看菜谱、看菜、查看全部、搜索食谱、搜菜、查食材、筛选菜系、筛选食材、筛选口味、筛选季节、录入食谱、修改食谱、废弃食谱、加菜、做菜模式、开始做菜、继续做菜、完成做菜、生成清单、排除可选、查清单、清空清单、记录做菜、补录做菜、改评分、查看历史、查看统计、体检"
---
# 私家大厨（chef）SKILL

本地菜谱：搜菜/查看/加菜、跟着做（烹饪步骤）、买菜清单合并、做菜记录与历史、体检排序、HELP 交付（落 HTML 文件）。唯一出口 `chef-cmd-read <chef.key>`，argv+JSON(stdout)+exit，非 0 走 stderr。写走 receipt（直通即真相）。

## 快速开始

```sh
chef-cmd-read chef.help.lookup                                 # 缺省＝落 HELP 文件：stdout 的 delivery.path 就是它
chef-cmd-read chef.help.lookup --params '{"mode":"lookup"}'    # 落速查表文件（与 HELP 分名）
chef-cmd-read chef.help.lookup --params '{"q":"搜菜"}'         # 现找：只回命中，不落盘
chef-cmd-read chef.help.lookup --params '{"reuseHours":0}'      # 一定要一份最新的（缺省一天内复用，不新建）
chef-cmd-read chef.recipe.search --params '{"q":"虾"}'
chef-cmd-read chef.recipe.view --params '{"name":"宫保虾球"}'
```

## HELP 交付（「私家大厨HELP」这条命令交什么）

对用户说「私家大厨help」时，**这条命令的缺省行为就是落一份 HELP HTML 文件**，并把绝对路径回执进 stdout：

- **缺省**（不给 `q`／`mode`）：产物落 `<SKILLS_DB_PATH>/cook_html/help/私家大厨_HELP_<YYYYMMDD_HHMMSS>[_N].html`；
  stdout 顶层多一个 `delivery{mode,path,bytes}`，`path` 恒为**绝对路径** ⇒ **把 `delivery.path` 告诉用户**（他要打开的就是这一份）。
  文件名主体与老技能逐字相同；**同一主体一天内只留一份**——24 小时内再读就复用已有那份（不新建、不改写），已有那份绝不动。
- **速查表**（`--params '{"mode":"lookup"}'`）：落 `私家大厨_速查表_<stamp>.html`（与 HELP 文件**分名**——别让用户按一个名字打开到另一个东西），载荷是 37 条短语；同样吃下面的复用窗口。
- **现找**（`--params '{"q":"搜菜"}'`）：只在 stdout 回命中，**不落盘**（检索式问答不刷目录）。
- **指定落点**（`--html <路径>`）：逐字落到那个路径（覆盖写），回执同样是绝对路径。
- **复用窗口**（`--params '{"reuseHours":3}'`）：3 小时内复用同一份；`{"reuseHours":0}`＝**每次都要一份最新的**（缺省窗口就是一天，见上）。窗口内已有一份、而你刚改过 HELP 内容时，旧产物**不会自动刷新**——要新的就带 `reuseHours:0`。

**完成判据**：`delivery.path` 指的文件**存在**，且它的大小 ＝ `delivery.bytes`（两处对不上就是没做完，别把回执当完成）。

两件容易踩的：

- 这条命令**不开库**：跑完不会多出 `chef_data.db`（落文件仍然要求 `SKILLS_DB_PATH` 已设置）。
- 页面由**通用 help 模板**（`base-paint/help-shell`）渲染，与卡路里／饼干记账／居家管家同款；要动观感就去改模板源再跑它的生成器。

失败口径：参数错（`q` 与 `mode` 互斥、`mode` 只认 `lookup`）走 `exit 2`；渲染或落盘失败走 `exit 5`（stderr 是 `ERR 5: …`），失败路径上 stdout 保持干净。

**本节不管**（各有归属，别在这里找）：页面里的内容（域／组／卡在 `src/help/sceneData.ts` 的内容资产，改内容走 `scripts/gen-help-assets.mjs` 再生成）；名字怎么算（时间戳格式与同秒递补的唯一定义地是共用件 `packages/base-render/src/output/saveHtml.ts`）；把文件送进面板／侧栏（属 #57 那条线）。

## 装出来的那份怎么判新旧

`~/.agents/skills/skill-chef` 在本机实测是 **Junction（目录联接）**，指向仓内这个包 ⇒ 它就是同一份文件，改这里立即生效；`Get-Item <路径> -Force | Select-Object LinkType` 一看便知。若某台机器上它是**拷贝**，那才谈新旧：只能比 `SKILL.md` 的哈希（拷贝里那份与仓里这份哈希不同＝旧的，重新装机）。

## 口径

- 难度 5 档：快手菜/简单/中等/困难/大师（validateDifficulty，大小写/空串/未知档一律阻断）。
- 状态 4 种：未做/已做/熟练/已废弃（validateStatus；废弃= status 置已废弃，只增不删，无物理删除，列表默认过滤已废弃）。
- 火候 5 档：微火/小火/中火/大火/猛火（validateHeat，步骤 heat_level 必落此表）。
- 食材 11 类：肉类/海鲜/蛋类/蔬菜/葱姜蒜/香草/调料/豆制品/主食/干货/其他（validateCategory，未知类阻断）。
- 评分 0-5（含 0/5 端点，允许小数，超界/非数字阻断；history.record 必带 name，rating 可选）。
- 空查询与空结果阻断不返空：search 空 q 抛 exit 2；查无对条/区间无记录抛 exit 4，不返空数组冒充正常。
- 筛选维度一期限制（#43 F2）：cuisine/season/method/flavor/tag/meal/cookware/maxTime/filter 只读（recipe.search 透传过滤），recipe.write 一期只写主表（name/difficulty/status/servings/total_time_minutes/description/photo/source 系列 + ingredients/steps 内嵌），维度表落库走二期（测试经直连落维度，见 test/cli.test.mjs）。
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
| 看菜谱 | chef.recipe.view | detail | `chef-cmd-read chef.recipe.view --params '{"name":"宫保虾球"}'` |
| 看菜 | chef.recipe.view | detail | `chef-cmd-read chef.recipe.view --params '{"name":"宫保虾球"}'` |
| 查看全部 | chef.recipe.search | list | `chef-cmd-read chef.recipe.search --params '{"kind":"all"}'` |
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
| 查清单 | chef.shopping.query | list | `chef-cmd-read chef.shopping.query --params '{"names":["宫保虾球","鱼香肉丝"]}'` |
| 清空清单 | chef.shopping.query | list | `chef-cmd-read chef.shopping.query --params '{"names":["宫保虾球","鱼香肉丝"]}'` |
| 记录做菜 | chef.history.record | receipt | `chef-cmd-read chef.history.record --params '{"name":"宫保虾球"}'` |
| 补录做菜 | chef.history.record | receipt | `chef-cmd-read chef.history.record --params '{"name":"宫保虾球"}'` |
| 改评分 | chef.history.record | receipt | `chef-cmd-read chef.history.record --params '{"name":"宫保虾球"}'` |
| 查看历史 | chef.history.query | list | `chef-cmd-read chef.history.query --params '{"name":"宫保虾球"}'` |
| 查看统计 | chef.history.query | list | `chef-cmd-read chef.history.query --params '{"kind":"stats"}'` |
| 体检 | chef.history.query | list | `chef-cmd-read chef.history.query --params '{"kind":"quality"}'` |

相关场景：chef.cooking.run、chef.help.lookup、chef.history.query、chef.history.record、chef.recipe.search、chef.recipe.view、chef.recipe.write、chef.shopping.query（8 联动，key 字符串后续票落表时冻结）。
<!-- HELP-AUTO-END -->

## 环境与出 scope

- SKILLS_DB_PATH（必设，无默认值）+ CHEF_FORCE_PROD 哨兵（非 tmp 写库须 opt-in），见 docs/env.md。
- 出 scope：定时任务（老家零定时代码，外部定时以外置为准）、面板（二期单 MAP）、combos.yaml 一律不碰（走后续票；shopping/recipe 跨技能仅复制 prompt）；真实数据禁迁，测试 tmp 隔离；Python 老家只读对照（D:/2Study/StudyNotes/SKILLS/私家大厨）。
