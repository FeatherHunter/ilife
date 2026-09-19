/** 场景件：**一键备份**（`op=backup-create`）——本件只是差异声明，块位序列住 `./template-receipt.js`。
 *
 * 本件的差异（老侧 `templates/开始使用/backup.html` ＋ `scripts/setup/cli.py` 的 `cmd_backup_create`）：
 *   ① 「备份」这一条词**两个场景**（本条出结果回执页、`./scene-backup-list.js` 出记录列表页）——
 *      `t687-parity-审计清单.md` §2 第 66-70 行点名的形状，本域两条各一件；
 *   ② 老侧一份备份是**一个目录**（`backup.py:63-69` 新建时间戳目录，里面放库与 `goals.json`），
 *      新侧一份备份是**一个文件**（`backup.dir` ＋ `backup.stem`，`src/fetch/paths.js:71-74`）——
 *      与 #726 定的配置口径同源，差异记在差异表；
 *   ③ 老侧 `content` 那句「数据库 + 目标(goals.json)」是**硬编码**（`cli.py:328`），影子件不在也不改口；
 *      新侧照实报「这一份里有什么」。
 */
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { SetupScene } from './scene.js';

const WORD: string = projectWakeWord({ key: 'bill.setup.run', op: 'backup-create' });
const KEY = 'bill.setup.run' as const;

export const SCENE: SetupScene = {
  id: 'backup-create',
  sceneId: 'setup_backup_create',
  key: KEY,
  op: 'backup-create',
  page: 'receipt',
  title: '一键备份',
  caliber: '备份完成',
  subtitle: '数据库 + 目标(goals.json)已归档',
  promptOf: () => '请加载「饼干记账」技能,帮我备份饼干记账的数据(唤醒词:' + WORD + '):\n',
};
