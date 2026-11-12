import type { ReactNode } from "react";

// Small chat markdown: paragraphs, lists, bold, italic, code, links. No raw HTML.
const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

function hostOf(href: string) {
  try {
    return new URL(href).hostname;
  } catch {
    return href;
  }
}

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = m.index;
    if (m[1] !== undefined) out.push(<strong key={key}>{renderInline(m[1])}</strong>);
    else if (m[2] !== undefined) out.push(<em key={key}>{renderInline(m[2])}</em>);
    else if (m[3] !== undefined) out.push(<code key={key}>{m[3]}</code>);
    else
      out.push(
        <span key={key}>
          <a href={m[5]} target="_blank" rel="noopener noreferrer" className="text-focus underline">
            {m[4]}
          </a>
          {/* The model chose the label, so the real host is shown next to it. */}
          <span className="ml-1 text-xs text-fg-3">({hostOf(m[5]!)})</span>
        </span>
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;

// The streaming caret sits at the end of the last block.
const Caret = () => (
  <span aria-hidden className="caret ml-[3px] inline-block h-[18px] w-[9px] rounded-[2px] bg-accent align-[-3px]" />
);

function renderBlock(block: string, key: number, caret: boolean): ReactNode {
  const lines = block.split("\n");
  const ordered = NUMBER.test(lines[0] ?? "");
  const re = ordered ? NUMBER : BULLET;
  if (lines.every((l) => re.test(l))) {
    const items = lines.map((l, i) => (
      <li key={i}>
        {renderInline(l.replace(re, "$1"))}
        {caret && i === lines.length - 1 && <Caret />}
      </li>
    ));
    return ordered ? (
      <ol key={key} className="m-0 flex list-decimal flex-col gap-1 pl-5">{items}</ol>
    ) : (
      <ul key={key} className="m-0 flex list-disc flex-col gap-1 pl-5">{items}</ul>
    );
  }
  const parts = lines.flatMap((l, i) => (i ? [<br key={`b${i}`} />, ...renderInline(l)] : renderInline(l)));
  return (
    <p key={key} className="m-0">
      {parts}
      {caret && <Caret />}
    </p>
  );
}

export function Markdown({ text, className, caret }: { text: string; className?: string; caret?: boolean }) {
  const blocks = text.trim().split(/\n{2,}/).filter(Boolean);
  return (
    <div data-selectable className={className}>
      {blocks.map((b, i) => renderBlock(b, i, !!caret && i === blocks.length - 1))}
    </div>
  );
}
