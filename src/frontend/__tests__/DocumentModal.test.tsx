import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DocumentModal from '../DocumentModal'

describe('DocumentModal', () => {
  const defaultProps = {
    docType: 'brief',
    content: 'This is the brief content.',
    onClose: vi.fn(),
  }

  it('renders the docType as the heading', () => {
    render(<DocumentModal {...defaultProps} />)
    expect(screen.getByRole('heading', { name: /brief/i })).toBeInTheDocument()
  })

  it('renders the document content', () => {
    render(<DocumentModal {...defaultProps} />)
    expect(screen.getByText('This is the brief content.')).toBeInTheDocument()
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<DocumentModal {...defaultProps} onClose={onClose} />)
    const backdrop = container.firstChild as HTMLElement
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when the modal card is clicked', () => {
    const onClose = vi.fn()
    render(<DocumentModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('This is the brief content.'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when the × button is clicked', () => {
    const onClose = vi.fn()
    render(<DocumentModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
