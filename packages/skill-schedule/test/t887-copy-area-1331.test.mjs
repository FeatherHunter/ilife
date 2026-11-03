/** #1331 作息复制区缺省按钮文案按语言取词——单测。
 *
 *  `scheduleCopyArea` 不传 label，走公共层 `renderCopyBlock` 的缺省路径；
 *  #1331 让那条缺省路径按当前渲染语言取词，本件在技能侧钉住英文读数。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { runWithLanguage } from 'base-entries';
import { scheduleCopyArea } from '../dist/render/copyArea.js';

function render(lang) {
  return runWithLanguage(lang, () => scheduleCopyArea({
    key: 'schedule.record.today',
    payload: { items: [], total: 0 },
    dataActionId: 'ilife-x-copy-data',
    logActionId: 'ilife-x-copy-log',
    log: { command: 'schedule-cmd-read schedule.record.today --params {}', source: '作息记录表', actionAt: '2026-01-01 00:00' },
  }));
}

describe('#1331 作息复制区缺省按钮文案', () => {
  it('中文：仍用「复制数据／复制日志」', () => {
    const html = render('zh');
    assert.ok(html.includes('>复制数据</button>'));
    assert.ok(html.includes('>复制日志</button>'));
    assert.equal(html.includes('Copy data'), false);
  });

  it('英文：缺省按钮出「Copy data／Copy log」，不出中文', () => {
    const html = render('en');
    assert.ok(html.includes('>Copy data</button>'), '英文数据位按钮须取英文词条');
    assert.ok(html.includes('>Copy log</button>'), '英文日志位按钮须取英文词条');
    assert.equal(html.includes('>复制数据</button>'), false);
    assert.equal(html.includes('>复制日志</button>'), false);
  });
});
