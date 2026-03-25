import { InspectionItem } from '@shared/schema';
import { differenceInDays, addYears, addMonths } from 'date-fns';

export type ComplianceStatus = 'overdue' | 'due_soon' | 'compliant' | 'pending' | 'not_applicable';

export interface ComplianceStatusInfo {
  status: ComplianceStatus;
  daysRemaining: number | null;
  nextDueDate: Date | null;
  message: string;
}

export function calculateComplianceStatus(item: InspectionItem): ComplianceStatusInfo {
  if (!item.complianceStandard || !item.complianceYears) {
    return {
      status: 'not_applicable',
      daysRemaining: null,
      nextDueDate: null,
      message: 'No compliance requirement'
    };
  }

  if (!item.lastReplacementDate && !item.nextReplacementDue) {
    return {
      status: 'pending',
      daysRemaining: null,
      nextDueDate: null,
      message: 'No replacement date recorded'
    };
  }

  let dueDate: Date;
  
  if (item.nextReplacementDue) {
    dueDate = new Date(item.nextReplacementDue);
  } else if (item.lastReplacementDate && item.complianceYears) {
    const lastDate = new Date(item.lastReplacementDate);
    
    if (item.complianceYears % 1 === 0) {
      dueDate = addYears(lastDate, item.complianceYears);
    } else {
      const months = Math.round(item.complianceYears * 12);
      dueDate = addMonths(lastDate, months);
    }
  } else {
    return {
      status: 'pending',
      daysRemaining: null,
      nextDueDate: null,
      message: 'Invalid date configuration'
    };
  }

  const today = new Date();
  const daysRemaining = differenceInDays(dueDate, today);

  if (daysRemaining < 0) {
    return {
      status: 'overdue',
      daysRemaining,
      nextDueDate: dueDate,
      message: `Overdue by ${Math.abs(daysRemaining)} days`
    };
  } else if (daysRemaining <= 90) {
    return {
      status: 'due_soon',
      daysRemaining,
      nextDueDate: dueDate,
      message: `Due in ${daysRemaining} days`
    };
  } else {
    return {
      status: 'compliant',
      daysRemaining,
      nextDueDate: dueDate,
      message: `Compliant - ${daysRemaining} days until due`
    };
  }
}

export function getComplianceStatusBadgeProps(status: ComplianceStatus) {
  switch (status) {
    case 'overdue':
      return {
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 border-2 border-red-500',
        icon: '⚠️',
        label: 'OVERDUE'
      };
    case 'due_soon':
      return {
        variant: 'outline' as const,
        className: 'bg-orange-50 text-orange-800 border-2 border-orange-500',
        icon: '⏰',
        label: 'DUE SOON'
      };
    case 'compliant':
      return {
        variant: 'outline' as const,
        className: 'bg-green-50 text-green-800 border-2 border-green-500',
        icon: '✓',
        label: 'COMPLIANT'
      };
    case 'pending':
      return {
        variant: 'outline' as const,
        className: 'bg-blue-50 text-blue-800 border-2 border-blue-500',
        icon: 'ℹ',
        label: 'PENDING'
      };
    case 'not_applicable':
    default:
      return {
        variant: 'outline' as const,
        className: 'bg-gray-50 text-gray-600 border border-gray-300',
        icon: '—',
        label: 'N/A'
      };
  }
}
