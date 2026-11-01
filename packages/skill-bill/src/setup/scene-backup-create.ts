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
import { runWithLanguage } from 'base-entries';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { SetupScene } from './scene.js';
import { m } from '../entries/index.js';

const WORD: string = projectWakeWord({ key: 'bill.setup.run', op: 'backup-create' });
const KEY = 'bill.setup.run' as const;

/** 构建场景（`#1214`：文案经词条层，**渲染期**取词——模块级常量会把语言固化成 zh）。 */
function buildScene(): SetupScene {
  return {
    id: 'backup-create',
    sceneId: 'setup_backup_create',
    key: KEY,
    op: 'backup-create',
    page: 'receipt',
    title: m('skill-bill.setup-scene-backup-create.c001'),
    caliber: m('skill-bill.setup-scene-backup-create.c002'),
    subtitle: m('skill-bill.setup-scene-backup-create.c003'),
    promptOf: () => m('skill-bill.setup-scene-backup-create.c004', { p0: String(WORD) }),
  };
}

export const SCENE: SetupScene = buildScene();

/** 按语言重建本场景（`#1214`：语言是运行期参数，不是模块加载期事实）。 */
export function sceneBackupCreateFor(language: string): SetupScene {
  return runWithLanguage(language, buildScene);
}
