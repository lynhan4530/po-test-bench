import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GroupChat from '../GroupChat'
import type { ChatMessage } from '../types'

const defaultProps = {
  messages: [] as ChatMessage[],
  typing: null,
  isSending: false,
  disabled: false,
  onSend: vi.fn(),
}

const messages: ChatMessage[] = [
  { id: '1', role: 'user', content: 'Here are my user stories.' },
  { id: '2', role: 'developer', content: 'What about error states?' },
  { id: '3', role: 'qa', content: 'Can we measure this?' },
]

describe('GroupChat', () => {
  it('shows placeholder text when there are no messages', () => {
    render(<GroupChat {...defaultProps} />)
    expect(screen.getByText(/submission is under review/i)).toBeInTheDocument()
  })

  it('renders all messages', () => {
    render(<GroupChat {...defaultProps} messages={messages} />)
    expect(screen.getByText('Here are my user stories.')).toBeInTheDocument()
    expect(screen.getByText('What about error states?')).toBeInTheDocument()
    expect(screen.getByText('Can we measure this?')).toBeInTheDocument()
  })

  it('labels user messages as "You"', () => {
    render(<GroupChat {...defaultProps} messages={messages} />)
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('labels developer messages as "Developer"', () => {
    render(<GroupChat {...defaultProps} messages={messages} />)
    expect(screen.getByText('Developer')).toBeInTheDocument()
  })

  it('labels qa messages as "QA"', () => {
    render(<GroupChat {...defaultProps} messages={messages} />)
    expect(screen.getByText('QA')).toBeInTheDocument()
  })

  it('calls onSend with the input value when Send is clicked', () => {
    const onSend = vi.fn()
    render(<GroupChat {...defaultProps} onSend={onSend} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'My response' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).toHaveBeenCalledWith('My response')
  })

  it('calls onSend on Enter key press', () => {
    const onSend = vi.fn()
    render(<GroupChat {...defaultProps} onSend={onSend} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Enter send' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(onSend).toHaveBeenCalledWith('Enter send')
  })

  it('does not call onSend on Shift+Enter', () => {
    const onSend = vi.fn()
    render(<GroupChat {...defaultProps} onSend={onSend} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'No send' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('does not call onSend when input is blank', () => {
    const onSend = vi.fn()
    render(<GroupChat {...defaultProps} onSend={onSend} />)
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('disables textarea and button when disabled prop is true', () => {
    render(<GroupChat {...defaultProps} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('disables input while isSending is true', () => {
    render(<GroupChat {...defaultProps} isSending />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('shows typing indicator when typing prop is set', () => {
    render(<GroupChat {...defaultProps} typing={{ persona: 'developer' }} />)
    expect(screen.getByText(/developer is typing/i)).toBeInTheDocument()
  })
})
