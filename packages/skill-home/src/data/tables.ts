/** #962 · 居家管家数据族允许清单（显式声明）：目录命令允许暴露哪些表。
 *
 * 出处：`docs/agents/数据族-规格.md` §五——表清单必须显式，不能“库里有什么就给什么”。
 * 本家库里有 16 张表（见 `src/fetch/db.ts` 的 `openHomeDb` 建表序），是六家里最多的一家。
 * 允许清单只列其中 15 张；列目录不另存第二份，运行时 `PRAGMA table_info` 现读
 * （公共层 `readDataSchema`，校验用的目录与返回的目录是同一份）。
 *
 * 逐表点名（16 张全到，顺序即建表序）：
 * - items：物品主体，允许。
 * - item_locations：物品位置与数量，允许。
 * - item_tags：物品标签，允许。
 * - categories：分类树，允许（含内部列 `seed_key`：种子标识，程序面可读，模型不可见；
 *   按 PRAGMA 现读无法隐列，卡路里样板对 `is_deleted` 等内部列同口径容忍）。
 * - accounts：**不允许**（见 `HOME_DATA_DENIED`：含 `encrypted_password` 加密口令列，
 *   配套主密钥文件 `.master.key`；视图层 `listAccounts` 已主动不回该列，数据族无法隐列故整表不暴露）。
 * - purchase_records：购买记录，允许。
 * - warranties：保修记录，允许。
 * - service_events：维修事件，允许。
 * - certificates：证件记录，允许（视图层对人显示时脱敏为 `number_masked`，
 *   数据族面只给程序用〈`surface: program`，模型不可见〉，故程序可读原文；口径见本件头）。
 * - family_members：家人，允许。
 * - borrow_records：借用记录，允许。
 * - shopping_items：购物清单，允许。
 * - stock_thresholds：库存阈值，允许。
 * - item_events：物品事件审计，允许。
 * - inventory_records：盘点记录，允许。
 * - location_nodes：位置节点索引，允许。
 *
 * 顺序即目录命令返回的顺序（确定性可比，判据按此逐条断言）。
 */
export const HOME_DATA_TABLES = [
  'items',
  'item_locations',
  'item_tags',
  'categories',
  'purchase_records',
  'warranties',
  'service_events',
  'certificates',
  'family_members',
  'borrow_records',
  'shopping_items',
  'stock_thresholds',
  'item_events',
  'inventory_records',
  'location_nodes',
] as const;

export type HomeDataTable = (typeof HOME_DATA_TABLES)[number];

/** 本家不允许暴露的表（逐条登记并留说明；将来各家表清单裁定的样板）。
 *
 * - accounts：含 `encrypted_password` 加密口令列，配套主密钥文件 `.master.key`
 *   （`src/fetch/paths.ts` 的 `keyFileOf`／`src/fetch/masterKey.ts` 的 `loadMasterKey`；
 *   口令不经调用参数传，只落磁盘一处）。视图层 `listAccounts` 只回
 *   `platform／username／type` 三列、从不回密文；数据族按 `PRAGMA` 现读无法隐列，
 *   一旦允许即把密文交给程序消费，故整表不暴露。`accounts` 行的增删改查仍走既有
 *   票据读写键（视图族／写族），不在本族。
 */
export const HOME_DATA_DENIED = [
  {
    table: 'accounts',
    reason:
      '含 encrypted_password 加密口令列，配套主密钥文件 .master.key；视图层 listAccounts 已主动不回该列，数据族按 PRAGMA 现读无法隐列，故整表不暴露',
  },
] as const;

/** 本家库内 16 张表的全集（允许 15 ＋ 不允许 1）：判据用它断“逐表点名无遗漏”。 */
export const HOME_DATA_ALL_TABLES = [
  'items',
  'item_locations',
  'item_tags',
  'categories',
  'accounts',
  'purchase_records',
  'warranties',
  'service_events',
  'certificates',
  'family_members',
  'borrow_records',
  'shopping_items',
  'stock_thresholds',
  'item_events',
  'inventory_records',
  'location_nodes',
] as const;
