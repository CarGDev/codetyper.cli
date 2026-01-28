/**
 * AgentSelect Component - Agent selection menu
 *
 * Shows available agents loaded from .codetyper/agent/*.agent.md files
 */

import React, { useState, useMemo, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { agentLoader } from "@services/agent-loader";
import type { AgentConfig } from "@/types/agent-config";

interface AgentSelectProps {
  onSelect: (agentId: string, agent: AgentConfig) => void;
  onClose: () => void;
  currentAgent?: string;
  isActive?: boolean;
}

const MAX_VISIBLE = 10;

export function AgentSelect({
  onSelect,
  onClose,
  currentAgent = "coder",
  isActive = true,
}: AgentSelectProps): React.ReactElement {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Load agents on mount
  useEffect(() => {
    const loadAgentsAsync = async () => {
      setLoading(true);
      const availableAgents = await agentLoader.getAvailableAgents(
        process.cwd(),
      );
      setAgents(availableAgents);
      setLoading(false);

      // Set initial selection to current agent
      const currentIdx = availableAgents.findIndex(
        (a) => a.id === currentAgent,
      );
      if (currentIdx >= 0) {
        setSelectedIndex(currentIdx);
        if (currentIdx >= MAX_VISIBLE) {
          setScrollOffset(currentIdx - MAX_VISIBLE + 1);
        }
      }
    };

    loadAgentsAsync();
  }, [currentAgent]);

  // Filter agents based on input
  const filteredAgents = useMemo(() => {
    if (!filter) return agents;
    const query = filter.toLowerCase();
    return agents.filter(
      (agent) =>
        agent.id.toLowerCase().includes(query) ||
        agent.name.toLowerCase().includes(query) ||
        agent.description.toLowerCase().includes(query),
    );
  }, [agents, filter]);

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Escape to close
      if (key.escape) {
        onClose();
        return;
      }

      // Enter to select
      if (key.return) {
        if (filteredAgents.length > 0) {
          const selected = filteredAgents[selectedIndex];
          if (selected) {
            onSelect(selected.id, selected);
            onClose();
          }
        }
        return;
      }

      // Navigate up
      if (key.upArrow) {
        setSelectedIndex((prev) => {
          const newIndex = prev > 0 ? prev - 1 : filteredAgents.length - 1;
          if (newIndex < scrollOffset) {
            setScrollOffset(newIndex);
          }
          if (prev === 0 && newIndex === filteredAgents.length - 1) {
            setScrollOffset(Math.max(0, filteredAgents.length - MAX_VISIBLE));
          }
          return newIndex;
        });
        return;
      }

      // Navigate down
      if (key.downArrow) {
        setSelectedIndex((prev) => {
          const newIndex = prev < filteredAgents.length - 1 ? prev + 1 : 0;
          if (newIndex >= scrollOffset + MAX_VISIBLE) {
            setScrollOffset(newIndex - MAX_VISIBLE + 1);
          }
          if (prev === filteredAgents.length - 1 && newIndex === 0) {
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
          Loading agents...
        </Text>
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
          Select Agent
        </Text>
        {filter && (
          <>
            <Text dimColor> - filtering: </Text>
            <Text color="yellow">{filter}</Text>
          </>
        )}
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>Current: </Text>
        <Text color="cyan">
          {agents.find((a) => a.id === currentAgent)?.name ?? currentAgent}
        </Text>
      </Box>

      {filteredAgents.length === 0 ? (
        <Text dimColor>No agents match "{filter}"</Text>
      ) : (
        <Box flexDirection="column">
          {/* Scroll up indicator */}
          {scrollOffset > 0 && (
            <Text dimColor> ↑ {scrollOffset} more above</Text>
          )}

          {/* Visible agents */}
          {filteredAgents
            .slice(scrollOffset, scrollOffset + MAX_VISIBLE)
            .map((agent, visibleIndex) => {
              const actualIndex = scrollOffset + visibleIndex;
              const isSelected = actualIndex === selectedIndex;
              const isCurrent = agent.id === currentAgent;
              const isDefault = agent.id === "coder";
              return (
                <Box key={agent.id} flexDirection="column">
                  <Box>
                    <Text
                      color={isSelected ? "magenta" : undefined}
                      bold={isSelected}
                    >
                      {isSelected ? "> " : "  "}
                    </Text>
                    <Text
                      color={
                        isDefault
                          ? "yellow"
                          : isSelected
                            ? "magenta"
                            : undefined
                      }
                      bold={isSelected || isDefault}
                    >
                      {agent.name}
                    </Text>
                    {isCurrent && <Text color="green"> (current)</Text>}
                  </Box>
                  {agent.description && (
                    <Box marginLeft={4}>
                      <Text dimColor>{agent.description}</Text>
                    </Box>
                  )}
                </Box>
              );
            })}

          {/* Scroll down indicator */}
          {scrollOffset + MAX_VISIBLE < filteredAgents.length && (
            <Text dimColor>
              {" "}
              ↓ {filteredAgents.length - scrollOffset - MAX_VISIBLE} more below
            </Text>
          )}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          ↑↓ navigate | Enter select | Type to filter | Esc close
        </Text>
      </Box>
    </Box>
  );
}
