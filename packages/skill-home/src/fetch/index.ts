export { HomeFetchError, HomePolicyError } from './errors.js';
export {
  SCHEMA_VERSION, openHomeDb, closeHomeDb, addItem, getItemById,
  listLocationsByItem, listTagsByItem, searchItems, updateItem, adjustQuantity,
  setLocationStatus, moveLocation, setItemTags, listAllTags, mergeTags,
  listCategories, getCategoryById, encryptPassword, decryptPassword, assertMasterKey,
} from './db.js';
export type { HomeItem, HomeLocation, HomeDb, SearchFilter } from './db.js';
export { resolveDbDir, resolveDbPath, assertWritablePath, DB_FILENAME } from './paths.js';
export {
  addInventoryRecord, listInventoryRecords, listLocationNodes, ensureLocationNode,
  listShopping, addShopping, checkShopping, missingItems, stockList, setThreshold,
  listPurchases, addPurchase, purchaseYearStats, listWarranties, addWarranty, addServiceEvent,
  listCerts, addCert, listAccounts, listMembers, addMember, listBorrows, addBorrow,
  statsOverview, highFreq, idleItems, expiringItems,
} from './domains.js';
