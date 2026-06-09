import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'
import { AcademicInstituteSettingsProvider } from './contexts/AcademicInstituteSettingsContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AcademicInstituteSettingsProvider>
      <HashRouter>
        <App />
        <Toaster
          position="top-center"
          richColors={false}
          closeButton
          offset="0.85rem"
          toastOptions={{
            duration: 4200,
            classNames: {
              toast:
                '!rounded-2xl !border !p-3.5 !shadow-md !shadow-slate-200/40 !backdrop-blur-sm',
              title: '!text-sm !font-medium !leading-snug',
              description: '!text-xs !opacity-90',
              closeButton:
                '!border-0 !bg-transparent !text-slate-500 hover:!bg-slate-100/80',
              icon: '!size-5 !shrink-0',
              success:
                '!border-emerald-200/90 !bg-emerald-50/95 !text-emerald-900 [&_[data-icon]]:!text-emerald-600',
            },
          }}
        />
      </HashRouter>
    </AcademicInstituteSettingsProvider>
  </StrictMode>,
)
