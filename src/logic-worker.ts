// The worker's whole program: serve the table in logic.ts. It is built on its own and carried inside main.js as
// text (see build.mjs), so the plugin is still three files.
import { answer, type LogicRequest } from './logic';
const scope = self as unknown as {
    onmessage: ((event: { data: LogicRequest }) => void) | null;
    postMessage(message: unknown): void;
};
scope.onmessage = event => {
    void answer(event.data).then(reply => scope.postMessage(reply));
};
