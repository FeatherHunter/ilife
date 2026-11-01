/** 场景件：**从备份恢复**（`op=restore`）——本件只是差异声明，块位序列住 `./template-wizard.js`。
 *
 * 本件的差异（老侧 `templates/开始使用/restore.html` ＋ `scripts/backup.py` 的 `restore_backup`）：
 *   ① **本域最高危缺陷在这里被修掉**（`#688` §二 D5／`.scratch/t731/old-setup.md` §7(a)）：老侧切换备份后
 *      详情卡与步骤说明仍读初值 `sel`（`restore.html:141-145`／`:135`），而高亮与复制文案用新选的
 *      （`restore.html:167-169`／`:174`）——**确认前看到的不是将要恢复的**。新侧「选中的那一份」只有一处
 *      （`./template-wizard.js` 的 `RestoreWizardInput.selected`），详情、步骤说明、口令三处都从它派生；
 *   ② 恢复前**无条件**自动备份现状（老侧 `backup.py:122-124`，原样继承）＋ 显式覆盖警告
 *      （老侧 `restore.html:159` 的原文意思）＋ 警告里写清「怎么回去」；
 *   ③ 老侧是「先覆盖、后校验」（`backup.py:128-131` 在 `:139-142` 之前）——新侧把**校验挪到覆盖之前**
 *      （先验那一份备份读得动，再动现状），失败时点名现状备份（`backup.py:145` 那句的意思）；
 *   ④ 老侧步骤号写死 2／3 且总数不显示（`restore.html:136/138`）——新侧编号与总数都由 `./steps.js` 算。
 */
import { runWithLanguage } from 'base-entries';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { SetupScene } from './scene.js';
import { m } from '../entries/index.js';

const WORD: string = projectWakeWord({ key: 'bill.setup.run', op: 'restore' });
const KEY = 'bill.setup.run' as const;

/** 构建场景（`#1214`：文案经词条层，**渲染期**取词——模块级常量会把语言固化成 zh）。
 *  口令照判地原型 s05 v2.4 逐字：`请从备份 <名> 恢复，我已确认覆盖（恢复前请先备份现状）。`
 *  给了 `name` 就填选中的那一份，没给写占位（与老侧 `restore.html:174` 的 `'____'` 同义）。 */
function buildScene(): SetupScene {
  return {
    id: 'restore',
    sceneId: 'setup_restore',
    key: KEY,
    op: 'restore',
    page: 'wizard',
    title: m('skill-bill.setup-scene-restore.c001'),
    caliber: m('skill-bill.setup-scene-restore.c002'),
    subtitle: m('skill-bill.setup-scene-restore.c003'),
    promptOf: (params) => {
      const name = typeof params['name'] === 'string' && params['name'].trim() !== '' ? params['name'].trim() : '____';
      return m('skill-bill.setup-scene-restore.c004', { p0: String(name) });
    },
  };
}

export const SCENE: SetupScene = buildScene();

/** 按语言重建本场景（`#1214`：语言是运行期参数，不是模块加载期事实）。 */
export function sceneRestoreFor(language: string): SetupScene {
  return runWithLanguage(language, buildScene);
}
