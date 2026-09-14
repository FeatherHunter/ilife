#!/usr/bin/env node
// #428 审查探针（只读；不写任何被审件）
//
// 用法：
//   node docs/base/base-render/t428-review-probe.mjs
//
// 做三件事，逐条打印机器读数：
//   ① 核基线夹具记的提交号／字节摘要（sha256 ＋ git blob sha1）与当刻仓库里 dc16ba1^ 的
//      packages/base-render/src/blocks.ts 是否逐项同值；
//   ② 核夹具真值的形态（真产物以 `<section class="` 起头、`</section>` 收尾）；
//   ③ 核夹具记的 baselineCommit 是否与当刻仓库解出的 dc16ba1^ 同值（与判据件同口径）。
//
// 口径与判据件一致：用 execFileSync('git', …) 取**原始字节**（不经 shell、不改行尾），
// sha256 直接对该字节算，故与 fixture 里记的值可直接比对。
//
// 记账：同一份提交字节若改走 PowerShell 管道再落盘（`git show … | Out-File -Encoding utf8NoBOM`），
// 本席示得 sha256=506872c73f8c792475c4ee210e55485bcc697c4b7c0babb69907e4ccbc550aa7，
// 与夹具记的 be1affb1… **不同**（改用 Node 取字节后逐项同值，git blob sha1 两条路都同）。
// ⇒ 复核这类摘要**必须**用与判据件同口径的取字节方式，否则会得到假红。
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const FIXTURE = path.join(REPO_ROOT, 'packages', 'base-render', 'test', 'fixtures', 'page-finish-420-baseline.json');

const git = (args) => execFileSync('git', args, { cwd: REPO_ROOT, maxBuffer: 64 * 1024 * 1024 });
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
/** git blob sha1：对 `blob <长度>\0<字节>` 取 sha1。 */
const gitBlobSha1 = (buf) => createHash('sha1')
  .update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex');

const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const commit = git(['rev-parse', 'dc16ba1^']).toString('utf8').trim();
const bytes = git(['show', 'dc16ba1^:' + fixture.sourcePath]);
const repo = { commit, sha256: sha256(bytes), sha1: gitBlobSha1(bytes), bytes: bytes.length };

const rows = [
  ['baselineCommit', fixture.baselineCommit, repo.commit],
  ['sourceBlobSha256', fixture.sourceBlobSha256, repo.sha256],
  ['sourceBlobSha1', fixture.sourceBlobSha1, repo.sha1],
];

let bad = 0;
for (const [name, recorded, actual] of rows) {
  const same = recorded === actual;
  if (!same) bad += 1;
  console.log(`DIGEST ${name} recorded=${recorded} actual=${actual} same=${same}`);
}
console.log(`DIGEST repo blocks.ts bytes=${repo.bytes}`);

for (const item of fixture.cases) {
  const shaped = item.html.startsWith('<section class="') && item.html.endsWith('</section>');
  if (!shaped) bad += 1;
  console.log(`SHAPE label=${JSON.stringify(item.label)} real-product=${shaped}`);
}
console.log(`CASES count=${fixture.cases.length}`);

// 夹具记的 HTML 与源码 blob 之间没有摘要绑定：值域只由形态断言与别处既有断言约束。
console.log('NOTE 夹具 html 真值与源码 blob 无摘要绑定（见审查报告 §5 D2）');
console.log(`PROBE-VERDICT all-same=${bad === 0} bad=${bad}`);
process.exitCode = bad === 0 ? 0 : 1;
