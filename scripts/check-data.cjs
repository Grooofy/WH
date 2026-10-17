const assert = require('node:assert/strict');
global.window = {};
require('../data/spells.js');
const spells = window.SPELLS;
assert.equal(spells.length, 330);
assert.equal(new Set(spells.map(s => s.id)).size, 330);
assert.equal(new Set(spells.map(s => s.name)).size, 330);
const traditions = [...new Set(spells.map(s => s.tradition))];
assert.equal(traditions.length, 30);
for (const tradition of traditions) {
  const members = spells.filter(s => s.tradition === tradition);
  assert.equal(members.length, 11, tradition);
  assert.deepEqual([0,1,2,3,4,5].map(rank => members.filter(s => s.rank === rank).length), [2,3,2,2,1,1], tradition);
}
for (const spell of spells) {
  assert(spell.description.length > 30, spell.name);
  assert(spell.page >= 106 && spell.page <= 131, spell.name);
  assert(!spell.description.includes('\ufffd'), spell.name);
  assert(['Боевое', 'Бытовое'].includes(spell.kind));
}
assert.equal(spells.find(s => s.name === 'Дикая магия').table.length, 9);
console.log('PASS: 330 unique spells, 30 traditions, rank distribution, descriptions, source pages, wild magic table.');
