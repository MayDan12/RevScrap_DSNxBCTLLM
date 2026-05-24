"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type SampleResponse = {
  sampleUserIds: string[];
  sampleBusinessIds: string[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const message =
      typeof (json as { error?: unknown } | null)?.error === "string"
        ? String((json as { error?: unknown }).error)
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json as T;
}

export default function HackDemoPage() {
  const [sample, setSample] = useState<SampleResponse | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);

  const [userId, setUserId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [k, setK] = useState(5);

  const [taskALoading, setTaskALoading] = useState(false);
  const [taskAResult, setTaskAResult] = useState<unknown>(null);

  const [taskBLoading, setTaskBLoading] = useState(false);
  const [taskBResult, setTaskBResult] = useState<unknown>(null);

  const [evalLoading, setEvalLoading] = useState(false);
  const [evalResult, setEvalResult] = useState<unknown>(null);

  const [error, setError] = useState<string | null>(null);

  const canRunTaskA = userId.trim().length > 0 && businessId.trim().length > 0;
  const canRunTaskB = userId.trim().length > 0;

  const prettyTaskA = useMemo(
    () => (taskAResult ? JSON.stringify(taskAResult, null, 2) : ""),
    [taskAResult],
  );
  const prettyTaskB = useMemo(
    () => (taskBResult ? JSON.stringify(taskBResult, null, 2) : ""),
    [taskBResult],
  );
  const prettyEval = useMemo(
    () => (evalResult ? JSON.stringify(evalResult, null, 2) : ""),
    [evalResult],
  );

  const loadSamples = async () => {
    setError(null);
    setLoadingSample(true);
    try {
      const data = await fetchJson<SampleResponse>(
        "/api/yelp-mini/sample?limit=25",
      );
      setSample(data);
      if (!userId && data.sampleUserIds.length > 0) {
        setUserId(data.sampleUserIds[0]);
      }
      if (!businessId && data.sampleBusinessIds.length > 0) {
        setBusinessId(data.sampleBusinessIds[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sample IDs");
    } finally {
      setLoadingSample(false);
    }
  };

  const loadEvalReport = async () => {
    setError(null);
    setEvalLoading(true);
    try {
      const report = await fetchJson<unknown>("/api/yelp-mini/eval-report");
      setEvalResult(report);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load evaluation report",
      );
    } finally {
      setEvalLoading(false);
    }
  };

  const runTaskA = async () => {
    setError(null);
    setTaskALoading(true);
    setTaskAResult(null);
    try {
      const result = await fetchJson<unknown>("/api/task-a/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "yelp",
          userId: userId.trim(),
          businessId: businessId.trim(),
          context: { locale: "Nigeria" },
        }),
      });
      setTaskAResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Task A request failed");
    } finally {
      setTaskALoading(false);
    }
  };

  const runTaskB = async () => {
    setError(null);
    setTaskBLoading(true);
    setTaskBResult(null);
    try {
      const result = await fetchJson<unknown>("/api/task-b/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "yelp",
          userId: userId.trim(),
          k,
        }),
      });
      setTaskBResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Task B request failed");
    } finally {
      setTaskBLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      setError(null);
      setLoadingSample(true);
      setEvalLoading(true);
      try {
        const [data, report] = await Promise.all([
          fetchJson<SampleResponse>("/api/yelp-mini/sample?limit=25"),
          fetchJson<unknown>("/api/yelp-mini/eval-report").catch(() => null),
        ]);
        setSample(data);
        if (data.sampleUserIds.length > 0) {
          setUserId((prev) => prev || data.sampleUserIds[0]);
        }
        if (data.sampleBusinessIds.length > 0) {
          setBusinessId((prev) => prev || data.sampleBusinessIds[0]);
        }
        setEvalResult(report);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load demo data");
      } finally {
        setLoadingSample(false);
        setEvalLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <main className="container  px-4 py-10">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Hackathon Demo
            </h1>
            <Badge variant="secondary">Yelp Mini</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Demo UI for Task A (User Modeling) and Task B (Recommendation) using
            a local processed Yelp subset.
          </p>
        </div>

        {error ? (
          <div className="mt-6">
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
              <CardDescription>
                Use sample IDs or paste your own.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadSamples}
                  disabled={loadingSample}
                  className="w-full"
                >
                  {loadingSample ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="h-4 w-4" /> Loading IDs
                    </span>
                  ) : (
                    "Load Sample IDs"
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Paste a Yelp userId"
                />
                {sample?.sampleUserIds?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {sample.sampleUserIds.slice(0, 6).map((id) => (
                      <Button
                        key={id}
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setUserId(id)}
                      >
                        {id.slice(0, 8)}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessId">Business ID (Task A)</Label>
                <Input
                  id="businessId"
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  placeholder="Paste a Yelp businessId"
                />
                {sample?.sampleBusinessIds?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {sample.sampleBusinessIds.slice(0, 6).map((id) => (
                      <Button
                        key={id}
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setBusinessId(id)}
                      >
                        {id.slice(0, 8)}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="k">Top‑K (Task B)</Label>
                <Input
                  id="k"
                  type="number"
                  min={1}
                  max={50}
                  value={k}
                  onChange={(e) => setK(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Run</CardTitle>
              <CardDescription>
                Run both tasks and view raw JSON outputs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="taskA">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="taskA">Task A</TabsTrigger>
                  <TabsTrigger value="taskB">Task B</TabsTrigger>
                  <TabsTrigger value="eval">Eval</TabsTrigger>
                </TabsList>

                <TabsContent value="taskA" className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={runTaskA}
                      disabled={!canRunTaskA || taskALoading}
                    >
                      {taskALoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner className="h-4 w-4" /> Running
                        </span>
                      ) : (
                        "Run Task A"
                      )}
                    </Button>
                    <Badge variant="outline">/api/task-a/review</Badge>
                  </div>

                  <Textarea
                    value={prettyTaskA}
                    readOnly
                    placeholder="Task A output appears here..."
                    className="min-h-[240px] font-mono text-xs"
                  />
                </TabsContent>

                <TabsContent value="taskB" className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={runTaskB}
                      disabled={!canRunTaskB || taskBLoading}
                    >
                      {taskBLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner className="h-4 w-4" /> Running
                        </span>
                      ) : (
                        "Run Task B"
                      )}
                    </Button>
                    <Badge variant="outline">/api/task-b/recommend</Badge>
                  </div>

                  <Textarea
                    value={prettyTaskB}
                    readOnly
                    placeholder="Task B output appears here..."
                    className="min-h-[240px] font-mono text-xs"
                  />
                </TabsContent>

                <TabsContent value="eval" className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={loadEvalReport}
                      disabled={evalLoading}
                    >
                      {evalLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner className="h-4 w-4" /> Loading
                        </span>
                      ) : (
                        "Refresh Eval Report"
                      )}
                    </Button>
                    <Badge variant="outline">eval-report.json</Badge>
                  </div>

                  <Textarea
                    value={prettyEval}
                    readOnly
                    placeholder="Run `pnpm -s yelp:eval` then refresh to see results here."
                    className="min-h-[240px] font-mono text-xs"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
