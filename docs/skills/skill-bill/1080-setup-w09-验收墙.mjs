#!/usr/bin/env node
/** #1080 · 「真跑产物 vs 冻结原型」左右对照墙生成器（手机墙 ＋ 桌面墙）。
 *
 * 用法：node docs/skills/skill-bill/1080-setup-w09-验收墙.mjs
 * 输入：.scratch/1080-setup-w09/shots/<页>-{proto,prod}-{390,1280}.png（由 vision_html_screenshot 出）
 * 输出：.scratch/1080-setup-w09/wall-1080.html（一格＝一页一视口，左原型右产物）
 *
 * 判据纪律（docs/agents/视觉验收墙.md §7）：墙是给人看的，**不承担判据**；
 * 判据只认 vision_pixel_diff 的读数（见 1080-setup-w09-落地证据.md）。
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SHOTS = join(ROOT, '.scratch', '1080-setup-w09', 'shots');
const OUT = join(ROOT, '.scratch', '1080-setup-w09', 'wall-1080.html');

/** 八页的（票内序号，页名，判地原型路径）。 */
const PAGES = [
  ['s01', '初始化', 'docs/skills/skill-bill/proto/setup-help/s01-初始化-v2.4.html'],
  ['s02', '初始化状态', 'docs/skills/skill-bill/proto/setup-help/s02-初始化状态-v2.4.html'],
  ['s03', '一键备份', 'docs/skills/skill-bill/proto/setup-help/s03-备份-一键备份-v2.4.html'],
  ['s04', '查看备份', 'docs/skills/skill-bill/proto/setup-help/s04-备份-查看备份-v2.4.html'],
  ['s05', '恢复备份', 'docs/skills/skill-bill/proto/setup-help/s05-恢复备份-v2.4.html'],
  ['s06', '导入', 'docs/skills/skill-bill/proto/setup-help/s06-导入-v2.4.html'],
  ['h02', '速查表', 'docs/skills/skill-bill/proto/setup-help/h02-速查表-v2.4.html'],
  ['w09', '查分类', 'docs/skills/skill-bill/proto/w09/w09-查分类-v2.2.html'],
];

const norm = (p) => p.split('\\').join('/');
const rel = (p) => norm(p).replace(norm(ROOT) + '/', '');
function cell(file, label, alt) {
  if (!existsSync(file)) return '<figure class="missing"><figcaption>' + label + '（缺图）</figcaption></figure>';
  return '<figure><img src="' + rel(file) + '" alt="' + alt + '"><figcaption>' + label + '</figcaption></figure>';
}

const rows = [];
for (const [key, name, proto] of PAGES) {
  for (const vp of ['390', '1280']) {
    rows.push('<section><h2>' + name + ' · ' + vp + ' 宽</h2><div class="pair">'
      + cell(join(SHOTS, key + '-proto-' + vp + '.png'), '冻结原型', name + ' 原型')
      + cell(join(SHOTS, key + '-prod-' + vp + '.png'), '真跑产物', name + ' 产物')
      + '</div></section>');
  }
}

const CSS = [
  'body{margin:0;padding:24px;background:#efe9dd;color:#2b2620;font:14px/1.6 "PingFang SC","Microsoft YaHei",system-ui,sans-serif}',
  'h1{font-size:20px;margin:0 0 6px}',
  'p.note{margin:0 0 20px;color:#665f57}',
  'section{background:#fffdf7;border:1px solid #e9dfcd;border-radius:12px;padding:14px;margin:0 0 18px}',
  'h2{font-size:15px;margin:0 0 10px}',
  '.pair{display:flex;gap:14px;align-items:flex-start;overflow-x:auto}',
  'figure{margin:0;flex:0 0 auto}',
  'img{display:block;border:1px solid #e9dfcd;border-radius:8px;background:#fff}',
  'figcaption{font-size:12px;color:#736755;margin-top:6px}',
  '.missing{padding:40px;border:1px dashed #ddd0b6;border-radius:8px;color:#8c2a1f}',
].join('\n');

const head = '<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="utf-8">'
  + '<title>#1080 八页对照墙（真跑产物 vs 冻结原型）</title><style>' + CSS + '</style></head><body>';
const intro = '<h1>#1080 八页对照墙：真跑产物 vs 冻结原型</h1>'
  + '<p class="note">左＝冻结原型（判据），右＝真跑产物。这面墙只供人眼扫一遍，<b>不承担判据</b>；'
  + '判据读数见 docs/skills/skill-bill/1080-setup-w09-落地证据.md。</p>';
writeFileSync(OUT, head + intro + rows.join('\n') + '</body></html>', 'utf8');
console.log('WALL ' + OUT);
