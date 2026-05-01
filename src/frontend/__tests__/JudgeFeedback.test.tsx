import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import JudgeFeedback from '../JudgeFeedback'
import type { JudgeFeedbackOutput } from '../../types/session'

const mockFeedback: JudgeFeedbackOutput = {
  overallScore: 3.4,
  summary: 'Good effort overall. Work on risk awareness.',
  scores: [
    { dimension: 'Defensibility', score: 4, feedback: 'Defended well under pressure.' },
    { dimension: 'Adaptability', score: 3, feedback: 'Incorporated some feedback.' },
    { dimension: 'Clarity Under Pressure', score: 4, feedback: 'Clear responses throughout.' },
    { dimension: 'Document Quality', score: 3, feedback: 'Document was acceptable.' },
    { dimension: 'Risk Awareness', score: 2, feedback: 'Did not flag key trade-offs.' },
  ],
}

describe('JudgeFeedback', () => {
  it('renders the overall score', () => {
    render(<JudgeFeedback feedback={mockFeedback} onNewChallenge={vi.fn()} />)
    expect(screen.getByText(/3\.4\/5/)).toBeInTheDocument()
  })

  it('renders the summary text', () => {
    render(<JudgeFeedback feedback={mockFeedback} onNewChallenge={vi.fn()} />)
    expect(screen.getByText('Good effort overall. Work on risk awareness.')).toBeInTheDocument()
  })

  it('renders all five score dimension cards', () => {
    render(<JudgeFeedback feedback={mockFeedback} onNewChallenge={vi.fn()} />)
    expect(screen.getByText('Defensibility')).toBeInTheDocument()
    expect(screen.getByText('Adaptability')).toBeInTheDocument()
    expect(screen.getByText('Clarity Under Pressure')).toBeInTheDocument()
    expect(screen.getByText('Document Quality')).toBeInTheDocument()
    expect(screen.getByText('Risk Awareness')).toBeInTheDocument()
  })

  it('renders per-dimension feedback text', () => {
    render(<JudgeFeedback feedback={mockFeedback} onNewChallenge={vi.fn()} />)
    expect(screen.getByText('Did not flag key trade-offs.')).toBeInTheDocument()
  })

  it('calls onNewChallenge when New Challenge button is clicked', () => {
    const onNewChallenge = vi.fn()
    render(<JudgeFeedback feedback={mockFeedback} onNewChallenge={onNewChallenge} />)
    fireEvent.click(screen.getByRole('button', { name: /new challenge/i }))
    expect(onNewChallenge).toHaveBeenCalledTimes(1)
  })

  it('score bar is green for score >= 4', () => {
    const { container } = render(<JudgeFeedback feedback={mockFeedback} onNewChallenge={vi.fn()} />)
    const greenBars = container.querySelectorAll('.bg-emerald-500')
    expect(greenBars.length).toBeGreaterThan(0)
  })

  it('score bar is red for score < 3', () => {
    const { container } = render(<JudgeFeedback feedback={mockFeedback} onNewChallenge={vi.fn()} />)
    const redBars = container.querySelectorAll('.bg-red-500')
    expect(redBars.length).toBeGreaterThan(0)
  })
})
