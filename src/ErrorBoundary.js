import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px auto',
          maxWidth: '600px',
          backgroundColor: '#fff8f8',
          border: '1px solid #fed7d7',
          borderRadius: '4px'
        }}>
          <h2 style={{ color: '#c53030' }}>Something went wrong</h2>
          <p style={{ margin: '10px 0' }}>{this.state.error?.message || 'Unknown error occurred'}</p>
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                marginRight: '10px',
                cursor: 'pointer'
              }}
            >
              Go to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#48bb78',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
          
          {this.props.showDetails && (
            <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8f8f8', borderRadius: '4px' }}>
              <details>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error Details</summary>
                <pre style={{ whiteSpace: 'pre-wrap', margin: '10px 0', fontSize: '12px' }}>
                  {this.state.error?.stack || 'No stack trace available'}
                </pre>
              </details>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
