import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import RuntimeErrorScreen from './components/RuntimeErrorScreen.jsx'

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
      <RuntimeErrorScreen
        errorMessage={errorMessage}
        onReload={() => window.location.reload()}
        onClearStateAndReload={() => {
          clearTomeVaultBrowserState()
          window.location.reload()
        }}
      />
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
