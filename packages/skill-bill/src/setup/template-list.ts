/** 开始使用域模板之二 · **记录列表／状态页型**（`t685-按域页型表.md` §2.7 第 3 行；`#688` §五 5.1 的
 *  ⑤ 结果型列表页与 ⑥ 结果型状态页两类的并集——老侧这两张页同一套形状：读数卡 ＋ 一张小表 ＋ 空态）。
 *
 * **本件是这一片页型的块位序列唯一住所**。盖住的两条场景：
 *   · 查看备份（`./scene-backup-list.js`；老 `开始使用/backup_list.html`，135 行／12 个块）——⑤ 列表页；
 *   · 初始化状态（`./scene-init-status.js`；老 `开始使用/init_status.html`，154 行／11 个块）——⑥ 状态页。
 *  **改一次这一片页型的版式只动本件一处。**
 *
 * **块位序列**（照 `#688` §五 5.2 的 ⑤⑥ 两列，取并集；● 恒出、○ 有内容才出）：
 *   类型徽章 ●（表序第 6 行）→ 结论句 ●（第 3 行）→ 页内导航 ●（第 4 行，结果型恒出）
 *     → 读数行 ●（第 5 行）→ 主表／主列表 ●（第 12 行）→ 空态 ●（第 23 行）
 *     → 变更／迁移块 ○（第 9 行的近亲：本域只给「结构补过了没有」这一件，见下）
 *     → 引导句 ○（未就绪／没有备份时才有下文）→ 口径说明行 ●（第 24 行）
 *     → 复制区 ●（第 25 行）→ 来源脚注 ●（第 26 行）
 *   本页**不出**的四块：第 7/8/10/11 行（字段卡／只读明细段／流程预览／候选选择——三条都不是结果型页的东西）、
 *   第 13/14/15 行（占比条／图表／进度条——本域无图表，状态页的三个判定不用进度条表达）、
 *   第 20/21/22 行（可编辑行／截断折叠／复制指令块——结果型页不发指令）。
 *
 * **迁移提示独立成块**（`#688` §二 C11：老侧 `init_status.html:132-138` 的迁移块有专属样式块与
 *   「⚠️ 需要迁移」标题，不混进普通检查项——新侧照办：它是本页唯一独立的警示块，且**只在真补过东西时出**）。
 */
import { renderCaliberLine, renderConclusionBar, renderDataTable, renderEmptyBlock, renderKpiGrid } from 'base-paint/blocks';
import type { DataTableColumn, DataTableRow, KpiCardInput } from 'base-paint/blocks';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { navBlock, pageBody, pageNav } from '../shared/pageSections.js';
import type { PageBlock } from '../shared/pageSections.js';
import type { SerializableEnvelope } from 'base-paint';
import type { BackupEntry } from './backups.js';
import {
  SOURCE_READ, SOURCE_READ_TEXT, badgeOf, copyZoneOf, emptyOf, humanBytes, promptBlockOf,
  setupPageShell, sourceNoteOf,
} from './pageParts.js';
import type { SetupScene } from './scene.js';
import type { SetupStatus } from './status.js';

/** 查看备份那一支的入参（⑤ 列表页）。 */
export interface BackupListDocInput {
  readonly op: 'backup-list';
  readonly scene: SetupScene;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly actionAt: string;
  /** 备份目录里的全部备份（新→旧，`./backups.js` 的 `listBackups`）。 */
  readonly entries: readonly BackupEntry[];
  readonly envelope: SerializableEnvelope;
}

/** 初始化状态那一支的入参（⑥ 状态页）。 */
export interface StatusDocInput {
  readonly op: 'init-status';
  readonly scene: SetupScene;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly actionAt: string;
  readonly status: SetupStatus;
  readonly envelope: SerializableEnvelope;
}

export type ListDocInput = BackupListDocInput | StatusDocInput;

/** 备份清单表的列（本页唯一定义：表头文本与每格 `data-label` 同源）。 */
const BACKUP_COLUMNS: readonly DataTableColumn[] = [
  { key: 'file', label: '备份文件' },
  { key: 'time', label: '备份时间' },
  { key: 'size', label: '大小', align: 'right' },
  { key: 'content', label: '里面有什么' },
];

function backupRow(e: BackupEntry): DataTableRow {
  return {
    file: e.file,
    time: e.time,
    size: humanBytes(e.bytes),
    content: e.hasGoals ? '库 ＋ 目标' : '只有库',
  };
}

/** ⑤ 查看备份：读数三格（共几份／最新一份／合计多大）。 */
function backupKpi(entries: readonly BackupEntry[]): readonly KpiCardInput[] {
  const total = entries.reduce((n, e) => n + e.bytes + e.goalsBytes, 0);
  const newest = entries[0];
  return [
    { label: '备份份数', value: String(entries.length) + ' 份', detail: entries.length === 0 ? '还没有备份过' : '每次备份都会新存一份' },
    {
      label: '最新一份',
      value: newest === undefined ? '—' : newest.time,
      detail: newest === undefined ? '还没有备份过' : newest.file,
    },
    { label: '合计占多大', value: humanBytes(total), detail: '库与目标那一份加起来' },
  ];
}

/** 备份清单页：一整页（空态与列表两支都在本件里）。 */
function backupListDoc(input: BackupListDocInput): string {
  const entries = input.entries;
  const hasAny = entries.length > 0;
  const listBlock = hasAny
    ? renderDataTable({ columns: BACKUP_COLUMNS, rows: entries.map(backupRow), caption: '备份目录里的这些份' })
    : emptyOf({
      title: '还没有备份',
      text: '备份目录里一份都没有。',
      next: '跟助手说一遍「备份」，账本库与目标那一份会自动存一份进来。',
    });
  const blocks: readonly PageBlock[] = [
    navBlock(renderKpiGrid(backupKpi(entries)), 'sec-kpi', '读数'),
    navBlock(listBlock, 'sec-list', hasAny ? '备份清单' : '现在的情况'),
    navBlock(renderCaliberLine('一份备份＝账本库 ＋ 目标那一份；列在这里的都是可以拿来恢复的。'), 'sec-caliber', '口径'),
    navBlock(hasAny ? '' : promptBlockOf(input.scene.promptOf(input.params)), 'sec-prompt', hasAny ? '' : '下一步'),
    navBlock(copyZoneOf({
      envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
      source: SOURCE_READ, detail: '查到 ' + String(entries.length) + ' 份备份', actionAt: input.actionAt,
    }), 'sec-copy', '复制'),
  ].filter((b) => b.html !== '');
  const content = badgeOf({
    word: input.scene.title,
    caliber: input.scene.caliber,
    status: hasAny ? 'ok' : 'empty',
    statusText: hasAny ? '查到了' : '还没有备份',
    next: hasAny ? '' : '先说一遍「备份」，这里就有东西了。',
  }) + renderConclusionBar(hasAny
    ? '一共 ' + String(entries.length) + ' 份备份，最新的一份是 ' + (entries[0] as BackupEntry).time + '。'
    : '还没有备份。')
    + pageNav(blocks) + pageBody(blocks)
    + sourceNoteOf({
      sourceText: SOURCE_READ_TEXT,
      start: entries.length === 0 ? '不限' : (entries[entries.length - 1] as BackupEntry).time,
      end: entries.length === 0 ? '不限' : (entries[0] as BackupEntry).time,
      count: entries.length,
    });
  return setupPageShell({
    docTitle: DOC_TITLE + '·' + input.scene.title,
    title: input.scene.title,
    subtitle: input.scene.subtitle,
    slot: 'list', page: 'list', shape: 'receipt', key: input.key, content,
  });
}

/** ⑥ 初始化状态：读数三格＝**三重判定**（数据存在／结构版本／就绪）。 */
function statusKpi(s: SetupStatus): readonly KpiCardInput[] {
  const [exist, schema, ready] = s.checks;
  return [
    {
      label: '数据存在',
      value: exist?.ok === true ? '在' : '不在',
      detail: exist?.detail ?? '',
      status: exist?.ok === true ? 'ok' : 'warn',
    },
    {
      label: '结构版本',
      value: s.version,
      detail: schema?.detail ?? '',
      status: schema?.ok === true ? 'ok' : 'warn',
    },
    {
      label: '就绪',
      value: s.ready ? '可以用' : '还不能用',
      detail: ready?.detail ?? '',
      status: s.ready ? 'ok' : 'warn',
    },
  ];
}

/** 状态页的检查小表（三重判定逐条，含读到的数）。 */
function statusTable(s: SetupStatus): string {
  const columns: readonly DataTableColumn[] = [
    { key: 'label', label: '看什么' },
    { key: 'ok', label: '过没过' },
    { key: 'detail', label: '读到的' },
  ];
  const rows: readonly DataTableRow[] = s.checks.map((c) => ({
    label: c.label, ok: c.ok ? '过' : '没过', detail: c.detail,
  }));
  return renderDataTable({ columns, rows, caption: '三件事一件一件看' });
}

/** 迁移块（独立成块，`#688` §二 C11）：**只在真补过东西、或结构真的还不是当前版本时才出**。
 *  老侧那句提示指的是「运行某个迁移脚本」（`cli.py:186-188` 印脚本路径）——新侧不印脚本路径（裁定 1），
 *  改说「补了什么／怎么补」：库句柄打开时就自动补了（`src/fetch/db.ts` 的 DDL 自愈），这里把它报出来。 */
function migrationBlock(s: SetupStatus): string {
  if (s.repaired.length === 0 && !s.needsMigration) return '';
  const title = renderConclusionBar('⚠️ 需要迁移');
  if (s.needsMigration) {
    return title + renderCaliberLine('这个库的结构还是老版本，缺「deleted_at」那一列；'
      + '跟助手说一遍「初始化」就会补齐。');
  }
  return title + renderCaliberLine('这个库的结构是老版本，本次打开时已经自动补上了：' + s.repaired.join('、')
    + '。补过之后就是当前版本，不用再手工迁移。');
}

/** 状态页：一整页（未就绪时多一块引导，指引去初始化）。 */
function statusDoc(input: StatusDocInput): string {
  const s = input.status;
  const migrate = migrationBlock(s);
  const guide = s.ready ? '' : promptBlockOf(input.scene.promptOf({ op: 'init' }));
  const blocks: readonly PageBlock[] = [
    navBlock(renderKpiGrid(statusKpi(s)), 'sec-kpi', '读数'),
    navBlock(statusTable(s), 'sec-checks', '三件事'),
    ...(migrate === '' ? [] : [navBlock(migrate, 'sec-migrate', '需要迁移')]),
    ...(guide === '' ? [] : [navBlock(guide, 'sec-guide', '下一步')]),
    navBlock(renderCaliberLine('就绪＝库文件在、表结构是当前版本、读得动；三件都过才叫可以用。'), 'sec-caliber', '口径'),
    navBlock(copyZoneOf({
      envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
      source: SOURCE_READ, detail: '读了库结构与 ' + String(s.rows) + ' 条记录', actionAt: input.actionAt,
    }), 'sec-copy', '复制'),
  ];
  const content = badgeOf({
    word: input.scene.title,
    caliber: input.scene.caliber,
    status: s.ready ? 'ok' : 'warn',
    statusText: s.ready ? '已就绪' : '未就绪',
    next: s.ready ? '' : '跟助手说一遍「初始化」就能把结构补齐。',
  }) + renderConclusionBar(s.ready
    ? '已经就绪，可以记账了。'
    : '还没就绪：' + (s.needsMigration ? '这个库的结构还是老版本' : '这个位置还不是一个记账库'))
    + pageNav(blocks) + pageBody(blocks)
    + sourceNoteOf({ sourceText: SOURCE_READ_TEXT, start: '不限', end: '不限', count: s.rows });
  return setupPageShell({
    docTitle: DOC_TITLE + '·' + input.scene.title,
    title: input.scene.title,
    subtitle: input.scene.subtitle,
    slot: 'list', page: 'list', shape: 'receipt', key: input.key, content,
  });
}

/** 记录列表／状态页型：两支出同一片页型（块序在本件只写一份）。 */
export function listDoc(input: ListDocInput): string {
  return input.op === 'backup-list' ? backupListDoc(input) : statusDoc(input);
}
