import { Info } from 'lucide-react';

interface PageIdentifierProps {
  pageId: string;
  description?: string;
}

export function PageIdentifier({ pageId, description }: PageIdentifierProps) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg border border-blue-700 pointer-events-none">
      <div className="flex items-center space-x-2">
        <Info className="w-4 h-4 pointer-events-none" />
        <div className="text-sm">
          <div className="font-mono font-bold">PAGE: {pageId}</div>
          {description && (
            <div className="text-xs text-blue-100 mt-1">{description}</div>
          )}
        </div>
      </div>
    </div>
  );
}