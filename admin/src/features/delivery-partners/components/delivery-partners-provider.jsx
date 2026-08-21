import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'

const DeliveryPartnersContext = React.createContext(null)

export function DeliveryPartnersProvider({ children }) {
  const [open, setOpen] = useDialogState(null)
  const [currentRow, setCurrentRow] = useState(null)
  return (
    <DeliveryPartnersContext
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
      }}
    >
      {children}
    </DeliveryPartnersContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useDeliveryPartners = () => {
  const ctx = React.useContext(DeliveryPartnersContext)
  if (!ctx) {
    throw new Error('useDeliveryPartners has to be used within <DeliveryPartnersProvider>')
  }
  return ctx
}
