import { createContext, useContext, useEffect, useState } from 'react'
import { CommandMenu } from '@/components/command-menu'
const SearchContext = createContext(null)
export function SearchProvider({ children }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])
  return (
    <SearchContext
      value={{
        open,
        setOpen,
      }}
    >
      {children}
      <CommandMenu />
    </SearchContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSearch = () => {
  const searchContext = useContext(SearchContext)
  if (!searchContext) {
    throw new Error('useSearch has to be used within SearchProvider')
  }
  return searchContext
}
