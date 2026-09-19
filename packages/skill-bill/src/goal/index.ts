/** 目标域对外的门：**命令声明**（权威源在 `./commands.ts`，这里只是转出）。
 *
 * **本域是第一个「读写两类命令同域」的样本**（#730 判据 6 要的结论就写在这里）：
 *  一个域里同时放写入口与读入口**不需要第二个入口函数**——两条命令的差别只有 `kind`／`shape` 两格，
 *  而**命令声明里的 `run` 就是唯一入口**：出口分派改成按注册表直接调 `spec.run` 之后
 *  （`src/cli/cmd_read.ts` 的 `runRegistered`，账户域那一窗改的），域门只转出「命令声明」这一件就够。
 *  对照兄弟域的两处口径注释：`src/account/index.ts` 记的是「本域纯写、也不再有第二个入口」，
 *  `src/query/index.ts` 记的是「本域纯读、`runQueryRead` 那个入口是给按域写死的分派用的」；
 *  纯写／纯读两域各自的入口函数**是为那一窗的分派形状服务的**，本域（读写同域）没有那个形状可服务，
 *  故一件不留。**形状事实**（哪条写、哪条读、各自什么 envelope 形状）只住 `./commands.ts` 一处。
 *
 * 域内其他件（处理体 `write.ts`／`read.ts`、目标表与进度取数 `goalData.ts`、两片页型模板件、
 *  四件场景件、参数与槽位表 `params.ts`、页内共件 `pageParts.ts`）**不出这个目录**，故不在这里转出；
 *  两张场景落点表（`./scene.js` 的 `GOAL_WRITE_SCENES`／`GOAL_READ_SCENES`）供测试按既有取法直取定义地。
 *
 * 形状照 `../account/index.ts` 与 `../write/index.ts`（同一包内四域同形）：门只收「命令声明」这一件。
 */
export { GOAL_COMMANDS } from './commands.js';
