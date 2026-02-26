import { useAppStore } from './store';

const App = () => {
  const {
    title,
    hasStarted,
    sql,
    lastQuery,
    dataset,
    results,
    score,
    round,
    history,
    leaderboard,
    isRunning,
    error,
    start,
    updateSql,
    runSql,
    scoreRun,
    nextRound,
    resetMatch,
  } = useAppStore();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {!hasStarted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 px-6">
          <div className="max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Data Duels</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-100">
              Incident Triage Arena
            </h1>
            <p className="mt-4 text-sm text-zinc-400">
              You are the on-call data analyst. Use SQL to identify the most urgent incidents
              across services. Your query is scored on accuracy and efficiency.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                className="rounded-full bg-zinc-100 px-6 py-3 text-xs uppercase tracking-widest text-zinc-950 transition hover:bg-white"
                onClick={start}
                type="button"
              >
                Start Mission
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="border-b border-zinc-800/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Ops Arena</p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-xs text-zinc-500">Incident Triage - Round {round}</p>
          </div>
          <div className="flex gap-3">
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
              className="rounded-full border border-emerald-500/60 px-4 py-2 text-xs uppercase tracking-widest text-emerald-300 transition hover:border-emerald-400"
              onClick={scoreRun}
              type="button"
            >
              Score Run
            </button>
            <button
              className="rounded-full border border-sky-500/60 px-4 py-2 text-xs uppercase tracking-widest text-sky-300 transition hover:border-sky-400"
              onClick={nextRound}
              type="button"
            >
              Next Round
            </button>
            <button
              className="rounded-full border border-rose-500/60 px-4 py-2 text-xs uppercase tracking-widest text-rose-300 transition hover:border-rose-400"
              onClick={resetMatch}
              type="button"
            >
              Reset Match
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[2fr,1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6">
            <h2 className="text-lg font-semibold">Mission Brief</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Identify high-impact incidents affecting critical services. Return the incident rows
              that should be escalated to the on-call lead. Score balances accuracy with query
              efficiency.
            </p>
            <div className="mt-4 grid gap-3 text-sm text-zinc-300">
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                Priority services: payments, auth
              </div>
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                Signals: error_rate, duration_min, affected_users
              </div>
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                Goal: find critical and high severity incidents with elevated error rate
              </div>
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                Dataset size: {dataset.length} incidents
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">SQL Editor (DuckDB)</h3>
              <span className="text-xs uppercase tracking-widest text-zinc-500">incidents</span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Table columns: id, service, severity, duration_min, error_rate, affected_users
            </p>
            <div className="mt-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-3">
              <textarea
                className="h-48 w-full resize-none bg-transparent text-sm text-zinc-100 outline-none"
                value={sql}
                onChange={(event) => updateSql(event.target.value)}
              />
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Example: SELECT * FROM incidents WHERE severity IN (&apos;critical&apos;,&apos;high&apos;)
              AND error_rate &gt;= 0.08 ORDER BY error_rate DESC LIMIT 10;
            </p>
            {error && (
              <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                {error}
              </div>
            )}
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

        <section className="space-y-6">
          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6">
            <h3 className="text-base font-semibold">Scoreboard</h3>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Score</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-300">
                  {score ? score.score.toFixed(2) : '-'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Precision</p>
                  <p className="mt-2 text-sm text-zinc-100">
                    {score ? score.precision.toFixed(2) : '-'}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Recall</p>
                  <p className="mt-2 text-sm text-zinc-100">
                    {score ? score.recall.toFixed(2) : '-'}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Efficiency</p>
                  <p className="mt-2 text-sm text-zinc-100">
                    {score ? score.efficiency.toFixed(2) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Leaderboard</h3>
              <span className="text-xs uppercase tracking-widest text-zinc-500">Top 5</span>
            </div>
            <div className="mt-4 space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={`${entry.name}-${entry.round}-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-zinc-800/70 bg-zinc-950/60 px-4 py-3 text-sm"
                >
                  <span className="text-zinc-200">
                    {index + 1}. {entry.name}
                  </span>
                  <span className="text-emerald-300">{entry.score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Round History</h3>
              <span className="text-xs uppercase tracking-widest text-zinc-500">
                {history.length} Rounds
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {history.length === 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-800/70 bg-zinc-950/40 p-4 text-sm text-zinc-500">
                  Score a round to capture metrics.
                </div>
              )}
              {history.map((entry) => (
                <div
                  key={`round-${entry.round}`}
                  className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-200">Round {entry.round}</span>
                    <span className="text-emerald-300">{entry.score.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>Precision {entry.precision.toFixed(2)}</span>
                    <span>Recall {entry.recall.toFixed(2)}</span>
                    <span>Efficiency {entry.efficiency.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
