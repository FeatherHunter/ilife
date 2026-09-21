// #872 · 交付链接合：数据与过程命令缺省落**族页**（页族装配接进 cmd_read）。
//
// 三组断言：
//  ① 契约对账（扫盘）：46 个族名跨域唯一；契约附录 70 条场景的 `(命令，预设)` 都能解析到族名，
//     且恰有一个候选域目录装得上那一族，附录的 `domain` 与落盘目录逐条一致；
//  ② 降级分支可达：表外命令无候选域、未知族返回 `null`、装配抛错也返回 `null`（调用方据此降级）；
//  ③ 真链：隔离家目录跑若干键，`delivery.path` 指的那份**是族页**（含 `data-block=`）、
//     逐字节等于 `renderFamilyPage(env)`、大小 ＝ 回执 `delivery.bytes`；`--html` 显式出口同内容。
//
// 前提：`node node_modules/typescript/bin/tsc -b packages/skill-home`。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const repoRoot = join(pkgDir, '..', '..');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');
const distDir = join(pkgDir, 'dist');
const appendix = JSON.parse(readFileSync(
  join(repoRoot, 'docs', 'skills', 'skill-home', 'scene-pages-contract.appendix.json'), 'utf8'));
const render = await import(pathToFileURL(join(distDir, 'render', 'index.js')).href);

/** 扫盘：族名 → 域目录（顺带证明「族名跨域唯一」）。 */
function familyDirsOnDisk() {
  const seen = new Map();
  for (const d of readdirSync(distDir, { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => x.name)) {
    const pages = join(distDir, d, 'pages');
    if (!existsSync(pages)) continue;
    for (const f of readdirSync(pages).filter((x) => x.endsWith('.js'))) {
      const fam = f.replace(/\.js$/, '');
      assert.ok(!seen.has(fam), '族名跨域重名：' + fam + '（' + seen.get(fam) + ' 与 ' + d + '）');
      seen.set(fam, d);
    }
  }
  return seen;
}

describe('#872 页族装配：与契约附录对账（扫盘，不读附录当事实源）', () => {
  it('46 族跨域唯一；70 条场景逐条解析到族、恰有一个候选域装得上、域与附录一致', () => {
    const onDisk = familyDirsOnDisk();
    assert.equal(onDisk.size, 46, '在役页族应 46 个，扫到 ' + onDisk.size);
    assert.equal(appendix.scenarios.length, 70, '附录场景应 70 条');
    for (const s of appendix.scenarios) {
      const fam = render.resolvePageFamily(s.key, s.preset ?? {});
      assert.equal(fam, s.family, s.id + ' 两层解析与附录走散');
      const hit = render.domainsFor(s.key).filter((d) => render.familyModulePath(d, fam) !== null);
      assert.equal(hit.length, 1, s.id + ' ' + fam + ' 应恰有一个候选域装得上，实得 ' + hit.length + '：' + hit.join('、'));
      assert.equal(onDisk.get(fam), s.domain, s.id + ' 附录域 ' + s.domain + ' 与落盘域 ' + onDisk.get(fam) + ' 不一致');
    }
  });

  it('降级分支可达：表外命令无候选、未知族与装配抛错都返回 null', async () => {
    assert.deepEqual([...render.domainsFor('home.nope.x')], [], '表外命令不该有候选域');
    assert.equal(await render.renderFamilyHtml('home.nope.x', {}, {}), null, '表外命令应返回 null');
    assert.equal(await render.renderFamilyHtml('home.item.search', {}, {}), null, '非信封 env 应装配抛错并返回 null');
  });
});

describe('#872 真链：缺省落盘与显式出口都落族页', () => {
  let HOME = '';
  const run = (args) => spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', env: homeEnvOf(HOME) });
  const envOf = (r, label) => {
    assert.equal(r.status, 0, label + ' exit=' + r.status + ' ERR=' + String(r.stderr ?? '').slice(0, 300));
    return JSON.parse(String(r.stdout).trim().split('\n').pop());
  };

  before(() => {
    assert.ok(existsSync(bin), 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
    HOME = mkdtempSync(join(tmpdir(), 'famdel-'));
    envOf(run(['home.stats.overview', '--params', '{}']), '初始化');
  });

  const CASES = [
    ['home.item.search', {}, 'search_list'],
    ['home.stats.overview', { kind: 'summary' }, 'overview'],
    ['home.care.query', { kind: 'borrow' }, 'family_borrow'],
    ['home.care.query', { kind: 'lint' }, 'health_report'],
    ['home.shopping.query', { kind: 'express' }, 'express'],
    ['home.ticket.query', { kind: 'cert' }, 'certificates'],
    ['home.location.query', { mode: 'space' }, 'space_view'],
    ['home.outfit.pick', {}, 'outfit_picker'],
  ];

  for (const [key, preset, family] of CASES) {
    it(key + ' ' + JSON.stringify(preset) + ' → ' + family + '（落盘内容即族页）', async () => {
      const env = envOf(run([key, '--params', JSON.stringify(preset)]), key);
      const p = env.delivery?.path;
      assert.ok(typeof p === 'string' && existsSync(p), key + ' 回执路径不在盘上：' + p);
      const html = readFileSync(p, 'utf8');
      assert.ok(html.includes('data-block='), key + ' 落的不是族页（无 data-block=）');
      assert.ok(!html.includes('<!--CONTENT-->') && !html.includes('<!--SHARED-CSS-->'), key + ' 壳标记未填充');
      assert.equal(statSync(p).size, env.delivery.bytes, key + ' 盘上字节与回执 delivery.bytes 不一致');
      const domain = render.domainsFor(key).find((d) => render.familyModulePath(d, family) !== null);
      const mod = await import(pathToFileURL(join(distDir, domain, 'pages', family + '.js')).href);
      // 落盘那一份是「附 delivery 之前」的信封渲染出来的（delivery 是落盘之后才追加的顶层字段），
      // 故比对时把 delivery 去掉再重渲染，其余逐字节必须相同。
      const { delivery: _drop, ...bare } = env;
      // 交付链在装配结果上还回填了「场景身份」（`<title>`／`<h1>` 用场景的命令中文名，见 #817 收口）：
      // 页族模板写的是族名（add_form 一族服务 录物品／拍物品／批量录入／补录），故比对前先施加同一层。
      const sceneName = render.sceneNameOf(key, preset);
      assert.ok(sceneName !== null, key + ' 取不到场景名');
      assert.equal(render.withSceneIdentity(mod.renderFamilyPage(bare), sceneName), html,
        key + ' 落盘内容应逐字节等于「族页装配 ＋ 场景身份回填」');
    });
  }

  it('--html 显式出口：单份、单回执、内容同为族页', () => {
    const out = join(HOME, 'explicit-item-search.html');
    const env = envOf(run(['home.item.search', '--params', '{}', '--html', out]), '显式出口');
    assert.equal(env.delivery.path, out, '显式优先：回执应指逐字路径');
    assert.equal(statSync(out).size, env.delivery.bytes, '显式出口字节与回执不一致');
    assert.ok(readFileSync(out, 'utf8').includes('data-block='), '显式出口也应是族页');
  });
});
