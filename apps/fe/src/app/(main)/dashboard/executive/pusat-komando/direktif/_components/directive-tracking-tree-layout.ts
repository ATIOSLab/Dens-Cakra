import type { DirectiveGraphEdge, DirectiveGraphNode, DirectiveNodeKind } from "./directive-tracking-graph";

export const DIRECTIVE_NODE_SIZES: Record<DirectiveNodeKind, { width: number; height: number }> = {
  COMMAND: { width: 210, height: 76 },
  REGIONAL: { width: 196, height: 70 },
  SEED: { width: 200, height: 76 },
  COORDINATOR: { width: 190, height: 70 },
  AGENT: { width: 164, height: 62 },
};

const CHILD_GAP = 260;
const SUBTREE_GAP = 260;
const ROOT_MARGIN = 80;

export type DirectiveLayoutPosition = {
  x: number;
  y: number;
};

export type DirectiveTreeLayout = {
  positions: Map<string, DirectiveLayoutPosition>;
  edgeTypes: Map<string, "straight" | "smoothstep">;
};

function levelY(depth: number) {
  if (depth === 0) return 0;
  if (depth === 1) return 220;
  if (depth === 2) return 440;
  if (depth === 3) return 660;
  if (depth === 4) return 900;
  return 1140 + (depth - 5) * 240;
}

/**
 * Places the visible STR tree from scratch on every render. React Flow only
 * receives the resulting coordinates; it never decides the hierarchy.
 */
export function buildDirectiveTreeLayout(
  nodes: DirectiveGraphNode[],
  edges: DirectiveGraphEdge[],
): DirectiveTreeLayout {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const visibleIds = new Set(nodes.map((node) => node.id));
  const childrenById = new Map<string, string[]>();

  for (const node of nodes) {
    childrenById.set(
      node.id,
      node.childrenIds.filter((childId) => visibleIds.has(childId) && nodeById.get(childId)?.parentId === node.id),
    );
  }

  const subtreeWidths = new Map<string, number>();
  const positions = new Map<string, DirectiveLayoutPosition>();

  const measure = (nodeId: string): number => {
    const node = nodeById.get(nodeId);
    if (!node) return 0;

    const ownWidth = DIRECTIVE_NODE_SIZES[node.kind].width;
    const children = childrenById.get(nodeId) ?? [];
    if (children.length === 0) {
      subtreeWidths.set(nodeId, ownWidth);
      return ownWidth;
    }

    const childrenWidth = children.reduce((total, childId) => total + measure(childId), 0);
    const gapsWidth = CHILD_GAP * (children.length - 1);
    const subtreeWidth = Math.max(ownWidth, childrenWidth + gapsWidth);
    subtreeWidths.set(nodeId, subtreeWidth);
    return subtreeWidth;
  };

  const place = (nodeId: string, left: number) => {
    const node = nodeById.get(nodeId);
    const subtreeWidth = subtreeWidths.get(nodeId);
    if (!node || subtreeWidth === undefined) return;

    const centerX = left + subtreeWidth / 2;
    positions.set(nodeId, { x: centerX, y: levelY(node.depth) });

    const children = childrenById.get(nodeId) ?? [];
    if (children.length === 0) return;

    const childrenWidth = children.reduce((total, childId) => total + (subtreeWidths.get(childId) ?? 0), 0);
    const gapsWidth = CHILD_GAP * (children.length - 1);
    let childLeft = left + Math.max(0, (subtreeWidth - childrenWidth - gapsWidth) / 2);

    for (const childId of children) {
      const childWidth = subtreeWidths.get(childId) ?? 0;
      place(childId, childLeft);
      childLeft += childWidth + CHILD_GAP;
    }
  };

  const roots = nodes.filter((node) => !node.parentId || !visibleIds.has(node.parentId));

  // First pass: lay out from left to right starting at ROOT_MARGIN
  let rootLeft = ROOT_MARGIN;
  for (const root of roots) {
    const rootWidth = measure(root.id);
    place(root.id, rootLeft);
    rootLeft += rootWidth + SUBTREE_GAP;
  }

  // Second pass: center the coordinates so the center of the bounding box is x = 0
  let minX = Infinity;
  let maxX = -Infinity;
  positions.forEach((pos) => {
    if (pos.x < minX) minX = pos.x;
    if (pos.x > maxX) maxX = pos.x;
  });
  const centerX = minX === Infinity ? 0 : (minX + maxX) / 2;
  positions.forEach((pos, id) => {
    positions.set(id, { x: pos.x - centerX, y: pos.y });
  });

  const edgeTypes = new Map<string, "straight" | "smoothstep">();
  for (const edge of edges) {
    edgeTypes.set(edge.id, "smoothstep");
  }

  return { positions, edgeTypes };
}
