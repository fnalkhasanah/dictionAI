import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  FlaskConical,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { useTheme } from "../components/ui/theme";
import {
  type Endpoint,
  getEndpoint,
  validateEndpoint,
  deleteEndpoint,
} from "../lib/api";
import { cn, openTester } from "../lib/utils";

const STATUS_META: Record<string, { label: string; variant: "success" | "danger" | "warning" }> = {
  active: { label: "✅ ACTIVE", variant: "success" },
  dead: { label: "❌ DEAD", variant: "danger" },
  unknown: { label: "❓ UNKNOWN", variant: "warning" },
};

export default function EndpointDetail() {
  const { id } = useParams<{ id: string }>();
  const [ep, setEp] = useState<Endpoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<"" | "validate" | "delete">("");
  const { theme, toggle } = useTheme();

  async function load() {
    if (!id) return;
    const num = Number(id);
    setLoading(true);
    try {
      const e = await getEndpoint(num);
      setEp(e);
      setNotFound(false);
    } catch (e) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleValidate() {
    if (!ep) return;
    setBusy("validate");
    try {
      const r = await validateEndpoint(ep.id);
      toast.success(`Status: ${r.status} (${r.responseTimeMs ?? "?"}ms)`);
      await load();
    } catch (e) {
      toast.error(`Validation failed: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  }

  async function handleDelete() {
    if (!ep) return;
    if (!confirm(`Delete endpoint "${ep.name}"?`)) return;
    setBusy("delete");
    try {
      await deleteEndpoint(ep.id);
      toast.success("Endpoint deleted");
      window.setTimeout(() => (window.location.href = "/"), 600);
    } catch (e) {
      toast.error(`Delete failed: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <BookOpen className="h-6 w-6 text-primary" />
            DictionAI
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href="/tester/" title="Test AI endpoints & API keys">
                <FlaskConical /> Tester
              </a>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle} title="Toggle theme">
              {theme === "dark" ? "☀️" : "🌙"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/">
            <ArrowLeft /> Back to Dashboard
          </Link>
        </Button>

        {loading ? (
          <Card className="space-y-3 p-6">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        ) : notFound || !ep ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-lg font-semibold">Endpoint not found</p>
              <p className="mt-1 text-sm">It may have been deleted.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-xl">{ep.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ep.description || "No description available."}
                  </p>
                </div>
                {(() => {
                  const meta = STATUS_META[ep.status] ?? STATUS_META.unknown;
                  return (
                    <Badge variant={meta.variant} className="shrink-0 text-sm">
                      {meta.label}
                    </Badge>
                  );
                })()}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <code className="break-all text-sm">{ep.url}</code>
                    <a
                      href={ep.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 shrink-0 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Open →
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Category</div>
                    <div className="font-medium">{ep.category}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Provider</div>
                    <div className="font-medium">{ep.provider || "Unknown"}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Authentication</div>
                    <div className="font-medium">
                      {ep.requiresAuth ? `Required${ep.authNote ? ` — ${ep.authNote}` : ""}` : "Not Required"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Response Time</div>
                    <div className="font-medium">
                      {ep.responseTimeMs ? `${ep.responseTimeMs}ms` : "Not checked"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Last Checked</div>
                    <div className="font-medium">
                      {ep.lastChecked ? new Date(ep.lastChecked).toLocaleString() : "Never"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Source</div>
                    <div className="font-medium">{ep.source}</div>
                  </div>
                </div>

                {ep.tags.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-xs text-muted-foreground">Tags</div>
                    <div className="flex flex-wrap gap-1.5">
                      {ep.tags.map((t) => (
                        <Link
                          key={t}
                          to={`/?tag=${encodeURIComponent(t)}`}
                          className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
                        >
                          {t}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={handleValidate} disabled={busy !== ""}>
                    {busy === "validate" ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RefreshCw />
                    )}
                    Validate Now
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => openTester(ep.url)}
                  >
                    <FlaskConical /> Test in Tester
                  </Button>
                  <Button
                    variant="outline"
                    className={cn("text-destructive hover:bg-destructive/10")}
                    disabled={busy === "delete"}
                    onClick={handleDelete}
                  >
                    {busy === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />}
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}