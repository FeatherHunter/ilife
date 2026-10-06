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
      // 印本体那几件也要咬住产物：只验 seals／sealOverlay 挡不住「面板新、印本体旧」这一层。
      assert.ok(s.includes('baseFrequency: .6') && s.includes('numOctaves: 3') && s.includes('scale: 6.5'), p + ' 束里外框金粉仍是旧配方（缺 0.6／3 倍频／6.5 位移）');
      assert.ok(s.includes('calc(50% - 0.8125em)') && s.includes('calc(50% + 0.4375em)'), p + ' 束里绦带两条飘尾位置是旧的');
      assert.ok(s.includes('#e8573c 0%,#c33a24 55%'), p + ' 束里飘尾不是那档提亮朱砂（两层材质的填充串缺）');
      assert.ok(s.includes('#c8543f 0%,#a8281c 58%'), p + ' 束里行首小印没有印泥质感（朱砂渐变串缺）');
      // 定版门：纸面字排与关闭钮已定稿，原型期那二十余档方案不许再被捆进产物。
      for (const proto of ['t-bigtier', 't-sealmark', 't-cardmix', 't-vcards', 't-night']) {
        assert.ok(!s.includes(proto), p + ' 束里还带着原型方案 ' + proto + '：定稿后只留胜出那一档');
      }
    });
    it(p + ' 束不捆陈旧总管', () => {
      const m = join(HERE, '..', 'packages', p, 'dist', 'client.js.map');
      if (!existsSync(m)) return;
      const s = readFileSync(m, 'utf8');
      assert.ok(!s.includes('dsh-life-pack@0.3.34'), p + ' 束 sourcemap 仍指向 registry 0.3.34：重建前先确认 alias 落点');
    });
  }
});
