import type { ReactNode } from 'react'
import { GLOSSARY, type GlossaryKey } from '../lib/glossary'

type Props = {
  term: GlossaryKey
  children: ReactNode
  className?: string
}

export function GlossaryTip({ term, children, className = '' }: Props) {
  return (
    <span
      title={GLOSSARY[term]}
      className={`cursor-help border-b border-dotted border-sparrow-300 decoration-sparrow-300 ${className}`.trim()}
    >
      {children}
    </span>
  )
}
