export { HomeFetchError, HomePolicyError } from './errors.js';
export {
  SCHEMA_VERSION, openHomeDb, closeHomeDb, addItem, getItemById,
  listLocationsByItem, listTagsByItem, searchItems, updateItem, adjustQuantity,
  setLocationStatus, moveLocation, setItemTags, listAllTags, mergeTags,
  listCategories, getCategoryById, encryptPassword, decryptPassword, assertMasterKey,
} from './db.js';
export type { HomeItem, HomeLocation, HomeDb, SearchFilter } from './db.js';
export { resolveDbDir, resolveDbPath, dbFilename, DEFAULT_DB_FILENAME } from './paths.js';
export { resolveHtmlDir } from './paths.js';
export { resolveKeyFile, keyFileOf, resolvedHomePaths } from './paths.js';
export type { HomeResolvedPaths } from './paths.js';
export { loadMasterKey, retiredParamMessage, hasParamMasterKey } from './masterKey.js';
// #707：备份导出／导入恢复（HELP SM8-3／SM8-4）的落点。
export { resolveBackupDir, createBackup, listBackups, restoreBackup, exportData } from './backup.js';
export {
  addInventoryRecord, listInventoryRecords, listLocationNodes, ensureLocationNode,
  listShopping, addShopping, checkShopping, missingItems, stockList, setThreshold,
  listPurchases, addPurchase, purchaseYearStats, listWarranties, addWarranty, addServiceEvent,
  listCerts, addCert, listAccounts, listMembers, addMember, listBorrows, addBorrow,
  statsOverview, highFreq, idleItems, expiringItems,
  // #865：统计取数补齐（分布明细／价值与高频排行／趋势／盘点明细）。
  localToday, frequentTopItems, valueTopItems, categoryDistribution, locationDistribution,
  statusDistribution, ownerDistribution, recordTrend, inventoryDetail,
} from './domains.js';
