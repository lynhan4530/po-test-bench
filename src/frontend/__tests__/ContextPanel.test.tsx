import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ContextPanel from '../ContextPanel'
import type { Trigger, DocumentState } from '../../types/session'

const trigger: Trigger = {
  id: 'tr-001',
  format: 'email',
  compatibleIndustries: ['all'],
  content: 'Hi, we need stories written up today.',
  task: 'Write user stories for the dashboard sharing feature.',
}

const documentState: DocumentState = {
  id: 'ds-001',
  name: 'Underdocumented',
  label: 'Only a brief exists',
  generatorInstruction: 'Generate a thin document.',
}

const defaultProps = {
  trigger,
  documentState,
  generatedDocs: {},
  signoffs: { developer: false, qa: false },
  isLoadingDoc: false,
  onRequestDoc: vi.fn(),
}

describe('ContextPanel', () => {
  it('shows the trigger format label for email', () => {
    render(<ContextPanel {...defaultProps} />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('shows the trigger content text', () => {
    render(<ContextPanel {...defaultProps} />)
    expect(screen.getByText(/we need stories written up today/i)).toBeInTheDocument()
  })

  it('shows the task description', () => {
    render(<ContextPanel {...defaultProps} />)
    expect(screen.getByText(/Write user stories/)).toBeInTheDocument()
  })

  it('shows the documentState label', () => {
    render(<ContextPanel {...defaultProps} />)
    expect(screen.getByText(/Only a brief exists/)).toBeInTheDocument()
  })

  it('renders View Brief and View PRD buttons', () => {
    render(<ContextPanel {...defaultProps} />)
    expect(screen.getByRole('button', { name: /view brief/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view prd/i })).toBeInTheDocument()
  })

  it('calls onRequestDoc with correct docType when a button is clicked', () => {
    const onRequestDoc = vi.fn()
    render(<ContextPanel {...defaultProps} onRequestDoc={onRequestDoc} />)
    fireEvent.click(screen.getByRole('button', { name: /view brief/i }))
    expect(onRequestDoc).toHaveBeenCalledWith('brief')
  })

  it('disables doc buttons when isLoadingDoc is true', () => {
    render(<ContextPanel {...defaultProps} isLoadingDoc />)
    const buttons = screen.getAllByRole('button').filter(b =>
      b.textContent?.match(/view brief|view prd|loading/i)
    )
    buttons.forEach(b => expect(b).toBeDisabled())
  })

  it('shows both signoff indicators as inactive when neither has signed off', () => {
    const { container } = render(<ContextPanel {...defaultProps} />)
    const dots = container.querySelectorAll('.bg-gray-700')
    expect(dots.length).toBe(2)
  })

  it('shows developer signoff indicator as active when developer signed off', () => {
    const { container } = render(
      <ContextPanel {...defaultProps} signoffs={{ developer: true, qa: false }} />
    )
    const greenDot = container.querySelector('.bg-emerald-500')
    expect(greenDot).toBeInTheDocument()
  })
})
