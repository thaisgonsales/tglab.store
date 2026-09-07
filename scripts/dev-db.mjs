/**
 * Administra un cluster PostgreSQL local y dedicado para el desarrollo de TG LAB.
 * Los datos viven en `.devdb/` (ignorado por git). No requiere permisos de
 * administrador ni contraseña (autenticación `trust` solo en 127.0.0.1).
 *
 *   node scripts/dev-db.mjs init | start | stop | status
 *
 * Requiere tener PostgreSQL 16/17 instalado (se busca `pg_ctl`/`initdb`).
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { platform } from "node:process";

const PORT = 5433;
const DATA_DIR = ".devdb/data";
const LOG_FILE = ".devdb/server.log";
const DATABASES = ["tglab", "tglab_shadow"];

function findBin(name) {
  const exe = platform === "win32" ? `${name}.exe` : name;
  const candidates = [
    exe,
    ...(platform === "win32"
      ? [
          `C:/Program Files/PostgreSQL/17/bin/${exe}`,
          `C:/Program Files/PostgreSQL/16/bin/${exe}`,
        ]
      : [
          `/usr/lib/postgresql/17/bin/${exe}`,
          `/usr/lib/postgresql/16/bin/${exe}`,
          `/opt/homebrew/opt/postgresql@17/bin/${exe}`,
        ]),
  ];
  for (const c of candidates) {
    try {
      execFileSync(c, ["--version"], { stdio: "ignore" });
      return c;
    } catch {
      /* siguiente */
    }
  }
  throw new Error(
    `No se encontró '${name}'. Instala PostgreSQL 16/17 o agrégalo al PATH.`,
  );
}

function run(bin, args, opts = {}) {
  return execFileSync(bin, args, { stdio: "inherit", ...opts });
}

const cmd = process.argv[2] ?? "status";

if (cmd === "init") {
  if (existsSync(DATA_DIR)) {
    console.log("El cluster ya existe en .devdb/data");
  } else {
    run(findBin("initdb"), [
      "-D",
      DATA_DIR,
      "-U",
      "postgres",
      "-A",
      "trust",
      "-E",
      "UTF8",
      "--locale=C",
    ]);
  }
  startServer();
  for (const db of DATABASES) createDb(db);
  console.log(`\nListo. DATABASE_URL=postgresql://postgres@127.0.0.1:${PORT}/tglab`);
} else if (cmd === "start") {
  startServer();
} else if (cmd === "stop") {
  run(findBin("pg_ctl"), ["-D", DATA_DIR, "stop", "-m", "fast"]);
} else if (cmd === "status") {
  try {
    run(findBin("pg_ctl"), ["-D", DATA_DIR, "status"]);
  } catch {
    process.exitCode = 1;
  }
} else {
  console.error("Uso: node scripts/dev-db.mjs init|start|stop|status");
  process.exit(1);
}

function startServer() {
  try {
    execFileSync(findBin("pg_ctl"), ["-D", DATA_DIR, "status"], {
      stdio: "ignore",
    });
    console.log(`PostgreSQL local ya está corriendo en el puerto ${PORT}.`);
    return;
  } catch {
    /* no está corriendo */
  }
  run(findBin("pg_ctl"), [
    "-D",
    DATA_DIR,
    "-l",
    LOG_FILE,
    "-o",
    `-p ${PORT}`,
    "start",
  ]);
}

function createDb(name) {
  const psql = findBin("psql");
  const exists = execFileSync(
    psql,
    [
      "-h",
      "127.0.0.1",
      "-p",
      String(PORT),
      "-U",
      "postgres",
      "-tAc",
      `select 1 from pg_database where datname='${name}'`,
    ],
    { encoding: "utf8" },
  ).trim();
  if (exists !== "1") {
    run(findBin("createdb"), [
      "-h",
      "127.0.0.1",
      "-p",
      String(PORT),
      "-U",
      "postgres",
      name,
    ]);
    console.log(`· base de datos '${name}' creada`);
  }
}
