import type { Access } from "@/lib/access";

const STYLES: Record<Access, string> = {
  owner: "bg-blue-50 text-blue-700 ring-blue-200",
  editor: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  viewer: "bg-amber-50 text-amber-700 ring-amber-200",
};

const LABELS: Record<Access, string> = { owner: "Owner", editor: "Can edit", viewer: "View only" };

export function RoleBadge({ access }: { access: Access }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[access]}`}>
      {LABELS[access]}
    </span>
  );
}
