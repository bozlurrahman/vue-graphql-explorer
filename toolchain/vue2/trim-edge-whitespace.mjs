// Vue 2.7 template compiler module: match Vue 3's whitespace handling around interpolations.
//
// Vue 2 keeps `<a>\n  {{ name }}\n</a>` as ONE text node and condenses it to " name ".
// Vue 3 splits it into whitespace / interpolation / whitespace and drops the whitespace-only nodes at
// the start and end of an element, giving "name". This module removes a whitespace-only leading
// token from an element's first child and a trailing one from its last child.
function rebuild(node, tokens) {
  node.tokens = tokens;
  node.expression = tokens.map(t => (typeof t === 'string' ? JSON.stringify(t) : `_s(${t['@binding']})`)).join('+');
  node.text = tokens.map(t => (typeof t === 'string' ? t : `{{${t['@binding']}}}`)).join('');
}

function trim(node, atStart, atEnd) {
  // type 2 = text with interpolations; static text (type 3) is the same in Vue 2 and Vue 3.
  if (!node || node.type !== 2 || !Array.isArray(node.tokens)) return;
  const tokens = node.tokens.slice();
  if (atStart && typeof tokens[0] === 'string' && tokens[0].trim() === '') tokens.shift();
  if (atEnd && typeof tokens[tokens.length - 1] === 'string' && tokens[tokens.length - 1].trim() === '') tokens.pop();
  if (tokens.length !== node.tokens.length && tokens.length > 0) rebuild(node, tokens);
}

export default {
  postTransformNode(el) {
    const children = el.children || [];
    if (children.length === 0) return;
    trim(children[0], true, children.length === 1);
    if (children.length > 1) trim(children[children.length - 1], false, true);
  },
};
