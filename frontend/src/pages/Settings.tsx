import { Eye, EyeOff, KeyRound, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { TopicQueue } from "../components/settings/TopicQueue";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { ThemeSegmentedControl } from "../components/ui/ThemeSegmentedControl";
import { useToast } from "../hooks/useToast";

export function Settings() {
  const [showKeys, setShowKeys] = useState(false);
  const [sources, setSources] = useState(5);
  const [autoPublish, setAutoPublish] = useState(true);
  const [tone, setTone] = useState("Professional");
  const toast = useToast();

  return (
    <PageWrapper>
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--accent-secondary)]">Control center</p>
        <h1 className="font-display text-4xl font-extrabold text-[var(--text-primary)]">Settings</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Appearance</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Choose a fixed theme or follow your system preference.
          </p>
          <div className="mt-5">
            <ThemeSegmentedControl />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">API Configuration</h2>
          <div className="mt-5 space-y-4">
            <SecretField label="Groq API Key" show={showKeys} />
            <SecretField label="Tavily API Key" show={showKeys} />
            <Button variant="secondary" onClick={() => setShowKeys((value) => !value)}>
              {showKeys ? <EyeOff size={17} /> : <Eye size={17} />}
              {showKeys ? "Hide keys" : "Show keys"}
            </Button>
            <Button onClick={() => toast.success("API reachable", "Groq and Tavily configuration is available to the app.", { persistToNotifications: false })}>
              <KeyRound size={17} />
              Test Connection
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Pipeline Defaults</h2>
          <div className="mt-5 space-y-5">
            <label className="block text-sm font-bold text-[var(--text-secondary)]">
              Max research sources: {sources}
              <input className="mt-3 w-full accent-[var(--accent-primary)]" type="range" min={1} max={10} value={sources} onChange={(event) => setSources(Number(event.target.value))} />
            </label>
            <label className="block text-sm font-bold text-[var(--text-secondary)]">
              Default content length
              <select className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 text-[var(--text-primary)]">
                <option>Short 400w</option>
                <option>Medium 800w</option>
                <option>Long 1200w</option>
              </select>
            </label>
            <div>
              <p className="mb-2 text-sm font-bold text-[var(--text-secondary)]">Default tone</p>
              <div className="flex flex-wrap gap-2">
                {["Professional", "Casual", "Technical"].map((item) => (
                  <button
                    key={item}
                    className={`rounded-full border px-4 py-2 text-sm font-bold ${tone === item ? "border-[var(--accent-primary)] bg-[var(--accent-glow)]" : "border-[var(--border)] bg-white/[0.03] text-[var(--text-secondary)]"}`}
                    onClick={() => setTone(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white/[0.03] p-4 text-sm font-bold text-[var(--text-secondary)]">
              Auto-publish
              <input type="checkbox" checked={autoPublish} onChange={(event) => setAutoPublish(event.target.checked)} className="h-5 w-5 accent-[var(--accent-primary)]" />
            </label>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Schedule Settings</h2>
          <div className="mt-5 space-y-4">
            <select className="h-12 w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 text-[var(--text-primary)]">
              <option>Every 2h</option>
              <option>Every 4h</option>
              <option>Every 6h</option>
              <option>Every 12h</option>
              <option>Every 24h</option>
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input type="time" defaultValue="09:00" />
              <Input type="time" defaultValue="18:00" />
            </div>
            <TopicQueue />
          </div>
        </Card>

        <Card className="border-red-400/20 p-6">
          <h2 className="font-display text-2xl font-bold text-red-100">Danger Zone</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Destructive actions require confirmation in production.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="danger" onClick={() => toast.error("Action disabled", "Clear all content is disabled in demo mode.", { persistToNotifications: false })}>
              <Trash2 size={17} />
              Clear all content
            </Button>
            <Button variant="danger" onClick={() => toast.info("Reset requested", "Pipeline state reset was requested.", { persistToNotifications: false })}>
              <RotateCcw size={17} />
              Reset pipeline state
            </Button>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}

function SecretField({ label, show }: { label: string; show: boolean }) {
  return (
    <label className="block text-sm font-bold text-[var(--text-secondary)]">
      {label}
      <Input className="mt-2 font-mono" type={show ? "text" : "password"} defaultValue="configured-in-env-file" />
    </label>
  );
}
