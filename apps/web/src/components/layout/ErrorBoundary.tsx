"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw, Home, Terminal, ChevronDown } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught client-side exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 bg-zinc-950 text-white">
          <div className="w-full max-w-xl rounded-3xl border border-zinc-900 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-md space-y-6">
            
            <div className="flex items-center gap-4 border-b border-zinc-900 pb-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-950/30 border border-red-900/30 text-red-500">
                <AlertCircle className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Application Exception Detected
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  An unhandled error occurred during rendering.
                </p>
              </div>
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed">
              We apologize for the inconvenience. Our client-side rendering pipeline encountered a crash. The error has been captured and reported to our engineering team.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black px-4 py-2.5 text-xs font-bold transition shadow-lg shadow-cyan-500/5 active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white px-4 py-2.5 text-xs font-bold transition"
              >
                <Home className="h-4 w-4" />
                Go to Homepage
              </button>
            </div>

            <div className="border-t border-zinc-900 pt-4 space-y-3">
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="flex items-center justify-between w-full text-zinc-500 hover:text-zinc-300 text-xs font-semibold"
              >
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-4 w-4" />
                  Show Diagnostic Logs
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${this.state.showDetails ? "rotate-180" : ""}`} />
              </button>

              {this.state.showDetails && (
                <div className="h-48 w-full overflow-y-auto rounded-xl border border-zinc-900 bg-zinc-950 p-3 font-mono text-[10px] text-zinc-500 space-y-2 select-text">
                  <div>
                    <span className="text-red-400 font-bold block mb-1">
                      Error: {this.state.error?.message || "Unknown rendering exception"}
                    </span>
                    {this.state.error?.stack && (
                      <pre className="whitespace-pre-wrap leading-normal font-mono">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div className="border-t border-zinc-900 pt-2">
                      <span className="text-zinc-400 font-semibold block mb-1">Component Stack:</span>
                      <pre className="whitespace-pre-wrap leading-normal font-mono">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
