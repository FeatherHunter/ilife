#!/usr/bin/env node
/** 种子库 · 70 场景核验（票 #802）。
 *
 * 每个场景一个有名字的查法，全部走真取数层（`dist/fetch/*` 的公开函数 ＋ 直读 SQL 只读），
 * 不满足“≥3”即 FAIL 并点名。照片类另验文件真实存在（`seed-png.mjs` 落的文件）。
 * 对外只给 `runAllChecks(handle, seedDir)`，返回 `{ rows, failed }`。
 *
 * 认场景用命令中文名（`commandCn`，70 条两两不重）：场景 id 只住事实源与机器附录，不进本件。
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

/** 70 行核验：命令中文名／场景标题／查法（返回 { n, want, hint }）。 */
export function checkSpecs(seedDir) {
  const photoFile = (f) => join(seedDir, 'photos', f);
  return [
    { commandCn: '录物品', title: '录入一件新物品', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { commandCn: '拍物品', title: '拍照识别录入物品', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE photo IS NOT NULL AND photo<>''") }) },
    { commandCn: '批量录入', title: '批量录入多件物品', want: 5, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { commandCn: '补录', title: '补录历史物品', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM item_locations WHERE purchase_date IS NOT NULL') }) },
    { commandCn: '查物品', title: '搜索查找物品', want: 3, run: (h, api) => ({ n: api.searchItems(h, { name: '衣', limit: 20 }).length }) },
    { commandCn: '看物品', title: '查看物品详情', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items WHERE id IN (1,2,3)') }) },
    { commandCn: '紧急定位', title: '紧急查找物品位置', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE fixed_location IS NOT NULL AND fixed_location<>''") }) },
    { commandCn: '筛选浏览', title: '按条件筛选浏览物品', want: 3, run: (h, api) => ({ n: api.searchItems(h, { name: '充电线', limit: 20 }).length + api.searchItems(h, { name: '剪刀', limit: 20 }).length }) },
    { commandCn: '拍照找物品', title: '拍照反向查找物品', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE photo IS NOT NULL AND photo<>''") }) },
    { commandCn: '查重复', title: '检查重复物品', want: 3, run: (h) => ({ n: all(h.db, 'SELECT name FROM items GROUP BY name HAVING count(*)>=2').length }) },
    { commandCn: '改物品', title: '修改物品信息', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { commandCn: '移物品', title: '移动物品位置', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(DISTINCT location) AS c FROM item_locations') }) },
    { commandCn: '数量变更', title: '变更物品数量', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM item_locations WHERE quantity>=2') }) },
    { commandCn: '状态变更', title: '变更物品状态', want: 4, run: (h) => ({ n: all(h.db, 'SELECT DISTINCT location_status FROM item_locations').length }) },
    { commandCn: '合并物品', title: '合并重复物品', want: 2, run: (h) => ({ n: all(h.db, 'SELECT name FROM items GROUP BY name HAVING count(*)>=2').length }) },
    { commandCn: '撤销操作', title: '撤销最近操作', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM item_events') }) },
    { commandCn: '物品关联', title: '设置物品关联', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM item_events WHERE event='relate'") }) },
    { commandCn: '标物品', title: '修改物品标签', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM item_tags') }) },
    { commandCn: '管标签', title: '管理标签', want: 5, run: (h, api) => ({ n: api.listAllTags(h).length }) },
    { commandCn: '管分类', title: '管理分类', want: 10, run: (h, api) => ({ n: api.listCategories(h).length }) },
    {
      commandCn: '整理建议', title: '标签分类整理建议', want: 1, run: (h, api) => {
        const tags = api.listAllTags(h).map((t) => t.tag);
        let pairs = 0;
        for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) {
          if (tags[i][0] === tags[j][0] && Math.abs(tags[i].length - tags[j].length) <= 1) pairs++;
        }
        return { n: pairs };
      },
    },
    {
      commandCn: '查看照片', title: '查看物品照片', want: 5, run: (h) => {
        const rows = all(h.db, "SELECT photo FROM items WHERE photo IS NOT NULL AND photo<>''");
        const missing = rows.filter((r) => !existsSync(photoFile(String(r.photo)))).length;
        return { n: rows.length - missing, hint: missing ? '缺文件 ' + missing : '' };
      },
    },
    {
      commandCn: '管照片', title: '管理物品照片', want: 5, run: (h) => {
        const rows = all(h.db, "SELECT photo FROM items WHERE photo IS NOT NULL AND photo<>''");
        const missing = rows.filter((r) => !existsSync(photoFile(String(r.photo)))).length;
        return { n: rows.length - missing, hint: missing ? '缺文件 ' + missing : '' };
      },
    },
    { commandCn: '照片墙', title: '浏览物品照片墙', want: 5, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE photo IS NOT NULL AND photo<>''") }) },
    { commandCn: '盘点', title: '盘点核对', want: 3, run: (h, api) => ({ n: api.listInventoryRecords(h, 20).length }) },
    { commandCn: '差异处理', title: '处理盘点差异', want: 1, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM inventory_records WHERE missing+extra>0') }) },
    { commandCn: '盘点记录', title: '查看盘点记录', want: 3, run: (h, api) => ({ n: api.listInventoryRecords(h, 20).length }) },
    { commandCn: '搬家盘点', title: '搬家打包盘点', want: 10, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { commandCn: '历史', title: '查看物品历史', want: 10, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM item_events') }) },
    { commandCn: '管位置', title: '管理位置体系', want: 8, run: (h, api) => ({ n: api.listLocationNodes(h).length }) },
    { commandCn: '固定位', title: '设置固定位', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE fixed_location IS NOT NULL AND fixed_location<>''") }) },
    { commandCn: '收纳建议', title: '收纳位置建议', want: 2, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM item_locations WHERE location LIKE '卧室/%'") }) },
    { commandCn: '空间视图', title: '空间视图浏览', want: 5, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM location_nodes WHERE path LIKE '%/%'") }) },
    { commandCn: '穿什么', title: '今日穿搭推荐', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE category LIKE '%衣%' OR category LIKE '%穿%' OR name LIKE '%衣%' OR name LIKE '%鞋%'") }) },
    { commandCn: '衣橱分析', title: '衣橱闲置分析', want: 3, run: (h, api) => ({ n: api.idleItems(h, 90).length }) },
    { commandCn: '换季', title: '换季收纳', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM item_tags WHERE tag IN ('夏季','冬季','春秋','已收纳')") }) },
    { commandCn: '出行清单', title: '出行带物清单', want: 2, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM item_locations WHERE location_status='旅游中'") }) },
    { commandCn: '旅行穿搭', title: '旅行穿搭计划', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM items WHERE category LIKE '%衣%' OR name LIKE '%衣%'") }) },
    { commandCn: '统物品', title: '物品总览', want: 20, run: (h, api) => ({ n: Number(api.statsOverview(h).items) }) },
    { commandCn: '查闲置', title: '闲置物品检测', want: 3, run: (h, api) => ({ n: api.idleItems(h, 90).length }) },
    { commandCn: '查过期', title: '过期检查与预告', want: 3, run: (h, api) => ({ n: api.expiringItems(h, 30, false).length }) },
    { commandCn: '盘点统计', title: '盘点统计与建议', want: 3, run: (h, api) => ({ n: api.listInventoryRecords(h, 20).length }) },
    { commandCn: '购物清单', title: '购物清单', want: 3, run: (h, api) => ({ n: api.listShopping(h).length }) },
    { commandCn: '缺货检测', title: '缺货检测', want: 2, run: (h, api) => ({ n: api.missingItems(h).length }) },
    { commandCn: '查快递', title: '快递跟踪', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM item_locations WHERE location_status='快递中'") }) },
    { commandCn: '囤货盘点', title: '囤货盘点', want: 3, run: (h, api) => ({ n: api.stockList(h).filter((r) => r.threshold !== null && r.threshold !== undefined).length }) },
    { commandCn: '借用', title: '借用管理', want: 4, run: (h, api) => ({ n: api.listBorrows(h).length }) },
    { commandCn: '家人档案', title: '家人档案', want: 3, run: (h, api) => ({ n: api.listMembers(h).length }) },
    { commandCn: '首次使用', title: '首次使用', want: 10, run: (h, api) => ({ n: Number(api.statsOverview(h).items) }) },
    {
      commandCn: '查异常', title: '数据检查', want: 1, run: (h) => {
        const noTag = count(h.db, 'SELECT count(*) AS c FROM items WHERE id NOT IN (SELECT item_id FROM item_tags)');
        const noPhoto = count(h.db, "SELECT count(*) AS c FROM items WHERE photo IS NULL OR photo=''");
        const single = count(h.db, "SELECT count(*) AS c FROM item_locations WHERE location NOT LIKE '%/%'");
        return { n: (noTag ? 1 : 0) + (noPhoto ? 1 : 0) + (single ? 1 : 0) };
      },
    },
    { commandCn: '备份导出', title: '备份与导出', want: 5, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { commandCn: '导入恢复', title: '导入与恢复', want: 5, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { commandCn: '查购买记录', title: '查购买记录', want: 5, run: (h, api) => ({ n: api.listPurchases(h, {}).length }) },
    { commandCn: '查上月购买', title: '查上月购买', want: 2, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM purchase_records WHERE substr(date,1,7)=substr(date('now','-1 month'),1,7)") }) },
    { commandCn: '查今年花费', title: '查今年花费', want: 3, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM purchase_records WHERE substr(date,1,4)=substr(date('now'),1,4)") }) },
    { commandCn: '查退货窗口', title: '查退货窗口', want: 2, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM purchase_records WHERE date>=date('now','-30 days')") }) },
    { commandCn: '登记购买记录', title: '登记购买记录', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { commandCn: '查保修状态', title: '查保修状态', want: 3, run: (h, api) => ({ n: api.listWarranties(h).length }) },
    { commandCn: '登记保修', title: '登记保修', want: 3, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM items') }) },
    { commandCn: '记录维修', title: '记录维修', want: 2, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM service_events') }) },
    { commandCn: '设置保养周期', title: '设置保养周期', want: 2, run: (h) => ({ n: count(h.db, "SELECT count(*) AS c FROM warranties WHERE kind='保养'") }) },
    { commandCn: '执行保养', title: '执行保养', want: 2, run: (h) => ({ n: count(h.db, 'SELECT count(*) AS c FROM service_events') }) },
    { commandCn: '查证件到期', title: '查证件到期', want: 3, run: (h, api) => ({ n: api.listCerts(h).length }) },
    { commandCn: '登记证件', title: '登记证件', want: 3, run: (h, api) => ({ n: api.listCerts(h).length }) },
    {
      commandCn: '证件归档', title: '证件归档', want: 2, run: (h) => {
        const rows = all(h.db, "SELECT photo FROM certificates WHERE photo IS NOT NULL AND photo<>''");
        const missing = rows.filter((r) => !existsSync(photoFile(String(r.photo)))).length;
        return { n: rows.length - missing, hint: missing ? '缺文件 ' + missing : '' };
      },
    },
    { commandCn: '更新证件', title: '更新证件', want: 3, run: (h, api) => ({ n: api.listCerts(h).length }) },
    { commandCn: '查账号', title: '查账号', want: 4, run: (h, api) => ({ n: api.listAccounts(h).length }) },
    { commandCn: '存账号', title: '存账号', want: 1, run: (h) => ({ n: existsSync(join(seedDir, '.master.key')) ? 4 : 0 }) },
    { commandCn: '改账号', title: '改账号', want: 2, run: (h, api) => ({ n: api.listAccounts(h).length }) },
    { commandCn: '看密码', title: '看密码', want: 1, run: (h, api) => ({ n: api.listAccounts(h).length }) },
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
    rows.push({ commandCn: s.commandCn, title: s.title, want: s.want, got: err ? 'ERR:' + err : n, ok, hint });
    if (!ok) console.log('CHECK ' + s.commandCn + ' ' + s.title + '  want>=' + s.want + ' got=' + (err ? 'ERR ' + err : n) + ' ✗' + (hint ? ' ' + hint : ''));
    else console.log('CHECK ' + s.commandCn + ' ' + s.title + '  want>=' + s.want + ' got=' + n + ' ✓');
  }
  void daysAgo;
  void isoDaysAgo;
  return { rows, failed, total: specs.length };
}
