#!/usr/bin/env node
/**
 * 英文唤醒词派生器（票 #1310「英文唤醒词首轮 30 条与按语言单载路由（六家）」）。
 *
 * 一家一份英文来源 `src/<...>/wake-en.json`，每条只写「中文词 → 英文说法」；该英文词的
 * 键／HELP 场景／CLI 形态／槽位／预设一律从中文那条路由记录照抄——英文面因此不可能与
 * 中文面漂移（加一条英文词不引入第二份路由事实）。唯一的口子是无中文对应词的 HELP 入口：
 * 直写 `key`，且必须真在该包的命令登记表里。
 *
 * 产出各包 routes.en.generated.ts（WAKE_EN_ROUTES，元素形状见生成文件头的接口）。
 * 运行期只在渲染语言为 en 时读它（见各包路由模块的 sortedFor／routesFor）。
 *
 * 用法：
 *   node tooling/wake-en.mjs           # 写盘（根 pnpm gen 的一员）
 *   node tooling/wake-en.mjs --check   # 只比对，不一致 exit 1（根 pnpm gen:check 的一员）
 *
 * 前置：六家 dist/ 已就绪（中文路由表从编译产物读，与各包 scripts/gen-cli.mjs 同一前提）。
 * 校验 fail-closed、中文报文点名语言 <包>/en：英文说法必须小写且全表唯一、上限 30 条、
 * 中文词必须恰好在中文表里命中一条、直写 key 必须在命令登记表里、英文词不得与中文词同形。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
/** `--only <包 id>`：包内入口（packages/<包>/scripts/gen-wake-en.mjs）只跑自己那一家；
 *  六家共用这一份实现，包内入口只负责声明本包的输出路径（告警线台账据此识别生成物）。 */
const ONLY_AT = process.argv.indexOf('--only');
const ONLY = ONLY_AT >= 0 ? process.argv[ONLY_AT + 1] : null;
if (ONLY_AT >= 0 && !ONLY) {
  console.error('用法：node tooling/wake-en.mjs [--check] [--only <包 id>]');
  process.exit(2);
}
/** 票面「首轮约 30 条」的硬上限：英文面不许长成第二份全量表。 */
const MAX_ENTRIES = 30;

const PACKAGES = [
  {
    id: 'skill-calorie',
    zhModule: 'dist/triggers/routes.generated.js',
    zhExport: 'ALL_ROUTES',
    phraseField: 'wakeWord',
    source: 'src/triggers/wake-en.json',
    out: 'src/triggers/routes.en.generated.ts',
    execOnly: true,
    registry: null,
  },
  {
    id: 'skill-bill',
    zhModule: 'dist/triggers/wakeTable.js',
    zhExport: 'WAKE_TABLE',
    phraseField: 'phrase',
    source: 'src/triggers/wake-en.json',
    out: 'src/triggers/routes.en.generated.ts',
    execOnly: false,
    registry: { module: 'dist/cli/registry.js', export: 'REGISTRY_KEYS' },
  },
  {
    id: 'skill-chef',
    zhModule: 'dist/policy/wakewords.js',
    zhExport: 'WAKE_TABLE',
    phraseField: 'phrase',
    source: 'src/policy/wake-en.json',
    out: 'src/policy/routes.en.generated.ts',
    execOnly: false,
    registry: null,
  },
  {
    id: 'skill-home',
    zhModule: 'dist/policy/routes.generated.js',
    zhExport: 'ROUTES_GENERATED',
    phraseField: 'phrase',
    source: 'src/policy/wake-en.json',
    out: 'src/policy/routes.en.generated.ts',
    execOnly: false,
    registry: null,
  },
  {
    id: 'skill-memo-ilife',
    zhModule: 'dist/triggers/routes.generated.js',
    zhExport: 'WAKE_ROUTES',
    phraseField: 'wakeWord',
    source: 'src/triggers/wake-en.json',
    out: 'src/triggers/routes.en.generated.ts',
    execOnly: false,
    registry: { module: 'dist/render/envelope.js', export: 'MEMO_KEY_SHAPES' },
  },
  {
    id: 'skill-schedule',
    zhModule: 'dist/triggers/routes.generated.js',
    zhExport: 'SCHEDULE_ROUTES',
    phraseField: 'phrase',
    source: 'src/triggers/wake-en.json',
    out: 'src/triggers/routes.en.generated.ts',
    execOnly: false,
    registry: null,
  },
];

/** 直写字符串：本仓生成物用单引号。 */
function q(value) {
  return "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
}

function keyOf(name) {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : q(name);
}

/** 取值 → TS 字面量（只认 JSON 值；认不得的当场抛，不产出半成品）。 */
function lit(value) {
  if (typeof value === 'string') return q(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  if (Array.isArray(value)) return '[' + value.map(lit).join(', ') + ']';
  if (typeof value === 'object') {
    const parts = Object.entries(value).map(([k, v]) => keyOf(k) + ': ' + lit(v));
    return parts.length === 0 ? '{}' : '{ ' + parts.join(', ') + ' }';
  }
  throw new Error('不认识的取值类型：' + typeof value);
}

function readSource(pkg) {
  const abs = join(ROOT, 'packages', pkg.id, pkg.source);
  if (!existsSync(abs)) return { entries: [] };
  let raw;
  try {
    raw = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (err) {
    throw new Error('英文来源不是合法 JSON（' + pkg.source + '）：' + err.message);
  }
  const entries = Array.isArray(raw) ? raw : raw.entries;
  if (!Array.isArray(entries)) throw new Error('英文来源缺少 entries 数组（' + pkg.source + '）');
  return { entries };
}

async function zhTableOf(pkg) {
  const abs = join(ROOT, 'packages', pkg.id, pkg.zhModule);
  if (!existsSync(abs)) {
    throw new Error('读不到中文路由表 ' + pkg.zhModule + '（先 pnpm build 再 pnpm gen）');
  }
  const mod = await import(pathToFileURL(abs).href);
  const table = mod[pkg.zhExport];
  if (!Array.isArray(table)) throw new Error('中文路由表 ' + pkg.zhModule + ' 没有导出数组 ' + pkg.zhExport);
  return table;
}

async function keyUniverseOf(pkg) {
  if (pkg.registry === null) return null;
  const abs = join(ROOT, 'packages', pkg.id, pkg.registry.module);
  if (!existsSync(abs)) return null;
  const mod = await import(pathToFileURL(abs).href);
  const keys = mod[pkg.registry.export];
  if (Array.isArray(keys)) return new Set(keys.map(String));
  // 有的包把键表做成 Record<key, shape>（memo 的 MEMO_KEY_SHAPES）；取键名即同一张表。
  if (keys !== null && typeof keys === 'object') return new Set(Object.keys(keys));
  return null;
}

/** 一条英文声明 → 记录（字段照抄中文那条，只把词换掉）。 */
function resolveEntry(pkg, entry, zh, keys, seen) {
  if (entry === null || typeof entry !== 'object') throw new Error('英文来源里有一条不是对象：' + JSON.stringify(entry));
  const en = entry.en;
  if (typeof en !== 'string' || en.trim() === '') throw new Error('英文说法缺 en：' + JSON.stringify(entry));
  if (en !== en.trim()) throw new Error('英文说法首尾有空白：' + q(en));
  if (!/^[a-z0-9][a-z0-9 '_-]*$/.test(en)) throw new Error('英文说法只收小写 ASCII（含空格／撇号／连字符／下划线）：' + q(en));
  if (seen.has(en)) throw new Error('英文说法重了：' + q(en));
  seen.add(en);

  const hasZh = typeof entry.zh === 'string' && entry.zh !== '';
  const hasKey = typeof entry.key === 'string' && entry.key !== '';
  if (hasZh === hasKey) {
    throw new Error('一条英文词要么给 zh（照抄中文那条），要么给 key（无中文对应词的 HELP 入口），二选一：' + JSON.stringify(entry));
  }

  if (hasZh) {
    const hits = zh.filter((r) => r[pkg.phraseField] === entry.zh);
    if (hits.length === 0) throw new Error('中文词不在中文路由表里：' + q(entry.zh));
    if (hits.length > 1) throw new Error('中文词在中文路由表里命中 ' + hits.length + ' 条（不唯一）：' + q(entry.zh));
    const record = hits[0];
    if (record[pkg.phraseField] === en) throw new Error('英文说法与中文词同形：' + q(en));
    if (pkg.execOnly && record.kind !== 'exec') {
      throw new Error('中文那条不是可执行路由（kind=' + String(record.kind) + '）：' + q(entry.zh));
    }
    const out = {};
    for (const [k, v] of Object.entries(record)) {
      if (k === 'order') continue;
      out[k] = k === pkg.phraseField ? en : v;
    }
    return out;
  }

  if (keys === null) throw new Error('本包没有命令登记表可校验直写 key，英文词必须给 zh：' + q(en));
  if (!keys.has(entry.key)) throw new Error('直写 key 不在命令登记表里：' + q(entry.key));
  return { [pkg.phraseField]: en, key: entry.key };
}

function render(pkg, records) {
  const header = [
    '/** 本文件由 tooling/wake-en.mjs 生成，勿手改（pnpm gen 重生成，pnpm gen:check 验真）。',
    ' *',
    ' * 英文唤醒词记录面（票 #1310）：' + records.length + ' 条。唯一来源＝' + pkg.source + '（中文词 → 英文说法）；',
    ' * 每条记录的键／场景／槽位／预设照抄中文那条（生成期已校验：中文词必须恰好在中文表里命中一条），',
    ' * 故英文面与中文面不会漂移。运行期只在渲染语言为 en 时参与匹配（中文／未设语言＝中文表）。',
    ' */',
    '',
    'export interface WakeEnRouteRecord {',
    '  readonly ' + pkg.phraseField + ': string;',
    '  readonly key: string;',
    '  readonly scene?: string;',
    '  readonly cli?: string;',
    '  readonly kind?: string;',
    '  readonly needs?: readonly string[];',
    '  readonly preset?: Readonly<Record<string, unknown>>;',
    '  readonly carries?: readonly string[];',
    '}',
    '',
    'export const WAKE_EN_ROUTES: readonly WakeEnRouteRecord[] = [',
  ];
  const body = records.map((r) => {
    const fields = Object.entries(r).map(([k, v]) => keyOf(k) + ': ' + lit(v));
    return '  { ' + fields.join(', ') + ' },';
  });
  return header.concat(body, ['];', '']).join('\n');
}

let failed = false;

const targets = ONLY === null ? PACKAGES : PACKAGES.filter((p) => p.id === ONLY);
if (targets.length === 0) {
  console.error('wake-en：没有这个包：' + ONLY);
  process.exit(2);
}

for (const pkg of targets) {
  const label = 'wake-en(' + pkg.id.replace(/^skill-/, '') + '/en)';
  try {
    const { entries } = readSource(pkg);
    if (entries.length > MAX_ENTRIES) throw new Error('英文首轮上限 ' + MAX_ENTRIES + ' 条，现有 ' + entries.length + ' 条');
    const zh = await zhTableOf(pkg);
    const keys = await keyUniverseOf(pkg);
    const seen = new Set();
    const records = entries.map((entry) => resolveEntry(pkg, entry, zh, keys, seen));
    const text = render(pkg, records);
    const outAbs = join(ROOT, 'packages', pkg.id, pkg.out);
    if (CHECK) {
      const current = existsSync(outAbs) ? readFileSync(outAbs, 'utf8') : '';
      if (current !== text) {
        console.log('GEN-CHECK FAIL ' + label + '：' + pkg.out + ' 与生成结果不一致（跑 pnpm gen 重生成）');
        failed = true;
      } else {
        console.log('GEN-CHECK ok ' + label + '：' + records.length + ' 条');
      }
    } else {
      writeFileSync(outAbs, text, 'utf8');
      console.log('GEN ok ' + label + '：' + records.length + ' 条 → ' + pkg.out);
    }
  } catch (err) {
    console.log('GEN-CHECK FAIL ' + label + '：' + err.message);
    failed = true;
  }
}

if (failed) process.exit(1);
