import { ChakraProvider, ColorModeScript, theme } from '@chakra-ui/react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './containers/App'

const container = document.getElementById('root')
if (!container) throw new Error('Failed to find the root element')
const root = ReactDOM.createRoot(container)

root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <ColorModeScript />
      <App />
    </ChakraProvider>
  </React.StrictMode>,
)
