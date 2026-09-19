/** 场景件：**初始化状态**（`op=init-status`）——本件只是差异声明，块位序列住 `./template-list.js`。
 *
 * 本件的差异（老侧 `templates/开始使用/init_status.html` ＋ `scripts/setup/cli.py` 的 `cmd_init_status`）：
 *   ① 判定项名照老侧：数据存在／schema／版本（`cli.py:162/206/207`）——新侧落成「数据存在／结构版本／就绪」
 *      三格读数（`./status.js` 的三重判定），三件的**与**才是 `ready`；
 *   ② 迁移提示**独立成块**（`#688` §二 C11）：老侧那段提示指的是「运行某个迁移脚本」并**印出脚本路径**
 *      （`cli.py:186-188`）——新侧不印脚本路径（裁定 1），改报「本次打开时自动补了什么」
 *      （库句柄的 DDL 自愈，见 `src/fetch/db.ts` 的 `repaired`）；
 *   ③ 老侧 `init_status.html:145` 在零记录时正确显示「现有记录 0 条」（不吞 0）——这条**照抄**
 *      （`#688` 裁定 4 的正面例子）。
 */
import type { SetupScene } from './scene.js';

const KEY = 'bill.setup.run' as const;

/** 未就绪时那块引导说的仍是「初始化」那一句（老侧 `init_status.html:151` 逐字同句）。
 *  本件不另取唤醒词字面量：引导那一句是**另一条场景**的口令，取自 `./scene-init.js` 那一支的写法。 */
const INIT_PROMPT = '请加载「饼干记账」技能,帮我开始使用饼干记账(唤醒词:初始化):\n';

export const SCENE: SetupScene = {
  id: 'init-status',
  sceneId: 'setup_init_status',
  key: KEY,
  op: 'init-status',
  page: 'list',
  title: '初始化状态',
  caliber: '三重判定',
  subtitle: '数据存在 · 结构版本 · 就绪',
  promptOf: () => INIT_PROMPT,
};
