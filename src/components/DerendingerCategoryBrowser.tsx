import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Check,
  Loader2,
  FolderTree,
} from 'lucide-react';
import api from '../lib/api';
import { AVAILABLE_PARTS } from '../data/derendinger-parts';

interface CategoryNode {
  id: string;
  description: string;
  sagCode?: string;
  children?: CategoryNode[];
  genArts?: {
    gaid: string;
    cupis?: { zone: string; cupi: string; loc: string }[];
  }[];
}

interface Props {
  vin?: string;
  onPartSelect: (part: { partCode: string; name: string; functionalGroup: string }) => void;
  isPartSelected: (partCode: string) => boolean;
}

// Default VIN used to generate the static catalog — gives us the category tree structure
const DEFAULT_VIN = 'WDD2053431F759027';

export default function DerendingerCategoryBrowser({ vin, onPartSelect, isPartSelected }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [useFallback, setUseFallback] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  // Auto-fetch category tree on mount (uses provided VIN or default)
  const actualVin = vin || DEFAULT_VIN;
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setUseFallback(false);
    setCategories([]);
    const fetchCategories = async () => {
      try {
        const res = await api.get(`/derendinger/categories?vin=${encodeURIComponent(actualVin)}`);
        if (!cancelled && res.data.success && res.data.data.categories?.length > 0) {
          setCategories(res.data.data.categories);
        } else if (!cancelled) {
          setUseFallback(true);
        }
      } catch {
        if (!cancelled) setUseFallback(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchCategories();
    return () => { cancelled = true; };
  }, [actualVin]);

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // Check if a node or any descendant matches search
  const nodeMatchesSearch = useCallback(
    (node: CategoryNode, term: string): boolean => {
      const lower = term.toLowerCase();
      if (node.description?.toLowerCase().includes(lower)) return true;
      if (node.genArts) {
        for (const ga of node.genArts) {
          if (ga.cupis) {
            for (const c of ga.cupis) {
              if (c.cupi.toLowerCase().includes(lower) || c.loc?.toLowerCase().includes(lower))
                return true;
            }
          }
        }
      }
      if (node.children) {
        return node.children.some((child) => nodeMatchesSearch(child, term));
      }
      return false;
    },
    [],
  );

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const filterTree = (nodes: CategoryNode[]): CategoryNode[] => {
      return nodes
        .filter((n) => nodeMatchesSearch(n, search))
        .map((n) => ({
          ...n,
          children: n.children ? filterTree(n.children) : undefined,
        }));
    };
    return filterTree(categories);
  }, [categories, search, nodeMatchesSearch]);

  // Filter static parts by search (fallback)
  const filteredStaticParts = useMemo(() => {
    if (!search.trim()) return AVAILABLE_PARTS;
    return AVAILABLE_PARTS.map((cat) => ({
      ...cat,
      parts: cat.parts.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.partCode.toLowerCase().includes(search.toLowerCase()),
      ),
    })).filter((cat) => cat.parts.length > 0);
  }, [search]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <FolderTree className="w-5 h-5 text-primary-600" />
        Teile auswählen
      </h3>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
          placeholder="Teile suchen... (z.B. Ölfilter, Bremse)"
        />
      </div>

      {/* Info line */}
      <p className="text-xs text-gray-500">
        {isLoading
          ? 'Kategorien werden geladen...'
          : useFallback
            ? `${AVAILABLE_PARTS.reduce((s, c) => s + c.parts.length, 0)} Teile in ${AVAILABLE_PARTS.length} Kategorien`
            : `${categories.length} Kategorien verfügbar`}
      </p>

      {/* Tree content */}
      <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Kategorien werden geladen...
          </div>
        ) : useFallback ? (
          /* Static fallback catalog */
          filteredStaticParts.map((category) => (
            <StaticCategoryRow
              key={category.category}
              category={category}
              expandedNodes={expandedNodes}
              onToggle={toggleNode}
              onPartSelect={onPartSelect}
              isPartSelected={isPartSelected}
            />
          ))
        ) : (
          /* d-store category tree */
          filteredCategories.map((node) => (
            <CategoryTreeNode
              key={node.id}
              node={node}
              depth={0}
              expandedNodes={expandedNodes}
              onToggle={toggleNode}
              onPartSelect={onPartSelect}
              isPartSelected={isPartSelected}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* Static fallback category row (same UI as before) */
function StaticCategoryRow({
  category,
  expandedNodes,
  onToggle,
  onPartSelect,
  isPartSelected,
}: {
  category: { category: string; parts: { partCode: string; name: string; functionalGroup: string }[] };
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  onPartSelect: (part: { partCode: string; name: string; functionalGroup: string }) => void;
  isPartSelected: (partCode: string) => boolean;
}) {
  const isExpanded = expandedNodes.has(category.category);
  const selectedCount = category.parts.filter((p) => isPartSelected(p.partCode)).length;

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(category.category)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm">{category.category}</span>
          <span className="text-xs text-gray-500">({category.parts.length})</span>
          {selectedCount > 0 && (
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
              {selectedCount} ausgewählt
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="p-2 space-y-1 bg-white">
          {category.parts.map((part) => {
            const selected = isPartSelected(part.partCode);
            return (
              <button
                key={part.partCode}
                type="button"
                onClick={() => onPartSelect(part)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                  selected
                    ? 'bg-primary-100 border border-primary-300'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{part.name}</p>
                  <p className="text-xs text-gray-400">{part.partCode}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-2 ${
                    selected ? 'bg-primary-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  {selected && <Check className="w-3 h-3" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Recursive d-store category tree node */
function CategoryTreeNode({
  node,
  depth,
  expandedNodes,
  onToggle,
  onPartSelect,
  isPartSelected,
}: {
  node: CategoryNode;
  depth: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  onPartSelect: (part: { partCode: string; name: string; functionalGroup: string }) => void;
  isPartSelected: (partCode: string) => boolean;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const leafParts = !hasChildren ? getNodeLeafParts(node) : [];
  const isBranch = hasChildren;

  const selectedInSubtree = useMemo(() => {
    if (leafParts.length > 0) {
      return leafParts.filter((p) => isPartSelected(p.partCode)).length;
    }
    return 0;
  }, [leafParts, isPartSelected]);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => (isBranch ? onToggle(node.id) : undefined)}
        className={`w-full flex items-center gap-1.5 text-left transition-colors ${
          isBranch ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px`, paddingRight: 12, paddingTop: 8, paddingBottom: 8 }}
      >
        {isBranch ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <span className={`text-sm ${depth === 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
          {node.description}
        </span>
        {selectedInSubtree > 0 && (
          <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium ml-auto">
            {selectedInSubtree}
          </span>
        )}
      </button>

      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onPartSelect={onPartSelect}
              isPartSelected={isPartSelected}
            />
          ))}
        </div>
      )}

      {!hasChildren && leafParts.length > 0 && (
        <div className="pb-1" style={{ paddingLeft: `${depth * 16 + 28}px` }}>
          {leafParts.map((part) => {
            const selected = isPartSelected(part.partCode);
            return (
              <button
                key={`${part.partCode}-${part.functionalGroup}`}
                type="button"
                onClick={() => onPartSelect(part)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all mr-2 ${
                  selected
                    ? 'bg-primary-100 border border-primary-300'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{part.name}</p>
                  <p className="text-xs text-gray-400">{part.partCode}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-2 ${
                    selected ? 'bg-primary-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  {selected && <Check className="w-3 h-3" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getNodeLeafParts(node: CategoryNode): { partCode: string; name: string; functionalGroup: string }[] {
  const parts: { partCode: string; name: string; functionalGroup: string }[] = [];
  if (!node.genArts) return parts;
  for (const ga of node.genArts) {
    if (!ga.cupis) continue;
    for (const cupi of ga.cupis) {
      parts.push({
        partCode: cupi.cupi,
        name: `${node.description}${cupi.loc ? ` (${cupi.loc})` : ''}`,
        functionalGroup: cupi.zone,
      });
    }
  }
  return parts;
}
