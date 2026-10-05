import type { IncomingMessage, ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import type { Plugin } from "vite";

// Descarga directa del PDF: un Chrome sin ventana, ya abierto con blox, imprime
// el documento con la misma hoja de estilos @media print que usaba window.print().

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];

let browser: Promise<Browser> | undefined;
let warmPage: Promise<Page> | undefined;
// Una sola página reutilizada: las peticiones se atienden de una en una.
let queue: Promise<unknown> = Promise.resolve();

function getBrowser(): Promise<Browser> {
  if (!browser) {
    const executablePath = CHROME_PATHS.find((p) => p && existsSync(p));
    if (!executablePath) throw new Error("No se encontró Chrome para generar el PDF");
    browser = puppeteer.launch({ executablePath, headless: true, args: ["--no-first-run"] });
    browser.catch(() => (browser = undefined));
  }
  return browser;
}

function getPage(appUrl: string): Promise<Page> {
  if (!warmPage) {
    warmPage = (async () => {
      const page = await (await getBrowser()).newPage();
      await page.goto(appUrl, { waitUntil: "load" });
      return page;
    })();
    warmPage.catch(() => (warmPage = undefined));
  }
  return warmPage;
}

async function renderPdf(appUrl: string, doc: string, mode: string): Promise<Uint8Array> {
  const page = await getPage(appUrl);
  // La app lee el documento y el modo de localStorage al arrancar.
  await page.evaluate(
    (d, m) => {
      localStorage.setItem("editor-a4:document", d);
      localStorage.setItem("editor-a4:mode", m);
    },
    doc,
    mode,
  );
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector(".bn-editor");
  // Texto (no función) porque este archivo se compila sin los tipos del DOM.
  await page.evaluate(`Promise.all([
    document.fonts.ready,
    ...Array.from(document.images, (img) => img.decode().catch(() => {})),
  ])`);
  return page.pdf({ printBackground: true, preferCSSPageSize: true });
}

function readForm(req: IncomingMessage): Promise<URLSearchParams> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(new URLSearchParams(Buffer.concat(chunks).toString())));
    req.on("error", reject);
  });
}

async function handle(req: IncomingMessage, res: ServerResponse, appUrl: string) {
  const form = await readForm(req);
  const name = (form.get("name") || "blox").replace(/[\\/:*?"<>|]/g, "-");

  // Cabeceras al instante: Chrome muestra la descarga en cuanto llega el clic,
  // y el contenido sigue llegando mientras se genera.
  res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="blox.pdf"; filename*=UTF-8''${encodeURIComponent(name)}.pdf`,
    "Cache-Control": "no-store",
  });
  res.flushHeaders();

  const job = queue.then(() => renderPdf(appUrl, form.get("document") ?? "[]", form.get("mode") ?? "1"));
  queue = job.catch(() => undefined);
  try {
    res.end(Buffer.from(await job));
  } catch (error) {
    console.error("[blox] Error al generar el PDF", error);
    res.destroy(error as Error); // La descarga aparece como fallida en Chrome.
  }
}

export function pdfPlugin(): Plugin {
  return {
    name: "blox-pdf",
    apply: "serve",
    configureServer(server) {
      const appUrl = () => `http://localhost:${server.config.server.port}/`;

      server.middlewares.use("/api/pdf", (req, res, next) => {
        if (req.method !== "POST") return next();
        void handle(req, res, appUrl());
      });

      // Deja Chrome abierto y la app cargada para que el primer clic sea rápido.
      server.httpServer?.once("listening", () => {
        getPage(appUrl()).catch((error) =>
          console.warn("[blox] No se pudo preparar el PDF", error),
        );
      });
      server.httpServer?.once("close", () => {
        void browser?.then((b) => b.close());
      });
    },
  };
}
