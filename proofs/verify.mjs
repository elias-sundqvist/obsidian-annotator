import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const bend = process.env.BEND_BIN || 'bend';
// Bend 2.0.40 is a single binary with no Node import hook of its own;
// bend-loader.mjs compiles each imported .bend file with it.
const loader = path.join(root, 'bend-loader.mjs');
const env = { ...process.env, BEND_NO_TELEMETRY: '1' };
function run(command, args, options = {}) {
    const result = spawnSync(command, args, { cwd: root, env, encoding: 'utf8', timeout: 60000, ...options });
    if (result.error) throw result.error;
    return result;
}
function checked(args) {
    const result = run(bend, args);
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    assert.equal(result.status, 0, `Bend failed: ${args.join(' ')}`);
    return result;
}
const bendFiles = fs.readdirSync(root).filter(name => name.endsWith('.bend')).sort();
checked(['version']);
for (const name of bendFiles) {
    const source = fs.readFileSync(path.join(root, name), 'utf8');
    assert.ok(!/@unsafe|\?TODO/.test(source), `${name} contains an unsafe definition or proof hole`);
}
assert.match(checked(['PROOF.bend', '--check-only']).stdout, /ALL PROOFS CHECK/);

// The independent check: `--verdict` has the proofs checked a second time by a small kernel that itself has a proof
// in Lean. It needs Lean v4.34.0, which this script does not install: bend builds the kernel with it once and keeps
// it. With `lean` on the PATH or where elan puts it (~/.elan/bin), a kernel bend has already built, or BENDTT naming
// one, the check is made and must pass; without any of these the step says that it was skipped. BEND_VERDICT=1 makes
// a missing Lean a failure, for a place that is meant to have it.
{
    const home = process.env.HOME || process.env.USERPROFILE || '', elan = home ? path.join(home, '.elan', 'bin') : '';
    const kernelEnv = elan && fs.existsSync(elan) ? { ...env, PATH: `${elan}${path.delimiter}${env.PATH || process.env.PATH || ''}` } : env;
    const lean = spawnSync('lean', ['--version'], { env: kernelEnv, encoding: 'utf8' }), kernels = home ? path.join(home, '.bend', 'bendtt') : '';
    const built = !!kernels && fs.existsSync(kernels) && fs.readdirSync(kernels).some(name => fs.existsSync(path.join(kernels, name, 'bendtt')) || fs.existsSync(path.join(kernels, name, 'bendtt.exe')));
    const available = !!process.env.BENDTT || (!lean.error && lean.status === 0) || built;
    if (available) {
        const verdict = run(bend, ['PROOF.bend', '--verdict'], { timeout: 30 * 60 * 1000, env: kernelEnv });
        process.stdout.write(verdict.stdout); process.stderr.write(verdict.stderr);
        assert.equal(verdict.status, 0, 'The kernel did not accept the proofs');
        assert.match(verdict.stdout, /ALL PROOFS CHECK/);
        console.log('Kernel verdict: the proofs check a second time');
    } else {
        assert.notEqual(process.env.BEND_VERDICT, '1', 'BEND_VERDICT=1, but Lean is not installed: bend PROOF.bend --verdict needs Lean v4.34.0');
        console.log('Kernel verdict skipped: Lean is not installed (bend PROOF.bend --verdict needs Lean v4.34.0)');
    }
}

// Negative controls must fail with a type mismatch, not a missing tool/import.
for (const [name, file, oldCode, brokenCode] of [
    ['write retains flagged state', 'annotation_contract.bend', 'T.Visibility{hidden, T.PresentField{False{}}, mod}', 'T.Visibility{hidden, T.PresentField{True{}}, mod}'],
    ['write ignores supplied body identity', 'annotation_contract.bend', '+id = effective_id(input(request), fresh)', '+id = fresh'],
    ['visible context overwrites exact quote', 'annotation_contract.bend', 'T.QuoteSelector{exact, prefer(String, pre, prefix)', 'T.QuoteSelector{"changed", prefer(String, pre, prefix)'],
    ['storage loses unknown fields', 'annotation_contract.bend', 'strip_links(links), extra}}', 'strip_links(links), Nil{}}}'],
    ['known quote accepted without exact', 'annotation_schema.bend', 'String.eq(kind, "TextQuoteSelector")', 'String.eq(kind, "NotTheClientSelector")'],
    ['schema lookup loses the member it finds', 'annotation_schema.bend', '    case Con{T.Member{name, value}, rest} True{}:\n      T.PresentField{value}', '    case Con{T.Member{name, value}, rest} True{}:\n      T.AbsentField{}'],
    ['a known field is kept as an extension', 'annotation_schema.bend', '    case Con{name, rest} True{}:\n      True{}', '    case Con{name, rest} True{}:\n      False{}'],
    ['video header recognition refuses all spelling', 'video_header.bend', 'projected(source, recognize(source))', 'None{}'],
    ['video title edit loses original prefix', 'video_header.bend', 'Syntax{prefix, value, between, timestamp, suffix}', 'Syntax{"> **", value, between, timestamp, suffix}'],
    ['video cycle adds a newline', 'video_source_crud.bend', '      Recognizer.output(Recognizer.delete(source, id))', '      String.append(Recognizer.output(Recognizer.delete(source, id)), "\\n")'],
    ['video creator omits its trailing separator', 'video_source_crud.bend', 'String.append(id, "\\n\\n")', 'String.append(id, "\\n")'],
    ['video recognizer never deletes records', 'video_document.bend', 'Bool.pick(String, is_video(head, key), "", part_raw(head))', 'part_raw(head)'],
    ['video comment overwrites timestamp spelling', 'video_block.bend', 'old} = fields\n  Fields{title, timestamp, value}', 'old} = fields\n  Fields{title, "0", value}'],
    ['video body recognizer refuses all input', 'video_block.bend', 'decoded(Quote.unquote_lines(lines))', 'None{}'],
    ['discarded line content', 'codec.bend', "SCon{'>', line}", "SCon{'>', SNil{}}"],
    ['overwritten prose', 'storage.bend', 'Raw{text}\n    case Annotation', 'Raw{"lost"}\n    case Annotation'],
    ['trimmed whole-document whitespace', 'document.bend', 'String.append(body, String.append(ending_text(ending), encode(rest)))', 'String.append(String.trim(body), String.append(ending_text(ending), encode(rest)))'],
    ['ignored creation', 'crud.bend', 'Applied{[Store.Annotation{id, lines}], Created{0n}, None{}}', 'Applied{Nil{}, Created{0n}, None{}}'],
    ['deletion lost suffix', 'crud.bend', 'Applied{tail, Deleted{0n, Store.Annotation{id, old}}, None{}}', 'Applied{Nil{}, Deleted{0n, Store.Annotation{id, old}}, None{}}'],
    ['update forgot original payload', 'crud.bend', 'Updated{0n, Store.Annotation{id, old}}', 'Updated{0n, Store.Annotation{id, Nil{}}}'],
    ['growing boundary normalization', 'boundary.bend', 'case AfterBlank{}:\n      ""', 'case AfterBlank{}:\n      "\\n"'],
    ['creator omits its owned trailing blank line', 'source-crud.bend', 'String.append(id, "\\n\\n")', 'String.append(id, "\\n")'],
    ['receipt-free cycle leaves an extra newline', 'source-crud.bend', '      Recognizer.output(Recognizer.delete(source, id))', '      String.append(Recognizer.output(Recognizer.delete(source, id)), "\\n")'],
    ['recognizer never deletes created annotations', 'recognizer.bend', 'Bool.pick(String, skip, "", part_raw(part))', 'Bool.pick(String, skip, part_raw(part), part_raw(part))'],
    ['duplicate check forgets the IDs it has met', 'recognizer.bend', 'errors_seen(rest, seen_add(seen, id), Bool.or(seen_has(seen, id), found))', 'errors_seen(rest, seen, Bool.or(seen_has(seen, id), found))'],
    ['duplicate IDs are not reported', 'recognizer.bend', 'duplicate_diagnostic(id, line, acc, seen_has(seen, id))', 'duplicate_diagnostic(id, line, acc, False{})'],
    ['an ID counts as met once its first character is', 'recognizer.bend', '      seen_has_go(down, t, seen_meets(down, t))', '      True{}'],
    ['meeting an ID forgets those starting otherwise', 'recognizer.bend', 'SeenChar{c, seen_add_go(down, t, seen_joins(down, t)), next}', 'SeenChar{c, seen_add_go(down, t, seen_joins(down, t)), SeenNone{}}'],
    ['marker test looks at the untrimmed line start', 'recognizer.bend', 'is_marker_checked(text, marker, String.starts_with(String.trim_start(text), marker))', 'is_marker_checked(text, marker, String.starts_with(text, marker))'],
    ['prefix test never passes its guard', 'recognizer.bend', 'starts_trimmed_checked(text, prefix, String.starts_with(String.trim_start(text), prefix))', 'starts_trimmed_checked(text, prefix, False{})'],
    ['header is looked for on every line', 'recognizer.bend', '    case False{}:\n      False{}\n    case True{}:\n      header_text(String.trim(text))', '    case False{}:\n      header_text(String.trim(text))\n    case True{}:\n      header_text(String.trim(text))'],
    ['display end test looks at the start of the text', 'recognizer.bend', 'String.starts_with(String.trim_start(String.reverse(String.trim_start(text))), String.reverse(suffix))', 'String.starts_with(String.trim_start(String.trim_start(text)), String.reverse(suffix))'],
    ['a prefix ending in a blank is taken without trimming', 'recognizer.bend', 'starts_trimmed_tight(text, prefix, Bool.not(ends_blank(prefix, False{})))', 'starts_trimmed_tight(text, prefix, True{})'],
    ['the exact CR strip alters a line that has no CR', 'recognizer.bend', '    case _:\n      String.reverse(text)', '    case _:\n      text'],
    ['a trailing CR is never noticed', 'recognizer.bend', "      ends_cr(t, Char.is_eq(h, '\\r'))", '      ends_cr(t, False{})'],
    ['line decoder drops the line-break character', 'document.bend', 'Con{Line{body, Some{char}}, reversed}, head_newline(rest))', 'Con{Line{body, None{}}, reversed}, head_newline(rest))'],
    ['line decoder breaks lines at spaces', 'document.bend', "      Char.is_eq(h, '\\n')\n    case SNil{}:", "      Char.is_eq(h, ' ')\n    case SNil{}:"],
    ['creation certificate issued without comparing', 'evidence.bend', 'same_checked(a, b, String.eq(a, b), {==})', 'same_checked(a, b, True{}, {==})'],
    ['creation accepts a candidate that deletes to something else', 'source-crud.bend', 'Evidence.same(text, Boundary.normalize(original))', 'Evidence.same(Boundary.normalize(original), Boundary.normalize(original))'],
    ['recolouring drops a neighbouring member', 'ink.bend', 'Con{pair, updated}', 'updated'],
    ['recolouring keeps the old colour in front', 'ink.bend', 'Con{color_pair(ink), rest}', 'Con{pair, Con{color_pair(ink), rest}}'],
    ['ink key reads back as another ink', 'ink.bend', 'String.eq(text, "blue"), Blue{}', 'String.eq(text, "blue"), Green{}'],
    ['ink shortcut disagrees with swatch order', 'ink.bend', 'case 2n:\n      Some{Orange{}}', 'case 2n:\n      Some{Pink{}}'],
    ['colour filter shows other colours', 'shelf.bend', '    case False{}:\n      tail', '    case False{}:\n      Con{entry, tail}'],
    ['section heading swallows a card', 'shelf.bend', 'Con{Header{section}, Con{card, tail}}', 'Con{Header{section}, tail}'],
    ['page note listed under both tabs', 'shelf.bend', 'Con{Entry{id, section, ink, False{}}, rest}:\n      annotations(rest)', 'Con{Entry{id, section, ink, False{}}, rest}:\n      Con{Entry{id, section, ink, False{}}, annotations(rest)}'],
    ['first card shown without its section', 'shelf.bend', 'rows_from(entries, "", True{})', 'rows_from(entries, "", False{})'],
    ['export leaves an empty line unquoted', 'digest.bend', '      ">"\n', '      ""\n'],
    ['export title keeps a line break', 'digest.bend', "    case True{}:\n      ' '", "    case True{}:\n      c"],
    ['export drops the note under a passage', 'digest.bend', 'List.append(&2, String, Con{q, qs}, Con{"", Con{c, cs}})', 'Con{q, qs}'],
    ['a moved stretch keeps its old line numbers', 'segments.bend', 'Recognizer.AnnotationPart{id, raw, fields, Nat.add(line, k)}', 'Recognizer.AnnotationPart{id, raw, fields, line}'],
    ['a stretch may follow an unfinished context', 'segments.bend', '    case Con{Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Neutral{}, parts, 1n+p}:', '    case Con{Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{mode0, parts, 1n+p}:'],
    ['a stretch may follow text that does not end its line', 'segments.bend', '    case Con{Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Neutral{}, parts, 1n+p}:', '    case Con{Later{text, next, proof, ends2}, more} e Recognizer.ScanState{Recognizer.Neutral{}, parts, 1n+p}:'],
    ['the checked run never refuses a line', 'segments.bend', '      Bool.and(settled(mode, parts), fence_plain(Recognizer.fence_start(Recognizer.indent(text, 3n))))', '      True{}'],
    ['a later stretch is scanned as the start of a note', 'segments.bend', '    case Recognizer.ScanState{mode, parts, 0n}:\n      False{}', '    case Recognizer.ScanState{mode, parts, 0n}:\n      True{}'],
    ['a stretch may follow a first stretch that holds no line', 'segments.bend', '    case Con{Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Neutral{}, parts, 1n+p}:\n      extend(more, String.append(before, last), text, ends2, onto(move_state(p, next), parts))', '    case Con{Later{text, next, proof, ends2}, more} Some{e} Recognizer.ScanState{Recognizer.Neutral{}, parts, line0}:\n      extend(more, String.append(before, last), text, ends2, onto(move_state(Nat.sub(line0, 1n), next), parts))'],
    ['a later stretch is not set on the parts before it', 'segments.bend', 'extend(more, String.append(before, last), text, ends2, onto(move_state(p, next), parts))', 'extend(more, String.append(before, last), text, ends2, move_state(p, next))'],
    ['the assembled text drops a stretch', 'segments.bend', 'extend(more, String.append(before, last), text, ends2, onto(move_state(p, next), parts))', 'extend(more, before, text, ends2, onto(move_state(p, next), parts))'],
    ['a text ends its line at another character', 'document.bend', "      ends_nl(t, Char.is_eq(h, '\\n'))", "      ends_nl(t, Char.is_eq(h, ' '))"],
    ['a note is deleted from without the safety check', 'segments.bend', 'Recognizer.delete_checked(text, id, scan, Recognizer.safe(scan))', 'Recognizer.delete_checked(text, id, scan, True{})'],
    ['one containment is taken for equality', 'segments.bend', 'Bool.and(String.contains(a, b), String.contains(b, a))', 'String.contains(a, b)'],
    ['creation in stretches skips the ID and safety checks', 'segments.bend', 'Bool.and(SourceCrud.allowed(id, scan), end_known(init, last))', 'end_known(init, last)'],
    ['creation in stretches trusts an unknown end of the note', 'segments.bend', 'Bool.and(SourceCrud.allowed(id, scan), end_known(init, last))', 'SourceCrud.allowed(id, scan)'],
    ['the end of a note is read from an empty last stretch', 'segments.bend', 'Bool.and(ends_last(rest, first), nonempty(last))', 'ends_last(rest, first)'],
    ['the end of a note is read after text that does not end its line', 'segments.bend', 'Bool.and(ends_last(rest, first), nonempty(last))', 'nonempty(last)'],
    ['a created note need not end ready for the next annotation', 'segments.bend', 'ended(Boundary.run(tail, Boundary.run(suffix, end_state(init, last))))', 'True{}'],
    ['the candidate is not compared with the note it must delete to', 'segments.bend', 'create_checked(original, source, same_text(text, normal))', 'create_checked(original, source, True{})'],
    ['a candidate that cannot be deleted from is accepted', 'segments.bend', '    case Recognizer.SourceEdit{text, Some{refusal}}:\n      None{}\n    case Recognizer.SourceEdit{text, None{}}:\n      create_checked', '    case Recognizer.SourceEdit{text, Some{refusal}}:\n      Some{Created{original, source}}\n    case Recognizer.SourceEdit{text, None{}}:\n      create_checked'],
    ['the candidate leaves out the line ends the boundary adds', 'segments.bend', 'place(init, String.append(String.append(last, suffix), tail))', 'place(init, String.append(last, tail))'],
    ['the candidate is compared with the note before its boundary', 'segments.bend', 'create_placed(init, id, original, String.append(original, suffix),', 'create_placed(init, id, original, original,'],
    ['a note with stretches before the last is read as if it had none', 'segments.bend', '    case Con{first, rest}:\n      Boundary.AfterBlank{}', '    case Con{first, rest}:\n      Boundary.EmptySource{}'],
    ['drag ends are not held on the page', 'area.bend', 'between(Nat.min(a, full), Nat.min(b, full))', 'between(a, b)'],
    ['corner order changes the region', 'area.bend', 'Span{Nat.min(a, b), Nat.sub(Nat.max(a, b), Nat.min(a, b))}', 'Span{a, Nat.sub(Nat.max(a, b), Nat.min(a, b))}'],
    ['moving a region ignores the page edge', 'area.bend', 'Span{Nat.min(Nat.add(start, by), Nat.sub(full, size)), size}', 'Span{Nat.add(start, by), size}'],
    ['moving a region changes its size', 'area.bend', 'Span{Nat.sub(start, by), size}', 'Span{Nat.sub(start, by), 0n}'],
    ['growing a region passes the page edge', 'area.bend', 'Span{start, Nat.min(Nat.add(size, by), Nat.sub(full, start))}', 'Span{start, Nat.add(size, by)}'],
    ['shrinking a region can enlarge it', 'area.bend', 'Span{start, Nat.min(size, Nat.max(Nat.sub(size, by), least))}', 'Span{start, Nat.max(Nat.sub(size, by), least)}'],
    ['a region on no page is kept', 'area.bend', 'Bool.and(Nat.is_ge(page, 1n), Bool.and(roomy(least, across), roomy(least, down)))', 'Bool.and(roomy(least, across), roomy(least, down))'],
    ['a region thinner than the least size is kept', 'area.bend', 'Bool.and(roomy(least, across), roomy(least, down)))', 'roomy(least, down))'],
    ['a point of a line is left off the page', 'stroke.bend', 'Point{Nat.min(x, wide), Nat.min(y, tall), at}', 'Point{x, Nat.min(y, tall), at}'],
    ['thinning a line puts a point in twice', 'stroke.bend', "    case Con{+point, rest}:\n      Con{point, thin_from(least, rest, point)}", "    case Con{+point, rest}:\n      Con{point, Con{point, thin_from(least, rest, point)}}"],
    ['a thinned line stops short of where the hand ended', 'stroke.bend', "    case Con{point, Nil{}}:\n      keep(Bool.not(same(last, point)), point, Nil{})\n    case Con{+point, Con{next, more}}:\n      +far = Nat.is_ge(apart(last, point), least)\n      keep(far, point, thin_from(", "    case Con{point, Nil{}}:\n      Nil{}\n    case Con{+point, Con{next, more}}:\n      +far = Nat.is_ge(apart(last, point), least)\n      keep(far, point, thin_from("],
    ['the one-pass thinning keeps a point the defining one leaves out', 'stroke.bend', 'thin_go(least, Con{next, more}, choose(far, point, last), keep(far, point, kept))', 'thin_go(least, Con{next, more}, choose(far, point, last), Con{point, kept})'],
    ['the box around a line leaves a point outside', 'stroke.bend', 'Nat.max(right, x), Nat.max(bottom, y)}', 'right, Nat.max(bottom, y)}'],
    ['the one-pass video check forgets an ID it has seen', 'video_document.bend', "    case Con{Foreign{+id}, rest}:\n      errors_seen(rest, Context.seen_add(seen, id), Bool.or(Context.seen_has(seen, id), found))", "    case Con{Foreign{+id}, rest}:\n      errors_seen(rest, seen, Bool.or(Context.seen_has(seen, id), found))"],
    ['a place past the end of a one-chapter book', 'book.bend', 'Place{0n, Nat.min(at, length)}', 'Place{0n, at}'],
    ['a place found without taking off the chapters before it', 'book.bend', 'later(place(Con{next, more}, Nat.sub(at, length)))', 'later(place(Con{next, more}, at))'],
    ['the characters before a place leave out an earlier chapter', 'book.bend', 'Nat.add(length, before(rest, Place{chapter, offset}))', 'before(rest, Place{chapter, offset})'],
]) {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'annotator-bend-proof-'));
    try {
        for (const name of bendFiles) {
            fs.copyFileSync(path.join(root, name), path.join(temporary, name));
        }
        const target = path.join(temporary, file);
        const source = fs.readFileSync(target, 'utf8');
        assert.ok(source.includes(oldCode), `Negative control no longer matches ${file}`);
        fs.writeFileSync(target, source.replace(oldCode, brokenCode));
        const result = run(bend, [path.join(temporary, 'PROOF.bend'), '--check-only']);
        assert.notEqual(result.status, 0, `Broken implementation passed: ${name}`);
        assert.match(result.stdout + result.stderr, /expected\s*:/);
        assert.match(result.stdout + result.stderr, /observed\s*:/);
        console.log(`Proof rejected: ${name}`);
    } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
    }
}
const tests = run(process.execPath, ['--import', loader, '--test', 'bridge.test.mjs', 'typed.test.mjs', 'video.test.mjs', 'video-document.test.mjs', 'reader.test.mjs'], { timeout: 180000 });
process.stdout.write(tests.stdout);
process.stderr.write(tests.stderr);
assert.equal(tests.status, 0, 'JavaScript bridge tests failed');
