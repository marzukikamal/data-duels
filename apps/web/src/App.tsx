import { useAppStore } from './store';

const App = () => {
  const title = useAppStore((state) => state.title);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-4 text-sm text-zinc-400">
          Competitive anomaly detection playground. Engine logic and UI primitives live in shared
          packages.
        </p>
      </main>
    </div>
  );
};

export default App;
