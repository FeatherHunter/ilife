/** 数据族引擎判据（六家可复用的一套判据 × 各家夹具，#955）。
 *
 * 用法（卡路里先行，见 `packages/skill-calorie/test/data-query-955.test.mjs`）：
 * 后续五家直接引用本件——只换夹具（自家 CLI 路径、表清单、种子写法、缺席断言的自家路径），
 * 断言一律调这里的函数，不各写一份。
 *
 * 本件只做「判」，不做「布」：建库、插种子、隔离现场由各家夹具做（各家 schema 不同）；
 * 进来的都是已跑出的读数（envelope、独立 SQL 行、独立 PRAGMA 列），这里只比对。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

/** 跑一次 CLI：返回 `{ status, stdout, stderr }`（stdout 须为一行 envelope JSON 由调用方再断）。 */
export function runCli(nodeBin, bin, args, env) {
  const r = spawnSync(nodeBin, [bin, ...args], { encoding: 'utf8', env });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/** stdout 须为一行 envelope JSON，返回解析后的对象。 */
export function parseEnvelopeLine(stdout, label) {
  const lines = stdout.trimEnd().split('\n');
  assert.equal(lines.length, 1, label + '：stdout 须为一行 envelope JSON（实际 ' + lines.length + ' 行）');
  return JSON.parse(lines[0]);
}

/** envelope 五字段＋ `shape: resultset`＋ `results` 为数组。返回 `results`。 */
export function assertResultsetEnvelope(env, { skill, key }, label) {
  assert.equal(env.version, '0.1.0', label + '：version');
  assert.equal(env.skill, skill, label + '：skill');
  assert.equal(env.key, key, label + '：key');
  assert.equal(env.shape, 'resultset', label + '：shape');
  assert.ok(Array.isArray(env.data.results), label + '：data.results 须为数组');
  return env.data.results;
}

/** 独立读数：测试自己直连库跑等价 SQL（不经过被测实现），原样回行对象数组。 */
export function sqlRowsOf(dbFile, sql, params = []) {
  const db = new DatabaseSync(dbFile, { readOnly: true });
  try {
    return db.prepare(sql).all(...params);
  } finally {
    db.close();
  }
}

/** 独立读数：测试自己直连库跑 `PRAGMA table_info`（不经过被测实现），按 `cid` 排序回名与类型。 */
export function pragmaFieldsOf(dbFile, tables) {
  const db = new DatabaseSync(dbFile, { readOnly: true });
  try {
    const out = new Map();
    for (const table of tables) {
      const rows = db.prepare('PRAGMA table_info("' + table + '")').all();
      assert.ok(rows.length > 0, '独立读数：' + table + ' 表不存在');
      out.set(
        table,
        rows
          .map((r) => ({ cid: r.cid, name: r.name, type: r.type }))
          .sort((a, b) => a.cid - b.cid)
          .map(({ name, type }) => ({ name, type })),
      );
    }
    return out;
  } finally {
    db.close();
  }
}

/** 行逐字段相等（含 `NULL` 即 `null`）：键集合一致＋每值逐个相等。
 *  注：实现侧回普通对象、独立 SQL 侧回 null 原型对象——只比键与值，不比原型。 */
export function assertRowsEqual(actual, expected, label) {
  assert.equal(actual.length, expected.length, label + '：行数不等（实际 ' + actual.length + '，期望 ' + expected.length + '）');
  for (let i = 0; i < expected.length; i += 1) {
    const aKeys = Object.keys(actual[i]).sort();
    const eKeys = Object.keys(expected[i]).sort();
    assert.deepEqual(aKeys, eKeys, label + '：第 ' + i + ' 行键集合不等');
    for (const k of eKeys) {
      assert.deepEqual(actual[i][k], expected[i][k], label + '：第 ' + i + ' 行字段 ' + k + ' 不等');
    }
  }
}

/** 结果项的 `fields` 与独立 PRAGMA 逐条一致（判据不手抄列名；缺省 select 即全列）。 */
export function assertFieldsMatchPragma(itemFields, pragmaCols, label) {
  assert.deepEqual(itemFields, pragmaCols, label + '：fields 与 PRAGMA 不一致');
}

/** 成功项：`ok:true`＋原样回显查询单＋ `total` 与行数一致。 */
export function assertItemOk(item, query, label) {
  assert.equal(item.ok, true, label + '：ok 须为 true（实际 ' + JSON.stringify(item.error ?? null) + '）');
  assert.deepEqual(item.query, query, label + '：query 须原样回显');
  assert.equal(item.total, item.rows.length, label + '：total 须与行数一致');
}

/** 空集是合法结果：`rows: []`、`total: 0`，仍是 `ok:true`。 */
export function assertEmptyOk(item, label) {
  assert.equal(item.ok, true, label + '：空集须是 ok:true');
  assert.deepEqual(item.rows, [], label + '：空集 rows 须为 []');
  assert.equal(item.total, 0, label + '：空集 total 须为 0');
}

/** 失败项：`ok:false`＋报文点名 `name`（非法表名／非法字段被拒并指出是哪一处）。 */
export function assertItemErrorNames(item, name, label) {
  assert.equal(item.ok, false, label + '：坏项 ok 须为 false');
  assert.ok(item.error && typeof item.error.message === 'string', label + '：坏项须带 error.message');
  assert.ok(
    item.error.message.includes(name),
    label + '：报文须点名「' + name + '」（实际：' + item.error.message + '）',
  );
}

/** #958 · 分页：单页行数不超过页大小（`rows.length <= size`），`total` 为全量命中数（与页大小无关）。 */
export function assertPageSize(item, size, label) {
  assert.equal(item.ok, true, label + '：分页项须 ok:true（实际 ' + JSON.stringify(item.error ?? null) + '）');
  assert.ok(
    item.rows.length <= size,
    label + '：单页行数须不超过页大小（实际 ' + item.rows.length + '，页大小 ' + size + '）',
  );
}

/** #958 · 还有后页：须回不透明凭据（非空字符串，调用方当黑盒）。 */
export function assertHasNext(item, label) {
  assert.equal(item.ok, true, label + '：须 ok:true 才谈后页');
  assert.equal(typeof item.next, 'string', label + '：还有后页时须回 next 凭据（实际：' + JSON.stringify(item.next ?? null) + '）');
  assert.ok(item.next.length > 0, label + '：next 凭据须为非空字符串');
}

/** #958 · 末页：不再回凭据（`next` 缺席；`null` 与空串同样视为“回了”，一律判红）。 */
export function assertNoNext(item, label) {
  assert.equal(item.ok, true, label + '：须 ok:true 才谈末页');
  assert.equal(
    item.next,
    undefined,
    label + '：末页不得再回凭据（实际 next=' + JSON.stringify(item.next ?? null) + '）',
  );
}

/** #958 · 全量命中数：分页项的 `total` 须等于预期全量（一次性取完的行数，不随页大小变）。 */
export function assertTotalEquals(item, expectedTotal, label) {
  assert.equal(item.ok, true, label + '：须 ok:true 才谈 total');
  assert.equal(item.total, expectedTotal, label + '：total 须为全量命中数（实际 ' + item.total + '，预期 ' + expectedTotal + '）');
}
