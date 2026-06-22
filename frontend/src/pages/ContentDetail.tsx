import {
  ArrowLeft,
  BriefcaseBusiness,
  Copy,
  Expand,
  PenLine,
  RefreshCw,
  Shrink,
  Trash2,
  TrendingUp,
  Type,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { useContentDetail, useDeleteContent, useRegenerateContent } from "../hooks/useContent";
import { useToast } from "../hooks/useToast";
import { formatDate, formatScore, scoreColor } from "../lib/utils";
import type { ContentRegenerateAction } from "../types";

export function ContentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: content, isLoading } = useContentDetail(id);
  const deleteContent = useDeleteContent();
  const regenerateContent = useRegenerateContent();
  const toast = useToast();
  const [activeAction, setActiveAction] = useState<ContentRegenerateAction | null>(null);

  async function copyArticle() {
    await navigator.clipboard.writeText(content?.body || "");
    toast.success("Article copied", "The full article body was copied to the clipboard.", {
      persistToNotifications: false,
    });
  }

  async function removeArticle() {
    if (!content) return;
    await deleteContent.mutateAsync(content.id);
  }

  async function runRegeneration(action: ContentRegenerateAction) {
    if (!content || regenerateContent.isPending) return;
    setActiveAction(action);
    toast.info("AI edit started", `${regenerationLabel(action)} is running on this article.`, {
      persistToNotifications: false,
    });
    try {
      await regenerateContent.mutateAsync({ id: content.id, action });
    } finally {
      setActiveAction(null);
    }
  }

  if (isLoading || !content) {
    return <PageWrapper><Skeleton className="h-[640px]" /></PageWrapper>;
  }

  return (
    <PageWrapper>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div>
          <Button variant="ghost" onClick={() => navigate("/content")}>
            <ArrowLeft size={17} />
            Back to library
          </Button>
          <article className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/70 p-6 backdrop-blur-xl lg:p-10">
            <p className="text-sm font-bold uppercase tracking-wide text-[var(--accent-secondary)]">{content.topic}</p>
            <h1 className="mt-3 max-w-4xl font-display text-4xl font-extrabold leading-tight text-[var(--text-primary)]">
              {content.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
              <span>{formatDate(content.publishedAt || content.createdAt)}</span>
              <span>{content.wordCount} words</span>
              <span>{content.readTime}</span>
              <span>{content.tags[0] || "content"}</span>
            </div>
            <ArticleBody body={content.body} title={content.title} />
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={copyArticle}><Copy size={17} />Copy</Button>
              <Button variant="secondary" disabled={regenerateContent.isPending} onClick={() => runRegeneration("professional_tone")}>
                <PenLine size={17} />
                Re-edit
              </Button>
              <Button variant="danger" disabled={deleteContent.isPending || regenerateContent.isPending} onClick={removeArticle}>
                <Trash2 size={17} />
                Delete
              </Button>
            </div>
          </article>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24">
          <RegenerateControls
            activeAction={activeAction}
            disabled={deleteContent.isPending}
            isPending={regenerateContent.isPending}
            onRun={runRegeneration}
          />
          <Card className="p-5">
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">Quality Scores</h2>
            <div className="mt-5 space-y-4">
              <ScoreBar label="Readability" value={content.readabilityScore} />
              <ScoreBar label="SEO Score" value={content.seoScore} />
              <ScoreBar label="Engagement" value={content.engagementScore} />
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">Meta Info</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{content.metaDescription}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {content.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
                  {tag}
                </span>
              ))}
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[var(--text-muted)]">Scheduled</dt><dd>{formatDate(content.scheduledAt)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--text-muted)]">Published</dt><dd>{formatDate(content.publishedAt)}</dd></div>
            </dl>
          </Card>
          <Card className="p-5">
            <details>
              <summary className="cursor-pointer font-display text-xl font-bold text-[var(--text-primary)]">
                Raw Pipeline State
              </summary>
              <pre className="mt-4 max-h-80 overflow-auto rounded-2xl bg-black/30 p-4 font-mono text-xs text-[var(--accent-secondary)]">
                {JSON.stringify(content, null, 2)}
              </pre>
            </details>
          </Card>
        </aside>
      </div>
    </PageWrapper>
  );
}

const REGENERATION_CONTROLS: Array<{
  action: ContentRegenerateAction;
  label: string;
  description: string;
  Icon: LucideIcon;
}> = [
  {
    action: "regenerate_title",
    label: "Regenerate title",
    description: "Create a sharper headline while keeping the article body intact.",
    Icon: Type,
  },
  {
    action: "rewrite_intro",
    label: "Rewrite intro",
    description: "Replace the opening with a stronger hook and clearer setup.",
    Icon: PenLine,
  },
  {
    action: "improve_seo",
    label: "Improve SEO",
    description: "Improve search intent, headings, meta description, and tags.",
    Icon: TrendingUp,
  },
  {
    action: "professional_tone",
    label: "Make professional",
    description: "Polish the article into a more credible editorial tone.",
    Icon: BriefcaseBusiness,
  },
  {
    action: "shorten_article",
    label: "Shorten article",
    description: "Cut repetition and tighten the piece while preserving value.",
    Icon: Shrink,
  },
  {
    action: "expand_article",
    label: "Expand article",
    description: "Add depth, examples, context, and practical implications.",
    Icon: Expand,
  },
];

function RegenerateControls({
  activeAction,
  disabled,
  isPending,
  onRun,
}: {
  activeAction: ContentRegenerateAction | null;
  disabled: boolean;
  isPending: boolean;
  onRun: (action: ContentRegenerateAction) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-glow)] text-[var(--accent-primary)]">
          <WandSparkles size={20} />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">Regenerate Controls</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
            Run focused AI edits and save the updated article.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {REGENERATION_CONTROLS.map(({ action, label, description, Icon }) => {
          const isActive = activeAction === action;
          return (
            <button
              key={action}
              type="button"
              disabled={disabled || isPending}
              onClick={() => onRun(action)}
              className="group flex w-full items-start gap-3 rounded-2xl border border-[var(--border)] bg-white/[0.035] p-3 text-left transition hover:border-[var(--border-active)] hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-[var(--accent-secondary)] transition group-hover:text-[var(--text-primary)]">
                {isActive ? <RefreshCw className="animate-spin" size={17} /> : <Icon size={17} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[var(--text-primary)]">
                  {label}
                  {isActive ? "..." : ""}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">{description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {isPending ? (
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-black/20 p-3 text-xs font-medium text-[var(--text-secondary)]">
          The article will refresh automatically when the AI edit finishes.
        </div>
      ) : null}
    </Card>
  );
}

function regenerationLabel(action: ContentRegenerateAction): string {
  return REGENERATION_CONTROLS.find((control) => control.action === action)?.label || "AI edit";
}

function ArticleBody({ body, title }: { body: string; title: string }) {
  const blocks = parseArticleBody(body, title);

  return (
    <div className="prose-body mx-auto mt-10 max-w-[720px] font-sans text-lg leading-8 text-[var(--text-primary)]">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Heading = block.level === 3 ? "h3" : "h2";
          return <Heading key={`${block.text}-${index}`}>{renderInlineMarkdown(block.text)}</Heading>;
        }
        if (block.type === "list") {
          return (
            <ul key={`${block.items.join("-")}-${index}`}>
              {block.items.map((item) => <li key={item}>{renderInlineMarkdown(item)}</li>)}
            </ul>
          );
        }
        return <p key={`${block.text}-${index}`}>{renderInlineMarkdown(block.text)}</p>;
      })}
    </div>
  );
}

type ArticleBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

function parseArticleBody(body: string, title: string): ArticleBlock[] {
  const lines = body.split(/\r?\n/);
  const blocks: ArticleBlock[] = [];
  const paragraph: string[] = [];
  const listItems: string[] = [];
  const normalizedTitle = normalizeForCompare(title);

  function flushParagraph() {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph.length = 0;
    }
  }

  function flushList() {
    if (listItems.length) {
      blocks.push({ type: "list", items: [...listItems] });
      listItems.length = 0;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^[=-]{4,}$/.test(line)) {
      continue;
    }

    const withoutHeadingPrefix = line.replace(/^#{1,6}\s*/, "");
    if (normalizeForCompare(withoutHeadingPrefix) === normalizedTitle) {
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 3, text: line.slice(4).trim() });
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 2, text: line.slice(3).trim() });
      continue;
    }

    if (/^\*\*[^*]+\*\*$/.test(line) && line.length < 140) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 2, text: line.replaceAll("**", "") });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      listItems.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function normalizeForCompare(value: string): string {
  return value
    .replaceAll("*", "")
    .replace(/^headline:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-bold text-[var(--text-secondary)]">{label}</span>
        <span className="font-mono text-[var(--text-primary)]">{formatScore(value)} / 10</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value * 10}%`, background: scoreColor(value) }} />
      </div>
    </div>
  );
}
