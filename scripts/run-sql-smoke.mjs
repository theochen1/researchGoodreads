import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const smokeDirectory = "supabase/smoke-tests";
const smokeFiles = readdirSync(smokeDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (smokeFiles.length === 0) {
  console.error(`No SQL smoke tests found in ${smokeDirectory}`);
  process.exit(1);
}

const env = {
  ...process.env,
  PGHOST: process.env.PGHOST ?? "127.0.0.1",
  PGPORT: process.env.PGPORT ?? "54322",
  PGUSER: process.env.PGUSER ?? "postgres",
  PGPASSWORD: process.env.PGPASSWORD ?? "postgres",
  PGDATABASE: process.env.PGDATABASE ?? "postgres",
};

for (const file of smokeFiles) {
  const path = join(smokeDirectory, file);

  console.log(`\nRunning ${path}`);
  const result = spawnSync("psql", ["-v", "ON_ERROR_STOP=1", "-f", path], {
    env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
