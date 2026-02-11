import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Donne une stack React claire dans la console
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] error:", error);
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] componentStack:", errorInfo?.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container my-5">
          <div className="alert alert-danger">
            <div className="fw-bold mb-2">Une erreur React est survenue.</div>
            <div className="small">
              Ouvre la console pour voir le composant en cause (
              <code>[ErrorBoundary] componentStack</code>).
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

