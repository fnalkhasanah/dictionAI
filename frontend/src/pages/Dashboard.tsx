import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  Download,
  Flame,
  FlaskConical,
  Loader2,
  Moon,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useTheme } from "../components/ui/theme";
import {
  type Endpoint,
  type Filters,
  type Stats,
  type TagCount,
  getEndpoints,
  getStats,
  getTags,
  scrape,
  validateEndpoint,
  validateAll,
  exportData,
  deleteEndpoint,
} from "../lib/api";
import { cn, openTester } from "../lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  "text-generation": "🤖 Text Generation",
  "image-generation": "🎨 Image Generation",
  "audio-tts-stt": "🗣️ Audio/TTS/STT",
  embeddings: "📐 Embeddings",
  translation: "🌐 Translation",
  "search-rag": "🔍 Search/RAG",
  other: "📊 Other",
};

const STATUS_META: Record<string, { label: string; variant: "success" | "danger" | "warning" }> = {
  active: { label: "✅ Active", variant: "success" },
  dead: { label: "❌ Dead", variant: "danger" },
  unknown: { label: "❓ Unknown", variant: "warning" },
};

function StatusBadge({ status }: { status: Endpoint["status"] }) {
  const meta = STATUS_META[status] ?? STATUS_META.unknown;
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function EndpointCard({
  ep,
  onChanged,
}: {
  ep: Endpoint;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<"" | "validate" | "delete">("");
  const [testing, setTesting] = useState(false);

  const meta = STATUS_META[ep.status] ?? STATUS_META.unknown;

  async function handleValidate(id: number) {
    setBusy("validate");
    try {
      const r = await validateEndpoint(id);
      toast.success(`Status: ${r.status} (${r.responseTimeMs ?? "?"}ms)`);
      onChanged();
    } catch (e) {
      toast.error(`Validation failed: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(`Delete endpoint "${ep.name}"?`)) return;
    setBusy("delete");
    try {
      await deleteEndpoint(id);
      toast.success("Endpoint deleted");
      onChanged();
    } catch (e) {
      toast.error(`Delete failed: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5 transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/endpoint/${ep.id}`}
          className="font-semibold hover:text-primary hover:underline"
        >
          {ep.name}
        </Link>
        <StatusBadge status={ep.status} />
      </div>
      <p className="line-clamp-2 text-sm text-muted-foreground">
        {ep.description || "No description"}
      </p>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Badge variant="muted">{CATEGORY_LABELS[ep.category] ?? ep.category}</Badge>
        {ep.provider && <Badge variant="muted">🏢 {ep.provider}</Badge>}
        {ep.requiresAuth ? (
          <Badge variant="warning" title={ep.authNote}>
            🔐 Auth{ep.authNote ? `: ${ep.authNote}` : ""}
          </Badge>
        ) : (
          <Badge variant="success">🔓 No Auth</Badge>
        )}
        {ep.responseTimeMs ? <Badge variant="muted">⚡ {ep.responseTimeMs}ms</Badge> : null}
      </div>
      {ep.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
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
      )}
      <code className="truncate rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
        {ep.url}
      </code>
      <div className="mt-auto flex gap-2 pt-2">
        {ep.url.includes("/v1") && (
          <Button
            size="sm"
            variant="outline"
            disabled={testing}
            onClick={async () => {
              setTesting(true);
              openTester(ep.url);
              // Popup may be blocked; keep the button usable immediately.
              window.setTimeout(() => setTesting(false), 500);
            }}
          >
            <FlaskConical /> Test
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          disabled={busy === "validate"}
          onClick={() => handleValidate(ep.id)}
        >
          {busy === "validate" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Validate
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          disabled={busy === "delete"}
          onClick={() => handleDelete(ep.id)}
        >
          {busy === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />}
          Delete
        </Button>
      </div>
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("rounded-lg p-2.5", accent)}>{icon}</div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function filterFromParams(sp: URLSearchParams): Filters {
  return {
    category: sp.get("category") || undefined,
    status: sp.get("status") || undefined,
    search: sp.get("search") || undefined,
    tag: sp.get("tag") || undefined,
  };
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => filterFromParams(searchParams), [searchParams]);

  const [stats, setStats] = useState<Stats | null>(null);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalBusy, setGlobalBusy] = useState<"" | "scrape" | "validate">("");
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const { theme, toggle } = useTheme();
  const firstRender = useRef(true);

  // Stats + tags load once
  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    getTags().then(setTags).catch(() => {});
  }, []);

  // Endpoints load on filter change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEndpoints(filters)
      .then((r) => {
        if (!cancelled) setEndpoints(r.endpoints);
      })
      .catch((e) => {
        if (!cancelled) toast.error(`Failed to load endpoints: ${(e as Error).message}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  // Debounced search -> URL
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (searchInput) next.set("search", searchInput);
      else next.delete("search");
      if (next.toString() !== searchParams.toString()) setSearchParams(next);
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams());
    setSearchInput("");
  }

  const hasFilters =
    Boolean(filters.category || filters.status || filters.search || filters.tag);

  async function handleScrape() {
    setGlobalBusy("scrape");
    try {
      const r = await scrape();
      toast.success(`Found ${r.totalEndpoints} endpoints (${r.totalErrors} errors)`);
      const s = await getStats();
      setStats(s);
      const t = await getTags();
      setTags(t);
    } catch (e) {
      toast.error(`Scrape failed: ${(e as Error).message}`);
    } finally {
      setGlobalBusy("");
    }
  }

  async function handleValidateAll() {
    setGlobalBusy("validate");
    try {
      const r = await validateAll();
      toast.success(`Validated ${r.total}: ${r.active} active, ${r.dead} dead`);
      const s = await getStats();
      setStats(s);
    } catch (e) {
      toast.error(`Validation failed: ${(e as Error).message}`);
    } finally {
      setGlobalBusy("");
    }
  }

  async function handleExport(format: "json" | "csv") {
    try {
      const r = await exportData(format);
      toast.success(`Exported to ${r.path ?? "data/exports"}`);
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <BookOpen className="h-6 w-6 text-primary" />
            DictionAI
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:block">
            The dictionary of free AI APIs
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href="/tester/" title="Test AI endpoints & API keys">
                <FlaskConical /> Tester
              </a>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle} title="Toggle theme">
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleScrape}
            disabled={globalBusy !== ""}
            className="gap-1.5"
          >
            {globalBusy === "scrape" ? <Loader2 className="animate-spin" /> : <Search />}
            Scrape Now
          </Button>
          <Button
            onClick={handleValidateAll}
            disabled={globalBusy !== ""}
            variant="secondary"
            className="gap-1.5"
          >
            {globalBusy === "validate" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ShieldCheck />
            )}
            Validate All
          </Button>
          <Button
            onClick={() => handleExport("json")}
            variant="outline"
            disabled={globalBusy !== ""}
            className="gap-1.5"
          >
            <Download /> Export JSON
          </Button>
          <Button
            onClick={() => handleExport("csv")}
            variant="outline"
            disabled={globalBusy !== ""}
            className="gap-1.5"
          >
            <Download /> Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total APIs"
            value={stats?.total ?? 0}
            icon={<BookOpen className="h-5 w-5 text-primary" />}
            accent="bg-primary/15"
          />
          <StatCard
            label="Active"
            value={stats?.active ?? 0}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            accent="bg-emerald-500/15"
          />
          <StatCard
            label="Dead"
            value={stats?.dead ?? 0}
            icon={<XCircle className="h-5 w-5 text-red-500" />}
            accent="bg-red-500/15"
          />
          <StatCard
            label="Unknown"
            value={stats?.unknown ?? 0}
            icon={<HelpCircle className="h-5 w-5 text-amber-500" />}
            accent="bg-amber-500/15"
          />
        </div>

        {/* Category chips */}
        {stats && Object.keys(stats.byCategory).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byCategory).map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setFilter("category", cat)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filters.category === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent"
                )}
              >
                {CATEGORY_LABELS[cat] ?? cat} ({count})
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <div className="min-w-48 flex-1">
              <Input
                placeholder="Search APIs..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="w-44">
              <Select
                value={filters.category ?? "all"}
                onValueChange={(v) => setFilter("category", v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.keys(CATEGORY_LABELS).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Select
                value={filters.status ?? "all"}
                onValueChange={(v) => setFilter("status", v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">✅ Active</SelectItem>
                  <SelectItem value="dead">❌ Dead</SelectItem>
                  <SelectItem value="unknown">❓ Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-44">
              <Select
                value={filters.tag ?? "all"}
                onValueChange={(v) => setFilter("tag", v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {tags.map((t) => (
                    <SelectItem key={t.tag} value={t.tag}>
                      {t.tag} ({t.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Endpoints */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">📋 Endpoints ({endpoints.length})</h2>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="space-y-3 p-5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </Card>
            ))}
          </div>
        ) : endpoints.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Flame className="mx-auto mb-2 h-8 w-8" />
              <p>
                No endpoints found. Click <strong>Scrape Now</strong> to discover free AI
                APIs!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {endpoints.map((ep) => (
              <EndpointCard key={ep.id} ep={ep} onChanged={() => getEndpoints(filters).then((r) => setEndpoints(r.endpoints))} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}