"use client";
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CodeAtlas Uncaught UI Error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            width: "100vw",
            background: "var(--paper, #F7F5F0)",
            padding: "24px",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "100%",
              border: "2px solid var(--border, #11100F)",
              background: "var(--white, #FFFFFF)",
              padding: "32px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#FF3B30",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={22} />
              <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>
                SOMETHING WENT WRONG
              </h2>
            </div>
            <p style={{ fontSize: "14px", color: "var(--ink, #11100F)", marginBottom: "16px" }}>
              An unexpected error occurred while rendering the interface:
            </p>
            <pre
              className="font-mono"
              style={{
                background: "rgba(0, 0, 0, 0.05)",
                padding: "12px",
                fontSize: "12px",
                overflowX: "auto",
                marginBottom: "24px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                color: "var(--ink, #11100F)",
              }}
            >
              {this.state.error?.message || "Unknown error"}
            </pre>
            <button
              onClick={this.handleReset}
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                padding: "10px 18px",
                background: "var(--ink, #11100F)",
                color: "var(--white, #FFFFFF)",
                border: "none",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              <RefreshCw size={14} />
              <span>RELOAD CODEATLAS</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
