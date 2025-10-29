import { Circle, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeploymentStatusProps {
  status: 'pending' | 'building' | 'live' | 'failed' | 'rolled_back';
  ageSeconds: number;
  durationSeconds?: number;
  error?: string;
  className?: string;
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  } else {
    const days = Math.floor(seconds / 86400);
    return `${days}d`;
  }
}

export function DeploymentStatus({
  status,
  ageSeconds,
  durationSeconds,
  error,
  className,
}: DeploymentStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'live':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'Live',
          lightColor: 'bg-green-500',
        };
      case 'building':
        return {
          icon: Loader2,
          color: 'text-amber-600',
          bgColor: 'bg-amber-100',
          label: 'Deploying',
          lightColor: 'bg-amber-500',
          animate: true,
        };
      case 'pending':
        return {
          icon: Circle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: 'Pending',
          lightColor: 'bg-gray-400',
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: 'Failed',
          lightColor: 'bg-red-500',
        };
      case 'rolled_back':
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          label: 'Rolled Back',
          lightColor: 'bg-orange-500',
        };
      default:
        return {
          icon: Circle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: 'Unknown',
          lightColor: 'bg-gray-400',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Status light indicator */}
      <div className="relative">
        <div className={cn('h-2 w-2 rounded-full', config.lightColor)} />
        {config.animate && (
          <div className={cn('absolute inset-0 h-2 w-2 rounded-full animate-ping opacity-75', config.lightColor)} />
        )}
      </div>

      {/* Status badge */}
      <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium', config.bgColor, config.color)}>
        <Icon className={cn('h-3 w-3', config.animate && 'animate-spin')} />
        <span>{config.label}</span>
      </div>

      {/* Time information */}
      <div className="text-xs text-muted-foreground">
        {status === 'building' && (
          <span>{formatTime(ageSeconds)} elapsed</span>
        )}
        {status === 'live' && durationSeconds !== undefined && (
          <span>Deployed {formatTime(durationSeconds)} ({formatTime(ageSeconds)} ago)</span>
        )}
        {status === 'live' && durationSeconds === undefined && (
          <span>{formatTime(ageSeconds)} ago</span>
        )}
        {status === 'failed' && (
          <span>{formatTime(ageSeconds)} ago</span>
        )}
      </div>
    </div>
  );
}


