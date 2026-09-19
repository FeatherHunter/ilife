/** #721 · 开始使用域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
 */
import type { DomainDeclaration } from '../triggers/routeSpec.js';

export const SETUP_DECLARATION: DomainDeclaration = {
  id: 'setup',
  label: '开始使用',
  icon: '🚀',
  order: 7,
  entries: [
    {
      phrase: '初始化',
      key: 'bill.setup.run',
      preset: { op: 'init' },
      scenes: [
        {
          id: 'setup_init_wizard',
          title: '首次使用向导(4 步零决策)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我开始使用饼干记账(唤醒词:初始化):\n',
          types: ['向导'],
        },
      ],
    },
    {
      phrase: '初始化状态',
      key: 'bill.setup.run',
      preset: { op: 'init-status' },
      scenes: [
        {
          id: 'setup_init_status',
          title: '初始化状态(是否已就绪)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我看看饼干记账初始化了没有(唤醒词:初始化状态):\n',
          types: ['查看'],
        },
      ],
    },
    {
      phrase: '备份',
      key: 'bill.setup.run',
      preset: { op: 'backup-create' },
      scenes: [
        {
          id: 'setup_backup_create',
          title: '一键备份',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我备份饼干记账的数据(唤醒词:备份):\n',
          types: ['回执'],
        },
        {
          id: 'setup_backup_list',
          title: '查看备份',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我看看有哪些备份(唤醒词:备份):\n',
          types: ['查看'],
        },
      ],
    },
    {
      phrase: '恢复备份',
      key: 'bill.setup.run',
      preset: { op: 'restore' },
      scenes: [
        {
          id: 'setup_restore',
          title: '从备份恢复',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我从备份恢复数据(唤醒词:恢复备份):\n\n  备  份: ____ (选填,默认最新备份)\n',
          types: ['向导'],
        },
      ],
    },
    {
      phrase: '导入',
      key: 'bill.setup.run',
      preset: { op: 'import' },
      needs: ['file'],
      scenes: [
        {
          id: 'setup_import',
          title: '导入 CSV 账单(列映射向导)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我导入 CSV 账单(唤醒词:导入):\n\n  文件路径: ____\n  列映射: ____ (选填,自动识别,如:日期=第1列,金额=第3列)\n',
          types: ['向导'],
        },
      ],
    },
  ],
  subgroups: [
    { id: 'setup_1', label: '初始化', scenes: ['setup_init_wizard', 'setup_init_status'] },
    { id: 'setup_2', label: '备份恢复', scenes: ['setup_backup_create', 'setup_backup_list', 'setup_restore'] },
    { id: 'setup_3', label: '导入', scenes: ['setup_import'] },
  ],
};
