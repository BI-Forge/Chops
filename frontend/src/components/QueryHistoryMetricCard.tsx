import { CompletedIcon, FailedIcon, SpinnerIcon } from './Icons'
import '../styles/MetricCard.css'
import '../styles/QueryHistoryMetricCard.css'

interface QueryHistoryMetricCardProps {
  title: string
  value: string | number
  type: 'running' | 'completed' | 'failed'
}

const QueryHistoryMetricCard = ({ title, value, type }: QueryHistoryMetricCardProps) => {
  const getIcon = () => {
    switch (type) {
      case 'running':
        return <SpinnerIcon />
      case 'completed':
        return <CompletedIcon />
      case 'failed':
        return <FailedIcon />
      default:
        return null
    }
  }

  const getGradient = () => {
    switch (type) {
      case 'running':
        return 'blue'
      case 'completed':
        return 'green'
      case 'failed':
        return 'red'
      default:
        return 'blue'
    }
  }

  const gradient = getGradient()

  return (
    <div className="metric-card">
      <div className={`metric-card__gradient-bg metric-card__gradient-bg--${gradient}`}></div>
      <div className="metric-card__content">
        <div className="metric-card__header">
          <div className={`metric-card__icon-wrapper metric-card__icon-wrapper--${gradient}`}>
            <div className="metric-card__icon">
              {getIcon()}
            </div>
          </div>
        </div>
        <div className="metric-card__value">{value}</div>
        <div className="metric-card__subtitle">{title}</div>
      </div>
    </div>
  )
}

export default QueryHistoryMetricCard

