import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function SiteNav() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <nav className="border-b border-border bg-paper/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <Link to="/" className="font-mono hover:text-foreground">
          Notamín · v.1
        </Link>
        <div className="flex items-center gap-5 font-mono">
          <Link
            to="/"
            activeProps={{ className: "text-foreground" }}
            activeOptions={{ exact: true }}
            className="hover:text-foreground"
          >
            planilha
          </Link>
          <Link
            to="/abnt"
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground"
          >
            trabalho abnt
          </Link>
          {user ? (
            <button onClick={logout} className="hover:text-foreground" title={user.email ?? ""}>
              sair
            </button>
          ) : (
            <Link
              to="/login"
              activeProps={{ className: "text-foreground" }}
              className="hover:text-foreground"
            >
              entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}