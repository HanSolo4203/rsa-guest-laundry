'use client'

import { PageToggle, DevModeIndicator, DevQuickNav } from './PageToggle'

interface DevToolsProps {
  className?: string
}

export function DevTools({ className = '' }: DevToolsProps) {
  return (
    <div className={className}>
      <DevModeIndicator />
      <PageToggle />
      <DevQuickNav />
    </div>
  )
}

export { PageToggle, DevModeIndicator, DevQuickNav }
