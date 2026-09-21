/** 打卡域 · **能力门**（票 #855 的形状，票 #830 补上跨域真要用到的三个名字）。
 *
 *  本域**没有自己的命令键**：记／删／改打卡三条走备忘域的 `memo.create`／`memo.remove`／`memo.update`
 *  （键的事实住 `src/memo/commands.ts`，词面住本域 `./routes.ts`）。故门里只出「本域 3 格的页装配」
 *  这一类名字；路由声明由生成器直接扫 `src/<域>/routes.ts`（不经门）。
 *  域外只许经此门取（`test/cmd-registry-855.test.mjs` 的「域间零直引」守着）。 */
export { checkinCreatePage, checkinRemovePage, checkinUpdatePage } from './receipt.js';
