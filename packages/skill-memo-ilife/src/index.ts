/** 包门（#703／#855）：只转出**包外真在用**的名字——加一个名字之前先问「谁在取」。
 *
 * 谁在取（唯一一条）：插件侧 `packages/plugin-memo-ilife/test/skills-provider.test.mjs` 取 `buildHelpLookup`
 * （技能清单与 HELP 速查对账）。其余消费者都走**深路径**、不进门：
 *   · 仓根 `tooling/skill-html-snapshot.mjs` 直取 `dist/render/index.js` 的 `fillTemplate`；
 *   · 插件按 `bin` 声明的路径 spawn `dist/cli/cmd_read.js`（技能调用契约：入口按包 `bin` 解析）；
 *   · 包内测试一律直引各自的家（收尾批已把 `dist/index.js` 的取用改成深路径）。
 *
 * 包 `exports` 同步只留 `.` 与 `./package.json`（清单键：插件按包名读版本号要用它）。
 */
export { buildHelpLookup } from './help/index.js';
