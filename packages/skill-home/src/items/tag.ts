// 物品能力·标签与分类（`home.tag.query`／`home.tag.write` 的处理函数，
// #800 从 cmd_read 逐字搬迁）。出参 list／receipt 形，行为与搬迁前一致。

import type { HomeDb } from '../fetch/db.js';
import { listAllTags, mergeTags, listCategories } from '../fetch/index.js';
import { fail } from '../shared/fail.js';
import { asInt } from '../shared/params.js';
import { buildTagList, buildReceipt } from '../render/index.js';

export function runTagQuery(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'tags';
  if (kind === 'categories' || kind === 'category') {
    const cats = listCategories(handle);
    return buildTagList([], cats);
  }
  return buildTagList(listAllTags(handle));
}

export function runTagWrite(params: Record<string, unknown>, handle: HomeDb): unknown {
  const op = (params.op as string | undefined) ?? 'merge';
  if (op === 'merge') {
    const from = params.from as string | undefined, to = params.to as string | undefined;
    if (!from || !to) fail(2, '合标签须给 from/to');
    const n = mergeTags(handle, from as string, to as string);
    return buildReceipt('已合标签：' + from + '→' + to + '（' + n + ' 件）');
  }
  if (op === 'overview') return buildReceipt('标签总览：' + listAllTags(handle).length + ' 个标签（详情走 home.tag.query）');
  if (op === 'tidy') {
    const tags = listAllTags(handle).map((t) => t.tag);
    const sims: string[] = [];
    for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) {
      if (tags[i][0] === tags[j][0] && Math.abs(tags[i].length - tags[j].length) <= 1) sims.push(tags[i] + '~' + tags[j]);
    }
    return buildReceipt(sims.length ? '相近标签：' + sims.slice(0, 10).join('、') : '无相近标签');
  }
  if (op === 'category') {
    const action = (params.action as string | undefined) ?? 'tree';
    if (action === 'add') {
      const name = String(params.name ?? '');
      if (!name.trim()) fail(2, '分类新增须给 name');
      const parent = params.parent_id !== undefined ? Number(params.parent_id) : null;
      handle.db.prepare('INSERT INTO categories (parent_id, name) VALUES (?,?)').run(parent, name.trim());
      return buildReceipt('已新增分类：' + name.trim());
    }
    if (action === 'rename') {
      const id = asInt(params.category_id ?? params.id, 'category_id');
      if (id === undefined || !params.name) fail(2, '分类改名须给 category_id+name');
      handle.db.prepare('UPDATE categories SET name=? WHERE id=?').run(String(params.name), id as number);
      return buildReceipt('已改名分类：' + id);
    }
    if (action === 'merge') {
      const from = asInt(params.from_id ?? params.from, 'from');
      const to = asInt(params.to_id ?? params.to, 'to');
      if (from === undefined || to === undefined) fail(2, '分类合并须给 from/to id');
      handle.db.prepare('UPDATE items SET category_id=? WHERE category_id=?').run(to as number, from as number);
      handle.db.prepare('UPDATE categories SET is_active=0 WHERE id=?').run(from as number);
      return buildReceipt('已合并分类：' + from + '→' + to);
    }
    return buildReceipt('分类树：' + listCategories(handle).length + ' 节点（详情走 home.tag.query kind=categories）');
  }
  fail(2, '未知 tag op：' + op); return null;
}
