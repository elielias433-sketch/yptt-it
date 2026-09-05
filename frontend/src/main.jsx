import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-alien-950 text-alien-100">
          <div className="max-w-lg w-full text-center">
            <h1 className="text-heading-lg font-bold text-red-400 mb-2">Terjadi kesalahan tampilan</h1>
            <p className="text-body-sm text-alien-300 mb-4 break-all">{String(this.state.error?.message || this.state.error)}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md bg-alien-500 text-white hover:bg-alien-400"
            >
              Muat ulang
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)