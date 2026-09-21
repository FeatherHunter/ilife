/** 录入能力门：能力对外只经这里（结构纪律铁律一、铁律五）。
 *
 * 对外两件：命令声明表与路由声明表。处理函数与取数实现不在这里，
 * 本票只立声明；外边要用录入能力的东西，只经这两个名字。
 * 修改域引用 `chef.recipe.write` 时走这里（key 名的引用口，不另立声明）。
 */

export { ADD_COMMANDS } from './commands.js';
export { ADD_ROUTES } from './routes.js';
export { addIngredient, addRecipe, addStep, runRecipeWriteAdd } from './run-write.js';
