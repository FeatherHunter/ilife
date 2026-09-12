#!/usr/bin/env node
/**
 * 把某张地图的**现有正文**取下来存成文件（改正文前的标准动作：取下来 → 改文件 → 整份推回）。
 *
 * 为什么不用 `>`／`Set-Content`：PowerShell 会带上 BOM，而 issue 正文禁止 BOM。
 * 为什么不用 `node -e` 内联：PowerShell 会吃掉内联脚本里的双引号。
 *
 * 用法：node docs/skills/skill-memo-ilife/fetch-map-body.mjs 220
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = 'FeatherHunter/ilife';
const n = Number(process.argv[2]);
if (!Number.isInteger(n) || n <= 0) {
  console.error('用法：node fetch-map-body.mjs <地图号>');
  process.exit(2);
}

const here = dirname(fileURLToPath(import.meta.url));
const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const body = gh('api', `repos/${REPO}/issues/${n}`, '--jq', '.body');
if (!body.includes('## Destination')) {
  console.error(`拒绝：取下来的正文里没有 \`## Destination\` 一节（取到 ${Buffer.byteLength(body)} 字节）——别覆盖已存的文件。`);
  process.exit(1);
}

const out = join(here, `map-${n}-body.md`);
writeFileSync(out, body);
console.log(`已存：${out.replace(/\\/g, '/')}（${Buffer.byteLength(body)} 字节）`);
