# 居家管家场景页 · 页面册子（票 1）

本册的输入是老技能 `D:\2Study\StudyNotes\SKILLS\居家管家` 的**真页面模板**：事实源 `packages/skill-home/src/help/scenarios.yaml`（73 条场景、49 个被引用的老模板路径），逐个模板打开、逐个渲染脚本对照后登记。

本册只读老技能，不改一行。所有「字段／操作／空态／状态词」都照老模板里**真实出现的字符串**抄写；查不到的写在 §四。

## 一 · 页族册子

**读法（先看这三条，否则下面几列会误读）**

1. 「页族」＝一个老模板路径。老技能里**多条场景共用一页**（例：`物品/add_form.html` 一页吃 5 条场景），所以页族数（49）远小于场景数（73）。
2. 「页面类型」只允许 5 个值，取值规则：**看该族所服务场景在 yaml 里的 `type`，折叠后与模板实测控件核对，不一致以实测为准**。折叠规则：只有一种 type 就取它（`查看`→查看；`采集+回执`→采集＋回执；`选择+回执`→选择＋回执；`向导+回执`→向导）；出现两种以上 → 混合。老技能 49 个页面按本规则落成：**混合 27、查看 11、采集＋回执 6、选择＋回执 3、向导 2**（复算命令见 §五 之 1b）。混合占多数是因为老实现爱把「展示区 ＋ 勾选/采纳控件 ＋ 复制指令出口」压在同一个 `.html` 里——这是它的真实形状，不是分类口径太粗。
3. 老实现的交互闭环是**「页面复制一条中文 prompt → 粘回给 AI 执行」**（出口按钮即 `复制…`），不是网页直接写库。所以「操作」列里大量是复制类按钮；凡写库动作都归到模板生成的 prompt 或 CLI 命令里。

| 老模板路径 | 字节数 | 行数 | 服务场景 id | 服务唤醒词 | 页面类型 | 信息结构：字段 | 信息结构：操作 | 空态／异常态 | 状态词表 | 这一格该确认什么 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `templates/物品/add_form.html` | 12911 | 159 | 1-1,1-2,1-3,1-4,3-1 | 录物品,拍物品,批量录入,补录,改物品 | 采集＋回执 | 名称＊,分类＊,数量,位置（选填）,状态,价格 ¥（选填）,购买日期,过期日期,录入日期（补录）,标签（逗号分隔）,备注；分区「分类分布」；占位文案「物品名称」「选或输入,如 卧室/衣柜」「进口,临期,旗舰款」 | 确认写入／确认变更（按 mode）,全部确认（N 条）,复制数据,复制日志 | 空态：无（表单页）；异常：数据解析失败；必填项标 ＊ 做空值拦截 | 在家/备用/穿着中/旅游中/洗护中/借用中/维修中/已用完/快递中/待处理/已废弃/找不到 | 确认 5 条场景共用一页只靠 `mode` 分流够不够，还是把 3-1 改物品拆成独立页 |
| `templates/物品/browse.html` | 5821 | 60 | 2-4 | 筛选浏览 | 查看 | 计数,分组卡片（名称/ID/位置/数量/状态）,当前分组名 | 全部,分组名（N）,分组切换,排序：相关,复制数据,复制日志 | 空态：无匹配物品；异常：数据解析失败 | 物品状态 | 确认 分组与排序两组控件在新页放在列表上方还是折叠区 |
| `templates/物品/category_manage.html` | 8986 | 104 | 4-2 | 管分类 | 混合 | 分类树（层级 ＋ 每类计数）,操作提示「点击分类名展开/收起 · 右侧 ⋯ 管理操作」,删除拦截说明「有物品的分类不可删」 | ⋯,改名,合并,新建顶级分类,复制数据,复制日志 | 空态：树为空即只有「新建顶级分类」；异常：数据解析失败；拦截态：有物品的分类不可删 | 种子 8 类（只可改不可删） | 确认 分类管理 是独立页还是并入 tag 收口 |
| `templates/物品/confirm.html` | 4873 | 65 | 3-5 | 合并物品 | 选择＋回执 | 标题,引导语,变更前,变更后,逐条 entries（含子标签）,影响说明 impact | 确认,复制数据,复制日志 | 空态：无（确认页）；异常：数据解析失败 | — | 确认 合并预览能否复用写类回执页，还是保留独立确认页 |
| `templates/物品/detail.html` | 8357 | 85 | 2-2 | 看物品 | 查看 | ID,分类,位置,标签,价格,备注,最后使用,录入时间；关联物品,同位置邻居,相似物品（同分类）,快捷操作,操作历史 | 改,移,补,减,标,废,标记使用,查看完整历史,查看照片,复制数据,复制日志 | 空态：未找到该物品；关联空态「「钥匙旁边就是门禁卡」——找相关物品看这里」；操作历史空态「暂无记录（后续操作自动留痕）」；异常：数据解析失败 | 物品状态 | 确认 关联／邻居／相似 三块是本期做还是留给后续票 |
| `templates/物品/duplicates.html` | 5921 | 70 | 2-6 | 查重复 | 查看 | 位置/数量,分类,价格,组内件数（N 件重复）,首件状态 | 独立录入,复制合并建议,复制数据,复制日志 | 空态：标题落在「没有发现重复物品」；异常：数据解析失败 | 物品状态 | 确认 查重复 并入物品搜索页还是保留独立页 |
| `templates/物品/history.html` | 5869 | 70 | 7-1 | 历史 | 查看 | 位置轨迹,时间线（N 条）,事件条目（类型/摘要/diff 展开）,已撤销标记 | 全部,类型筛选,展开详情,撤销,复制数据,复制日志 | 空态：暂无事件；异常：数据解析失败 | 事件类型：状态变更/盘点/差异处理…（老 `物品/ops.py:1485`）；已撤销 | 确认 事件类型词表以哪一份代码为准 |
| `templates/物品/inventory_diff.html` | 8367 | 98 | 6-2 | 差异处理 | 混合 | 差异分组 missing/extra/diff/pending,所属盘点记录 record,动作集 actions；输入「新位置（如 卧室/柜子）」,批量行「物品名/分类/数量（如: 遥控器,数码与电子,1）」 | 按实际更新,忽略,录入为新物品,标记复查（下次盘点置顶）,先不处理,批量确认,复制数据,复制日志 | 空态：该记录没有未处理差异。；异常：数据解析失败 | 差异四态：缺/多/异/待确认（页内计数） | 确认 四态的文案与处理动作是否原样搬 |
| `templates/物品/inventory_records.html` | 5288 | 59 | 6-3 | 盘点记录 | 查看 | 历史盘点（N）,发生时间,缺/多/异/待确认计数,记录状态 | 展开详情,处理差异,复查,开始盘点,复制数据,复制日志 | 空态：还没有盘点记录；异常：数据解析失败 | 盘点记录状态：进行中/已完成/已处理/已复查（老 `物品/events.py:60`） | 确认 盘点记录与盘点统计是否同一页两种视图 |
| `templates/物品/inventory_round.html` | 10061 | 111 | 6-1 | 盘点 | 采集＋回执 | 范围 scope,上次待复查（置顶）,核对清单（ID/位置/数量/状态）,三态判定,数量修正,状态修正（下拉）,新位置 | 在/不在/不确定,发现清单外物品,状态不变＋状态下拉,保存进度,确认提交（含差异）,复制数据,复制日志 | 空态：范围内没有物品；异常：数据解析失败 | 三态：在/不在/不确定；状态修正可选：状态不变/在家/备用/借用中/维修中/找不到/已废弃 | 确认 三态 ＋ 数量修正 ＋ 状态修正 是否同页一次收全 |
| `templates/物品/locate.html` | 5073 | 69 | 2-3 | 紧急定位 | 查看 | 置顶卡片（照片/名称/ID/位置/数量/状态）,查询词 query | 我找到了,分享位置,扩大寻找,复制数据,复制日志 | 空态：没找到 ＋「试试点下方「扩大寻找」,或考虑是不是该录入。」；异常：数据解析失败 | 物品状态 | 确认 紧急定位并进物品详情还是独立页 |
| `templates/物品/move_checklist.html` | 8892 | 92 | 6-4 | 搬家盘点 | 选择＋回执 | 分组（每组建数）,物品（ID/名称/位置/数量）,二态标记 | 全带走,全不带走,带走,不带走,统一确认,复制清单,复制数据,复制日志 | 空态：无空态文案；异常：数据解析失败 | 带走/不带走 | 确认 yaml 标「向导+采集+回执」但模板无步骤条（只有二态标记＋统一确认）——按哪边建 |
| `templates/物品/photo_wall.html` | 5733 | 65 | 5-3 | 照片墙 | 查看 | 分组（分类/位置）,照片网格,无照片件数 | 全部,类型筛选,去补拍,按位置浏览,点图＝复制详情 prompt,复制数据,复制日志 | 空态：没有带照片的物品；补充态「还有 N 件物品没有照片 → 去补拍」；异常：数据解析失败 | 照片类型：普通/说明书-使用/说明书-安装/说明书-保养（老 `物品/events.py:54`） | 确认 照片类型四值在新实现里落在哪个字段 |
| `templates/物品/photos.html` | 6531 | 70 | 5-1,5-2 | 查看照片,管照片 | 混合 | 物品（名称/ID）,照片列表（顺序/类型/主图标记）,当前 mode | 全部,类型筛选,确认顺序变更,加图·补拍,删除选中,下载照片,复制数据,复制日志 | 空态：暂无照片。点下方「补拍」给这件物品留影。；异常：数据解析失败 | 照片类型四值（同上） | 确认 查看照片与管照片共用一页时的默认 mode 与权限边界 |
| `templates/物品/relations.html` | 4271 | 54 | 3-7 | 物品关联 | 采集＋回执 | 主物品,关联列表（是否反向/关系类型/对方名称/对方 ID） | 解除,设置关联,复制数据,复制日志 | 空态：暂无关联。配件/配套关系可在这里建立。；建立区占位「告诉我关联关系,例如:「这个充电器是 Mate60 的」→ 配件」；异常：数据解析失败 | 关系类型：配件/配套/替代/同捆/常用搭配（yaml 3-7 提示词） | 确认 关系类型五值的唯一事实源在哪（老 `scripts/` 里未查到枚举） |
| `templates/物品/search_list.html` | 7495 | 77 | 2-1,2-5 | 查物品,拍照找物品 | 查看 | 结果卡片（名称/ID/照片/位置/数量/状态/匹配 %）,摘要指标,查询词,本地筛选框 | 搜索,本地筛选,细化筛选,拍照找物品,录入新物品（未命中引导）,复制数据,复制日志 | 空态：未命中 → 录入新物品（未命中引导）；异常：数据解析失败 | 物品状态；匹配度 % | 确认「未命中引导」是否强制出现，以及匹配度 % 怎么算 |
| `templates/物品/tag_manage.html` | 5832 | 64 | 4-1,4-3 | 管标签,整理建议 | 混合 | 标签总览（标签名/件数/使用次数）,相似标签对（相似度 %）,未使用标签 unused,当前 mode | 改名,合并,一键清理,忽略,整理建议,新建标签,复制数据,复制日志 | 空态：暂无标签；无可清理标签时不出「一键清理」；异常：数据解析失败 | 相似度＝max(0,100−distance×40)%（页内公式） | 确认 整理建议（AI 检测）与管标签是否同页 |
| `templates/物品/undo_select.html` | 4606 | 59 | 3-6 | 撤销操作 | 选择＋回执 | 可撤销操作（最近 N 条）,事件类型,通用操作分组 | 勾选事件,确认撤销勾选项,复制数据,复制日志 | 空态：暂无可撤销操作；拦截态「请先勾选要撤销的操作」；异常：数据解析失败 | 事件类型 | 确认 撤销粒度按事件还是按操作批次 |
| `templates/物品/receipt.html` | 7454 | 81 | 3-2,3-3,3-4,3-8 | 移物品,数量变更,状态变更,标物品 | 混合 | 变更结果（字段级 before→after）,当前状态（名称/ID/分类/位置×数量/状态/标签/备注）,标签变更（去除/新增）,处理明细 steps,收尾语 next | 撤销,查看详情,复制数据,复制日志 | 空态：无字段级变化；标签空值（无）；异常：数据解析失败 | 物品状态；标签加/去 | 确认 写类 4 条共用一页是否保留，以及归档文件名丢场景名的问题（见 §三 ⑤） |
| `templates/位置/fixed_spot.html` | 13823 | 157 | SM2-2 | 固定位 | 采集＋回执 | 现有固定位清单（名称/ID/当前活跃位置/固定位）,表单「物品（常用件名称或 ID）」「固定位」 | ＋ 设置固定位,解除,复制 prompt,关闭,复制数据,复制日志 | 空态：还没有固定位 📌 ＋「常用件（钥匙/充电器/药箱…）设个固定位,紧急找东西一屏直达。」；异常：数据解析失败／数据校验失败；表单空值拦截 | 位置状态（非「在家」时在括号里标出） | 确认 固定位归位置写类收口还是物品写类 |
| `templates/位置/location_manage.html` | 17094 | 217 | SM2-1 | 管位置 | 混合 | 位置树 nodes,已有路径 paths,目标 target,受影响物品 items_affected,相似位置组 similar_groups；表单「源位置」「新位置路径（如: 客厅/电视柜, 支持多级）」 | ＋ 新建位置,▾,改名,删除,确认合并,复制 prompt,关闭,复制数据,复制日志 | 空态：还没有位置 🗺️ ＋「先建第一个位置（如「客厅/电视柜」）,录物品时也能顺手建。」；异常：数据解析失败／数据校验失败 | 位置路径多级（如 客厅/电视柜） | 确认 相似位置检测的阈值与合并语义 |
| `templates/位置/space_view.html` | 15042 | 142 | SM2-4 | 空间视图 | 查看 | 面包屑,子层 children,当前层物品（名称/数量/状态）,当前层名/路径,路径总数,分层空态提示 | 下钻,移,补,减,复制「建位置」/「收纳建议」,复制收纳建议,复制数据,复制日志 | 空态：这里还没有东西 🏠（全屋与单层两套文案）；异常：数据解析失败／数据校验失败 | 位置状态（缺省 在家） | 确认 下钻层级与面包屑口径 |
| `templates/位置/suggest_storage.html` | 14014 | 149 | SM2-3 | 收纳建议 | 混合 | 推荐列表（推荐位置/理由/备选位置）,批量标记 batch,总量 total,当前 mode,无依据态 | 采纳（去移物品）,设为固定位,换一个建议,🔍 找没固定位的常用件,复制收纳建议,复制数据,复制日志 | 空态：「🎉 都有固定位了」／「没有可建议的物品」；无依据态「暂无依据」＋「该物品还没有位置记录」；备选空态「暂无其他备选」；异常：数据解析失败／数据校验失败 | — | 确认 AI 推荐的依据字段（常用位置/关联物品）从哪来 |
| `templates/穿搭/outfit_picker.html` | 19077 | 237 | SM3-1 | 穿什么 | 混合 | 多部位槽位（外层/内搭）,风格标签,推荐理由,备选组合,场合与天气 | 槽位切换（外层/内搭）,‹ 上一套,换一套 ›,今天穿这套,✕,复制数据,复制日志 | 空态：无空态文案；异常：数据解析失败／数据校验失败 | 场合：上班/约会/运动/家居/正式/自定义（yaml SM3-1） | 确认 备选组合横滑这一交互是否保留 |
| `templates/穿搭/wardrobe_analyze.html` | 8327 | 123 | SM3-2 | 衣橱分析 | 混合 | 衣橱构成 distribution,闲置清单 dormant,AI 建议一句 advice,汇总 | 标记废弃,送人（废弃＋备注）,先不处理,缺口加入购物清单,复制数据,复制日志 | 空态：衣橱还没有在家衣物。；无闲置态：衣橱状态良好,没有长期闲置衣物。；异常：数据解析失败／数据校验失败 | 物品状态；「在家」口径 | 确认 闲置估算口径如何「诚实标注」 |
| `templates/穿搭/wardrobe_season.html` | 7510 | 117 | SM3-3 | 换季 | 采集＋回执 | 季节 season,操作（收纳/拿出）,季节衣物清单（名称/ID/位置）,收纳位置下拉,候选位置 storage_places,汇总 | 收纳位置下拉,自定义（复制回执时填）,全选/全不选,确认收纳／确认拿出,复制数据,复制日志 | 空态：没有带「季节」标签的在家衣物。＋「建议先给衣物打季节标签（标物品）,再来换季。」；异常：数据解析失败／数据校验失败 | 物品状态 ＋ 去「已收纳」标签；收入后状态 → 在家 | 确认「已收纳」标签名与季节标签名是否进词表 |
| `templates/穿搭/travel_trip.html` | 8384 | 128 | SM3-4 | 出行清单（带物品/归物品） | 混合 | 行程类型/天数/操作 mode,清单物品卡片（名称/数量/位置/理由）,汇总 | 确认带出（标旅游中）,确认归位,复制数据,复制日志 | 空态：「没有旅游中的物品。」／「清单为空（行程规则未生成物品）。」；异常：数据解析失败／数据校验失败 | 行程类型：健身/出差/旅行/超市/游泳/爬山/滑雪/自定义；物品状态 旅游中 → 在家 | 确认 行程七值与「联动健身计划」的数据来源 |
| `templates/穿搭/trip_outfit_plan.html` | 8695 | 124 | SM3-5 | 旅行穿搭 | 混合 | 目的地/天数,每日计划 day_plans（第 N 天 ＋ 温度 ＋ 组合）,冲突提示 conflicts,行李汇总 luggage,汇总 | 日期按钮（D1…）,采纳这天,生成行李清单（→出行清单）,复制数据,复制日志 | 空态：没有可计划的衣物。；无冲突态：衣物数量充足,无重复冲突。；异常：数据解析失败／数据校验失败 | 每日温度 p.temp（来自外部） | 确认 天气数据的来源（是否要外部接口） |
| `templates/stats/overview.html` | 14837 | 171 | SM4-1 | 统物品 | 查看 | 摘要（件数/总价/价格覆盖率/近 30 天变动）,分类分布,位置分布,状态分布,归属分布,价值 TOP,高频 TOP（名称/访问次数/最后访问）,趋势 | 点柱子＝复制筛选浏览 prompt,复制「初始化/录入第一批」,复制补价提示,复制数据,复制日志 | 空态：还没有物品 📦 ＋「录入第一批物品后,这里就是你的家底总览。」；分区空态：暂无分类数据／暂无位置数据／暂无状态数据；异常：数据解析失败／数据校验失败 | 全部合法物品状态（状态分布口径） | 确认 五块分布本期是否全做 |
| `templates/stats/idle.html` | 13309 | 205 | SM4-2 | 查闲置 | 混合 | 闲置清单（按闲置时长排序）,闲置标准天数 threshold,AI 建议,分类筛选,空态标记 | 分类下拉,勾选,标记废弃,送人,先不处理,确认处理,复制数据,复制日志 | 空态：衣橱状态良好 ✨ ＋「没有超过 N 天未使用的物品」；拦截态「还没有勾选任何处理」；异常：数据解析失败／数据校验失败 | 处理动作：标记废弃/送人/先不处理 | 确认 闲置天数阈值的默认值 |
| `templates/stats/expiring.html` | 13651 | 215 | SM4-3 | 查过期 | 混合 | 已过期与未来 N 天预告（剩余天数 days_left）,预告天数 days,可调档位 allowed,分类筛选,摘要 | 分类下拉,勾选,已用完,废弃,忽略,确认处理,复制数据,复制日志 | 空态：没有即将过期的物品 ✨ ＋「已检查未来 N 天（allowed 天可调）」；拦截态「还没有勾选任何处理」；异常：数据解析失败／数据校验失败 | 已过期 N 天／今天到期／N 天后到期；处理动作：已用完/废弃/忽略 | 确认 预告天数默认 30 与 allowed 档位 |
| `templates/stats/inventory_stat.html` | 10213 | 135 | SM4-4 | 盘点统计 | 查看 | 完成率与趋势,盘点明细（时间/范围/缺/多/异/状态）,遗留差异总数,复查入口,AI 建议,有无数据标记 | 复查盘点,复制「首次盘点」,复制数据,复制日志 | 空态：还没有盘点记录 📋 ＋「完成首次盘点后,这里会显示完成率/差异趋势/建议优先盘哪。」；异常：数据解析失败／数据校验失败 | 盘点记录状态：进行中/已完成/已处理/已复查 | 确认 完成率与趋势的计算口径 |
| `templates/快递购物/list.html` | 7905 | 86 | SM5-1 | 购物清单 | 混合 | 待买条目（名称/数量/来源标注）,清单内查重结果,摘要 | 我买到了,清单外新买的,给已有物品补货,记一笔要买的,检测家里缺什么,清掉已买记录,勾选,复制数据,复制日志 | 空态：清单是空的。＋「试试:检测家里缺什么 / 记一笔要买的」；拦截态「请先勾选买到的条目」；异常：数据解析失败 | 清单条目状态：待买/已买（老 `快递购物/schema.py:30-31`） | 确认 条目「来源标注」的取值集合 |
| `templates/快递购物/missing.html` | 7343 | 86 | SM5-2 | 缺货检测 | 混合 | 缺货物品（物品/当前数量/阈值/建议量）,检测范围 scope,摘要 | 勾选,加入购物清单（勾选）,按范围检测,设置阈值,复制数据,复制日志 | 空态：🟢 库存充足,没有缺货物品。＋范围；拦截态「请先勾选缺货物品」；异常：数据解析失败 | 计入库存的状态：在家/备用（老 `快递购物/schema.py:45`） | 确认 阈值表由缺货检测与囤货盘点共用 |
| `templates/快递购物/express.html` | 7240 | 86 | SM5-3 | 查快递 | 混合 | 快递中物品（名称/已等 N 天/是否超时）,超时天数 timeout_days,摘要 | 勾选,我收到了（勾选）,收到的放备用,新到的物品录入,复制数据,复制日志 | 空态：📭 当前没有快递中物品。；拦截态「请先勾选收到的物品」；异常：数据解析失败 | 快递中／超时（默认 7 天）；收货后 → 在家/备用 | 确认 超时阈值默认 7 天 |
| `templates/快递购物/stock.html` | 7890 | 96 | SM5-4 | 囤货盘点 | 混合 | 囤货物品（名称/数量/阈值/库存状态）,未设阈值提示 hints,摘要 | 勾选,修正实际数量（勾选）,设置阈值（勾选）,设阈值,检测缺货,复制数据,复制日志 | 空态：还没有设置囤货阈值的物品。；分区空态：常用品还没设阈值；拦截态「请先勾选要修正的物品／要设置阈值的物品」；异常：数据解析失败 | 库存状态：充足/低/空 | 确认 库存状态三值的词表 |
| `templates/family_borrow.html` | 11310 | 158 | SM7-1 | 借用 | 混合 | 借出/借入双向分区,超期件数,记录（物品名/对象/借出日/约定归还日/状态/已借天数/备注）,登记表单「物品（库内下拉／库外物品名）」「对象（家人下拉／外部联系人）」 | 确认归还,复制催还文案,确认登记,复制数据,复制日志 | 空态：暂无借用记录；超期提醒「⏰ 还有 N 件超期未还，记得催一下」；异常：数据解析失败／数据校验失败 | 借用状态：已超期/今日到期/已归还/借用中；物品状态 借用中 ↔ 在家 | 确认 借入的「库外物品名」是否落进物品台账 |
| `templates/family_members.html` | 9682 | 130 | SM7-2 | 家人档案 | 混合 | 成员列表,物品归属勾选清单,物品总数,添加成员表单「成员」「关系」「备注」 | 移除成员,确认标记归属,确认添加,复制数据,复制日志 | 空态：还没有家人档案,先添加第一位成员吧；无物品态：库里还没有物品；异常：数据解析失败／数据校验失败 | 成员关系为自由文本（老 `家庭协作/family_ops.py:28` 未设枚举）；物品默认归属「使用者」 | 确认 成员「关系」字段取值集合（老实现未枚举） |
| `templates/开始使用/first_use_wizard.html` | 16875 | 210 | SM8-1 | 首次使用 | 向导 | 6 步步骤条（环境检测/路径确认/建库/建分类/引导录入/完成回执）,环境信息（OS/Python/数据库路径/目录可写）,建库结果（数据库/顶级分类/分类节点/种子标识）,下一步 | 开始初始化（复制指令给 AI）,一键重试（复制指令给 AI）,先配置环境变量,开始录入第一批（复制）,✓ 知道了,复制数据,复制日志 | 异常：数据解析失败／数据校验失败／初始化失败（失败动作＋原因＋建议）；幂等提示「已初始化」 | 步骤状态：done/current/fail/pending | 确认 6 步向导本期是否收进真页，还是先留 HELP |
| `templates/开始使用/health_report.html` | 11383 | 140 | SM8-2 | 查异常 | 混合 | 环境信息（数据库/操作系统/Python/物品总数）,检查项列表,问题总数,健康标记,动作列 | 勾选,复制选中修复引导,✓ 知道了,复制数据,复制日志 | 空态：✅ 数据健康良好 ＋「未发现数据问题。」；拦截态「请先勾选至少 1 个问题」；异常：数据解析失败／数据校验失败 | 健康状态：良好/待处理；状态时效阈值 快递中 7 天、旅游中/维修中/借用中 30 天（老 `开始使用/ops.py:224`） | 确认 8 个检查项的清单与阈值是否原样搬 |
| `templates/开始使用/backup_receipt.html` | 12782 | 140 | SM8-3 | 备份导出 | 采集＋回执 | 本次备份（路径/大小/时间）,备份历史（保留 N 份,更旧自动清理）,距上次备份天数,保留份数输入 | 保留份数下拉,确认备份（复制指令）,导出 JSON,导出 CSV,删除最旧备份（确认式）,✓ 知道了,复制数据,复制日志 | 空态：暂无备份记录；异常：数据解析失败／数据校验失败／备份失败；空值拦截「该参数不能为空」 | 保留份数默认值 | 确认 保留份数默认值与导出格式 |
| `templates/开始使用/import_restore.html` | 13509 | 154 | SM8-4 | 导入恢复 | 向导 | 四步（① 选择导入文件 ② 校验结果 ③ 冲突预览 ④ 确认导入）,校验项（文件版本/物品总数/同名冲突/新增）,冲突名单,导入结果（新增/跳过/覆盖/导入前备份） | 选择文件（预告式）,冲突处理下拉（跳过同名/覆盖同名）,确认导入（复制指令）,撤销导入（恢复导入前状态）,✓ 知道了,复制数据,复制日志 | 冲突超 10 条折叠「…等 N 件」；异常：数据解析失败／数据校验失败／导入失败；承诺语「导入前会自动备份现有库（安全网）；导入失败自动回滚,现有数据不变。」 | 冲突处理：跳过同名/覆盖同名；步骤状态 done/current | 确认 撤销导入的保留窗口有多长 |
| `templates/票据凭证/purchase_records.html` | 12410 | 186 | SM6-1,SM6-2,SM6-3,SM6-4,SM6-5 | 查购买记录,查上月购买,查今年花费,查退货窗口,登记购买记录 | 混合 | 购买记录（物品名/ID/购买日/价格/渠道/商家客服/退货窗口/退货截止）,分类统计（分类/笔数/金额）,顺路提醒,空态提示 empty_hint | 分类卡片（点＝筛选）,新增购买记录,复制数据,复制日志 | 空态：暂无分类统计／empty_hint 或「暂无记录」；异常：数据解析失败／数据校验失败 | 退货徽章：已过退货期 N 天／今天最后可退／可退·剩 N 天／未设退货 | 确认 写类 5 条只出 JSON（见 §三 ①）本期是否补 HTML |
| `templates/票据凭证/warranty.html` | 11557 | 162 | SM6-6,SM6-7,SM6-8,SM6-9,SM6-10 | 查保修状态,登记保修,记录维修,设置保养周期,执行保养 | 混合 | 保修/保养清单（物品名/ID/类型 kind/状态/到期日/剩余天数/维修次数/服务事件）,状态筛选,空态提示 | 状态筛选,记录维修,✓ 执行保养,新增保修 / 保养,复制数据,复制日志 | 空态：empty_hint 或「暂无登记」；无事件时折叠区空态；异常：数据解析失败／数据校验失败 | 保修筛选：在保/即将到期/已过/到期未做/全部（老 `票据凭证/cli.py:373`）；已做 | 确认 保养周期与下次保养日的推算口径 |
| `templates/票据凭证/certificates.html` | 10161 | 150 | SM6-11,SM6-12,SM6-13,SM6-14 | 查证件到期,登记证件,证件归档,更新证件 | 混合 | 证件清单（类型/持有人/ID/到期日/剩余天数/证件状态/脱敏号码/备注）,空态提示 | 更新,补照片,新增证件,复制数据,复制日志 | 空态：empty_hint 或「暂无登记」；异常：数据解析失败／数据校验失败；敏感口径「号码脱敏 · 复制数据不含证件号」 | 证件状态：有效/即将到期/已过期；到期文案：已过期 N 天／今天到期／N 天后到期 | 确认 号码脱敏是否只留后 4 位 |
| `templates/票据凭证/accounts.html` | 8888 | 143 | SM6-15,SM6-16,SM6-17,SM6-18 | 查账号,存账号,改账号,看密码 | 混合 | 账号分组（平台/用户名/类型）,总数,空态提示 | 新增账号,查看密码,复制密码,复制数据,复制日志 | 空态：empty_hint 或「暂无账号」；异常：数据解析失败／数据校验失败；敏感横幅「本页不含任何明文密码」；复制密码前二次确认 | 账号类型：购物/银行/社交/其他（老 `票据凭证/ops.py:18`） | 确认「看密码明文只回显、永不进 HTML」这条契约是否保留 |
| `templates/联动/link_overview.html` | 6490 | 92 | SM9-1 | 联动总览 | 混合 | 联动条目（触发词/依赖技能/数据流/示例 prompt） | 复制触发 prompt,复制数据,复制日志 | 空态：无联动配置；异常：数据解析失败／数据校验失败 | — | 确认 本期不做（背景写明 3 条联动不做），需与编排方对齐是否要留空壳 |
| `templates/联动/link_food.html` | 6937 | 101 | SM9-2 | 记到卡路里 | 混合 | 目标物品,食品判定理由 food_reason,联动动作 actions,待复制 prompt | 复制 prompt 到卡路里,修正重试,复制数据,复制日志 | 异常：数据解析失败／数据校验失败；失败形态：失败原因/目标物品/建议下一步 | — | 确认 本期不做；若做，需先定「食品判定」的启发式规则 |
| `templates/联动/link_price.html` | 7192 | 105 | SM9-3 | 记到记账 | 混合 | 目标物品（含价格）,记账分类 ledger_category,联动动作 actions,待复制 prompt | 复制 prompt 到饼干记账,修正重试,复制数据,复制日志 | 异常：数据解析失败／数据校验失败；失败形态：失败原因/目标物品/建议下一步 | — | 确认 本期不做；若做，需先定记账分类映射 |

**表一小结**：49 行 ＝ yaml 引用的 49 个老模板；其中 3 行属 `link` 域（`联动/link_*`），按背景**本期不做**，故真正要建的页族是 46 个，覆盖 70 条场景。

## 二 · 按 9 域汇总

「场景数」＝ `scenarios.yaml` 里该域的条目数（合计 73）。「页族数」＝该域场景引用到的**不同**老模板数（合计 49）。「老模板里这一域的文件数」＝老 `templates/` 中该域目录下的 `.html` 文件总数（**含不被 yaml 引用的 legacy 件**）。

| 域 key | 域名 | 场景数 | 页族数 | 老模板里这一域的文件数 |
| --- | --- | --- | --- | --- |
| items | 物品管理 | 29 | 19 | 20 |
| space | 空间与位置 | 4 | 4 | 7 |
| outfit | 穿搭出行 | 5 | 5 | 6 |
| stats | 统计总览 | 4 | 4 | 4 |
| express | 快递购物 | 4 | 4 | 5 |
| receipt | 票据凭证 | 18 | 4 | 4 |
| family | 家庭协作 | 2 | 2 | 2 |
| setup | 开始使用 | 4 | 4 | 5 |
| link | 联动功能 | 3 | 3 | 4 |
| 合计 | — | 73 | 49 | 57 |

读表要点：

- `receipt` 域 18 条场景只压到 4 个页族（购买记录 5／保修保养 5／证件 4／账号 4），是压得最狠的一域。
- `family` 域在老技能里**没有目录**：`family_borrow.html` 与 `family_members.html` 直接躺在 `templates/` 根，所以它的「文件数」取根下这两个。
- 57 ＝ 9 域目录内文件数（items 20 ＋ space 7 ＋ outfit 6 ＋ stats 4 ＋ express 5 ＋ receipt 4 ＋ family 2 ＋ setup 5 ＋ link 4）。`templates/` 根另有 10 个 legacy 平铺件（含 `help_center.html`）不属于任何域目录，故老 `templates/` 全库共 67 个 `.html` ＝ 49 个被引用 ＋ 18 个 legacy。
- `link` 域 3 个页族本期不做 → **实际要建 46 个页族 / 70 条场景，落在 8 个域里**（`link` 域无本期产出）。这与背景里「按 9 个域做成真页面」的表述不一致，已在 §四 记下。

## 三 · yaml 与老实现不一致之处

### ① 票据凭证写类 11 条只打 JSON，不落 HTML（背景已给，核实成立）

18 条 receipt 场景里，**只有 6 条查看类**走 HTML：`SM6-1/SM6-2`（购买记录 list）、`SM6-3`（购买记录 stats）、`SM6-6`（保修 list）、`SM6-11`（证件 list）、`SM6-15`（账号 list）。

证据（`scripts/票据凭证/cli.py`）：

- HTML 出口 5 处：`_purchase_list` `:129-130`、`_purchase_stats` `:161-162`、`_warranty_list` `:174`、`_cert_list` `:238-239`、`_account_list` `:267-268`。
- 只打 JSON 的写类 11 处：`_purchase_add` `:148-151`、`_warranty_register` `:190-193`、`_warranty_repair` `:208-210`、`_warranty_maintain` `:224-226`、`_cert_add` `:255-258`、`_account_add` `:283-287`、`_account_show` `:300-303`、`_account_update` `:314-318`（另有 `_account_init` `:327-328`、`_account_set_master` `:334-335`，二者不是场景）。
- 11 条写类 ＝ `SM6-5`、`SM6-7`、`SM6-8`、`SM6-9`、`SM6-10`、`SM6-12`、`SM6-13`、`SM6-14`、`SM6-16`、`SM6-17`、`SM6-18`。
- 文件头 `:20` 自己写明这条设计：「写操作(register/repair/maintain/add)输出结构化 JSON 回执(5 段式), 由 AI 交互确认」。
- 附带：`SM6-13`（证件归档）与 `SM6-14`（更新证件）**没有各自的子命令**，只作为 `cert add` 的 `--scene` 取值存在（`:410`），因此它们的「HTML 页面」在当前老实现里根本无从产生。

### ② 家庭协作 2 条只在带 `--output` 时落 HTML（背景已给，核实成立）

- `scripts/home_manager/home_manager.py:712-723`：`member-list` → `if args.output:` 才 `emit(payload, "family_members.html", args.output, ...)`，否则 `print(json.dumps(payload))`。
- `:776-787`：`borrow-list` → 同形分支，才 `emit(payload, "family_borrow.html", args.output, ...)`。
- 其余 family 动作（`member-add` `:668-681`、`member-remove` `:683-696`、`member-assign` `:698-710`、`borrow-add` `:725-742`、`borrow-return` `:744-756`、`borrow-remind` `:758-774`）**一律只 `print(json)`**，没有任何 HTML 分支。
- 对照：`物品/位置/穿搭/快递购物/联动` 的域 CLI 全部把 `args.output` 直通 `emit_sm*`（默认 `None` → 自动命名落盘），即**只有家庭协作域把 HTML 变成了 opt-in**。

### ③ `开始使用` 四个模板在老 `scripts/` 里没有渲染调用点（背景已给，核实成立，但有两点要补）

- 在 `scripts/` 全量搜 `first_use_wizard`／`health_report`／`backup_receipt`／`import_restore` → **0 命中**。
- `scripts/开始使用/cli.py` 全文 89 行，唯一输出在 `:23`：`print(json.dumps(payload, ensure_ascii=False))`，不 import 任何渲染器。
- `scripts/render_开始使用.py:139-147` 定义了 `emit_sm8`，**在 `scripts/` 内没有任何调用者**。
- 补充一：`emit_sm8` 全库唯一调用点在**测试**里 —— `tests/test_开始使用.py:622`（且只测 `first_use_wizard.html`）。所以严格说是「`scripts/` 无调用点，`tests/` 有一个」。
- 补充二：另外 3 个模板在**任何地方**都没有渲染调用点，只被 `tests/test_开始使用.py:557-560` 的模板存在性清单和 `:563-577` 的结构断言引用。
- 反向证据：`SKILL.md:153`、`:165-167`、`:288`、`:694`、`:726`、`:734`、`:742` 都把 `scripts/开始使用/cli.py … → 开始使用/xxx.html` 写成应有路径，与代码不一致 —— **文档说有，代码里没有**。

### ④ 老 `templates/` 另有 18 个 legacy 平铺件不被 yaml 引用（背景已给，核实成立）

老 `templates/` 全库 67 个 `.html`，yaml 引用 49 个，差 18 个：

| # | legacy 平铺件 | 归属域（按文件名/内容判断） |
| --- | --- | --- |
| 1 | `templates/add_preview.html` | items |
| 2 | `templates/delivery_check.html` | express |
| 3 | `templates/expiring_alert.html` | stats |
| 4 | `templates/help_center.html` | 技能级（HELP，不属任何域） |
| 5 | `templates/inventory_check.html` | items |
| 6 | `templates/item_detail.html` | items |
| 7 | `templates/list_overview.html` | stats |
| 8 | `templates/outfit_picker.html` | outfit |
| 9 | `templates/search_results.html` | items |
| 10 | `templates/travel_trip.html` | outfit |
| 11 | `templates/物品/error.html` | items |
| 12 | `templates/位置/confirm.html` | space |
| 13 | `templates/位置/error.html` | space |
| 14 | `templates/位置/receipt.html` | space |
| 15 | `templates/穿搭/error.html` | outfit |
| 16 | `templates/快递购物/error.html` | express |
| 17 | `templates/联动/error.html` | link |
| 18 | `templates/开始使用/error_receipt.html` | setup |

补充：这 18 个里 17 个仍挂在 `scripts/render/__init__.py:34-99` 的 `TEMPLATE_TO_COMMAND_CN` 表上（`search_results:35`、`delivery_check:36`、`add_preview:37`、`item_detail:38`、`list_overview:39`、`inventory_check:40`、`expiring_alert:41`、`outfit_picker:42`、`travel_trip:43`、`穿搭/error:50`、`快递购物/error:64`、`位置/receipt:70`、`位置/confirm:71`、`位置/error:72`、`物品/error:76`、`联动/error:98`）；只有 `开始使用/error_receipt.html` 不在表里，由 `render_开始使用.py:183` 直接点名渲染。也就是说老实现是**「根目录平铺旧件 ＋ 域子目录新件」两套命名长期并存**，legacy 并不等于死件。

### ⑤ 模板→归档文件名是 1:1，而模板是多场景共用（本次新发现）

`scripts/render/__init__.py:130-147` 的 `_auto_output_path()` 用 `TEMPLATE_TO_COMMAND_CN.get(template_name, …)` 决定文件名；不分场景。而多场景共用同一模板（表一：`add_form` 5 条、`receipt` 4 条、`purchase_records` 5 条、`warranty` 5 条、`certificates` 4 条、`accounts` 4 条）→ **归档文件名丢场景区分**：

- `物品/receipt.html` → `操作回执_<时间戳>.html`（`:75`），而它承担 3-2 移物品 / 3-3 数量变更 / 3-4 状态变更 / 3-8 标物品 四条场景，四者的 HTML 落盘后同名同前缀。
- `物品/add_form.html` → `录物品_<时间戳>.html`（`:74`），拍物品（1-2）、批量录入（1-3）、补录（1-4）、改物品（3-1）全部落成「录物品_*」。
- 域 CLI 的实参也确实是 `output_path=args.output`（默认 `None` → 走自动命名），见 `物品/cli.py:238,263,275,…`、`位置/cli.py:91,…`、`穿搭/cli.py:121,125`、`快递购物/cli.py:95`、`联动/cli.py:48,55,…`。

### ⑥ `scripts/render_票据凭证.py`（37 行）是无调用者的重复渲染器（本次新发现）

- `scripts/票据凭证/cli.py:68-78` 自带 `_render()`／`_emit()`，直接 `from render import render_page`。
- `scripts/render_票据凭证.py:21-30` 的 `render()` 与 `_render()` 逻辑重复（同样的 `resolve_output_root() / "home_manager_html"` ＋ 时间戳命名）。
- 全库搜 `render_票据凭证`：唯一命中是 `scripts/票据凭证/__init__.py:3` 的文档字符串。**无 import 者**。
- 对照：`render_物品/位置/穿搭/快递购物/开始使用/联动` 都有真实调用者（`物品/cli.py:210`、`位置/cli.py:39`、`穿搭/cli.py:44`、`快递购物/cli.py:89`、`联动/cli.py:39`；`开始使用` 见 ③）。

### ⑦ yaml 的 `type` 有 8 个取值，超本册「页面类型」的 5 值集合（口径说明，非缺陷）

`scenarios.yaml` 实际用到：`查看`、`采集+回执`、`选择+回执`、`查看+回执`、`查看+选择`、`查看+选择+回执`、`向导+回执`、`向导+采集+回执`。本册规定只能用 5 值，故按 §一 的折叠规则降维；其中 `向导+采集+回执`（仅 6-4 搬家盘点）在模板里**没有步骤条**，按实测降为 选择＋回执 并已在表一末列注明。

### ⑧ 场景编号两套并存（编号体系本身）

同一份 `scenarios.yaml` 里 items 域用 `1-1 … 7-1`，其余 8 域用 `SM2-1 … SM9-3`。表一「服务场景 id」原样照抄这两种写法，未归一。

## 四 · 事实与不确定

### 4.1 读过的文件清单（路径 ＋ 行数）

**新技能（仓内，输入侧）**

| 路径 | 行数 | 用途 |
| --- | --- | --- |
| `packages/skill-home/src/help/scenarios.yaml` | 1283 | 事实源：73 条场景、9 域、`html.template` 49 个取值 |
| `packages/skill-home/scripts/lib/yaml-subset.mjs` | 219（读 1-60） | 确认 `html`／`variants` 子树被解析器整棵跳过（表一的 template 靠逐行解析取出） |
| `packages/skill-home/src/render/templates.ts` | 68 | 21 个模板名单 ＋ `templateFor()` 的 key→模板映射 |
| `packages/skill-home/templates/item_search.html` | 16 | 抽查「16 行骨架」属实（`<!--CONTENT-->` 占位） |

**老技能 · 模板（49 个被引用件，逐个打开；字节数／行数见表一，共 49 行）**

`templates/` 根 2 件：`family_borrow.html`(158)、`family_members.html`(130)。`templates/物品/` 19 件、`templates/位置/` 4 件、`templates/穿搭/` 5 件、`templates/stats/` 4 件、`templates/快递购物/` 4 件、`templates/票据凭证/` 4 件、`templates/开始使用/` 4 件、`templates/联动/` 3 件 —— 逐件行数见表一「行数」列。

**老技能 · 渲染脚本与流程说明**

| 路径 | 行数 | 用途 |
| --- | --- | --- |
| `scripts/render/__init__.py` | 248 | `render_page` 注入管线；`TEMPLATE_TO_COMMAND_CN`（`:34-99`）；`_auto_output_path`（`:130-147`） |
| `scripts/render_物品.py` | 102 | 信封 5 段/6 段契约；`emit_sm1`；错误回执 |
| `scripts/render_开始使用.py` | 185 | `emit_sm8`、`humanize`、人类可读复制文本 |
| `scripts/render_票据凭证.py` | 37 | 无调用者的重复渲染器（§三 ⑥） |
| `scripts/票据凭证/cli.py` | 498 | HTML/JSON 分流证据（§三 ①）；`_render`/`_emit` |
| `scripts/home_manager/home_manager.py` | 807（读 690-807） | 家庭协作 HTML opt-in 证据（§三 ②） |
| `scripts/开始使用/cli.py` | 89 | 只 `print(json.dumps())`，无渲染（§三 ③） |
| `tests/test_开始使用.py` | 634（读 545-634） | `emit_sm8` 唯一调用点、模板存在性清单（§三 ③） |
| `scripts/物品/cli.py` | 684（读 225-264，其余用行号定位） | 场景→模板→命令名的实际装配（§三 ⑤） |

**按域取的枚举／词表（本册「状态词表」列的事实源）**

| 路径:行 | 内容 |
| --- | --- |
| `scripts/物品/events.py:54` | `PHOTO_TYPES = ["普通", "说明书-使用", "说明书-安装", "说明书-保养"]` |
| `scripts/物品/events.py:60` | `INV_RECORD_STATUS = ["进行中", "已完成", "已处理", "已复查"]` |
| `scripts/物品/validators.py:107-109` | 12 个物品状态 ＋ `RESTORE_FROM_DISCARDED` |
| `scripts/物品/cli.py:678` | 表单下拉状态 `STATUSES_FOR_FORM`（6 个） |
| `scripts/物品/ops.py:1485,1516` | 事件类型中文标签表 |
| `scripts/快递购物/schema.py:30-31,36,45` | 清单状态 待买/已买；超时默认 7；计入库存状态 在家/备用 |
| `scripts/物品/inventory_round.html:71` | 盘点状态修正 6 值 ＋「状态不变」 |
| `scripts/票据凭证/cli.py:373` | 保修筛选 在保/即将到期/已过/到期未做/全部 |
| `scripts/票据凭证/ops.py:17,18` | `CERT_TYPES`（6）/`ACCOUNT_TYPES`（4） |
| `scripts/家庭协作/family_ops.py:13,207-257` | 借出＝全部位置→借用中；状态：已超期/今日到期/已归还/借用中 |
| `scripts/开始使用/ops.py:224` | 状态时效阈值 快递中 7、旅游中/维修中/借用中 30 |

**老技能 · 目录清点**：`templates/` 全树逐文件取字节数与行数（67 个 `.html`）；`scripts/` 全树逐文件取行号命中（排除 `__pycache__`）。

### 4.2 未查到（查了什么、在哪查）

1. **物品「关系类型」五值的代码级枚举** —— 未查到。查了 `scripts/物品/ops.py`、`scripts/物品/validators.py`、`scripts/物品/events.py`、`scripts/物品/cli.py`、`scripts/home_manager/item_ops.py`，只在 `packages/skill-home/src/help/scenarios.yaml` 的 3-7 `prompt` 文本里出现「配件/配套/替代/同捆/常用搭配」，老 `scripts/` 里没有对应常量。
2. **家人档案的「关系」取值集合** —— 未查到。`scripts/家庭协作/family_ops.py:28` 是 `relation TEXT NOT NULL DEFAULT ''`，`:101` 起 `member_add` 直接透传字符串，全程无枚举。
3. **`SM6-4`（查退货窗口）在老 `scripts/` 的调用点** —— 未查到。全量搜 `SM6-4` 在 `scripts/` 下 0 命中；`templates/票据凭证/purchase_records.html` 有「退货窗口/退货截止」字段，`scripts/票据凭证/ops.py` 有 `DEFAULT_RETURN_WINDOW`，但没有以 SM6-4 为场景的入口。yaml 标它是「查看+回执」，实际无独立命令。
4. **「查异常」8 个检查项的完整清单** —— 未查到逐项文本。只查到 `scripts/开始使用/ops.py:224` 的状态时效阈值；yaml SM8-2 的 `result` 概述为「标签/位置/状态/照片/价格/日期/相似位置」共 7 类而文案称 8 项，未能定位到 `checks` 列表的构造处。
5. **`templates/位置/confirm.html`、`位置/receipt.html` 的活跃调用点** —— 未查到。它们挂在 `render/__init__.py:70-71` 的命令名表上，但搜不到任何 `render_page("位置/confirm.html"…)` 或 `render_page("位置/receipt.html"…)` 的调用；`scripts/render_位置.py` 只在自己 `:99` 用 `位置/error.html`，正页模板由 `位置/cli.py` 传字符串决定，未见这两个名字。
6. **老技能里按 `scenario_id` 反查模板的单一映射表** —— 未查到。场景 id→模板的对应只存在于 `references/scenarios.yaml` / `scenes/SM*.yaml` 与各域 CLI 的字面量调用（如 `物品/cli.py:235`），没有一张代码级总表。

### 4.3 与背景描述不符的实测发现

1. **背景说「按 9 个域做成真页面」，但 `link` 域的 3 条明确不做** → 本期实际是 **8 个域 / 70 条场景 / 46 个页族**，`link` 域产不出场景页（最多留个索引位）。本册表一仍列了那 3 行，因为它们是「yaml 引用了的老模板」，属于 §三 ④ 的核对范围，但已在末列标「本期不做」。
2. **背景说「老技能对同样的 73 条场景引用了 49 个真页面模板」** —— 数量属实，但**其中 `SM6-4` 一条场景在老 `scripts/` 里没有任何入口**（§四 4.2-3），`SM6-13`／`SM6-14` 也只是 `cert add` 的 `--scene` 取值（§三 ①）。所以「73 条场景都有实现」这句不成立：真正有独立命令入口的场景少于 73。
3. **背景说「`开始使用` 四个模板在老 `scripts/` 里没有渲染调用点」** —— 成立，但要补一句：`first_use_wizard.html` 在 `tests/test_开始使用.py:622` 有唯一的渲染调用点（§三 ③）。「完全没有渲染调用点」的其实只有 3 个（`health_report`／`backup_receipt`／`import_restore`）。
4. **背景说新技能「21 个页面模板全是 16 行骨架，正文由 `renderEnvelopeHtml()` 统一生成」** —— 抽查 `templates/item_search.html` 属实（16 行，`<!--CONTENT-->` 占位）。但要注意 `src/render/templates.ts:33-57` 的映射是 **21 个 `home.*` key ↔ 21 个模板**，与老技能「49 个模板 ↔ 73 条场景」不是同一套分层；票 1 之后要决定的是**谁承担 49→21 的降维**（本册末列每行都留了这个确认点）。
5. **额外发现（背景未提）**：老实现的 HTML 归档文件名由模板名决定、不分场景（§三 ⑤），以及 `scripts/render_票据凭证.py` 是无调用者的重复件（§三 ⑥）。

## 五 · 自检命令

全部为 PowerShell，在本仓根 `D:\ilife` 直接跑；只读，不写文件。

**1）表一的行数（必须 ≥40）**

```powershell
(Select-String -Path D:\ilife\docs\skills\skill-home\pages-ledger.md -Pattern '^\| `templates/').Count
```

**1b）表一「页面类型」列的分布**（复算 §一 读法第 2 条）

```powershell
$p = 'D:\ilife\docs\skills\skill-home\pages-ledger.md'
$rows = (Select-String -Path $p -Pattern '^\| `templates/').Line
$rows | ForEach-Object { ($_ -split '\|')[6].Trim() } | Group-Object | Sort-Object Count -Descending |
  ForEach-Object { "{0}`t{1}" -f $_.Name, $_.Count }
"合计: {0}" -f $rows.Count
```

**2）「49 个被引用模板是否全部存在」核对**（读 yaml 取 template 去重，再逐个 `Test-Path`；缺一即打印 MISSING）

```powershell
$old = 'D:\2Study\StudyNotes\SKILLS\居家管家'
$yaml = 'D:\ilife\packages\skill-home\src\help\scenarios.yaml'
$tpls = Select-String -Path $yaml -Pattern '^    template:\s*(.+)$' |
  ForEach-Object { $_.Matches[0].Groups[1].Value.Trim() } | Sort-Object -Unique
"yaml template 去重数: {0}" -f $tpls.Count
"总行数(未去重): {0}" -f (Select-String -Path $yaml -Pattern '^    template:').Count
$missing = $tpls | Where-Object { -not (Test-Path (Join-Path $old ('templates\' + $_))) }
if ($missing) { "MISSING: " + ($missing -join ', ') } else { "全部存在: $($tpls.Count) / $($tpls.Count)" }
```

**3）9 域场景数／页族数／模板文件数**

```powershell
$old = 'D:\2Study\StudyNotes\SKILLS\居家管家'
$yaml = 'D:\ilife\packages\skill-home\src\help\scenarios.yaml'
# 场景数（按 domain: 计）
Select-String -Path $yaml -Pattern '^  domain:\s*(\S+)$' |
  Group-Object { $_.Matches[0].Groups[1].Value } |
  Select-Object Count,Name | Sort-Object Name
# 页族数（按 domain 分组的 template 去重数）
$rows = Select-String -Path $yaml -Pattern '^(  domain:|- id:|    template:)'
$cur = $null; $map = @{}
foreach ($r in $rows) {
  if ($r.Line -match '^  domain:\s*(\S+)$') { $cur = $Matches[1] }
  elseif ($r.Line -match '^    template:\s*(.+)$') { if (-not $map[$cur]) { $map[$cur] = @{} }; $map[$cur][$Matches[1].Trim()] = 1 }
}
$map.Keys | Sort-Object | ForEach-Object { "{0}`t{1}" -f $_, $map[$_].Count }
# 老模板文件数（域目录）
Get-ChildItem (Join-Path $old 'templates') -Directory |
  ForEach-Object { "{0}`t{1}" -f $_.Name, (Get-ChildItem $_.FullName -Recurse -File -Filter *.html).Count }
Get-ChildItem (Join-Path $old 'templates') -File -Filter *.html | Measure-Object   # 根平铺件
(Get-ChildItem (Join-Path $old 'templates') -Recurse -File -Filter *.html | Measure-Object).Count  # 全库 67
```

**4）§三 四条不一致的快速复核**

```powershell
$old = 'D:\2Study\StudyNotes\SKILLS\居家管家'
# ① 票据凭证：HTML 出口 5 处 vs JSON 回执若干
Select-String -Path (Join-Path $old 'scripts\票据凭证\cli.py') -Pattern '_emit\(|_print_json\(_receipt' |
  ForEach-Object { "L{0}: {1}" -f $_.LineNumber, $_.Line.Trim() }
# ② 家庭协作：只有带 --output 才落 HTML
Select-String -Path (Join-Path $old 'scripts\home_manager\home_manager.py') -Pattern 'if args\.output|render import emit' |
  ForEach-Object { "L{0}: {1}" -f $_.LineNumber, $_.Line.Trim() }
# ③ 开始使用四个模板在 scripts/ 下 0 命中
Get-ChildItem (Join-Path $old 'scripts') -Recurse -File -Filter *.py |
  Select-String -Pattern 'first_use_wizard|health_report|backup_receipt|import_restore' | Measure-Object
# ④ legacy 平铺件 = 全库 67 − yaml 引用 49 = 18
(Get-ChildItem (Join-Path $old 'templates') -Recurse -File -Filter *.html | Measure-Object).Count
```

**5）编码与换行核对**（应为「无 BOM、LF 或 CRLF 真实换行、无字面 `\n`」）

```powershell
$p = 'D:\ilife\docs\skills\skill-home\pages-ledger.md'
$b = [System.IO.File]::ReadAllBytes($p)
"BOM: {0}" -f ($(if ($b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) { '有(不合格)' } else { '无' }))
"行数: {0}" -f (Get-Content -LiteralPath $p).Count
"字面反斜杠n 出现次数: {0}" -f (Select-String -Path $p -Pattern '\\n' -AllMatches | Measure-Object).Count
```

### 本次自检的实测读数

- 表一行数（命令 1）：**49**（≥40，过）。
- 页面类型分布（命令 1b）：**混合 27、查看 11、采集＋回执 6、选择＋回执 3、向导 2，合计 49**。
- 被引用模板存在性（命令 2）：**49 / 49 全部存在**，`MISSING` 为空；`yaml template 去重数 = 49`、未去重行数 = 73（＝场景数，逐条一一对应）。
- 9 域读数（命令 3）：items 29 场景／19 页族、space 4/4、outfit 5/5、stats 4/4、express 4/4、receipt 18/4、family 2/2、setup 4/4、link 3/3；页族合计 **49**。
- 老模板全库（命令 4）：**67** 个 `.html`（＝ yaml 引用 49 ＋ legacy 18）。
- 编码（命令 5）：**BOM 无**、全文 **LF**（含 CR 的字节数 0）、本册 **260 行**；没有把字面 `\n` 当换行用 —— 该模式只命中 3 行（`:313` 是「不得有字面 `\n`」这句说明本身、`:320` 是命令 5 自己的 `-Pattern`、`:330` 是本行读数），均为举例/命令文本，非正文换行。

## 六 · 仓库外原型附录（#859 User Story 12 补登，2026-09-21）

票 1 的清点范围只有 `templates\`（§四 4.1 末行「老技能 · 目录清点」），缺口册 `html-scenes-gap-inventory.md` 也自陈跳过 `.scratch`／`.notes`。2026-09-21 作全树穷举补登：老技能全树 **1217** 个 `.html` ＝ `output\` 584 ＋ `.scratch\` 500 ＋ `templates\` 67 ＋ `docs\` 46 ＋ `.notes\` 17 ＋ 根 1 ＋ `.db\` 1 ＋ `_grilling\` 1。

其中 `templates\` 那 67 份真模板**已 100% 在册**（表一 49 ＋ §三 ④ 18），且 `templates\` 之外没有第二处模板目录；真正的**设计原型只有 10 份**，此前全仓无一处登记，本附录把它们进货：

| 路径（老技能内） | 字节 | 它是什么 | 新技能对位 |
| --- | --- | --- | --- |
| `.scratch/v2.0-spec-map/prototype/拼贴卡-原型.html` | 60408 | SM3-1 穿什么的拼贴卡原型（整页探索稿） | `templates/outfit/outfit_picker.html` ＋ `src/outfit/pages/outfit_picker.ts` |
| `.scratch/v2.0-spec-map/prototype/拼贴卡-原型-无图版.html` | 60377 | 同上，无图稿 | 同上 |
| `.scratch/v2.0-spec-map/prototype/拼贴卡-F1.html` | 14141 | 拼贴卡版式 F1 稿 | 同上 |
| `.scratch/v2.0-spec-map/prototype/拼贴卡-F1-配色.html` | 16989 | F1 配色稿 | 同上 |
| `.scratch/v2.0-spec-map/prototype/拼贴卡-F1-浅色.html` | 21410 | F1 浅色稿 | 同上 |
| `.scratch/v2.0-spec-map/prototype/拼贴卡-F1-相册风.html` | 19635 | F1 相册风稿（**出货模板的设计祖先**，证据见下） | 同上 |
| `.scratch/v2.0-spec-map/prototype/HELP-结构原型.html` | 66180 | 技能级 HELP 页结构原型（件头自注 `PROTOTYPE — throwaway, not production`） | 技能级 HELP 件（`packages/skill-home/src/help/**` ＋ `templates/help.html`），不在 46 族内 |
| `.notes/HELP_demo.html` | 17637 | HELP 页设计稿 | 同上 |
| `.notes/HELP_demo_FINAL.html` | 17761 | HELP 页设计稿（定稿迭代） | 同上 |
| `.notes/HELP_fixed.html` | 18446 | HELP 页设计稿（修版） | 同上 |

**祖先关系硬证据**：`.scratch/v2.0-spec-map/prototype/拼贴卡-F1-相册风.html:10` 与出货件 `templates/穿搭/outfit_picker.html:9` 的 `:root` 自定义属性逐字相同（`--paper1:#fdfaf4;--paper2:#f1ead9;--line:rgba(120,105,80,.20);--label:#8a744f;`），舞台同为 `250×360` ＋ 同一 `radial-gradient(ellipse at 50% 16%,var(--paper1),var(--paper2))`。即这批原型丢掉的是过程稿，版式已在出货件里。

**不属本附录的其余 1140 份**：渲染产物与按次留档（`output\` 584）、审查与探针页（`.scratch\` 500、`docs\` 46）、行动计划与提问页（`.notes\` 的 `PLAN-*` 5 ＋ `q-*` 4 ＋ `HELP-audit*` 4 ＋ `audit-*` 1）、同步测试页（`.db\` 1）——都不是设计原型。

**复核命令**（在老技能根目录内跑）：

```powershell
(Get-ChildItem -Recurse -File -Filter *.html).Count                          # 1217
(Get-ChildItem '.scratch\v2.0-spec-map\prototype' -File -Filter *.html).Count # 7
(Get-ChildItem '.notes' -File -Filter 'HELP_*.html').Count                    # 3
$needle = '--paper1:#fdfaf4;--paper2:#f1ead9;--line:rgba(120,105,80,.20);--label:#8a744f;'
(Select-String -Path '.scratch\v2.0-spec-map\prototype\拼贴卡-F1-相册风.html' -Pattern $needle -SimpleMatch).Count  # 1
(Select-String -Path 'templates\穿搭\outfit_picker.html' -Pattern $needle -SimpleMatch).Count                       # 1
```
