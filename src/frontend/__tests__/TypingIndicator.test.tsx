import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TypingIndicator from '../TypingIndicator'

describe('TypingIndicator', () => {
  it('shows "Developer is typing" for developer persona', () => {
    render(<TypingIndicator persona="developer" />)
    expect(screen.getByText(/developer is typing/i)).toBeInTheDocument()
  })

  it('shows "QA is typing" for qa persona', () => {
    render(<TypingIndicator persona="qa" />)
    expect(screen.getByText(/qa is typing/i)).toBeInTheDocument()
  })
})
