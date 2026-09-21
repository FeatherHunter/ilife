export { ChefFetchError, ChefPolicyError } from './errors.js';
export { DEFAULT_DB_FILENAME, dbFilename, resolveDbDir, resolveDbPath } from './paths.js';
export { openChefDb, closeChefDb, listRecipes, getRecipeDetail, queryHistory, historyStats } from './db.js';
// #839 搬迁债务（到期＝收口票把测试改打域接口后删）：下十件的新家在域目录，
// 本 barrel 只转出、不断言内容（结构纪律铁律五：过渡期旧共用 barrel 对新家内部件的深路径直引用）。
export { filterRecipes, searchRecipes } from '../search/run.js';
export { recordHistory } from '../history/run-record.js';
export { buildShoppingList } from '../shopping/run.js';
export { healthCheck } from '../data/run-query.js';
export { addIngredient, addRecipe, addStep } from '../add/run-write.js';
export { deprecateRecipe, updateRecipe } from '../update/run-write.js';
export type { RecipeRow, IngredientRow, StepRow, HistoryRow, HealthIssue, ChefDb } from './db.js';
export type { ShoppingItem as ChefShoppingItem } from './db.js';
