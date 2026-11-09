import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { PortalDataProvider } from './context/PortalDataContext'
import { EditorProvider } from './components/Editor'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PortalDataProvider>
          <EditorProvider>
            <App />
          </EditorProvider>
        </PortalDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
