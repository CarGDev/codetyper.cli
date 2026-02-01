/**
 * MCPBrowser Component - Browse and search MCP servers from registry
 *
 * Allows users to discover, search, and install MCP servers
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import {
  searchServers,
  getCuratedServers,
  installServer,
  isServerInstalled,
  getCategoriesWithCounts,
} from "@services/mcp/index";
import type {
  MCPRegistryServer,
  MCPServerCategory,
} from "@/types/mcp-registry";
import {
  MCP_CATEGORY_LABELS,
  MCP_CATEGORY_ICONS,
} from "@constants/mcp-registry";

interface MCPBrowserProps {
  onClose: () => void;
  onInstalled?: (serverName: string) => void;
  isActive?: boolean;
}

type BrowserMode = "browse" | "search" | "category" | "detail" | "installing";

interface CategoryCount {
  category: MCPServerCategory;
  count: number;
}

const MAX_VISIBLE = 8;

const STATUS_COLORS = {
  verified: "green",
  installed: "cyan",
  popular: "yellow",
  default: "white",
} as const;

export function MCPBrowser({
  onClose,
  onInstalled,
  isActive = true,
}: MCPBrowserProps): React.ReactElement {
  const [mode, setMode] = useState<BrowserMode>("browse");
  const [servers, setServers] = useState<MCPRegistryServer[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MCPServerCategory | null>(null);
  const [selectedServer, setSelectedServer] = useState<MCPRegistryServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const curatedServers = getCuratedServers();
      setServers(curatedServers);
      const cats = await getCategoriesWithCounts();
      setCategories(cats);
    } catch {
      setServers(getCuratedServers());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search handler
  const handleSearch = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const result = await searchServers({
        query,
        category: selectedCategory || undefined,
      });
      setServers(result.servers);
    } catch {
      setMessage("Search failed");
      setMessageType("error");
    }
    setLoading(false);
  }, [selectedCategory]);

  // Category filter handler
  const handleCategorySelect = useCallback(async (category: MCPServerCategory | null) => {
    setSelectedCategory(category);
    setLoading(true);
    try {
      const result = await searchServers({
        query: searchQuery,
        category: category || undefined,
      });
      setServers(result.servers);
    } catch {
      setMessage("Failed to filter");
      setMessageType("error");
    }
    setLoading(false);
    setMode("browse");
    setSelectedIndex(0);
    setScrollOffset(0);
  }, [searchQuery]);

  // Install handler
  const handleInstall = useCallback(async (server: MCPRegistryServer) => {
    setMode("installing");
    setMessage(`Installing ${server.name}...`);
    setMessageType("info");

    try {
      const result = await installServer(server, { connect: true });
      if (result.success) {
        setMessage(`Installed ${server.name}${result.connected ? " and connected" : ""}`);
        setMessageType("success");
        onInstalled?.(server.id);
      } else {
        setMessage(result.error || "Installation failed");
        setMessageType("error");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Installation failed");
      setMessageType("error");
    }

    setMode("browse");
    setTimeout(() => setMessage(null), 3000);
  }, [onInstalled]);

  // Filtered and displayed items
  const displayItems = useMemo(() => {
    if (mode === "category") {
      return categories.map((cat) => ({
        id: cat.category,
        label: `${MCP_CATEGORY_ICONS[cat.category]} ${MCP_CATEGORY_LABELS[cat.category]}`,
        count: cat.count,
      }));
    }
    return servers;
  }, [mode, servers, categories]);

  // Visible window
  const visibleItems = useMemo(() => {
    if (mode === "category") {
      return displayItems.slice(scrollOffset, scrollOffset + MAX_VISIBLE);
    }
    return servers.slice(scrollOffset, scrollOffset + MAX_VISIBLE);
  }, [displayItems, servers, scrollOffset, mode]);

  // Input handling
  useInput(
    (input, key) => {
      if (!isActive) return;

      // Clear message on any key
      if (message && mode !== "installing") {
        setMessage(null);
      }

      // Escape handling
      if (key.escape) {
        if (mode === "detail") {
          setMode("browse");
          setSelectedServer(null);
        } else if (mode === "search") {
          setMode("browse");
          setSearchQuery("");
        } else if (mode === "category") {
          setMode("browse");
        } else {
          onClose();
        }
        return;
      }

      // Installing mode - ignore input
      if (mode === "installing") return;

      // Search mode - typing
      if (mode === "search") {
        if (key.return) {
          handleSearch(searchQuery);
          setMode("browse");
        } else if (key.backspace || key.delete) {
          setSearchQuery((prev) => prev.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
          setSearchQuery((prev) => prev + input);
        }
        return;
      }

      // Detail mode
      if (mode === "detail" && selectedServer) {
        if (key.return || input === "i") {
          if (!isServerInstalled(selectedServer.id)) {
            handleInstall(selectedServer);
          } else {
            setMessage("Already installed");
            setMessageType("info");
            setTimeout(() => setMessage(null), 2000);
          }
        }
        return;
      }

      // Navigation
      if (key.upArrow || input === "k") {
        setSelectedIndex((prev) => {
          const newIndex = Math.max(0, prev - 1);
          if (newIndex < scrollOffset) {
            setScrollOffset(newIndex);
          }
          return newIndex;
        });
      } else if (key.downArrow || input === "j") {
        const maxIndex = (mode === "category" ? categories.length : servers.length) - 1;
        setSelectedIndex((prev) => {
          const newIndex = Math.min(maxIndex, prev + 1);
          if (newIndex >= scrollOffset + MAX_VISIBLE) {
            setScrollOffset(newIndex - MAX_VISIBLE + 1);
          }
          return newIndex;
        });
      } else if (key.return) {
        // Select item
        if (mode === "category") {
          const cat = categories[selectedIndex];
          if (cat) {
            handleCategorySelect(cat.category);
          }
        } else {
          const server = servers[selectedIndex];
          if (server) {
            setSelectedServer(server);
            setMode("detail");
          }
        }
      } else if (input === "/") {
        setMode("search");
        setSearchQuery("");
      } else if (input === "c") {
        setMode("category");
        setSelectedIndex(0);
        setScrollOffset(0);
      } else if (input === "i" && mode === "browse") {
        const server = servers[selectedIndex];
        if (server && !isServerInstalled(server.id)) {
          handleInstall(server);
        }
      } else if (input === "r") {
        loadData();
      }
    },
    { isActive }
  );

  // Render loading
  if (loading && servers.length === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        width={60}
      >
        <Box justifyContent="center" marginY={1}>
          <Text color="cyan" bold>
            MCP Server Browser
          </Text>
        </Box>
        <Box justifyContent="center" marginY={1}>
          <Text color="gray">Loading servers...</Text>
        </Box>
      </Box>
    );
  }

  // Render detail view
  if (mode === "detail" && selectedServer) {
    const installed = isServerInstalled(selectedServer.id);
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        width={60}
      >
        <Box justifyContent="center" marginBottom={1}>
          <Text color="cyan" bold>
            {selectedServer.name}
          </Text>
          {selectedServer.verified && (
            <Text color="green"> ✓</Text>
          )}
        </Box>

        <Box flexDirection="column" paddingX={1}>
          <Text color="gray" wrap="wrap">
            {selectedServer.description}
          </Text>

          <Box marginTop={1}>
            <Text color="gray">Author: </Text>
            <Text>{selectedServer.author}</Text>
          </Box>

          <Box>
            <Text color="gray">Category: </Text>
            <Text>
              {MCP_CATEGORY_ICONS[selectedServer.category]}{" "}
              {MCP_CATEGORY_LABELS[selectedServer.category]}
            </Text>
          </Box>

          <Box>
            <Text color="gray">Package: </Text>
            <Text color="yellow">{selectedServer.package}</Text>
          </Box>

          {selectedServer.envVars && selectedServer.envVars.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="gray">Required env vars:</Text>
              {selectedServer.envVars.map((envVar) => (
                <Text key={envVar} color="magenta">
                  {"  "}${envVar}
                </Text>
              ))}
            </Box>
          )}

          {selectedServer.installHint && (
            <Box marginTop={1}>
              <Text color="gray" wrap="wrap">
                Note: {selectedServer.installHint}
              </Text>
            </Box>
          )}
        </Box>

        {message && (
          <Box justifyContent="center" marginTop={1}>
            <Text
              color={
                messageType === "success"
                  ? "green"
                  : messageType === "error"
                  ? "red"
                  : "yellow"
              }
            >
              {message}
            </Text>
          </Box>
        )}

        <Box justifyContent="center" marginTop={1} paddingTop={1} borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
          {installed ? (
            <Text color="cyan">Already installed</Text>
          ) : (
            <Text>
              <Text color="green">[Enter/i]</Text> Install{" "}
              <Text color="gray">[Esc]</Text> Back
            </Text>
          )}
        </Box>
      </Box>
    );
  }

  // Render category view
  if (mode === "category") {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        width={60}
      >
        <Box justifyContent="center" marginBottom={1}>
          <Text color="cyan" bold>
            Select Category
          </Text>
        </Box>

        {/* All categories option */}
        <Box
          paddingX={1}
          backgroundColor={selectedIndex === -1 ? "cyan" : undefined}
        >
          <Text
            color={selectedIndex === -1 ? "black" : "white"}
            bold={selectedIndex === -1}
          >
            📋 All Categories
          </Text>
        </Box>

        {visibleItems.map((item, index) => {
          const actualIndex = index + scrollOffset;
          const isSelected = actualIndex === selectedIndex;
          const catItem = item as { id: string; label: string; count: number };

          return (
            <Box
              key={catItem.id}
              paddingX={1}
              backgroundColor={isSelected ? "cyan" : undefined}
            >
              <Text
                color={isSelected ? "black" : "white"}
                bold={isSelected}
              >
                {catItem.label} ({catItem.count})
              </Text>
            </Box>
          );
        })}

        <Box
          justifyContent="center"
          marginTop={1}
          paddingTop={1}
          borderStyle="single"
          borderTop
          borderBottom={false}
          borderLeft={false}
          borderRight={false}
        >
          <Text color="gray">
            <Text color="cyan">[↑↓]</Text> Navigate{" "}
            <Text color="cyan">[Enter]</Text> Select{" "}
            <Text color="cyan">[Esc]</Text> Back
          </Text>
        </Box>
      </Box>
    );
  }

  // Render search mode
  if (mode === "search") {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        width={60}
      >
        <Box justifyContent="center" marginBottom={1}>
          <Text color="cyan" bold>
            Search MCP Servers
          </Text>
        </Box>

        <Box paddingX={1}>
          <Text color="gray">/ </Text>
          <Text>{searchQuery}</Text>
          <Text color="cyan">▋</Text>
        </Box>

        <Box
          justifyContent="center"
          marginTop={1}
          paddingTop={1}
          borderStyle="single"
          borderTop
          borderBottom={false}
          borderLeft={false}
          borderRight={false}
        >
          <Text color="gray">
            <Text color="cyan">[Enter]</Text> Search{" "}
            <Text color="cyan">[Esc]</Text> Cancel
          </Text>
        </Box>
      </Box>
    );
  }

  // Render browse mode
  const hasMore = servers.length > scrollOffset + MAX_VISIBLE;
  const hasLess = scrollOffset > 0;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      width={60}
    >
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color="cyan" bold>
          MCP Server Browser
        </Text>
        <Text color="gray">
          {servers.length} servers
          {selectedCategory && ` • ${MCP_CATEGORY_LABELS[selectedCategory]}`}
        </Text>
      </Box>

      {hasLess && (
        <Box justifyContent="center">
          <Text color="gray">↑ more</Text>
        </Box>
      )}

      {visibleItems.map((server, index) => {
        const actualIndex = index + scrollOffset;
        const isSelected = actualIndex === selectedIndex;
        const installed = isServerInstalled((server as MCPRegistryServer).id);

        return (
          <Box
            key={(server as MCPRegistryServer).id}
            paddingX={1}
            backgroundColor={isSelected ? "cyan" : undefined}
          >
            <Box width={45}>
              <Text
                color={isSelected ? "black" : installed ? "cyan" : "white"}
                bold={isSelected}
              >
                {(server as MCPRegistryServer).verified ? "✓ " : "  "}
                {(server as MCPRegistryServer).name}
              </Text>
            </Box>
            <Box width={10} justifyContent="flex-end">
              {installed ? (
                <Text color={isSelected ? "black" : "cyan"}>installed</Text>
              ) : (
                <Text color={isSelected ? "black" : "gray"}>
                  {MCP_CATEGORY_ICONS[(server as MCPRegistryServer).category]}
                </Text>
              )}
            </Box>
          </Box>
        );
      })}

      {hasMore && (
        <Box justifyContent="center">
          <Text color="gray">↓ more</Text>
        </Box>
      )}

      {message && (
        <Box justifyContent="center" marginTop={1}>
          <Text
            color={
              messageType === "success"
                ? "green"
                : messageType === "error"
                ? "red"
                : "yellow"
            }
          >
            {message}
          </Text>
        </Box>
      )}

      <Box
        justifyContent="center"
        marginTop={1}
        paddingTop={1}
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
      >
        <Text color="gray">
          <Text color="cyan">[/]</Text> Search{" "}
          <Text color="cyan">[c]</Text> Category{" "}
          <Text color="cyan">[i]</Text> Install{" "}
          <Text color="cyan">[Esc]</Text> Close
        </Text>
      </Box>
    </Box>
  );
}

export default MCPBrowser;
