/** 场景件：**设置当前配置**（`op=config-write`）——本件只是差异声明，块位序列住 `./template-config.js`。 */
import type { SetupScene } from './scene.js';

const KEY = 'bill.setup.run' as const;

export const SCENE: SetupScene = {
  id: 'config-write',
  sceneId: 'setup_config_write',
  key: KEY,
  op: 'config-write',
  page: 'wizard',
  title: '设置当前配置',
  caliber: '配置改写',
  subtitle: '改哪格说哪格 · 确认后才落盘',
  promptOf: (params) => {
    const bits: string[] = [];
    for (const [k, label] of [['db_dir', '数据目录'], ['db_name', '库文件名'], ['backup_dir', '备份目录'], ['html_dir', '产物目录']] as const) {
      const v = params[k];
      if (typeof v === 'string' && v.trim() !== '') bits.push(label + '＝' + v.trim());
    }
    const tail = bits.length === 0 ? '（还没说改哪格，先在弹窗里填）' : bits.join('、');
    return '请加载「饼干记账」技能,帮我设置当前配置(唤醒词:设置当前配置):\n\n'
      + tail + '\n\n确认无误后跟助手说一遍「确认写入」。\n';
  },
};
