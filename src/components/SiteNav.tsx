import { Link } from "@tanstack/react-router";

export function SiteNav() {
  return (
    <nav className="border-b border-border bg-paper/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <Link to="/abnt" className="font-mono hover:text-foreground">
          Notamín · v.1
        </Link>
        <div className="flex items-center gap-5 font-mono">
          <Link
            to="/abnt"
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground"
          >
            trabalho abnt
          </Link>
        </div>
      </div>
    </nav>
  );
}
