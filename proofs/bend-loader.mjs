// Node import hook for Bend 2.0.40+: compiles an imported .bend file with the
// installed `bend` binary and serves the emitted ES module.
import { registerHooks } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const cache = path.join(os.tmpdir(), 'annotator-bend-modules');
fs.mkdirSync(cache, { recursive: true });
const bend = process.env.BEND_BIN || 'bend', env = { ...process.env, BEND_NO_TELEMETRY: '1' };
// A module compiled by another compiler version is not this one's output (2.0.5 emitted BigInt where 2.0.40 emits numbers).
let version;
registerHooks({
    load(url, context, nextLoad) {
        if (!url.endsWith('.bend')) return nextLoad(url, context);
        const file = fileURLToPath(url), dir = path.dirname(file);
        version ??= spawnSync(bend, ['version'], { encoding: 'utf8', env }).stdout || '';
        const hash = createHash('sha256').update(version);
        for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.bend')).sort()) hash.update(name).update(fs.readFileSync(path.join(dir, name)));
        const out = path.join(cache, `${hash.update(file).digest('hex')}.mjs`);
        if (!fs.existsSync(out)) {
            // Test files run in parallel processes: write beside the cache entry and rename, so none reads a half-written module.
            // (The compiler picks its output kind from the extension, so the partial file is an .mjs too.)
            const partial = path.join(cache, `partial-${process.pid}-${path.basename(out)}`);
            const result = spawnSync(bend, [file, '-o', partial], { encoding: 'utf8', env });
            if (result.status !== 0 || !fs.existsSync(partial)) { fs.rmSync(partial, { force: true }); throw new Error(`bend failed for ${file}:\n${result.stdout}${result.stderr}`); }
            fs.renameSync(partial, out);
        }
        return { format: 'module', source: fs.readFileSync(out, 'utf8'), shortCircuit: true };
    },
});
