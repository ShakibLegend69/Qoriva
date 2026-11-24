import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('QORVIA ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let friendlyDetail = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && parsed.error && parsed.operationType) {
          friendlyDetail = `Database ${parsed.operationType} blocked (${parsed.path ?? 'unknown path'}): ${parsed.error}`;
        }
      } catch {
        // Non-JSON error message
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0B111E] text-[#101827] dark:text-[#F5F4EF] px-4">
          <div className="max-w-lg w-full border border-black/15 dark:border-white/15 rounded-2xl p-8 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
              QORVIA Runtime Guard
            </p>
            <h1 className="font-editorial text-2xl font-bold">
              Unable to complete the requested operation
            </h1>
            <p className="text-sm text-black/70 dark:text-[#A5AAB4] break-words">
              {friendlyDetail}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.assign('/en/');
              }}
              className="btn-transparent-black-solid px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
