"use client";
import React, { useState, useMemo } from "react";
import { GraphNode } from "@/types";
import {
  Folder,
  FolderOpen,
  FileCode,
  Package,
  Search,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react";

interface FileExplorerProps {
  nodes: GraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

interface TreeNode {
  name: string;
  fullPath: string;
  nodeId?: string;
  isDir: boolean;
  children: Record<string, TreeNode>;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onClose,
  isMobileDrawer = false,
}) => {
  const [filter, setFilter] = useState("");
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());

  // Build tree from file nodes, respecting filter
  const tree = useMemo(() => {
    const root: TreeNode = { name: "root", fullPath: "", isDir: true, children: {} };
    const cleanFilter = filter.trim().toLowerCase();

    const fileNodes = nodes.filter((n) => {
      if (n.type !== "file") return false;
      if (!cleanFilter) return true;
      return (
        n.label.toLowerCase().includes(cleanFilter) ||
        (n.path && n.path.toLowerCase().includes(cleanFilter))
      );
    });

    for (const node of fileNodes) {
      if (!node.path) continue;
      const parts = node.path.split("/");
      let curr = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join("/");

        if (!curr.children[part]) {
          curr.children[part] = {
            name: part,
            fullPath: currentPath,
            nodeId: isFile ? node.id : undefined,
            isDir: !isFile,
            children: {},
          };
        }
        curr = curr.children[part];
      }
    }
    return root;
  }, [nodes, filter]);

  const toggleDir = (dirPath: string) => {
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  };

  const renderTree = (item: TreeNode, depth: number = 0) => {
    const isCollapsed = collapsedDirs.has(item.fullPath);
    const sortedChildren = Object.values(item.children).sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return (
      <div key={item.fullPath || "root"}>
        {item.fullPath && (
          <div
            role="treeitem"
            tabIndex={0}
            aria-expanded={item.isDir ? !isCollapsed : undefined}
            aria-selected={item.nodeId ? item.nodeId === selectedNodeId : false}
            aria-label={item.isDir ? `${item.name} folder` : item.name}
            onClick={() => {
              if (item.isDir) {
                toggleDir(item.fullPath);
              } else if (item.nodeId) {
                onSelectNode(item.nodeId);
                if (isMobileDrawer && onClose) {
                  onClose();
                }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (item.isDir) {
                  toggleDir(item.fullPath);
                } else if (item.nodeId) {
                  onSelectNode(item.nodeId);
                  if (isMobileDrawer && onClose) {
                    onClose();
                  }
                }
              } else if (e.key === "ArrowRight" && item.isDir && isCollapsed) {
                e.preventDefault();
                toggleDir(item.fullPath);
              } else if (e.key === "ArrowLeft" && item.isDir && !isCollapsed) {
                e.preventDefault();
                toggleDir(item.fullPath);
              }
            }}
            className="font-mono"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              paddingLeft: `${12 + depth * 14}px`,
              cursor: "pointer",
              fontSize: "12px",
              minHeight: "34px",
              background:
                item.nodeId === selectedNodeId
                  ? "var(--accent)"
                  : "transparent",
              color:
                item.nodeId === selectedNodeId
                  ? "#11100F"
                  : "var(--ink)",
              fontWeight: item.nodeId === selectedNodeId ? 700 : 400,
              userSelect: "none",
              borderBottom: "1px solid rgba(0,0,0,0.03)",
              outline: "none",
            }}
          >
            {item.isDir ? (
              <>
                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                {isCollapsed ? <Folder size={14} /> : <FolderOpen size={14} />}
              </>
            ) : (
              <FileCode size={13} />
            )}
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "200px",
              }}
              title={item.name}
            >
              {item.name}
            </span>
          </div>
        )}

        {(!isCollapsed || !item.fullPath) &&
          sortedChildren.map((child) => renderTree(child, depth + 1))}
      </div>
    );
  };

  // External packages
  const cleanFilter = filter.trim().toLowerCase();
  const packageNodes = nodes.filter((n) => {
    if (n.type !== "package") return false;
    if (!cleanFilter) return true;
    return n.label.toLowerCase().includes(cleanFilter);
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRight: isMobileDrawer ? "none" : "1.5px solid var(--border)",
        background: "var(--white)",
        width: isMobileDrawer ? "100%" : "280px",
        minWidth: isMobileDrawer ? "100%" : "240px",
      }}
    >
      {/* Explorer header */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--paper)",
        }}
      >
        <span
          className="font-mono"
          style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em" }}
        >
          EXPLORER
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            className="font-mono"
            style={{ fontSize: "11px", color: "var(--muted)" }}
          >
            {nodes.filter((n) => n.type === "file").length} FILES
          </span>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close Explorer"
              style={{
                padding: "0 10px",
                height: "32px",
                minHeight: "32px",
                fontSize: "11px",
                border: "1px solid var(--border)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Filter box */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--paper)",
            border: "1px solid var(--border)",
            padding: "0 8px",
            height: "34px",
            minHeight: "34px",
            boxSizing: "border-box",
          }}
        >
          <Search size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Filter files..."
            aria-label="Filter files"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: "100%",
              height: "100%",
              padding: "0 4px",
              fontSize: "12px",
              border: "none",
              background: "transparent",
              outline: "none",
            }}
          />
          {filter && (
            <button
              onClick={() => setFilter("")}
              aria-label="Clear filter"
              style={{
                border: "none",
                background: "transparent",
                padding: "0",
                minHeight: "auto",
                cursor: "pointer",
              }}
            >
              <X size={12} style={{ color: "var(--muted)" }} />
            </button>
          )}
        </div>
      </div>

      {/* Tree view */}
      <div
        role="tree"
        aria-label="Repository files"
        className="touch-pan-y"
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        {renderTree(tree, 0)}

        {/* Packages section */}
        {packageNodes.length > 0 && (
          <div style={{ marginTop: "16px", borderTop: "1px solid var(--border)" }}>
            <div
              className="font-mono"
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--muted)",
                padding: "8px 12px 4px",
                letterSpacing: "0.08em",
              }}
            >
              PACKAGES ({packageNodes.length})
            </div>
            {packageNodes.map((pkg) => (
              <div
                key={pkg.id}
                role="treeitem"
                tabIndex={0}
                aria-selected={pkg.id === selectedNodeId}
                aria-label={`Package ${pkg.label}`}
                onClick={() => {
                  onSelectNode(pkg.id);
                  if (isMobileDrawer && onClose) {
                    onClose();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectNode(pkg.id);
                    if (isMobileDrawer && onClose) {
                      onClose();
                    }
                  }
                }}
                className="font-mono"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  minHeight: "34px",
                  cursor: "pointer",
                  background:
                    pkg.id === selectedNodeId ? "var(--accent)" : "transparent",
                  color:
                    pkg.id === selectedNodeId ? "#11100F" : "var(--muted)",
                  fontWeight: pkg.id === selectedNodeId ? 700 : 400,
                  outline: "none",
                }}
              >
                <Package size={13} />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "200px",
                  }}
                  title={pkg.label}
                >
                  {pkg.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
