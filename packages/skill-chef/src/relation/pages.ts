/** 派生能力的页面装配（三卡各一页）。
 *
 * 配方来源：`docs/skills/skill-chef/t768-页面族配方.md`
 *   · 添加派生关系回执／派生新菜回执走回执型（结论条 ＋ 关系对图 ＋ 说明段 ＋ 动作行 ＋ 复制区）；
 *   · 家族树走结果型（三层：向上祖先／当前／向下后代，层与层之间用连接件表示派生方向）。
 * 页内形状住同目录的 `shapes.ts`，由 `shell()` 追加在皮肤之后：公共层给的是全批共用的皮肤，
 * 「父子上下游」这点形状语言只属于本域三页，不往公共层塞。
 * 正文段落走 #860 件（renderProseBlock），一段正文不再用页内补丁。
 */

import { renderActionBar, renderStatusBadge } from 'base-paint';
import {
  renderCaliberLine,
  renderConclusionBar,
  renderCopyBlock,
  renderPageShell,
  renderProseBlock,
} from 'base-paint/blocks';
import { renderSceneShell } from '../render/sceneShell.js';
import { escapeHtml } from '../render/index.js';
import { relationShapeCss } from './shapes.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 家族树上的一条关系（`chef.relation.query` 逐条给这种形状）。 */
interface RelationRow {
  name: string;
  level: number;
  relation_type: string;
  change_summary: string;
}

function shell(title: string, eyebrow: string, blocks: string[]): string {
  return renderSceneShell({
    family: 'receipt',
    docTitle: title,
    bodyHtml: renderPageShell({ eyebrow, title, content: blocks.join('') }),
    extraCss: relationShapeCss(),
  });
}

const act = (buttons: { label: string; kind: 'primary' | 'ghost'; actionId: string }[]): string =>
  '<div class="ilife-relation-actions">' + renderActionBar({ buttons }) + '</div>';

/** 图标位：一枚圆角方块底 ＋ 一枚字形。上／下两层给箭头（方向＝这一层在树里朝哪边），
 *  当前层给一枚圆点。纯装饰（`aria-hidden`），文字一个字都不进样式里；底色按三层各自的强调色。 */
function relationIcon(dir: 'up' | 'here' | 'down'): string {
  const inner = dir === 'here'
    ? '<circle cx="12" cy="12" r="4.6" fill="currentColor"/>'
    : '<path d="' + (dir === 'down' ? 'M12 5v13M12 18l-4-4M12 18l4-4' : 'M12 19V6M12 6l-4 4M12 6l4 4') + '"/>';
  return '<span class="ilife-relation-icon ilife-relation-icon-' + dir + '" aria-hidden="true">'
    + '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4"'
    + ' stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'
    + '</span>';
}

/** 结论条（配一枚状态徽章）：判定句与它的状态在同一格里，读者不必从字里猜结果。
 *  徽章只在与判定句说得不同的那一页挂（说得一样就只是同一句话写两遍）。 */
function relationVerdict(text: string, withBadge: boolean): string {
  return '<div class="ilife-relation-verdict">'
    + renderConclusionBar(text)
    + (withBadge ? renderStatusBadge({ status: 'ok' }) : '')
    + '</div>';
}

/** 关系对图：上游节点 －（关系类型 ＋ 箭头）→ 下游节点。方向由箭头与图标承担，不靠读字。 */
function relationPair(parentRole: string, parentName: string, kind: string, childRole: string, childName: string): string {
  const node = (tone: 'up' | 'down', role: string, name: string): string =>
    '<div class="ilife-relation-node ilife-relation-node-' + tone + '">'
    + relationIcon(tone)
    + '<span class="ilife-relation-node-body">'
    + '<span class="ilife-relation-role">' + escapeHtml(role) + '</span>'
    + '<span class="ilife-relation-name">' + escapeHtml(name) + '</span>'
    + '</span>'
    + '</div>';
  return '<div class="ilife-relation-pair">'
    + node('up', parentRole, parentName)
    + '<div class="ilife-relation-link">'
    + '<span class="ilife-relation-kind">' + escapeHtml(kind) + '</span>'
    + '<span class="ilife-relation-arrow" aria-hidden="true"></span>'
    + '</div>'
    + node('down', childRole, childName)
    + '</div>';
}

/** 说明段：一条暖色引线 ＋ 一段正文。此前正文上没有标签，读的人不知道这句在说什么；
 *  加标签又成了「标签贴着值」那种拿字符偷懒的写法——改用引线把这段圈进来，标签一个字不写。 */
function relationNote(text: string): string {
  return '<div class="ilife-relation-note">' + renderProseBlock({ text }) + '</div>';
}

/** 一层里出现的关系类型（去重后按首次出现序，用「／」并成一句）；一行都没有＝空串。
 *  类型从逐行徽章挪到层头：同一层里同一个词只写一遍，行内留给形状与菜名。 */
function kindsOf(rows: readonly RelationRow[]): string {
  const seen: string[] = [];
  for (const r of rows) {
    const k = typeof r.relation_type === 'string' ? r.relation_type : '';
    if (k !== '' && !seen.includes(k)) seen.push(k);
  }
  return seen.join('／');
}

/** 家族树的一层：层头（图标位 ＋ 层名 ＋ 关系类型 ＋ 条数）＋ 层体（条目行，或空层的占位件）。
 *  没数的那层收成一条瘦条（`-empty`）：空层占一整块卡片会白吃掉首屏一截。 */
function relationTier(input: {
  tone: 'up' | 'here' | 'down';
  title: string;
  count: string;
  kinds: string;
  empty: boolean;
  body: string;
}): string {
  return '<section class="ilife-relation-tier ilife-relation-tier-' + input.tone
    + (input.empty ? ' ilife-relation-tier-empty' : '') + '">'
    + '<p class="ilife-relation-tier-head">'
    + relationIcon(input.tone)
    + '<span class="ilife-relation-tier-name">' + escapeHtml(input.title) + '</span>'
    + (input.kinds === '' ? '' : '<span class="ilife-relation-tier-kind">' + escapeHtml(input.kinds) + '</span>')
    + '<span class="ilife-relation-tier-count">' + escapeHtml(input.count) + '</span>'
    + '</p>'
    + '<div class="ilife-relation-tier-body">' + input.body + '</div>'
    + '</section>';
}

/** 改动说明前的一枚图形标记（一支笔）：这一行小字说的是「跟上一代比改了什么」，
 *  用一个字不写的记号当图例，行内不再重复写「改动」两个字。 */
function relationDeltaMark(): string {
  return '<span class="ilife-relation-branch-note-mark" aria-hidden="true">'
    + '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"'
    + ' stroke-linecap="round" stroke-linejoin="round"><path d="M3 13.4h3.2L13.6 6a1.6 1.6 0 0 0-2.3-2.3L3.9 11.1v2.3Z"/></svg>'
    + '</span>';
}

/** 一层里的条目行：代次徽章 ＋ 菜名 ＋ 改动说明。行首那枚圆点是这一层的图形标记（不上字），
 *  关系类型只在层头写一次，本行不再复现。 */
function relationBranch(rows: readonly RelationRow[]): string {
  const items = rows.map((r) => {
    const level = typeof r.level === 'number' && Number.isFinite(r.level) ? '第' + r.level + '代' : '';
    const note = typeof r.change_summary === 'string' && r.change_summary !== ''
      ? '<span class="ilife-relation-branch-note">'
        + relationDeltaMark()
        + '<span class="ilife-relation-branch-note-text">' + escapeHtml(r.change_summary) + '</span>'
        + '</span>'
      : '';
    return '<li class="ilife-relation-branch-row">'
      + '<div class="ilife-relation-branch-head">'
      + (level === '' ? '' : '<span class="ilife-relation-level">' + level + '</span>')
      + '<span class="ilife-relation-branch-name">' + escapeHtml(r.name) + '</span>'
      + '</div>'
      + note
      + '</li>';
  }).join('');
  return '<ul class="ilife-relation-branch">' + items + '</ul>';
}

/** 空层的占位件：一个字都不写。层头已经写着「向上祖先 0 道」、那层空着由 `-empty` 的虚线边说明——
 *  再补一句「还没有上游的菜」就是把层头的话说第二遍（第三轮按「删掉这句，用户会少知道什么」逐句清过）。 */
function relationGhost(): string {
  return '';
}

/** 三层家族树：层与层之间一条竖向连接件 ＋ 箭头，三层关系一眼看得出来。 */
function relationTreeTree(input: {
  root: string;
  ancestors: readonly RelationRow[];
  descendants: readonly RelationRow[];
}): string {
  const joint = '<div class="ilife-relation-joint" aria-hidden="true"></div>';
  const upBody = input.ancestors.length === 0
    ? relationGhost()
    : relationBranch(input.ancestors);
  const downBody = input.descendants.length === 0
    ? relationGhost()
    : relationBranch(input.descendants);
  return '<div class="ilife-relation-tree">'
    + relationTier({
      tone: 'up', title: '向上祖先', count: input.ancestors.length + ' 道',
      kinds: kindsOf(input.ancestors), empty: input.ancestors.length === 0, body: upBody,
    })
    + joint
    + relationTier({
      tone: 'here', title: '当前', count: '这道菜', kinds: '', empty: false,
      body: '<span class="ilife-relation-here">' + escapeHtml(input.root) + '</span>',
    })
    + joint
    + relationTier({
      tone: 'down', title: '向下后代', count: input.descendants.length + ' 道',
      kinds: kindsOf(input.descendants), empty: input.descendants.length === 0, body: downBody,
    })
    + '</div>';
}

/** 添加派生关系回执页（回执型）。 */
export function relationAddPage(input: { parent: string; child: string; relationType: string; changeSummary: string }): string {
  const blocks = [
    relationVerdict('已记下这组派生关系。', false),
    relationPair('父菜', input.parent, input.relationType, '子菜', input.child),
    relationNote(input.changeSummary),
    act([
      { label: '看家族树', kind: 'primary', actionId: 'relation-tree' },
      { label: '再记一组', kind: 'ghost', actionId: 'relation-again' },
    ]),
    renderCopyBlock({
      dataActionId: 'relation-copy',
      dataText: input.parent + '到' + input.child + '（' + input.relationType + '）：' + input.changeSummary,
    }),
  ];
  return shell('记派生关系回执', '私家大厨 ｜ 派生', blocks);
}

/** 家族树页（结果型）。三层照样出：没数的那层只留层头（条数写着 0 道），不另写一句占位话。 */
export function relationTreePage(input: {
  root: string;
  ancestors: readonly RelationRow[];
  descendants: readonly RelationRow[];
}): string {
  const total = input.ancestors.length + input.descendants.length;
  const blocks = [
    relationVerdict(total === 0
      ? '这道菜还没有和别的菜连上关系。'
      : '这道菜共有' + total + '组上下游关系。', false),
    relationTreeTree(input),
    renderCaliberLine('废弃菜谱不入树，代数由近及远。'),
    act([{ label: '记一组关系', kind: 'primary', actionId: 'relation-add' }]),
  ];
  return shell('家族树', '私家大厨 ｜ 派生', blocks);
}

/** 从已有派生新菜回执页（回执型，含母子差异）。 */
export function relationDerivePage(input: { parent: string; child: string; differences: string }): string {
  const blocks = [
    relationVerdict('已落库，父子关系一次写完。', true),
    relationPair('母本', input.parent, '派生', '新菜', input.child),
    relationNote(input.differences),
    act([
      { label: '看做菜步骤', kind: 'primary', actionId: 'relation-view' },
      { label: '看家族树', kind: 'ghost', actionId: 'relation-tree' },
    ]),
    renderCopyBlock({
      dataActionId: 'derive-copy',
      dataText: '由' + input.parent + '派生' + input.child + '：' + input.differences,
    }),
  ];
  return shell('派生新菜回执', '私家大厨 ｜ 派生', blocks);
}
