import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-space-md gap-space-sm text-center">
          <span className="material-symbols-outlined text-5xl text-error">
            error
          </span>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
            Terjadi kesalahan
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md break-all">
            {this.state.error.message}
          </p>
          <button
            className="mt-space-sm bg-primary-container hover:bg-primary text-on-primary py-space-xs px-space-md rounded-lg font-headline-sm text-headline-sm font-bold transition-colors shadow-sm"
            onClick={() => this.setState({ error: null })}
          >
            Coba Lagi
          </button>
        </div>
      )
    }
    return this.props.children
  }
}