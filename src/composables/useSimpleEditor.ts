/**
 * useSimpleEditor.ts
 *
 * Lightweight textarea-based code editor composable with:
 *   • Syntax highlighting  (GraphQL / JSON)
 *   • Lint underlines      (wavy lines via <canvas> overlay)
 *   • Hover lint tooltip
 *   • Ctrl+Click details   (floating info panel)
 *   • Ctrl+Space autocomplete (positioned dropdown)
 *
 * Zero external dependencies beyond Vue 3.
 */

import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

// ─── Public types ─────────────────────────────────────────────────────────────

export type SimpleEditorMode = 'graphql' | 'graphql-variables' | 'graphql-results' | 'json' | 'text';

export interface LintDiagnostic {
  /** Start character offset in the document */
  from: number;
  /** End character offset in the document */
  to: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface CompletionItem {
  label: string;
  detail?: string;
  documentation?: string;
  /** Text inserted on accept — defaults to label */
  insertText?: string;
}

export interface ClickInfo {
  token: string;
  from: number;
  to: number;
}

export interface UseSimpleEditorOptions {
  mode: SimpleEditorMode;
  readOnly?: boolean;
  initialValue?: string;

  /** Called on every content change */
  onChange?: (value: string, instance: SimpleEditorInstance) => void;

  /**
   * Called 300 ms after each change — return lint diagnostics.
   * If not provided, no lint underlines are drawn.
   */
  onLint?: (value: string) => LintDiagnostic[] | Promise<LintDiagnostic[]>;

  /**
   * Called when Ctrl+Space is pressed.
   * Return the list of completions to show.
   */
  onComplete?: (value: string, cursorOffset: number) => CompletionItem[] | Promise<CompletionItem[]>;

  /**
   * Called when the user Ctrl+Clicks a token.
   * Return an HTML string (or null) to show in the info panel.
   */
  onClickToken?: (info: ClickInfo, value: string) => string | null | Promise<string | null>;
}

export interface SimpleEditorInstance {
  getValue: () => string;
  setValue: (val: string) => void;
  refresh: () => void;
  /** Manually push diagnostics (e.g. from an external language server) */
  setDiagnostics: (diags: LintDiagnostic[]) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  focus: () => void;
  hasFocus: () => boolean;
  destroy: () => void;
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useSimpleEditor(
  containerRef: Ref<HTMLElement | null>,
  options: UseSimpleEditorOptions,
): Ref<SimpleEditorInstance | null> {
  const editorRef = ref<SimpleEditorInstance | null>(null);

  onMounted(() => {
    const container = containerRef.value;
    if (!container) return;
    editorRef.value = createEditor(container, options);
  });

  onBeforeUnmount(() => {
    editorRef.value?.destroy();
    editorRef.value = null;
  });

  return editorRef as Ref<SimpleEditorInstance | null>;
}

// ─── Core factory (plain TS/DOM — no Vue) ─────────────────────────────────────

function createEditor(container: HTMLElement, options: UseSimpleEditorOptions): SimpleEditorInstance {
  // ── DOM skeleton ────────────────────────────────────────────────────────────
  //
  //  .se-root
  //    ├── pre.se-highlight       ← coloured HTML, pointer-events: none
  //    ├── canvas.se-lint-canvas  ← wavy underlines, pointer-events: none
  //    ├── textarea.se-textarea   ← actual input, colour: transparent
  //    ├── div.se-autocomplete    ← dropdown, z-index: 100
  //    ├── div.se-info-panel      ← ctrl+click popup, z-index: 110
  //    └── div.se-lint-tooltip    ← hover lint message, z-index: 120
  //

  const root = mkEl('div', 'se-root');
  const highlight = mkEl('pre', 'se-highlight') as HTMLPreElement;
  const lintCanvas = mkEl('canvas', 'se-lint-canvas') as HTMLCanvasElement;
  const textarea = mkEl('textarea', 'se-textarea') as HTMLTextAreaElement;
  const acBox = mkEl('div', 'se-autocomplete');
  const infoPanel = mkEl('div', 'se-info-panel');
  const lintTooltip = mkEl('div', 'se-lint-tooltip');

  highlight.setAttribute('aria-hidden', 'true');
  root.append(highlight, lintCanvas, textarea, acBox, infoPanel, lintTooltip);
  container.appendChild(root);

  // ── Textarea bootstrap ──────────────────────────────────────────────────────
  textarea.name = options.mode ?? '';
  textarea.value = options.initialValue ?? '';
  textarea.readOnly = options.readOnly ?? false;
  textarea.spellcheck = false;
  textarea.autocomplete = 'off';
  textarea.setAttribute('autocorrect', 'off');
  textarea.setAttribute('autocapitalize', 'off');

  // ── Internal event bus ─────────────────────────────────────────────────────
  const bus: Record<string, Set<(...a: any[]) => void>> = {};
  const fire = (ev: string, ...args: any[]) => bus[ev]?.forEach(fn => fn(...args));

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. HIGHLIGHT (syntax colouring)
  // ══════════════════════════════════════════════════════════════════════════════

  function updateHighlight() {
    highlight.innerHTML = tokenize(textarea.value, options.mode) + '\n';
  }

  let scrollRafPending = false;

  function syncScroll() {
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
    // Coalesce: scroll fires many times per gesture, but we only need to
    // repaint once per frame.
    if (scrollRafPending) return;
    scrollRafPending = true;
    requestAnimationFrame(() => {
      scrollRafPending = false;
      resizeCanvas();
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. LINT (wavy underlines + hover tooltip)
  // ══════════════════════════════════════════════════════════════════════════════

  let currentDiags: LintDiagnostic[] = [];
  let lintTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleLint() {
    if (!options.onLint) return;
    if (lintTimer) clearTimeout(lintTimer);
    lintTimer = setTimeout(async () => {
      const diags = await options.onLint!(textarea.value);
      setDiagnostics(diags);
    }, 300);
  }

  function setDiagnostics(diags: LintDiagnostic[]) {
    currentDiags = diags;
    drawLint();
  }

  function resizeCanvas() {
    const r = root.getBoundingClientRect();

    if (lintCanvas.width !== r.width || lintCanvas.height !== r.height) {
      lintCanvas.width = r.width;
      lintCanvas.height = r.height;
    }
    drawLint();
  }

  function drawLint() {
    const ctx = lintCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, lintCanvas.width, lintCanvas.height);
    if (!currentDiags.length) return;

    const rootRect = root.getBoundingClientRect();

    for (const d of currentDiags) {
      const rects = charRangeRects(d.from, d.to);
      const color = d.severity === 'error' ? '#f38ba8' : d.severity === 'warning' ? '#f9e2af' : '#89b4fa';

      for (const r of rects) {
        const x = r.left - rootRect.left;
        const y = r.bottom - rootRect.top - 1;
        drawWavy(ctx, x, y, Math.max(r.width, 6), color);
      }
    }
  }

  function drawWavy(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    const amp = 1.8;
    const step = 5;
    let cx = x;
    let up = true;
    ctx.moveTo(cx, y);
    while (cx < x + w) {
      const nx = Math.min(cx + step, x + w);
      ctx.quadraticCurveTo(cx + step / 2, up ? y - amp : y + amp, nx, y);
      cx = nx;
      up = !up;
    }
    ctx.stroke();
  }

  // ── Hover tooltip ───────────────────────────────────────────────────────────

  textarea.addEventListener('mousemove', e => {
    if (!currentDiags.length) {
      hideLintTooltip();
      return;
    }
    const off = charOffsetFromMouse(e.clientX, e.clientY);
    const hit = off >= 0 ? currentDiags.find(d => off >= d.from && off <= d.to) : undefined;
    if (hit) showLintTooltip(hit.message, e.clientX, e.clientY);
    else hideLintTooltip();
  });
  textarea.addEventListener('mouseleave', hideLintTooltip);

  function showLintTooltip(msg: string, mx: number, my: number) {
    lintTooltip.textContent = msg;
    lintTooltip.style.display = 'block';
    const rr = root.getBoundingClientRect();
    lintTooltip.style.left = mx - rr.left + 10 + 'px';
    lintTooltip.style.top = my - rr.top - 40 + 'px';
  }

  function hideLintTooltip() {
    lintTooltip.style.display = 'none';
  }

  /**
   * Resolves a global character offset (into `root`'s concatenated text
   * content) to a concrete (text node, intra-node offset) pair, by walking
   * `root`'s text nodes. Used to build Ranges without ever touching
   * innerHTML — see charRangeRects for why that matters.
   */
  function nodeOffsetAtIndex(root: Node, target: number): { node: Node; offset: number } | null {
    let remaining = target;
    let last: Node | null = null;
    const walker = document.createNodeIterator(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const len = (node.textContent ?? '').length;
      if (remaining <= len) return { node, offset: remaining };
      remaining -= len;
      last = node;
    }
    // target is at/past the end — clamp to the end of the last text node
    if (last) return { node: last, offset: (last.textContent ?? '').length };
    return null;
  }

  // ── Char-offset → pixel rects (via highlight <pre>) ────────────────────────

  function charRangeRects(from: number, to: number): DOMRect[] {
    // Ensure a non-zero-width range even for zero-length diagnostics, so a
    // rect is still produced (drawLint applies its own minimum-width floor).
    const safeTo = Math.max(to, from + 1);

    const start = nodeOffsetAtIndex(highlight, from);
    const end = nodeOffsetAtIndex(highlight, safeTo);
    if (!start || !end) return [];

    const range = document.createRange();
    try {
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
    } catch {
      return [];
    }
    return Array.from(range.getClientRects());
  }

  /**
   * Converts a viewport (mx, my) mouse position into a character offset
   * within textarea.value.
   *
   * Uses document.caretRangeFromPoint / caretPositionFromPoint against the
   * `highlight` layer, which mirrors the textarea's exact rendered (and
   * possibly wrapped — this CSS uses white-space: pre-wrap) text. Font-metrics
   * math (row = y / lineHeight, col = accumulated char width) was tried first
   * but can't account for wrapped lines, where one logical '\n'-terminated
   * line spans multiple visual rows — real DOM hit-testing against the
   * already-laid-out `highlight` text handles that correctly for free.
   *
   * The obstacle: per simple-editor.css, `.se-textarea` has z-index: 2 and
   * `.se-highlight` has z-index: 1 — the textarea sits ON TOP. Hit-testing
   * APIs always resolve to the topmost pointer-events-enabled element at that
   * pixel, so they'd normally hit the textarea — which, being a form control,
   * exposes no internal text nodes to the Range API, so the result would
   * never resolve inside `highlight`. To fix this we momentarily disable
   * pointer-events on the textarea and enable them on highlight for the
   * duration of this single synchronous call, then restore both immediately
   * after — this never affects real user input since no event loop turn
   * passes between the toggle and its restoration.
   */
  function charOffsetFromMouse(mx: number, my: number): number {
    const prevTextareaPE = textarea.style.pointerEvents;
    const prevHighlightPE = highlight.style.pointerEvents;

    let container: Node | null = null;
    let startOffset = 0;

    textarea.style.pointerEvents = 'none';
    highlight.style.pointerEvents = 'auto';

    try {
      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(mx, my);
        if (range) {
          container = range.startContainer;
          startOffset = range.startOffset;
        }
      } else if ((document as any).caretPositionFromPoint) {
        const pos = (document as any).caretPositionFromPoint(mx, my);
        if (pos) {
          container = pos.offsetNode;
          startOffset = pos.offset;
        }
      }
    } finally {
      textarea.style.pointerEvents = prevTextareaPE;
      highlight.style.pointerEvents = prevHighlightPE;
    }

    if (!container || !highlight.contains(container)) return -1;

    let off = 0;
    const walker = document.createNodeIterator(highlight, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node === container) return off + startOffset;
      off += (node.textContent ?? '').length;
    }
    return -1;
  }

  // ── Cursor pixel position (for popup placement) ─────────────────────────────

  function cursorPixelPos(): { x: number; y: number } {
    const value = textarea.value;
    const pos = textarea.selectionStart;
    const rr = root.getBoundingClientRect();

    // Collapsed ranges (start === end) are unreliable for getClientRects() —
    // several browsers return an empty list rather than a caret rect. Measure
    // a real 1-character span instead and read the caret position off
    // whichever edge is correct.
    let from: number;
    let to: number;
    let useRightEdge: boolean;

    if (pos < value.length) {
      // A character follows the cursor — caret sits at that character's LEFT edge.
      from = pos;
      to = pos + 1;
      useRightEdge = false;
    } else if (pos > 0) {
      // Cursor is at the very end of the document — measure the char before
      // it, caret sits at its RIGHT edge.
      from = pos - 1;
      to = pos;
      useRightEdge = true;
    } else {
      // Empty document, nothing to measure — approximate with highlight's
      // own top-left corner.
      const hr = highlight.getBoundingClientRect();
      return { x: hr.left - rr.left, y: hr.top - rr.top };
    }

    const start = nodeOffsetAtIndex(highlight, from);
    const end = nodeOffsetAtIndex(highlight, to);
    if (!start || !end) return { x: 0, y: 0 };

    const range = document.createRange();
    try {
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
    } catch {
      return { x: 0, y: 0 };
    }

    const r = range.getClientRects()[0];
    if (!r) return { x: 0, y: 0 };

    return {
      x: (useRightEdge ? r.right : r.left) - rr.left,
      y: r.bottom - rr.top,
    };
  }

  function placeAt(el: HTMLElement, x: number, y: number) {
    const rw = root.clientWidth;
    const rh = root.clientHeight;
    const ew = el.offsetWidth || 260;
    const eh = el.offsetHeight || 200;
    el.style.left = Math.min(x, Math.max(0, rw - ew - 8)) + 'px';
    el.style.top = y + eh > rh && y > rh / 2 ? y - eh - 8 + 'px' : y + 4 + 'px';
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. AUTOCOMPLETE (Ctrl+Space dropdown)
  // ══════════════════════════════════════════════════════════════════════════════

  let acItems: CompletionItem[] = [];
  let acSelected = 0;
  let acOpen = false;

  function openAc(items: CompletionItem[]) {
    if (!items.length) {
      closeAc();
      return;
    }
    acItems = items;
    acSelected = 0;
    acOpen = true;
    renderAc();
    acBox.style.display = 'block';
    const { x, y } = cursorPixelPos();
    placeAt(acBox, x, y);
  }

  function closeAc() {
    acOpen = false;
    acBox.style.display = 'none';
    acBox.innerHTML = '';
    acItems = [];
  }

  function renderAc() {
    acBox.innerHTML = '';
    acItems.forEach((item, i) => {
      const row = mkEl('div', 'se-ac-item' + (i === acSelected ? ' se-ac-selected' : ''));

      const lbl = mkEl('span', 'se-ac-label');
      lbl.textContent = item.label;
      row.appendChild(lbl);

      if (item.detail) {
        const det = mkEl('span', 'se-ac-detail');
        det.textContent = item.detail;
        row.appendChild(det);
      }

      row.addEventListener('mousedown', e => {
        e.preventDefault();
        acSelected = i;
        acceptAc();
      });
      row.addEventListener('mouseover', () => {
        acSelected = i;
        renderAc();
      });
      acBox.appendChild(row);
    });
    const sel = acBox.children[acSelected] as HTMLElement;
    sel?.scrollIntoView({ block: 'nearest' });
  }

  function acceptAc() {
    const item = acItems[acSelected];
    if (!item) return;
    const insert = item.insertText ?? item.label;
    const pos = textarea.selectionStart;
    const val = textarea.value;
    const ws = wordStart(val, pos);

    textarea.value = val.slice(0, ws) + insert + val.slice(pos);
    const np = ws + insert.length;
    textarea.selectionStart = textarea.selectionEnd = np;

    updateHighlight();
    triggerChange();
    closeAc();
    textarea.focus();
  }

  function wordStart(text: string, pos: number): number {
    let i = pos;
    while (i > 0 && /[\w$]/.test(text[i - 1] || '')) i--;
    return i;
  }

  async function triggerAc() {
    if (!options.onComplete) return;
    const items = await options.onComplete(textarea.value, textarea.selectionStart);
    openAc(items);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. CTRL+CLICK INFO PANEL
  // ══════════════════════════════════════════════════════════════════════════════

  function showInfo(html: string, mx: number, my: number) {
    infoPanel.innerHTML = html;

    const closeBtn = mkEl('button', 'se-info-close');
    closeBtn.setAttribute('title', 'Close');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', hideInfo);
    infoPanel.prepend(closeBtn);

    infoPanel.style.display = 'block';
    const rr = root.getBoundingClientRect();
    placeAt(infoPanel, mx - rr.left + 8, my - rr.top + 8);
  }

  function hideInfo() {
    infoPanel.style.display = 'none';
    infoPanel.innerHTML = '';
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. EVENT WIRING
  // ══════════════════════════════════════════════════════════════════════════════

  function triggerChange() {
    options.onChange?.(textarea.value, instance);
    fire('change', instance);
    scheduleLint();
  }

  textarea.addEventListener('input', () => {
    updateHighlight();
    triggerChange();
    // Keep AC alive while typing an identifier
    if (acOpen) triggerAc();
  });

  textarea.addEventListener('scroll', syncScroll);
  textarea.addEventListener('focus', () => fire('focus'));
  textarea.addEventListener('blur', () => {
    setTimeout(() => {
      if (!acBox.contains(document.activeElement)) closeAc();
    }, 100);
    fire('blur');
  });

  // ── Ctrl+Click ──────────────────────────────────────────────────────────────
  textarea.addEventListener('click', async e => {
    if (!e.ctrlKey && !e.metaKey) {
      hideInfo();
      return;
    }
    e.preventDefault();

    const pos = textarea.selectionStart;
    const val = textarea.value;
    const ws = wordStart(val, pos);
    let we = pos;
    while (we < val.length && /[\w$]/.test(val[we] || '')) we++;
    const token = val.slice(ws, we);
    if (!token || !options.onClickToken) return;

    hideInfo();
    const html = await options.onClickToken({ token, from: ws, to: we }, val);
    if (html) showInfo(html, e.clientX, e.clientY);
  });

  // ── Keyboard ────────────────────────────────────────────────────────────────
  textarea.addEventListener('keydown', e => {
    const ctrl = e.ctrlKey || e.metaKey;

    // Tab → 2 spaces
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const s = textarea.selectionStart;
      const v = textarea.value;
      textarea.value = v.slice(0, s) + '  ' + v.slice(textarea.selectionEnd);
      textarea.selectionStart = textarea.selectionEnd = s + 2;
      updateHighlight();
      triggerChange();
      return;
    }

    // AC navigation
    if (acOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        acSelected = (acSelected + 1) % acItems.length;
        renderAc();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        acSelected = (acSelected - 1 + acItems.length) % acItems.length;
        renderAc();
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        acceptAc();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAc();
        return;
      }
    }

    // Ctrl+Space → autocomplete
    if (ctrl && e.code === 'Space') {
      e.preventDefault();

      triggerAc();
      return;
    }

    // Escape → close panels
    if (e.key === 'Escape') {
      hideInfo();
      return;
    }
  });

  // ── ResizeObserver ──────────────────────────────────────────────────────────
  const ro = new ResizeObserver(resizeCanvas);
  ro.observe(root);

  // ── Initial render ──────────────────────────────────────────────────────────
  updateHighlight();
  scheduleLint();

  // ── Public API ──────────────────────────────────────────────────────────────
  const instance: SimpleEditorInstance = {
    getValue: () => textarea.value,
    setValue: val => {
      textarea.value = val;
      updateHighlight();
      scheduleLint();
    },
    refresh: () => {
      updateHighlight();
      resizeCanvas();
    },
    setDiagnostics,
    on: (ev, fn) => {
      if (!bus[ev]) bus[ev] = new Set();
      bus[ev].add(fn);
    },
    off: (ev, fn) => bus[ev]?.delete(fn),
    focus: () => textarea.focus(),
    hasFocus: () => document.activeElement === textarea,
    destroy: () => {
      ro.disconnect();
      if (lintTimer) clearTimeout(lintTimer);
      root.parentNode?.removeChild(root);
      Object.values(bus).forEach(s => s.clear());
    },
  };

  return instance;
}

// ─── Tokenisers ───────────────────────────────────────────────────────────────

function mkEl(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Replace only inside text nodes, never inside already-emitted <span> tags.
 * This prevents double-wrapping when we run multiple regex passes.
 */
function safeReplace(html: string, pattern: RegExp, fn: (m: string, ...g: string[]) => string): string {
  return html.replace(/(<[^>]+>)|([^<]+)/g, (_, tag, text) => {
    if (tag) return tag;
    return text ? text.replace(pattern, fn) : '';
  });
}

function tokenize(code: string, mode: SimpleEditorMode): string {
  if (mode === 'json' || mode === 'graphql-results') return tokenizeJSON(code);
  if (mode === 'graphql' || mode === 'graphql-variables') return tokenizeGraphQL(code);
  return escapeHtml(code);
}

function tokenizeJSON(code: string): string {
  let r = escapeHtml(code);
  // Keys  → "key":
  r = safeReplace(
    r,
    /(&quot;(?:[^&]|&amp;|&lt;|&gt;)*&quot;)\s*(:)/g,
    (_, k, c) => `<span class="se-key">${k}</span>${c}`,
  );
  // String values
  r = safeReplace(r, /&quot;(?:[^&]|&amp;|&lt;|&gt;)*&quot;/g, m => `<span class="se-string">${m}</span>`);
  // Keywords
  r = safeReplace(r, /\b(true|false|null)\b/g, m => `<span class="se-keyword">${m}</span>`);
  // Numbers
  r = safeReplace(r, /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, m => `<span class="se-number">${m}</span>`);
  return r;
}

function tokenizeGraphQL(code: string): string {
  let r = escapeHtml(code);
  // Comments
  r = safeReplace(r, /#[^\n]*/g, m => `<span class="se-comment">${m}</span>`);
  // Triple-quoted block strings ("""...""")
  r = safeReplace(r, /&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;/g, m => `<span class="se-string">${m}</span>`);
  // Inline strings
  r = safeReplace(r, /&quot;(?:[^&]|&amp;|&lt;|&gt;)*&quot;/g, m => `<span class="se-string">${m}</span>`);
  // Variables
  r = safeReplace(r, /\$[A-Za-z_][A-Za-z0-9_]*/g, m => `<span class="se-variable">${m}</span>`);
  // Directives
  r = safeReplace(r, /@[A-Za-z_][A-Za-z0-9_]*/g, m => `<span class="se-directive">${m}</span>`);
  // Keywords
  r = safeReplace(
    r,
    /\b(query|mutation|subscription|fragment|on|true|false|null|scalar|type|interface|union|enum|input|extend|implements|directive|repeatable|schema)\b/g,
    m => `<span class="se-keyword">${m}</span>`,
  );
  // Type names (PascalCase)
  r = safeReplace(r, /\b([A-Z][A-Za-z0-9_]*)\b/g, m => `<span class="se-type">${m}</span>`);
  // Argument / field names before colon
  r = safeReplace(r, /\b([a-z_][A-Za-z0-9_]*)\s*(?=:)/g, (_, g) => `<span class="se-arg">${g}</span>`);
  // Numbers
  r = safeReplace(r, /-?\d+(?:\.\d+)?/g, m => `<span class="se-number">${m}</span>`);
  return r;
}
