import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle, Info, Camera, CheckCircle2 } from 'lucide-react';
import { calculateComplianceStatus, getComplianceStatusBadgeProps } from '@/lib/compliance-utils';
import { InspectionItem } from '@shared/schema';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ComplianceStatusBadgeProps {
  item: InspectionItem;
  showDetails?: boolean;
}

export function ComplianceStatusBadge({ item, showDetails = true }: ComplianceStatusBadgeProps) {
  const statusInfo = calculateComplianceStatus(item);
  const badgeProps = getComplianceStatusBadgeProps(statusInfo.status);

  if (statusInfo.status === 'not_applicable') {
    return null;
  }

  const getIcon = () => {
    switch (statusInfo.status) {
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 mr-1.5" data-testid="icon-overdue" />;
      case 'due_soon':
        return <Clock className="w-4 h-4 mr-1.5" data-testid="icon-due-soon" />;
      case 'compliant':
        return <CheckCircle className="w-4 h-4 mr-1.5" data-testid="icon-compliant" />;
      case 'pending':
        return <Info className="w-4 h-4 mr-1.5" data-testid="icon-pending" />;
      default:
        return null;
    }
  };

  const badge = (
    <Badge 
      variant={badgeProps.variant}
      className={`${badgeProps.className} inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold uppercase`}
      data-testid={`compliance-badge-${statusInfo.status}`}
    >
      {getIcon()}
      {badgeProps.label}
    </Badge>
  );

  if (!showDetails) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{item.complianceStandard}</p>
            <p className="text-sm">{statusInfo.message}</p>
            {statusInfo.nextDueDate && (
              <p className="text-xs text-gray-500">
                Due: {statusInfo.nextDueDate.toLocaleDateString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PhotoRequiredIndicatorProps {
  item: InspectionItem;
  onCaptureClick?: () => void;
}

export function PhotoRequiredIndicator({ item, onCaptureClick }: PhotoRequiredIndicatorProps) {
  if (!item.photoRequired) return null;

  const hasPhoto = !!item.photoUrl;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCaptureClick && !hasPhoto) {
      onCaptureClick();
    }
  };

  const buttonContent = (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
        hasPhoto 
          ? 'bg-green-50 text-green-700 border border-green-500 hover:bg-green-100' 
          : 'bg-yellow-50 text-yellow-700 border border-dashed border-yellow-500 hover:bg-yellow-100'
      } ${!hasPhoto && onCaptureClick ? 'cursor-pointer' : ''}`}
      data-testid={hasPhoto ? "photo-captured" : "photo-required"}
    >
      {hasPhoto ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Photo Captured</span>
        </>
      ) : (
        <>
          <Camera className="w-3.5 h-3.5" />
          <span>{onCaptureClick ? 'Take Photo' : 'Photo Required'}</span>
        </>
      )}
    </button>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {buttonContent}
        </TooltipTrigger>
        <TooltipContent>
          <p>{hasPhoto ? 'Compliance photo evidence captured' : (onCaptureClick ? 'Click to capture photo' : 'Photo evidence required for compliance')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
