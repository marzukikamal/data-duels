import { useAppStore } from './store';

const App = () => {
  const {
    title,
    sql,
    lastQuery,
    dataset,
    results,
    resultStatus,
    attemptsUsed,
    challengeKey,
    isRunning,
    error,
    solutionSql,
    updateSql,
    runSql,
    submitAnswer,
  } = useAppStore();

  const attemptsLeft = Math.max(0, 5 - attemptsUsed);
  const showSolution = attemptsUsed >= 5 && resultStatus !== 'correct';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/70">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Daily SQL Duel</p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-xs text-zinc-500">Challenge #{challengeKey}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 px-4 py-3 text-xs text-zinc-400">
            Attempts left today: {attemptsLeft}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[1.2fr,1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6">
            <h2 className="text-lg font-semibold">Boardroom Alert</h2>
            <p className="mt-2 text-sm text-zinc-400">
              A revenue-critical outage report is due in 15 minutes. Pull the exact incidents that
              must be escalated to the exec on-call list. The answer is unique and must match
              precisely.
            </p>
            <div className="mt-4 grid gap-3 text-sm text-zinc-300">
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                Priority services: payments, auth
              </div>
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                Signals: error_rate, duration_min, affected_users
              </div>
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                Dataset size: {dataset.length} incidents
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">SQL Editor (DuckDB)</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Table: incidents(id, service, severity, duration_min, error_rate, affected_users)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-indigo-500/60 px-4 py-2 text-xs uppercase tracking-widest text-indigo-300 transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    void runSql();
                  }}
                  type="button"
                  disabled={isRunning || attemptsLeft === 0}
                >
                  {isRunning ? 'Running...' : 'Run SQL'}
                </button>
                <button
                  className="rounded-full border border-emerald-500/60 px-4 py-2 text-xs uppercase tracking-widest text-emerald-300 transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={submitAnswer}
                  type="button"
                  disabled={attemptsLeft === 0}
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
                disabled={attemptsLeft === 0}
              />
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Example: SELECT * FROM incidents WHERE severity IN (&apos;critical&apos;,&apos;high&apos;)
              AND error_rate &gt;= 0.08 ORDER BY error_rate DESC;
            </p>
            {error && (
              <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                {error}
              </div>
            )}
          </div>

          {showSolution && (
            <div className="rounded-3xl border border-amber-500/50 bg-amber-500/10 p-6">
              <h3 className="text-base font-semibold text-amber-200">Solution Revealed</h3>
              <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-100">
                {solutionSql}
              </pre>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6">
            <h3 className="text-base font-semibold">Submission Status</h3>
            <p className="mt-3 text-sm text-zinc-400">
              {resultStatus === 'pending' && 'Run your query and submit once per attempt.'}
              {resultStatus === 'correct' && 'Correct. You matched the escalation list.'}
              {resultStatus === 'incorrect' &&
                'Incorrect. Adjust your SQL and try again until attempts run out.'}
            </p>
            <div className="mt-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4 text-xs text-zinc-400">
              Attempts used: {attemptsUsed} / 5
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Query Results</h3>
              <span className="text-xs uppercase tracking-widest text-zinc-500">
                {results.length} rows
              </span>
            </div>
            <div className="mt-4 overflow-auto rounded-2xl border border-zinc-800/70">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950/60 text-xs uppercase tracking-widest text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">id</th>
                    <th className="px-4 py-3">service</th>
                    <th className="px-4 py-3">severity</th>
                    <th className="px-4 py-3">duration</th>
                    <th className="px-4 py-3">error_rate</th>
                    <th className="px-4 py-3">affected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {results.length === 0 && (
                    <tr>
                      <td className="px-4 py-4 text-zinc-500" colSpan={6}>
                        Run SQL to see results.
                      </td>
                    </tr>
                  )}
                  {results.map((row) => (
                    <tr key={row.id} className="text-zinc-200">
                      <td className="px-4 py-3 font-mono text-xs">{row.id}</td>
                      <td className="px-4 py-3">{row.service}</td>
                      <td className="px-4 py-3">{row.severity}</td>
                      <td className="px-4 py-3">{row.durationMin}m</td>
                      <td className="px-4 py-3">{row.errorRate.toFixed(3)}</td>
                      <td className="px-4 py-3">{row.affectedUsers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Last query: {lastQuery ? 'executed' : 'not run yet'}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
