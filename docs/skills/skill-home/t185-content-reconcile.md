# t185 内容资产对账：老骨架 ↔ 新表

> 票 `#185`（第二次派单）。产出：可入库的骨架清单，供 `#188` 用；命名对照表供 `#188`／`#189` 用。
> 只读调查，未改任何源码、未 `git add`／未 commit、未动 issue。
> 数据来源（全部用脚本抽取，未整读大文件）：
> - 老骨架：`D:\2Study\StudyNotes\SKILLS\居家管家\references\scenarios.yaml`（1283 行；9 域／30 子功能／73 场景）
> - 老家旁证（只在需要时取片段）：`D:\2Study\StudyNotes\SKILLS\居家管家\SKILL.md`（801 行，含**路由表 95 行**）、`features/search.md`
> - 新表：`packages/skill-home/src/policy/wakewords.ts`（`WAKE_TABLE` 91 条／`HomeKey` 21 条／`DEPRECATED_PHRASES` 3 条）、`packages/skill-home/SKILL.md`（HELP-AUTO 区 25-120 行）、`src/help/lookup.ts`、`src/render/index.ts`、`scripts/build-help.mjs`
> - 抽取脚本：`docs/skills/skill-home/t185-extract.mjs`（`node docs/skills/skill-home/t185-extract.mjs [names|routes|join|lines]`），原始输出留在 `t185-extract.out.txt`／`t185-routes.out.txt`／`t185-join.out.txt`／`t185-lines.out.txt`／`t185-names.out.txt`。

## 零、三组计数（本席自己数出来的）＋一条关键发现

**计数**

| 口径 | 数 | 怎么数的 |
|---|---|---|
| 老场景总数 | **73** | `scenarios.yaml` 里 `- id:` 起头 73 条（`t185-extract.out.txt:170`） |
| 老场景在新表**无落点** | **3** | 只 `SM9-1`／`SM9-2`／`SM9-3`（联动总览／记到卡路里／记到记账）；其余 70 条**逐字命中**新表同名唤醒词 |
| 老场景在新表**有落点** | **70** | 其中 `SM3-4` 的 `带物品/归物品` 一个词位对两条新词，故承接掉新表 **71** 条 |
| 新表条目总数 | **91** | `WAKE_TABLE` 91 条（`wakewords.ts:21-111`）；命令 21 条（`wakewords.ts:5-15`） |
| 新表**要补进**老骨架的条目 | **20** | 91 − 71 = 20；其中 3 条是 HELP 自身词、3 条是 `(HTML)` 兼容词、14 条是功能词 |

**每个域各多少条（老骨架口径）**

| 域（老英文名） | 老中文名 | 老场景 | 子功能 | 新表承接的词 | 新表补进的词 | 该域新表词合计 |
|---|---|---|---|---|---|---|
| items | 物品管理 | 29 | 7 | 29 | 11 | 40 |
| space | 空间与位置 | 4 | 4 | 4 | 2 | 6 |
| outfit | 穿搭出行 | 5 | 4 | 6 | 0 | 6 |
| stats | 统计总览 | 4 | 1 | 4 | 3 | 7 |
| express | 快递购物 | 4 | 4 | 4 | 1 | 5 |
| receipt | 票据凭证 | 18 | 4 | 18 | 0 | 18 |
| family | 家庭协作 | 2 | 2 | 2 | 0 | 2 |
| setup | 开始使用 | 4 | 1 | 4 | 0 | 4 |
| link | 联动功能 | 3 | 3 | 0 | 0 | 0 |
| （HELP 自身，不属 9 域） | — | 0 | 0 | 0 | 3 | 3 |
| **合计** | | **73** | **30** | **71** | **20** | **91** |

**关键发现（改变了票面的口径）**：老家不只有 `scenarios.yaml` 那一份骨架——老 `SKILL.md` 的 **`## 路由表`（117-321 行）有 95 行 / 91 个不重复唤醒词**（`t185-routes.out.txt`），新表 91 条**逐字就是它**：老的 91 词 − 3 条废弃词（联动总览／记到卡路里／记到记账）＋ 3 条新词（`居家管家帮助`／`居家管家能做什么`／`改购物清单`）= 91。所以「新表多出的 20 条」里，**17 条在老家早有出处**（老路由表已载，且都带「功能」与「加载文件」两列，正好指出它们该归哪个域／子功能），**只有 3 条是真新增**：两条 HELP 别名 ＋ `改购物清单`。

## 一、老 73 条 × 新表逐条对账

**判定口径**：老 73 条的唤醒词与新表**逐字一致 71/71**（含 `SM3-4` 一个词位含 `带物品`／`归物品` 两词）——**唤醒词层面没有「改名」**；变的是「域 → 命令」的对应（新表用 21 条命令重切了老 9 域）。因此下表「落点」列写新表唤醒词与命令，判定列写 `有`／`无`。

### items（物品管理，29 条）

| 老 id | 子功能 | 老唤醒词 | 新表唤醒词 | 新表命令（shape） | 判定 |
|---|---|---|---|---|---|
| 1-1 | 录入 | 录物品 | 录物品 | `home.item.add`（receipt） | 有 |
| 1-2 | 录入 | 拍物品 | 拍物品 | `home.item.add` preset `photo=1`（receipt） | 有 |
| 1-3 | 录入 | 批量录入 | 批量录入 | `home.item.add` preset `op=batch`（receipt） | 有 |
| 1-4 | 录入 | 补录 | 补录 | `home.item.add` preset `op=backfill`（receipt） | 有 |
| 2-1 | 查找 | 查物品 | 查物品 | `home.item.search`（list） | 有 |
| 2-2 | 查找 | 看物品 | 看物品 | `home.item.detail` needs `id`（detail） | 有 |
| 2-3 | 查找 | 紧急定位 | 紧急定位 | `home.item.search` preset `locate=true`（list） | 有 |
| 2-4 | 查找 | 筛选浏览 | 筛选浏览 | `home.item.search` preset `browse=true`（list） | 有 |
| 2-5 | 查找 | 拍照找物品 | 拍照找物品 | `home.item.search` preset `photo=true`（list） | 有 |
| 2-6 | 查找 | 查重复 | 查重复 | `home.item.search` preset `dupes=true`（list） | 有 |
| 3-1 | 更新 | 改物品 | 改物品 | `home.item.update` needs `id`（receipt） | 有 |
| 3-2 | 更新 | 移物品 | 移物品 | `home.item.update` preset `op=move`（receipt） | 有 |
| 3-3 | 更新 | 数量变更 | 数量变更 | `home.item.update` preset `op=qty`（receipt） | 有 |
| 3-4 | 更新 | 状态变更 | 状态变更 | `home.item.update` preset `op=status`（receipt） | 有 |
| 3-5 | 更新 | 合并物品 | 合并物品 | `home.item.update` preset `op=merge`（receipt） | 有 |
| 3-6 | 更新 | 撤销操作 | 撤销操作 | `home.item.update` preset `op=undo`（receipt） | 有 |
| 3-7 | 更新 | 物品关联 | 物品关联 | `home.item.update` preset `op=relate`（receipt） | 有 |
| 3-8 | 更新 | 标物品 | 标物品 | `home.item.update` preset `op=tags`（receipt） | 有 |
| 4-1 | 标签与分类 | 管标签 | 管标签 | `home.tag.write` preset `op=overview`（receipt） | 有 |
| 4-2 | 标签与分类 | 管分类 | 管分类 | `home.tag.write` preset `op=category`（receipt） | 有 |
| 4-3 | 标签与分类 | 整理建议 | 整理建议 | `home.tag.write` preset `op=tidy`（receipt） | 有 |
| 5-1 | 照片档案 | 查看照片 | 查看照片 | `home.item.detail` preset `view=photos`，needs `id`（detail） | 有 |
| 5-2 | 照片档案 | 管照片 | 管照片 | `home.item.update` preset `op=photo`，needs `id`（receipt） | 有 |
| 5-3 | 照片档案 | 照片墙 | 照片墙 | `home.item.search` preset `wall=true`（list） | 有 |
| 6-1 | 盘点 | 盘点 | 盘点 | `home.inventory.round` preset `op=round`（receipt） | 有 |
| 6-2 | 盘点 | 差异处理 | 差异处理 | `home.inventory.round` preset `op=resolve`（receipt） | 有 |
| 6-3 | 盘点 | 盘点记录 | 盘点记录 | `home.inventory.records`（list） | 有 |
| 6-4 | 盘点 | 搬家盘点 | 搬家盘点 | `home.inventory.round` preset `op=move`（receipt） | 有 |
| 7-1 | 物品历史 | 历史 | 历史 | `home.item.detail` preset `view=history`，needs `id`（detail） | 有 |

### space（空间与位置，4 条）

| 老 id | 子功能 | 老唤醒词 | 新表唤醒词 | 新表命令（shape） | 判定 |
|---|---|---|---|---|---|
| SM2-1 | 位置管理 | 管位置 | 管位置 | `home.location.write` preset `op=manage`（receipt） | 有 |
| SM2-2 | 固定位 | 固定位 | 固定位 | `home.location.write` preset `op=fixed`（receipt） | 有 |
| SM2-3 | 收纳建议 | 收纳建议 | 收纳建议 | `home.location.query` preset `mode=storage`（list） | 有 |
| SM2-4 | 空间视图 | 空间视图 | 空间视图 | `home.location.query` preset `mode=space`（list） | 有 |

### outfit（穿搭出行，5 条／6 词）

| 老 id | 子功能 | 老唤醒词 | 新表唤醒词 | 新表命令（shape） | 判定 |
|---|---|---|---|---|---|
| SM3-1 | 穿搭推荐 | 穿什么 | 穿什么 | `home.outfit.pick`（list） | 有 |
| SM3-2 | 衣橱管理 | 衣橱分析 | 衣橱分析 | `home.outfit.pick` preset `kind=wardrobe`（list） | 有 |
| SM3-3 | 衣橱管理 | 换季 | 换季 | `home.outfit.pick` preset `kind=season`（list） | 有 |
| SM3-4 | 出行清单 | 带物品/归物品 | 带物品／归物品 | `home.trip.manage` preset `mode=pack`／`mode=return`（receipt） | 有（一词位对两词） |
| SM3-5 | 旅行穿搭计划 | 旅行穿搭 | 旅行穿搭 | `home.outfit.pick` preset `kind=trip-plan`（list） | 有 |

### stats（统计总览，4 条）

| 老 id | 子功能 | 老唤醒词 | 新表唤醒词 | 新表命令（shape） | 判定 |
|---|---|---|---|---|---|
| SM4-1 | 统计总览 | 统物品 | 统物品 | `home.stats.overview` preset `kind=summary`（stat） | 有 |
| SM4-2 | 统计总览 | 查闲置 | 查闲置 | `home.stats.alert` preset `kind=idle`（list） | 有 |
| SM4-3 | 统计总览 | 查过期 | 查过期 | `home.stats.alert` preset `kind=expiring`（list） | 有 |
| SM4-4 | 统计总览 | 盘点统计 | 盘点统计 | `home.stats.overview` preset `kind=inventory`（stat） | 有 |

### express（快递购物，4 条）

| 老 id | 子功能 | 老唤醒词 | 新表唤醒词 | 新表命令（shape） | 判定 |
|---|---|---|---|---|---|
| SM5-1 | 购物清单 | 购物清单 | 购物清单 | `home.shopping.query` preset `kind=list`（list） | 有 |
| SM5-2 | 缺货检测 | 缺货检测 | 缺货检测 | `home.shopping.query` preset `kind=missing`（list） | 有 |
| SM5-3 | 快递跟踪 | 查快递 | 查快递 | `home.shopping.query` preset `kind=express`（list） | 有 |
| SM5-4 | 囤货盘点 | 囤货盘点 | 囤货盘点 | `home.shopping.query` preset `kind=stock`（list） | 有 |

### family（家庭协作，2 条）

| 老 id | 子功能 | 老唤醒词 | 新表唤醒词 | 新表命令（shape） | 判定 |
|---|---|---|---|---|---|
| SM7-1 | 借用管理 | 借用 | 借用 | `home.care.query` preset `kind=borrow`（list） | 有（命令换名 `family`→`care`） |
| SM7-2 | 家人档案 | 家人档案 | 家人档案 | `home.care.query` preset `kind=member`（list） | 有（命令换名 `family`→`care`） |

### setup（开始使用，4 条）

| 老 id | 子功能 | 老唤醒词 | 新表唤醒词 | 新表命令（shape） | 判定 |
|---|---|---|---|---|---|
| SM8-1 | 开始使用 | 首次使用 | 首次使用 | `home.care.write` preset `kind=init`（receipt） | 有（命令换名 `开始使用`→`care`） |
| SM8-2 | 开始使用 | 查异常 | 查异常 | `home.care.query` preset `kind=lint`（list） | 有（同上） |
| SM8-3 | 开始使用 | 备份导出 | 备份导出 | `home.care.write` preset `kind=backup`（receipt） | 有（同上） |
| SM8-4 | 开始使用 | 导入恢复 | 导入恢复 | `home.care.write` preset `kind=import`（receipt） | 有（同上） |

### receipt（票据凭证，18 条）

| 老 id | 子功能 | 老唤醒词 | 新表唤醒词 | 新表命令（shape） | 判定 |
|---|---|---|---|---|---|
| SM6-1 | 购买记录 | 查购买记录 | 查购买记录 | `home.ticket.query` preset `kind=purchase`（list） | 有 |
| SM6-2 | 购买记录 | 查上月购买 | 查上月购买 | `home.ticket.query` preset `kind=purchase,range=last-month`（list） | 有 |
| SM6-3 | 购买记录 | 查今年花费 | 查今年花费 | `home.ticket.query` preset `kind=purchase,range=year`（list） | 有 |
| SM6-4 | 购买记录 | 查退货窗口 | 查退货窗口 | `home.ticket.query` preset `kind=purchase,range=return`（list） | 有 |
| SM6-5 | 购买记录 | 登记购买记录 | 登记购买记录 | `home.ticket.write` preset `kind=purchase,op=add`（receipt） | 有 |
| SM6-6 | 保修与保养 | 查保修状态 | 查保修状态 | `home.ticket.query` preset `kind=warranty`（list） | 有 |
| SM6-7 | 保修与保养 | 登记保修 | 登记保修 | `home.ticket.write` preset `kind=warranty,op=register`（receipt） | 有 |
| SM6-8 | 保修与保养 | 记录维修 | 记录维修 | `home.ticket.write` preset `kind=warranty,op=repair`（receipt） | 有 |
| SM6-9 | 保修与保养 | 设置保养周期 | 设置保养周期 | `home.ticket.write` preset `kind=warranty,op=cycle`（receipt） | 有 |
| SM6-10 | 保修与保养 | 执行保养 | 执行保养 | `home.ticket.write` preset `kind=warranty,op=maintain`（receipt） | 有 |
| SM6-11 | 证件管理 | 查证件到期 | 查证件到期 | `home.ticket.query` preset `kind=cert`（list） | 有 |
| SM6-12 | 证件管理 | 登记证件 | 登记证件 | `home.ticket.write` preset `kind=cert,op=add`（receipt） | 有 |
| SM6-13 | 证件管理 | 证件归档 | 证件归档 | `home.ticket.write` preset `kind=cert,op=archive`（receipt） | 有 |
| SM6-14 | 证件管理 | 更新证件 | 更新证件 | `home.ticket.write` preset `kind=cert,op=update`（receipt） | 有 |
| SM6-15 | 账号密码 | 查账号 | 查账号 | `home.ticket.query` preset `kind=account`（list） | 有 |
| SM6-16 | 账号密码 | 存账号 | 存账号 | `home.ticket.write` preset `kind=account,op=add`（receipt） | 有 |
| SM6-17 | 账号密码 | 改账号 | 改账号 | `home.ticket.write` preset `kind=account,op=update`（receipt） | 有 |
| SM6-18 | 账号密码 | 看密码 | 看密码 | `home.ticket.write` preset `kind=account,op=show`（receipt） | 有 |

### link（联动功能，3 条）→ 全部无落点

| 老 id | 子功能 | 老唤醒词 | 新表唤醒词 | 新表命令 | 判定 |
|---|---|---|---|---|---|
| SM9-1 | 联动总览 | 联动总览 | 无 | 无（在 `DEPRECATED_PHRASES`，不路由） | **无** |
| SM9-2 | 食品联动 | 记到卡路里 | 无 | 无（同上） | **无** |
| SM9-3 | 价格联动 | 记到记账 | 无 | 无（同上） | **无** |

## 二、新表多出的 20 条 → 归入哪个域／子功能

20 条 = 91（新表）− 71（承接老场景）。其中 **17 条老家早有出处**（老 `SKILL.md` 路由表已登记，行号＝`121 + 表内序号`），**3 条真新增**。落法分三类：`并入现有场景`（挂在该场景上，不新增场景）、`新增场景`（老家无场景，要新写 prompt／标题）、`不算场景`（HELP 自身，不属 9 域）。

### 2A. 17 条老家已载（照老路由表的功能列与加载文件列归域）

| 序 | 新表唤醒词 | 新表命令（preset） | 老家出处 | 归入域 | 归入子功能 | 落法 |
|---|---|---|---|---|---|---|
| 1 | 补物品 | `home.item.update` `op=qty` | 老路由表 #8（行 129）「数量增加」→ `features/update.md → 数量变更` | items | 更新 | 并入现有场景：老 `3-3 数量变更`（`scenarios.yaml:275`） |
| 2 | 减物品 | `home.item.update` `op=qty` | #9（行 130）「数量减少」→ 同上 | items | 更新 | 并入：`3-3 数量变更` |
| 3 | 废物品 | `home.item.update` `op=status` | #11（行 132）「标记废弃」→ `features/update.md → 状态变更` | items | 更新 | 并入：老 `3-4 状态变更`（`:291`） |
| 4 | 借物品 | `home.item.update` `op=status` | #12（行 133）「标记借出」→ 同上 | items | 更新 | 并入：`3-4 状态变更` |
| 5 | 修物品 | `home.item.update` `op=status` | #13（行 134）「标记维修」→ 同上 | items | 更新 | 并入：`3-4 状态变更` |
| 6 | 盘物品 | `home.inventory.round` `op=round` | #14（行 135）「按位置盘点」→ `features/inventory.md` | items | 盘点 | 并入：老 `6-1 盘点`（`:465`） |
| 7 | 盘全部 | `home.inventory.round` `op=round,scope=all` | #15（行 136）「全屋盘点」→ 同上 | items | 盘点 | 并入：老 `6-1 盘点` |
| 8 | 查高频 | `home.stats.overview` `kind=summary` | #20（行 141）「并入物品总览」＋老 CLI 映射（`:119`）「T5 裁决：并入物品总览高频 TOP 区块」 | stats | 统计总览 | 并入：老 `SM4-1 统物品`（`:721`）；新 preset `kind=summary` 与老裁决一致 |
| 9 | 查低频 | `home.stats.alert` `kind=idle` | #21（行 142）「并入闲置检测」＋老 CLI 映射（`:120`）「T5 裁决：语义由查闲置承接」 | stats | 统计总览 | 并入：老 `SM4-2 查闲置`（`:749`）；新 preset `kind=idle` 与老裁决一致 |
| 10 | 看标签 | `home.tag.query` | #23（行 144）「列出标签」→ `features/tags.md → 列表` | items | 标签与分类 | 新增场景（读侧）：老 `4-1 管标签`（`:370`）的 prompt 把「查看」放在操作菜单里，无独立读侧场景；新表拆出 `home.tag.query` |
| 11 | 合标签 | `home.tag.write` `op=merge` | #24（行 145）「合并标签」→ `features/tags.md → 合并` | items | 标签与分类 | 并入：老 `4-1 管标签`（`:370`，其菜单含「合并」）；但要给 HELP 单独一行词条 |
| 12 | 推位置 | `home.location.query` `mode=suggest` | #26（行 147）「位置推荐」→ `features/add.md → Step 2.5` | space | 位置管理 | 并入现有场景（待裁）：见第七节 **U1** —— 老家把它记作**录入流程的子步骤**，无独立场景／模板 |
| 13 | 找位置 | `home.location.query` `mode=find` | #27（行 148）「参考锚定」→ `features/add.md → Step 2.6` | space | 位置管理 | 并入现有场景（待裁）：同 **U1** |
| 14 | 查物品(HTML) | `home.item.search` | #33（行 154）「物品搜索(默认输出 HTML)」 | items | 查找 | 不算独立场景：与 `2-1 查物品` 同命令同 shape，是兼容别名 → 见第三节 |
| 15 | 看物品(HTML) | `home.item.detail` needs `id` | #34（行 155）「物品详情(默认输出 HTML)」 | items | 查找 | 同上（对 `2-2 看物品`） |
| 16 | 统物品(HTML) | `home.stats.overview` | #35（行 156）「总体统计(默认输出 HTML)」 | stats | 统计总览 | 同上（对 `SM4-1 统物品`） |
| 17 | 居家管家 帮助 | `home.help.lookup` | #1（行 122）「技能速查（HELP）」 | —（HELP 自身） | — | 不算场景：HELP 自身入口，骨架里只记一条 `help` 记录 |

### 2B. 3 条真新增（老路由表也没有）

| 序 | 新表唤醒词 | 新表命令（preset） | 依据 | 归入域 | 归入子功能 | 落法 |
|---|---|---|---|---|---|---|
| 18 | 居家管家帮助 | `home.help.lookup` | 新表 `wakewords.ts:22`；老路由表只有带空格的 `居家管家 帮助`（#1） | —（HELP 自身） | — | 不算场景：HELP 入口的同义别名（少空格） |
| 19 | 居家管家能做什么 | `home.help.lookup` | 新表 `wakewords.ts:23`；老家无此词 | —（HELP 自身） | — | 不算场景：同上 |
| 20 | 改购物清单 | `home.shopping.write` `op=check` | 新仓 `packages/skill-home/SKILL.md:18` 口径行明写「购物改新增"改购物清单"（老家无直接词，补齐写链）」；老 `SM5-1` 的 `result`（`scenarios.yaml:804`）已含「采购闭环(销项/录入/补数量)」 | express | 购物清单 | 并入：老 `SM5-1 购物清单`（`:794`）的「采购闭环·销项」那一块，作为该场景的写侧词 |

**归域汇总（20 条）**：items 11（序 1-7、10、11、14、15）／space 2（12、13）／stats 3（8、9、16）／express 1（20）／HELP 自身 3（17、18、19）；outfit／receipt／family／setup／link 各 0。

## 三、3 条带 `(HTML)` 的唤醒词：进不进 HELP

**判断：不进 HELP 的用户可见唤醒词清单；改在 HELP 的「口径」块写一行说明。**

**理由（四条，都有仓内／老家出处）**

1. 老家自己就立规不要它们：`D:\2Study\StudyNotes\SKILLS\居家管家\features\search.md:71` = 「`查物品 / 看物品 / 统物品` 一律默认输出 HTML 页面；**不保留 `-html` 后缀唤醒词**」，`:102` = 「**不新增 `-html` 后缀唤醒词**；如需 JSON 数据，用 `*_items_json` 等辅助函数」。老路由表第 33-35 行（老 `SKILL.md:154-156`）留着它们，只是写着「(默认输出 HTML)」的兼容备注。
2. 在新表里它们**没有独立信息量**：3 条的 key 与不带后缀的同名条目完全相同（`home.item.search`／`home.item.detail`／`home.stats.overview`），HELP-AUTO 表里连 `shape` 与「例」列都逐字相同（`packages/skill-home/SKILL.md:30-32` 对 `:33-34`、`:50`）。用户不会说带括号的词，列进 HELP 等于教出假唤醒词。
3. 它们要保留的只是**路由兼容**：`packages/skill-home/test/policy.test.mjs:31` 钉住 `routeWakeword('查物品(HTML)看看')` → `home.item.search`。钉的是路由行为，不是 HELP 展示，所以「留在 `WAKE_TABLE`、从 HELP 展示里排除」两者不冲突。
4. 老家要表达的那件事（HTML 是默认产物）在新架构里已有更强的载体：HELP 交付本身就是 HTML（票 6），且新表 HELP-AUTO 有 `shape` 列（`list`／`detail`／`stat`）。

**进了写在哪（给票 4／票 6 的落点）**

- HELP 正文：「口径」块一行——「查物品／看物品／统物品 默认输出 HTML（老别名 `查物品(HTML)` 等仅为兼容路由，无需照说）」；唤醒词清单不出现这 3 条。
- 实现落点两处（今天都是「全量映射」，要支持排除名单）：`packages/skill-home/src/help/lookup.ts:43-51` 的 `buildHelpLookup()`（速查支，`home.help.lookup` 现找也走它）、`packages/skill-home/scripts/build-help.mjs:16`（SKILL.md 注入块）。
- 顺带一条口径，供票 4 一并裁：`src/help/lookup.ts:19-40` 的 `DESCS` 是按命令一句话（21 条），HELP 文件要按 9 域／30 子功能分组的**场景目录**，两者数据结构不同——见第六节骨架清单。

## 四、老家有、新表没有的 3 条（link 域）怎么落

**对象**：`SM9-1 联动总览`（`scenarios.yaml:950`）／`SM9-2 记到卡路里`（`:965`）／`SM9-3 记到记账`（`:981`）；老模板 `联动/link_overview.html`／`link_food.html`／`link_price.html`。

**新仓今天的态度（两道口子已经写死）**：

- `packages/skill-home/src/policy/wakewords.ts:114-115`：`DEPRECATED_PHRASES = ['联动总览', '记到卡路里', '记到记账']`，注释就是「本技能不路由；combos 登记走后续票」；`:123` 的路由失败文案里也写「（联动 3 词走后续票）」。
- `packages/skill-home/SKILL.md:19`：废弃词（联动 3 词）不路由，combos 登记走后续票。
- `packages/skill-home/SKILL.md:125`（出 scope）：**「本技能外联动登记（`combos.yaml` 一律不碰，走后续票；SM9 3 场景 **prompt 复制不迁**）」**。

**落法（建议，可直接入库）**：

1. **内容资产里留登记位，不丢内容**：骨架 JSON 里保留 `link` 域 3 个子功能／3 个场景，字段齐（老 id／唤醒词／标题），另加 `status: "deprecated"` 与 `prompt_source: null`；`scenes_total` 仍报 73（70 在位 ＋ 3 废弃），这样「老骨架 73 条」这个数在骨架里可自证，与 `DEPRECATED_PHRASES` 双向对账（`#188` 要在位／有落计数）。
2. **prompt 不迁**：照 `SKILL.md:125` 的现成口径，3 场景的 `prompt` 不搬（`prompt_source: null`，`note: "prompt 复制不迁，见 SKILL.md:125"`）。
3. **HELP 的唤醒词清单不列这 3 条**，HELP 正文只在「口径」块照抄 `SKILL.md:19` 那一句（联动 3 词本版不路由，combos 登记走后续票）。理由：HELP 的用途是告诉用户「能说什么」，列一条命中即 `POLICY_NO_MATCH` 的词＝教会用户踩 fail mode；而「老骨架为准」约束的是**内容不丢**，不是必须把它显示成可用词。
4. **域目录不建**：`#188` 落 typed const 时，`link` 域不出能力目录（无路由、无命令），3 条与 3 个 `HomeKey` 之外的内容一起进「废弃清单」；后续 combos 票回来再决定恢复路由或删除。这条如果用户不同意（比如要求「老骨架 9 域一个不落地建目录」），改的是第 4 点，前 3 点不受影响。

## 五、中英名对照表

**两条口径先写在前面**

1. **域级 9 个英文名以老骨架为准**（票面已钉：`scenarios.yaml` 的 `domains[].key`），中文名取同一块的 `name`。新表另有**一套 11 个 key 前缀**（`item`／`tag`／`inventory`／`location`／`outfit`／`trip`／`stats`／`shopping`／`ticket`／`care`／`help`），两套不是一一对应：`space→location`、`express→shopping`、`receipt→ticket`、`family+setup→care`（一条 `care` 横跨两域）、`items` 域内部还分了 `tag`／`inventory`、`outfit` 域内部还分了 `trip`。**票 6 的能力目录名取老骨架那 9 个**，新表前缀只作命令落点用；四处不一致逐条写在「依据」列，避免实施时按新表前缀建目录。
2. **子功能级 30 个英文名取自老骨架自身的英文字段**（`scenario_id` 与 `html.template` 的文件名，两处互相印证），不新造词；大小写照仓内新件先例（`docs/skills/skill-calorie/t179-180-structure-design.md` 第一节的 `docPage.ts`：多词 camelCase），下面「英文名」列直接给可当文件名的形式，原词形写在「依据」列。

### 5A. 域级（9 个）

| HELP 说法 | 英文名 | 依据（仓内既有说法的出处） |
|---|---|---|
| 物品管理 | `items` | 老骨架 `references/scenarios.yaml:3-6`（`key: items` ＋ `name: 物品管理`）；新仓近说法 `home.item.*`／`home.tag.*`／`home.inventory.*`（`wakewords.ts:5-9`）、`src/policy/item.ts`、`templates/item_*.html` |
| 空间与位置 | `space` | 老骨架 `:7-10`（`key: space`／`name: 空间与位置`）；新仓近说法 `home.location.*`（`wakewords.ts:9`）、`templates/location_*.html`——新仓用 `location`，目录名仍取老骨架 `space` |
| 穿搭出行 | `outfit` | 老骨架 `:11-14`；新仓 `home.outfit.pick`（`:41`）＋`home.trip.manage`（`:42-43`）、`templates/outfit_pick.html`／`trip_receipt.html`——「出行」在新仓另起 `trip` 前缀 |
| 统计总览 | `stats` | 老骨架 `:15-18`；新仓 `home.stats.overview`／`home.stats.alert`（`:11-12`）、`templates/stats_overview.html`／`stats_alert.html` |
| 快递购物 | `express` | 老骨架 `:19-22`；新仓 `home.shopping.query`／`home.shopping.write`（`:12`）、`templates/shopping_*.html`——新仓用 `shopping`，目录名仍取老骨架 `express`（`templates/` 老目录名也是 `快递购物`） |
| 票据凭证 | `receipt` | 老骨架 `:23-26`；新仓 `home.ticket.query`／`home.ticket.write`（`:13`）、`src/policy/ticket.ts`、`templates/ticket_*.html`——新仓用 `ticket` |
| 家庭协作 | `family` | 老骨架 `:27-30`；新仓只有 `home.care.query` 的 `kind=borrow`／`kind=member`（`:58-59`）——新仓用 `care`，且 `care` 同时装「开始使用」域的词（见下一行） |
| 开始使用 | `setup` | 老骨架 `:31-34`；新仓 `home.care.write` `kind=init/backup/import` 与 `home.care.query` `kind=lint`（`:63`、`:66-68`）——新仓用 `care`，与「家庭协作」共用一个前缀 |
| 联动功能 | `link` | 老骨架 `:35-38`；新仓无命令，3 词在 `DEPRECATED_PHRASES`（`wakewords.ts:114-115`）——见第四节 |

### 5B. 子功能级（30 个）

| HELP 说法 | 英文名 | 依据（仓内既有说法的出处） |
|---|---|---|
| 录入 | `add` | 老骨架 `scenario_id` `add_text`／`add_photo`／`add_batch`／`add_backfill`（`:40,70,90,106`）；新仓 `home.item.add`（`wakewords.ts:29`） |
| 查找 | `search` | 老骨架 `search_default`（`:123`）；新仓 `home.item.search`（`wakewords.ts:27`） |
| 更新 | `update` | 老骨架 `update_generic`（`:244`）；新仓 `home.item.update`（`wakewords.ts:31`） |
| 标签与分类 | `tag` | 新仓 `home.tag.query`／`home.tag.write`（`wakewords.ts:48-49`）；老骨架 `tag_manage`／`category_manage`／`tag_tidy_suggest`（`:370,386,402`）、老 `features/tags.md`（旧说法是复数 tags） |
| 照片档案 | `photo` | 新仓 preset `view=photos`／`op=photo`／`wall=true`（`wakewords.ts:81-83`）；老骨架 `photo_view`／`photo_manage`／`photo_wall`（`:417,433,449`） |
| 盘点 | `inventory` | 老骨架 `inventory_spot`／`inventory_diff`／`inventory_records`／`inventory_move_house`（`:465,493,508,523`）＋老 `features/inventory.md`；新仓 `home.inventory.round`／`home.inventory.records`（`wakewords.ts:39-40,84`） |
| 物品历史 | `history` | 老骨架 `item_history`（`:538`）；新仓 preset `view=history`（`wakewords.ts:87`） |
| 位置管理 | `locationManage` | 老骨架 `location_manage`（`:553`）＋老模板 `位置/location_manage.html`；新仓 preset `op=manage`（`wakewords.ts:60`） |
| 固定位 | `fixedSpot` | 老骨架 `fixed_spot`（`:576`）＋老模板 `位置/fixed_spot.html`；新仓 preset `op=fixed`（`wakewords.ts:61`） |
| 收纳建议 | `suggestStorage` | 老骨架 `suggest_storage`（`:599`）＋老模板 `位置/suggest_storage.html`；新仓 preset `mode=storage`（`wakewords.ts:62`） |
| 空间视图 | `spaceView` | 老骨架 `space_view`（`:621`）＋老模板 `位置/space_view.html`；新仓 preset `mode=space`（`wakewords.ts:63`） |
| 穿搭推荐 | `outfitPick` | 老骨架 `outfit_pick`（`:643`）＋老模板 `穿搭/outfit_picker.html`；新仓 `home.outfit.pick`（`wakewords.ts:41`） |
| 衣橱管理 | `wardrobe` | 老骨架 `wardrobe_analyze`／`wardrobe_season`（`:659,674`）；新仓 preset `kind=wardrobe`／`kind=season`（`wakewords.ts:108-109`） |
| 出行清单 | `tripPack` | 老骨架 `trip_pack`（`:690`）＋老模板 `穿搭/travel_trip.html`；新仓 `home.trip.manage` preset `mode=pack`／`mode=return`（`wakewords.ts:42-43`） |
| 旅行穿搭计划 | `tripOutfitPlan` | 老骨架 `trip_outfit_plan`（`:706`）＋老模板 `穿搭/trip_outfit_plan.html`；新仓 preset `kind=trip-plan`（`wakewords.ts:110`） |
| 统计总览 | `overview` | 老骨架 `stats_summary`（`:721`）＋老模板 `stats/overview.html`；新仓 `home.stats.overview`（`wakewords.ts:44`）、`templates/stats_overview.html`（注：新仓另有 `home.stats.alert` 也落在老这一个子功能下，见第七节 **U2**） |
| 购物清单 | `shoppingList` | 老骨架 `shopping_list`（`:794`）＋老模板 `快递购物/list.html`；新仓 preset `kind=list`（`wakewords.ts:91`）＋`home.shopping.write` `op=check`（`:111`） |
| 缺货检测 | `shoppingMissing` | 老骨架 `shopping_missing`（`:809`）＋老模板 `快递购物/missing.html`；新仓 preset `kind=missing`（`wakewords.ts:92`） |
| 快递跟踪 | `searchExpress` | 老骨架 `search_express`（`:824`）＋老模板 `快递购物/express.html`；新仓 preset `kind=express`（`wakewords.ts:50`） |
| 囤货盘点 | `stockCheck` | 老骨架 `stock_check`（`:839`）＋老模板 `快递购物/stock.html`；新仓 preset `kind=stock`（`wakewords.ts:93`） |
| 购买记录 | `purchase` | 老骨架 `purchase_*` 5 条（`:997,1013,1028,1043,1058`）＋老模板 `票据凭证/purchase_records.html`；新仓 preset `kind=purchase`（`wakewords.ts:94`） |
| 保修与保养 | `warranty` | 老骨架 `warranty_*` 5 条（`:1075,1090,1106,1122,1138`）＋老模板 `票据凭证/warranty.html`；新仓 preset `kind=warranty`（`wakewords.ts:99`） |
| 证件管理 | `cert` | 老骨架 `cert_*` 4 条（`:1154,1169,1186,1202`）＋老模板 `票据凭证/certificates.html`；新仓 preset `kind=cert`（`wakewords.ts:104`） |
| 账号密码 | `account` | 老骨架 `account_*` 4 条（`:1219,1234,1251,1268`）＋老模板 `票据凭证/accounts.html`；新仓 preset `kind=account`（`wakewords.ts:53`） |
| 借用管理 | `borrow` | 老骨架 `borrow_manage`（`:854`）＋老模板 `family_borrow.html`；新仓 preset `kind=borrow`（`wakewords.ts:58`） |
| 家人档案 | `member` | 老骨架 `family_members`（`:870`）＋老模板 `family_members.html`；新仓 preset `kind=member`（`wakewords.ts:59`） |
| 开始使用 | `firstUse` | 老骨架 `first_use`（`:886`）＋老模板 `开始使用/first_use_wizard.html`；新仓 `home.care.write` preset `kind=init`（`wakewords.ts:66`）——老这一个子功能含 4 场景，新仓落到 `home.care.write`＋`home.care.query` 两条命令 |
| 联动总览 | `linkOverview` | 老骨架 `link_overview`（`:950`）＋老模板 `联动/link_overview.html`；新仓无命令（`DEPRECATED_PHRASES`） |
| 食品联动 | `linkCalorie` | 老骨架 `link_calorie`（`:965`）＋老模板 `联动/link_food.html`；新仓无命令 |
| 价格联动 | `linkAccounting` | 老骨架 `link_accounting`（`:981`）＋老模板 `联动/link_price.html`；新仓无命令 |

> 说明：上表 30 行与老骨架 `sub` 字段一一对应（本席按 `domain/sub` 去重数出的 30 个，见 `t185-extract.out.txt:172-181`）；`scenario_id` 与老模板文件名不一致的三处（`food` vs `calorie`、`price` vs `accounting`、`outfit_picker` vs `outfit_pick`）以 `scenario_id` 为准，模板名另记在第六节骨架的 `old_template` 字段。

## 六、机器可读骨架清单草案（供 `#188`）

**形状**：9 域 → 30 子功能 → 73 场景；每个场景带 `id`／`wake`／`title`／`prompt_source`／`origin`／`old_template`／`cli`；新表补进的 17 条挂在承接场景的 `extra_wake` 里（带自己的 `cli` 与 `in_help`）；3 条 `(HTML)` 的 `in_help` 为 `false`；3 条 HELP 词单列 `help_only`；link 域 3 条 `status: "deprecated"` 且 `prompt_source: null`。

**字段口径**

- `wake`：老唤醒词（多词用数组，`SM3-4` 是 `["带物品","归物品"]`）。
- `prompt_source`：`old_yaml:<scenarios.yaml 行号>#prompt`（行号＝该场景 `- id:` 那一行；73 条的行号见 `t185-lines.out.txt`）。**只有老 yaml 有 prompt**；新表补进的功能词不自带 prompt，随承接场景走。
- `origin`：`old_yaml`（老骨架）／`new_table`（新表补进）。
- `old_template`：老骨架 `html.template`，供 `#186`／`#189` 对齐模板契约用（新仓 `templates/<key>.html` 与老模板不是一对一）。
- `extra_wake[].cli`：新表该词的完整既有命令（含 preset，形如 `home-cmd-read home.item.update --params '{"op":"qty","id":1}'`）。
- `status`／`deprecated`：见第四节。

**同一份内容另有文件**：`docs/skills/skill-home/t185-skeleton.json`（本席用脚本生成，已 `JSON.parse` 校验通过；生成命令 `node docs/skills/skill-home/t185-extract.mjs skeleton`）。下面是同一份内容的副本：

```json
{
  "schema": "skill-home/scene-skeleton@1",
  "for_ticket": "#188",
  "sources": {"old":"D:/2Study/StudyNotes/SKILLS/居家管家/references/scenarios.yaml","new":"packages/skill-home/src/policy/wakewords.ts（WAKE_TABLE 91 词／HomeKey 21 命令／DEPRECATED_PHRASES 3 词）","help_auto":"packages/skill-home/SKILL.md:24-120","reconcile":"docs/skills/skill-home/t185-content-reconcile.md"},
  "counts": {"domains":9,"subs":30,"scenes":73,"scenes_with_landing":70,"scenes_deprecated":3,"new_entries":91,"new_carried":71,"new_compensated":20},
  "help_only": [
    {"phrase":"居家管家 帮助","key":"home.help.lookup","in_help":true,"note":"HELP 自身入口，不属 9 域场景"},
    {"phrase":"居家管家帮助","key":"home.help.lookup","in_help":true,"note":"HELP 自身入口，不属 9 域场景"},
    {"phrase":"居家管家能做什么","key":"home.help.lookup","in_help":true,"note":"HELP 自身入口，不属 9 域场景"}
  ],
  "deprecated": [
    {"phrase":"联动总览","key":null,"in_help":false,"old_scene":"SM9-1","note":"不路由；prompt 复制不迁（SKILL.md:125）；combos 登记走后续票"},
    {"phrase":"记到卡路里","key":null,"in_help":false,"old_scene":"SM9-2","note":"不路由；prompt 复制不迁（SKILL.md:125）；combos 登记走后续票"},
    {"phrase":"记到记账","key":null,"in_help":false,"old_scene":"SM9-3","note":"不路由；prompt 复制不迁（SKILL.md:125）；combos 登记走后续票"}
  ],
  "domains": [
    { "key": "items", "name_cn": "物品管理", "subs": [
      { "sub_cn": "录入", "name": "add", "scenes": [
        { "id": "1-1", "wake": ["录物品"], "title": "录入一件新物品", "prompt_source": "old_yaml:40#prompt", "origin": "old_yaml", "old_template": "物品/add_form.html", "cli": "home-cmd-read home.item.add" },
        { "id": "1-2", "wake": ["拍物品"], "title": "拍照识别录入物品", "prompt_source": "old_yaml:70#prompt", "origin": "old_yaml", "old_template": "物品/add_form.html", "cli": "home-cmd-read home.item.add --params '{\"photo\":\"1\"}'" },
        { "id": "1-3", "wake": ["批量录入"], "title": "批量录入多件物品", "prompt_source": "old_yaml:90#prompt", "origin": "old_yaml", "old_template": "物品/add_form.html", "cli": "home-cmd-read home.item.add --params '{\"op\":\"batch\"}'" },
        { "id": "1-4", "wake": ["补录"], "title": "补录历史物品(指定日期)", "prompt_source": "old_yaml:106#prompt", "origin": "old_yaml", "old_template": "物品/add_form.html", "cli": "home-cmd-read home.item.add --params '{\"op\":\"backfill\"}'" }
      ] },
      { "sub_cn": "查找", "name": "search", "scenes": [
        { "id": "2-1", "wake": ["查物品"], "title": "搜索查找物品", "prompt_source": "old_yaml:123#prompt", "origin": "old_yaml", "old_template": "物品/search_list.html", "cli": "home-cmd-read home.item.search", "extra_wake": [{"phrase":"查物品(HTML)","key":"home.item.search","cli":"home-cmd-read home.item.search","in_help":false,"origin":"new_table","note":"兼容别名，不进 HELP"}] },
        { "id": "2-2", "wake": ["看物品"], "title": "查看物品详情", "prompt_source": "old_yaml:151#prompt", "origin": "old_yaml", "old_template": "物品/detail.html", "cli": "home-cmd-read home.item.detail --params '{\"id\":1}'", "extra_wake": [{"phrase":"看物品(HTML)","key":"home.item.detail","cli":"home-cmd-read home.item.detail --params '{\"id\":1}'","in_help":false,"origin":"new_table","note":"兼容别名，不进 HELP"}] },
        { "id": "2-3", "wake": ["紧急定位"], "title": "紧急查找物品位置", "prompt_source": "old_yaml:179#prompt", "origin": "old_yaml", "old_template": "物品/locate.html", "cli": "home-cmd-read home.item.search --params '{\"locate\":true}'" },
        { "id": "2-4", "wake": ["筛选浏览"], "title": "按条件筛选浏览物品", "prompt_source": "old_yaml:194#prompt", "origin": "old_yaml", "old_template": "物品/browse.html", "cli": "home-cmd-read home.item.search --params '{\"browse\":true}'" },
        { "id": "2-5", "wake": ["拍照找物品"], "title": "拍照反向查找物品", "prompt_source": "old_yaml:211#prompt", "origin": "old_yaml", "old_template": "物品/search_list.html", "cli": "home-cmd-read home.item.search --params '{\"photo\":true}'" },
        { "id": "2-6", "wake": ["查重复"], "title": "检查重复物品", "prompt_source": "old_yaml:229#prompt", "origin": "old_yaml", "old_template": "物品/duplicates.html", "cli": "home-cmd-read home.item.search --params '{\"dupes\":true}'" }
      ] },
      { "sub_cn": "更新", "name": "update", "scenes": [
        { "id": "3-1", "wake": ["改物品"], "title": "修改物品信息", "prompt_source": "old_yaml:244#prompt", "origin": "old_yaml", "old_template": "物品/add_form.html", "cli": "home-cmd-read home.item.update --params '{\"id\":1}'" },
        { "id": "3-2", "wake": ["移物品"], "title": "移动物品位置", "prompt_source": "old_yaml:259#prompt", "origin": "old_yaml", "old_template": "物品/receipt.html", "cli": "home-cmd-read home.item.update --params '{\"op\":\"move\",\"id\":1}'" },
        { "id": "3-3", "wake": ["数量变更"], "title": "变更物品数量", "prompt_source": "old_yaml:275#prompt", "origin": "old_yaml", "old_template": "物品/receipt.html", "cli": "home-cmd-read home.item.update --params '{\"op\":\"qty\",\"id\":1}'", "extra_wake": [{"phrase":"补物品","key":"home.item.update","cli":"home-cmd-read home.item.update --params '{\"op\":\"qty\",\"id\":1}'","in_help":true,"origin":"new_table"},{"phrase":"减物品","key":"home.item.update","cli":"home-cmd-read home.item.update --params '{\"op\":\"qty\",\"id\":1}'","in_help":true,"origin":"new_table"}] },
        { "id": "3-4", "wake": ["状态变更"], "title": "变更物品状态", "prompt_source": "old_yaml:291#prompt", "origin": "old_yaml", "old_template": "物品/receipt.html", "cli": "home-cmd-read home.item.update --params '{\"op\":\"status\",\"id\":1}'", "extra_wake": [{"phrase":"废物品","key":"home.item.update","cli":"home-cmd-read home.item.update --params '{\"op\":\"status\",\"id\":1}'","in_help":true,"origin":"new_table"},{"phrase":"借物品","key":"home.item.update","cli":"home-cmd-read home.item.update --params '{\"op\":\"status\",\"id\":1}'","in_help":true,"origin":"new_table"},{"phrase":"修物品","key":"home.item.update","cli":"home-cmd-read home.item.update --params '{\"op\":\"status\",\"id\":1}'","in_help":true,"origin":"new_table"}] },
        { "id": "3-5", "wake": ["合并物品"], "title": "合并重复物品", "prompt_source": "old_yaml:307#prompt", "origin": "old_yaml", "old_template": "物品/confirm.html", "cli": "home-cmd-read home.item.update --params '{\"op\":\"merge\",\"id\":1}'" },
        { "id": "3-6", "wake": ["撤销操作"], "title": "撤销最近操作", "prompt_source": "old_yaml:323#prompt", "origin": "old_yaml", "old_template": "物品/undo_select.html", "cli": "home-cmd-read home.item.update --params '{\"op\":\"undo\"}'" },
        { "id": "3-7", "wake": ["物品关联"], "title": "设置物品关联", "prompt_source": "old_yaml:338#prompt", "origin": "old_yaml", "old_template": "物品/relations.html", "cli": "home-cmd-read home.item.update --params '{\"op\":\"relate\",\"id\":1}'" },
        { "id": "3-8", "wake": ["标物品"], "title": "修改物品标签", "prompt_source": "old_yaml:354#prompt", "origin": "old_yaml", "old_template": "物品/receipt.html", "cli": "home-cmd-read home.item.update --params '{\"op\":\"tags\",\"id\":1}'" }
      ] },
      { "sub_cn": "标签与分类", "name": "tag", "scenes": [
        { "id": "4-1", "wake": ["管标签"], "title": "管理标签(查看/重命名/合并/清理)", "prompt_source": "old_yaml:370#prompt", "origin": "old_yaml", "old_template": "物品/tag_manage.html", "cli": "home-cmd-read home.tag.write --params '{\"op\":\"overview\"}'", "extra_wake": [{"phrase":"看标签","key":"home.tag.query","cli":"home-cmd-read home.tag.query","in_help":true,"origin":"new_table"},{"phrase":"合标签","key":"home.tag.write","cli":"home-cmd-read home.tag.write --params '{\"op\":\"merge\"}'","in_help":true,"origin":"new_table"}] },
        { "id": "4-2", "wake": ["管分类"], "title": "管理分类(查看/新建/改名/合并/移动)", "prompt_source": "old_yaml:386#prompt", "origin": "old_yaml", "old_template": "物品/category_manage.html", "cli": "home-cmd-read home.tag.write --params '{\"op\":\"category\"}'" },
        { "id": "4-3", "wake": ["整理建议"], "title": "标签分类整理建议(AI 检测)", "prompt_source": "old_yaml:402#prompt", "origin": "old_yaml", "old_template": "物品/tag_manage.html", "cli": "home-cmd-read home.tag.write --params '{\"op\":\"tidy\"}'" }
      ] },
      { "sub_cn": "照片档案", "name": "photo", "scenes": [
        { "id": "5-1", "wake": ["查看照片"], "title": "查看物品照片(含类型筛选)", "prompt_source": "old_yaml:417#prompt", "origin": "old_yaml", "old_template": "物品/photos.html", "cli": "home-cmd-read home.item.detail --params '{\"view\":\"photos\",\"id\":1}'" },
        { "id": "5-2", "wake": ["管照片"], "title": "管理物品照片(排序/换主图/加图/标记类型)", "prompt_source": "old_yaml:433#prompt", "origin": "old_yaml", "old_template": "物品/photos.html", "cli": "home-cmd-read home.item.update --params '{\"op\":\"photo\",\"id\":1}'" },
        { "id": "5-3", "wake": ["照片墙"], "title": "浏览物品照片墙(分类/位置/类型)", "prompt_source": "old_yaml:449#prompt", "origin": "old_yaml", "old_template": "物品/photo_wall.html", "cli": "home-cmd-read home.item.search --params '{\"wall\":true}'" }
      ] },
      { "sub_cn": "盘点", "name": "inventory", "scenes": [
        { "id": "6-1", "wake": ["盘点"], "title": "盘点核对(按位置/分类/全屋)", "prompt_source": "old_yaml:465#prompt", "origin": "old_yaml", "old_template": "物品/inventory_round.html", "cli": "home-cmd-read home.inventory.round --params '{\"op\":\"round\"}'", "extra_wake": [{"phrase":"盘物品","key":"home.inventory.round","cli":"home-cmd-read home.inventory.round --params '{\"op\":\"round\"}'","in_help":true,"origin":"new_table"},{"phrase":"盘全部","key":"home.inventory.round","cli":"home-cmd-read home.inventory.round --params '{\"op\":\"round\",\"scope\":\"all\"}'","in_help":true,"origin":"new_table"}] },
        { "id": "6-2", "wake": ["差异处理"], "title": "处理盘点差异(缺/多/异/待确认)", "prompt_source": "old_yaml:493#prompt", "origin": "old_yaml", "old_template": "物品/inventory_diff.html", "cli": "home-cmd-read home.inventory.round --params '{\"op\":\"resolve\"}'" },
        { "id": "6-3", "wake": ["盘点记录"], "title": "查看盘点记录(含复查)", "prompt_source": "old_yaml:508#prompt", "origin": "old_yaml", "old_template": "物品/inventory_records.html", "cli": "home-cmd-read home.inventory.records" },
        { "id": "6-4", "wake": ["搬家盘点"], "title": "搬家打包盘点(带走/不带走)", "prompt_source": "old_yaml:523#prompt", "origin": "old_yaml", "old_template": "物品/move_checklist.html", "cli": "home-cmd-read home.inventory.round --params '{\"op\":\"move\"}'" }
      ] },
      { "sub_cn": "物品历史", "name": "history", "scenes": [
        { "id": "7-1", "wake": ["历史"], "title": "查看物品历史(时间线/轨迹)", "prompt_source": "old_yaml:538#prompt", "origin": "old_yaml", "old_template": "物品/history.html", "cli": "home-cmd-read home.item.detail --params '{\"view\":\"history\",\"id\":1}'" }
      ] }
    ] },
    { "key": "space", "name_cn": "空间与位置", "subs": [
      { "sub_cn": "位置管理", "name": "locationManage", "scenes": [
        { "id": "SM2-1", "wake": ["管位置"], "title": "管理位置体系(查看/新建/改名/合并/规范化)", "prompt_source": "old_yaml:553#prompt", "origin": "old_yaml", "old_template": "位置/location_manage.html", "cli": "home-cmd-read home.location.write --params '{\"op\":\"manage\"}'", "extra_wake": [{"phrase":"推位置","key":"home.location.query","cli":"home-cmd-read home.location.query --params '{\"mode\":\"suggest\"}'","in_help":true,"origin":"new_table","note":"U1 待裁：老家记作录入流程子步骤 features/add.md Step 2.5"},{"phrase":"找位置","key":"home.location.query","cli":"home-cmd-read home.location.query --params '{\"mode\":\"find\"}'","in_help":true,"origin":"new_table","note":"U1 待裁：老家记作录入流程子步骤 features/add.md Step 2.6"}] }
      ] },
      { "sub_cn": "固定位", "name": "fixedSpot", "scenes": [
        { "id": "SM2-2", "wake": ["固定位"], "title": "设置固定位(常用件锚定)", "prompt_source": "old_yaml:576#prompt", "origin": "old_yaml", "old_template": "位置/fixed_spot.html", "cli": "home-cmd-read home.location.write --params '{\"op\":\"fixed\"}'" }
      ] },
      { "sub_cn": "收纳建议", "name": "suggestStorage", "scenes": [
        { "id": "SM2-3", "wake": ["收纳建议"], "title": "收纳位置建议(AI 推荐)", "prompt_source": "old_yaml:599#prompt", "origin": "old_yaml", "old_template": "位置/suggest_storage.html", "cli": "home-cmd-read home.location.query --params '{\"mode\":\"storage\"}'" }
      ] },
      { "sub_cn": "空间视图", "name": "spaceView", "scenes": [
        { "id": "SM2-4", "wake": ["空间视图"], "title": "空间视图浏览(位置树下钻)", "prompt_source": "old_yaml:621#prompt", "origin": "old_yaml", "old_template": "位置/space_view.html", "cli": "home-cmd-read home.location.query --params '{\"mode\":\"space\"}'" }
      ] }
    ] },
    { "key": "outfit", "name_cn": "穿搭出行", "subs": [
      { "sub_cn": "穿搭推荐", "name": "outfitPick", "scenes": [
        { "id": "SM3-1", "wake": ["穿什么"], "title": "今日穿搭推荐(拼贴效果)", "prompt_source": "old_yaml:643#prompt", "origin": "old_yaml", "old_template": "穿搭/outfit_picker.html", "cli": "home-cmd-read home.outfit.pick" }
      ] },
      { "sub_cn": "衣橱管理", "name": "wardrobe", "scenes": [
        { "id": "SM3-2", "wake": ["衣橱分析"], "title": "衣橱闲置分析(结构诊断/断舍离建议)", "prompt_source": "old_yaml:659#prompt", "origin": "old_yaml", "old_template": "穿搭/wardrobe_analyze.html", "cli": "home-cmd-read home.outfit.pick --params '{\"kind\":\"wardrobe\"}'" },
        { "id": "SM3-3", "wake": ["换季"], "title": "换季收纳(季节衣物批量收纳)", "prompt_source": "old_yaml:674#prompt", "origin": "old_yaml", "old_template": "穿搭/wardrobe_season.html", "cli": "home-cmd-read home.outfit.pick --params '{\"kind\":\"season\"}'" }
      ] },
      { "sub_cn": "出行清单", "name": "tripPack", "scenes": [
        { "id": "SM3-4", "wake": ["带物品","归物品"], "title": "出行带物清单(带/归,联动健身计划,出发核对)", "prompt_source": "old_yaml:690#prompt", "origin": "old_yaml", "old_template": "穿搭/travel_trip.html", "cli": "home-cmd-read home.trip.manage --params '{\"mode\":\"pack\"}'" }
      ] },
      { "sub_cn": "旅行穿搭计划", "name": "tripOutfitPlan", "scenes": [
        { "id": "SM3-5", "wake": ["旅行穿搭"], "title": "旅行穿搭计划(天数+天气)", "prompt_source": "old_yaml:706#prompt", "origin": "old_yaml", "old_template": "穿搭/trip_outfit_plan.html", "cli": "home-cmd-read home.outfit.pick --params '{\"kind\":\"trip-plan\"}'" }
      ] }
    ] },
    { "key": "stats", "name_cn": "统计总览", "subs": [
      { "sub_cn": "统计总览", "name": "overview", "scenes": [
        { "id": "SM4-1", "wake": ["统物品"], "title": "物品总览", "prompt_source": "old_yaml:721#prompt", "origin": "old_yaml", "old_template": "stats/overview.html", "cli": "home-cmd-read home.stats.overview --params '{\"kind\":\"summary\"}'", "extra_wake": [{"phrase":"查高频","key":"home.stats.overview","cli":"home-cmd-read home.stats.overview --params '{\"kind\":\"summary\"}'","in_help":true,"origin":"new_table"},{"phrase":"统物品(HTML)","key":"home.stats.overview","cli":"home-cmd-read home.stats.overview","in_help":false,"origin":"new_table","note":"兼容别名，不进 HELP"}] },
        { "id": "SM4-2", "wake": ["查闲置"], "title": "闲置物品检测(AI 断舍离建议)", "prompt_source": "old_yaml:749#prompt", "origin": "old_yaml", "old_template": "stats/idle.html", "cli": "home-cmd-read home.stats.alert --params '{\"kind\":\"idle\"}'", "extra_wake": [{"phrase":"查低频","key":"home.stats.alert","cli":"home-cmd-read home.stats.alert --params '{\"kind\":\"idle\"}'","in_help":true,"origin":"new_table"}] },
        { "id": "SM4-3", "wake": ["查过期"], "title": "过期检查与预告", "prompt_source": "old_yaml:764#prompt", "origin": "old_yaml", "old_template": "stats/expiring.html", "cli": "home-cmd-read home.stats.alert --params '{\"kind\":\"expiring\"}'" },
        { "id": "SM4-4", "wake": ["盘点统计"], "title": "盘点统计与建议", "prompt_source": "old_yaml:779#prompt", "origin": "old_yaml", "old_template": "stats/inventory_stat.html", "cli": "home-cmd-read home.stats.overview --params '{\"kind\":\"inventory\"}'" }
      ] }
    ] },
    { "key": "express", "name_cn": "快递购物", "subs": [
      { "sub_cn": "购物清单", "name": "shoppingList", "scenes": [
        { "id": "SM5-1", "wake": ["购物清单"], "title": "购物清单(组织/例行/采购闭环)", "prompt_source": "old_yaml:794#prompt", "origin": "old_yaml", "old_template": "快递购物/list.html", "cli": "home-cmd-read home.shopping.query --params '{\"kind\":\"list\"}'", "extra_wake": [{"phrase":"改购物清单","key":"home.shopping.write","cli":"home-cmd-read home.shopping.write --params '{\"op\":\"check\"}'","in_help":true,"origin":"new_table"}] }
      ] },
      { "sub_cn": "缺货检测", "name": "shoppingMissing", "scenes": [
        { "id": "SM5-2", "wake": ["缺货检测"], "title": "缺货检测(自动进清单)", "prompt_source": "old_yaml:809#prompt", "origin": "old_yaml", "old_template": "快递购物/missing.html", "cli": "home-cmd-read home.shopping.query --params '{\"kind\":\"missing\"}'" }
      ] },
      { "sub_cn": "快递跟踪", "name": "searchExpress", "scenes": [
        { "id": "SM5-3", "wake": ["查快递"], "title": "快递跟踪(查/超时/收货确认)", "prompt_source": "old_yaml:824#prompt", "origin": "old_yaml", "old_template": "快递购物/express.html", "cli": "home-cmd-read home.shopping.query --params '{\"kind\":\"express\"}'" }
      ] },
      { "sub_cn": "囤货盘点", "name": "stockCheck", "scenes": [
        { "id": "SM5-4", "wake": ["囤货盘点"], "title": "囤货盘点(库存/阈值/不足检测)", "prompt_source": "old_yaml:839#prompt", "origin": "old_yaml", "old_template": "快递购物/stock.html", "cli": "home-cmd-read home.shopping.query --params '{\"kind\":\"stock\"}'" }
      ] }
    ] },
    { "key": "family", "name_cn": "家庭协作", "subs": [
      { "sub_cn": "借用管理", "name": "borrow", "scenes": [
        { "id": "SM7-1", "wake": ["借用"], "title": "借用管理(借出/借入/归还/催还)", "prompt_source": "old_yaml:854#prompt", "origin": "old_yaml", "old_template": "family_borrow.html", "cli": "home-cmd-read home.care.query --params '{\"kind\":\"borrow\"}'" }
      ] },
      { "sub_cn": "家人档案", "name": "member", "scenes": [
        { "id": "SM7-2", "wake": ["家人档案"], "title": "家人档案(成员/物品归属标记)", "prompt_source": "old_yaml:870#prompt", "origin": "old_yaml", "old_template": "family_members.html", "cli": "home-cmd-read home.care.query --params '{\"kind\":\"member\"}'" }
      ] }
    ] },
    { "key": "setup", "name_cn": "开始使用", "subs": [
      { "sub_cn": "开始使用", "name": "firstUse", "scenes": [
        { "id": "SM8-1", "wake": ["首次使用"], "title": "首次使用(初始化工作流)", "prompt_source": "old_yaml:886#prompt", "origin": "old_yaml", "old_template": "开始使用/first_use_wizard.html", "cli": "home-cmd-read home.care.write --params '{\"kind\":\"init\"}'" },
        { "id": "SM8-2", "wake": ["查异常"], "title": "数据检查(健康报告)", "prompt_source": "old_yaml:901#prompt", "origin": "old_yaml", "old_template": "开始使用/health_report.html", "cli": "home-cmd-read home.care.query --params '{\"kind\":\"lint\"}'" },
        { "id": "SM8-3", "wake": ["备份导出"], "title": "备份与导出(数据资产)", "prompt_source": "old_yaml:916#prompt", "origin": "old_yaml", "old_template": "开始使用/backup_receipt.html", "cli": "home-cmd-read home.care.write --params '{\"kind\":\"backup\"}'" },
        { "id": "SM8-4", "wake": ["导入恢复"], "title": "导入与恢复(迁移)", "prompt_source": "old_yaml:932#prompt", "origin": "old_yaml", "old_template": "开始使用/import_restore.html", "cli": "home-cmd-read home.care.write --params '{\"kind\":\"import\"}'" }
      ] }
    ] },
    { "key": "link", "name_cn": "联动功能", "subs": [
      { "sub_cn": "联动总览", "name": "linkOverview", "scenes": [
        { "id": "SM9-1", "wake": ["联动总览"], "title": "联动功能总览(能力索引)", "prompt_source": null, "origin": "old_yaml", "old_template": "联动/link_overview.html", "cli": null, "status": "deprecated" }
      ] },
      { "sub_cn": "食品联动", "name": "linkCalorie", "scenes": [
        { "id": "SM9-2", "wake": ["记到卡路里"], "title": "食品联动(记到卡路里/查热量)", "prompt_source": null, "origin": "old_yaml", "old_template": "联动/link_food.html", "cli": null, "status": "deprecated" }
      ] },
      { "sub_cn": "价格联动", "name": "linkAccounting", "scenes": [
        { "id": "SM9-3", "wake": ["记到记账"], "title": "价格联动(记到记账)", "prompt_source": null, "origin": "old_yaml", "old_template": "联动/link_price.html", "cli": null, "status": "deprecated" }
      ] }
    ] },
    { "key": "receipt", "name_cn": "票据凭证", "subs": [
      { "sub_cn": "购买记录", "name": "purchase", "scenes": [
        { "id": "SM6-1", "wake": ["查购买记录"], "title": "查购买记录(全量/按物品/按时间)", "prompt_source": "old_yaml:997#prompt", "origin": "old_yaml", "old_template": "票据凭证/purchase_records.html", "cli": "home-cmd-read home.ticket.query --params '{\"kind\":\"purchase\"}'" },
        { "id": "SM6-2", "wake": ["查上月购买"], "title": "查上月购买(时间预填)", "prompt_source": "old_yaml:1013#prompt", "origin": "old_yaml", "old_template": "票据凭证/purchase_records.html", "cli": "home-cmd-read home.ticket.query --params '{\"kind\":\"purchase\",\"range\":\"last-month\"}'" },
        { "id": "SM6-3", "wake": ["查今年花费"], "title": "查今年花费(年度统计)", "prompt_source": "old_yaml:1028#prompt", "origin": "old_yaml", "old_template": "票据凭证/purchase_records.html", "cli": "home-cmd-read home.ticket.query --params '{\"kind\":\"purchase\",\"range\":\"year\"}'" },
        { "id": "SM6-4", "wake": ["查退货窗口"], "title": "查退货窗口(物品必填)", "prompt_source": "old_yaml:1043#prompt", "origin": "old_yaml", "old_template": "票据凭证/purchase_records.html", "cli": "home-cmd-read home.ticket.query --params '{\"kind\":\"purchase\",\"range\":\"return\"}'" },
        { "id": "SM6-5", "wake": ["登记购买记录"], "title": "登记购买记录(录入)", "prompt_source": "old_yaml:1058#prompt", "origin": "old_yaml", "old_template": "票据凭证/purchase_records.html", "cli": "home-cmd-read home.ticket.write --params '{\"kind\":\"purchase\",\"op\":\"add\"}'" }
      ] },
      { "sub_cn": "保修与保养", "name": "warranty", "scenes": [
        { "id": "SM6-6", "wake": ["查保修状态"], "title": "查保修状态(在保/将到期/已过)", "prompt_source": "old_yaml:1075#prompt", "origin": "old_yaml", "old_template": "票据凭证/warranty.html", "cli": "home-cmd-read home.ticket.query --params '{\"kind\":\"warranty\"}'" },
        { "id": "SM6-7", "wake": ["登记保修"], "title": "登记保修(录入保修期)", "prompt_source": "old_yaml:1090#prompt", "origin": "old_yaml", "old_template": "票据凭证/warranty.html", "cli": "home-cmd-read home.ticket.write --params '{\"kind\":\"warranty\",\"op\":\"register\"}'" },
        { "id": "SM6-8", "wake": ["记录维修"], "title": "记录维修(维修历史)", "prompt_source": "old_yaml:1106#prompt", "origin": "old_yaml", "old_template": "票据凭证/warranty.html", "cli": "home-cmd-read home.ticket.write --params '{\"kind\":\"warranty\",\"op\":\"repair\"}'" },
        { "id": "SM6-9", "wake": ["设置保养周期"], "title": "设置保养周期(定期保养)", "prompt_source": "old_yaml:1122#prompt", "origin": "old_yaml", "old_template": "票据凭证/warranty.html", "cli": "home-cmd-read home.ticket.write --params '{\"kind\":\"warranty\",\"op\":\"cycle\"}'" },
        { "id": "SM6-10", "wake": ["执行保养"], "title": "执行保养(刷新下次日)", "prompt_source": "old_yaml:1138#prompt", "origin": "old_yaml", "old_template": "票据凭证/warranty.html", "cli": "home-cmd-read home.ticket.write --params '{\"kind\":\"warranty\",\"op\":\"maintain\"}'" }
      ] },
      { "sub_cn": "证件管理", "name": "cert", "scenes": [
        { "id": "SM6-11", "wake": ["查证件到期"], "title": "查证件到期(按到期排序)", "prompt_source": "old_yaml:1154#prompt", "origin": "old_yaml", "old_template": "票据凭证/certificates.html", "cli": "home-cmd-read home.ticket.query --params '{\"kind\":\"cert\"}'" },
        { "id": "SM6-12", "wake": ["登记证件"], "title": "登记证件(录入)", "prompt_source": "old_yaml:1169#prompt", "origin": "old_yaml", "old_template": "票据凭证/certificates.html", "cli": "home-cmd-read home.ticket.write --params '{\"kind\":\"cert\",\"op\":\"add\"}'" },
        { "id": "SM6-13", "wake": ["证件归档"], "title": "证件归档(照片)", "prompt_source": "old_yaml:1186#prompt", "origin": "old_yaml", "old_template": "票据凭证/certificates.html", "cli": "home-cmd-read home.ticket.write --params '{\"kind\":\"cert\",\"op\":\"archive\"}'" },
        { "id": "SM6-14", "wake": ["更新证件"], "title": "更新证件(改到期/持有人/号码)", "prompt_source": "old_yaml:1202#prompt", "origin": "old_yaml", "old_template": "票据凭证/certificates.html", "cli": "home-cmd-read home.ticket.write --params '{\"kind\":\"cert\",\"op\":\"update\"}'" }
      ] },
      { "sub_cn": "账号密码", "name": "account", "scenes": [
        { "id": "SM6-15", "wake": ["查账号"], "title": "查账号(密码脱敏)", "prompt_source": "old_yaml:1219#prompt", "origin": "old_yaml", "old_template": "票据凭证/accounts.html", "cli": "home-cmd-read home.ticket.query --params '{\"kind\":\"account\"}'" },
        { "id": "SM6-16", "wake": ["存账号"], "title": "存账号(加密存储)", "prompt_source": "old_yaml:1234#prompt", "origin": "old_yaml", "old_template": "票据凭证/accounts.html", "cli": "home-cmd-read home.ticket.write --params '{\"kind\":\"account\",\"op\":\"add\"}'" },
        { "id": "SM6-17", "wake": ["改账号"], "title": "改账号(更新录入)", "prompt_source": "old_yaml:1251#prompt", "origin": "old_yaml", "old_template": "票据凭证/accounts.html", "cli": "home-cmd-read home.ticket.write --params '{\"kind\":\"account\",\"op\":\"update\"}'" },
        { "id": "SM6-18", "wake": ["看密码"], "title": "看密码(敏感回显)", "prompt_source": "old_yaml:1268#prompt", "origin": "old_yaml", "old_template": "票据凭证/accounts.html", "cli": "home-cmd-read home.ticket.write --params '{\"kind\":\"account\",\"op\":\"show\"}'" }
      ] }
    ] }
  ]
}

```

## 七、拿不准的（明确列，不猜）

| 序 | 事项 | 本席现状 | 要谁裁 |
|---|---|---|---|
| U1 | `推位置`／`找位置` 挂哪个域 | 暂挂 `space`／`位置管理`（与新命令 `home.location.query` 一致）；但老家把这两个词记作**录入流程的子步骤**（`features/add.md` Step 2.5／Step 2.6，老路由表行 147／148），无独立场景、无模板。替代方案是挂 `items`／`录入`（老出处一致、新命令不一致） | 用户一句话 |
| U2 | `stats` 域的子功能粒度 | 老骨架只有 1 个子功能「统计总览」（4 场景）；新表把查闲置／查过期／查低频 分到 `home.stats.alert`。本席照老骨架给 1 个（`overview`），`#188` 是否再拆一个 `alert` 文件，未定 | `#188` 结构设计时报用户 |
| U3 | `care` 前缀跨两域 | 新表 `home.care.*` 同时装 `family`（借用／家人档案）与 `setup`（查异常／首次使用／备份导出／导入恢复）。骨架按老骨架拆两域；若 `#188` 照新表建 `care/` 一个目录，就与「目录名取自 HELP 一级分组（＝老 9 域）」冲突——`care` 只能当命令前缀 | 票 6 前定死 |
| U4 | `看标签` 是否独立场景 | 本席挂到老 `4-1 管标签`（老 prompt 的菜单里就有「查看」）→ 场景数仍 73。若 HELP 想给它独立卡片，就要新增老骨架没有的场景（场景数变 74），与「老骨架为准」相抵 | 用户一句话 |
| U5 | 子功能英文名的大小写 | 本席给 camelCase（`spaceView`／`tripOutfitPlan`，照 `docPage.ts` 先例）；若 `#188` 要照老骨架逐字 snake_case，改的是形式不是词 | `#188` |
| U6 | 3 条 `(HTML)` 的 `in_help: false` | 依赖票 4／票 6 采纳第三节建议；不采纳则它们在 HELP 里表现为**同一命令的两行别名** | 票 4／票 6 |
| U7 | 子功能要不要一句组说明 | 老骨架 `sub` 只有名字、没有描述；HELP 二级分组要不要副标题，本席无依据 | 票 6 |
| U8 | HELP 的「主数」 | 三组数并存：91 词（新表）／73 场景（老骨架）／21 命令。本席建议 HELP 主数用 73 场景，21 命令写口径区 | 票 4 |
| U9 | 老 HELP 的呈现顺序／分组显示 | 本席按老生成器的分组契约取（`scripts/help_center.py:7-8`「一级 ＝ 9 功能域（顺序固定）；二级 ＝ 子功能（按场景出现顺序）」）＋ yaml 的 `name`／`sub` 字段；`居家管家.html`（84 KB）与老 `SKILL.md` 按纪律未整读，**没有逐条核对老 HELP 的视觉呈现** | 若要视觉对齐，另派一次结构化摘录调查 |
| U10 | 老骨架 `status` 字段 | 73 条全是 `status: ''`，本席未赋予含义、也未把它写进骨架（只对 link 3 条新加 `status: "deprecated"`） | 若 `#188` 想用它承载定稿状态，须另查老家用法 |

## 附录：脚本、产物与自查

**脚本**：`docs/skills/skill-home/t185-extract.mjs`（Node ESM，只读；UTF-8 无 BOM）。六种模式：

```sh
node docs/skills/skill-home/t185-extract.mjs            # 两边全量紧凑行（老 73 条 × 新 91 条）+ 计数
node docs/skills/skill-home/t185-extract.mjs join       # 老场景 ↔ 新表逐条对账（第一节的原料）
node docs/skills/skill-home/t185-extract.mjs routes     # 老家 SKILL.md 路由表 95 行 + 唤醒词 CLI 映射
node docs/skills/skill-home/t185-extract.mjs lines      # 73 场景的 yaml 行号 + 老模板路径
node docs/skills/skill-home/t185-extract.mjs skeleton   # 第六节的骨架 JSON（已 JSON.parse 校验）
node docs/skills/skill-home/t185-extract.mjs names      # 老 HELP／老 SKILL.md 的分组名候选摘录
```

**产物**（全在 `docs/skills/skill-home/`，UTF-8 无 BOM、LF 真实换行）：本报告 `t185-content-reconcile.md`、骨架 `t185-skeleton.json`、脚本 `t185-extract.mjs`；原始输出归在 `t185-evidence/`（`t185-extract.out.txt`／`t185-join.out.txt`／`t185-routes.out.txt`／`t185-lines.out.txt`／`t185-names.out.txt`，`t185-skeleton.err.txt` 为空＝生成时无告警）。

**自查**：

- 未改任何源码（`packages/` 一字未动）、未 `git add`／未 commit、未动 GitHub issue、未关票。
- 计数全部由脚本数出（`t185-evidence/t185-extract.out.txt:170-184`）：老 73／新 91／无落点 3／承接 71／补进 20／域 9／子功能 30，未抄票面给的数。
- 大文件未整读：老 `SKILL.md`（801 行）只读 4 个有界窗口（114-131、232-253、605-632 行）＋脚本摘取路由表 95 行；`居家管家.html`（84 KB）只经脚本摘标题（未整读）。
- `cli` 字段取自 `SKILL.md` 的 HELP-AUTO「例」列（仓内既有命令），不是本席重拼的参数字符串。

**交付状态（给维护者一句话）**：本席未提交任何东西。查证到 `docs/skills/skill-home/t185-extract.mjs` 与三个原始输出（`t185-extract.out.txt`／`t185-names.out.txt`／`t185-routes.out.txt`）已被并进 `5a5978f`（「#186 关票…」，2026-09-12 10:22），那是本席写到一半时的草稿；脚本此后又加了 `join`／`lines`／`skeleton`／`names` 四个模式（当前为未提交的 `M`），本报告与 `t185-skeleton.json`／`t185-join.out.txt`／`t185-lines.out.txt` 全为未跟踪（`??`）。默认模式今天仍逐字复现 `5a5978f` 里那份 `t185-extract.out.txt`（SHA-256 相同）。要入库请由维护者自行 `git add`。
