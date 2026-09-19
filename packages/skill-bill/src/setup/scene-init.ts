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
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { SetupScene } from './scene.js';

const WORD: string = projectWakeWord({ key: 'bill.setup.run', op: 'init' });
const KEY = 'bill.setup.run' as const;

export const SCENE: SetupScene = {
  id: 'init',
  sceneId: 'setup_init_wizard',
  key: KEY,
  op: 'init',
  page: 'wizard',
  title: '首次使用向导',
  caliber: '4 步零决策',
  subtitle: '4 步零决策 · 自动检测 · 一次成功',
  promptOf: () => '请加载「饼干记账」技能,帮我开始使用饼干记账(唤醒词:' + WORD + '):\n',
};
