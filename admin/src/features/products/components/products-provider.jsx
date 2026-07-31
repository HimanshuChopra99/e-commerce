import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
const ProductsContext = React.createContext(null)
export function ProductsProvider({ children }) {
  const [open, setOpen] = useDialogState(null)
  const [currentRow, setCurrentRow] = useState(null)
  return (
    <ProductsContext
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
      }}
    >
      {children}
    </ProductsContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useProducts = () => {
  const ctx = React.useContext(ProductsContext)
  if (!ctx) {
    throw new Error('useProducts has to be used within <ProductsProvider>')
  }
  return ctx
}
