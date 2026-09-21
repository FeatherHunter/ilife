#!/usr/bin/env node
/** 种子库 · 数据规格（票 #802）。
 *
 * 覆盖 70 条场景（73 减去联动 3 条 SM9-1／SM9-2／SM9-3，本图已裁不做）。
 * 字段与票 1 册子（`docs/skills/skill-home/pages-ledger.md` 表一）逐项对齐，取值见下表注释。
 * 本件只放“要灌什么”，怎么灌（幂等／文件／SQL）归 `seed-scenes.mjs`，怎么查归 `seed-scenes-checks.mjs`。
 *
 * 对外只给六样：LOCATIONS／FIXED_SPOTS／CATEGORIES_EXTRA／ITEMS／
 * SHOPPING／MEMBERS／BORROWS（其余 purchase／warranty／cert／account／inventory
 * 的行由主脚本按日期函数生成，日期须随“今天”走，不能写死）。
 */
export const SEED_VERSION = 'seed-scenes-v1';

/** 位置树节点（含多级路径，SM2-1／SM2-4 下钻用）。 */
export const LOCATIONS = [
  '客厅/电视柜',
  '客厅/茶几',
  '客厅/阳台柜',
  '卧室/衣柜',
  '卧室/床头柜',
  '厨房/冰箱',
  '厨房/吊柜',
  '书房/书桌',
  '书房/抽屉',
  '玄关/鞋柜',
  '玄关/挂钩',
  '卫生间/镜柜',
  '阳台/收纳箱',
  '儿童房/书桌',
  '车库/工具墙',
];

/** 固定位：常用件锚定（SM2-2，落 `items.fixed_location`）。 */
export const FIXED_SPOTS = [
  { item: '家门钥匙', fixed: '玄关/挂钩' },
  { item: '手机充电器', fixed: '书房/书桌' },
  { item: '家庭药箱', fixed: '卧室/床头柜' },
  { item: '电视遥控器', fixed: '客厅/茶几' },
];

/** 分类 children（8 顶级由 `openHomeDb` 自动种，这里只加 children，4-2 分类树用）。 */
export const CATEGORIES_EXTRA = [
  { parent: '衣物与穿戴', name: '上衣' },
  { parent: '衣物与穿戴', name: '裤装' },
  { parent: '衣物与穿戴', name: '鞋靴' },
  { parent: '衣物与穿戴', name: '配饰' },
  { parent: '食物与饮品', name: '主食' },
  { parent: '食物与饮品', name: '零食' },
  { parent: '家居与陈设', name: '收纳' },
  { parent: '工具与器材', name: '维修工具' },
  { parent: '数码与电子', name: '线缆' },
  { parent: '数码与电子', name: '配件' },
  { parent: '健康与医药', name: '常备药' },
  { parent: '文体与娱乐', name: '书籍' },
];

/**
 * 物品行（共 62 行，每行同时服务多场景；`photo` 取 `seed-png.mjs` 色板文件名或空）。
 * 字段：name／category（顶级名，children 另按需挂 category_id）／location／qty／status／
 * price／tags／photo／purchaseDate（相对今天的天数偏移，负＝过去）／expireInDays（相对今天，
 * 负＝已过期，null＝无保质期）／fixed（固定位或空）。
 */
export const ITEMS = [
  // 穿搭候选（SM3-1 要 category/name 含 衣/鞋/穿 ＋ access_count 排序取前 5）
  { name: '白色棉T恤-衣', category: '衣物与穿戴', location: '卧室/衣柜', qty: 3, status: '在家', price: 59, tags: ['夏季', '常穿'], photo: '', purchaseOffset: -40, expireInDays: null, fixed: '' },
  { name: '牛仔外套-衣', category: '衣物与穿戴', location: '卧室/衣柜', qty: 1, status: '在家', price: 299, tags: ['春秋', '常穿', '薄外套'], photo: 'seed-jacket-red.png', purchaseOffset: -200, expireInDays: null, fixed: '' },
  { name: '薄风衣-衣', category: '衣物与穿戴', location: '卧室/衣柜', qty: 1, status: '在家', price: 359, tags: ['春秋', '薄外衣'], photo: '', purchaseOffset: -180, expireInDays: null, fixed: '' },
  { name: '白色运动鞋-鞋', category: '衣物与穿戴', location: '玄关/鞋柜', qty: 1, status: '在家', price: 499, tags: ['常穿', '运动'], photo: 'seed-shoes-blue.png', purchaseOffset: -90, expireInDays: null, fixed: '' },
  { name: '黑色皮鞋-鞋', category: '衣物与穿戴', location: '玄关/鞋柜', qty: 1, status: '在家', price: 699, tags: ['正式'], photo: '', purchaseOffset: -300, expireInDays: null, fixed: '' },
  { name: '灰色羽绒服-衣', category: '衣物与穿戴', location: '阳台/收纳箱', qty: 1, status: '在家', price: 899, tags: ['冬季', '已收纳'], photo: '', purchaseOffset: -400, expireInDays: null, fixed: '' },
  { name: '羊毛大衣-衣', category: '衣物与穿戴', location: '阳台/收纳箱', qty: 1, status: '在家', price: 1299, tags: ['冬季'], photo: '', purchaseOffset: -380, expireInDays: null, fixed: '' },
  { name: '速干T恤-衣', category: '衣物与穿戴', location: '卧室/衣柜', qty: 2, status: '在家', price: 99, tags: ['夏季', '运动'], photo: '', purchaseOffset: -60, expireInDays: null, fixed: '' },
  // 闲置候选（SM3-2／SM4-2：last_accessed_at 由主脚本按 idleDays 回拨）
  { name: '旧登山包', category: '文体与娱乐', location: '阳台/收纳箱', qty: 1, status: '在家', price: 329, tags: ['户外'], photo: '', purchaseOffset: -700, expireInDays: null, fixed: '', idleDays: 210 },
  { name: '闲置电水壶', category: '家居与陈设', location: '厨房/吊柜', qty: 1, status: '备用', price: 149, tags: ['厨房用具'], photo: '', purchaseOffset: -600, expireInDays: null, fixed: '', idleDays: 190 },
  { name: '旧款平板', category: '数码与电子', location: '书房/抽屉', qty: 1, status: '备用', price: 1999, tags: ['数码'], photo: '', purchaseOffset: -800, expireInDays: null, fixed: '', idleDays: 320 },
  { name: '瑜伽垫', category: '文体与娱乐', location: '阳台/收纳箱', qty: 1, status: '在家', price: 129, tags: ['运动'], photo: '', purchaseOffset: -500, expireInDays: null, fixed: '', idleDays: 130 },
  // 过期候选（SM4-3：expireInDays 相对今天）
  { name: '纯牛奶-过期', category: '食物与饮品', location: '厨房/冰箱', qty: 2, status: '在家', price: 6, tags: ['早餐'], photo: '', purchaseOffset: -12, expireInDays: -3, fixed: '' },
  { name: '酸奶-临期', category: '食物与饮品', location: '厨房/冰箱', qty: 4, status: '在家', price: 5, tags: ['早餐'], photo: '', purchaseOffset: -5, expireInDays: 2, fixed: '' },
  { name: '感冒冲剂', category: '健康与医药', location: '卧室/床头柜', qty: 1, status: '在家', price: 28, tags: ['常备药'], photo: '', purchaseOffset: -200, expireInDays: 12, fixed: '' },
  { name: '午餐肉罐头', category: '食物与饮品', location: '厨房/吊柜', qty: 3, status: '在家', price: 18, tags: ['囤货'], photo: '', purchaseOffset: -30, expireInDays: 25, fixed: '' },
  { name: '挂面', category: '食物与饮品', location: '厨房/吊柜', qty: 2, status: '在家', price: 12, tags: ['主食'], photo: '', purchaseOffset: -20, expireInDays: 200, fixed: '' },
  { name: '维生素C-今天到期', category: '健康与医药', location: '卧室/床头柜', qty: 1, status: '在家', price: 45, tags: ['常备药'], photo: '', purchaseOffset: -100, expireInDays: 0, fixed: '' },
  // 快递中（SM5-3：purchaseOffset 决定等了几天，>7 即超时）
  { name: '快递-蓝牙音箱', category: '数码与电子', location: '快递中转', qty: 1, status: '快递中', price: 259, tags: ['数码'], photo: '', purchaseOffset: -11, expireInDays: null, fixed: '' },
  { name: '快递-童书三册', category: '文体与娱乐', location: '快递中转', qty: 3, status: '快递中', price: 89, tags: ['书籍'], photo: '', purchaseOffset: -9, expireInDays: null, fixed: '' },
  { name: '快递-咖啡豆', category: '食物与饮品', location: '快递中转', qty: 1, status: '快递中', price: 68, tags: ['零食'], photo: '', purchaseOffset: -2, expireInDays: 180, fixed: '' },
  // 旅游中（SM3-4 带/归）
  { name: '旅行洗漱包', category: '家居与陈设', location: '行李箱', qty: 1, status: '旅游中', price: 79, tags: ['旅行'], photo: '', purchaseOffset: -50, expireInDays: null, fixed: '' },
  { name: '登机箱', category: '家居与陈设', location: '玄关/鞋柜', qty: 1, status: '旅游中', price: 399, tags: ['旅行'], photo: '', purchaseOffset: -120, expireInDays: null, fixed: '' },
  // 借用中（SM7-1：状态借用中 ＋ borrow_records 对应行）
  { name: '电钻', category: '工具与器材', location: '邻居王阿姨家', qty: 1, status: '借用中', price: 329, tags: ['维修'], photo: 'seed-tool-teal.png', purchaseOffset: -300, expireInDays: null, fixed: '' },
  { name: '折叠梯', category: '工具与器材', location: '邻居王阿姨家', qty: 1, status: '借用中', price: 199, tags: ['维修'], photo: '', purchaseOffset: -250, expireInDays: null, fixed: '' },
  { name: '露营帐篷', category: '文体与娱乐', location: '朋友小李处', qty: 1, status: '借用中', price: 599, tags: ['户外'], photo: '', purchaseOffset: -160, expireInDays: null, fixed: '' },
  // 重名组（2-6 查重复／3-5 合并：同名多行）
  { name: '充电线', category: '数码与电子', location: '客厅/电视柜', qty: 2, status: '在家', price: 29, tags: ['线缆'], photo: '', purchaseOffset: -80, expireInDays: null, fixed: '' },
  { name: '充电线', category: '数码与电子', location: '书房/书桌', qty: 1, status: '在家', price: 29, tags: ['线缆'], photo: '', purchaseOffset: -70, expireInDays: null, fixed: '' },
  { name: '剪刀', category: '工具与器材', location: '厨房/吊柜', qty: 1, status: '在家', price: 25, tags: ['厨房用品'], photo: '', purchaseOffset: -200, expireInDays: null, fixed: '' },
  { name: '剪刀', category: '工具与器材', location: '书房/抽屉', qty: 1, status: '在家', price: 25, tags: ['厨房用具'], photo: '', purchaseOffset: -190, expireInDays: null, fixed: '' },
  { name: '雨伞', category: '家居与陈设', location: '玄关/鞋柜', qty: 1, status: '在家', price: 69, tags: ['出行'], photo: '', purchaseOffset: -150, expireInDays: null, fixed: '' },
  { name: '雨伞', category: '家居与陈设', location: '车库/工具墙', qty: 1, status: '备用', price: 69, tags: ['出行'], photo: '', purchaseOffset: -140, expireInDays: null, fixed: '' },
  // 照片组（5-1／5-2／5-3：photo 非空 ＋ 文件真实存在）
  { name: '家门钥匙', category: '家居与陈设', location: '玄关/挂钩', qty: 1, status: '在家', price: 0, tags: ['常备', '出行'], photo: 'seed-key-yellow.png', purchaseOffset: -900, expireInDays: null, fixed: '玄关/挂钩' },
  { name: '手机充电器', category: '数码与电子', location: '书房/书桌', qty: 2, status: '在家', price: 49, tags: ['线缆', '常备'], photo: 'seed-cable-gray.png', purchaseOffset: -120, expireInDays: null, fixed: '书房/书桌' },
  { name: '家庭药箱', category: '健康与医药', location: '卧室/床头柜', qty: 1, status: '在家', price: 199, tags: ['常备药'], photo: 'seed-medicine-green.png', purchaseOffset: -365, expireInDays: null, fixed: '卧室/床头柜' },
  { name: '电视遥控器', category: '数码与电子', location: '客厅/茶几', qty: 1, status: '在家', price: 0, tags: ['常备'], photo: '', purchaseOffset: -500, expireInDays: null, fixed: '客厅/茶几' },
  { name: '绘本-小熊维尼', category: '文体与娱乐', location: '儿童房/书桌', qty: 1, status: '在家', price: 39, tags: ['书籍'], photo: 'seed-book-purple.png', purchaseOffset: -60, expireInDays: null, fixed: '' },
  { name: '坚果礼盒', category: '食物与饮品', location: '客厅/阳台柜', qty: 1, status: '在家', price: 88, tags: ['零食'], photo: 'seed-food-orange.png', purchaseOffset: -10, expireInDays: 90, fixed: '' },
  // 囤货阈值组（SM5-2 缺货／SM5-4 囤货：threshold 由主脚本按名设）
  { name: '大米', category: '食物与饮品', location: '厨房/吊柜', qty: 1, status: '在家', price: 68, tags: ['主食', '囤货'], photo: '', purchaseOffset: -25, expireInDays: 300, fixed: '' },
  { name: '抽纸', category: '家居与陈设', location: '卫生间/镜柜', qty: 2, status: '在家', price: 30, tags: ['囤货'], photo: '', purchaseOffset: -15, expireInDays: null, fixed: '' },
  { name: '洗衣液', category: '家居与陈设', location: '阳台/收纳箱', qty: 1, status: '在家', price: 46, tags: ['囤货'], photo: '', purchaseOffset: -35, expireInDays: null, fixed: '' },
  { name: '电池5号', category: '家居与陈设', location: '书房/抽屉', qty: 8, status: '在家', price: 20, tags: ['囤货'], photo: '', purchaseOffset: -50, expireInDays: null, fixed: '' },
  { name: '垃圾袋', category: '家居与陈设', location: '厨房/吊柜', qty: 10, status: '在家', price: 15, tags: ['囤货'], photo: '', purchaseOffset: -8, expireInDays: null, fixed: '' },
  // 保修/保养载体（SM6-6～SM6-10：warranty 挂这些物品）
  { name: '变频空调', category: '家居与陈设', location: '客厅/电视柜', qty: 1, status: '在家', price: 3299, tags: ['大家电'], photo: '', purchaseOffset: -500, expireInDays: null, fixed: '' },
  { name: '滚筒洗衣机', category: '家居与陈设', location: '卫生间/镜柜', qty: 1, status: '在家', price: 2799, tags: ['大家电'], photo: '', purchaseOffset: -700, expireInDays: null, fixed: '' },
  { name: '笔记本电脑', category: '数码与电子', location: '书房/书桌', qty: 1, status: '在家', price: 5999, tags: ['数码'], photo: '', purchaseOffset: -400, expireInDays: null, fixed: '' },
  { name: '扫地机器人', category: '家居与陈设', location: '客厅/电视柜', qty: 1, status: '维修中', price: 1599, tags: ['大家电'], photo: '', purchaseOffset: -350, expireInDays: null, fixed: '' },
  { name: '净水器', category: '家居与陈设', location: '厨房/吊柜', qty: 1, status: '在家', price: 1999, tags: ['大家电'], photo: '', purchaseOffset: -200, expireInDays: null, fixed: '' },
  { name: '油烟机', category: '家居与陈设', location: '厨房/吊柜', qty: 1, status: '在家', price: 1299, tags: ['大家电'], photo: '', purchaseOffset: -600, expireInDays: null, fixed: '' },
  // 购买记录载体（SM6-1～SM6-5：purchase 挂这些物品，日期由主脚本按“今天”生成）
  { name: '空气炸锅', category: '家居与陈设', location: '厨房/吊柜', qty: 1, status: '在家', price: 399, tags: ['厨房用具'], photo: '', purchaseOffset: -6, expireInDays: null, fixed: '' },
  { name: '冲锋衣-衣', category: '衣物与穿戴', location: '卧室/衣柜', qty: 1, status: '在家', price: 799, tags: ['户外', '冬季'], photo: '', purchaseOffset: -35, expireInDays: null, fixed: '' },
  { name: '儿童水杯', category: '家居与陈设', location: '厨房/吊柜', qty: 1, status: '在家', price: 59, tags: ['出行'], photo: '', purchaseOffset: -3, expireInDays: null, fixed: '' },
  { name: '实木书架', category: '家居与陈设', location: '书房/书桌', qty: 1, status: '在家', price: 899, tags: ['收纳'], photo: '', purchaseOffset: -100, expireInDays: null, fixed: '' },
  { name: '跑步机', category: '文体与娱乐', location: '阳台/收纳箱', qty: 1, status: '备用', price: 2299, tags: ['运动'], photo: '', purchaseOffset: -250, expireInDays: null, fixed: '' },
  // 高频（SM4-1 TOP：主脚本把这三件 access_count 调高）
  { name: '常用剪刀-高频', category: '工具与器材', location: '书房/书桌', qty: 1, status: '在家', price: 35, tags: ['常备'], photo: '', purchaseOffset: -90, expireInDays: null, fixed: '', hotCount: 58 },
  { name: '常用水杯-高频', category: '家居与陈设', location: '客厅/茶几', qty: 1, status: '在家', price: 49, tags: ['常备'], photo: '', purchaseOffset: -80, expireInDays: null, fixed: '', hotCount: 41 },
  { name: '常用体温计-高频', category: '健康与医药', location: '卧室/床头柜', qty: 1, status: '在家', price: 89, tags: ['常备药'], photo: '', purchaseOffset: -70, expireInDays: null, fixed: '', hotCount: 33 },
  // 零散补齐（搜索/浏览/统计的基数）
  { name: '玻璃保鲜盒', category: '家居与陈设', location: '厨房/冰箱', qty: 4, status: '在家', price: 99, tags: ['厨房用品'], photo: '', purchaseOffset: -45, expireInDays: null, fixed: '' },
  { name: '不锈钢锅', category: '家居与陈设', location: '厨房/吊柜', qty: 1, status: '在家', price: 299, tags: ['厨房用具'], photo: '', purchaseOffset: -110, expireInDays: null, fixed: '' },
  { name: '羽毛球拍', category: '文体与娱乐', location: '阳台/收纳箱', qty: 2, status: '在家', price: 159, tags: ['运动'], photo: '', purchaseOffset: -130, expireInDays: null, fixed: '' },
  { name: '眼镜盒', category: '家居与陈设', location: '卧室/床头柜', qty: 1, status: '在家', price: 39, tags: ['配饰'], photo: '', purchaseOffset: -95, expireInDays: null, fixed: '' },
  { name: '备用钥匙-车库', category: '家居与陈设', location: '车库/工具墙', qty: 1, status: '备用', price: 0, tags: ['常备'], photo: '', purchaseOffset: -800, expireInDays: null, fixed: '' },
];

/** 购物清单行（SM5-1，routine 例行/null 臨時）。 */
export const SHOPPING = [
  { name: '牛奶', quantity: 2, routine: '例行' },
  { name: '垃圾袋', quantity: 1, routine: null },
  { name: '电池5号', quantity: 4, routine: '例行' },
  { name: '洗洁精', quantity: 1, routine: null },
];

/** 家人（SM7-2，relation 自由文本，老实现无枚举，照实透传）。 */
export const MEMBERS = [
  { name: '爸爸', relation: '父亲' },
  { name: '妈妈', relation: '母亲' },
  { name: '孩子', relation: '儿子' },
  { name: '邻居王阿姨', relation: '邻居' },
];

/** 借用行（SM7-1：item 按名解析，member 对应 MEMBERS，action 借出/借入/归还，date 相对偏移）。 */
export const BORROWS = [
  { item: '电钻', member: '邻居王阿姨', action: '借出', dateOffset: -40 },
  { item: '露营帐篷', member: '朋友小李', action: '借出', dateOffset: -35 },
  { item: '绘本-小熊维尼', member: '孩子', action: '借入', dateOffset: -5 },
  { item: '常用水杯-高频', member: '爸爸', action: '归还', dateOffset: -1 },
  { item: '折叠梯', member: '邻居王阿姨', action: '借出', dateOffset: -2 },
];
