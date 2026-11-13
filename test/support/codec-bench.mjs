// Manual measurement of the note codec (not part of `npm test`):
//   npm run build && node --stack-size=4096 test/support/codec-bench.mjs [count] [whole]
// With no switch the codec runs as shipped (the scan in stretches, and create and delete on the note's
// stretches, both on). `whole` turns the scan in stretches off, so every text is scanned whole.
// Times the real compiled codec on one synthetic note with `count` annotations.
import fs from 'node:fs';
import { readAll, update, create, remove, inspections } from '../.generated/codec.mjs';

const count = Number(process.argv[2]) || 5000;
if (process.argv.includes('whole')) inspections.windows = false;
const fixture = fs.readFileSync(new URL('../fixtures/persistent-highlights.md', import.meta.url), 'utf8');
const ID = '1045d8adf0c041ada1e417b3b01dbb42', anchor = fixture.indexOf(`^${ID}\n`), block = `${fixture.slice(fixture.lastIndexOf('>%%\n>```annotation-json', anchor), anchor + ID.length + 2)}\n`, id = index => `bench${String(index).padStart(8, '0')}`;
const single = `---\nannotation-target: big.pdf\n---\n\n# Annotations\n\n${Array.from({ length: count }, (_, index) => block.replaceAll(ID, id(index))).join('')}`;
const time = (label, run, repeat = 1) => { const start = performance.now(); let result; for (let at = 0; at < repeat; at++) result = run(); console.log(`${label.padEnd(58)} ${((performance.now() - start) / repeat).toFixed(1).padStart(9)} ms`); return result; };

console.log(`${count} annotations; single note ${(Buffer.byteLength(single) / 1e6).toFixed(2)} MB; Node ${process.version}; windows ${inspections.windows}, operations ${inspections.operations}`);
const rows = time('single note: read all (open a source)', () => readAll(single));
const target = rows[Math.floor(count / 2)], edited = { ...target, text: `${target.text} Edited.` };
time('single note: edit one comment (read + rewrite whole note)', () => update(single, edited));
const fresh = { ...target, id: 'benchfresh', text: 'New' };
const added = time('single note: create one annotation', () => create(single, fresh));
// What the app does around a save: read the note it is about to change, write, read the result back.
const saved = time('single note: save an edit and read the result back', () => readAll(update(single, { ...target, text: `${target.text} Again.` })));
time('single note: save a new annotation and read it back', () => readAll(create(single, { ...fresh, id: 'benchfresh2' })));
time('single note: delete one annotation and read the rest', () => readAll(remove(single, target.id)));
console.log(`  rows after the edit ${saved.length}; inspections: whole ${inspections.whole}, in stretches ${inspections.windowed}; created ${added.length > single.length}`);
