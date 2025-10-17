import React from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { CheckCircle } from 'lucide-react';

interface PollResponseProps {
  selectedOption: string;
  selectedIndex: number;
  pollQuestion?: string;
  isOutbound?: boolean;
}

export default function PollResponse({ 
  selectedOption, 
  selectedIndex, 
  pollQuestion,
  isOutbound = false 
}: PollResponseProps) {
  const { t } = useTranslation();

  return (
    <div className="poll-response bg-white rounded-lg border border-green-200 overflow-hidden max-w-xs">
      {/* Response Header */}
      <div className="px-3 py-2 bg-green-50 border-b border-green-200">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-xs font-medium text-green-800">
            {isOutbound 
              ? t('poll.you_voted', 'You voted') 
              : t('poll.voted', 'Voted')
            }
          </span>
        </div>
        {pollQuestion && (
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {pollQuestion}
          </p>
        )}
      </div>

      {/* Selected Option */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-green-50 text-white flex items-center justify-center text-xs font-bold">
            {selectedIndex + 1}
          </div>
          <span className="text-sm font-medium text-gray-900 flex-1">
            {selectedOption}
          </span>
        </div>
      </div>
    </div>
  );
}
