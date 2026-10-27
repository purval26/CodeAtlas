"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string;
  description?: string;
}

interface CustomSelectProps<T extends string = string> {
  labelPrefix?: string;
  value: T;
  options: CustomSelectOption<T>[];
  onChange: (value: T) => void;
  icon?: React.ReactNode;
  ariaLabel?: string;
  compact?: boolean;
}

export function CustomSelect<T extends string = string>({
  labelPrefix,
  value,
  options,
  onChange,
  icon,
  ariaLabel,
  compact = false,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-block" }}
      className="custom-select-container"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || labelPrefix || "Select option"}
        className="font-mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          background: isOpen ? "var(--hover-bg)" : "var(--paper)",
          color: "var(--ink)",
          border: "1.5px solid var(--ink)",
          padding: compact ? "2px 7px" : "3px 8px",
          fontSize: compact ? "10px" : "11px",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: isOpen ? "none" : "2px 2px 0px rgba(0, 0, 0, 0.12)",
          minHeight: compact ? "26px" : "28px",
          userSelect: "none",
          transition: "background 0.12s ease",
          outline: "none",
        }}
      >
        {icon && <span style={{ display: "flex", alignItems: "center", color: "var(--muted)" }}>{icon}</span>}
        {labelPrefix && (
          <span style={{ color: "var(--muted)", fontWeight: 800, fontSize: "9px", letterSpacing: "0.04em" }}>
            {labelPrefix}
          </span>
        )}
        <span style={{ color: "var(--ink)", letterSpacing: "-0.01em" }}>
          {selectedOption ? selectedOption.label : value}
        </span>
        <ChevronDown
          size={11}
          style={{
            color: "var(--muted)",
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
            marginLeft: "2px",
          }}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 100,
            background: "var(--white)",
            border: "1.5px solid var(--ink)",
            boxShadow: "3px 3px 0px rgba(0, 0, 0, 0.18)",
            padding: "3px",
            minWidth: "148px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="font-mono"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  background: isSelected ? "var(--accent)" : "transparent",
                  color: isSelected ? "#11100F" : "var(--ink)",
                  border: "none",
                  padding: "5px 8px",
                  fontSize: "11px",
                  fontWeight: isSelected ? 800 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  transition: "background 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                  <span>{option.label}</span>
                  {option.description && (
                    <span
                      style={{
                        fontSize: "9px",
                        color: isSelected ? "#333" : "var(--muted)",
                        fontWeight: 400,
                      }}
                    >
                      {option.description}
                    </span>
                  )}
                </div>
                {isSelected && <Check size={12} style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
