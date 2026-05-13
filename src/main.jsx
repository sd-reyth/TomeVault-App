import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const rootElement = document.getElementById('root')
const root = createRoot(rootElement)
const TOMEVAULT_STORAGE_PREFIXES = ['tv_', 'tomevault:', '__tv']

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
      <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4 py-10 text-stone-100">
        <div className="w-full max-w-lg rounded-3xl border border-rose-500/30 bg-stone-900/95 p-6 shadow-2xl shadow-rose-950/30 sm:p-8">
          <div className="mb-4 inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-200">
            Runtimefout
          </div>
          <h1 className="font-fantasy text-3xl tracking-wide text-stone-50">TomeVault is onverwacht gestopt</h1>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            Er ging iets mis tijdens gebruik van de app. Je kunt veilig herladen of alleen TomeVault-browserstatus wissen en opnieuw starten.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-400"
            >
              Opnieuw laden
            </button>
            <button
              type="button"
              onClick={() => {
                clearTomeVaultBrowserState()
                window.location.reload()
              }}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm font-semibold text-stone-200 transition hover:border-stone-500 hover:bg-stone-900"
            >
              Browserstatus wissen en herladen
            </button>
          </div>
          <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-950/80 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Foutmelding</div>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-rose-200">{errorMessage}</pre>
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
