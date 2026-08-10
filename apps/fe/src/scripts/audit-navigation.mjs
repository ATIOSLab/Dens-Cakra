import ts from "typescript";

import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "src");
const appRoot = path.join(sourceRoot, "app");

function walk(directory, predicate) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".next", "node_modules"].includes(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walk(absolutePath, predicate));
    else if (predicate(absolutePath)) result.push(absolutePath);
  }
  return result;
}

function toRoute(pageFile) {
  const relative = path.relative(appRoot, path.dirname(pageFile));
  const segments = relative
    .split(path.sep)
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .filter((segment) => !segment.startsWith("@") && !segment.startsWith("_"));
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function routePattern(route) {
  const segments = route.split("/").filter(Boolean);
  const pattern = segments
    .map((segment) => {
      if (/^\[\[\.\.\..+\]\]$/.test(segment)) return "(?:/.+)?";
      if (/^\[\.\.\..+\]$/.test(segment)) return "/.+";
      if (/^\[.+\]$/.test(segment)) return "/[^/]+";
      return `/${escapeRegExp(segment)}`;
    })
    .join("");
  return new RegExp(`^${pattern || "/"}/?$`);
}

function locationOf(sourceFile, node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${path.relative(projectRoot, sourceFile.fileName)}:${line + 1}:${character + 1}`;
}

function stringValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function templateSignature(node) {
  if (!ts.isTemplateExpression(node)) return null;
  let value = node.head.text;
  for (const span of node.templateSpans) value += `*${span.literal.text}`;
  return value;
}

function jsxAttribute(openingElement, name) {
  return openingElement.attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.text === name,
  );
}

function jsxAttributeValue(attribute) {
  if (!attribute?.initializer) return attribute ? true : null;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (
    ts.isJsxExpression(attribute.initializer) &&
    attribute.initializer.expression &&
    (ts.isStringLiteral(attribute.initializer.expression) ||
      ts.isNoSubstitutionTemplateLiteral(attribute.initializer.expression))
  ) {
    return attribute.initializer.expression.text;
  }
  if (ts.isJsxExpression(attribute.initializer) && ts.isTemplateExpression(attribute.initializer.expression)) {
    return { template: templateSignature(attribute.initializer.expression) };
  }
  return attribute ? "dynamic" : null;
}

const pageFiles = walk(appRoot, (file) => path.basename(file) === "page.tsx");
const routes = [...new Set(pageFiles.map(toRoute))].sort();
const matchers = routes.map((route) => ({ route, regex: routePattern(route) }));
const placeholderRoutes = new Set(
  pageFiles
    .filter((file) => {
      const text = fs.readFileSync(file, "utf8");
      return text.includes("UniversalDensRoutePage") || text.includes("/dashboard/coming-soon/page");
    })
    .map(toRoute)
    .filter((route) => !route.startsWith("/dashboard/oim")),
);
const sourceFiles = walk(sourceRoot, (file) => /\.[cm]?[jt]sx?$/.test(file));
const brokenTargets = [];
const brokenTemplateTargets = [];
const emptyTargets = [];
const duplicateTargets = [];
const buttonRisks = [];
const nestedInteractiveControls = [];
const checkedTargets = [];
const placeholderTargets = [];
const terminologyRisks = [];

const deprecatedUiTerms = new Map([
  ["Maps Intelijen Network", "Peta Jejaring Intelijen"],
  ["History Pembinaan Jaring", "Riwayat Pembinaan Jaring"],
  ["Baket (Bahan Keterangan)", "Bahan Keterangan (Baket)"],
  ["Jaring Lapangan", "Jaring"],
  ["Field Officer", "Petugas Wilayah (Gaswil)"],
  ["Field Coordinator", "Koordinator Wilayah (Korwil)"],
  ["Regional Commander", "Komandan Regional"],
  ["Operational Intelligence Manager", "Manajer Intelijen Operasional"],
  ["Incoming information", "Informasi masuk"],
  ["Edit Draft", "Ubah Draf"],
  ["Builder Tugas", "Penyusun Tugas"],
  ["Jumlah Agen", "Jumlah Personel Lapangan"],
  ["Jumlah agen", "Jumlah personel lapangan"],
  ["Daftar agen", "Daftar personel lapangan"],
  ["draft report", "draf laporan"],
  ["VALID BAKETs", "BAKET VALID"],
  ["Executive", "Deputi II"],
  ["Agen Aktif", "Personel Aktif"],
  ["Agent Transit Lokasi", "Transit Lokasi Personel"],
  ["Save as PDF", "Simpan sebagai PDF"],
  ["Draft Saved", "Draf Tersimpan"],
  ["Last Save", "Terakhir disimpan"],
  ["Auto Save", "Simpan otomatis"],
  ["Soft Delete", "Nonaktifkan"],
  ["Workflow", "Alur Kerja"],
  ["Urgent", "Mendesak"],
  ["High", "Tinggi"],
  ["Buka Detail", "Lihat Detail"],
  ["BUAT TASK", "Buat Tugas"],
  ["REFRESH", "Muat Ulang"],
  ["Tracking", "Pelacakan"],
  ["scope pengguna", "cakupan pengguna"],
  ["Approval", "Persetujuan"],
  ["Ranking", "Peringkat"],
  ["Queue approval", "Antrean persetujuan"],
  ["Traceability", "Ketertelusuran"],
  ["versioning", "riwayat versi"],
  ["Filter intelligence map", "Filter Peta Intelijen"],
  ["Semua urgency", "Semua urgensi"],
  ["SYSTEM ONLINE", "Sistem aktif"],
  ["WORKLOAD", "Beban kerja"],
  ["DEADLINE", "Tenggat"],
  ["COVERAGE", "Cakupan"],
  ["Preview Distribusi", "Pratinjau Distribusi"],
  ["Preview Wilayah", "Pratinjau Wilayah"],
  ["Suspended", "Ditangguhkan"],
  ["Archived", "Diarsipkan"],
  ["Locked", "Terkunci"],
  ["Operational lock", "Kunci operasional"],
  ["Lock User", "Kunci Pengguna"],
  ["Unlock Operasional", "Buka Kunci Operasional"],
  ["Suspend User", "Tangguhkan Pengguna"],
  ["Suspend Akun", "Tangguhkan Akun"],
  ["Alasan Suspend", "Alasan Penangguhan"],
  ["Arsipkan User", "Arsipkan Pengguna"],
  ["Read-Only", "Hanya Baca"],
  ["assignment aktif", "penugasan aktif"],
  ["user aktif", "pengguna aktif"],
  ["coverage gap", "kesenjangan cakupan"],
  ["mode stealth", "mode lokasi tersembunyi"],
  ["Lokasi stealth", "Lokasi yang dirahasiakan"],
  ["coverage sumber", "cakupan sumber"],
  ["Provinsi induk coverage", "Provinsi induk cakupan"],
]);

const rawDeprecatedUiTerms = new Map([
  ["Field Officer", "Petugas Wilayah (Gaswil)"],
  ["Field Coordinator", "Koordinator Wilayah (Korwil)"],
  ["Regional Commander", "Komandan Regional"],
  ["Operational Intelligence Manager", "Manajer Intelijen Operasional"],
  ["Jaring Lapangan", "Jaring"],
  ["WhatsApp View", "Tampilan WhatsApp"],
  ["Owner Regional", "Regional Pengirim"],
  ["Tasks Turunan", "Tugas Turunan"],
  ["Jumlah Section", "Jumlah Bagian"],
  ["View tabel", "Tampilan tabel"],
  ["read receipt", "status baca"],
  ["acknowledgement", "konfirmasi"],
  ["Detail Alert", "Detail Peringatan"],
  ["Coverage aktif", "Cakupan aktif"],
  ["scope saat user", "akses saat pengguna"],
]);

function termPattern(term) {
  return new RegExp(term.split(/\s+/).map(escapeRegExp).join("\\s+"), "g");
}

function validateTarget(target, sourceFile, node, kind) {
  if (!target || target === "#") {
    emptyTargets.push({ location: locationOf(sourceFile, node), kind, target: target || "(empty)" });
    return;
  }
  if (
    !target.startsWith("/") ||
    target.startsWith("//") ||
    target.startsWith("/api/") ||
    target.startsWith("/_next/")
  ) {
    return;
  }
  const pathname = target.split(/[?#]/, 1)[0] || "/";
  const matchedRoute = matchers.find(({ regex }) => regex.test(pathname));
  checkedTargets.push({ location: locationOf(sourceFile, node), kind, target, matchedRoute: matchedRoute?.route });
  if (!matchedRoute) brokenTargets.push({ location: locationOf(sourceFile, node), kind, target });
  else if (placeholderRoutes.has(matchedRoute.route)) {
    placeholderTargets.push({ location: locationOf(sourceFile, node), kind, target });
  }
}

function validateTemplateTarget(template, sourceFile, node, kind) {
  if (!template?.startsWith("/") || template.startsWith("/api/")) return;
  const pathname = template.split(/[?#]/, 1)[0];
  const candidateSegments = pathname.split("/").filter(Boolean);
  const matches = routes.some((route) => {
    const routeSegments = route.split("/").filter(Boolean);
    if (routeSegments.length !== candidateSegments.length) return false;
    return routeSegments.every((segment, index) => {
      const candidate = candidateSegments[index];
      if (segment.startsWith("[") || candidate === "*") return true;
      if (candidate.includes("*")) {
        const candidatePattern = new RegExp(`^${candidate.split("*").map(escapeRegExp).join(".*")}$`);
        return candidatePattern.test(segment);
      }
      return segment === candidate;
    });
  });
  if (!matches) {
    brokenTemplateTargets.push({ location: locationOf(sourceFile, node), kind, target: template });
  }
}

function jsxTagName(node, sourceFile) {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText(sourceFile);
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText(sourceFile);
  return null;
}

function hasActionAncestor(node, sourceFile) {
  const triggerTags = new Set([
    "AlertDialogAction",
    "AlertDialogCancel",
    "AlertDialogTrigger",
    "CollapsibleTrigger",
    "DialogClose",
    "DialogTrigger",
    "DropdownMenuTrigger",
    "MapMarker",
    "PopoverTrigger",
    "SheetClose",
    "SheetTrigger",
    "TooltipTrigger",
  ]);
  let current = node.parent;
  while (current && !ts.isSourceFile(current)) {
    const tagName = jsxTagName(current, sourceFile);
    if (tagName && (triggerTags.has(tagName) || /\.(Close|Trigger)$/.test(tagName))) return true;
    if (ts.isJsxAttribute(current) && current.name.getText(sourceFile) === "render") return true;
    current = current.parent;
  }
  return false;
}

function hasAncestorTag(node, sourceFile, expectedTag) {
  let current = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (jsxTagName(current, sourceFile) === expectedTag) return true;
    current = current.parent;
  }
  return false;
}

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const targetsInFile = new Map();

  if (path.basename(file) !== "audit-navigation.mjs") {
    for (const [term, replacement] of rawDeprecatedUiTerms.entries()) {
      for (const match of text.matchAll(termPattern(term))) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(match.index ?? 0);
        terminologyRisks.push({
          location: `${path.relative(projectRoot, file)}:${line + 1}:${character + 1}`,
          value: match[0].replace(/\s+/g, " "),
          replacement,
        });
      }
    }
  }

  function recordTarget(target, node, kind) {
    validateTarget(target, sourceFile, node, kind);
    if (!target?.startsWith("/")) return;
    const key = `${kind}:${target}`;
    const locations = targetsInFile.get(key) ?? [];
    locations.push(locationOf(sourceFile, node));
    targetsInFile.set(key, locations);
  }

  function visit(node, formDepth = 0) {
    let nextFormDepth = formDepth;
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(sourceFile) === "form") {
      nextFormDepth += 1;
    }

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      const href = jsxAttribute(node, "href");
      const hrefValue = jsxAttributeValue(href);
      if (href && typeof hrefValue === "string") recordTarget(hrefValue, href, `${tagName}.href`);
      if (hrefValue && typeof hrefValue === "object") {
        validateTemplateTarget(hrefValue.template, sourceFile, href, `${tagName}.href`);
      }

      if (tagName === "Button" || tagName === "button") {
        const type = jsxAttributeValue(jsxAttribute(node, "type"));
        const hasClick = Boolean(jsxAttribute(node, "onClick"));
        const asChild = Boolean(jsxAttribute(node, "asChild"));
        const disabled = jsxAttributeValue(jsxAttribute(node, "disabled"));
        const hasSpreadProps = node.attributes.properties.some(ts.isJsxSpreadAttribute);
        if (hasAncestorTag(node, sourceFile, "Link")) {
          nestedInteractiveControls.push({
            location: locationOf(sourceFile, node),
            reason: `<${tagName}> nested inside <Link>; use Button asChild`,
          });
        }
        if (
          !hasClick &&
          !asChild &&
          !hasSpreadProps &&
          !hasActionAncestor(node, sourceFile) &&
          type !== "submit" &&
          type !== "reset" &&
          disabled !== true
        ) {
          buttonRisks.push({
            location: locationOf(sourceFile, node),
            tagName,
            reason: nextFormDepth > 0 ? "implicit form submit" : "no static action",
          });
        }
      }
    }

    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      let name = null;
      if (ts.isIdentifier(expression)) name = expression.text;
      else if (ts.isPropertyAccessExpression(expression)) name = expression.name.text;
      if (["push", "replace", "redirect"].includes(name) && node.arguments[0]) {
        const value = stringValue(node.arguments[0]);
        if (value !== null) recordTarget(value, node.arguments[0], `${name}()`);
        else validateTemplateTarget(templateSignature(node.arguments[0]), sourceFile, node.arguments[0], `${name}()`);
      }
    }

    const visibleLiteral = stringValue(node) ?? (ts.isJsxText(node) ? node.text.trim() : null);
    const replacement =
      path.basename(file) !== "audit-navigation.mjs" && visibleLiteral
        ? [...deprecatedUiTerms.entries()].find(([term]) => visibleLiteral.includes(term))?.[1]
        : null;
    if (replacement) {
      terminologyRisks.push({
        location: locationOf(sourceFile, node),
        value: visibleLiteral,
        replacement,
      });
    }

    if (
      file.includes(`${path.sep}navigation${path.sep}`) &&
      ts.isPropertyAssignment(node) &&
      stringValue(node.initializer)?.startsWith("/")
    ) {
      recordTarget(stringValue(node.initializer), node.initializer, "navigation route");
    }

    if (path.basename(file) !== "page.tsx") {
      const literalRoute = stringValue(node);
      if (literalRoute?.startsWith("/dashboard")) {
        validateTarget(literalRoute, sourceFile, node, "route literal");
      } else {
        const routeTemplate = templateSignature(node);
        if (routeTemplate?.startsWith("/dashboard")) {
          validateTemplateTarget(routeTemplate, sourceFile, node, "route template");
        }
      }
    }

    ts.forEachChild(node, (child) => visit(child, nextFormDepth));
  }

  visit(sourceFile);
  for (const [key, locations] of targetsInFile) {
    if (locations.length > 1) duplicateTargets.push({ file: path.relative(projectRoot, file), key, locations });
  }
}

function printSection(title, entries, render) {
  console.log(`\n${title} (${entries.length})`);
  if (entries.length === 0) console.log("  OK");
  else for (const entry of entries) console.log(`  - ${render(entry)}`);
}

console.log(`Navigation audit: ${routes.length} page routes, ${checkedTargets.length} static internal targets.`);
printSection("Broken internal targets", brokenTargets, (item) => `${item.location} ${item.kind} -> ${item.target}`);
printSection(
  "Broken template targets",
  brokenTemplateTargets,
  (item) => `${item.location} ${item.kind} -> ${item.target}`,
);
printSection(
  "Targets resolving to placeholder pages",
  placeholderTargets,
  (item) => `${item.location} ${item.kind} -> ${item.target}`,
);
printSection("Empty or hash-only targets", emptyTargets, (item) => `${item.location} ${item.kind} -> ${item.target}`);
printSection("Nested interactive controls", nestedInteractiveControls, (item) => `${item.location}: ${item.reason}`);
printSection(
  "Deprecated user-facing terminology",
  terminologyRisks,
  (item) => `${item.location}: "${item.value}" -> "${item.replacement}"`,
);
printSection(
  "Repeated targets in the same source file (review only)",
  duplicateTargets,
  (item) => `${item.file} ${item.key} (${item.locations.length}x)`,
);
printSection(
  "Buttons requiring semantic review (review only)",
  buttonRisks,
  (item) => `${item.location} <${item.tagName}>: ${item.reason}`,
);

if (
  brokenTargets.length > 0 ||
  brokenTemplateTargets.length > 0 ||
  placeholderTargets.length > 0 ||
  emptyTargets.length > 0 ||
  nestedInteractiveControls.length > 0 ||
  terminologyRisks.length > 0
) {
  process.exitCode = 1;
}
