#!/usr/bin/env node
// 居家管家 · 场景页脚手架实体（票 #805）。
//
// 薄 CLI（`scripts/new-scene-page.mjs`）只做参数与退出码；本件装真正的活：
// 读契约附录（唯一事实源）→ 产出同形骨架（一族两文件）→ 重写必需块登记表。
//
// 事实源：`docs/skills/skill-home/scene-pages-contract.appendix.json`
// （46 族／70 场景／必需块／写集；手改本件产出无效，下次生成覆盖）。
// 产出（`--all` 一次全量，域票只填内容、不再造文件）：
//   `templates/<域>/<族>.html`（16 行壳，三标记，与既有 21 模板同形）
//   `src/<域>/pages/<族>.ts`（装配入口＋空态异常态位＋数据形状声明＋必需块原文）
//   `scripts/lib/page-blocks.mjs`（生成物：族→必需块登记，供票 6 结构判据件消费）
//
// 不碰：共用件与派生件（`src/render/**`、`src/cli/**`、`scripts/gen-*`，归票 3）。

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..', '..');
const repoDocs = join(pkgDir, '..', '..', 'docs', 'skills', 'skill-home');
const APPENDIX = join(repoDocs, 'scene-pages-contract.appendix.json');

const VALID_DOMAINS = ['items', 'space', 'outfit', 'stats', 'express', 'receipt', 'family', 'setup'];

function loadAppendix() {
  const j = JSON.parse(readFileSync(APPENDIX, 'utf8'));
  if (!Array.isArray(j.families) || j.families.length === 0) throw new Error('附录 families 为空：' + APPENDIX);
  if (!Array.isArray(j.scenarios) || j.scenarios.length === 0) throw new Error('附录 scenarios 为空：' + APPENDIX);
  return j;
}

// 命令 key→形状：扫各能力 `commands.ts` 声明（读键自带 shape，写键一律 receipt）。
// 与 `src/cli/keys.ts` 派生件同一口径，但这里只读文本、不读 dist（生成时 dist 可能还没建）。
function shapeTable() {
  const table = new Map();
  for (const cap of VALID_DOMAINS) {
    let text = '';
    try {
      text = readFileSync(join(pkgDir, 'src', cap, 'commands.ts'), 'utf8');
    } catch {
      continue; // setup 空声明显式跳过：无独占键
    }
    for (const m of text.matchAll(/\{[^}]*?key: '([^']+)'[^}]*?\}/g)) {
      const body = m[0];
      const kind = (body.match(/kind: '([^']+)'/) || [])[1] || 'write';
      const shape = (body.match(/shape: '([^']+)'/) || [])[1] || (kind === 'read' ? 'list' : 'receipt');
      if (!table.has(m[1])) table.set(m[1], shape);
    }
  }
  return table;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// —— 骨架①：模板壳（与既有 21 模板同形：三标记各恰 1 次）——
function templateText(rep) {
  return '<!DOCTYPE html>\n'
    + '<html lang="zh-CN">\n'
    + '<head>\n'
    + '<meta charset="utf-8">\n'
    + '<title>' + esc(rep.commandCn) + '</title>\n'
    + '<!--SHARED-CSS-->\n'
    + '</head>\n'
    + '<body>\n'
    + '<div class="page">\n'
    + '<h1>' + esc(rep.commandCn) + '</h1>\n'
    + '<p class="cmd">home-cmd-read ' + esc(rep.key) + '</p>\n'
    + '<!--CONTENT-->\n'
    + '</div>\n'
    + '<!--SHARED-HELPERS-->\n'
    + '</body>\n'
    + '</html>\n';
}

// —— 骨架②：页装配模块（对外恰 4 个：FAMILY／PAGE_META／REQUIRED_BLOCKS／renderFamilyPage）——
function pageText(fam, rep, shape) {
  const blocks = JSON.stringify(fam.requiredBlocks, null, 2);
  const scenarios = JSON.stringify(fam.scenarios);
  const preset = JSON.stringify(rep.preset || {});
  const L = [];
  L.push('// ' + fam.domain + '能力·' + fam.family + '页装配（#805 脚手架生成，域票填内容）。');
  L.push('//');
  L.push('// 一族一个装配件：模板 `templates/' + fam.domain + '/' + fam.family + '.html` 的装配入口。');
  L.push('// 必需块原文＝契约附录（事实源），登记表 `scripts/lib/page-blocks.mjs` 由同一附录派生；');
  L.push('// 三方（本件／登记表／附录）由 `test/scaffold.test.mjs` 逐族对账，走散即红。');
  L.push('// 空态与异常态位：`renderFamilyPage` 按 REQUIRED_BLOCKS.empty 原样输出槽位，域票把真空态填进来。');
  L.push('// 数据形状声明：PAGE_META（主命令／形状／场景预设示例／服务场景清单）。');
  L.push("import { readFileSync } from 'node:fs';");
  L.push("import type { Envelope } from 'base-link-core';");
  L.push("import { fillTemplate, renderEnvelopeHtml, escapeHtml } from '../../render/index.js';");
  L.push('');
  L.push("export const FAMILY = '" + fam.family + "' as const;");
  L.push('');
  L.push('export const PAGE_META = {');
  L.push("  domain: '" + fam.domain + "',");
  L.push('  family: FAMILY,');
  L.push("  key: '" + rep.key + "',");
  L.push("  shape: '" + shape + "',");
  L.push('  preset: ' + preset + ' as Record<string, unknown>,');
  L.push('  scenarios: ' + scenarios + ' as readonly string[],');
  L.push('} as const;');
  L.push('');
  L.push('export const REQUIRED_BLOCKS = ' + blocks + ' as {');
  L.push('  readonly fields: readonly string[];');
  L.push('  readonly operations: readonly string[];');
  L.push('  readonly empty: readonly string[];');
  L.push('  readonly status: readonly string[];');
  L.push('};');
  L.push('');
  L.push("function sectionOf(group: 'fields' | 'operations' | 'empty' | 'status', title: string): string {");
  L.push("  const items = REQUIRED_BLOCKS[group].map((b) => '<li data-need=\"' + escapeHtml(b) + '\">' + escapeHtml(b) + '</li>').join('');");
  L.push("  return '<section data-block=\"' + group + '\"><h2>' + title + '</h2><ul>' + items + '</ul></section>';");
  L.push('}');
  L.push('');
  L.push('// 装配入口：真 envelope（真命令链产出）＋本族模板 → 同形整页。');
  L.push('// fail-closed：模板缺失／标记异常（fillTemplate 内抛）不返空页。');
  L.push('export function renderFamilyPage(env: Envelope): string {');
  L.push("  const template = readFileSync(new URL('../../../templates/" + fam.domain + '/' + fam.family + ".html', import.meta.url), 'utf8');");
  L.push("  const head = '<div class=\"fam-head\"><span class=\"fam-name\">' + FAMILY + '</span>'");
  L.push("    + '<span class=\"fam-key\">' + escapeHtml(PAGE_META.key) + '</span></div>';");
  L.push('  const content = head');
  L.push("    + '<div class=\"fam-content\">' + renderEnvelopeHtml(env) + '</div>'");
  L.push("    + sectionOf('fields', '字段')");
  L.push("    + sectionOf('operations', '操作')");
  L.push("    + sectionOf('empty', '空态与异常')");
  L.push("    + sectionOf('status', '状态词');");
  L.push('  return fillTemplate(template, content);');
  L.push('}');
  L.push('');
  return L.join('\n');
}

// —— 登记表（生成物）：族→必需块，供票 6 结构判据件消费 ——
function registryText(appendix) {
  const entries = appendix.families.map((f) => '  \'' + f.family + '\': { domain: \''
    + f.domain + '\', scenarios: ' + JSON.stringify(f.scenarios)
    + ', requiredBlocks: ' + JSON.stringify(f.requiredBlocks) + ' },');
  const L = [];
  L.push('// 必需块登记表（#805 脚手架生成物，事实源＝契约附录）。');
  L.push('//');
  L.push('// 消费方：票 6 结构判据件（`scripts/audit-page-blocks.mjs` 的合同 `pages[]` 由本表转录，只加条目）。');
  L.push('// 手改无效：下次跑 `new-scene-page.mjs` 即被附录覆盖；三方对账见 `test/scaffold.test.mjs`。');
  L.push('export const PAGE_BLOCKS_VERSION = 1;');
  L.push('');
  L.push('/** 一族的必需块登记（domain／服务场景／四组必需块）。');
  L.push(' * @typedef {Object} FamilyBlocks');
  L.push(' * @property {string} domain');
  L.push(' * @property {string[]} scenarios');
  L.push(' * @property {{fields: string[], operations: string[], empty: string[], status: string[]}} requiredBlocks');
  L.push(' */');
  L.push('');
  L.push('/** @type {Record<string, FamilyBlocks>} */');
  L.push('export const PAGE_BLOCKS = {');
  for (const e of entries) L.push(e);
  L.push('};');
  L.push('');
  L.push('// fail-closed：未知族不猜，调用方显式处理。');
  L.push('/** @param {string} family @returns {FamilyBlocks} */');
  L.push('export function blocksFor(family) {');
  L.push('  const b = PAGE_BLOCKS[family];');
  L.push("  if (!b) throw new Error('未知页族：' + family);");
  L.push('  return b;');
  L.push('}');
  L.push('');
  L.push('/** @param {string} domain @returns {string[]} */');
  L.push('export function familiesOf(domain) {');
  L.push('  return Object.keys(PAGE_BLOCKS).filter((f) => PAGE_BLOCKS[f].domain === domain).sort();');
  L.push('}');
  L.push('');
  return L.join('\n');
}

function scenarioById(appendix, id) {
  const s = appendix.scenarios.find((x) => x.id === id);
  if (!s) throw new Error('附录缺场景：' + id);
  return s;
}

// 产出一族（幂等：同输入同输出）。返回写盘路径。
export function generateFamily(appendix, shapes, domain, family, write) {
  const fam = appendix.families.find((f) => f.domain === domain && f.family === family);
  if (!fam) throw new Error('附录无此族：' + domain + '/' + family);
  const rep = scenarioById(appendix, fam.scenarios[0]);
  const shape = shapes.get(rep.key) || 'receipt';
  const tFile = join(pkgDir, 'templates', domain, family + '.html');
  const pFile = join(pkgDir, 'src', domain, 'pages', family + '.ts');
  const tText = templateText(rep);
  const pText = pageText(fam, rep, shape);
  if (write) {
    mkdirSync(dirname(tFile), { recursive: true });
    mkdirSync(dirname(pFile), { recursive: true });
    writeFileSync(tFile, tText, 'utf8');
    writeFileSync(pFile, pText, 'utf8');
  }
  return { tFile, pFile, tText, pText };
}

export function generateRegistry(appendix, write) {
  const file = join(pkgDir, 'scripts', 'lib', 'page-blocks.mjs');
  const text = registryText(appendix);
  if (write) writeFileSync(file, text, 'utf8');
  return { file, text };
}

export function allFamilies(appendix) {
  return appendix.families.map((f) => [f.domain, f.family]);
}

export { loadAppendix, shapeTable, VALID_DOMAINS };
