import { useMemo } from 'react';
import { useAppStore } from './store';

const buildArchive = (count: number): string[] => {
  const today = new Date();
  return Array.from({ length: count }, (_, idx) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - idx);
    return date.toLocaleDateString('en-CA', { timeZone: 'UTC' });
  });
};

const App = () => {
  const {
    title,
    sql,
    lastQuery,
    lastAnswer,
    dataset,
    resultStatus,
    attemptsUsed,
    challengeKey,
    isRunning,
    error,
    solutionSql,
    updateSql,
    runSql,
    submitAnswer,
    setChallengeKey,
  } = useAppStore();

  const attemptsLeft = Math.max(0, 5 - attemptsUsed);
  const showSolution = attemptsUsed >= 5 && resultStatus !== 'correct';
  const archive = useMemo(() => buildArchive(30), []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/70">
        <div className="mx-auto w-full max-w-6xl px-6 py-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Daily SQL Duel</p>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1 text-xs text-zinc-500">Challenge #{challengeKey}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 px-4 py-2 text-xs text-zinc-400">
              Attempts left today: {attemptsLeft}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-4 sm:p-6">
              <h2 className="text-lg font-semibold">Boardroom Alert</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Finance leadership needs a single number: how many incidents must be escalated
                right now. Return the exact count based on the rules below. The answer is
                unambiguous.
              </p>
              <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-3">
                  Escalate incidents where severity is critical or high.
                </div>
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-3">
                  Only include services: payments, auth.
                </div>
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-3">
                  Thresholds: error_rate ≥ 0.08 and duration_min ≥ 30.
                </div>
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-3">
                  Dataset size: {dataset.length} incidents.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">SQL Editor (DuckDB)</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Return one numeric column named `answer`.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-full border border-indigo-500/60 px-4 py-2 text-xs uppercase tracking-widest text-indigo-300 transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => {
                      void runSql();
                    }}
                    type="button"
                    disabled={isRunning}
                  >
                    {isRunning ? 'Running...' : 'Run SQL'}
                  </button>
                  <button
                    className="rounded-full border border-emerald-500/60 px-4 py-2 text-xs uppercase tracking-widest text-emerald-300 transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={submitAnswer}
                  type="button"
                  disabled={attemptsLeft === 0 || resultStatus === 'correct'}
                >
                  Submit Answer
                </button>
              </div>
              </div>
              <div className="mt-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-3">
                <textarea
                  className="h-56 w-full resize-none bg-transparent text-sm text-zinc-100 outline-none"
                  value={sql}
                  onChange={(event) => updateSql(event.target.value)}
                />
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Example: SELECT COUNT(*) AS answer FROM incidents WHERE severity IN
                (&apos;critical&apos;,&apos;high&apos;) AND error_rate &gt;= 0.08;
              </p>
              {error && (
                <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                  {error}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-4 sm:p-6">
              <h3 className="text-base font-semibold">Latest Query Output</h3>
              <div className="mt-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Answer</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-300">
                  {lastAnswer === null ? '-' : lastAnswer}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Last query: {lastQuery ? 'executed' : 'not run yet'}
                </p>
              </div>
            </div>

            {showSolution && (
              <div className="rounded-3xl border border-amber-500/50 bg-amber-500/10 p-4 sm:p-6">
                <h3 className="text-base font-semibold text-amber-200">Solution Revealed</h3>
                <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-100">
                  {solutionSql}
                </pre>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-4 sm:p-6">
              <h3 className="text-base font-semibold">Submission Status</h3>
              <p className="mt-3 text-sm text-zinc-400">
                {resultStatus === 'pending' && 'Run your query and submit when ready.'}
                {resultStatus === 'correct' && 'Correct. You delivered the exact count.'}
                {resultStatus === 'incorrect' &&
                  'Incorrect. Adjust your SQL and try again until attempts run out.'}
              </p>
              <div className="mt-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4 text-xs text-zinc-400">
                Attempts used: {attemptsUsed} / 5
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-4 sm:p-6">
              <h3 className="text-base font-semibold">Archive</h3>
              <p className="mt-2 text-xs text-zinc-500">
                Play any of the last 30 daily challenges you have not completed.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {archive.map((key) => (
                  <button
                    key={key}
                    className={`rounded-full border px-3 py-2 text-center uppercase tracking-widest transition ${
                      key === challengeKey
                        ? 'border-emerald-400 text-emerald-200'
                        : 'border-zinc-800/70 text-zinc-400 hover:border-zinc-600'
                    }`}
                    type="button"
                    onClick={() => setChallengeKey(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default App;
