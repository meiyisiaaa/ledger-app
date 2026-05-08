const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const packageRoot = path.resolve(__dirname, "..");
const outDir = path.join(os.tmpdir(), "ledger-core-test");

fs.rmSync(outDir, { recursive: true, force: true });

const config = {
  compilerOptions: {
    target: "ES2020",
    module: "CommonJS",
    moduleResolution: "Node10",
    lib: ["ES2020", "DOM"],
    rootDir: packageRoot,
    outDir,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
  },
  include: [path.join(packageRoot, "src/**/*.ts"), path.join(packageRoot, "test/core.test.ts")],
};

const parsed = ts.parseJsonConfigFileContent(config, ts.sys, packageRoot);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const emit = program.emit();
const diagnostics = ts.getPreEmitDiagnostics(program).concat(emit.diagnostics);

if (diagnostics.length > 0) {
  const message = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => packageRoot,
    getNewLine: () => "\n",
  });
  console.error(message);
  process.exit(1);
}

require(path.join(outDir, "test", "core.test.js"));
