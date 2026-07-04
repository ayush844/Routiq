"use client";

import { useState, useTransition } from "react";
import { Copy, Check, RefreshCw, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateApiKey,
  regenerateApiKey,
  type ApiKeyMetadata,
} from "@/actions/api-key";

interface ApiKeySectionProps {
  initialData: ApiKeyMetadata;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function ApiKeySection({ initialData }: ApiKeySectionProps) {
  const [metadata, setMetadata] = useState(initialData);
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = metadata.exists
        ? await regenerateApiKey()
        : await generateApiKey();

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setPlaintextKey(result.key);
      setMetadata((prev) => ({
        ...prev,
        exists: true,
        createdAt: new Date(),
        lastUsedAt: null,
        revokedAt: null,
      }));
    });
  }

  async function handleCopy() {
    if (!plaintextKey) return;
    await navigator.clipboard.writeText(plaintextKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-[32px] border border-ink/10 bg-white p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal/10">
          <KeyRound className="h-5 w-5 text-signal" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-ink">API Key</h2>
          <p className="text-sm text-muted">
            Use this key to authenticate the Routiq CLI.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-ink/10 bg-lifted p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Key
          </p>
          <p className="mt-1 break-all font-mono text-sm text-ink">
            {plaintextKey ?? metadata.masked}
          </p>
        </div>

        {plaintextKey && (
          <div className="flex items-start gap-3 rounded-2xl border border-signal/20 bg-signal/5 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
            <p className="text-sm text-charcoal">
              Copy your API key now. For security, it cannot be viewed again
              after you leave this page.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Created At
            </p>
            <p className="mt-1 text-sm text-ink">
              {formatDate(metadata.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Last Used
            </p>
            <p className="mt-1 text-sm text-ink">
              {formatDate(metadata.lastUsedAt)}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-signal">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleGenerate}
            disabled={isPending}
            variant={metadata.exists ? "outline" : "default"}
          >
            <RefreshCw
              className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            />
            {metadata.exists ? "Regenerate" : "Generate"}
          </Button>

          {plaintextKey && (
            <Button variant="secondary" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Key
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
