export { ChefFetchError, ChefPolicyError } from './errors.js';
export { DEFAULT_DB_FILENAME, dbFilename, resolveDbDir, resolveDbPath } from './paths.js';
export { openChefDb, closeChefDb, addRecipe, addIngredient, addStep, listRecipes, filterRecipes, searchRecipes, getRecipeDetail, deprecateRecipe, updateRecipe, recordHistory, queryHistory, historyStats, buildShoppingList, healthCheck } from './db.js';
export type { RecipeRow, IngredientRow, StepRow, HistoryRow, HealthIssue, ChefDb } from './db.js';
export type { ShoppingItem as ChefShoppingItem } from './db.js';
