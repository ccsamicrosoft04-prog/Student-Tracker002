"use client" 

import * as React from "react"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  // This only runs after the component is rendered in the browser
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // If we haven't mounted yet, render a transparent version 
  // to prevent the "Flash of Unstyled Content" or Hydration errors
  if (!mounted) {
    return <>{children}</>
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}