// 必需块登记表（#805 脚手架生成物，事实源＝契约附录）。
//
// 消费方：票 6 结构判据件（`scripts/audit-page-blocks.mjs` 的合同 `pages[]` 由本表转录，只加条目）。
// 手改无效：下次跑 `new-scene-page.mjs` 即被附录覆盖；三方对账见 `test/scaffold.test.mjs`。
export const PAGE_BLOCKS_VERSION = 1;

/** 一族的必需块登记（domain／服务场景／四组必需块）。
 * @typedef {Object} FamilyBlocks
 * @property {string} domain
 * @property {string[]} scenarios
 * @property {{fields: string[], operations: string[], empty: string[], status: string[]}} requiredBlocks
 */

/** @type {Record<string, FamilyBlocks>} */
export const PAGE_BLOCKS = {
  'add_form': { domain: 'items', scenarios: ["1-1","1-2","1-3","1-4","3-1"], requiredBlocks: {"empty":["空态：无（表单页）","异常：数据解析失败","必填项标*做空值拦截"],"fields":["名称*","分类*","数量","位置（选填）","状态","价格（选填）","购买日期","过期日期","录入日期（补录）","标签（逗号分隔）","备注","分区「分类分布」"],"operations":["确认写入／确认变更（按mode）","全部确认（N条）","复制数据","复制日志"],"status":["在家","备用","穿着中","旅游中","洗护中","借用中","维修中","已用完","快递中","待处理","已废弃","找不到"]} },
  'search_list': { domain: 'items', scenarios: ["2-1","2-5"], requiredBlocks: {"empty":["空态：未命中→录入新物品引导","异常：数据解析失败"],"fields":["结果卡片（名称/ID/照片/位置/数量/状态/匹配%）","摘要指标","查询词","本地筛选框"],"operations":["搜索","本地筛选","细化筛选","拍照找物品","录入新物品","复制数据","复制日志"],"status":["物品状态","匹配度%"]} },
  'detail': { domain: 'items', scenarios: ["2-2"], requiredBlocks: {"empty":["空态：未找到该物品","关联空态","操作历史空态「暂无记录」","异常：数据解析失败"],"fields":["ID","分类","位置","标签","价格","备注","最后使用","录入时间","关联物品","同位置邻居","相似物品","快捷操作","操作历史"],"operations":["改","移","补","减","标","废","标记使用","查看完整历史","查看照片","复制数据","复制日志"],"status":["物品状态"]} },
  'locate': { domain: 'items', scenarios: ["2-3"], requiredBlocks: {"empty":["空态：没找到＋扩大寻找引导","异常：数据解析失败"],"fields":["置顶卡片（照片/名称/ID/位置/数量/状态）","查询词"],"operations":["我找到了","分享位置","扩大寻找","复制数据","复制日志"],"status":["物品状态"]} },
  'browse': { domain: 'items', scenarios: ["2-4"], requiredBlocks: {"empty":["空态：无匹配物品","异常：数据解析失败"],"fields":["计数","分组卡片（名称/ID/位置/数量/状态）","当前分组名"],"operations":["全部","分组名（N）","分组切换","排序：相关","复制数据","复制日志"],"status":["物品状态"]} },
  'duplicates': { domain: 'items', scenarios: ["2-6"], requiredBlocks: {"empty":["空态：没有发现重复物品","异常：数据解析失败"],"fields":["位置/数量","分类","价格","组内件数","首件状态"],"operations":["独立录入","复制合并建议","复制数据","复制日志"],"status":["物品状态"]} },
  'receipt': { domain: 'items', scenarios: ["3-2","3-3","3-4","3-8"], requiredBlocks: {"empty":["空态：无字段级变化","标签空值（无）","异常：数据解析失败"],"fields":["变更结果（字段级before→after）","当前状态（名称/ID/分类/位置×数量/状态/标签/备注）","标签变更（去除/新增）","处理明细","收尾语"],"operations":["撤销","查看详情","复制数据","复制日志"],"status":["物品状态","标签加/去"]} },
  'confirm': { domain: 'items', scenarios: ["3-5"], requiredBlocks: {"empty":["空态：无（确认页）","异常：数据解析失败"],"fields":["标题","引导语","变更前","变更后","逐条entries（含子标签）","影响说明"],"operations":["确认","复制数据","复制日志"],"status":[]} },
  'undo_select': { domain: 'items', scenarios: ["3-6"], requiredBlocks: {"empty":["空态：暂无可撤销操作","拦截态：请先勾选","异常：数据解析失败"],"fields":["可撤销操作（最近N条）","事件类型","通用操作分组"],"operations":["勾选事件","确认撤销勾选项","复制数据","复制日志"],"status":["事件类型"]} },
  'relations': { domain: 'items', scenarios: ["3-7"], requiredBlocks: {"empty":["空态：暂无关联","建立区占位文案","异常：数据解析失败"],"fields":["主物品","关联列表（是否反向/关系类型/对方名称/对方ID）"],"operations":["解除","设置关联","复制数据","复制日志"],"status":["配件","配套","替代","同捆","常用搭配"]} },
  'tag_manage': { domain: 'items', scenarios: ["4-1","4-3"], requiredBlocks: {"empty":["空态：暂无标签","无可清理标签时不出「一键清理」","异常：数据解析失败"],"fields":["标签总览（标签名/件数/使用次数）","相似标签对（相似度%）","未使用标签","当前mode"],"operations":["改名","合并","一键清理","忽略","整理建议","新建标签","复制数据","复制日志"],"status":["相似度公式"]} },
  'category_manage': { domain: 'items', scenarios: ["4-2"], requiredBlocks: {"empty":["空态：树为空即只有「新建顶级分类」","异常：数据解析失败","拦截态：有物品的分类不可删"],"fields":["分类树（层级＋每类计数）","操作提示","删除拦截说明"],"operations":["改名","合并","新建顶级分类","复制数据","复制日志"],"status":["种子8类（只可改不可删）"]} },
  'photos': { domain: 'items', scenarios: ["5-1","5-2"], requiredBlocks: {"empty":["空态：暂无照片＋补拍引导","异常：数据解析失败"],"fields":["物品（名称/ID）","照片列表（顺序/类型/主图标记）","当前mode"],"operations":["全部","类型筛选","确认顺序变更","加图·补拍","删除选中","下载照片","复制数据","复制日志"],"status":["普通","说明书-使用","说明书-安装","说明书-保养"]} },
  'photo_wall': { domain: 'items', scenarios: ["5-3"], requiredBlocks: {"empty":["空态：没有带照片的物品","补充态：还有N件无照片→去补拍","异常：数据解析失败"],"fields":["分组（分类/位置）","照片网格","无照片件数"],"operations":["全部","类型筛选","去补拍","按位置浏览","点图复制详情prompt","复制数据","复制日志"],"status":["照片类型","普通","说明书-使用","说明书-安装","说明书-保养"]} },
  'inventory_round': { domain: 'items', scenarios: ["6-1"], requiredBlocks: {"empty":["空态：范围内没有物品","异常：数据解析失败"],"fields":["范围","上次待复查（置顶）","核对清单（ID/位置/数量/状态）","三态判定","数量修正","状态修正（下拉）","新位置"],"operations":["在/不在/不确定","发现清单外物品","状态不变＋状态下拉","保存进度","确认提交（含差异）","复制数据","复制日志"],"status":["在","不在","不确定","状态不变","在家","备用","借用中","维修中","找不到","已废弃"]} },
  'inventory_diff': { domain: 'items', scenarios: ["6-2"], requiredBlocks: {"empty":["空态：该记录没有未处理差异","异常：数据解析失败"],"fields":["差异分组missing/extra/diff/pending","所属盘点记录","动作集","新位置输入","批量行"],"operations":["按实际更新","忽略","录入为新物品","标记复查","先不处理","批量确认","复制数据","复制日志"],"status":["缺","多","异","待确认"]} },
  'inventory_records': { domain: 'items', scenarios: ["6-3"], requiredBlocks: {"empty":["空态：还没有盘点记录","异常：数据解析失败"],"fields":["历史盘点（N）","发生时间","缺/多/异/待确认计数","记录状态"],"operations":["展开详情","处理差异","复查","开始盘点","复制数据","复制日志"],"status":["进行中","已完成","已处理","已复查"]} },
  'move_checklist': { domain: 'items', scenarios: ["6-4"], requiredBlocks: {"empty":["空态：无空态文案","异常：数据解析失败"],"fields":["分组（每组建数）","物品（ID/名称/位置/数量）","二态标记"],"operations":["全带走","全不带走","带走","不带走","统一确认","复制清单","复制数据","复制日志"],"status":["带走","不带走"]} },
  'history': { domain: 'items', scenarios: ["7-1"], requiredBlocks: {"empty":["空态：暂无事件","异常：数据解析失败"],"fields":["位置轨迹","时间线（N条）","事件条目（类型/摘要/diff展开）","已撤销标记"],"operations":["全部","类型筛选","展开详情","撤销","复制数据","复制日志"],"status":["状态变更","盘点","差异处理","已撤销"]} },
  'location_manage': { domain: 'space', scenarios: ["SM2-1"], requiredBlocks: {"empty":["空态：还没有位置＋建第一个位置引导","异常：数据解析失败／数据校验失败"],"fields":["位置树","已有路径","目标","受影响物品","相似位置组","源位置表单","新位置路径表单"],"operations":["新建位置","改名","删除","确认合并","复制prompt","关闭","复制数据","复制日志"],"status":["位置路径多级"]} },
  'fixed_spot': { domain: 'space', scenarios: ["SM2-2"], requiredBlocks: {"empty":["空态：还没有固定位＋常用件引导","异常：数据解析失败／数据校验失败","表单空值拦截"],"fields":["现有固定位清单（名称/ID/当前活跃位置/固定位）","物品表单","固定位表单"],"operations":["设置固定位","解除","复制prompt","关闭","复制数据","复制日志"],"status":["位置状态（非「在家」括号标出）"]} },
  'suggest_storage': { domain: 'space', scenarios: ["SM2-3"], requiredBlocks: {"empty":["空态：都有固定位了／没有可建议的物品","无依据态：暂无依据","备选空态：暂无其他备选","异常：数据解析失败／数据校验失败"],"fields":["推荐列表（推荐位置/理由/备选位置）","批量标记","总量","当前mode","无依据态"],"operations":["采纳（去移物品）","设为固定位","换一个建议","找没固定位的常用件","复制收纳建议","复制数据","复制日志"],"status":[]} },
  'space_view': { domain: 'space', scenarios: ["SM2-4"], requiredBlocks: {"empty":["空态：这里还没有东西（全屋与单层两套文案）","异常：数据解析失败／数据校验失败"],"fields":["面包屑","子层","当前层物品（名称/数量/状态）","当前层名/路径","路径总数","分层空态提示"],"operations":["下钻","移","补","减","复制建位置","复制收纳建议","复制数据","复制日志"],"status":["位置状态（缺省在家）"]} },
  'outfit_picker': { domain: 'outfit', scenarios: ["SM3-1"], requiredBlocks: {"empty":["空态：无空态文案","异常：数据解析失败／数据校验失败"],"fields":["多部位槽位（外层/内搭）","风格标签","推荐理由","备选组合","场合与天气"],"operations":["槽位切换","上一套","换一套","今天穿这套","复制数据","复制日志"],"status":["上班","约会","运动","家居","正式","自定义"]} },
  'wardrobe_analyze': { domain: 'outfit', scenarios: ["SM3-2"], requiredBlocks: {"empty":["空态：衣橱还没有在家衣物","无闲置态：衣橱状态良好","异常：数据解析失败／数据校验失败"],"fields":["衣橱构成","闲置清单","AI建议一句","汇总"],"operations":["标记废弃","送人","先不处理","缺口加入购物清单","复制数据","复制日志"],"status":["物品状态","在家口径"]} },
  'wardrobe_season': { domain: 'outfit', scenarios: ["SM3-3"], requiredBlocks: {"empty":["空态：没有带季节标签的在家衣物＋打标签引导","异常：数据解析失败／数据校验失败"],"fields":["季节","操作（收纳/拿出）","季节衣物清单","收纳位置下拉","候选位置","汇总"],"operations":["收纳位置下拉","自定义","全选/全不选","确认收纳／确认拿出","复制数据","复制日志"],"status":["物品状态","已收纳"]} },
  'travel_trip': { domain: 'outfit', scenarios: ["SM3-4"], requiredBlocks: {"empty":["空态：没有旅游中的物品／清单为空","异常：数据解析失败／数据校验失败"],"fields":["行程类型/天数/操作mode","清单物品卡片（名称/数量/位置/理由）","汇总"],"operations":["确认带出（标旅游中）","确认归位","复制数据","复制日志"],"status":["健身","出差","旅行","超市","游泳","爬山","滑雪","自定义","旅游中","在家"]} },
  'trip_outfit_plan': { domain: 'outfit', scenarios: ["SM3-5"], requiredBlocks: {"empty":["空态：没有可计划的衣物","无冲突态：衣物充足无重复冲突","异常：数据解析失败／数据校验失败"],"fields":["目的地/天数","每日计划（第N天＋温度＋组合）","冲突提示","行李汇总","汇总"],"operations":["日期按钮","采纳这天","生成行李清单","复制数据","复制日志"],"status":["每日温度"]} },
  'overview': { domain: 'stats', scenarios: ["SM4-1"], requiredBlocks: {"empty":["空态：还没有物品＋录入第一批引导","分区空态：暂无分类/位置/状态数据","异常：数据解析失败／数据校验失败"],"fields":["摘要（件数/总价/价格覆盖率/近30天变动）","分类分布","位置分布","状态分布","归属分布","价值TOP","高频TOP","趋势"],"operations":["点柱子复制筛选浏览prompt","复制初始化","复制补价提示","复制数据","复制日志"],"status":["全部合法物品状态"]} },
  'idle': { domain: 'stats', scenarios: ["SM4-2"], requiredBlocks: {"empty":["空态：衣橱状态良好＋没有超N天未使用","拦截态：还没有勾选任何处理","异常：数据解析失败／数据校验失败"],"fields":["闲置清单（按闲置时长排序）","闲置标准天数","AI建议","分类筛选","空态标记"],"operations":["分类下拉","勾选","标记废弃","送人","先不处理","确认处理","复制数据","复制日志"],"status":["标记废弃","送人","先不处理"]} },
  'expiring': { domain: 'stats', scenarios: ["SM4-3"], requiredBlocks: {"empty":["空态：没有即将过期的物品＋已检查未来N天","拦截态：还没有勾选任何处理","异常：数据解析失败／数据校验失败"],"fields":["已过期与未来N天预告（剩余天数）","预告天数","可调档位","分类筛选","摘要"],"operations":["分类下拉","勾选","已用完","废弃","忽略","确认处理","复制数据","复制日志"],"status":["已过期N天","今天到期","N天后到期","已用完","废弃","忽略"]} },
  'inventory_stat': { domain: 'stats', scenarios: ["SM4-4"], requiredBlocks: {"empty":["空态：还没有盘点记录＋完成首次盘点引导","异常：数据解析失败／数据校验失败"],"fields":["完成率与趋势","盘点明细（时间/范围/缺/多/异/状态）","遗留差异总数","复查入口","AI建议","有无数据标记"],"operations":["复查盘点","复制首次盘点","复制数据","复制日志"],"status":["进行中","已完成","已处理","已复查"]} },
  'list': { domain: 'express', scenarios: ["SM5-1"], requiredBlocks: {"empty":["空态：清单是空的＋试试引导","拦截态：请先勾选买到的条目","异常：数据解析失败"],"fields":["待买条目（名称/数量/来源标注）","清单内查重结果","摘要"],"operations":["我买到了","清单外新买的","给已有物品补货","记一笔要买的","检测家里缺什么","清掉已买记录","勾选","复制数据","复制日志"],"status":["待买","已买"]} },
  'missing': { domain: 'express', scenarios: ["SM5-2"], requiredBlocks: {"empty":["空态：库存充足没有缺货物品","拦截态：请先勾选缺货物品","异常：数据解析失败"],"fields":["缺货物品（物品/当前数量/阈值/建议量）","检测范围","摘要"],"operations":["勾选","加入购物清单","按范围检测","设置阈值","复制数据","复制日志"],"status":["在家","备用"]} },
  'express': { domain: 'express', scenarios: ["SM5-3"], requiredBlocks: {"empty":["空态：当前没有快递中物品","拦截态：请先勾选收到的物品","异常：数据解析失败"],"fields":["快递中物品（名称/已等N天/是否超时）","超时天数","摘要"],"operations":["勾选","我收到了","收到的放备用","新到的物品录入","复制数据","复制日志"],"status":["快递中","超时","在家","备用"]} },
  'stock': { domain: 'express', scenarios: ["SM5-4"], requiredBlocks: {"empty":["空态：还没有设置囤货阈值的物品","分区空态：常用品还没设阈值","拦截态：请先勾选","异常：数据解析失败"],"fields":["囤货物品（名称/数量/阈值/库存状态）","未设阈值提示","摘要"],"operations":["勾选","修正实际数量","设置阈值","设阈值","检测缺货","复制数据","复制日志"],"status":["充足","低","空"]} },
  'purchase_records': { domain: 'receipt', scenarios: ["SM6-1","SM6-2","SM6-3","SM6-4","SM6-5"], requiredBlocks: {"empty":["空态：暂无分类统计／暂无记录","异常：数据解析失败／数据校验失败"],"fields":["购买记录（物品名/ID/购买日/价格/渠道/商家客服/退货窗口/退货截止）","分类统计（分类/笔数/金额）","顺路提醒","空态提示"],"operations":["分类卡片筛选","新增购买记录","复制数据","复制日志"],"status":["已过退货期N天","今天最后可退","可退·剩N天","未设退货"]} },
  'warranty': { domain: 'receipt', scenarios: ["SM6-6","SM6-7","SM6-8","SM6-9","SM6-10"], requiredBlocks: {"empty":["空态：暂无登记","无事件时折叠区空态","异常：数据解析失败／数据校验失败"],"fields":["保修/保养清单（物品名/ID/类型/状态/到期日/剩余天数/维修次数/服务事件）","状态筛选","空态提示"],"operations":["状态筛选","记录维修","执行保养","新增保修/保养","复制数据","复制日志"],"status":["在保","即将到期","已过","到期未做","全部","已做"]} },
  'certificates': { domain: 'receipt', scenarios: ["SM6-11","SM6-12","SM6-13","SM6-14"], requiredBlocks: {"empty":["空态：暂无登记","异常：数据解析失败／数据校验失败","敏感口径：号码脱敏·复制数据不含证件号"],"fields":["证件清单（类型/持有人/ID/到期日/剩余天数/证件状态/脱敏号码/备注）","空态提示"],"operations":["更新","补照片","新增证件","复制数据","复制日志"],"status":["有效","即将到期","已过期","已过期N天","今天到期","N天后到期"]} },
  'accounts': { domain: 'receipt', scenarios: ["SM6-15","SM6-16","SM6-17","SM6-18"], requiredBlocks: {"empty":["空态：暂无账号","异常：数据解析失败／数据校验失败","敏感横幅：本页不含任何明文密码","复制密码前二次确认"],"fields":["账号分组（平台/用户名/类型）","总数","空态提示"],"operations":["新增账号","查看密码","复制密码","复制数据","复制日志"],"status":["购物","银行","社交","其他"]} },
  'family_borrow': { domain: 'family', scenarios: ["SM7-1"], requiredBlocks: {"empty":["空态：暂无借用记录","超期提醒","异常：数据解析失败／数据校验失败"],"fields":["借出/借入双向分区","超期件数","记录（物品名/对象/借出日/约定归还日/状态/已借天数/备注）","登记表单"],"operations":["确认归还","复制催还文案","确认登记","复制数据","复制日志"],"status":["已超期","今日到期","已归还","借用中"]} },
  'family_members': { domain: 'family', scenarios: ["SM7-2"], requiredBlocks: {"empty":["空态：还没有家人档案","无物品态：库里还没有物品","异常：数据解析失败／数据校验失败"],"fields":["成员列表","物品归属勾选清单","物品总数","添加成员表单"],"operations":["移除成员","确认标记归属","确认添加","复制数据","复制日志"],"status":["成员关系自由文本","物品默认归属使用者"]} },
  'first_use_wizard': { domain: 'setup', scenarios: ["SM8-1"], requiredBlocks: {"empty":["异常：数据解析失败／数据校验失败／初始化失败","幂等提示：已初始化"],"fields":["6步步骤条","环境信息","建库结果","下一步"],"operations":["开始初始化","一键重试","先配置环境变量","开始录入第一批","知道了","复制数据","复制日志"],"status":["done","current","fail","pending"]} },
  'health_report': { domain: 'setup', scenarios: ["SM8-2"], requiredBlocks: {"empty":["空态：数据健康良好＋未发现数据问题","拦截态：请先勾选至少1个问题","异常：数据解析失败／数据校验失败"],"fields":["环境信息","检查项列表","问题总数","健康标记","动作列"],"operations":["勾选","复制选中修复引导","知道了","复制数据","复制日志"],"status":["良好","待处理"]} },
  'backup_receipt': { domain: 'setup', scenarios: ["SM8-3"], requiredBlocks: {"empty":["空态：暂无备份记录","异常：数据解析失败／数据校验失败／备份失败","空值拦截：该参数不能为空"],"fields":["本次备份（路径/大小/时间）","备份历史（保留N份）","距上次备份天数","保留份数输入"],"operations":["保留份数下拉","确认备份","导出JSON","导出CSV","删除最旧备份","知道了","复制数据","复制日志"],"status":["保留份数默认值"]} },
  'import_restore': { domain: 'setup', scenarios: ["SM8-4"], requiredBlocks: {"empty":["冲突超10条折叠","异常：数据解析失败／数据校验失败／导入失败","承诺语：导入前自动备份＋失败回滚"],"fields":["四步（选择文件/校验结果/冲突预览/确认导入）","校验项","冲突名单","导入结果"],"operations":["选择文件","冲突处理下拉","确认导入","撤销导入","知道了","复制数据","复制日志"],"status":["跳过同名","覆盖同名","done","current"]} },
};

// fail-closed：未知族不猜，调用方显式处理。
/** @param {string} family @returns {FamilyBlocks} */
export function blocksFor(family) {
  const b = PAGE_BLOCKS[family];
  if (!b) throw new Error('未知页族：' + family);
  return b;
}

/** @param {string} domain @returns {string[]} */
export function familiesOf(domain) {
  return Object.keys(PAGE_BLOCKS).filter((f) => PAGE_BLOCKS[f].domain === domain).sort();
}
