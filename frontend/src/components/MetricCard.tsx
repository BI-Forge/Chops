import { MetricsIcon } from './Icons'
import './MetricCard.css'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  iconGradient: 'blue' | 'orange' | 'purple' | 'green' | 'yellow'
}

const MetricCard = ({ title, value, subtitle, iconGradient }: MetricCardProps) => {
  return (
    <div className="metric-card">
      <div className={`metric-card__gradient-bg metric-card__gradient-bg--${iconGradient}`}></div>
      <div className="metric-card__content">
        <div className="metric-card__header">
          <div className={`metric-card__icon metric-card__icon--${iconGradient}`}>
            <MetricsIcon gradient={iconGradient} />
          </div>
        </div>
        <div className="metric-card__value">{value}</div>
        {subtitle ? <div className="metric-card__subtitle">{subtitle}</div> : <div className="metric-card__subtitle">{title}</div>}
      </div>
    </div>
  )
}

export default MetricCard

