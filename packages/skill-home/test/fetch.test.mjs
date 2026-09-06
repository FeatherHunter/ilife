import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openHomeDb, closeHomeDb, assertWritablePath,
  addItem, getItemById, searchItems, listAllTags, mergeTags,
  listCategories, getCategoryById, encryptPassword, decryptPassword, assertMasterKey,
  HomeFetchError,
} from '../dist/index.js';

let DB = '';
let H = null;

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'home-fetch-'));
  assertWritablePath(join(DB, 'home.db'));
  H = openHomeDb(join(DB, 'home.db'));
  assert.equal(H.initialized, true);
});

describe('居家取数 fetch（tmp 隔离）', () => {
  it('开库 8 顶级种子 + 增查闭环', () => {
    const cats = listCategories(H);
    assert.ok(cats.length >= 8);
    const cid = cats[0].id;
    const it = addItem(H, { name: '牛奶', category: cats[0].name, category_id: cid, location: '客厅/冰箱', tags: ['早餐'] });
    assert.equal(it.name, '牛奶');
    assert.equal(getItemById(H, it.id).name, '牛奶');
    assert.ok(searchItems(H, { name: '牛奶' }).length >= 1);
    assert.throws(() => getCategoryById(H, 999999), HomeFetchError);
  });
  it('查无对条大声失败 + 非 tmp 守卫', () => {
    assert.throws(() => getItemById(H, 999999), HomeFetchError);
    assert.throws(() => assertWritablePath(join('D:', 'prod-home.db')), /HOME_FORCE_PROD/);
  });
  it('标签合并 + 账号加解密 + master-key 门', () => {
    const cats = listCategories(H);
    addItem(H, { name: '白糖', category: cats[0].name, category_id: cats[0].id, location: '厨房/柜子', tags: ['白'] });
    assert.ok(mergeTags(H, '白', '白色') >= 1);
    assert.ok(listAllTags(H).some((t) => t.tag === '白色'));
    assert.throws(() => assertMasterKey('short'), HomeFetchError);
    const enc = encryptPassword('12345678', 'pw123');
    assert.equal(decryptPassword('12345678', enc), 'pw123');
    assert.throws(() => decryptPassword('87654321', enc), HomeFetchError);
  });
});
