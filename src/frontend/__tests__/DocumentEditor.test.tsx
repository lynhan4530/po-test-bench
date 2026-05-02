import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

function fillCard(story: string, ac: string) {
  // Story field is a plain textarea
  fireEvent.change(screen.getByRole('textbox', { name: /user story/i }), { target: { value: story } })
  // AC field is a contenteditable div — set innerHTML then fire input
  const acEl = screen.getByRole('textbox', { name: /acceptance criterion 1/i })
  acEl.innerHTML = ac
  fireEvent.input(acEl)
}

describe('DocumentEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the task text from trigger', () => {
    render(<DocumentEditor {...defaultProps} />)
    expect(screen.getByText(/bulk export feature/i)).toBeInTheDocument()
  })

  it('renders "1 story" label by default', () => {
    render(<DocumentEditor {...defaultProps} />)
    expect(screen.getByText(/1 story/i)).toBeInTheDocument()
  })

  it('Add Story button adds a second card', () => {
    render(<DocumentEditor {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /add story/i }))
    expect(screen.getByText(/2 stories/i)).toBeInTheDocument()
  })

  it('Remove button is hidden when only 1 card', () => {
    render(<DocumentEditor {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /remove story/i })).not.toBeInTheDocument()
  })

  it('Remove button deletes a card when more than 1 exist', () => {
    render(<DocumentEditor {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /add story/i }))
    expect(screen.getByText(/2 stories/i)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: /remove story/i })[0])
    expect(screen.getByText(/1 story/i)).toBeInTheDocument()
  })

  it('Submit is disabled when fields are empty', () => {
    render(<DocumentEditor {...defaultProps} />)
    expect(screen.getByRole('button', { name: /submit for review/i })).toBeDisabled()
  })

  it('Submit is enabled after filling story and one AC item', () => {
    render(<DocumentEditor {...defaultProps} />)
    fillCard(
      'As a logistics manager, I want to bulk export orders so that I can process them in our ERP.',
      'Given I select orders, when I click Export, then a CSV downloads.',
    )
    expect(screen.getByRole('button', { name: /submit for review/i })).not.toBeDisabled()
  })

  it('calls onSubmit with serialized markdown containing US-001 and priority', () => {
    const onSubmit = vi.fn()
    render(<DocumentEditor {...defaultProps} onSubmit={onSubmit} />)
    fillCard(
      'As a logistics manager, I want to bulk export orders so that I can process them in our ERP.',
      'Given I select orders, when I click Export, then a CSV downloads.',
    )
    fireEvent.click(screen.getByRole('button', { name: /submit for review/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const arg = onSubmit.mock.calls[0][0] as string
    expect(arg).toContain('## US-001 [Must Have]')
    expect(arg).toContain('As a logistics manager')
    expect(arg).toContain('Acceptance Criteria:')
    expect(arg).toContain('- Given I select orders')
  })

  it('disables all inputs and shows Submitting… when isSubmitting is true', () => {
    render(<DocumentEditor {...defaultProps} isSubmitting />)
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /add story/i })).toBeDisabled()
  })
})
