import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Provider } from 'react-redux'
import store from './store/index.js'
import { router } from './router'
import { ThemeProvider } from './context/theme-provider'
import { FontProvider } from './context/font-provider'
import { DirectionProvider } from './context/direction-provider'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <FontProvider>
          <DirectionProvider>
            <RouterProvider router={router} />
          </DirectionProvider>
        </FontProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>
)
