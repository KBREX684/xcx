"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import type { AssignableAgentOption } from "@agent-control-plane/domain";
import { getAgentStatusLabel } from "../lib/format";

interface MentionTrigger {
  start: number; // index of '@'
  end: number; // caret position (exclusive)
  query: string; // text after '@', lower-case
}

function detectMentionTrigger(text: string, caret: number): MentionTrigger | null {
  if (caret <= 0) return null;
  let i = caret - 1;
  while (i >= 0) {
    const ch = text[i] ?? "";
    if (ch === "@") {
      const previous = i > 0 ? (text[i - 1] ?? "") : "";
      if (i === 0 || /\s/.test(previous)) {
        const query = text.slice(i + 1, caret);
        if (/[\s@]/.test(query)) return null;
        return { start: i, end: caret, query: query.toLowerCase() };
      }
      return null;
    }
    if (/\s/.test(ch)) return null;
    i -= 1;
  }
  return null;
}

export function CommentComposer({
  agents,
  textareaName = "body",
  placeholder,
  rows = 4,
}: {
  agents: AssignableAgentOption[];
  textareaName?: string;
  placeholder?: string;
  rows?: number;
}) {
  const listboxId = useId();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [trigger, setTrigger] = useState<MentionTrigger | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const filtered = useMemo(() => {
    if (!trigger) return [];
    const q = trigger.query;
    if (!q) return agents.slice(0, 8);
    return agents
      .filter((a) => {
        const haystack = `${a.name} ${a.roleName} ${a.teamName ?? ""}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [agents, trigger]);

  useEffect(() => {
    setActiveIndex(0);
  }, [trigger?.query, trigger?.start]);

  useEffect(() => {
    if (!trigger) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setTrigger(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [trigger]);

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    const caret = e.target.selectionStart ?? value.length;
    setTrigger(detectMentionTrigger(value, caret));
  }, []);

  const handleSelect = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? el.value.length;
    setTrigger(detectMentionTrigger(el.value, caret));
  }, []);

  const insertAgent = useCallback(
    (agent: AssignableAgentOption) => {
      const el = textareaRef.current;
      if (!el || !trigger) return;
      const before = text.slice(0, trigger.start);
      const after = text.slice(trigger.end);
      const insertion = `@${agent.name} `;
      const next = `${before}${insertion}${after}`;
      const newCaret = before.length + insertion.length;
      setText(next);
      setSelected((current) => (current.includes(agent.id) ? current : [...current, agent.id]));
      setTrigger(null);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(newCaret, newCaret);
      });
    },
    [text, trigger],
  );

  const removeSelected = useCallback((agentId: string) => {
    setSelected((current) => current.filter((id) => id !== agentId));
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!trigger || filtered.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const agent = filtered[activeIndex] ?? filtered[0];
        if (agent) insertAgent(agent);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setTrigger(null);
      }
    },
    [trigger, filtered, activeIndex, insertAgent],
  );

  const selectedAgents = selected
    .map((id) => agentById.get(id))
    .filter((a): a is AssignableAgentOption => Boolean(a));

  return (
    <div className="comment-composer" ref={containerRef}>
      {selectedAgents.length > 0 ? (
        <div className="mention-picker" aria-label="已选择的智能体">
          {selectedAgents.map((agent) => (
            <span key={agent.id} className="mention-chip" data-active="true">
              @{agent.name}
              <button
                type="button"
                className="mention-chip-remove"
                aria-label={`移除 @${agent.name}`}
                onClick={() => removeSelected(agent.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="mention-anchor">
        <textarea
          ref={textareaRef}
          name={textareaName}
          className="field-control field-control-textarea"
          rows={rows}
          placeholder={placeholder ?? "写下进展，输入 @ 选择智能体进行结构化派遣。"}
          value={text}
          onChange={handleChange}
          onSelect={handleSelect}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={Boolean(trigger && filtered.length > 0)}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />
        {trigger && filtered.length > 0 ? (
          <ul id={listboxId} role="listbox" className="mention-popover" aria-label="选择智能体">
            {filtered.map((agent, idx) => (
              <li
                key={agent.id}
                role="option"
                aria-selected={idx === activeIndex}
                className="mention-option"
                data-active={idx === activeIndex ? "true" : "false"}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertAgent(agent);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <span className="mention-option-name">@{agent.name}</span>
                <span className="mention-option-meta">
                  {agent.roleName}
                  {agent.teamName ? ` · ${agent.teamName}` : ""}
                  {agent.status ? ` · ${getAgentStatusLabel(agent.status)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {trigger && filtered.length === 0 ? (
          <div className="mention-popover mention-popover-empty" role="status">
            未找到匹配智能体，按 Esc 取消
          </div>
        ) : null}
      </div>

      {selected.map((agentId) => (
        <input key={agentId} type="hidden" name="mentionAgentIds" value={agentId} />
      ))}
    </div>
  );
}
