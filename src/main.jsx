import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const rootElement = document.getElementById('root')
const root = createRoot(rootElement)
const TOMEVAULT_STORAGE_PREFIXES = ['tv_', 'tomevault:', '__tv']

function bootstrapTheme() {
  if (typeof window === 'undefined') return

  try {
    const savedTheme = window.localStorage.getItem('tomevault-theme') || 'midnight-tome'
    document.documentElement.setAttribute('data-theme', savedTheme)
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'midnight-tome')
  }
}

bootstrapTheme()

function clearTomeVaultBrowserState() {
  if (typeof window === 'undefined') return

  const clearMatchingKeys = (storage) => {
    try {
      const keysToRemove = []
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index)
        if (key && TOMEVAULT_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => storage.removeItem(key))
    } catch (_) {
      // Ignore blocked storage and still allow a plain reload.
    }
  }

  clearMatchingKeys(window.localStorage)
  clearMatchingKeys(window.sessionStorage)
}

class AppRuntimeErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      runtimeError: null,
    }
  }

  static getDerivedStateFromError(error) {
    return { runtimeError: error || new Error('Onbekende runtimefout') }
  }

  componentDidCatch(error, errorInfo) {
    console.error('TomeVault runtime error:', error, errorInfo)
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  handleUnhandledRejection = (event) => {
    const reason = event?.reason
    const runtimeError = reason instanceof Error
      ? reason
      : new Error(String(reason || 'Onbekende async fout'))

    this.setState({ runtimeError })
  }

  render() {
    const { runtimeError } = this.state

    if (!runtimeError) {
      return this.props.children
    }

    const errorMessage = runtimeError instanceof Error
      ? runtimeError.message
      : String(runtimeError || 'Onbekende runtimefout')

    return (
      <div className="tv-runtime-error-page">
        <div className="tv-runtime-error-card sm:p-8">
          <div className="tv-runtime-error-chip">
            Runtimefout
          </div>
          <h1 className="mt-4 font-fantasy text-3xl tracking-wide tv-text">TomeVault is onverwacht gestopt</h1>
          <p className="mt-3 text-sm leading-6 tv-text-sub">
            Er ging iets mis tijdens gebruik van de app. Je kunt veilig herladen of alleen TomeVault-browserstatus wissen en opnieuw starten.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="tv-button-primary inline-flex min-h-[46px] items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              Opnieuw laden
            </button>
            <button
              type="button"
              onClick={() => {
                clearTomeVaultBrowserState()
                window.location.reload()
              }}
              className="tv-button-secondary inline-flex min-h-[46px] items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              Browserstatus wissen en herladen
            </button>
          </div>
          <div className="tv-runtime-error-panel">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] tv-muted">Foutmelding</div>
            <pre className="tv-runtime-error-message">{errorMessage}</pre>
          </div>
        </div>
      </div>
    )
  }
}

root.render(
  <StrictMode>
    <AppRuntimeErrorBoundary>
      <App />
    </AppRuntimeErrorBoundary>
  </StrictMode>,
)
