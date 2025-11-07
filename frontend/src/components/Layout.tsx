import { ReactNode, useState, createContext, useContext } from 'react'
import Sidebar from './Sidebar'
import '../styles/Layout.css'

interface LayoutContextType {
  openMobileMenu: () => void
  closeMobileMenu: () => void
  isMobileMenuOpen: boolean
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export const useLayout = () => {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within Layout')
  }
  return context
}

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const openMobileMenu = () => setIsMobileMenuOpen(true)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <LayoutContext.Provider value={{ openMobileMenu, closeMobileMenu, isMobileMenuOpen }}>
      <div className="layout">
        <Sidebar isMobile={false} />
        {isMobileMenuOpen && (
          <>
            <div className="layout__overlay" onClick={closeMobileMenu}></div>
            <div className={`sidebar sidebar--mobile sidebar--open`}>
              <Sidebar isMobile={true} onMobileClose={closeMobileMenu} />
            </div>
          </>
        )}
        <main className="layout__main">
          {children}
        </main>
      </div>
    </LayoutContext.Provider>
  )
}

export default Layout

