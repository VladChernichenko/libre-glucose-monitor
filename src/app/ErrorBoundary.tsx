import React from 'react';
import { reportClientError } from '../services/clientErrorApi';

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    reportClientError(error, { route: window.location.pathname });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="p-6 text-center">
        <p className="text-gm-body text-label">Something went wrong on this screen.</p>
        <button
          type="button"
          onClick={() => this.setState({ hasError: false })}
          className="mt-4 rounded-nested bg-sys-blue px-5 py-2 text-gm-body font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }
}
