// 三印根因回归门：六家 client 束必须同时含 seals prop 与 sealOverlay 实现。
// 判据咬住产物（dist 真束），不咬源码写法：源码传了 seals 但束里实现陈旧（0.3.34）时，
// 面板照画、印区干净全空——208/208 surface 锁读的是工作区新鲜 dist，盖不住这一层。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKGS = [
  'plugin-bill-ilife', 'plugin-calorie', 'plugin-chef',
  'plugin-home-ilife', 'plugin-memo-ilife', 'plugin-schedule-ilife',
];

describe('三印产物门：seals 与 sealOverlay 同在', () => {
  for (const p of PKGS) {
    it(p + ' 束含印实现', () => {
      const f = join(HERE, '..', 'packages', p, 'dist', 'client.js');
      assert.ok(existsSync(f), '缺 ' + f + '：先重建该包 client 束');
      const s = readFileSync(f, 'utf8');
      assert.ok(s.includes('seals'), p + ' 束须含 seals prop');
      assert.ok(s.includes('sealOverlay'), p + ' 束须含 sealOverlay 实现（捆的是陈旧总管时此条变红）');
    });
    it(p + ' 束不捆陈旧总管', () => {
      const m = join(HERE, '..', 'packages', p, 'dist', 'client.js.map');
      if (!existsSync(m)) return;
      const s = readFileSync(m, 'utf8');
      assert.ok(!s.includes('dsh-life-pack@0.3.34'), p + ' 束 sourcemap 仍指向 registry 0.3.34：重建前先确认 alias 落点');
    });
  }
});
