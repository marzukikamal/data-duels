import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import duckdb_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_worker_eh from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

let dbInstance: duckdb.AsyncDuckDB | null = null;
let dbReady: Promise<duckdb.AsyncDuckDB> | null = null;

export const getDuckDb = async (): Promise<duckdb.AsyncDuckDB> => {
  if (dbInstance) {
    return dbInstance;
  }
  if (!dbReady) {
    dbReady = (async () => {
      const bundles = {
        mvp: {
          mainModule: duckdb_wasm,
          mainWorker: duckdb_worker,
        },
        eh: {
          mainModule: duckdb_wasm_eh,
          mainWorker: duckdb_worker_eh,
        },
      } satisfies duckdb.DuckDBBundles;

      const bundle = await duckdb.selectBundle(bundles);
      if (!bundle.mainWorker) {
        throw new Error('DuckDB bundle missing worker');
      }
      const worker = new Worker(bundle.mainWorker, { type: 'module' });
      const logger = new duckdb.ConsoleLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      dbInstance = db;
      return db;
    })();
  }

  return dbReady;
};
