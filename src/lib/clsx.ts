// clsx, copied from intelli-app-operations nuxt/lib/common.ts

function toVal(mix: any): string {
  let str = '';

  if (typeof mix === 'string' || typeof mix === 'number') {
    str += mix;
  } else if (typeof mix === 'object') {
    if (Array.isArray(mix)) {
      const len = mix.length;
      for (let k = 0; k < len; k++) {
        if (mix[k]) {
          const y = toVal(mix[k]);
          if (y) {
            if (str) str += ' ';
            str += y;
          }
        }
      }
    } else if (mix !== null) {
      for (const key in mix) {
        if (mix[key]) {
          if (str) str += ' ';
          str += key;
        }
      }
    }
  }

  return str;
}

export function clsx(...args: any): string {
  let str = '';
  const len = args.length;

  for (let i = 0; i < len; i++) {
    const tmp = args[i];
    if (tmp) {
      const x = toVal(tmp);
      if (x) {
        if (str) str += ' ';
        str += x;
      }
    }
  }

  return str;
}
