"use client";

import { type Editor, useEditorState } from "@tiptap/react";

type Btn = {
  label: React.ReactNode;
  title: string;
  run: (e: Editor) => void;
  active?: (e: Editor) => boolean;
  disabled?: (e: Editor) => boolean;
};

const GROUPS: Btn[][] = [
  [
    { label: "↶", title: "Undo (Ctrl+Z)", run: (e) => e.chain().focus().undo().run(), disabled: (e) => !e.can().undo() },
    { label: "↷", title: "Redo (Ctrl+Shift+Z)", run: (e) => e.chain().focus().redo().run(), disabled: (e) => !e.can().redo() },
  ],
  [
    { label: "Normal", title: "Normal text", run: (e) => e.chain().focus().setParagraph().run(), active: (e) => e.isActive("paragraph") },
    ...([1, 2, 3] as const).map(
      (level): Btn => ({
        label: `H${level}`,
        title: `Heading ${level}`,
        run: (e) => e.chain().focus().toggleHeading({ level }).run(),
        active: (e) => e.isActive("heading", { level }),
      }),
    ),
  ],
  [
    { label: <b>B</b>, title: "Bold (Ctrl+B)", run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive("bold") },
    { label: <i>I</i>, title: "Italic (Ctrl+I)", run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive("italic") },
    { label: <u>U</u>, title: "Underline (Ctrl+U)", run: (e) => e.chain().focus().toggleUnderline().run(), active: (e) => e.isActive("underline") },
    { label: <s>S</s>, title: "Strikethrough", run: (e) => e.chain().focus().toggleStrike().run(), active: (e) => e.isActive("strike") },
  ],
  [
    { label: "• List", title: "Bulleted list", run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive("bulletList") },
    { label: "1. List", title: "Numbered list", run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive("orderedList") },
    { label: "❝", title: "Quote", run: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive("blockquote") },
  ],
];

const ALL = GROUPS.flat();

export function Toolbar({ editor }: { editor: Editor }) {
  // Re-render only when the active/disabled state of a button actually changes.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ALL.map((b) => [b.active?.(e) ?? false, b.disabled?.(e) ?? false] as const),
  });

  let i = 0;
  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1">
      {GROUPS.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5 border-r border-slate-200 pr-1 last:border-r-0">
          {group.map((b) => {
            const [active, disabled] = state[i++];
            return (
              <button
                key={b.title}
                type="button"
                title={b.title}
                aria-label={b.title}
                aria-pressed={b.active ? active : undefined}
                disabled={disabled}
                onMouseDown={(ev) => ev.preventDefault()} // keep editor selection
                onClick={() => b.run(editor)}
                className={`min-w-8 rounded px-2 py-1 text-sm transition-colors disabled:opacity-30 ${
                  active ? "bg-blue-100 text-blue-800" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
