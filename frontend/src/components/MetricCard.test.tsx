import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MetricCard from './MetricCard'

describe('MetricCard', () => {
  it('renders with title and value', () => {
    render(<MetricCard title="Test Metric" value="100" iconGradient="blue" />)
    
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Test Metric')).toBeInTheDocument()
  })

  it('renders with subtitle when provided', () => {
    render(
      <MetricCard
        title="Test Metric"
        value="100"
        subtitle="Custom Subtitle"
        iconGradient="blue"
      />
    )
    
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Custom Subtitle')).toBeInTheDocument()
  })

  it('renders with numeric value', () => {
    render(<MetricCard title="Test Metric" value={42} iconGradient="orange" />)
    
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('applies correct gradient class', () => {
    const { container } = render(
      <MetricCard title="Test" value="100" iconGradient="purple" />
    )
    
    const gradientElement = container.querySelector('.metric-card__gradient-bg--purple')
    expect(gradientElement).toBeInTheDocument()
  })

  it('renders with different gradient types', () => {
    const gradients: Array<'blue' | 'orange' | 'purple' | 'green' | 'yellow'> = [
      'blue',
      'orange',
      'purple',
      'green',
      'yellow',
    ]

    gradients.forEach((gradient) => {
      const { container, unmount } = render(
        <MetricCard title="Test" value="100" iconGradient={gradient} />
      )
      
      const gradientElement = container.querySelector(
        `.metric-card__gradient-bg--${gradient}`
      )
      expect(gradientElement).toBeInTheDocument()
      unmount()
    })
  })
})

