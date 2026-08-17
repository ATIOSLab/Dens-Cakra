import ts from "typescript";

import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "src");
const appRoot = path.join(sourceRoot, "app");

const roleNames = [
  "ADMIN_SYSTEM",
  "NATIONAL_LEADER",
  "EXECUTIVE",
  "FIELD_COORDINATOR",
  "FIELD_OFFICER",
  "REGIONAL_COMMANDER",
];

const expectedRouteRoles = [
  { prefix: "/dashboard/admin-system", roles: ["ADMIN_SYSTEM"] },
  { prefix: "/dashboard/deputi", roles: ["NATIONAL_LEADER", "EXECUTIVE"] },
  { prefix: "/dashboard/anev", roles: ["NATIONAL_LEADER", "EXECUTIVE", "REGIONAL_COMMANDER"] },
  { prefix: "/dashboard/kabinda", roles: ["REGIONAL_COMMANDER"] },
  { prefix: "/dashboard/petugas-wilayah", roles: ["FIELD_OFFICER"] },
  { prefix: "/dashboard/koordinator-wilayah", roles: ["FIELD_COORDINATOR"] },
  { prefix: "/dashboard/peta-jejaring-intelijen", roles: ["NATIONAL_LEADER", "EXECUTIVE", "REGIONAL_COMMANDER"] },
  {
    prefix: "/dashboard/sebaran-jaring",
    roles: ["NATIONAL_LEADER", "EXECUTIVE", "FIELD_COORDINATOR", "REGIONAL_COMMANDER"],
  },
  {
    prefix: "/dashboard/sebaran-gaswil",
    roles: ["NATIONAL_LEADER", "EXECUTIVE", "FIELD_COORDINATOR", "REGIONAL_COMMANDER"],
  },
  {
    prefix: "/dashboard/daftar-petugas-wilayah",
    roles: ["NATIONAL_LEADER", "EXECUTIVE", "FIELD_COORDINATOR", "REGIONAL_COMMANDER"],
  },
  { prefix: "/dashboard/daftar-jaring/baru", roles: ["FIELD_OFFICER"] },
  { prefix: "/dashboard/daftar-jaring/[jaringId]/edit", roles: ["FIELD_OFFICER"] },
  { prefix: "/dashboard/laporan-pembinaan-jaring/baru", roles: ["FIELD_OFFICER"] },
  {
    prefix: "/dashboard/baket",
    roles: ["NATIONAL_LEADER", "EXECUTIVE", "FIELD_OFFICER", "FIELD_COORDINATOR", "REGIONAL_COMMANDER"],
  },
  {
    prefix: "/dashboard/daftar-jaring",
    roles: ["NATIONAL_LEADER", "EXECUTIVE", "FIELD_OFFICER", "FIELD_COORDINATOR", "REGIONAL_COMMANDER"],
  },
  {
    prefix: "/dashboard/laporan-jaring",
    roles: ["NATIONAL_LEADER", "EXECUTIVE", "FIELD_OFFICER", "FIELD_COORDINATOR", "REGIONAL_COMMANDER"],
  },
  {
    prefix: "/dashboard/laporan-pembinaan-jaring",
    roles: ["NATIONAL_LEADER", "EXECUTIVE", "FIELD_OFFICER", "FIELD_COORDINATOR", "REGIONAL_COMMANDER"],
  },
];

const sessionOnlyPrefixes = [
  "/dashboard",
  "/dashboard/account",
  "/dashboard/notifications",
  "/dashboard/profil",
  "/dashboard/coming-soon",
];

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

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function parseSource(file) {
  return ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function roleFromSystemRolesExpression(node) {
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "SYSTEM_ROLES" &&
    roleNames.includes(node.name.text)
  ) {
    return node.name.text;
  }

  return null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractRequireRoleExpressions(sourceFile) {
  const roles = new Set();

  function extractRolesFromExpression(node) {
    const role = roleFromSystemRolesExpression(node);
    if (role) return [role];

    if (ts.isArrayLiteralExpression(node)) {
      return unique(node.elements.flatMap((element) => extractRolesFromExpression(element)));
    }

    if (ts.isSpreadElement(node)) return extractRolesFromExpression(node.expression);

    return [];
  }

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "requireRole") {
      for (const argument of node.arguments) {
        for (const role of extractRolesFromExpression(argument)) roles.add(role);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...roles];
}

function resolveRelativeImport(fromFile, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null;

  const base = specifier.startsWith("@/")
    ? path.join(sourceRoot, specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);
  const candidates = [`${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function importedLocalFiles(file) {
  const imports = [...read(file).matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);

  return imports.map((specifier) => resolveRelativeImport(file, specifier)).filter(Boolean);
}

function routeLayouts(pageFile) {
  const layouts = [];
  let directory = path.dirname(pageFile);

  while (directory.startsWith(appRoot)) {
    const layoutFile = path.join(directory, "layout.tsx");
    if (fs.existsSync(layoutFile)) layouts.push(layoutFile);
    if (directory === appRoot) break;
    directory = path.dirname(directory);
  }

  return layouts;
}

function collectGuardFiles(pageFile) {
  const files = new Set([pageFile, ...routeLayouts(pageFile)]);
  const queue = importedLocalFiles(pageFile).map((file) => ({ file, depth: 1 }));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || files.has(current.file) || current.depth > 4) continue;

    files.add(current.file);
    for (const nested of importedLocalFiles(current.file)) {
      queue.push({ file: nested, depth: current.depth + 1 });
    }
  }

  return [...files];
}

function rolesInSource(source) {
  return new Set(
    [...source.matchAll(/SYSTEM_ROLES\.([A-Z_]+)/g)]
      .map((match) => match[1])
      .filter((role) => roleNames.includes(role)),
  );
}

function expectedForRoute(route) {
  const match = expectedRouteRoles
    .filter((item) => route === item.prefix || route.startsWith(`${item.prefix}/`))
    .sort((left, right) => right.prefix.length - left.prefix.length)[0];

  if (match) return match.roles;
  if (sessionOnlyPrefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) return [];
  return null;
}

function hasRequireRole(source) {
  return /\brequireRole\s*\(/.test(source);
}

const pageFiles = walk(appRoot, (file) => path.basename(file) === "page.tsx");
const dashboardPages = pageFiles.filter((file) => toRoute(file).startsWith("/dashboard"));
const missingExpectedPolicy = [];
const missingRoleGuard = [];
const roleMismatch = [];
const overlyBroadRoleAccess = [];

for (const pageFile of dashboardPages) {
  const route = toRoute(pageFile);
  const expectedRoles = expectedForRoute(route);

  if (expectedRoles === null) {
    missingExpectedPolicy.push({ route, file: pageFile });
    continue;
  }

  if (expectedRoles.length === 0) continue;

  const guardFiles = collectGuardFiles(pageFile);
  const guardSources = guardFiles.map((file) => ({ file, source: read(file) }));
  const roleGuardSources = guardSources.filter((item) => hasRequireRole(item.source));

  if (roleGuardSources.length === 0) {
    missingRoleGuard.push({ route, file: pageFile });
    continue;
  }

  const discoveredRoles = new Set();
  for (const item of roleGuardSources) {
    const directGuardRoles = extractRequireRoleExpressions(parseSource(item.file));

    for (const role of directGuardRoles.length > 0 ? directGuardRoles : rolesInSource(item.source)) {
      discoveredRoles.add(role);
    }
  }

  const missingRoles = expectedRoles.filter((role) => !discoveredRoles.has(role));
  if (missingRoles.length > 0) {
    roleMismatch.push({ route, file: pageFile, expectedRoles, discoveredRoles: [...discoveredRoles], missingRoles });
  }

  const pageAndLayoutGuardRoles = new Set();
  for (const guardFile of [pageFile, ...routeLayouts(pageFile)]) {
    for (const role of extractRequireRoleExpressions(parseSource(guardFile))) pageAndLayoutGuardRoles.add(role);
  }

  const extraRoles = [...pageAndLayoutGuardRoles].filter((role) => !expectedRoles.includes(role));
  if (extraRoles.length > 0) {
    overlyBroadRoleAccess.push({
      route,
      file: pageFile,
      expectedRoles,
      discoveredRoles: [...pageAndLayoutGuardRoles],
      extraRoles,
    });
  }
}

function printSection(title, items, formatter) {
  console.log(`\n${title} (${items.length})`);
  if (items.length === 0) {
    console.log("  OK");
    return;
  }

  for (const item of items) console.log(`  - ${formatter(item)}`);
}

console.log(`Access control audit: ${dashboardPages.length} dashboard page routes.`);
printSection("Routes without expected policy mapping", missingExpectedPolicy, (item) => item.route);
printSection(
  "Routes missing requireRole guard",
  missingRoleGuard,
  (item) => `${item.route} (${path.relative(projectRoot, item.file)})`,
);
printSection(
  "Routes with role mismatch",
  roleMismatch,
  (item) =>
    `${item.route} expected=[${item.expectedRoles.join(", ")}] discovered=[${item.discoveredRoles.join(", ")}] missing=[${item.missingRoles.join(", ")}]`,
);
printSection(
  "Routes with broader page/layout role access than expected",
  overlyBroadRoleAccess,
  (item) =>
    `${item.route} expected=[${item.expectedRoles.join(", ")}] discovered=[${item.discoveredRoles.join(", ")}] extra=[${item.extraRoles.join(", ")}]`,
);

if (missingExpectedPolicy.length || missingRoleGuard.length || roleMismatch.length || overlyBroadRoleAccess.length) {
  process.exitCode = 1;
}
