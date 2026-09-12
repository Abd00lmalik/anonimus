import { Badge } from './Badge'

interface StatusBadgeProps {
  status: 'live' | 'ending-soon' | 'invite' | 'ended'
}

const statusConfig = {
  'live': { label: 'Live', variant: 'success' as const },
  'ending-soon': { label: 'Ending Soon', variant: 'warning' as const },
  'invite': { label: 'Invite', variant: 'muted' as const },
  'ended': { label: 'Ended', variant: 'muted' as const },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
