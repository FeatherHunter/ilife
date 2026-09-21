/** 采购能力门：能力对外只经这里（结构纪律铁律一、铁律五）。
 *
 * 对外两件：命令声明表与路由声明表。处理函数与取数实现不在这里，
 * 本票只立声明；外边要用采购能力的东西，只经这两个名字。
 */

export { SHOPPING_COMMANDS } from './commands.js';
export { SHOPPING_ROUTES } from './routes.js';
export { buildShopping, buildShoppingList, runShoppingQuery } from './run.js';
export { shoppingListPage } from './pages.js';
