/** 开始使用域模板之一 · **结果回执页型**（`t685-按域页型表.md` §2.7 第 2 行／`#688` §五 5.1 的 ④ 结果型回执页）。
 *
 * **本件是这一片页型的块位序列唯一住所**：块序、每块的出现条件、每块吃的数据都写在这里。
 *  盖住的场景：一键备份（`./scene-backup-create.js`；老 `开始使用/backup.html`，127 行／10 个块）。
 *  **改一次这一片页型的版式只动本件一处。**
 *
 * **块位序列**（照 `#688` §五 5.2 的 ④ 回执 列；● 恒出、○ 有内容才出）：
 *   类型徽章 ●（表序第 6 行）→ 结论句 ●（第 3 行）→ 页内导航 ●（第 4 行，结果型恒出）
 *     → 读数行 ●（第 5 行：备份文件／备份时间／文件大小／内容三项）→ 只读明细段 ●（第 8 行：备份那一份的逐项事实）
 *     → 口径说明行 ○（第 24 行）→ 复制区 ●（第 25 行）→ 来源脚注 ●（第 26 行）
 *   本页**不出**的四块（表序里点了 ④ 但这一个域没有对应事实）：第 9 行字段变更对照（备份不改数据）、
 *   第 15 行进度条（备份没有「进度」这个事实）、第 27 行退出口（备份没有「撤销」这个动作，
 *   `#688` §四 裁定 11 的退出口只给写库那类能撤销的页）、第 12/13/14 行主表／占比条／图表。
 *
 * 老侧三处与老页的差别（逐条记在 `docs/skills/skill-bill/t731-差异表.md`）：
 *   ① 老侧一份备份是**一个目录**（`backup.py:63-69`），新侧一份备份是**一个文件**（`backup.dir` ＋ `backup.stem`，
 *      `src/fetch/paths.js` 的 `backupFileName`，与 #726 定的配置口径同源）——回执照新侧口径报「备份文件」；
 *   ② 老侧 `content` 那句是**硬编码**「数据库 + 目标(goals.json)」（`cli.py:328`），影子件其实没在也不改口——
 *      新侧照实报「这一份里有什么」（库 ＋ 影子件在不在）；
 *   ③ 老侧报的是 CLI 完成时刻（`cli.py:326`），新侧报**备份文件自己的时刻**（文件名里的时间戳）。
 */
import { renderCaliberLine, renderConclusionBar, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { DataTableColumn, DataTableRow, KpiCardInput } from 'base-paint/blocks';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { navBlock, pageBody, pageNav } from '../shared/pageSections.js';
import type { PageBlock } from '../shared/pageSections.js';
import type { BackupEntry } from './backups.js';
import {
  SOURCE_WRITE, SOURCE_WRITE_TEXT, badgeOf, copyZoneOf, humanBytes, setupPageShell, sourceNoteOf,
} from './pageParts.js';
import type { SetupScene } from './scene.js';
import type { SerializableEnvelope } from 'base-paint';

/** 回执页的入参：这一页是谁 ＋ 造出来的那一份备份 ＋ 取数。 */
export interface ReceiptDocInput {
  readonly scene: SetupScene;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly actionAt: string;
  /** 这一份备份的事实（`./backups.js` 造完读回来的那一件）。 */
  readonly entry: BackupEntry;
  /** 备份目录里一共几份（造完这一份之后）。 */
  readonly total: number;
  readonly envelope: SerializableEnvelope;
}

/** 读数行四格（老侧 `backup.html:120-126` 的成功卡 ＋ 路径块 ＋ 文件行同义）。 */
function kpiOf(input: ReceiptDocInput): readonly KpiCardInput[] {
  const e = input.entry;
  return [
    { label: '备份文件', value: e.file, detail: '就在备份目录里' },
    { label: '备份时间', value: e.time, detail: '按文件名里的时间戳读的' },
    { label: '文件大小', value: humanBytes(e.bytes), detail: String(e.bytes) + ' 字节' },
    {
      label: '这一份里有什么',
      value: e.hasGoals ? '库 ＋ 目标' : '只有库',
      detail: e.hasGoals
        ? '目标那一份（账户表与预算）' + humanBytes(e.goalsBytes) + ' 也一起存了'
        : '这次没有目标那一份可存，只备份了账本库',
    },
  ];
}

/** 明细表：这一份备份的逐项事实（老侧 `备份路径` 标签那一块）。 */
function detailTable(e: BackupEntry, total: number): string {
  const columns: readonly DataTableColumn[] = [
    { key: 'k', label: '哪一项' },
    { key: 'v', label: '是什么' },
  ];
  const rows: readonly DataTableRow[] = [
    { k: '备份文件', v: e.file },
    { k: '放在哪儿', v: e.path },
    { k: '备份时间', v: e.time },
    { k: '库文件大小', v: humanBytes(e.bytes) + '（' + String(e.bytes) + ' 字节）' },
    { k: '目标那一份', v: e.hasGoals ? humanBytes(e.goalsBytes) + '（' + String(e.goalsBytes) + ' 字节）' : '这次没有' },
    { k: '备份目录里一共几份', v: String(total) + ' 份' },
  ];
  return renderDataTable({ columns, rows, caption: '这一份备份的事实' });
}

/** 结果回执页：一整页。块序在本件只写一份（`blocks` 既拼正文也派生页内导航）。 */
export function backupReceiptDoc(input: ReceiptDocInput): string {
  const e = input.entry;
  const blocks: readonly PageBlock[] = [
    navBlock(renderKpiGrid(kpiOf(input)), 'sec-kpi', '读数'),
    navBlock(detailTable(e, input.total), 'sec-detail', '备份详情'),
    navBlock(renderCaliberLine('一份备份＝账本库 ＋ 目标那一份；要恢复就在备份目录里挑一份，'
      + '跟助手说一遍「恢复备份」，恢复前它会自动备份现状。'), 'sec-caliber', '口径'),
    navBlock(copyZoneOf({
      envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
      source: SOURCE_WRITE, detail: '备份 ' + e.file + '（' + String(e.bytes) + ' 字节）', actionAt: input.actionAt,
    }), 'sec-copy', '复制'),
  ];
  const content = badgeOf({
    word: input.scene.title,
    caliber: input.scene.caliber,
    status: 'ok',
    statusText: '备份完成',
    next: '想要回到今天这一步，就用上面那份备份说一遍「恢复备份」。',
  }) + renderConclusionBar('备份成功：' + e.file + ' · ' + e.time)
    + pageNav(blocks) + pageBody(blocks)
    + sourceNoteOf({
      sourceText: SOURCE_WRITE_TEXT, start: e.time, end: e.time, count: input.total,
    });
  return setupPageShell({
    docTitle: DOC_TITLE + '·' + input.scene.title,
    title: input.scene.title,
    subtitle: input.scene.subtitle,
    slot: 'receipt',
    page: 'receipt',
    shape: 'receipt',
    key: input.key,
    content,
  });
}
