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
import { renderDocShell } from 'base-paint/docShell';
import { escapeHtml } from '../render/index.js';
import { chefSceneCss } from '../render/skin.js';
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
  return renderDocShell({
    docTitle: title,
    bodyHtml: renderPageShell({ eyebrow, title, content: blocks.join('') }),
    extraCss: chefSceneCss() + LF + relationShapeCss(),
    pageUi: true,
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

/** 家族树的一层：层头（图标位 ＋ 层名 ＋ 条数）＋ 层体（条目行，或空层的占位件）。 */
function relationTier(input: { tone: 'up' | 'here' | 'down'; title: string; count: string; body: string }): string {
  return '<section class="ilife-relation-tier ilife-relation-tier-' + input.tone + '">'
    + '<p class="ilife-relation-tier-head">'
    + relationIcon(input.tone)
    + '<span class="ilife-relation-tier-name">' + escapeHtml(input.title) + '</span>'
    + '<span class="ilife-relation-tier-count">' + escapeHtml(input.count) + '</span>'
    + '</p>'
    + '<div class="ilife-relation-tier-body">' + input.body + '</div>'
    + '</section>';
}

/** 一层里的条目行：代次徽章 ＋ 菜名 ＋ 关系类型，下面一行是这组关系的改动说明。 */
function relationBranch(rows: readonly RelationRow[]): string {
  const items = rows.map((r) => {
    const level = typeof r.level === 'number' && Number.isFinite(r.level) ? '第' + r.level + '代' : '';
    const note = typeof r.change_summary === 'string' && r.change_summary !== ''
      ? '<span class="ilife-relation-branch-note">' + escapeHtml(r.change_summary) + '</span>'
      : '';
    return '<li class="ilife-relation-branch-row">'
      + '<div class="ilife-relation-branch-head">'
      + (level === '' ? '' : '<span class="ilife-relation-level">' + level + '</span>')
      + '<span class="ilife-relation-branch-name">' + escapeHtml(r.name) + '</span>'
      + '<span class="ilife-relation-kind">' + escapeHtml(r.relation_type) + '</span>'
      + '</div>'
      + note
      + '</li>';
  }).join('');
  return '<ul class="ilife-relation-branch">' + items + '</ul>';
}

/** 空层的占位件：虚线框 ＋ 一句人话，槽位与真条目同规格（换数据不换格子）。 */
function relationGhost(text: string, hint: string): string {
  return '<div class="ilife-relation-ghost">'
    + '<span class="ilife-relation-ghost-mark" aria-hidden="true"></span>'
    + '<div class="ilife-relation-ghost-body">'
    + '<p class="ilife-relation-ghost-text">' + escapeHtml(text) + '</p>'
    + '<p class="ilife-relation-ghost-hint">' + escapeHtml(hint) + '</p>'
    + '</div>'
    + '</div>';
}

/** 三层家族树：层与层之间一条竖向连接件 ＋ 箭头，三层关系一眼看得出来。 */
function relationTreeTree(input: {
  root: string;
  ancestors: readonly RelationRow[];
  descendants: readonly RelationRow[];
}): string {
  const joint = '<div class="ilife-relation-joint" aria-hidden="true"></div>';
  const upBody = input.ancestors.length === 0
    ? relationGhost('这一层还没有内容', '上游的菜会出现在这里')
    : relationBranch(input.ancestors);
  const downBody = input.descendants.length === 0
    ? relationGhost('还没有下游的菜', '派生出的菜会出现在这里')
    : relationBranch(input.descendants);
  return '<div class="ilife-relation-tree">'
    + relationTier({ tone: 'up', title: '向上祖先', count: input.ancestors.length + ' 道', body: upBody })
    + joint
    + relationTier({
      tone: 'here', title: '当前', count: '这道菜',
      body: '<span class="ilife-relation-here">' + escapeHtml(input.root) + '</span>',
    })
    + joint
    + relationTier({ tone: 'down', title: '向下后代', count: input.descendants.length + ' 道', body: downBody })
    + '</div>';
}

/** 添加派生关系回执页（回执型）。 */
export function relationAddPage(input: { parent: string; child: string; relationType: string; changeSummary: string }): string {
  const blocks = [
    relationVerdict('已记下这组派生关系。', false),
    relationPair('父菜', input.parent, input.relationType, '子菜', input.child),
    relationNote(input.changeSummary),
    act([
      { label: '看子菜的家族', kind: 'primary', actionId: 'relation-tree' },
      { label: '再记一组', kind: 'ghost', actionId: 'relation-again' },
    ]),
    renderCopyBlock({
      title: '复制关系说明',
      dataActionId: 'relation-copy',
      dataText: input.parent + '到' + input.child + '（' + input.relationType + '）：' + input.changeSummary,
    }),
  ];
  return shell('记派生关系回执', '私家大厨 ｜ 派生', blocks);
}

/** 家族树页（结果型）。两侧都空时三层照样出：空的那层给占位件，不摆空架子。 */
export function relationTreePage(input: {
  root: string;
  ancestors: readonly RelationRow[];
  descendants: readonly RelationRow[];
}): string {
  const total = input.ancestors.length + input.descendants.length;
  const blocks = [
    renderConclusionBar(total === 0
      ? '这道菜还没有和别的菜连上关系。'
      : '这道菜共有' + total + '组上下游关系。'),
    relationTreeTree(input),
    renderCaliberLine('废弃菜谱不入树，代数由近及远。'),
    act([{ label: '记一组关系', kind: 'primary', actionId: 'relation-add' }]),
  ];
  return shell('家族树', '私家大厨 ｜ 派生', blocks);
}

/** 从已有派生新菜回执页（回执型，含母子差异）。 */
export function relationDerivePage(input: { parent: string; child: string; differences: string }): string {
  const blocks = [
    relationVerdict('新菜已落库，父子关系一次写完。', true),
    relationPair('母本', input.parent, '派生', '新菜', input.child),
    relationNote(input.differences),
    act([
      { label: '看做菜步骤', kind: 'primary', actionId: 'relation-view' },
      { label: '看家族树', kind: 'ghost', actionId: 'relation-tree' },
    ]),
    renderCopyBlock({
      title: '复制差别说明',
      dataActionId: 'derive-copy',
      dataText: '由' + input.parent + '派生' + input.child + '：' + input.differences,
    }),
  ];
  return shell('派生新菜回执', '私家大厨 ｜ 派生', blocks);
}
