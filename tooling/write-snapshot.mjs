#!/usr/bin/env node
/** Q92 快照两校验之①：快照只许构建写。写入 resolvedVersion+sha；--check 重算后 diff，不等即 fail。 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'packages/hunter-skills/package.json');
const snapPath = join(root, 'packages/hunter-skills/skill.snapshot.json');
const check = process.argv.includes('--check');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
// sha 锚定 SKILL 分发输入：包版本 + combos 真相源 + present 键表（归一换行，三端同值）
const norm = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const combos = norm(join(root, 'packages/base-combos/combos.yaml'));
const present = norm(join(root, 'packages/base-combos/src/present.ts'));
const sha = createHash('sha256').update(`${pkg.version}\n${combos}\n${present}`).digest('hex').slice(0, 16);
const next = { resolvedVersion: pkg.version, sha, writtenBy: 'tooling/write-snapshot.mjs' };

if (check) {
  const cur = JSON.parse(readFileSync(snapPath, 'utf8'));
  if (cur.resolvedVersion !== next.resolvedVersion || cur.sha !== next.sha) {
    console.error(`FAIL: 快照过期（文件 ${cur.resolvedVersion}@${cur.sha} ≠ 实际 ${next.resolvedVersion}@${next.sha}），请跑 pnpm snapshot 重写`);
    process.exit(1);
  }
  console.log(`OK: 快照 == 实际拉取版（${next.resolvedVersion}@${next.sha}）`);
} else {
  writeFileSync(snapPath, JSON.stringify(next, null, 2) + '\n');
  console.log(`wrote ${snapPath} ${next.resolvedVersion}@${next.sha}`);
}
