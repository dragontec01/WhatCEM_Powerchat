import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserX } from 'lucide-react';

interface Agent {
  id: number;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: string;
  username: string;
}

interface AgentDisplayProps {
  assignedAgent: Agent | null;
  isLoading?: boolean;
  conversationId?: number;
  assignedAt?: string;
  variant?: 'full' | 'compact';
}

export default function AgentDisplay({
  assignedAgent,
  isLoading = false,
  conversationId,
  assignedAt,
  variant = 'full'
}: AgentDisplayProps) {
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'agent':
        return 'bg-blue-100 text-blue-800';
      case 'manager':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading agent information...</span>
      </div>
    );
  }

  if (!assignedAgent) {
    return (
      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full">
          <UserX className="h-5 w-5 text-gray-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">No agent assigned</p>
          <p className="text-xs text-gray-500">This contact has not been assigned to any agent yet</p>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-2">
        <Avatar className="w-6 h-6">
          <AvatarImage src={assignedAgent.avatarUrl} />
          <AvatarFallback className="text-xs">
            {getInitials(assignedAgent.fullName)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-gray-900">{assignedAgent.fullName}</span>
        <Badge variant="secondary" className={`text-xs ${getRoleBadgeColor(assignedAgent.role)}`}>
          {assignedAgent.role}
        </Badge>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-start space-x-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={assignedAgent.avatarUrl} />
          <AvatarFallback className="text-sm font-medium">
            {getInitials(assignedAgent.fullName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {assignedAgent.fullName}
            </h4>
            <Badge variant="secondary" className={`text-xs ${getRoleBadgeColor(assignedAgent.role)}`}>
              {assignedAgent.role}
            </Badge>
          </div>
          
          <p className="text-sm text-gray-600 mb-2">{assignedAgent.email}</p>
          
          {assignedAt && (
            <div className="text-xs text-gray-500">
              <span>Assigned on {formatDate(assignedAt)}</span>
              {conversationId && (
                <span className="ml-2">• Conversation #{conversationId}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
