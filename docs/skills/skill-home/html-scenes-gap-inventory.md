# 居家管家 场景 HTML 覆盖矩阵

只读调查（未改任何源码、未切分支、未 commit）。调查对象：

- 老技能（权威功能来源，只读）：`D:\2Study\StudyNotes\SKILLS\居家管家`（Python ＋ sqlite，模板在 `templates/`，脚本在 `scripts/`）。
- 新技能（TypeScript，重构中）：`D:\ilife\packages\skill-home`（代码在 `src/`，模板在 `templates/`）。

**关键计数（本次实测）**：场景 **73** 条／域 **9** 个／二级组 **30** 个；老模板引用（去重）**49** 个，全部存在，老 `templates/` 全树 **67** 个 `.html`；新模板 **21** 个、新 key **21** 个、新唤醒词表 **91** 条（其中 3 条显式废弃）；覆盖状态分布＝`新有专用页` **2**、`新共用页` **68**、`新有模板但无分派` **0**、`新无实现` **3**。

## 判定口径

新侧证据链（每一列都可落到文件:行）：

1. `src/help/scenarios.yaml` 每条的 `wake_word`（老骨架原样副本，与老技能 `references/scenarios.yaml` 逐字节相同）。
2. `src/policy/wakewords.ts:20-112` `WAKE_TABLE`：唤醒词 → `HomeKey`；`wakewords.ts:115` `DEPRECATED_PHRASES` 显式废弃 3 词；`routeWakeword()`（`wakewords.ts:119-131`）最长匹配，无命中抛 `POLICY_NO_MATCH`。
3. `src/render/templates.ts:33-58` `templateFor(key)`：`HomeKey` → 模板名；`templates.ts:7-29` `HOME_TEMPLATES` 是模板白名单；`loadTemplate()`（`templates.ts:62-68`）按名字读 `templates/<name>.html`。
4. `src/render/html.ts:66-76` `fillTemplate()` 填三个标记；`src/render/html.ts:27-47` `renderEnvelopeHtml()` 按形状生成内容；`src/render/views.ts` 装配 list／detail／receipt／stat 四类数据。
5. 命令侧分派实现：`src/cli/cmd_read.ts` 对应的 `case '<key>'`（`:175-789`）。

四个状态值（本次只用这四个）：

| 状态 | 判定规则 |
| --- | --- |
| `新有专用页` | 唤醒词有路由；其 key 映射到的模板**只服务这一条场景**（在 73 条里仅被本条引用） |
| `新共用页` | 唤醒词有路由；其 key 映射到的模板被 **≥2 条**场景共用 |
| `新无实现` | 唤醒词无路由（`WAKE_TABLE` 无此词，或列入 `DEPRECATED_PHRASES`）；新技能里既没有 key，也没有任何模板是它的渲染落点 |
| `新有模板但无分派` | 模板在 `templates/` 且在 `HOME_TEMPLATES` 里，但没有任何 key／唤醒词能走到它 |

老侧证据：`references/scenarios.yaml` 的 `html.template`（相对 `templates/` 的路径）＋ 文件存在性／字节数／行数（脚本实测）＋ `scripts/` 里的渲染调用点（见 §一之二）。

---

## 一 · 73 场景 × 覆盖矩阵

| 场景 id | 域 | 二级组 | 唤醒词 | 场景标题 | type | 老模板 | 老模板存在? | 新命令 key | 新模板 | 覆盖状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1-1 | items（物品管理） | 录入 | 录物品 | 录入一件新物品 | 采集+回执 | `物品/add_form.html` | 有（12911 B／161 行） | `home.item.add` | `item_receipt.html` | 新共用页 |
| 1-2 | items（物品管理） | 录入 | 拍物品 | 拍照识别录入物品 | 采集+回执 | `物品/add_form.html` | 有（12911 B／161 行） | `home.item.add` | `item_receipt.html` | 新共用页 |
| 1-3 | items（物品管理） | 录入 | 批量录入 | 批量录入多件物品 | 采集+回执 | `物品/add_form.html` | 有（12911 B／161 行） | `home.item.add` | `item_receipt.html` | 新共用页 |
| 1-4 | items（物品管理） | 录入 | 补录 | 补录历史物品(指定日期) | 采集+回执 | `物品/add_form.html` | 有（12911 B／161 行） | `home.item.add` | `item_receipt.html` | 新共用页 |
| 2-1 | items（物品管理） | 查找 | 查物品 | 搜索查找物品 | 查看 | `物品/search_list.html` | 有（7495 B／81 行） | `home.item.search` | `item_search.html` | 新共用页 |
| 2-2 | items（物品管理） | 查找 | 看物品 | 查看物品详情 | 查看 | `物品/detail.html` | 有（8357 B／87 行） | `home.item.detail` | `item_detail.html` | 新共用页 |
| 2-3 | items（物品管理） | 查找 | 紧急定位 | 紧急查找物品位置 | 查看 | `物品/locate.html` | 有（5073 B／73 行） | `home.item.search` | `item_search.html` | 新共用页 |
| 2-4 | items（物品管理） | 查找 | 筛选浏览 | 按条件筛选浏览物品 | 查看 | `物品/browse.html` | 有（5821 B／63 行） | `home.item.search` | `item_search.html` | 新共用页 |
| 2-5 | items（物品管理） | 查找 | 拍照找物品 | 拍照反向查找物品 | 查看 | `物品/search_list.html` | 有（7495 B／81 行） | `home.item.search` | `item_search.html` | 新共用页 |
| 2-6 | items（物品管理） | 查找 | 查重复 | 检查重复物品 | 查看 | `物品/duplicates.html` | 有（5921 B／73 行） | `home.item.search` | `item_search.html` | 新共用页 |
| 3-1 | items（物品管理） | 更新 | 改物品 | 修改物品信息 | 采集+回执 | `物品/add_form.html` | 有（12911 B／161 行） | `home.item.update` | `item_update_receipt.html` | 新共用页 |
| 3-2 | items（物品管理） | 更新 | 移物品 | 移动物品位置 | 采集+回执 | `物品/receipt.html` | 有（7454 B／84 行） | `home.item.update` | `item_update_receipt.html` | 新共用页 |
| 3-3 | items（物品管理） | 更新 | 数量变更 | 变更物品数量 | 采集+回执 | `物品/receipt.html` | 有（7454 B／84 行） | `home.item.update` | `item_update_receipt.html` | 新共用页 |
| 3-4 | items（物品管理） | 更新 | 状态变更 | 变更物品状态 | 选择+回执 | `物品/receipt.html` | 有（7454 B／84 行） | `home.item.update` | `item_update_receipt.html` | 新共用页 |
| 3-5 | items（物品管理） | 更新 | 合并物品 | 合并重复物品 | 选择+回执 | `物品/confirm.html` | 有（4873 B／67 行） | `home.item.update` | `item_update_receipt.html` | 新共用页 |
| 3-6 | items（物品管理） | 更新 | 撤销操作 | 撤销最近操作 | 选择+回执 | `物品/undo_select.html` | 有（4606 B／62 行） | `home.item.update` | `item_update_receipt.html` | 新共用页 |
| 3-7 | items（物品管理） | 更新 | 物品关联 | 设置物品关联 | 采集+回执 | `物品/relations.html` | 有（4271 B／57 行） | `home.item.update` | `item_update_receipt.html` | 新共用页 |
| 3-8 | items（物品管理） | 更新 | 标物品 | 修改物品标签 | 采集+回执 | `物品/receipt.html` | 有（7454 B／84 行） | `home.item.update` | `item_update_receipt.html` | 新共用页 |
| 4-1 | items（物品管理） | 标签与分类 | 管标签 | 管理标签(查看/重命名/合并/清理) | 查看+选择+回执 | `物品/tag_manage.html` | 有（5832 B／67 行） | `home.tag.write` | `tag_receipt.html` | 新共用页 |
| 4-2 | items（物品管理） | 标签与分类 | 管分类 | 管理分类(查看/新建/改名/合并/移动) | 查看+选择+回执 | `物品/category_manage.html` | 有（8986 B／107 行） | `home.tag.write` | `tag_receipt.html` | 新共用页 |
| 4-3 | items（物品管理） | 标签与分类 | 整理建议 | 标签分类整理建议(AI 检测) | 选择+回执 | `物品/tag_manage.html` | 有（5832 B／67 行） | `home.tag.write` | `tag_receipt.html` | 新共用页 |
| 5-1 | items（物品管理） | 照片档案 | 查看照片 | 查看物品照片(含类型筛选) | 查看 | `物品/photos.html` | 有（6531 B／72 行） | `home.item.detail` | `item_detail.html` | 新共用页 |
| 5-2 | items（物品管理） | 照片档案 | 管照片 | 管理物品照片(排序/换主图/加图/标记类型) | 采集+回执 | `物品/photos.html` | 有（6531 B／72 行） | `home.item.update` | `item_update_receipt.html` | 新共用页 |
| 5-3 | items（物品管理） | 照片档案 | 照片墙 | 浏览物品照片墙(分类/位置/类型) | 查看 | `物品/photo_wall.html` | 有（5733 B／67 行） | `home.item.search` | `item_search.html` | 新共用页 |
| 6-1 | items（物品管理） | 盘点 | 盘点 | 盘点核对(按位置/分类/全屋) | 采集+回执 | `物品/inventory_round.html` | 有（10061 B／114 行） | `home.inventory.round` | `inventory_round.html` | 新共用页 |
| 6-2 | items（物品管理） | 盘点 | 差异处理 | 处理盘点差异(缺/多/异/待确认) | 选择+回执 | `物品/inventory_diff.html` | 有（8367 B／100 行） | `home.inventory.round` | `inventory_round.html` | 新共用页 |
| 6-3 | items（物品管理） | 盘点 | 盘点记录 | 查看盘点记录(含复查) | 查看 | `物品/inventory_records.html` | 有（5288 B／61 行） | `home.inventory.records` | `inventory_records.html` | 新有专用页 |
| 6-4 | items（物品管理） | 盘点 | 搬家盘点 | 搬家打包盘点(带走/不带走) | 向导+采集+回执 | `物品/move_checklist.html` | 有（8892 B／94 行） | `home.inventory.round` | `inventory_round.html` | 新共用页 |
| 7-1 | items（物品管理） | 物品历史 | 历史 | 查看物品历史(时间线/轨迹) | 查看 | `物品/history.html` | 有（5869 B／72 行） | `home.item.detail` | `item_detail.html` | 新共用页 |
| SM2-1 | space（空间与位置） | 位置管理 | 管位置 | 管理位置体系(查看/新建/改名/合并/规范化) | 查看+选择+回执 | `位置/location_manage.html` | 有（17094 B／218 行） | `home.location.write` | `location_receipt.html` | 新共用页 |
| SM2-2 | space（空间与位置） | 固定位 | 固定位 | 设置固定位(常用件锚定) | 采集+回执 | `位置/fixed_spot.html` | 有（13823 B／158 行） | `home.location.write` | `location_receipt.html` | 新共用页 |
| SM2-3 | space（空间与位置） | 收纳建议 | 收纳建议 | 收纳位置建议(AI 推荐) | 查看+选择 | `位置/suggest_storage.html` | 有（14014 B／150 行） | `home.location.query` | `location_query.html` | 新共用页 |
| SM2-4 | space（空间与位置） | 空间视图 | 空间视图 | 空间视图浏览(位置树下钻) | 查看 | `位置/space_view.html` | 有（15042 B／143 行） | `home.location.query` | `location_query.html` | 新共用页 |
| SM3-1 | outfit（穿搭出行） | 穿搭推荐 | 穿什么 | 今日穿搭推荐(拼贴效果) | 查看+选择 | `穿搭/outfit_picker.html` | 有（19077 B／243 行） | `home.outfit.pick` | `outfit_pick.html` | 新共用页 |
| SM3-2 | outfit（穿搭出行） | 衣橱管理 | 衣橱分析 | 衣橱闲置分析(结构诊断/断舍离建议) | 查看+选择+回执 | `穿搭/wardrobe_analyze.html` | 有（8327 B／123 行） | `home.outfit.pick` | `outfit_pick.html` | 新共用页 |
| SM3-3 | outfit（穿搭出行） | 衣橱管理 | 换季 | 换季收纳(季节衣物批量收纳) | 采集+回执 | `穿搭/wardrobe_season.html` | 有（7510 B／117 行） | `home.outfit.pick` | `outfit_pick.html` | 新共用页 |
| SM3-4 | outfit（穿搭出行） | 出行清单 | 带物品/归物品 | 出行带物清单(带/归,联动健身计划,出发核对) | 查看+选择+回执 | `穿搭/travel_trip.html` | 有（8384 B／128 行） | `home.trip.manage` | `trip_receipt.html` | 新有专用页 |
| SM3-5 | outfit（穿搭出行） | 旅行穿搭计划 | 旅行穿搭 | 旅行穿搭计划(天数+天气) | 查看+选择 | `穿搭/trip_outfit_plan.html` | 有（8695 B／124 行） | `home.outfit.pick` | `outfit_pick.html` | 新共用页 |
| SM4-1 | stats（统计总览） | 统计总览 | 统物品 | 物品总览 | 查看 | `stats/overview.html` | 有（14837 B／172 行） | `home.stats.overview` | `stats_overview.html` | 新共用页 |
| SM4-2 | stats（统计总览） | 统计总览 | 查闲置 | 闲置物品检测(AI 断舍离建议) | 查看+选择+回执 | `stats/idle.html` | 有（13309 B／205 行） | `home.stats.alert` | `stats_alert.html` | 新共用页 |
| SM4-3 | stats（统计总览） | 统计总览 | 查过期 | 过期检查与预告 | 查看+选择+回执 | `stats/expiring.html` | 有（13651 B／215 行） | `home.stats.alert` | `stats_alert.html` | 新共用页 |
| SM4-4 | stats（统计总览） | 统计总览 | 盘点统计 | 盘点统计与建议 | 查看 | `stats/inventory_stat.html` | 有（10213 B／135 行） | `home.stats.overview` | `stats_overview.html` | 新共用页 |
| SM5-1 | express（快递购物） | 购物清单 | 购物清单 | 购物清单(组织/例行/采购闭环) | 查看+选择+回执 | `快递购物/list.html` | 有（7905 B／86 行） | `home.shopping.query` | `shopping_query.html` | 新共用页 |
| SM5-2 | express（快递购物） | 缺货检测 | 缺货检测 | 缺货检测(自动进清单) | 查看+选择 | `快递购物/missing.html` | 有（7343 B／86 行） | `home.shopping.query` | `shopping_query.html` | 新共用页 |
| SM5-3 | express（快递购物） | 快递跟踪 | 查快递 | 快递跟踪(查/超时/收货确认) | 查看+选择+回执 | `快递购物/express.html` | 有（7240 B／86 行） | `home.shopping.query` | `shopping_query.html` | 新共用页 |
| SM5-4 | express（快递购物） | 囤货盘点 | 囤货盘点 | 囤货盘点(库存/阈值/不足检测) | 查看+选择+回执 | `快递购物/stock.html` | 有（7890 B／96 行） | `home.shopping.query` | `shopping_query.html` | 新共用页 |
| SM7-1 | family（家庭协作） | 借用管理 | 借用 | 借用管理(借出/借入/归还/催还) | 查看+选择+回执 | `family_borrow.html` | 有（11310 B／158 行） | `home.care.query` | `care_query.html` | 新共用页 |
| SM7-2 | family（家庭协作） | 家人档案 | 家人档案 | 家人档案(成员/物品归属标记) | 查看+选择+回执 | `family_members.html` | 有（9682 B／130 行） | `home.care.query` | `care_query.html` | 新共用页 |
| SM8-1 | setup（开始使用） | 开始使用 | 首次使用 | 首次使用(初始化工作流) | 向导+回执 | `开始使用/first_use_wizard.html` | 有（16875 B／212 行） | `home.care.write` | `care_receipt.html` | 新共用页 |
| SM8-2 | setup（开始使用） | 开始使用 | 查异常 | 数据检查(健康报告) | 查看+选择 | `开始使用/health_report.html` | 有（11383 B／140 行） | `home.care.query` | `care_query.html` | 新共用页 |
| SM8-3 | setup（开始使用） | 开始使用 | 备份导出 | 备份与导出(数据资产) | 采集+回执 | `开始使用/backup_receipt.html` | 有（12782 B／140 行） | `home.care.write` | `care_receipt.html` | 新共用页 |
| SM8-4 | setup（开始使用） | 开始使用 | 导入恢复 | 导入与恢复(迁移) | 向导+回执 | `开始使用/import_restore.html` | 有（13509 B／154 行） | `home.care.write` | `care_receipt.html` | 新共用页 |
| SM9-1 | link（联动功能） | 联动总览 | 联动总览 | 联动功能总览(能力索引) | 查看+选择 | `联动/link_overview.html` | 有（6490 B／92 行） | —（无路由） | — | 新无实现 |
| SM9-2 | link（联动功能） | 食品联动 | 记到卡路里 | 食品联动(记到卡路里/查热量) | 查看+选择+回执 | `联动/link_food.html` | 有（6937 B／101 行） | —（无路由） | — | 新无实现 |
| SM9-3 | link（联动功能） | 价格联动 | 记到记账 | 价格联动(记到记账) | 查看+选择+回执 | `联动/link_price.html` | 有（7192 B／105 行） | —（无路由） | — | 新无实现 |
| SM6-1 | receipt（票据凭证） | 购买记录 | 查购买记录 | 查购买记录(全量/按物品/按时间) | 查看+回执 | `票据凭证/purchase_records.html` | 有（12410 B／189 行） | `home.ticket.query` | `ticket_query.html` | 新共用页 |
| SM6-2 | receipt（票据凭证） | 购买记录 | 查上月购买 | 查上月购买(时间预填) | 查看+回执 | `票据凭证/purchase_records.html` | 有（12410 B／189 行） | `home.ticket.query` | `ticket_query.html` | 新共用页 |
| SM6-3 | receipt（票据凭证） | 购买记录 | 查今年花费 | 查今年花费(年度统计) | 查看+回执 | `票据凭证/purchase_records.html` | 有（12410 B／189 行） | `home.ticket.query` | `ticket_query.html` | 新共用页 |
| SM6-4 | receipt（票据凭证） | 购买记录 | 查退货窗口 | 查退货窗口(物品必填) | 查看+回执 | `票据凭证/purchase_records.html` | 有（12410 B／189 行） | `home.ticket.query` | `ticket_query.html` | 新共用页 |
| SM6-5 | receipt（票据凭证） | 购买记录 | 登记购买记录 | 登记购买记录(录入) | 采集+回执 | `票据凭证/purchase_records.html` | 有（12410 B／189 行） | `home.ticket.write` | `ticket_receipt.html` | 新共用页 |
| SM6-6 | receipt（票据凭证） | 保修与保养 | 查保修状态 | 查保修状态(在保/将到期/已过) | 查看+回执 | `票据凭证/warranty.html` | 有（11557 B／162 行） | `home.ticket.query` | `ticket_query.html` | 新共用页 |
| SM6-7 | receipt（票据凭证） | 保修与保养 | 登记保修 | 登记保修(录入保修期) | 采集+回执 | `票据凭证/warranty.html` | 有（11557 B／162 行） | `home.ticket.write` | `ticket_receipt.html` | 新共用页 |
| SM6-8 | receipt（票据凭证） | 保修与保养 | 记录维修 | 记录维修(维修历史) | 采集+回执 | `票据凭证/warranty.html` | 有（11557 B／162 行） | `home.ticket.write` | `ticket_receipt.html` | 新共用页 |
| SM6-9 | receipt（票据凭证） | 保修与保养 | 设置保养周期 | 设置保养周期(定期保养) | 采集+回执 | `票据凭证/warranty.html` | 有（11557 B／162 行） | `home.ticket.write` | `ticket_receipt.html` | 新共用页 |
| SM6-10 | receipt（票据凭证） | 保修与保养 | 执行保养 | 执行保养(刷新下次日) | 采集+回执 | `票据凭证/warranty.html` | 有（11557 B／162 行） | `home.ticket.write` | `ticket_receipt.html` | 新共用页 |
| SM6-11 | receipt（票据凭证） | 证件管理 | 查证件到期 | 查证件到期(按到期排序) | 查看+回执 | `票据凭证/certificates.html` | 有（10161 B／150 行） | `home.ticket.query` | `ticket_query.html` | 新共用页 |
| SM6-12 | receipt（票据凭证） | 证件管理 | 登记证件 | 登记证件(录入) | 采集+回执 | `票据凭证/certificates.html` | 有（10161 B／150 行） | `home.ticket.write` | `ticket_receipt.html` | 新共用页 |
| SM6-13 | receipt（票据凭证） | 证件管理 | 证件归档 | 证件归档(照片) | 采集+回执 | `票据凭证/certificates.html` | 有（10161 B／150 行） | `home.ticket.write` | `ticket_receipt.html` | 新共用页 |
| SM6-14 | receipt（票据凭证） | 证件管理 | 更新证件 | 更新证件(改到期/持有人/号码) | 采集+回执 | `票据凭证/certificates.html` | 有（10161 B／150 行） | `home.ticket.write` | `ticket_receipt.html` | 新共用页 |
| SM6-15 | receipt（票据凭证） | 账号密码 | 查账号 | 查账号(密码脱敏) | 查看+回执 | `票据凭证/accounts.html` | 有（8888 B／143 行） | `home.ticket.query` | `ticket_query.html` | 新共用页 |
| SM6-16 | receipt（票据凭证） | 账号密码 | 存账号 | 存账号(加密存储) | 采集+回执 | `票据凭证/accounts.html` | 有（8888 B／143 行） | `home.ticket.write` | `ticket_receipt.html` | 新共用页 |
| SM6-17 | receipt（票据凭证） | 账号密码 | 改账号 | 改账号(更新录入) | 采集+回执 | `票据凭证/accounts.html` | 有（8888 B／143 行） | `home.ticket.write` | `ticket_receipt.html` | 新共用页 |
| SM6-18 | receipt（票据凭证） | 账号密码 | 看密码 | 看密码(敏感回显) | 查看+回执 | `票据凭证/accounts.html` | 有（8888 B／143 行） | `home.ticket.write` | `ticket_receipt.html` | 新共用页 |

行序＝`scenarios.yaml` 原文件顺序（`receipt` 域在文件末尾，非按 `SM6` 排在 `SM5` 之后）。

### 一之二 · 每条场景的老技能渲染脚本

老技能入口是 `scripts/home_manager.py`（12 行 thin wrapper → `scripts/home_manager/home_manager.py`）。域内 `sm1-*／sm2-*／sm3-*` 分别转交 `物品／位置／穿搭` 三个 `cli.py`（`home_manager.py:789-799`）。

| 场景 id | 老渲染脚本（文件:行） |
| --- | --- |
| 1-1 | `scripts/物品/cli.py:242`（sm1-add）·`:259`（场景号 `1-1`）·`:651`（`add_form.html`） |
| 1-2 | `scripts/物品/cli.py:646-651`（`"photo_scan": ("拍物品","1-2",…)` → `add_form.html`） |
| 1-3 | `scripts/物品/cli.py:266`（sm1-add-batch）·`:658`（`add_form.html`） |
| 1-4 | `scripts/物品/cli.py:242`·`:259`（带 `backfill_date` → 场景号 `1-4`）·`:651` |
| 2-1 | `scripts/物品/cli.py:277`（sm1-search）·`:292`（`search_list.html`） |
| 2-2 | `scripts/物品/cli.py:295`·`:300`（`detail.html`） |
| 2-3 | `scripts/物品/cli.py:303`·`:305`（`locate.html`） |
| 2-4 | `scripts/物品/cli.py:308`·`:313`（`browse.html`） |
| 2-5 | `scripts/物品/cli.py:283-290`（`--scene 2-5` → `search_list.html`） |
| 2-6 | `scripts/物品/cli.py:316`·`:318`（`duplicates.html`） |
| 3-1 | `scripts/物品/cli.py:321`·`:350`（`_receipt_scene`，"3-1"）→ `:235`（`receipt.html`） |
| 3-2 | `scripts/物品/cli.py:354`·`:371` → `:235`（`receipt.html`） |
| 3-3 | `scripts/物品/cli.py:375`·`:387` → `:235` |
| 3-4 | `scripts/物品/cli.py:391`·`:396` → `:235` |
| 3-5 | `scripts/物品/cli.py:401`·`:426`（`confirm.html`） |
| 3-6 | `scripts/物品/cli.py:439`·`:450`（`undo_select.html`） |
| 3-7 | `scripts/物品/cli.py:460`·`:469` → `:235`（`receipt.html`） |
| 3-8 | `scripts/物品/cli.py:473`·`:490` → `:235` |
| 4-1 | `scripts/物品/cli.py:501`·`:503`（`tag_manage.html`） |
| 4-2 | `scripts/物品/cli.py:518`·`:521`（`category_manage.html`） |
| 4-3 | `scripts/物品/cli.py:512`·`:515`（`tag_manage.html`） |
| 5-1 | `scripts/物品/cli.py:534`·`:538`（`photos.html`） |
| 5-2 | `scripts/物品/cli.py:541`·`:548`（`photos.html`） |
| 5-3 | `scripts/物品/cli.py:551`·`:553`（`photo_wall.html`） |
| 6-1 | `scripts/物品/cli.py:556`·`:558`（`inventory_round.html`） |
| 6-2 | `scripts/物品/cli.py:579`·`:584`（`inventory_diff.html`） |
| 6-3 | `scripts/物品/cli.py:596`·`:598`（`inventory_records.html`） |
| 6-4 | `scripts/物品/cli.py:601`·`:603`（`move_checklist.html`） |
| 7-1 | `scripts/物品/cli.py:616`·`:620`（`history.html`） |
| SM2-1 | `scripts/位置/cli.py:94`·`:101`（`location_manage.html`）；场景号 `scripts/位置/scenes.py:16` |
| SM2-2 | `scripts/位置/cli.py:201`·`:206`（`fixed_spot.html`）；`scenes.py:17` |
| SM2-3 | `scripts/位置/cli.py:230`·`:239`（`suggest_storage.html`）；`scenes.py:15` |
| SM2-4 | `scripts/位置/cli.py:83`·`:90`（`space_view.html`）；`scenes.py:14` |
| SM3-1 | `scripts/穿搭/cli.py:112`（`outfit_picker.html`，场景号 SM3-1） |
| SM3-2 | `scripts/穿搭/cli.py:113`（`wardrobe_analyze.html`） |
| SM3-3 | `scripts/穿搭/cli.py:114`（`wardrobe_season.html`） |
| SM3-4 | `scripts/穿搭/cli.py:115`（`travel_trip.html`）；payload 场景号亦见 `scripts/联动/ops.py:51` |
| SM3-5 | `scripts/穿搭/cli.py:116`（`trip_outfit_plan.html`） |
| SM4-1 | `scripts/home_manager/home_manager.py:482-489`（`stats/overview.html`，payload `scripts/stats/overview.py`） |
| SM4-2 | `scripts/home_manager/home_manager.py:490-500`（`stats/idle.html`，payload `scripts/stats/idle.py`） |
| SM4-3 | `scripts/home_manager/home_manager.py:471-481`（`stats/expiring.html`，payload `scripts/stats/expiring.py`） |
| SM4-4 | `scripts/home_manager/home_manager.py:501-508`（`stats/inventory_stat.html`，payload `scripts/stats/inventory_stat.py`） |
| SM5-1 | `scripts/快递购物/cli.py:110`（`list.html`） |
| SM5-2 | `scripts/快递购物/cli.py:149`（`missing.html`） |
| SM5-3 | `scripts/快递购物/cli.py:175`（`express.html`）；场景号亦见 `scripts/快递购物/ops.py:341` |
| SM5-4 | `scripts/快递购物/cli.py:201`（`stock.html`）；`ops.py:422` |
| SM7-1 | `scripts/home_manager/home_manager.py:782-785`（`family_borrow.html`，**仅 `--output` 时**）；payload `scripts/家庭协作/family_ops.py:371` |
| SM7-2 | `scripts/home_manager/home_manager.py:718-722`（`family_members.html`，**仅 `--output` 时**）；payload `family_ops.py:397` |
| SM8-1 | 模板助手 `scripts/render_开始使用.py:139` `emit_sm8()`（前缀「开始使用/」）；payload `scripts/开始使用/cli.py:71-75`；**生产调用点未查到**（详见 §四） |
| SM8-2 | 同上；`health_report.html` 在 `scripts/` 内**零引用**（只出现在 SKILL.md／`scenes/SM8.yaml:46`／`references/scenarios.yaml:913`／tests） |
| SM8-3 | 同 SM8-1（`backup_receipt.html`）；`scripts/开始使用/cli.py:85-93` 只打 JSON |
| SM8-4 | 同 SM8-1（`import_restore.html`）；`scripts/开始使用/cli.py:95-100` 只打 JSON |
| SM9-1 | `scripts/联动/cli.py:43-46`（`link_overview.html`） |
| SM9-2 | `scripts/联动/cli.py:50-62`（`link_food.html`）；数据 `scripts/联动/ops.py:29`（`"scene": "SM9-2"`） |
| SM9-3 | `scripts/联动/cli.py:67-79`（`link_price.html`）；`ops.py:40`（`"scene": "SM9-3"`） |
| SM6-1 | `scripts/票据凭证/cli.py:125-129`（`purchase_records.html`） |
| SM6-2 | `scripts/票据凭证/cli.py:126`（默认场景号 SM6-1，`SKILL.md:197` 传 `--scene SM6-2`）·`:129` |
| SM6-3 | `scripts/票据凭证/cli.py:158-161`（`purchase_records.html`） |
| SM6-4 | `scripts/票据凭证/cli.py:129`（同 list 路径，`SKILL.md:199` 传 `--scene SM6-4`） |
| SM6-5 | `scripts/票据凭证/cli.py:147-151` → `_receipt()` `:102-112`：**JSON 回执，不落 HTML** |
| SM6-6 | `scripts/票据凭证/cli.py:171-174`（`warranty.html`） |
| SM6-7 | `scripts/票据凭证/cli.py:189-190`（**JSON 回执**） |
| SM6-8 | `scripts/票据凭证/cli.py:207-208`（**JSON 回执**） |
| SM6-9 | `scripts/票据凭证/cli.py:189`（`kind=="保养"` → 场景号 SM6-9）·`:190`（**JSON 回执**） |
| SM6-10 | `scripts/票据凭证/cli.py:223-224`（**JSON 回执**） |
| SM6-11 | `scripts/票据凭证/cli.py:235-238`（`certificates.html`） |
| SM6-12 | `scripts/票据凭证/cli.py:254-255`（**JSON 回执**，默认场景号 SM6-12） |
| SM6-13 | `scripts/票据凭证/cli.py:254-255`（`cert add --photo` 同一路径；`SKILL.md:208` 传 `--scene SM6-13`） |
| SM6-14 | `scripts/票据凭证/cli.py:254-255`（`SKILL.md:209` 传 `--scene SM6-14`） |
| SM6-15 | `scripts/票据凭证/cli.py:266-267`（`accounts.html`） |
| SM6-16 | `scripts/票据凭证/cli.py:282-283`（**JSON 回执**） |
| SM6-17 | `scripts/票据凭证/cli.py:313-314`（**JSON 回执**） |
| SM6-18 | `scripts/票据凭证/cli.py:298-300`（**JSON 回执**，仅对话回显） |

模板装载统一走 `scripts/render/__init__.py:66`（读 `templates/` 下同名文件）；域前缀由 `scripts/render_物品.py:62-70`（`物品/`）、`scripts/render_位置.py:61-69`（`位置/`）、`scripts/render_快递购物.py`（`快递购物/`）、`scripts/render_穿搭.py`、`scripts/render_开始使用.py:139-147`（`开始使用/`）、`scripts/render_联动.py`、`scripts/render_票据凭证.py` 各自加。

---

## 二 · 按 9 域汇总

| 域 key | 域名 | 场景数 | 老模板数（去重） | 新模板数（去重） | 缺口条数(新无实现+新有模板但无分派) | 覆盖状态分布 |
| --- | --- | --- | --- | --- | --- | --- |
| `items` | 物品管理 | 29 | 19 | 7 | 0 | 新有专用页 1；新共用页 28；新有模板但无分派 0；新无实现 0 |
| `space` | 空间与位置 | 4 | 4 | 2 | 0 | 新有专用页 0；新共用页 4；新有模板但无分派 0；新无实现 0 |
| `outfit` | 穿搭出行 | 5 | 5 | 2 | 0 | 新有专用页 1；新共用页 4；新有模板但无分派 0；新无实现 0 |
| `stats` | 统计总览 | 4 | 4 | 2 | 0 | 新有专用页 0；新共用页 4；新有模板但无分派 0；新无实现 0 |
| `express` | 快递购物 | 4 | 4 | 1 | 0 | 新有专用页 0；新共用页 4；新有模板但无分派 0；新无实现 0 |
| `receipt` | 票据凭证 | 18 | 4 | 2 | 0 | 新有专用页 0；新共用页 18；新有模板但无分派 0；新无实现 0 |
| `family` | 家庭协作 | 2 | 2 | 1 | 0 | 新有专用页 0；新共用页 2；新有模板但无分派 0；新无实现 0 |
| `setup` | 开始使用 | 4 | 4 | 2 | 0 | 新有专用页 0；新共用页 4；新有模板但无分派 0；新无实现 0 |
| `link` | 联动功能 | 3 | 3 | 0 | 3 | 新有专用页 0；新共用页 0；新有模板但无分派 0；新无实现 3 |

合计与口径说明：场景 73。**老模板**：域内去重相加 19+4+5+4+4+4+2+4+3＝49，与全域去重 49 相等，说明没有跨域共用的老模板。**新模板**：域内去重相加 7+2+2+2+1+2+1+2+0＝19，而全域去重是 21——差 2 的来历是 ①`care_query` 同时服务 `family`（SM7-1／SM7-2）与 `setup`（SM8-2）两域，两域各计一次（多算 1）；②全域 21 个里有 3 个（`tag_query`、`shopping_receipt`、`help`）不被任何场景走到，故 18（被场景用到的模板，全域去重）＋1（跨域重复计）＝19。**缺口**：3 条全部落在 `link`（SM9-1／SM9-2／SM9-3），其余 8 域各 0 条，**全 9 域缺口合计 3 条**。

### 二之二 · `type` 字段频次表（按取值原文）

| type 取值 | 条数 |
| --- | --- |
| `采集+回执` | 24 |
| `查看+选择+回执` | 14 |
| `查看` | 13 |
| `查看+回执` | 8 |
| `查看+选择` | 6 |
| `选择+回执` | 5 |
| `向导+回执` | 2 |
| `向导+采集+回执` | 1 |
| **合计** | **73** |

按**字样**再拆一层（一条可同时含多个字样，故和不等于 73）：

| 字样 | 出现条数 |
| --- | --- |
| 回执 | 54 |
| 查看 | 41 |
| 采集 | 25 |
| 选择 | 25 |
| 向导 | 3 |

未出现其它字样（该字段取值只有上表 8 种）。

---

## 三 · 新技能 21 个模板的用法（背景描述写「20 个」；实测 21 个，差额＝`help.html`）

「服务哪些唤醒词」= `WAKE_TABLE` 里映射到该模板的全部唤醒词（91 条全量，含 73 条场景之外的 20 条）；「服务哪些场景 id」= 73 条场景里走该模板的（`—` 表示没有场景走它）。

| 模板文件 | 服务哪些唤醒词 | 服务哪些场景 id | 行数 | 字节数 |
| --- | --- | --- | --- | --- |
| `care_query.html` | 查异常／借用／家人档案 | SM7-1、SM7-2、SM8-2 | 16 | 277 |
| `care_receipt.html` | 首次使用／备份导出／导入恢复 | SM8-1、SM8-3、SM8-4 | 16 | 277 |
| `help.html` | 居家管家 帮助／居家管家帮助／居家管家能做什么 | （无场景） | 16 | 288 |
| `inventory_records.html` | 盘点记录 | 6-3 | 16 | 284 |
| `inventory_round.html` | 盘物品／盘全部／差异处理／搬家盘点／盘点 | 6-1、6-2、6-4 | 16 | 282 |
| `item_detail.html` | 看物品(HTML)／看物品／查看照片／历史 | 2-2、5-1、7-1 | 16 | 272 |
| `item_receipt.html` | 录物品／拍物品／批量录入／补录 | 1-1、1-2、1-3、1-4 | 16 | 281 |
| `item_search.html` | 查物品(HTML)／查物品／紧急定位／筛选浏览／拍照找物品／查重复／照片墙 | 2-1、2-3、2-4、2-5、2-6、5-3 | 16 | 272 |
| `item_update_receipt.html` | 改物品／移物品／补物品／减物品／标物品／废物品／借物品／修物品／合并物品／撤销操作／物品关联／管照片／数量变更／状态变更 | 3-1、3-2、3-3、3-4、3-5、3-6、3-7、3-8、5-2 | 16 | 284 |
| `location_query.html` | 推位置／找位置／收纳建议／空间视图 | SM2-3、SM2-4 | 16 | 281 |
| `location_receipt.html` | 管位置／固定位 | SM2-1、SM2-2 | 16 | 281 |
| `outfit_pick.html` | 穿什么／衣橱分析／换季／旅行穿搭 | SM3-1、SM3-2、SM3-3、SM3-5 | 16 | 278 |
| `shopping_query.html` | 查快递／购物清单／缺货检测／囤货盘点 | SM5-1、SM5-2、SM5-3、SM5-4 | 16 | 281 |
| `shopping_receipt.html` | 改购物清单 | （无场景） | 16 | 281 |
| `stats_alert.html` | 查低频／查过期／查闲置 | SM4-2、SM4-3 | 16 | 278 |
| `stats_overview.html` | 统物品(HTML)／统物品／查高频／盘点统计 | SM4-1、SM4-4 | 16 | 281 |
| `tag_query.html` | 看标签 | （无场景） | 16 | 270 |
| `tag_receipt.html` | 合标签／管标签／管分类／整理建议 | 4-1、4-2、4-3 | 16 | 282 |
| `ticket_query.html` | 查账号／查购买记录／查上月购买／查今年花费／查退货窗口／查保修状态／查证件到期 | SM6-1、SM6-2、SM6-3、SM6-4、SM6-6、SM6-11、SM6-15 | 16 | 279 |
| `ticket_receipt.html` | 存账号／改账号／看密码／登记购买记录／登记保修／记录维修／设置保养周期／执行保养／登记证件／证件归档／更新证件 | SM6-5、SM6-7、SM6-8、SM6-9、SM6-10、SM6-12、SM6-13、SM6-14、SM6-16、SM6-17、SM6-18 | 16 | 279 |
| `trip_receipt.html` | 带物品／归物品 | SM3-4 | 16 | 278 |

21 个模板全部为 16 行、270–288 字节的骨架页，各自含 `<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->`／`<!--CONTENT-->` 三标记各 1 次（实测三标记计数均为 1，`fillTemplate()` 因此不会抛 `HOME_MARKER_INVALID`）；页面内容由 `renderEnvelopeHtml()`（`src/render/html.ts:27-47`）按 envelope 形状生成，模板本身不写业务内容。

---

## 四 · 事实与不确定

### 4.1 实际读过的文件清单（路径＋行数；行数按 UTF-8 真实行数、不含末尾换行）

新技能 `D:\ilife\packages\skill-home\`：

| 文件 | 行数 | 字节 | 读法 |
| --- | --- | --- | --- |
| `src/help/scenarios.yaml` | 1283 | 46267 | 全文 read |
| `src/policy/wakewords.ts` | 137 | 9697 | 全文 read |
| `src/cli/cmd_read.ts` | 884 | 54212 | 全文 read（1-828 ＋ 829-884 两段） |
| `src/render/templates.ts` | 68 | 2592 | 全文 read |
| `src/render/views.ts` | 77 | 3491 | 全文 read |
| `src/render/html.ts` | 76 | 4840 | 全文 read |
| `templates/*.html`（21 个） | 各 16 | 270–288 | 逐个脚本列元数据 ＋ 三标记计数 |

老技能 `D:\2Study\StudyNotes\SKILLS\居家管家\`：

| 文件 | 行数 | 字节 | 读法 |
| --- | --- | --- | --- |
| `references/scenarios.yaml` | 1283 | 46267 | `fc /b` 与新版逐字节比对（无差异） |
| `SKILL.md` | 801 | 64110 | 只读唤醒词表（`:122-216`）与 SM8／票据凭证章节 |
| `scripts/home_manager.py` | 12 | 337 | 全文 read（thin wrapper） |
| `scripts/home_manager/home_manager.py` | 807 | 39332 | 分段 read（`:240-359`、`:455-514`、`:655-694`、`:705-744`、`:780-804`）＋ 关键词 grep |
| `scripts/物品/cli.py` | 684 | 38009 | 分段 read（`:205-249`）＋ 全文件 grep（emit/scene 号） |
| `scripts/render_物品.py` | 102 | 4407 | 分段 read（`:60-102`） |
| `scripts/位置/cli.py` | 258 | 15361 | 分段 read（`:50-100`）＋ grep |
| `scripts/位置/scenes.py` | 40 | 1434 | grep（`:14-17` 场景号表） |
| `scripts/render_位置.py` | 101 | 4452 | 分段 read（`:55-99`） |
| `scripts/位置/ops.py` | 679 | 29318 | grep |
| `scripts/穿搭/cli.py` | 125 | 6180 | grep（`:112-116` 模板表） |
| `scripts/render_穿搭.py` | 94 | 4048 | grep |
| `scripts/快递购物/cli.py` | 234 | 13327 | 分段 read（`:60-115`）＋ grep |
| `scripts/快递购物/ops.py` | 463 | 19225 | grep（`:341`、`:422` 场景号） |
| `scripts/render_快递购物.py` | 95 | 4109 | grep |
| `scripts/票据凭证/cli.py` | 498 | 22434 | 分段 read（`:30-100`、`:100-179`）＋ 全文件 grep（`_emit`／`_print_json` 全量行号） |
| `scripts/票据凭证/payloads.py` | 244 | 10020 | grep |
| `scripts/render_票据凭证.py` | 36 | 1422 | grep |
| `scripts/家庭协作/family_ops.py` | 401 | 15892 | grep（`:371`、`:397` 场景号） |
| `scripts/开始使用/cli.py` | 106 | 4955 | grep（`_emit` 调用清单） |
| `scripts/render_开始使用.py` | 185 | 7657 | 全文 read |
| `scripts/联动/cli.py` | 97 | 4903 | grep（`:43-79` 三处 emit） |
| `scripts/联动/ops.py` | 312 | 14621 | grep（`:29`、`:40`、`:51`） |
| `scripts/render_联动.py` | 94 | 4153 | grep |
| `scripts/render/__init__.py` | 248 | 9892 | 分段 read（`:1-34`）＋ grep（`:35-98` 模板→命令名表、`:132-146` 输出命名） |
| `scripts/help_center.py` | 133 | 4853 | grep（`:27`、`:130-133`） |
| `templates/` 全树（67 个 `.html`） | — | 612463 合计 | 仅脚本列路径／字节／行数，未逐个通读 |

**未读（按本次约束跳过）**：`.个人想法目录禁止看里面文件`（全程未进入、未列目录）、`.scratch`、`.notes`、`.db`、`.bak`、`.pytest_cache`；另 `output/`、`_grilling/`、`features/`、`docs/reviews/` 只按文件名索引，未逐篇读。

### 4.2 「未查到」的说明（查了什么、在哪查）

1. **SM8 四条场景（SM8-1..SM8-4）在老技能里的生产渲染调用点：未查到。** 查法：在 `scripts/` 全树（含 `scripts/start` 之外所有子目录）grep `emit_sm8`、`first_use_wizard`、`health_report`、`backup_receipt`、`import_restore`、`渲染`。命中只有：`scripts/render_开始使用.py:139`（函数定义本身）、`tests/test_开始使用.py:611`（测试调用）、`SKILL.md:726/734/742` 与 `SKILL.md:153/288/694`（文档）、`scenes/SM8.yaml:46`、`references/scenarios.yaml:913`（数据）。`scripts/开始使用/cli.py` 全程只 `print` JSON 信封（`:22 _emit`），不调渲染。**结论**：4 个 SM8 模板文件都在，但没有可执行路径渲染它们。
2. **新技能里「有模板但命令走不到」的模板：未查到（判 0 条）。** 查法：`templates/` 目录 21 个文件名 ↔ `HOME_TEMPLATES`（`templates.ts:7-29`，21 名）↔ `templateFor()` 的 21 个 `case`（`:33-58`）↔ `WAKE_TABLE` 的 91 条唤醒词（`wakewords.ts:20-112`）双向比对，三者一一对应，每个 key 至少被 1 条唤醒词可达；`cmd_read.ts` 对全部 21 个 key 都有 `case` 分派（`:175-789`）。故 `新有模板但无分派` 计 0 条。附带事实：`tag_query`（唯一唤醒词 `看标签`）、`shopping_receipt`（唯一唤醒词 `改购物清单`）、`help`（3 条 HELP 唤醒词）**可达但 73 条场景里没有一条走它们**（见 §三）。
3. **老技能 `templates/位置/receipt.html`、`templates/位置/confirm.html`、各域 `error*.html` 的场景归属：未查到场景级映射。** 它们在 `scripts/render/__init__.py:70-72/94-98` 有登记，但 `references/scenarios.yaml` 的 73 条没有一条以它们为 `html.template`；它们是错误回执／位置写类回执件（如 `scripts/位置/cli.py:112/124/149/193/213/222`）。上面 §一之二 里位置域写类场景我按 `scenes.py` 的场景号归属到 `sm2-manage`／`sm2-fixed`（其模板是 `位置/location_manage.html`／`位置/fixed_spot.html`），写类回执走的是 `位置/receipt.html`——这一点在表里以「场景号」而非「最终落盘模板」标注，请按此理解。
4. **老技能 `物品/receipt.html` 被多条场景共用**：`3-2/3-3/3-4/3-8` 等写类场景在 yaml 里写的却是各自专件（`items/receipt.html` 只有一条路径），实测 `scripts/物品/cli.py:235` 统一用 `receipt.html`；yaml 的 `物品/receipt.html` 与之一致，无矛盾。
5. **未查到**新技能里「模板可达、但 `cmd_read` 的该 `case` 分支会主动 `fail()` 导致渲染必不成立」的场景。逐 key 看了分派分支：`home.help.lookup`（`:785-788`）与 `home.care.query/write` 的 `backup-list`／`backup`／`export`／`import*`（`:751-753`、`:779-782`）在 `dispatch()` 里主动 `fail(1)`，但它们在 `main()` 里由 `dispatchHelp()`／`dispatchBackup()` **提前处理**（`:841-842`），并不构成「场景无落点」。这三条中 `backup`／`export`／`import` 对应 SM8-3／SM8-4，走 `dispatchBackup()` → `home.care.write` → `care_receipt.html`，仍算有落点。

### 4.3 与背景描述不符的实测发现

1. **新技能模板数是 21 个，不是 20 个。** `templates/` 实测 21 个 `.html`；`HOME_TEMPLATES`（`templates.ts:7-29`）与 `templates.ts:1` 的文件头注释都自称「21 模板」。差额 1 个＝`help.html`（HELP 全壳页，服务 `home.help.lookup`）；把 `help.html` 排除后其余 20 个与背景数字一致——背景的「20 个」只有这一种读法能对上。
2. 场景数 **73**、域 **9** 个、二级组 **30** 组，**与背景一致**（实测）。域 key 顺序为 `items,space,outfit,stats,express,receipt,family,setup,link`，但 yaml 里 `receipt` 域的 18 条排在文件最后（不在 `express` 之后），上述矩阵行序保持原文件顺序。
3. 新技能 `src/help/scenarios.yaml` 与老技能 `references/scenarios.yaml` **逐字节相同**（`fc /b` 报「no differences」；两者均 46267 字节／1283 行）。「老骨架原样副本」成立。
4. 新技能 `WAKE_TABLE` 共 **91** 条唤醒词（不是 73），其中 **3 条**（`联动总览`／`记到卡路里`／`记到记账`）在 `wakewords.ts:115` 的 `DEPRECATED_PHRASES` 里显式废弃，`routeWakeword()` 遇 `POLICY_NO_MATCH` 即抛（`:119-124`）——这正是 SM9-1/2/3 三条 `新无实现` 的判据。另有 **20** 条唤醒词在 73 条场景里没有对应条目（`居家管家 帮助`／`居家管家帮助`／`居家管家能做什么`／`查物品(HTML)`／`看物品(HTML)`／`统物品(HTML)`／`补物品`／`减物品`／`废物品`／`借物品`／`修物品`／`盘物品`／`盘全部`／`查高频`／`查低频`／`看标签`／`合标签`／`推位置`／`找位置`／`改购物清单`）。
5. **`借用` 唤醒词只通读侧**：`wakewords.ts:58` 把 `借用` 路由到 `home.care.query`（kind=borrow），而写侧 `home.care.write` 的 kind=borrow 分支（`cmd_read.ts:757-771`，借出/借入/归还）**没有任何唤醒词可达**。SM7-1 标题是「借用管理(借出/借入/归还/催还)」，新技能里只能靠调用方直传 key＋params 才能触达写侧。
6. **默认不落 HTML**：新技能只在两种情况下把模板物化成文件——① `--html <路径>`（所有 key 通用，`cmd_read.ts:850-859`）；② HELP 键的 `delivery`（`:860-868`）。也就是说 §一／§三 的「新模板」是**渲染落点**判定，常规跑一条 `home-cmd-read` 只会得到 stdout 的 envelope JSON。老技能相反：写类场景默认落 HTML（`scripts/render/__init__.py:132-146` 自动命名）。这是两代技能的一处语义差。
7. **老技能 49 个 yaml 引用模板全部存在**；老 `templates/` 全树 67 个 `.html`，另 **18 个**是 v2.0 前的遗留平铺件：`add_preview.html`、`delivery_check.html`、`expiring_alert.html`、`help_center.html`、`inventory_check.html`、`item_detail.html`、`list_overview.html`、`outfit_picker.html`、`search_results.html`、`travel_trip.html`、`物品/error.html`、`位置/error.html`、`位置/confirm.html`、`位置/receipt.html`、`开始使用/error_receipt.html`、`快递购物/error.html`、`穿搭/error.html`、`联动/error.html`。它们仍被 `home_manager.py` 的 legacy 分支引用（`:253-341` 的 `add`／`search`／`list`／`detail`、`:527-554` 的 outfit／trip、`:557-561` 的 help）。
8. **老技能票据凭证域写类 11 条场景不落 HTML**：SM6-5／7／8／9／10／12／13／14／16／17／18 走 `票据凭证/cli.py:102-112 _receipt()` ＋ `_print_json()`（`:148/190/208/224/255/283/300/314`），只打 JSON 回执；只有 list 类 7 条（SM6-1/2/3/4/6/11/15）走 `_emit()` 渲染那 4 个模板（`:129/161/174/238/267`）。yaml 的 `html.template` 对这 11 条写的是票据凭证域模板，实测老实现并不渲染它。
9. **老技能家庭协作两条场景只在带 `--output` 时落 HTML**（`home_manager.py:718-722`、`:782-785`），不带时只打 JSON；`borrow-add`／`member-add` 等写类分支一律 JSON（`:679-681`、`:739-741`）。
10. 老 `templates/` 的目录形态与背景描述不完全同构：背景说 `templates/<中文域>/<页面>.html`，实测除 7 个中文域目录外，还有 12 个直接躺在 `templates/` 根（`family_borrow.html`、`family_members.html`、`help_center.html` 等）＋1 个英文目录 `stats/`。
11. `SKILL.md` 里还留着一张 95 行的唤醒词索引表（`:122-216`，编号 1–95），其「命令/模板」列与本次 §一之二 的实测一致；新技能 91 条唤醒词与之不是一一对应（老表含 `查高频`／`查低频`／`推位置`／`找位置` 等，新表把其中一部分合并到别的 key，并新增 `查物品(HTML)` 这类变体）。
12. 顺带实测：`packages/skill-home/AGENTS.md` 记 `src/cli/cmd_read.ts`「876 行」，本次实测 **884 行／54212 字节**（node 与 read 工具两种数法一致）；该台账数字已落后于文件现状。

---

## 五 · 复核命令

以下 3 条在 PowerShell 里直接跑（路径固定，无需切目录）。**三条都已在本机实跑过一次，下面的期望值＝实测回显**。

> 坑先记下：`Select-String` 的位置参数第 0 位是 `-Pattern`、不是 `-Path`，所以必须写全 `-Path ... -Pattern ...`；写成 `Select-String $y '^- id: '`（我第一版就这么写的）会把路径当正则、报 `Unrecognized escape sequence \i`，计数回显为空——这不是数据问题。

**① 数场景／域／二级组／老模板去重／type 取值**（实测：场景 73、域行 73、模板引用 73；域去重 9、二级组去重 30、老模板去重 49；type 8 种）

```powershell
$y='D:\ilife\packages\skill-home\src\help\scenarios.yaml'
"场景 $((Select-String -Path $y -Pattern '^- id: ').Count) / 域行 $((Select-String -Path $y -Pattern '^  domain: ').Count) / 模板引用 $((Select-String -Path $y -Pattern '^    template: ').Count)"
"域去重 $((Select-String -Path $y -Pattern '^  domain: ([a-z]+)$' | ForEach-Object { $_.Matches[0].Groups[1].Value } | Sort-Object -Unique).Count)"   # 9
"二级组去重 $((Select-String -Path $y -Pattern '^  sub: (.+)$' | ForEach-Object { $_.Matches[0].Groups[1].Value } | Sort-Object -Unique).Count)"      # 30
"老模板去重 $((Select-String -Path $y -Pattern '^    template: ' | ForEach-Object { $_.Line.Trim() } | Sort-Object -Unique).Count)"                    # 49
Select-String -Path $y -Pattern '^  type: (.+)$' | ForEach-Object { $_.Matches[0].Groups[1].Value } | Group-Object | Sort-Object Count -Descending | Select-Object Count,Name
```

**② 数模板文件数**（实测：新模板 21、老 templates 全树 67）

```powershell
(Get-ChildItem 'D:\ilife\packages\skill-home\templates' -File -Filter *.html).Count                     # 21 新模板（= HOME_TEMPLATES 的 21 名）
(Get-ChildItem 'D:\2Study\StudyNotes\SKILLS\居家管家\templates' -Recurse -File -Filter *.html).Count    # 67 老模板全树（其中 49 个被 73 条场景引用）
```

**③ 数新技能力面**（实测：唤醒词 91、模板名 21、模板分支 21、分派分支 21、废弃词 3）

```powershell
$s='D:\ilife\packages\skill-home\src'
"唤醒词 $((Select-String -Path "$s\policy\wakewords.ts" -Pattern "\{ phrase: '").Count) / 模板名 $((Select-String -Path "$s\render\templates.ts" -Pattern "^  '[a-z_]+',$").Count) / 模板分支 $((Select-String -Path "$s\render\templates.ts" -Pattern "case 'home\.").Count) / 分派分支 $((Select-String -Path "$s\cli\cmd_read.ts" -Pattern "^      case 'home\.").Count)"
(Select-String -Path "$s\policy\wakewords.ts" -Pattern 'DEPRECATED_PHRASES').Line                      # 3 词：联动总览／记到卡路里／记到记账
```

（旧版命令用位置参数 `Select-String $y '...'`，在 Windows PowerShell 与 PowerShell 7 上都把第 0 位绑给 `-Pattern`，会报 `Unrecognized escape sequence \i` 并回显空计数；已改成显式 `-Path`／`-Pattern`。）
