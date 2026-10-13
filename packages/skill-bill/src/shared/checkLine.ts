/**
 * 对账卡（CHECK）的内容画法——只定这一件事。
 *
 * 用户 2026-10-13 两轮裁定：
 *  ① 编号段（会话 m02072 选「甲」）：小集逐号列全；大集只列前几个＋写总个数。
 *     改前的毛病：4175 条时逐号列全＝28,683 字节的一行数字墙（读数见票 #1279 的证据评论）。
 *  ② 卡片形状（会话 m02211）：「编号 … ／ 共 N 笔 ／ 异常：无」这种斜杠串太丑 ⇒ 改成
 *     「标签→值」两列三行（编号／笔数／异常）；卡片左边照旧留状态点，值多行也读得下去。
 *
 * 谁在用：查询域 13 份票据页 ＋ 查标签 ＋ 搜备注 ＋ 详情页（单条）。写入域两张回执页
 * （`./../write/receiptPaper.js` 与 `./../write/template-update.js`）各持一份自己的画法，未并入。
 */
import { escapeHtml } from 'base-paint';

/** 超过这个数就不再逐号列全。 */
export const CHECK_ID_LIMIT = 20;

/** 大集时先列几个编号。 */
export const CHECK_ID_HEAD = 8;

/** 对账行的编号段：小集 `1、2、3`；大集 `1、…、8 等 4175 个`。 */
export function checkIdText(ids: readonly (string | number)[]): string {
  const all = ids.map((id) => String(id));
  if (all.length <= CHECK_ID_LIMIT) return all.join('、');
  return all.slice(0, CHECK_ID_HEAD).join('、') + ' 等 ' + String(all.length) + ' 个';
}

/** 对账卡的一行：`label` 左列、`value` 右列；`ok` 的值（「异常」那一行）走绿字。 */
export interface CheckRow {
  readonly label: string;
  readonly value: string;
  readonly ok?: boolean;
}

/** 对账卡的三行（编号／笔数／异常）。编号为空时不发「编号」行。
 *
 *  `countText` 是各页算好的笔数片段（`4175 笔（含转账 2）`／`共 4175 笔` 这种都行）：左列已经写着
 *  「笔数」，故这里去掉开头的「共 」「查到 」与紧跟数字的那个「 笔」，读作 `笔数 4175（含转账 2）`。
 */
export function checkRowsOf(input: {
  readonly ids?: readonly (string | number)[];
  readonly countText: string;
  readonly note?: string;
}): readonly CheckRow[] {
  const rows: CheckRow[] = [];
  if (input.ids !== undefined && input.ids.length > 0) rows.push({ label: '编号', value: checkIdText(input.ids) });
  rows.push({ label: '笔数', value: input.countText.replace(/^共\s*/, '').replace(/^查到\s*/, '').replace(/ 笔/, '') });
  rows.push({ label: '异常', value: input.note ?? '无', ok: true });
  return rows;
}

/** 对账卡的「标签→值」两列（`<dl>`）；各页自己在外层套卡壳与状态点。 */
export function checkListHtml(rows: readonly CheckRow[]): string {
  return '<dl class="ilife-check-list">' + rows.map((row) =>
    '<dt>' + escapeHtml(row.label) + '</dt>'
    + '<dd' + (row.ok === true ? ' class="is-ok"' : '') + '>' + escapeHtml(row.value) + '</dd>').join('') + '</dl>';
}
