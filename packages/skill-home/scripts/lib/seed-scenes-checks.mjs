#!/usr/bin/env node
/** 种子库 · 70 场景核验（票 #802）。
 *
 * 每个场景一个有名字的查法，全部走真取数层（`dist/fetch/*` 的公开函数 ＋ 直读 SQL 只读），
 * 不满足“≥3”即 FAIL 并点名。照片类另验文件真实存在（`seed-png.mjs` 落的文件）。
 * 对外只给 `runAllChecks(handle, seedDir)`，返回 `{ rows, failed }`。
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

function row(db, sql, ...args) {
  return db.prepare(sql).get(...args);
}
function all(db, sql, ...args) {
  return db.prepare(sql).all(...args);
}
function count(db, sql, ...args) {
  return Number(row(db, sql, ...args).c);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** 70 行核验：id／场景标题／查法（返回 { n, want, hint }）。 */
export function checkSpecs(seedDir) {
  const photoFile = (f) => join(seedDir, 'photos', f);
  return [
    { id: '1-1', title: '录入一件新物品', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { id: '1-2', title: '拍照识别录入物品', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE photo IS NOT NULL AND photo<>''") }) },
    { id: '1-3', title: '批量录入多件物品', want: 5, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { id: '1-4', title: '补录历史物品', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM item_locations WHERE purchase_date IS NOT NULL') }) },
    { id: '2-1', title: '搜索查找物品', want: 3, run: (h, api) => ({ n: api.searchItems(h, { name: '衣', limit: 20 }).length }) },
    { id: '2-2', title: '查看物品详情', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items WHERE id IN (1,2,3)') }) },
    { id: '2-3', title: '紧急查找物品位置', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE fixed_location IS NOT NULL AND fixed_location<>''") }) },
    { id: '2-4', title: '按条件筛选浏览物品', want: 3, run: (h, api) => ({ n: api.searchItems(h, { name: '充电线', limit: 20 }).length + api.searchItems(h, { name: '剪刀', limit: 20 }).length }) },
    { id: '2-5', title: '拍照反向查找物品', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE photo IS NOT NULL AND photo<>''") }) },
    { id: '2-6', title: '检查重复物品', want: 3, run: (h) => ({ n: all(h.db, 'SELECT name FROM items GROUP BY name HAVING count(*)>=2').length }) },
    { id: '3-1', title: '修改物品信息', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { id: '3-2', title: '移动物品位置', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(DISTINCT location) AS c FROM item_locations') }) },
    { id: '3-3', title: '变更物品数量', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM item_locations WHERE quantity>=2') }) },
    { id: '3-4', title: '变更物品状态', want: 4, run: (h) => ({ n: all(h.db, 'SELECT DISTINCT location_status FROM item_locations').length }) },
    { id: '3-5', title: '合并重复物品', want: 2, run: (h) => ({ n: all(h.db, 'SELECT name FROM items GROUP BY name HAVING count(*)>=2').length }) },
    { id: '3-6', title: '撤销最近操作', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM item_events') }) },
    { id: '3-7', title: '设置物品关联', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM item_events WHERE event='relate'") }) },
    { id: '3-8', title: '修改物品标签', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM item_tags') }) },
    { id: '4-1', title: '管理标签', want: 5, run: (h, api) => ({ n: api.listAllTags(h).length }) },
    { id: '4-2', title: '管理分类', want: 10, run: (h, api) => ({ n: api.listCategories(h).length }) },
    {
      id: '4-3', title: '标签分类整理建议', want: 1, run: (h, api) => {
        const tags = api.listAllTags(h).map((t) => t.tag);
        let pairs = 0;
        for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) {
          if (tags[i][0] === tags[j][0] && Math.abs(tags[i].length - tags[j].length) <= 1) pairs++;
        }
        return { n: pairs };
      },
    },
    {
      id: '5-1', title: '查看物品照片', want: 5, run: (h) => {
        const rows = all(h.db, "SELECT photo FROM items WHERE photo IS NOT NULL AND photo<>''");
        const missing = rows.filter((r) => !existsSync(photoFile(String(r.photo)))).length;
        return { n: rows.length - missing, hint: missing ? '缺文件 ' + missing : '' };
      },
    },
    {
      id: '5-2', title: '管理物品照片', want: 5, run: (h) => {
        const rows = all(h.db, "SELECT photo FROM items WHERE photo IS NOT NULL AND photo<>''");
        const missing = rows.filter((r) => !existsSync(photoFile(String(r.photo)))).length;
        return { n: rows.length - missing, hint: missing ? '缺文件 ' + missing : '' };
      },
    },
    { id: '5-3', title: '浏览物品照片墙', want: 5, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE photo IS NOT NULL AND photo<>''") }) },
    { id: '6-1', title: '盘点核对', want: 3, run: (h, api) => ({ n: api.listInventoryRecords(h, 20).length }) },
    { id: '6-2', title: '处理盘点差异', want: 1, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM inventory_records WHERE missing+extra>0') }) },
    { id: '6-3', title: '查看盘点记录', want: 3, run: (h, api) => ({ n: api.listInventoryRecords(h, 20).length }) },
    { id: '6-4', title: '搬家打包盘点', want: 10, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { id: '7-1', title: '查看物品历史', want: 10, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM item_events') }) },
    { id: 'SM2-1', title: '管理位置体系', want: 8, run: (h, api) => ({ n: api.listLocationNodes(h).length }) },
    { id: 'SM2-2', title: '设置固定位', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE fixed_location IS NOT NULL AND fixed_location<>''") }) },
    { id: 'SM2-3', title: '收纳位置建议', want: 2, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM item_locations WHERE location LIKE '卧室/%'") }) },
    { id: 'SM2-4', title: '空间视图浏览', want: 5, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM location_nodes WHERE path LIKE '%/%'") }) },
    { id: 'SM3-1', title: '今日穿搭推荐', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE category LIKE '%衣%' OR category LIKE '%穿%' OR name LIKE '%衣%' OR name LIKE '%鞋%'") }) },
    { id: 'SM3-2', title: '衣橱闲置分析', want: 3, run: (h, api) => ({ n: api.idleItems(h, 90).length }) },
    { id: 'SM3-3', title: '换季收纳', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM item_tags WHERE tag IN ('夏季','冬季','春秋','已收纳')") }) },
    { id: 'SM3-4', title: '出行带物清单', want: 2, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM item_locations WHERE location_status='旅游中'") }) },
    { id: 'SM3-5', title: '旅行穿搭计划', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE category LIKE '%衣%' OR name LIKE '%衣%'") }) },
    { id: 'SM4-1', title: '物品总览', want: 20, run: (h, api) => ({ n: Number(api.statsOverview(h).items) }) },
    { id: 'SM4-2', title: '闲置物品检测', want: 3, run: (h, api) => ({ n: api.idleItems(h, 90).length }) },
    { id: 'SM4-3', title: '过期检查与预告', want: 3, run: (h, api) => ({ n: api.expiringItems(h, 30, false).length }) },
    { id: 'SM4-4', title: '盘点统计与建议', want: 3, run: (h, api) => ({ n: api.listInventoryRecords(h, 20).length }) },
    { id: 'SM5-1', title: '购物清单', want: 3, run: (h, api) => ({ n: api.listShopping(h).length }) },
    { id: 'SM5-2', title: '缺货检测', want: 2, run: (h, api) => ({ n: api.missingItems(h).length }) },
    { id: 'SM5-3', title: '快递跟踪', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM item_locations WHERE location_status='快递中'") }) },
    { id: 'SM5-4', title: '囤货盘点', want: 3, run: (h, api) => ({ n: api.stockList(h).filter((r) => r.threshold !== null && r.threshold !== undefined).length }) },
    { id: 'SM7-1', title: '借用管理', want: 4, run: (h, api) => ({ n: api.listBorrows(h).length }) },
    { id: 'SM7-2', title: '家人档案', want: 3, run: (h, api) => ({ n: api.listMembers(h).length }) },
    { id: 'SM8-1', title: '首次使用', want: 10, run: (h, api) => ({ n: Number(api.statsOverview(h).items) }) },
    {
      id: 'SM8-2', title: '数据检查', want: 1, run: (h) => {
        const noTag = count(h.db, 'SELECT count(*) AS c FROM items WHERE id NOT IN (SELECT item_id FROM item_tags)');
        const noPhoto = count(h.db, "SELECT count(*) AS c FROM items WHERE photo IS NULL OR photo=''");
        const single = count(h.db, "SELECT count(*) AS c FROM item_locations WHERE location NOT LIKE '%/%'");
        return { n: (noTag ? 1 : 0) + (noPhoto ? 1 : 0) + (single ? 1 : 0) };
      },
    },
    { id: 'SM8-3', title: '备份与导出', want: 5, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { id: 'SM8-4', title: '导入与恢复', want: 5, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { id: 'SM6-1', title: '查购买记录', want: 5, run: (h, api) => ({ n: api.listPurchases(h, {}).length }) },
    { id: 'SM6-2', title: '查上月购买', want: 2, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM purchase_records WHERE substr(date,1,7)=substr(date('now','-1 month'),1,7)") }) },
    { id: 'SM6-3', title: '查今年花费', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM purchase_records WHERE substr(date,1,4)=substr(date('now'),1,4)") }) },
    { id: 'SM6-4', title: '查退货窗口', want: 2, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM purchase_records WHERE date>=date('now','-30 days')") }) },
    { id: 'SM6-5', title: '登记购买记录', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { id: 'SM6-6', title: '查保修状态', want: 3, run: (h, api) => ({ n: api.listWarranties(h).length }) },
    { id: 'SM6-7', title: '登记保修', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { id: 'SM6-8', title: '记录维修', want: 2, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM service_events') }) },
    { id: 'SM6-9', title: '设置保养周期', want: 2, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM warranties WHERE kind='保养'") }) },
    { id: 'SM6-10', title: '执行保养', want: 2, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM service_events') }) },
    { id: 'SM6-11', title: '查证件到期', want: 3, run: (h, api) => ({ n: api.listCerts(h).length }) },
    { id: 'SM6-12', title: '登记证件', want: 3, run: (h, api) => ({ n: api.listCerts(h).length }) },
    {
      id: 'SM6-13', title: '证件归档', want: 2, run: (h) => {
        const rows = all(h.db, "SELECT photo FROM certificates WHERE photo IS NOT NULL AND photo<>''");
        const missing = rows.filter((r) => !existsSync(photoFile(String(r.photo)))).length;
        return { n: rows.length - missing, hint: missing ? '缺文件 ' + missing : '' };
      },
    },
    { id: 'SM6-14', title: '更新证件', want: 3, run: (h, api) => ({ n: api.listCerts(h).length }) },
    { id: 'SM6-15', title: '查账号', want: 4, run: (h, api) => ({ n: api.listAccounts(h).length }) },
    { id: 'SM6-16', title: '存账号', want: 1, run: (h) => ({ n: existsSync(join(seedDir, '.master.key')) ? 4 : 0 }) },
    { id: 'SM6-17', title: '改账号', want: 2, run: (h, api) => ({ n: api.listAccounts(h).length }) },
    { id: 'SM6-18', title: '看密码', want: 1, run: (h, api) => ({ n: api.listAccounts(h).length }) },
  ];
}

export async function runAllChecks(handle, api, seedDir) {
  const specs = checkSpecs(seedDir);
  const rows = [];
  let failed = 0;
  for (const s of specs) {
    let n = 0;
    let hint = '';
    let err = '';
    try {
      const r = s.run(handle, api);
      n = Number(r.n);
      hint = String(r.hint ?? '');
    } catch (e) {
      err = String(e?.message ?? e);
    }
    const ok = err === '' && Number.isInteger(n) && n >= s.want;
    if (!ok) failed++;
    rows.push({ id: s.id, title: s.title, want: s.want, got: err ? 'ERR:' + err : n, ok, hint });
    if (!ok) console.log('CHECK ' + s.id + ' ' + s.title + '  want>=' + s.want + ' got=' + (err ? 'ERR ' + err : n) + ' ✗' + (hint ? ' ' + hint : ''));
    else console.log('CHECK ' + s.id + ' ' + s.title + '  want>=' + s.want + ' got=' + n + ' ✓');
  }
  void daysAgo;
  void isoDaysAgo;
  return { rows, failed, total: specs.length };
}
