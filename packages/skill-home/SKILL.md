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

- **缺省**（不给 `q`／`mode`）：产物落 `<库目录>/<产物目录>/居家管家_HELP_<YYYYMMDD_HHMMSS>.html`——`<库目录>`＝配置文件 `~/.ilife/home.yaml` 的 `db.dir`，空串＝数据目录 `~/.ilife/data/`；`<产物目录>`＝同文件的 `html.dir`（默认 `home_manager_html`）；**缺省（24 小时内）重复触发回同一路径、不新建**——需要每次落新件时传 `--params '{"reuseHours":0}'`（此时同秒冲突才走 `_2` 递补）；stdout 顶层多一个 `delivery{mode,path,bytes}`，`path` 恒为**绝对路径** ⇒ **把 `delivery.path` 告诉用户**（他要打开的就是这一份），落点一律以回执为准。
- **速查表**（`--params '{"mode":"lookup"}'`）：落同一产物目录下 `居家管家_速查表_<时间戳>.html`（与 HELP 文件**分名**——别让用户按一个名字打开到另一个东西）。
- **现找**（`--params '{"q":"查物品"}'`）：只在 stdout 回命中，**不落盘**（检索式问答不刷目录）。
- 这两支**互斥**：`mode` 与 `q` 同给、或 `mode` 不是 `lookup`，一律 exit 2（stderr 是 `ERR 2: …`），失败路径上 stdout 保持干净。
- **反复读不再涨目录（#245）**：同一主体**一天内只留一份**——24 小时内再读就**复用已有那份**（不新建、不改写；回执给的就是它）。要别的窗口给 `--params '{"reuseHours":3}'`（小时）；要**每次都要一份最新的**给 `{"reuseHours":0}`。窗口内若已有一份、而你刚改过 HELP 内容，那份旧产物**不会被自动刷新**（窗口语义如此）——真要新的就带 `reuseHours:0`。`reuseHours` 给坏值（非数／负数）exit 2。

**完成判据**：`delivery.path` 指的文件**存在**，且它的大小 ＝ 回执里的 `delivery.bytes`（两处对不上就是没做完，别把回执当完成）。

两件容易踩的：

- 这条命令**不开库**：它在开库之前分派，跑完产物目录里 0 个 `.db`（落文件仍然要求库目录定得下来：配置文件 `~/.ilife/home.yaml` 的 `db.dir`，空串＝数据目录，故从不因「没设什么」而失败）。
- 页面由**通用 help 模板**（`base-paint/help-shell` 的 `renderHelpShellHtml`）渲染，与卡路里／饼干记账／私家大厨同款；要动观感就去改模板源再跑它的生成器。

**本节不管**（各有归属，别在这里找）：其余 20 条 `home.*` 命令（各有自己的节）；`--html <路径>`（所有命令通用的分节页出口，与 HELP 交付不是一回事）；把文件送进面板／侧栏（属另一条线）。

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
| 查快递 | home.shopping.query | list | `home-cmd-read home.shopping.query --params '{"kind":"express"}'` |
| 购物清单 | home.shopping.query | list | `home-cmd-read home.shopping.query --params '{"kind":"list"}'` |
| 缺货检测 | home.shopping.query | list | `home-cmd-read home.shopping.query --params '{"kind":"missing"}'` |
| 囤货盘点 | home.shopping.query | list | `home-cmd-read home.shopping.query --params '{"kind":"stock"}'` |
| 改购物清单 | home.shopping.write | receipt | `home-cmd-read home.shopping.write --params '{"op":"check"}'` |
| 查异常 | home.care.query | list | `home-cmd-read home.care.query --params '{"kind":"lint"}'` |
| 借用 | home.care.query | list | `home-cmd-read home.care.query --params '{"kind":"borrow"}'` |
| 借出 | home.care.write | receipt | `home-cmd-read home.care.write --params '{"kind":"borrow","op":"borrow"}'` |
| 借入 | home.care.write | receipt | `home-cmd-read home.care.write --params '{"kind":"borrow","op":"borrow"}'` |
| 归还 | home.care.write | receipt | `home-cmd-read home.care.write --params '{"kind":"borrow","op":"return"}'` |
| 催还 | home.care.query | list | `home-cmd-read home.care.query --params '{"kind":"borrow"}'` |
| 家人档案 | home.care.query | list | `home-cmd-read home.care.query --params '{"kind":"member"}'` |
| 首次使用 | home.care.write | receipt | `home-cmd-read home.care.write --params '{"kind":"init"}'` |
| 备份导出 | home.care.write | receipt | `home-cmd-read home.care.write --params '{"kind":"backup"}'` |
| 导入恢复 | home.care.write | receipt | `home-cmd-read home.care.write --params '{"kind":"import"}'` |
| 查物品(HTML) | home.item.search | list | `home-cmd-read home.item.search` |
| 查物品 | home.item.search | list | `home-cmd-read home.item.search` |
| 紧急定位 | home.item.search | list | `home-cmd-read home.item.search --params '{"locate":true}'` |
| 筛选浏览 | home.item.search | list | `home-cmd-read home.item.search --params '{"browse":true}'` |
| 拍照找物品 | home.item.search | list | `home-cmd-read home.item.search --params '{"photo":true}'` |
| 查重复 | home.item.search | list | `home-cmd-read home.item.search --params '{"dupes":true}'` |
| 照片墙 | home.item.search | list | `home-cmd-read home.item.search --params '{"wall":true}'` |
| 搜索物品 | home.item.search | list | `home-cmd-read home.item.search` |
| 找一下物品 | home.item.search | list | `home-cmd-read home.item.search` |
| 帮我找找 | home.item.search | list | `home-cmd-read home.item.search` |
| 看看家里有啥 | home.item.search | list | `home-cmd-read home.item.search` |
| 看物品(HTML) | home.item.detail | detail | `home-cmd-read home.item.detail --params '{"id":1}'` |
| 看物品 | home.item.detail | detail | `home-cmd-read home.item.detail --params '{"id":1}'` |
| 查看照片 | home.item.detail | detail | `home-cmd-read home.item.detail --params '{"view":"photos","id":1}'` |
| 历史 | home.item.detail | detail | `home-cmd-read home.item.detail --params '{"view":"history","id":1}'` |
| 查看物品 | home.item.detail | detail | `home-cmd-read home.item.detail --params '{"id":1}'` |
| 物品详情 | home.item.detail | detail | `home-cmd-read home.item.detail --params '{"id":1}'` |
| 录物品 | home.item.add | receipt | `home-cmd-read home.item.add` |
| 拍物品 | home.item.add | receipt | `home-cmd-read home.item.add --params '{"photo":"1"}'` |
| 批量录入 | home.item.add | receipt | `home-cmd-read home.item.add --params '{"op":"batch"}'` |
| 补录 | home.item.add | receipt | `home-cmd-read home.item.add --params '{"op":"backfill"}'` |
| 登记物品 | home.item.add | receipt | `home-cmd-read home.item.add` |
| 添加物品 | home.item.add | receipt | `home-cmd-read home.item.add` |
| 帮我记一下 | home.item.add | receipt | `home-cmd-read home.item.add` |
| 家里又多了个东西 | home.item.add | receipt | `home-cmd-read home.item.add` |
| 新到货了 | home.item.add | receipt | `home-cmd-read home.item.add` |
| 改物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"id":1}'` |
| 移物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"move","id":1}'` |
| 补物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"qty","id":1}'` |
| 减物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"qty","id":1}'` |
| 标物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"tags","id":1}'` |
| 废物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"status","id":1}'` |
| 借物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"status","id":1}'` |
| 修物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"status","id":1}'` |
| 合并物品 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"merge","id":1}'` |
| 撤销操作 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"undo"}'` |
| 物品关联 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"relate","id":1}'` |
| 管照片 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"photo","id":1}'` |
| 数量变更 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"qty","id":1}'` |
| 状态变更 | home.item.update | receipt | `home-cmd-read home.item.update --params '{"op":"status","id":1}'` |
| 看标签 | home.tag.query | list | `home-cmd-read home.tag.query` |
| 管标签 | home.tag.write | receipt | `home-cmd-read home.tag.write --params '{"op":"overview"}'` |
| 管分类 | home.tag.write | receipt | `home-cmd-read home.tag.write --params '{"op":"category"}'` |
| 整理建议 | home.tag.write | receipt | `home-cmd-read home.tag.write --params '{"op":"tidy"}'` |
| 合标签 | home.tag.write | receipt | `home-cmd-read home.tag.write --params '{"op":"merge"}'` |
| 盘物品 | home.inventory.round | receipt | `home-cmd-read home.inventory.round --params '{"op":"round"}'` |
| 盘全部 | home.inventory.round | receipt | `home-cmd-read home.inventory.round --params '{"op":"round","scope":"all"}'` |
| 盘点 | home.inventory.round | receipt | `home-cmd-read home.inventory.round --params '{"op":"round"}'` |
| 差异处理 | home.inventory.round | receipt | `home-cmd-read home.inventory.round --params '{"op":"resolve"}'` |
| 搬家盘点 | home.inventory.round | receipt | `home-cmd-read home.inventory.round --params '{"op":"move"}'` |
| 清点物品 | home.inventory.round | receipt | `home-cmd-read home.inventory.round --params '{"op":"round"}'` |
| 核对库存 | home.inventory.round | receipt | `home-cmd-read home.inventory.round --params '{"op":"round"}'` |
| 数数这里 | home.inventory.round | receipt | `home-cmd-read home.inventory.round --params '{"op":"round"}'` |
| 盘点记录 | home.inventory.records | list | `home-cmd-read home.inventory.records` |
| 穿什么 | home.outfit.pick | list | `home-cmd-read home.outfit.pick` |
| 衣橱分析 | home.outfit.pick | list | `home-cmd-read home.outfit.pick --params '{"kind":"wardrobe"}'` |
| 换季 | home.outfit.pick | list | `home-cmd-read home.outfit.pick --params '{"kind":"season"}'` |
| 旅行穿搭 | home.outfit.pick | list | `home-cmd-read home.outfit.pick --params '{"kind":"trip-plan"}'` |
| 带物品 | home.trip.manage | receipt | `home-cmd-read home.trip.manage --params '{"mode":"pack"}'` |
| 归物品 | home.trip.manage | receipt | `home-cmd-read home.trip.manage --params '{"mode":"return"}'` |
| 查账号 | home.ticket.query | list | `home-cmd-read home.ticket.query --params '{"kind":"account"}'` |
| 存账号 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"account","op":"add"}'` |
| 改账号 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"account","op":"update"}'` |
| 看密码 | home.ticket.write | receipt | `home-cmd-read home.ticket.write --params '{"kind":"account","op":"show"}'` |
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
| 推位置 | home.location.query | list | `home-cmd-read home.location.query --params '{"mode":"suggest","category_id":"<值>"}'` |
| 找位置 | home.location.query | list | `home-cmd-read home.location.query --params '{"mode":"find","reference":"<值>"}'` |
| 管位置 | home.location.write | receipt | `home-cmd-read home.location.write --params '{"op":"manage"}'` |
| 固定位 | home.location.write | receipt | `home-cmd-read home.location.write --params '{"op":"fixed"}'` |
| 收纳建议 | home.location.query | list | `home-cmd-read home.location.query --params '{"mode":"storage"}'` |
| 空间视图 | home.location.query | list | `home-cmd-read home.location.query --params '{"mode":"space"}'` |
| 位置管理 | home.location.write | receipt | `home-cmd-read home.location.write --params '{"op":"manage"}'` |
| 整理一下家里的位置 | home.location.write | receipt | `home-cmd-read home.location.write --params '{"op":"manage"}'` |
| 位置怎么分的 | home.location.write | receipt | `home-cmd-read home.location.write --params '{"op":"manage"}'` |
| 设置固定位 | home.location.write | receipt | `home-cmd-read home.location.write --params '{"op":"fixed"}'` |
| 给我定个固定位置 | home.location.write | receipt | `home-cmd-read home.location.write --params '{"op":"fixed"}'` |
| 收纳位置建议 | home.location.query | list | `home-cmd-read home.location.query --params '{"mode":"storage"}'` |
| 帮我找个地方放 | home.location.query | list | `home-cmd-read home.location.query --params '{"mode":"storage"}'` |
| 浏览空间视图 | home.location.query | list | `home-cmd-read home.location.query --params '{"mode":"space"}'` |
| 看看家里每个地方都有啥 | home.location.query | list | `home-cmd-read home.location.query --params '{"mode":"space"}'` |
| 客厅里都有什么 | home.location.query | list | `home-cmd-read home.location.query --params '{"mode":"space"}'` |
| 统物品(HTML) | home.stats.overview | stat | `home-cmd-read home.stats.overview` |
| 统物品 | home.stats.overview | stat | `home-cmd-read home.stats.overview --params '{"kind":"summary"}'` |
| 查高频 | home.stats.overview | stat | `home-cmd-read home.stats.overview --params '{"kind":"summary"}'` |
| 盘点统计 | home.stats.overview | stat | `home-cmd-read home.stats.overview --params '{"kind":"inventory"}'` |
| 统计物品 | home.stats.overview | stat | `home-cmd-read home.stats.overview --params '{"kind":"summary"}'` |
| 物品总览 | home.stats.overview | stat | `home-cmd-read home.stats.overview --params '{"kind":"summary"}'` |
| 家里都有啥 | home.stats.overview | stat | `home-cmd-read home.stats.overview --params '{"kind":"summary"}'` |
| 给我个总数 | home.stats.overview | stat | `home-cmd-read home.stats.overview --params '{"kind":"summary"}'` |
| 一共多少件 | home.stats.overview | stat | `home-cmd-read home.stats.overview --params '{"kind":"summary"}'` |
| 整体啥情况 | home.stats.overview | stat | `home-cmd-read home.stats.overview --params '{"kind":"summary"}'` |
| 查低频 | home.stats.alert | list | `home-cmd-read home.stats.alert --params '{"kind":"idle"}'` |
| 查过期 | home.stats.alert | list | `home-cmd-read home.stats.alert --params '{"kind":"expiring"}'` |
| 查闲置 | home.stats.alert | list | `home-cmd-read home.stats.alert --params '{"kind":"idle"}'` |

相关场景：home.care.query、home.care.write、home.help.lookup、home.inventory.records、home.inventory.round、home.item.add、home.item.detail、home.item.search、home.item.update、home.location.query、home.location.write、home.outfit.pick、home.shopping.query、home.shopping.write、home.stats.alert、home.stats.overview、home.tag.query、home.tag.write、home.ticket.query、home.ticket.write、home.trip.manage（21 联动，key 字符串后续票落表时冻结）。
<!-- HELP-AUTO-END -->

## 输出位置（链路：唤醒词 → 命令 → 落盘 HTML 绝对路径）

本图链路是「唤醒词 → 命令 → **落盘 HTML 绝对路径**」：读技能的是 AI，AI 必须把路径交给用户——

- **缺省即落 HTML**（不再是「只回 JSON」）：跑一条命令，产物落一份 HTML 文件，回执里带 `delivery.path` **绝对路径**（`delivery{mode,path,bytes}` 只追加，既有字段一字不改）。**把 `delivery.path` 告诉用户**（他要点开的就是这一份），落点一律以回执为准。
- **产物落在哪**：`<库目录>/<产物目录>/`（库目录＝配置文件 `~/.ilife/home.yaml` 的 `db.dir`，空串＝数据目录；产物目录＝同文件的 `html.dir`，默认 `home_manager_html`）。HELP 与速查表落同目录（主体见上节）。
- **用户怎么点开**：把 `delivery.path` 原样给他（本地绝对路径，双击即开；链路总览页里同路径另有 `file:///` 可点链接）。
- **完成判据**：`delivery.path` 指的文件**存在**，且它的大小（字节）＝回执里的 `delivery.bytes`（两处对不上就是没做完，别把回执当完成）。
- 落地说明（#801 已落地）：数据与过程命令缺省即落 HTML（命名 `<命令中文名>_<场景 id>_<戳>.html`，70 行对照见票 2 附录；附录外组合按宿主场景归宿，见 `docs/skills/skill-home/html-delivery-chain.md` §宿主回退表）；给了 `--html <路径>` 则显式优先（只落一份、单回执指逐字路径）。HELP 三支（缺省／速查／`q`）冻结不变。

## 环境与出 scope

- 路径类取值一律读配置文件 `~/.ilife/home.yaml`（**配置文件是唯一真相，环境变量不参与配置**）：库目录＝`db.dir`（空串＝数据目录 `~/.ilife/data/`，首次读时自动建）、库文件名＝`db.name`（默认 `home.db`）、产物目录＝`html.dir`（默认 `home_manager_html`）、备份目录＝`backup.dir`（默认 `backups`，相对库目录解）、HELP 与速查表的主体名＝`files.help`／`files.lookup`。**没有照片目录这项配置**（照片是记录里的一列，不解析照片目录）。取值面与环境项见 docs/env.md。
- 出 scope：定时任务（老家零定时代码）、面板（二期单 MAP）、本技能外联动登记（combos.yaml 一律不碰，走后续票；SM9 3 场景 prompt 复制不迁）；真实数据禁迁，测试 tmp 隔离。

<!-- CALL-FORM-START -->

## 唯一出口：怎么跑

入口＝本技能包 `package.json` 里 `bin` 声明的那条：`dist/cli/cmd_read.js`。
`<技能基目录>`＝加载本技能时给出的 `Base directory for this skill: <路径>` 那一行。

1. 命令名解析得到时：`home-cmd-read <key> [--params '<json>']`。
2. 解析不到时（`not recognized`／`command not found`）＝ PATH 上没有这条命令，下面这行照样跑得起来：
   `node <技能基目录>/dist/cli/cmd_read.js <key> [--params '<json>']`
3. 本目录里没有编译产物时：`npx -p skill-home home-cmd-read <key> [--params '<json>']`（上面第 2 行就够，不必再取一份）。

换走法的信号只有一个：命令名解析不到。其余报错照 stderr 的报文原样交给用户。
<!-- CALL-FORM-END -->
