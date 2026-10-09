#!/usr/bin/env node
/**
 * #1202 · 两处硬缝的**语言列读数基座**（固定 now ＋ 逐件 sha256）。
 *
 * 为什么要有它：本票的不变量是「**未声明的差异为零**」——不启用多语言时，该范围产物
 * 必须与改造前**逐字节相同**；而 base 层的判据全部是「逐字节／哈希」类（皮肤矩阵、
 * 加法式、确定性）。要让中英两份产物可比，**时钟与随机性必须先钉死**：
 *   · 固定 now：new Date(2026, 0, 2, 3, 4, 5)（本地时区），**显式传进夹具**，
 *     不猴补全局 Date——先例＝tooling/calorie-html-snapshot.mjs（#1234 中文基线）；
 *   · 随机性：本夹具零随机来源（不取 pid／时间戳／哈希种子）。
 *
 * 四段链路各一段产物（票面：命令入口 → 回执 → 页面 → 帮助）：
 *   entry    命令入口：唯一出口的 argv 形 ＋ receipt 形信封（base-link-core 造）
 *   receipt  回执：状态徽章（契约件 renderStatusBadge）＋ 回执那句话
 *   page     页面：progress-list 整页（件自己的样式段 ＋ 皮肤）
 *   help     帮助：HELP 壳整页（renderHelpShellHtml）
 *
 * 用法：
 *   node packages/base-render/scripts/i18n-pilot-1202.mjs --baseline   # 记「改造前」中文列（写快照）
 *   node packages/base-render/scripts/i18n-pilot-1202.mjs --check      # 中文列与快照逐字节比（差异即 exit 1）
 *   node packages/base-render/scripts/i18n-pilot-1202.mjs --write      # 产出 zh／en 两份产物（落盘并打印绝对路径）
 * 选项：
 *   --out <dir>   产物落点（缺省 packages/base-render/.scratch/i18n-pilot-1202）
 *   --lang <l>    只产这一门语言（缺省 zh,en）
 *
 * 依赖：pnpm -C packages/base-render build 已跑（本件读 dist，不读 src）；未构建显式失败。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const SNAP_PATH = join(PKG, 'test', 'fixtures', 'i18n-pilot-1202.snapshot.json');

/** 固定 now（本夹具唯一的时钟来源）：2026-01-02 03:04:05 本地时区。 */
export const FIXED_NOW = new Date(2026, 0, 2, 3, 4, 5);
/** 固定 now 的人读形（进产物文本，与 tooling/calorie-html-snapshot.mjs 同口径）。 */
export const FIXED_NOW_TEXT = '2026-01-02 03:04:05';
/** 夹具语言列（zh 是基准语言；en 是终端语言）。 */
export const LANGS = ['zh', 'en'];

export function normalize(text) {
  return String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}
export function sha256(text) {
  return createHash('sha256').update(normalize(text), 'utf8').digest('hex').slice(0, 32);
}
export function byteLen(text) {
  return Buffer.byteLength(normalize(text), 'utf8');
}

async function loadDist(rel) {
  const p = join(PKG, 'dist', rel);
  if (!existsSync(p)) throw new Error('dist 缺失：' + p + ' —— 先跑 pnpm -C packages/base-render build');
  return import(pathToFileURL(p).href);
}

/** 两处硬缝的固定入参（数字／日期全钉死；元＝夹具，不是业务数据）。 */
export function fixtureInputs() {
  return {
    progressList: {
      heading: '今天四个目标',
      rows: [
        { label: '热量', current: 1189, goal: 1800, unit: '卡' },
        { label: '饮水', current: 1200, goal: 2000, unit: '毫升' },
        { label: '体重', current: 68.4, goal: 66, unit: '千克' },
        { label: '运动', current: null, goal: 45, unit: '分钟' },
      ],
      note: '目标随档案一起改；这里的数按当天记录算。',
    },
    badgeKinds: ['ok', 'warn', 'danger', 'empty'],
    receiptMessage: '已记录',
    helpSubtitle: '更新于 ' + FIXED_NOW_TEXT,
  };
}

/** 逐字落一页（夹具自己的壳；整页装配不是本票要证的东西）。 */
function pageShell(lang, title, style, body) {
  return '<!doctype html>\n<html lang="' + lang + '">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>' + title + '</title>\n<style>\n' + style + '\n</style>\n</head>\n<body>\n'
    + '<main class="ilife-page-ui">\n' + body + '\n</main>\n</body>\n</html>\n';
}

/**
 * 采四段产物（纯读＋纯函数；不写任何文件）。
 * 语言未接线时（缺 language 维度）en 段会抛——由调用方决定「跳过」还是「红」。
 */
export async function collect(lang, at = FIXED_NOW) {
  const blocks = await loadDist('blocks.js');
  const controls = await loadDist('controls.js');
  const helpShell = await loadDist('helpShell.js');
  const progress = await loadDist(join('components', 'progress-list', 'index.js'));
  const core = await import('base-link-core');
  const f = fixtureInputs();
  const zh = lang === 'zh';
  const withLang = (obj) => (zh ? obj : { ...obj, language: lang });

  const out = new Map();
  const put = (id, text, src) => out.set(lang + '/' + id, { text: normalize(text), src });

  const argv = ['calorie-cmd-read', 'calorie.help.center', '--params', '{}'];
  const envelope = core.createEnvelope({
    skill: 'calorie', shape: 'receipt', key: 'calorie.help.center',
    data: { ok: true, message: f.receiptMessage, at: at.toISOString() },
  });
  put('entry', JSON.stringify({ argv, envelope }, null, 2) + '\n', 'packages/base-render/scripts/i18n-pilot-1202.mjs');

  const badges = f.badgeKinds.map((kind) => controls.renderStatusBadge(withLang({ status: kind }))).join('');
  put('receipt', pageShell(lang, '回执', blocks.skinCss() + '\n' + blocks.statusRowCss(), badges),
    'packages/base-render/src/spec/controls.ts');

  const listHtml = progress.renderProgressList(withLang(f.progressList));
  put('page', pageShell(lang, '页面', blocks.skinCss() + '\n' + progress.progressListCss(), listHtml),
    'packages/base-render/src/components/progress-list');

  const helpHtml = helpShell.renderHelpShellHtml({
    skill_name: '卡路里',
    title: '唤醒词速查台',
    subtitle: f.helpSubtitle,
    contact: { items: [{ label: '作者', value: 'ilife' }] },
    groups: [{
      id: 'g', icon: 'x', label: 'L',
      subgroups: [{ id: 's', label: 'S', scenes: [{ id: 'a', title: 'T', wake_word: 'w', status: '', prompt_template: 'p', types: ['结果'] }] }],
    }],
  });
  put('help', helpHtml, 'packages/base-render/src/helpShell.ts');
  return out;
}

/** 采全语言列；en 段在未接线时抛错由调用方处置（记 skipped）。 */
export async function collectAll(langs = LANGS) {
  const artifacts = new Map();
  const skipped = [];
  for (const lang of langs) {
    try {
      for (const [id, a] of await collect(lang)) artifacts.set(id, a);
    } catch (e) {
      if (lang === 'zh') throw e;
      skipped.push({ lang, reason: (e && e.message) ? e.message.split('\n')[0] : String(e) });
    }
  }
  return { artifacts: new Map([...artifacts.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))), skipped };
}

function table(artifacts) {
  return [...artifacts.entries()].map(([id, a]) => ({
    id, src: a.src, bytes: byteLen(a.text), sha256: sha256(a.text),
  }));
}

const isEntry = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isEntry) {
  const argv = process.argv.slice(2);
  const valOf = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
  const outDir = resolve(valOf('--out') ?? join(PKG, '.scratch', 'i18n-pilot-1202'));
  const only = valOf('--lang');
  const langs = only ? [only] : LANGS;
  try {
    const { artifacts, skipped } = await collectAll(langs);
    const rows = table(artifacts);
    for (const r of rows) console.log('ART ' + r.id.padEnd(14) + ' ' + r.sha256 + ' ' + String(r.bytes).padStart(6) + 'B  ← ' + r.src);
    for (const s of skipped) console.log('SKIP ' + s.lang + '（' + s.reason + '）');

    if (argv.includes('--baseline')) {
      // 重录**只动被点名的语言列**（默认 zh），别的语言列原样保留——形状与 --check／测试读的同一处：
      // snap.columns[<lang>].artifacts。评审 S7：原实现写顶层 artifacts，重录一次就把英文列整段抹掉，
      // 随后 --check 与测试全红（写出的快照自己读不回）。
      const previous = existsSync(SNAP_PATH) ? JSON.parse(readFileSync(SNAP_PATH, 'utf8')) : undefined;
      const columns = { ...(previous?.columns ?? {}) };
      for (const lang of langs) {
        const own = rows.filter((r) => r.id.startsWith(lang + '/'));
        columns[lang] = {
          artifacts: Object.fromEntries(own.map((r) => [r.id, { src: r.src, bytes: r.bytes, sha256: r.sha256 }])),
        };
      }
      const snap = {
        generatedBy: 'packages/base-render/scripts/i18n-pilot-1202.mjs',
        ticket: '#1202',
        purpose: '两处硬缝的读数基座：固定 now 下四段链路产物逐件 sha256（按语言列分开记）',
        hashAlgo: 'sha256(归一化文本) 前 32 hex；归一化＝去 BOM ＋ CRLF→LF',
        fixedNow: FIXED_NOW_TEXT,
        artifactCount: Object.values(columns).reduce((n, c) => n + Object.keys(c.artifacts).length, 0),
        columns,
      };
      mkdirSync(dirname(SNAP_PATH), { recursive: true });
      writeFileSync(SNAP_PATH, JSON.stringify(snap, null, 2) + '\n', 'utf8');
      console.log('WROTE ' + SNAP_PATH + ' artifacts=' + rows.length);
      process.exit(0);
    }

    if (argv.includes('--check')) {
      const snap = JSON.parse(readFileSync(SNAP_PATH, 'utf8'));
      let bad = 0;
      for (const r of rows) {
        const base = snap.columns?.[r.id.split('/')[0]]?.artifacts?.[r.id];
        if (!base) { console.error('RED 快照缺这一件：' + r.id); bad++; continue; }
        if (base.sha256 !== r.sha256 || base.bytes !== r.bytes) {
          console.error('RED 产物变了：' + r.id + ' 基线 ' + base.sha256 + '/' + base.bytes + ' 实际 ' + r.sha256 + '/' + r.bytes);
          bad++;
        } else console.log('OK ' + r.id + ' ' + r.sha256 + '/' + r.bytes);
      }
      if (skipped.length) console.error('RED 英文列采不到：' + JSON.stringify(skipped));
      console.log('RESULT: ' + (rows.length - bad) + '/' + rows.length);
      if (bad || skipped.length) { console.error('i18n-pilot: FAIL'); process.exit(1); }
      console.log('i18n-pilot: PASS（中文列逐字节不变）');
      process.exit(0);
    }

    if (argv.includes('--write')) {
      mkdirSync(outDir, { recursive: true });
      for (const [id, a] of artifacts) {
        const ext = id.endsWith('/entry') ? '.json' : '.html';
        const file = join(outDir, id.replace('/', '-') + ext);
        writeFileSync(file, normalize(a.text), 'utf8');
        console.log('WROTE ' + file);
      }
      process.exit(0);
    }

    console.error('用法：--baseline | --check | --write [--out <dir>] [--lang zh|en]');
    process.exit(2);
  } catch (e) {
    console.error('FAIL: ' + (e && e.stack ? e.stack : e));
    process.exit(1);
  }
}
