// Bend lists to and from JavaScript arrays. On their own, so that what needs only these does not bring the
// annotation schema with it.
export function list(values) {
    return values.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
}
export function array(values) {
    const result = [];
    for (; values.$ === 'Con'; values = values.tail) result.push(values.head);
    if (values.$ !== 'Nil') throw new Error('Invalid Bend list');
    return result;
}
