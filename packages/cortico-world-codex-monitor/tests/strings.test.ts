import { test } from 'vitest';
import assert from 'node:assert/strict';
import { strings } from '../src/strings.ts';
import { taskNotice } from '../src/model-text.ts';

test('supported UI locales provide complete panel and settings labels',()=>{
  for(const language of ['zh','zh-Hant','en','ja','ko','fr','de','es-419','pt-BR','it','ru']){
    const ui=strings(language);
    assert.equal(ui.columns.length,6,language);
    assert.equal(ui.fields.length,6,language);
    assert.equal(Object.keys(ui.statuses).length,7,language);
    assert.ok([...ui.columns,...ui.fields,...Object.values(ui.statuses),ui.description].every(value=>value.length>0 && !value.includes('\uFFFD')),language);
  }
  assert.notEqual(strings('ja').greeting,strings('en').greeting);
  assert.equal(taskNotice('codex','completed','turn').includes('not that the work is correct'),true);
});
