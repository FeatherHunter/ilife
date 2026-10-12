// #1276 · 条目 24：「设置当前配置」在**生成期**预填配置文件里已有的现值。
//
// 跑法（先 `pnpm build`）：node --test packages/skill-bill/test/t1276-预填当前配置.test.mjs
//
// 判据：
//   ① 文件里写了 `db.dir`／`db.name`／`html.dir` ⇒ HELP 载荷里那三格 `value` 就是这三个值（原样，不脱敏）；
//   ② 文件里**没写**的键（这里 `backup.dir`）⇒ 那一格留空＝「空＝不改」的语义不动；
//   ③ 现场没有配置文件时照常出页，且预填值只可能来自**现场那份文件**（读文件自证，不认别的来源）；
//   ④ 读不出（不是合法子集）⇒ 只读解析器给空表，不抛错（`configPrefillValues()` 单测，不经 CLI：
//      CLI 在 `preflight` 就会对坏配置报 ERR 1，那是启动处的既有行为，不是预填这条链的）。
//   ⑤ 预填只发生在生成期：不传 `configValues` 时四格仍是声明里的空串。
//
// 红线：只读临时家目录；只往临时目录写 `--html` 产物；不碰真实 `~/.ilife`。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { billConfigDir, configDirOf, homeEnvOf, saveHomeEnv, useHome } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const NODE = [process.env.npm_node_execpath, 'node', process.execPath]
  .filter(Boolean)
  .find((c) => {
    const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
    return p.status === 0 && /^v\d+/.test((p.stdout || '').trim());
  }) ?? process.execPath;

const SCENE_ID = 'setup_config_write';
const FIELD_NAMES = ['db_dir', 'db_name', 'backup_dir', 'html_dir'];
let OUT = '';

/** 生成一份全量 HELP，回产物 HTML。`env` 决定子进程读哪份家目录里的配置。 */
function helpHtml(env, name) {
  const file = join(OUT, name + '.html');
  const r = spawnSync(NODE, [bin, 'bill.help.lookup', '--html', file], { cwd: here, encoding: 'utf8', env });
  assert.equal(r.status, 0, 'HELP 应 exit 0：' + r.stderr);
  assert.ok(existsSync(file), '产物应落盘：' + file);
  return readFileSync(file, 'utf8');
}

/** 从产物里取 `#help-data` 载荷（壳里 `<` 被转义成 `\u003c`，JSON.parse 认）。 */
function helpDataOf(html) {
  const m = /<script id="help-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(m, '产物应有 help-data 载荷');
  return JSON.parse(m[1]);
}

/** 场景的字段名 → `{value, source, kind}`。 */
function fieldValuesOf(data, sceneId) {
  for (const g of data.groups) {
    for (const s of g.subgroups) {
      for (const sc of s.scenes) {
        if (sc.id !== sceneId) continue;
        const out = {};
        for (const f of sc.editable_fields ?? []) out[f.name] = { value: f.value, source: f.source, kind: f.kind };
        return out;
      }
    }
  }
  throw new Error('载荷里找不到场景：' + sceneId);
}

/** 现场那份 `bill.yaml` 里的「键 → 值」（只为自证预填值的来源；不解析，够用即止）。 */
function fileValuesOf(home) {
  const file = join(configDirOf(home), 'bill.yaml');
  if (!existsSync(file)) return {};
  const out = {};
  let group = '';
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const head = /^([A-Za-z_][\w.-]*):\s*$/.exec(line);
    if (head !== null) {
      group = head[1];
      continue;
    }
    const kv = /^\s+([A-Za-z_][\w.-]*):\s*(.*)$/.exec(line);
    if (kv === null) continue;
    const raw = kv[2].trim().replace(/^"(.*)"$/, '$1');
    out[group + '.' + kv[1]] = raw;
  }
  return out;
}

before(() => {
  OUT = mkdtempSync(join(tmpdir(), 't1276-prefill-html-'));
});

describe('1276 条目24 · 生成期预填当前配置', () => {
  it('文件里已有的三格预填原值（真路径不脱敏）；没写的那格留空', () => {
    const HOME = mkdtempSync(join(tmpdir(), 't1276-prefill-home-'));
    const DB = mkdtempSync(join(tmpdir(), 't1276-prefill-db-'));
    const env = homeEnvOf(HOME);
    billConfigDir(HOME, { db: { dir: DB, name: 'my.db' }, html: { dir: 'my_html' } });

    const fields = fieldValuesOf(helpDataOf(helpHtml(env, 't1276-prefill-ok')), SCENE_ID);
    assert.equal(fields.db_dir.value, DB, '数据目录应预填文件里的现值（真路径）');
    assert.equal(fields.db_name.value, 'my.db', '库文件名应预填');
    assert.equal(fields.html_dir.value, 'my_html', '产物目录名应预填');
    assert.equal(fields.backup_dir.value, '', '文件里没写的键留空＝「空＝不改」');
    for (const name of FIELD_NAMES) assert.equal(fields[name].source, 'config', '四格都应声明 source:config');
  });

  it('现场没有配置文件：照常出页，且预填值只来自现场那份文件', () => {
    const HOME = mkdtempSync(join(tmpdir(), 't1276-prefill-none-'));
    mkdirSync(HOME, { recursive: true });
    const env = homeEnvOf(HOME);
    const fields = fieldValuesOf(helpDataOf(helpHtml(env, 't1276-prefill-none')), SCENE_ID);

    // 预填的每一格都必须等于那份文件里同名位置的值（文件不在／键不在 ⇒ 只许留空）。
    const file = fileValuesOf(HOME);
    const map = { db_dir: 'db.dir', db_name: 'db.name', backup_dir: 'backup.dir', html_dir: 'html.dir' };
    for (const name of FIELD_NAMES) {
      assert.equal(fields[name].value, file[map[name]] ?? '', name + ' 的预填值只能来自现场文件');
    }
  });

  it('读不出（不是合法子集）：只读解析器给空表，不抛错', async () => {
    const restore = saveHomeEnv();
    try {
      const HOME = mkdtempSync(join(tmpdir(), 't1276-prefill-bad-'));
      const { configPrefillValues } = await import('../dist/setup/configPrefill.js');
      useHome(HOME);
      assert.deepEqual(configPrefillValues(), {}, '文件不在 ⇒ 空表');
      billConfigDir(HOME, { db: { dir: HOME } });
      writeFileSync(join(configDirOf(HOME), 'bill.yaml'), '这不是一行合法配置\n', 'utf8');
      assert.deepEqual(configPrefillValues(), {}, '解析不出 ⇒ 空表（不抛）');
    } finally {
      restore();
    }
  });

  it('预填是生成期的事：不传 configValues 时四格仍是声明里的空串', async () => {
    const { buildHelpFileData } = await import('../dist/help/helpFile.js');
    const fields = fieldValuesOf(buildHelpFileData(new Date(2026, 9, 13, 2, 0, 0)), SCENE_ID);
    for (const name of FIELD_NAMES) assert.equal(fields[name].value, '', name + ' 声明本身仍是空串');

    const filled = fieldValuesOf(
      buildHelpFileData(new Date(2026, 9, 13, 2, 0, 0), { configValues: { db_dir: 'D:/记一下' } }),
      SCENE_ID,
    );
    assert.equal(filled.db_dir.value, 'D:/记一下', '传了快照才填这一格');
    assert.equal(filled.backup_dir.value, '', '快照里没有的格不动');
  });
});
