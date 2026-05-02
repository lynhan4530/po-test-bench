import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DocumentEditor from '../DocumentEditor'
import type { Trigger } from '../../types/session'

const trigger: Trigger = {
  id: 'tr-001',
  format: 'slack',
  compatibleIndustries: ['all'],
  content: 'Hey, we need stories for the export feature.',
  task: 'Write user stories for the bulk export feature.',
}

const defaultProps = {
  trigger,
  isSubmitting: false,
  onSubmit: vi.fn(),
}

describe('DocumentEditor', () => {
  it('renders the task text from trigger', () => {
    render(<DocumentEditor {...defaultProps} />)
    expect(screen.getByText(/bulk export feature/i)).toBeInTheDocument()
  })

  it('renders a textarea with a placeholder', () => {
    render(<DocumentEditor {...defaultProps} />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('placeholder')
  })

  it('disables the Submit button when textarea is empty', () => {
    render(<DocumentEditor {...defaultProps} />)
    expect(screen.getByRole('button', { name: /submit for review/i })).toBeDisabled()
  })

  it('enables the Submit button when textarea has content', () => {
    render(<DocumentEditor {...defaultProps} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'As a user, I want...' } })
    expect(screen.getByRole('button', { name: /submit for review/i })).not.toBeDisabled()
  })

  it('calls onSubmit with trimmed value when Submit is clicked', () => {
    const onSubmit = vi.fn()
    render(<DocumentEditor {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  My user stories  ' } })
    fireEvent.click(screen.getByRole('button', { name: /submit for review/i }))
    expect(onSubmit).toHaveBeenCalledWith('My user stories')
  })

  it('disables textarea and button and shows Submitting… when isSubmitting is true', () => {
    render(<DocumentEditor {...defaultProps} isSubmitting />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
  })
})
