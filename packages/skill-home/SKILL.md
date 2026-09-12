---
name: skill-home
description: "「居家管家HELP」→home.help.lookup 缺省落一份 HELP 文件并回执绝对路径（老骨架 9 域／30 组／73 场景）；唯一出口 home-cmd-read。触发词：居家管家 帮助、居家管家帮助、居家管家能做什么、查物品、看物品、录物品、改物品、盘物品、查位置、查快递、查保修、查证件、看统计、初始化。"
help_wake_word: "居家管家 帮助"
---

# 居家管家（home）SKILL

家庭物品全生命周期管理：搜/看/录/改、标签分类、盘点、位置、穿搭出行、统计、购物快递、票据凭证、家庭协作、初始化运维。唯一出口 `home-cmd-read <home.key>`，argv+JSON(stdout)+exit，非 0 走 stderr。写走 receipt（直通即真相）。

## 快速开始

```sh
home-cmd-read home.item.search --params '{"name":"牛奶"}'
home-cmd-read home.item.add --params '{"name":"牛奶","category_id":1,"location":"客厅/冰箱"}'
home-cmd-read home.help.lookup --params '{"q":"查物品"}'
```

## HELP 交付（「居家管家HELP」这条命令交什么）

对用户说「居家管家 帮助」时，**这条命令的缺省行为就是落一份 HELP HTML 文件**，并把绝对路径回执进 stdout：

- **缺省**（不给 `q`／`mode`）：产物落 `<SKILLS_DB_PATH>/home_manager_html/居家管家_HELP_<YYYYMMDD_HHMMSS>.html`；**缺省（24 小时内）重复触发回同一路径、不新建**——需要每次落新件时传 `--params '{"reuseHours":0}'`（此时同秒冲突才走 `_2` 递补）；stdout 顶层多一个 `delivery{mode,path,bytes}`，`path` 恒为**绝对路径** ⇒ **把 `delivery.path` 告诉用户**（他要打开的就是这一份），落点一律以回执为准。
- **速查表**（`--params '{"mode":"lookup"}'`）：落 `<SKILLS_DB_PATH>/home_manager_html/居家管家_速查表_<时间戳>.html`（与 HELP 文件**分名**——别让用户按一个名字打开到另一个东西）。
- **现找**（`--params '{"q":"查物品"}'`）：只在 stdout 回命中，**不落盘**（检索式问答不刷目录）。
- 这两支**互斥**：`mode` 与 `q` 同给、或 `mode` 不是 `lookup`，一律 exit 2（stderr 是 `ERR 2: …`），失败路径上 stdout 保持干净。
- **反复读不再涨目录（#245）**：同一主体**一天内只留一份**——24 小时内再读就**复用已有那份**（不新建、不改写；回执给的就是它）。要别的窗口给 `--params '{"reuseHours":3}'`（小时）；要**每次都要一份最新的**给 `{"reuseHours":0}`。窗口内若已有一份、而你刚改过 HELP 内容，那份旧产物**不会被自动刷新**（窗口语义如此）——真要新的就带 `reuseHours:0`。`reuseHours` 给坏值（非数／负数）exit 2。

**完成判据**：`delivery.path` 指的文件**存在**，且它的大小 ＝ 回执里的 `delivery.bytes`（两处对不上就是没做完，别把回执当完成）。

两件容易踩的：

- 这条命令**不开库**：它在开库之前分派，跑完产物目录里 0 个 `.db`（落文件仍然要求 `SKILLS_DB_PATH` 已设）。
- 页面由**通用 help 模板**（`base-paint/help-shell` 的 `renderHelpShellHtml`）渲染，与卡路里／饼干记账／私家大厨同款；要动观感就去改模板源再跑它的生成器。

**本节不管**（各有归属，别在这里找）：其余 20 条 `home.*` 命令（各有自己的节）；`--html <路径>`（所有命令通用的分节页出口，与 HELP 交付不是一回事）；把文件送进面板／侧栏（属另一条线）。

## 装出来的那份怎么判新旧

装到 agent 读得到位置的那份与仓内这个包是不是同一份，对**安装点**（`<技能目录>` 取实际安装点：本机常见形如 `~/.agents/skills/<技能名>`，该处没有同名目录时说明装到了别处）跑 `Get-Item <技能目录> -Force | Select-Object LinkType` 一看便知：**链接（Junction／目录联接）＝同一份**，改仓内立即生效；**拷贝**才谈新旧——只能比 `SKILL.md` 的哈希（拷贝里那份与仓里这份哈希不同＝旧的，重新把技能装到 agent 读得到的位置）。

## 口径

- 分类：8 顶级统一不带前缀（食物与饮品/衣物与穿戴/家居与陈设/工具与器材/数码与电子/健康与医药/文体与娱乐/资产与凭证）；录物品须 category_id 正整数（从 categories 表查）；分类名禁数字前缀/emoji。
- 位置：须两级路径（如 客厅/冰箱）；11 状态（在家/备用/穿着中/旅游中/洗护中/借用中/维修中/已用完/快递中/待处理/已废弃）；数量非负整数，0 自动清位。
- 账号：master-key ≥8 位门；密码 AES-256-CBC 本地加密；看密码仅对话 JSON 回显，HTML 快照脱敏占位。
- 历史/照片墙折入 detail/search（view/wall 分流），管照片折入 update（photo 参数）；闲置/过期折入 alert（kind 分流）；购物改新增“改购物清单”（老家无直接词，补齐写链）。
- 废弃词（联动 3 词：联动总览/记到卡路里/记到记账）不路由，combos 登记走后续票。
- 坏输入与缺失一律阻断（exit 2/4），不返空数组冒充正常。

## 联动速查（构建期注入，勿手改）

<!-- HELP-AUTO-START -->
| 唤醒词 | key | shape | 例 |
|---|---|---|---|
| 居家管家 帮助 | home.help.lookup | list | `home-cmd-read home.help.lookup` |
| 居家管家帮助 | home.help.lookup | list | `home-cmd-read home.help.lookup` |
| 居家管家能做什么 | home.help.lookup | list | `home-cmd-read home.help.lookup` |
| 查物品(HTML) | home.item.search | list | `home-cmd-read home.item.search` |
| 看物品(HTML) | home.item.detail | detail | `home-cmd-read home.item.detail --params '{"id":1}'` |
| 统物品(HTML) | home.stats.overview | stat | `home-cmd-read home.stats.overview` |
| 查物品 | home.item.search | list | `home-cmd-read home.item.search` |
| 看物品 | home.item.detail | detail | `home-cmd-read home.item.detail --params '{"id":1}'` |
| 录物品 | home.item.add | receipt | `home-cmd-read home.item.add` |
| 拍物品 | home.item.add | receipt | `home-cmd-read home.item.add --params '{"photo":"1"}'` |
| 改物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"id":1}'` |
| 移物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"move","id":1}'` |
| 补物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"qty","id":1}'` |
| 减物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"qty","id":1}'` |
| 标物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"tags","id":1}'` |
| 废物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"status","id":1}'` |
| 借物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"status","id":1}'` |
| 修物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"status","id":1}'` |
| 盘物品 | home.inventory.round | receipt | `home-cmd-read home.inventory.round --params '{"op":"round"}'` |
| 盘全部 | home.inventory.round | receipt | `home-cmd-read home.inventory.round --params '{"op":"round","scope":"all"}'` |
| 穿什么 | home.outfit.pick | list | `home-cmd-read home.outfit.pick` |
| 带物品 | home.trip.manage | receipt | `home-cmd-read home.trip.manage --params '{"mode":"pack"}'` |
| 归物品 | home.trip.manage | receipt | `home-cmd-read home.trip.manage --params '{"mode":"return"}'` |
| 统物品 | home.stats.overview | stat | `home-cmd-read home.stats.overview --params '{"kind":"summary"}'` |
| 查高频 | home.stats.overview | stat | `home-cmd-read home.stats.overview --params '{"kind":"summary"}'` |
| 查低频 | home.stats.alert | list | `home-cmd-read home.stats.alert --params '{"kind":"idle"}'` |
| 查过期 | home.stats.alert | list | `home-cmd-read home.stats.alert --params '{"kind":"expiring"}'` |
| 看标签 | home.tag.query | list | `home-cmd-read home.tag.query` |
| 合标签 | home.tag.write | receipt | `home-cmd-read home.tag.write --params '{"op":"merge"}'` |
| 查快递 | home.shopping.query | list | `home-cmd-read home.shopping.query --params '{"kind":"express"}'` |
| 推位置 | home.location.query | list | `home-cmd-read home.location.query --params '{"mode":"suggest"}'` |
| 找位置 | home.location.query | list | `home-cmd-read home.location.query --params '{"mode":"find"}'` |
| 查账号 | home.ticket.query | list | `home-cmd-read home.ticket.query --params '{"kind":"account"}'` |
| 存账号 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"account","op":"add"}'` |
| 改账号 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"account","op":"update"}'` |
| 看密码 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"account","op":"show"}'` |
| 查异常 | home.care.query | list | `home-cmd-read home.care.query --params '{"kind":"lint"}'` |
| 借用 | home.care.query | list | `home-cmd-read home.care.query --params '{"kind":"borrow"}'` |
| 家人档案 | home.care.query | list | `home-cmd-read home.care.query --params '{"kind":"member"}'` |
| 管位置 | home.location.write | receipt | `home-cmd-read home.location.write --params '{"op":"manage"}'` |
| 固定位 | home.location.write | receipt | `home-cmd-read home.location.write --params '{"op":"fixed"}'` |
| 收纳建议 | home.location.query | list | `home-cmd-read home.location.query --params '{"mode":"storage"}'` |
| 空间视图 | home.location.query | list | `home-cmd-read home.location.query --params '{"mode":"space"}'` |
| 查闲置 | home.stats.alert | list | `home-cmd-read home.stats.alert --params '{"kind":"idle"}'` |
| 盘点统计 | home.stats.overview | stat | `home-cmd-read home.stats.overview --params '{"kind":"inventory"}'` |
| 首次使用 | home.care.write | receipt | `home-cmd-read home.care.write --params '{"kind":"init"}'` |
| 备份导出 | home.care.write | receipt | `home-cmd-read home.care.write --params '{"kind":"backup"}'` |
| 导入恢复 | home.care.write | receipt | `home-cmd-read home.care.write --params '{"kind":"import"}'` |
| 批量录入 | home.item.add | receipt | `home-cmd-read home.item.add --params '{"op":"batch"}'` |
| 补录 | home.item.add | receipt | `home-cmd-read home.item.add --params '{"op":"backfill"}'` |
| 紧急定位 | home.item.search | list | `home-cmd-read home.item.search --params '{"locate":true}'` |
| 筛选浏览 | home.item.search | list | `home-cmd-read home.item.search --params '{"browse":true}'` |
| 拍照找物品 | home.item.search | list | `home-cmd-read home.item.search --params '{"photo":true}'` |
| 查重复 | home.item.search | list | `home-cmd-read home.item.search --params '{"dupes":true}'` |
| 合并物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"merge","id":1}'` |
| 撤销操作 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"undo"}'` |
| 物品关联 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"relate","id":1}'` |
| 管标签 | home.tag.write | receipt | `home-cmd-read home.tag.write --params '{"op":"overview"}'` |
| 管分类 | home.tag.write | receipt | `home-cmd-read home.tag.write --params '{"op":"category"}'` |
| 整理建议 | home.tag.write | receipt | `home-cmd-read home.tag.write --params '{"op":"tidy"}'` |
| 查看照片 | home.item.detail | detail | `home-cmd-read home.item.detail --params '{"view":"photos","id":1}'` |
| 管照片 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"photo","id":1}'` |
| 照片墙 | home.item.search | list | `home-cmd-read home.item.search --params '{"wall":true}'` |
| 盘点记录 | home.inventory.records | list | `home-cmd-read home.inventory.records` |
| 差异处理 | home.inventory.round | receipt | `home-cmd-read home.inventory.round --params '{"op":"resolve"}'` |
| 搬家盘点 | home.inventory.round | receipt | `home-cmd-read home.inventory.round --params '{"op":"move"}'` |
| 历史 | home.item.detail | detail | `home-cmd-read home.item.detail --params '{"view":"history","id":1}'` |
| 数量变更 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"qty","id":1}'` |
| 状态变更 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"status","id":1}'` |
| 盘点 | home.inventory.round | receipt | `home-cmd-read home.inventory.round --params '{"op":"round"}'` |
| 购物清单 | home.shopping.query | list | `home-cmd-read home.shopping.query --params '{"kind":"list"}'` |
| 缺货检测 | home.shopping.query | list | `home-cmd-read home.shopping.query --params '{"kind":"missing"}'` |
| 囤货盘点 | home.shopping.query | list | `home-cmd-read home.shopping.query --params '{"kind":"stock"}'` |
| 查购买记录 | home.ticket.query | list | `home-cmd-read home.ticket.query --params '{"kind":"purchase"}'` |
| 查上月购买 | home.ticket.query | list | `home-cmd-read home.ticket.query --params '{"kind":"purchase","range":"last-month"}'` |
| 查今年花费 | home.ticket.query | list | `home-cmd-read home.ticket.query --params '{"kind":"purchase","range":"year"}'` |
| 查退货窗口 | home.ticket.query | list | `home-cmd-read home.ticket.query --params '{"kind":"purchase","range":"return"}'` |
| 登记购买记录 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"purchase","op":"add"}'` |
| 查保修状态 | home.ticket.query | list | `home-cmd-read home.ticket.query --params '{"kind":"warranty"}'` |
| 登记保修 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"warranty","op":"register"}'` |
| 记录维修 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"warranty","op":"repair"}'` |
| 设置保养周期 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"warranty","op":"cycle"}'` |
| 执行保养 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"warranty","op":"maintain"}'` |
| 查证件到期 | home.ticket.query | list | `home-cmd-read home.ticket.query --params '{"kind":"cert"}'` |
| 登记证件 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"cert","op":"add"}'` |
| 证件归档 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"cert","op":"archive"}'` |
| 更新证件 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"cert","op":"update"}'` |
| 衣橱分析 | home.outfit.pick | list | `home-cmd-read home.outfit.pick --params '{"kind":"wardrobe"}'` |
| 换季 | home.outfit.pick | list | `home-cmd-read home.outfit.pick --params '{"kind":"season"}'` |
| 旅行穿搭 | home.outfit.pick | list | `home-cmd-read home.outfit.pick --params '{"kind":"trip-plan"}'` |
| 改购物清单 | home.shopping.write | receipt | `home-cmd-read home.shopping.write --params '{"op":"check"}'` |

相关场景：home.care.query、home.care.write、home.help.lookup、home.inventory.records、home.inventory.round、home.item.add、home.item.detail、home.item.search、home.item.update、home.location.query、home.location.write、home.outfit.pick、home.shopping.query、home.shopping.write、home.stats.alert、home.stats.overview、home.tag.query、home.tag.write、home.ticket.query、home.ticket.write、home.trip.manage（21 联动，key 字符串后续票落表时冻结）。
<!-- HELP-AUTO-END -->

## 环境与出 scope

- SKILLS_DB_PATH（必设，无默认值）+ HOME_FORCE_PROD 哨兵（非 tmp 写库须 opt-in），见 docs/env.md；HOME_PHOTOS_DIR 可选（缺失仅告警）。
- 出 scope：定时任务（老家零定时代码）、面板（二期单 MAP）、本技能外联动登记（combos.yaml 一律不碰，走后续票；SM9 3 场景 prompt 复制不迁）；真实数据禁迁，测试 tmp 隔离。

## 公共安装器运行时（skills-cli 装完必读，#47）

- 本仓库 `dist/` 不进 git：skills-cli 只把本目录（含本文件）装进 agent，不带可执行文件；「不走 npm」的只是 skill 发现这一步，运行时走 npm（npm 包名即目录名 `skill-home`，二进制名 `home-cmd-read`）。
- 取运行时二选一：`npm install -g skill-home`（一劳永逸），或免安装 `npx -p skill-home home-cmd-read …`（每次现拉）。**但这两条现在必失败：`skill-home@0.1.0` 虽已发布到 npm（2026-09-07，registry 在册），它的依赖 `"base-link-core": "workspace:^0.1.0"` 未改写 ⇒ npm 报 `EUNSUPPORTEDPROTOCOL`**（已发布包待重发，发版流修，见 docs/public-installer-47.md「已发布包阻塞」）——重发前一律走下面那条本仓构建产物验证链路。
- HELP 端到端验证（本仓构建产物；node>=22.13 是 `engines` 钉死的门槛；sh 先 `export SKILLS_DB_PATH="$(mktemp -d)"`，Windows PowerShell 先 `$env:SKILLS_DB_PATH = "$env:TEMP\sk-test"`；完整口径见 docs/public-installer-47.md）：
  ```sh
  node packages/skill-home/dist/cli/cmd_read.js home.help.lookup
  ```
- 上面这条跑通的样子：stdout 一行 envelope JSON，`delivery.path` 指的文件存在且大小＝`delivery.bytes`（与「HELP 交付」节的完成判据同源）。
- 版本钉死登记：本节**命令不写版本号**（重发前钉了也装不上，没有意义；npm 现值 `0.1.0`）；重发后照 docs/public-installer-47.md「版本钉死登记」把 SKILL.md／该文档／`test/skills-export-47.test.mjs` 三处硬编码一起同步。
