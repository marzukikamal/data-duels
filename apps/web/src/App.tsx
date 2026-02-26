import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppStore } from './store';

const App = () => {
  const {
    title,
    series,
    anomalies,
    score,
    precision,
    recall,
    latency,
    hasStarted,
    sql,
    lastQuery,
    lastRows,
    round,
    history,
    leaderboard,
    start,
    generate,
    addAnomaly,
    updateSql,
    runSql,
    evaluate,
    nextRound,
    resetMatch,
  } = useAppStore();

  const chartData = series.map((point) => ({
    index: point.index,
    value: Number(point.value.toFixed(2)),
    anomaly: anomalies.includes(point.index) ? point.value : null,
    predicted: lastRows.find((row) => row.index === point.index) ? point.value : null,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {!hasStarted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 px-6">
          <div className="max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">Data Duels</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-100">
              Detect anomalies. Win rounds. Climb the board.
            </h1>
            <p className="mt-4 text-sm text-zinc-400">
              Write SQL-style detection rules, run them on live signals, and score on precision,
              recall, and latency. Each round reshuffles the series. Your best score tops the
              leaderboard.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                className="rounded-full bg-zinc-100 px-6 py-3 text-xs uppercase tracking-widest text-zinc-950 transition hover:bg-white"
                onClick={start}
                type="button"
              >
                Start Match
              </button>
              <button
                className="rounded-full border border-zinc-700 px-6 py-3 text-xs uppercase tracking-widest text-zinc-200 transition hover:border-zinc-500"
                onClick={() => {
                  start();
                  generate();
                }}
                type="button"
              >
                Randomize First Round
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="border-b border-zinc-800/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Prototype</p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-xs text-zinc-500">Round {round}</p>
          </div>
          <div className="flex gap-3">
            <button
              className="rounded-full border border-zinc-700 px-4 py-2 text-xs uppercase tracking-widest text-zinc-200 transition hover:border-zinc-500"
              onClick={generate}
              type="button"
            >
              New Match
            </button>
            <button
              className="rounded-full bg-zinc-100 px-4 py-2 text-xs uppercase tracking-widest text-zinc-950 transition hover:bg-white"
              onClick={addAnomaly}
              type="button"
            >
              Inject Anomaly
            </button>
            <button
              className="rounded-full border border-indigo-500/60 px-4 py-2 text-xs uppercase tracking-widest text-indigo-300 transition hover:border-indigo-400"
              onClick={runSql}
              type="button"
            >
              Run SQL
            </button>
            <button
              className="rounded-full border border-emerald-500/60 px-4 py-2 text-xs uppercase tracking-widest text-emerald-300 transition hover:border-emerald-400"
              onClick={evaluate}
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
        <section className="rounded-3xl border border-zinc-800/70 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Signal Arena</h2>
              <p className="text-sm text-zinc-400">
                Baseline series with injected anomalies and SQL predictions.
              </p>
            </div>
            <div className="text-right text-xs text-zinc-500">Points: {series.length}</div>
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#27272a" />
                <XAxis dataKey="index" stroke="#71717a" tick={{ fontSize: 10 }} />
                <YAxis stroke="#71717a" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: '#09090b',
                    border: '1px solid #27272a',
                    borderRadius: 12,
                  }}
                  labelStyle={{ color: '#e4e4e7' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="anomaly"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">SQL Arena</h3>
              <span className="text-xs uppercase tracking-widest text-zinc-500">T-SQL Style</span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Write a detection query over the `series` table. Results become your predicted
              anomalies.
            </p>
            <div className="mt-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-3">
              <textarea
                className="h-40 w-full resize-none bg-transparent text-sm text-zinc-100 outline-none"
                value={sql}
                onChange={(event) => updateSql(event.target.value)}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
              <span>Example:</span>
              <code className="rounded-full border border-zinc-800/70 bg-zinc-950/60 px-3 py-1 text-zinc-300">
                SELECT * FROM series WHERE value &gt; 118
              </code>
              <code className="rounded-full border border-zinc-800/70 bg-zinc-950/60 px-3 py-1 text-zinc-300">
                SELECT * FROM series WHERE value &gt; 116 AND value &lt; 130
              </code>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6">
            <h3 className="text-base font-semibold">Round Snapshot</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Your SQL result set is scored against the hidden anomaly labels.
            </p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Anomalies</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-100">{anomalies.length}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Score</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-300">
                  {score === null ? '-' : score.toFixed(2)}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Rows Returned</p>
                <p className="mt-2 text-2xl font-semibold text-indigo-300">{lastRows.length}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {lastQuery ? 'Last query executed' : 'Run a query to evaluate'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Precision</p>
                  <p className="mt-2 text-sm text-zinc-100">
                    {precision === null ? '-' : precision.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Recall</p>
                  <p className="mt-2 text-sm text-zinc-100">
                    {recall === null ? '-' : recall.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Latency</p>
                  <p className="mt-2 text-sm text-zinc-100">
                    {latency === null ? '-' : latency.toFixed(2)}
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
                  Play a round to capture metrics.
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
                    <span>Latency {entry.latency.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6">
            <h3 className="text-base font-semibold">Next Steps</h3>
            <ul className="mt-3 text-sm text-zinc-400">
              <li>Introduce JOINs and multi-table missions.</li>
              <li>Score on query efficiency and latency budgets.</li>
              <li>Add timed duels with head-to-head SQL challenges.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
