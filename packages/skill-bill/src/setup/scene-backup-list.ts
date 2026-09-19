/** 场景件：**查看备份**（`op=backup-list`）——本件只是差异声明，块位序列住 `./template-list.js`。
 *
 * 本件的差异（老侧 `templates/开始使用/backup_list.html` ＋ `scripts/setup/cli.py` 的 `cmd_backup_list`）：
 *   ① 与 `./scene-backup-create.js` 同一个唤醒词「备份」，**两条场景各一件**；
 *   ② 老侧列表项报的是「目录名 · 时间 · 该目录下所有文件大小之和」（`cli.py:361-364`），
 *      新侧一份备份是一个文件，故报「备份文件 · 备份时间 · 大小 · 里面有什么」；
 *   ③ 老侧空态那一句「还没有备份 ＋ 点下方「一键备份」，数据库和目标数据会自动归档」（`backup_list.html:117`）
 *      是本模板唯一的 `emptyState`——新侧照它的意思落成空态块 ＋ 引导句（`./template-list.js` 里那一支）。
 */
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { SetupScene } from './scene.js';

const WORD: string = projectWakeWord({ key: 'bill.setup.run', op: 'backup-list' });
const KEY = 'bill.setup.run' as const;

export const SCENE: SetupScene = {
  id: 'backup-list',
  sceneId: 'setup_backup_list',
  key: KEY,
  op: 'backup-list',
  page: 'list',
  title: '查看备份',
  caliber: '备份列表',
  subtitle: '备份目录里的这些份',
  promptOf: () => '请加载「饼干记账」技能,帮我看看有哪些备份(唤醒词:' + WORD + '):\n',
};
