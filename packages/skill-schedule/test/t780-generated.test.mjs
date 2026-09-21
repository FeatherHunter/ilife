// #780 Layer1 · 生成物门：三件生成物 ＝ 生成器输出（字节相等）＋ `--check` exit 0。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const GEN = join(PKG, 'scripts', 'gen-cli.mjs');

test('780e · 三件生成物字节 ＝ 生成器渲染', async () => {
  const gen = await import(pathToFileURL(GEN).href);
  const { capabilities, routes } = await gen.loadAll();
  const entries = gen.merge(capabilities);
  assert.equal(entries.length, 8);
  const targets = [
    [join(PKG, 'src', 'cli', 'keys.ts'), gen.renderKeysTs(entries)],
    [join(PKG, 'src', 'cli', 'registry.ts'), gen.renderRegistryTs(capabilities)],
    [join(PKG, 'src', 'triggers', 'routes.generated.ts'), gen.renderRoutesGenerated(routes)],
  ];
  for (const [path, want] of targets) {
    assert.equal(readFileSync(path, 'utf8'), want, path);
  }
});

test('780f · `gen-cli.mjs --check` exit 0 且报三件行', () => {
  const out = execFileSync('node', [GEN, '--check'], { cwd: PKG, encoding: 'utf8' }).replace(/\\/g, '/');
  const oks = out.split('\n').filter((l) => l.startsWith('GEN-CHECK ok'));
  assert.equal(oks.length, 3);
  assert.ok(oks.some((l) => l.includes('src/cli/keys.ts')));
  assert.ok(oks.some((l) => l.includes('src/cli/registry.ts')));
  assert.ok(oks.some((l) => l.includes('src/triggers/routes.generated.ts')));
  assert.ok(out.includes('GEN-CHECK PASS'));
});
