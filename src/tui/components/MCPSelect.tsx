/**
 * MCPSelect Component - MCP server management menu
 *
 * Shows configured MCP servers with status and allows adding new servers
 */

import React, { useState, useMemo, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import {
  initializeMCP,
  getMCPConfig,
  getServerInstances,
  connectServer,
  disconnectServer,
  addServer,
} from "@services/mcp/index";
import type { MCPServerInstance, MCPServerConfig } from "@/types/mcp";

interface MCPSelectProps {
  onClose: () => void;
  isActive?: boolean;
}

type MenuMode = "list" | "add_name" | "add_command" | "add_args";

interface MenuItem {
  id: string;
  name: string;
  type: "server" | "action";
  server?: MCPServerInstance;
  config?: MCPServerConfig;
}

const MAX_VISIBLE = 8;

const STATE_COLORS: Record<string, string> = {
  connected: "green",
  connecting: "yellow",
  disconnected: "gray",
  error: "red",
};

export function MCPSelect({
  onClose,
  isActive = true,
}: MCPSelectProps): React.ReactElement {
  const [servers, setServers] = useState<Map<string, MCPServerInstance>>(
    new Map(),
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Add new server state
  const [mode, setMode] = useState<MenuMode>("list");
  const [newServerName, setNewServerName] = useState("");
  const [newServerCommand, setNewServerCommand] = useState("");
  const [newServerArgs, setNewServerArgs] = useState("");

  // Load servers on mount
  const loadServers = async () => {
    setLoading(true);
    await initializeMCP();
    const instances = getServerInstances();
    setServers(instances);
    setLoading(false);
  };

  useEffect(() => {
    loadServers();
  }, []);

  // Build menu items
  const menuItems = useMemo((): MenuItem[] => {
    const items: MenuItem[] = [];

    // Add "Add new server" action
    items.push({
      id: "__add__",
      name: "+ Add new MCP server",
      type: "action",
    });

    // Add servers
    for (const [name, instance] of servers) {
      items.push({
        id: name,
        name,
        type: "server",
        server: instance,
        config: instance.config,
      });
    }

    return items;
  }, [servers]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!filter) return menuItems;
    const query = filter.toLowerCase();
    return menuItems.filter((item) => item.name.toLowerCase().includes(query));
  }, [menuItems, filter]);

  // Handle server toggle (connect/disconnect)
  const toggleServer = async (item: MenuItem) => {
    if (!item.server) return;

    setMessage(null);
    try {
      if (item.server.state === "connected") {
        await disconnectServer(item.id);
        setMessage(`Disconnected from ${item.id}`);
      } else {
        setMessage(`Connecting to ${item.id}...`);
        await connectServer(item.id);
        setMessage(`Connected to ${item.id}`);
      }
      await loadServers();
    } catch (err) {
      setMessage(`Error: ${err}`);
    }
  };

  // Handle adding new server
  const handleAddServer = async () => {
    if (!newServerName || !newServerCommand) {
      setMessage("Name and command are required");
      setMode("list");
      return;
    }

    setMessage(`Adding ${newServerName}...`);
    try {
      const args = newServerArgs.split(/\s+/).filter((a) => a.length > 0);

      await addServer(newServerName, {
        command: newServerCommand,
        args: args.length > 0 ? args : undefined,
        enabled: true,
      });

      setMessage(`Added ${newServerName}`);
      setNewServerName("");
      setNewServerCommand("");
      setNewServerArgs("");
      setMode("list");
      await loadServers();
    } catch (err) {
      setMessage(`Error: ${err}`);
      setMode("list");
    }
  };

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Handle add server input modes
      if (mode === "add_name") {
        if (key.escape) {
          setMode("list");
          setNewServerName("");
          return;
        }
        if (key.return) {
          if (newServerName.trim()) {
            setMode("add_command");
          }
          return;
        }
        if (key.backspace || key.delete) {
          setNewServerName(newServerName.slice(0, -1));
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setNewServerName(newServerName + input);
        }
        return;
      }

      if (mode === "add_command") {
        if (key.escape) {
          setMode("add_name");
          return;
        }
        if (key.return) {
          if (newServerCommand.trim()) {
            setMode("add_args");
          }
          return;
        }
        if (key.backspace || key.delete) {
          setNewServerCommand(newServerCommand.slice(0, -1));
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setNewServerCommand(newServerCommand + input);
        }
        return;
      }

      if (mode === "add_args") {
        if (key.escape) {
          setMode("add_command");
          return;
        }
        if (key.return) {
          handleAddServer();
          return;
        }
        if (key.backspace || key.delete) {
          setNewServerArgs(newServerArgs.slice(0, -1));
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setNewServerArgs(newServerArgs + input);
        }
        return;
      }

      // List mode
      if (key.escape) {
        onClose();
        return;
      }

      if (key.return) {
        if (filteredItems.length > 0) {
          const selected = filteredItems[selectedIndex];
          if (selected) {
            if (selected.type === "action" && selected.id === "__add__") {
              setMode("add_name");
              setMessage(null);
            } else if (selected.type === "server") {
              toggleServer(selected);
            }
          }
        }
        return;
      }

      // Navigate up
      if (key.upArrow) {
        setSelectedIndex((prev) => {
          const newIndex = prev > 0 ? prev - 1 : filteredItems.length - 1;
          if (newIndex < scrollOffset) {
            setScrollOffset(newIndex);
          }
          if (prev === 0 && newIndex === filteredItems.length - 1) {
            setScrollOffset(Math.max(0, filteredItems.length - MAX_VISIBLE));
          }
          return newIndex;
        });
        return;
      }

      // Navigate down
      if (key.downArrow) {
        setSelectedIndex((prev) => {
          const newIndex = prev < filteredItems.length - 1 ? prev + 1 : 0;
          if (newIndex >= scrollOffset + MAX_VISIBLE) {
            setScrollOffset(newIndex - MAX_VISIBLE + 1);
          }
          if (prev === filteredItems.length - 1 && newIndex === 0) {
            setScrollOffset(0);
          }
          return newIndex;
        });
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        if (filter.length > 0) {
          setFilter(filter.slice(0, -1));
          setSelectedIndex(0);
          setScrollOffset(0);
        }
        return;
      }

      // Regular character input for filtering
      if (input && !key.ctrl && !key.meta) {
        setFilter(filter + input);
        setSelectedIndex(0);
        setScrollOffset(0);
      }
    },
    { isActive },
  );

  if (loading) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="magenta"
        paddingX={1}
        paddingY={0}
      >
        <Text color="magenta" bold>
          Loading MCP servers...
        </Text>
      </Box>
    );
  }

  // Add new server form
  if (mode !== "list") {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="magenta"
        paddingX={1}
        paddingY={0}
      >
        <Box marginBottom={1}>
          <Text color="magenta" bold>
            Add New MCP Server
          </Text>
        </Box>

        <Box flexDirection="column">
          <Box>
            <Text dimColor>Name: </Text>
            <Text color={mode === "add_name" ? "cyan" : "white"}>
              {newServerName || (mode === "add_name" ? "█" : "")}
            </Text>
            {mode === "add_name" && newServerName && (
              <Text color="cyan">█</Text>
            )}
          </Box>

          <Box>
            <Text dimColor>Command: </Text>
            <Text color={mode === "add_command" ? "cyan" : "white"}>
              {newServerCommand || (mode === "add_command" ? "█" : "")}
            </Text>
            {mode === "add_command" && newServerCommand && (
              <Text color="cyan">█</Text>
            )}
          </Box>

          <Box>
            <Text dimColor>Args (space-separated): </Text>
            <Text color={mode === "add_args" ? "cyan" : "white"}>
              {newServerArgs || (mode === "add_args" ? "█" : "(optional)")}
            </Text>
            {mode === "add_args" && newServerArgs && (
              <Text color="cyan">█</Text>
            )}
          </Box>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>
            {mode === "add_name" && "Enter server name, then press Enter"}
            {mode === "add_command" && "Enter command (e.g., npx), then Enter"}
            {mode === "add_args" && "Enter args or press Enter to finish"}
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Esc to go back</Text>
        </Box>

        {message && (
          <Box marginTop={1}>
            <Text color="yellow">{message}</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="magenta"
      paddingX={1}
      paddingY={0}
    >
      <Box marginBottom={1}>
        <Text color="magenta" bold>
          MCP Servers
        </Text>
        {filter && (
          <>
            <Text dimColor> - filtering: </Text>
            <Text color="yellow">{filter}</Text>
          </>
        )}
      </Box>

      {message && (
        <Box marginBottom={1}>
          <Text color="yellow">{message}</Text>
        </Box>
      )}

      {filteredItems.length === 0 ? (
        <Text dimColor>No servers match "{filter}"</Text>
      ) : (
        <Box flexDirection="column">
          {/* Scroll up indicator */}
          {scrollOffset > 0 && (
            <Text dimColor> ↑ {scrollOffset} more above</Text>
          )}

          {/* Visible items */}
          {filteredItems
            .slice(scrollOffset, scrollOffset + MAX_VISIBLE)
            .map((item, visibleIndex) => {
              const actualIndex = scrollOffset + visibleIndex;
              const isSelected = actualIndex === selectedIndex;

              if (item.type === "action") {
                return (
                  <Box key={item.id}>
                    <Text
                      color={isSelected ? "magenta" : undefined}
                      bold={isSelected}
                    >
                      {isSelected ? "> " : "  "}
                    </Text>
                    <Text color={isSelected ? "magenta" : "cyan"}>
                      {item.name}
                    </Text>
                  </Box>
                );
              }

              const state = item.server?.state || "disconnected";
              const stateColor = STATE_COLORS[state] || "gray";
              const toolCount =
                state === "connected"
                  ? ` (${item.server?.tools.length || 0} tools)`
                  : "";

              return (
                <Box key={item.id} flexDirection="column">
                  <Box>
                    <Text
                      color={isSelected ? "magenta" : undefined}
                      bold={isSelected}
                    >
                      {isSelected ? "> " : "  "}
                    </Text>
                    <Text color={isSelected ? "magenta" : "white"}>
                      {item.name}
                    </Text>
                    <Text> </Text>
                    <Text color={stateColor}>[{state}]</Text>
                    <Text dimColor>{toolCount}</Text>
                  </Box>
                  {item.server?.error && (
                    <Box marginLeft={4}>
                      <Text color="red">{item.server.error}</Text>
                    </Box>
                  )}
                </Box>
              );
            })}

          {/* Scroll down indicator */}
          {scrollOffset + MAX_VISIBLE < filteredItems.length && (
            <Text dimColor>
              ↓ {filteredItems.length - scrollOffset - MAX_VISIBLE} more below
            </Text>
          )}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          ↑↓ navigate | Enter toggle/add | Type to filter | Esc close
        </Text>
      </Box>
    </Box>
  );
}
