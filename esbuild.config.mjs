import esbuild from "esbuild";
import process from "process";

const builtins = [
  "assert", "async_hooks", "buffer", "child_process", "cluster",
  "console", "constants", "crypto", "dgram", "diagnostics_channel",
  "dns", "domain", "events", "fs", "http", "http2", "https",
  "inspector", "module", "net", "os", "path", "perf_hooks",
  "process", "punycode", "querystring", "readline", "repl",
  "stream", "string_decoder", "sys", "timers", "tls", "trace_events",
  "tty", "url", "util", "v8", "vm", "wasi", "worker_threads", "zlib"
];

const banner = `/*
 * PDF Background Tint - Obsidian Plugin
 */`;

const prod = process.argv[2] === "production";

esbuild
  .build({
    banner: { js: banner },
    bundle: true,
    entryPoints: ["src/main.ts"],
    external: [
      "obsidian",
      "electron",
      "@codemirror/autocomplete",
      "@codemirror/collab",
      "@codemirror/commands",
      "@codemirror/language",
      "@codemirror/lint",
      "@codemirror/search",
      "@codemirror/state",
      "@codemirror/view",
      "@lezer/common",
      "@lezer/highlight",
      "@lezer/lr",
      ...builtins,
    ],
    format: "cjs",
    logLevel: "info",
    minify: prod,
    outdir: ".",
    platform: "node",
    sourcemap: prod ? false : "inline",
    target: "es2018",
    treeShaking: true,
  })
  .catch(() => process.exit(1));
