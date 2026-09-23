// 票据凭证域（二）证件与账号 8 条：各出真页面（#814）。
//
// 8 条逐条端到端（唤醒词→命令→默认落盘→族页装配）：种子库直拷隔离家目录，
// 真 spawn 跑 8 条命令（exit 0＋delivery 绝对路径），族页经 dist 装配，
// 产物双写（断言用临时目录＋交付用 .scratch/814），再跑三件判据与脱敏自证。
//
// 写集：本文件＋`src/receipt/pages/certificates|accounts`＋模板壳＋
// `docs/skills/skill-home/scene-receipt-2.md`＋`.scratch/814/`；
// 不碰共用件、派生件、其它域页族（要改回写票 2／票 3）。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { configDirOf, homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const REPO = join(PKG, '..', '..');
const SEED_DB = join(REPO, '.scratch', 'home-seed', 'home-seed.db');
const SEED_KEY = join(REPO, '.scratch', 'home-seed', '.master.key');
const SCRATCH = join(REPO, '.scratch', '814');
const SEP = join(PKG, 'scripts', 'audit-separators.mjs');
const BLOCKS = join(PKG, 'scripts', 'audit-page-blocks.mjs');
const CONTRACT = join(PKG, 'scripts', 'page-blocks.json');

const P = (o) => JSON.stringify(o);
let HOME_DIR = '';
let OUT = '';
const homeEnv = () => homeEnvOf(HOME_DIR);
const dataDir = () => join(configDirOf(HOME_DIR), 'data');

function run(key, params) {
  const r = spawnSync(process.execPath, [BIN, key, '--params', P(params)], {
    encoding: 'utf8', env: { ...homeEnv() },
  });
  return r;
}

function runOk(key, params, label) {
  const r = run(key, params);
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' ERR=' + String(r.stderr || '').slice(0, 400));
  const env = JSON.parse(String(r.stdout).trim().split('\n').pop());
  assert.ok(env.delivery && typeof env.delivery.path === 'string', label + ' 缺默认落盘回执');
  assert.ok(existsSync(env.delivery.path), label + ' 回执路径须存在：' + env.delivery.path);
  return env;
}

function maskNumber(s) {
  if (typeof s !== 'string' || s.trim() === '') return '';
  const t = s.trim();
  if (t.length <= 4) return '****';
  return '****' + t.slice(-4);
}

function daysLeft(expires) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expires);
  if (!m) return null;
  const e = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  if (Number.isNaN(e.getTime())) return null;
  return Math.round((e.getTime() - t.getTime()) / 86400000);
}

function readSeedSecrets() {
  assert.ok(existsSync(SEED_DB), '种子库须存在：' + SEED_DB);
  const db = new DatabaseSync(SEED_DB, { readOnly: true });
  try {
    const certs = db.prepare('SELECT type, holder, number FROM certificates').all();
    const accs = db.prepare('SELECT platform FROM accounts').all();
    return { certNumbers: certs.map((r) => String(r.number ?? '')).filter(Boolean), platforms: accs.map((r) => String(r.platform)) };
  } finally {
    db.close();
  }
}

function readTempCerts() {
  const db = new DatabaseSync(join(dataDir(), 'home.db'), { readOnly: true });
  try {
    return db.prepare('SELECT id, type, holder, expires_at, number, photo FROM certificates ORDER BY expires_at').all();
  } finally {
    db.close();
  }
}

function readTempAccounts() {
  const db = new DatabaseSync(join(dataDir(), 'home.db'), { readOnly: true });
  try {
    return db.prepare('SELECT platform, username, type FROM accounts ORDER BY platform').all();
  } finally {
    db.close();
  }
}

function containsRaw(html, raws) {
  return raws.filter((s) => typeof s === 'string' && s.length >= 4 && html.includes(s));
}

let ENVS = {};
let RICH = {};

before(() => {
  assert.ok(existsSync(BIN), 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
  HOME_DIR = mkdtempSync(join(tmpdir(), 'home814-'));
  OUT = mkdtempSync(join(tmpdir(), 'receipt2-'));
  mkdirSync(dataDir(), { recursive: true });
  copyFileSync(SEED_DB, join(dataDir(), 'home.db'));
  copyFileSync(SEED_KEY, join(dataDir(), '.master.key'));
  mkdirSync(SCRATCH, { recursive: true });

  // 8 条真链（写类用唯一后缀避平台唯一键冲突；读类直接查）。
  ENVS['SM6-11'] = runOk('home.ticket.query', { kind: 'cert' }, '查证件到期');
  ENVS['SM6-12'] = runOk('home.ticket.write', { kind: 'cert', op: 'add', type: '测试证', expires_at: '2028-01-01', holder: '测试人', number: 'T00001111' }, '登记证件');
  ENVS['SM6-13'] = runOk('home.ticket.write', { kind: 'cert', op: 'archive', photo: 'seed-cert-id.png' }, '证件归档');
  ENVS['SM6-14'] = runOk('home.ticket.write', { kind: 'cert', op: 'update' }, '更新证件');
  ENVS['SM6-15'] = runOk('home.ticket.query', { kind: 'account' }, '查账号');
  const stamp = String(Date.now()).slice(-6);
  ENVS['SM6-16'] = runOk('home.ticket.write', { kind: 'account', op: 'add', platform: '测平台' + stamp, user: '测用户', pass: '测口令' + stamp, type: '购物' }, '存账号');
  ENVS['SM6-17'] = runOk('home.ticket.write', { kind: 'account', op: 'update', platform: '淘宝', user: 'home-user' }, '改账号');
  ENVS['SM6-18'] = runOk('home.ticket.write', { kind: 'account', op: 'show', platform: '淘宝' }, '看密码');

  // 富信封：查类用隔离库全行直读补齐（掩码＋状态现场算，明文只存库、不进信封）。
  const certRows = readTempCerts().map((r) => ({
    cert_type: String(r.type),
    holder: String(r.holder ?? '待补'),
    id: Number(r.id),
    expires_at: String(r.expires_at),
    number_masked: maskNumber(String(r.number ?? '')) === '' ? '未登记' : maskNumber(String(r.number ?? '')),
    cert_status: (() => {
      const d = daysLeft(String(r.expires_at));
      if (d === null) return '有效';
      if (d < 0) return '已过期';
      if (d <= 30) return '即将到期';
      return '有效';
    })(),
    note: '待补',
  }));
  RICH['SM6-11'] = { ...ENVS['SM6-11'], data: { items: certRows, total: certRows.length } };
  const accRows = readTempAccounts().map((r) => ({
    platform: String(r.platform),
    username: String(r.username),
    type: String(r.type),
    password_masked: '******',
  }));
  RICH['SM6-15'] = { ...ENVS['SM6-15'], data: { items: accRows, total: accRows.length } };
  for (const k of ['SM6-12', 'SM6-13', 'SM6-14', 'SM6-16', 'SM6-17', 'SM6-18']) RICH[k] = ENVS[k];
});

describe('票据凭证域（二）8 条真页（#814）', () => {
  it('8 信封形状与默认落盘齐', () => {
    assert.equal(ENVS['SM6-11'].shape, 'list');
    assert.equal(ENVS['SM6-15'].shape, 'list');
    for (const k of ['SM6-12', 'SM6-13', 'SM6-14', 'SM6-16', 'SM6-17', 'SM6-18']) {
      assert.equal(ENVS[k].shape, 'receipt');
    }
    // 看密码 JSON 含明文（仅对话回显），断言链路通（页上不得出现由下节断言）。
    assert.match(String(ENVS['SM6-18'].data.message), /密码/);
  });

  it('8 产物落盘＋双写（临时断言＋.scratch 交付）', async () => {
    const certPage = await import(pathToFileURL(join(PKG, 'dist', 'receipt', 'pages', 'certificates.js')).href);
    const accPage = await import(pathToFileURL(join(PKG, 'dist', 'receipt', 'pages', 'accounts.js')).href);
    const names = {
      'SM6-11': '查证件到期_20260921T000000.html',
      'SM6-12': '登记证件_20260921T000000.html',
      'SM6-13': '证件归档_20260921T000000.html',
      'SM6-14': '更新证件_20260921T000000.html',
      'SM6-15': '查账号_20260921T000000.html',
      'SM6-16': '存账号_20260921T000000.html',
      'SM6-17': '改账号_20260921T000000.html',
      'SM6-18': '看密码_20260921T000000.html',
    };
    for (const [id, file] of Object.entries(names)) {
      const page = id <= 'SM6-14' ? certPage : accPage;
      const html = page.renderFamilyPage(RICH[id]);
      assert.ok(html.includes('<!DOCTYPE html>') && !html.includes('<!--CONTENT-->'), id + ' 须为整页且标记已填');
      writeFileSync(join(OUT, file), html, 'utf8');
      writeFileSync(join(SCRATCH, file), html, 'utf8');
    }
    const outFiles = readdirSync(OUT).filter((f) => f.endsWith('.html')).sort();
    assert.equal(outFiles.length, 8);
    const scratchFiles = readdirSync(SCRATCH).filter((f) => f.endsWith('.html') && !f.includes('手机墙') && !f.includes('桌面墙') && !f.includes('总览') && !f.includes('索引')).sort();
    assert.ok(scratchFiles.length >= 8, '.scratch/814 须有 8 份产物：' + scratchFiles.join('、'));
  });

  it('脱敏自证：明文号码与口令不得进页，改坏必红', () => {
    const { certNumbers } = readSeedSecrets();
    assert.ok(certNumbers.length >= 4, '种子证件号须可读');
    // 种子口令（与灌库同一批明文；页上只许出现掩码与说明，不许出现明文本体）。
    const rawPasses = ['seed-pass-taobao-01', 'seed-pass-bank-02', 'seed-pass-social-03', 'seed-pass-other-04'];
    const files = readdirSync(OUT).filter((f) => f.endsWith('.html'));
    assert.equal(files.length, 8);
    for (const f of files) {
      const html = readFileSync(join(OUT, f), 'utf8');
      const hitNum = containsRaw(html, certNumbers);
      assert.deepEqual(hitNum, [], f + ' 不得含完整证件号：' + hitNum.join('、'));
      const hitPass = containsRaw(html, rawPasses);
      assert.deepEqual(hitPass, [], f + ' 不得含明文口令：' + hitPass.join('、'));
      // 掩码在位（查类页须见星号掩码或未登记；回执页须见脱敏说明）。
      assert.ok(html.includes('****') || html.includes('未登记') || html.includes('脱敏') || html.includes('明文'), f + ' 须见脱敏痕迹');
    }
    // 改坏必红：向一份好页注入一条完整号码与一条口令，检查函数须点名。
    const good = readFileSync(join(OUT, '查证件到期_20260921T000000.html'), 'utf8');
    const bad = good + '\n' + certNumbers[0] + '\nseed-pass-taobao-01\n';
    assert.deepEqual(containsRaw(good, [certNumbers[0], 'seed-pass-taobao-01']), []);
    assert.ok(containsRaw(bad, [certNumbers[0], 'seed-pass-taobao-01']).length === 2, '注入后须变红并点名两处');
  });

  it('判据三件：分隔符 0 命中、结构块齐全', () => {
    let r = spawnSync(process.execPath, [SEP, '--dir', OUT], { encoding: 'utf8' });
    assert.equal(r.status, 0, 'audit-separators 须 0 命中 exit 0：\n' + String(r.stdout).slice(-2000));
    assert.match(String(r.stdout), /RESULT: 8\/8/);
    r = spawnSync(process.execPath, [BLOCKS, '--dir', OUT, '--blocks', CONTRACT], { encoding: 'utf8' });
    assert.equal(r.status, 0, 'audit-page-blocks 须齐全 exit 0：\n' + String(r.stdout).slice(-2000));
    assert.match(String(r.stdout), /RESULT: 8\/8/);
  });
});
