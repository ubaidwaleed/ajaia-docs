import StarterKit from "@tiptap/starter-kit";

// Shared by the browser editor and the server-side import converter so both
// agree on which nodes/marks exist.
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
    link: { openOnClick: false, autolink: true },
  }),
];
