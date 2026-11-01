/** 场景件：**初始化**（`op=init`）——本件只是差异声明，块位序列住 `./template-wizard.js`。
 *
 * 本件的差异（老侧 `templates/开始使用/init_wizard.html` ＋ `scripts/setup/cli.py` 的 `cmd_init`）：
 *   ① 步骤名四条照老侧四处同名写法：环境检测／数据目录确认／建库(幂等自愈)／只读验证；
 *   ② 老侧「只读验证」那一步的 detail 是**硬编码**「SELECT 1 ✓ · bills 表 ✓」（`cli.py:262`），
 *      而它实际只跑了 `PRAGMA table_info` 与 `SELECT COUNT(*)`（`cli.py:252-253`）——新侧真跑真报，
 *      那两句读数由 `./run.js` 从真结果里取（见 `docs/skills/skill-bill/t731-差异表.md`）；
 *   ③ 老侧环境检测在**每一步**都会 `mkdir` 数据目录并短暂写一个探测文件（`cli.py:114-133`），
 *      新侧照旧做真探测（可写才报可写），但探测文件用完即删、不留痕。
 */
import { runWithLanguage } from 'base-entries';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { SetupScene } from './scene.js';
import { m } from '../entries/index.js';

const WORD: string = projectWakeWord({ key: 'bill.setup.run', op: 'init' });
const KEY = 'bill.setup.run' as const;

/** 构建场景（`#1214`：文案经词条层，**渲染期**取词——模块级常量会把语言固化成 zh）。 */
function buildScene(): SetupScene {
  return {
    id: 'init',
    sceneId: 'setup_init_wizard',
    key: KEY,
    op: 'init',
    page: 'wizard',
    title: m('skill-bill.setup-scene-init.c001'),
    caliber: m('skill-bill.setup-scene-init.c002'),
    subtitle: m('skill-bill.setup-scene-init.c003'),
    promptOf: () => m('skill-bill.setup-scene-init.c004', { p0: String(WORD) }),
  };
}

export const SCENE: SetupScene = buildScene();

/** 按语言重建本场景（`#1214`：语言是运行期参数，不是模块加载期事实）。 */
export function sceneInitFor(language: string): SetupScene {
  return runWithLanguage(language, buildScene);
}
