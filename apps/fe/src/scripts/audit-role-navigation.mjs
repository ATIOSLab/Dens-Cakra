import ts from "typescript";

import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "src");
const appRoot = path.join(sourceRoot, "app");
const sidebarFile = path.join(sourceRoot, "navigation", "sidebar", "sidebar-items.ts");

const roleValues = {
  ADMIN_SYSTEM: "admin_system",
  EXECUTIVE: "executive",
  FIELD_COORDINATOR: "field_coordinator",
  FIELD_OFFICER: "field_officer",
  OPERATIONAL_INTELLIGENCE_MANAGER: "operational_intelligence_manager",
  REGIONAL_COMMANDER: "regional_commander",
};

const roleLabels = {
  [roleValues.ADMIN_SYSTEM]: "Admin Sistem",
  [roleValues.EXECUTIVE]: "Deputi II",
  [roleValues.FIELD_COORDINATOR]: "Koordinator Wilayah (Korwil)",
  [roleValues.FIELD_OFFICER]: "Petugas Wilayah (Gaswil)",
  [roleValues.OPERATIONAL_INTELLIGENCE_MANAGER]: "Manajer Intelijen Operasional",
  [roleValues.REGIONAL_COMMANDER]: "Kepala BIN Daerah (Kabinda)",
};

const homeRoutes = {
  [roleValues.ADMIN_SYSTEM]: "/dashboard/admin-system",
  [roleValues.EXECUTIVE]: "/dashboard/executive",
  [roleValues.FIELD_COORDINATOR]: "/dashboard/field-coordinator",
  [roleValues.FIELD_OFFICER]: "/dashboard/field-officer",
  [roleValues.OPERATIONAL_INTELLIGENCE_MANAGER]: "/dashboard/oim",
  [roleValues.REGIONAL_COMMANDER]: "/dashboard/regional-commander",
};

const roleNames = new Set(Object.keys(roleValues));
const allRoles = Object.values(roleValues);

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

function read(file) {
  return fs.readFileSync(file, "utf8");
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

function routeSpecificity(route) {
  return route
    .split("/")
    .filter(Boolean)
    .reduce((score, segment) => {
      if (/^\[\[\.\.\..+\]\]$/.test(segment)) return score - 100;
      if (/^\[\.\.\..+\]$/.test(segment)) return score - 80;
      if (/^\[.+\]$/.test(segment)) return score + 1;
      return score + 10;
    }, 0);
}

function parseSource(file) {
  return ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function propertyName(property) {
  if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) return property.name.text;
  return null;
}

function objectProperty(objectLiteral, name) {
  return objectLiteral.properties.find((property) => propertyName(property) === name);
}

function stringLiteralValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function roleFromSystemRolesExpression(node) {
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "SYSTEM_ROLES" &&
    roleNames.has(node.name.text)
  ) {
    return roleValues[node.name.text];
  }

  return null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function createSidebarResolver(sourceFile) {
  const roleArrays = new Map();

  function resolveRoleExpression(node) {
    const systemRole = roleFromSystemRolesExpression(node);
    if (systemRole) return [systemRole];

    if (ts.isIdentifier(node) && roleArrays.has(node.text)) return roleArrays.get(node.text);

    if (ts.isArrayLiteralExpression(node)) {
      return unique(node.elements.flatMap((element) => resolveRoleExpression(element)));
    }

    return [];
  }

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const roles = resolveRoleExpression(node.initializer);
      if (roles.length > 0) roleArrays.set(node.name.text, roles);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  function resolveUrlExpression(node) {
    const literal = stringLiteralValue(node);
    if (literal) return literal;

    if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "SYSTEM_ROLE_HOME_ROUTES"
    ) {
      const role = roleFromSystemRolesExpression(node.argumentExpression);
      if (role) return homeRoutes[role];
    }

    return null;
  }

  return { resolveRoleExpression, resolveUrlExpression };
}

function getPropertyRoles(objectLiteral, resolver, inheritedRoles) {
  const rolesProperty = objectProperty(objectLiteral, "roles");
  if (!rolesProperty || !ts.isPropertyAssignment(rolesProperty)) return inheritedRoles;
  const roles = resolver.resolveRoleExpression(rolesProperty.initializer);
  return roles.length > 0 ? roles : inheritedRoles;
}

function getPropertyUrl(objectLiteral, resolver) {
  const urlProperty = objectProperty(objectLiteral, "url");
  if (!urlProperty || !ts.isPropertyAssignment(urlProperty)) return null;
  return resolver.resolveUrlExpression(urlProperty.initializer);
}

function getPropertyTitle(objectLiteral) {
  const titleProperty = objectProperty(objectLiteral, "title");
  if (!titleProperty || !ts.isPropertyAssignment(titleProperty)) return "(tanpa judul)";
  return stringLiteralValue(titleProperty.initializer) ?? titleProperty.initializer.getText();
}

function getPropertyId(objectLiteral) {
  const idProperty = objectProperty(objectLiteral, "id");
  if (!idProperty || !ts.isPropertyAssignment(idProperty)) return "(tanpa id)";
  return stringLiteralValue(idProperty.initializer) ?? idProperty.initializer.getText();
}

function extractSidebarTargets() {
  const sourceFile = parseSource(sidebarFile);
  const resolver = createSidebarResolver(sourceFile);
  const targets = [];

  function collectObject(objectLiteral, inheritedRoles, groupLabel) {
    const roles = getPropertyRoles(objectLiteral, resolver, inheritedRoles);
    const url = getPropertyUrl(objectLiteral, resolver);
    const title = getPropertyTitle(objectLiteral);
    const id = getPropertyId(objectLiteral);

    if (url) {
      targets.push({
        groupLabel,
        id,
        roles: roles.length > 0 ? roles : allRoles,
        title,
        url,
      });
    }

    const childrenProperty = objectProperty(objectLiteral, "items") ?? objectProperty(objectLiteral, "subItems");
    if (
      childrenProperty &&
      ts.isPropertyAssignment(childrenProperty) &&
      ts.isArrayLiteralExpression(childrenProperty.initializer)
    ) {
      const childGroupLabel = objectProperty(objectLiteral, "label") ? title : groupLabel;
      for (const child of childrenProperty.initializer.elements) {
        if (ts.isObjectLiteralExpression(child)) collectObject(child, roles, childGroupLabel);
      }
    }
  }

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "sidebarItems" &&
      node.initializer
    ) {
      if (!ts.isArrayLiteralExpression(node.initializer)) return;
      for (const group of node.initializer.elements) {
        if (ts.isObjectLiteralExpression(group)) collectObject(group, allRoles, getPropertyTitle(group));
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return targets;
}

function extractTopLevelSidebarItemIds() {
  const sourceFile = parseSource(sidebarFile);
  const itemIds = [];

  function collectItems(itemsArray) {
    for (const item of itemsArray.elements) {
      if (!ts.isObjectLiteralExpression(item)) continue;
      itemIds.push(getPropertyId(item));
    }
  }

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "sidebarItems" &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      for (const group of node.initializer.elements) {
        if (!ts.isObjectLiteralExpression(group)) continue;

        const itemsProperty = objectProperty(group, "items");
        if (
          itemsProperty &&
          ts.isPropertyAssignment(itemsProperty) &&
          ts.isArrayLiteralExpression(itemsProperty.initializer)
        ) {
          collectItems(itemsProperty.initializer);
        }
      }
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return itemIds;
}

function extractRequireRoleExpressions(sourceFile) {
  const roles = new Set();

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "requireRole") {
      for (const argument of node.arguments) {
        for (const role of extractRolesFromExpression(argument)) roles.add(role);
      }
    }

    ts.forEachChild(node, visit);
  }

  function extractRolesFromExpression(node) {
    const role = roleFromSystemRolesExpression(node);
    if (role) return [role];

    if (ts.isArrayLiteralExpression(node))
      return unique(node.elements.flatMap((element) => extractRolesFromExpression(element)));

    if (ts.isSpreadElement(node)) return extractRolesFromExpression(node.expression);

    return [];
  }

  visit(sourceFile);
  return [...roles];
}

function resolveRelativeImport(fromFile, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null;

  const base = specifier.startsWith("@/")
    ? path.join(sourceRoot, specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.js`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
    path.join(base, "index.jsx"),
    path.join(base, "index.js"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function importedLocalFiles(file) {
  return [...read(file).matchAll(/from\s+["']([^"']+)["']/g)]
    .map((match) => resolveRelativeImport(file, match[1]))
    .filter(Boolean);
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
    for (const nested of importedLocalFiles(current.file)) queue.push({ file: nested, depth: current.depth + 1 });
  }

  return [...files];
}

function extractRouteRoleMap() {
  const pageFiles = walk(appRoot, (file) => path.basename(file) === "page.tsx");
  const routes = pageFiles.map((file) => {
    const guardRoles = new Set();
    for (const guardFile of collectGuardFiles(file)) {
      for (const role of extractRequireRoleExpressions(parseSource(guardFile))) guardRoles.add(role);
    }

    return {
      file,
      regex: routePattern(toRoute(file)),
      roles: [...guardRoles],
      route: toRoute(file),
    };
  });

  return routes.sort(
    (left, right) =>
      routeSpecificity(right.route) - routeSpecificity(left.route) || right.route.length - left.route.length,
  );
}

function formatTarget(target) {
  return `${target.title} -> ${target.url} [${target.roles.map((role) => roleLabels[role] ?? role).join(", ")}]`;
}

const sidebarTargets = extractSidebarTargets();
const routeMap = extractRouteRoleMap();
const sidebarTargetsByRole = new Map(allRoles.map((role) => [role, []]));
const brokenTargets = [];
const missingRoleGuard = [];
const roleMismatches = [];
const missingHomeRouteTargets = [];
const structuralNavigationIssues = [];

function findPageRoute(url) {
  const pathname = url.split(/[?#]/, 1)[0] || "/";
  return routeMap.find((candidate) => candidate.regex.test(pathname));
}

for (const target of sidebarTargets) {
  for (const role of target.roles) sidebarTargetsByRole.get(role)?.push(target);

  if (!target.url.startsWith("/") || target.url.startsWith("/api/")) continue;
  const pageRoute = findPageRoute(target.url);

  if (!pageRoute) {
    brokenTargets.push(target);
    continue;
  }

  if (pageRoute.roles.length === 0) {
    missingRoleGuard.push({ pageRoute, target });
    continue;
  }

  const missingRoles = target.roles.filter((role) => !pageRoute.roles.includes(role));
  if (missingRoles.length > 0) {
    roleMismatches.push({ missingRoles, pageRoute, target });
  }
}

for (const [role, homeRoute] of Object.entries(homeRoutes)) {
  const matchingTarget = sidebarTargetsByRole
    .get(role)
    ?.some((target) => target.url.split(/[?#]/, 1)[0] === homeRoute);
  const pageRoute = findPageRoute(homeRoute);

  if (!matchingTarget || !pageRoute || !pageRoute.roles.includes(role)) {
    missingHomeRouteTargets.push({
      hasPageRoute: Boolean(pageRoute),
      hasSidebarTarget: Boolean(matchingTarget),
      homeRoute,
      role,
    });
  }
}

const topLevelSidebarItemIds = extractTopLevelSidebarItemIds();
const gaswilMenuIndex = topLevelSidebarItemIds.indexOf("field-coordinator-gaswil");
const jaringMenuIndex = topLevelSidebarItemIds.indexOf("field-coordinator-jaring");
const sidebarSourceText = read(sidebarFile);
const entityIdsBlock = sidebarSourceText.match(/const entityIds = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? "";

if (gaswilMenuIndex < 0 || jaringMenuIndex < 0) {
  structuralNavigationIssues.push("Menu Petugas Wilayah (Gaswil) dan Jaring harus tersedia sebagai menu utama.");
} else if (jaringMenuIndex !== gaswilMenuIndex + 1) {
  structuralNavigationIssues.push("Menu Jaring harus tepat berada di bawah Petugas Wilayah (Gaswil).");
}

if (!sidebarSourceText.includes('label: "Personel & Jaring"')) {
  structuralNavigationIssues.push("Menu Petugas Wilayah (Gaswil) dan Jaring harus dikelompokkan dalam Personel & Jaring.");
}

if (entityIdsBlock.includes('"field-coordinator-jaring"') || entityIdsBlock.includes("'field-coordinator-jaring'")) {
  structuralNavigationIssues.push("Menu Jaring tidak boleh dikelompokkan sebagai Data & Produk Intelijen.");
}

console.log(`Role navigation audit: ${sidebarTargets.length} sidebar targets across ${allRoles.length} roles.`);
console.log("\nMenu coverage per role");
for (const [role, targets] of sidebarTargetsByRole) {
  console.log(`  - ${roleLabels[role]}: ${targets.length} target`);
}

function printSection(title, items, formatter) {
  console.log(`\n${title} (${items.length})`);
  if (items.length === 0) {
    console.log("  OK");
    return;
  }

  for (const item of items) console.log(`  - ${formatter(item)}`);
}

printSection("Broken sidebar targets", brokenTargets, formatTarget);
printSection(
  "Sidebar targets without page role guard",
  missingRoleGuard,
  ({ pageRoute, target }) => `${formatTarget(target)} matched ${pageRoute.route}`,
);
printSection(
  "Sidebar targets with role mismatch",
  roleMismatches,
  ({ missingRoles, pageRoute, target }) =>
    `${formatTarget(target)} matched ${pageRoute.route}; missing in page guard: ${missingRoles
      .map((role) => roleLabels[role] ?? role)
      .join(", ")}`,
);
printSection(
  "Role home routes with incomplete coverage",
  missingHomeRouteTargets,
  ({ hasPageRoute, hasSidebarTarget, homeRoute, role }) =>
    `${roleLabels[role] ?? role} -> ${homeRoute}; sidebar=${hasSidebarTarget ? "OK" : "missing"}, page=${
      hasPageRoute ? "OK" : "missing"
    }`,
);
printSection("Structural sidebar rules", structuralNavigationIssues, (issue) => issue);

if (
  brokenTargets.length ||
  missingRoleGuard.length ||
  roleMismatches.length ||
  missingHomeRouteTargets.length ||
  structuralNavigationIssues.length
) {
  process.exitCode = 1;
}
