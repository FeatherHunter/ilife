// 记账技能（bill）对外的包门。**只许收窄**（#683 §六 守卫⑤：导出名集只许变短）。
// #689 结构搬迁第三批：原第二行 `export * from './policy/index.js'` 随 `src/policy/` 的拆散与删除**整条拿掉**——
// 那 7 件的名字按归属律散回各自的家（`shared/category.ts`／`shared/dateRange.ts`／`shared/params.ts`／
// `shared/kpi.ts`／`write/`／`analysis/`／`goal/`／`account/`／`help/`／`triggers/`），包门**不**把它们照抄出来：
// 包外的消费方（含本包测试）直接取新家；要走的对外面是下面这三扇门。
export * from './fetch/index.js';
export * from './render/index.js';
export * from './help/index.js';
