/** sync-status · **渲染**（纯函数产 HTML；本件只有形态 B「带『同步一次』动作」一种骨架）。
 *
 *  —— 形态 B：带「同步一次」动作 ——
 *
 *  顶上汇总一行（最后检查 ／ 共几个目标 ／ 几个失败）→ 逐目标一行（名字 ／ 方向 · 时间 · 读数 ／ 徽标）
 *  → 失败那一行下面紧跟**原因 ＋ 怎么修** → 底下按钮那一排（说明 ＋ 「同步一次」）。
 *
 *  它替掉的两种错法：
 *   · 失败只染一个红点 —— 读者知道坏了，不知道坏在哪、下一步敲什么；
 *   · 「同步中…」把按钮换成一个更宽／更窄的字 —— 版面跟着跳，读者以为页面重排了。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · 徽标**永远是「记号 ＋ 字」**（✓／✗／○），色只是第三样；
 *   · `failed` 那一行**必带**「原因」与「怎么修」两句（校验在 `model.ts` 就拦住了）；
 *   · 按钮里两枚字（静止／跑起来）**占同一格**，宽度取宽者 ⇒ 换字不跳版。
 */
import { esc } from '../shared/escape.js';
import {
  SYNC_STATUS_ACTION_ATTR,
  SYNC_STATUS_ACTIONS,
  SYNC_STATUS_ATTR,
  SYNC_STATUS_CLASS,
  SYNC_STATUS_ERROR_ATTR,
  SYNC_STATUS_FIX_LABEL,
  SYNC_STATUS_REASON_LABEL,
  SYNC_STATUS_RUNNING_LABEL,
  SYNC_STATUS_STATES,
  SYNC_STATUS_STATE_ATTR,
  syncStatusSlot,
} from './attrs.js';
import { normalizeSyncStatus, type SyncStatusModel, type SyncStatusTargetModel } from './model.js';

/** 一个目标一行。 */
function targetHtml(t: SyncStatusTargetModel): string {
  const parts: string[] = ['<li class="' + syncStatusSlot('target') + ' is-' + t.result
    + '" data-ilife-sync-result="' + esc(t.result) + '">'];
  parts.push('<span class="' + syncStatusSlot('name') + '">' + esc(t.name) + '</span>');
  /* 时间线：逐段一枚 `span`、段间只靠列距——**标记里不写分隔符**（分隔由样式承担）。 */
  const segs: string[] = [];
  if (t.direction !== undefined) segs.push('<span>' + esc(t.direction) + '</span>');
  if (t.lastAt !== undefined) segs.push('<span>' + esc(t.lastAt) + '</span>');
  if (t.detail !== undefined) segs.push('<span>' + esc(t.detail) + '</span>');
  parts.push('<span class="' + syncStatusSlot('detail') + '">' + segs.join('') + '</span>');
  parts.push('<span class="' + syncStatusSlot('badge') + ' is-' + t.result + '">' + esc(t.badgeText) + '</span>');
  if (t.result === 'failed' && t.reason !== undefined && t.fix !== undefined) {
    parts.push('<p class="' + syncStatusSlot('why') + '">'
      + '<b>' + esc(SYNC_STATUS_REASON_LABEL) + '</b>' + esc(t.reason)
      + '<span><b>' + esc(SYNC_STATUS_FIX_LABEL) + '</b>' + esc(t.fix) + '</span></p>');
  }
  parts.push('</li>');
  return parts.join('');
}

/** 按钮那一排：说明 ＋ 一枚按钮（两枚字占同一格，宽度取宽者）。 */
function toolHtml(m: SyncStatusModel): string {
  const parts: string[] = ['<div class="' + syncStatusSlot('tool') + '">'];
  if (m.hint !== undefined) {
    parts.push('<p class="' + syncStatusSlot('hint') + '">' + esc(m.hint) + '</p>');
  }
  parts.push('<button class="' + syncStatusSlot('button') + '" type="button" '
    + SYNC_STATUS_ACTION_ATTR + '="' + esc(SYNC_STATUS_ACTIONS[0]) + '">');
  parts.push('<span class="' + syncStatusSlot('btn-rest') + '">' + esc(m.actionLabel) + '</span>');
  parts.push('<span class="' + syncStatusSlot('btn-busy') + '" aria-hidden="true">' + esc(SYNC_STATUS_RUNNING_LABEL) + '</span>');
  parts.push('</button>');
  parts.push('</div>');
  return parts.join('');
}

/** 形态 B 的骨架。 */
function renderRun(m: SyncStatusModel): string {
  const parts: string[] = [];
  if (m.targets.length === 0) {
    /* 设计过的空态：说清「这里本来会写什么」，不留一个空壳。 */
    parts.push('<p class="' + syncStatusSlot('empty') + '">还没有接过任何同步目标。</p>');
    if (m.hint !== undefined) parts.push('<p class="' + syncStatusSlot('hint') + '">' + esc(m.hint) + '</p>');
    return parts.join('');
  }
  const meta: string[] = [];
  if (m.checkedAt !== undefined) meta.push('<span>最后检查 ' + esc(m.checkedAt) + '</span>');
  meta.push('<span>共 ' + esc(String(m.targets.length)) + ' 个目标</span>');
  if (m.failedCount > 0) meta.push('<span>' + esc(String(m.failedCount)) + ' 个失败</span>');
  parts.push('<p class="' + syncStatusSlot('meta') + '">' + meta.join('') + '</p>');
  parts.push('<ul class="' + syncStatusSlot('list') + '">');
  for (const t of m.targets) parts.push(targetHtml(t));
  parts.push('</ul>');
  parts.push(toolHtml(m));
  parts.push('<p class="' + syncStatusSlot('error') + '" id="' + esc(m.errorId) + '" '
    + SYNC_STATUS_ERROR_ATTR + '="1" role="status" aria-live="polite" hidden></p>');
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<SyncStatusModel['form'], (m: SyncStatusModel) => string>> = {
  run: renderRun,
};

/** 渲染同步状态（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderSyncStatus(input: unknown): string {
  const m = normalizeSyncStatus(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + SYNC_STATUS_CLASS + ' is-' + m.form + extra + '"'
    + (m.id === undefined ? '' : ' id="' + esc(m.id) + '"')
    + ' ' + SYNC_STATUS_ATTR + '="" ' + SYNC_STATUS_STATE_ATTR + '="' + SYNC_STATUS_STATES[0] + '">'
    + SKELETONS[m.form](m) + '</div>';
}
