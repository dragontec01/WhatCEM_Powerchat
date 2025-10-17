import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  FileText, 
  Users, 
  Calendar, 
  Clock,
  User
} from 'lucide-react';

interface AuditLog {
  id: number;
  actionType: string;
  actionCategory: string;
  description: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  createdAt: string;
  userFullName?: string;
  userEmail?: string;
  userAvatarUrl?: string;
}

interface AuditLogTimelineProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

const getActivityIcon = (actionType: string) => {
  switch (actionType) {
    case 'created':
      return <Plus className="h-4 w-4" />;
    case 'updated':
      return <Edit className="h-4 w-4" />;
    case 'deleted':
      return <Trash2 className="h-4 w-4" />;
    case 'document_uploaded':
      return <Upload className="h-4 w-4" />;
    case 'document_deleted':
      return <FileText className="h-4 w-4" />;
    case 'agent_assigned':
      return <Users className="h-4 w-4" />;
    case 'appointment_created':
    case 'appointment_updated':
    case 'appointment_deleted':
      return <Calendar className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getActivityColor = (actionType: string) => {
  switch (actionType) {
    case 'created':
      return 'bg-green-100 text-green-600 border-green-500';
    case 'updated':
      return 'bg-blue-100 text-blue-600 border-blue-500';
    case 'deleted':
      return 'bg-red-100 text-red-600 border-red-500';
    case 'document_uploaded':
      return 'bg-purple-100 text-purple-600 border-purple-500';
    case 'document_deleted':
      return 'bg-red-100 text-red-600 border-red-500';
    case 'agent_assigned':
      return 'bg-indigo-100 text-indigo-600 border-indigo-500';
    case 'appointment_created':
    case 'appointment_updated':
    case 'appointment_deleted':
      return 'bg-orange-100 text-orange-600 border-orange-500';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-500';
  }
};

const formatActionType = (actionType: string) => {
  return actionType
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const AuditLogTimeline: React.FC<AuditLogTimelineProps> = ({ logs, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No activity recorded yet</p>
      </div>
    );
  }


  const groupedLogs = logs.reduce((groups: any, log: AuditLog) => {
    const date = new Date(log.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey;
    if (date.toDateString() === today.toDateString()) {
      dateKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = 'Yesterday';
    } else {
      dateKey = date.toLocaleDateString();
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(log);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedLogs).map(([dateKey, dayLogs]: [string, any]) => (
        <div key={dateKey} className="relative">
          {/* Date Header */}
          <div className="flex items-center mb-4">
            <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {dateKey}
            </div>
          </div>

          {/* Timeline Items */}
          <div className="space-y-4">
            {dayLogs.map((log: AuditLog, index: number) => (
              <div key={log.id} className="relative pl-6">
                {/* Timeline Line */}
                {index < dayLogs.length - 1 && (
                  <div className="absolute left-0 top-8 h-full w-px bg-gray-200"></div>
                )}
                
                {/* Timeline Dot */}
                <div className={`absolute left-0 top-2 w-2 h-2 rounded-full -translate-x-0.5 ${getActivityColor(log.actionType).split(' ')[2]}`}></div>

                {/* Content Card */}
                <Card className="p-4 ml-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className={`p-2 rounded ${getActivityColor(log.actionType).split(' ')[0]} ${getActivityColor(log.actionType).split(' ')[1]}`}>
                        {getActivityIcon(log.actionType)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{log.description}</p>
                        
                        {/* Metadata */}
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-gray-400">
                            {new Date(log.createdAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          
                          {log.userFullName && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <User className="h-3 w-3" />
                              <span>{log.userFullName}</span>
                            </div>
                          )}
                          
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800">
                            {formatActionType(log.actionType)}
                          </Badge>
                        </div>

                        {/* Additional Details */}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            {log.metadata.documentId && (
                              <span>Document ID: {log.metadata.documentId}</span>
                            )}
                            {log.metadata.mimeType && (
                              <span className="ml-2">Type: {log.metadata.mimeType}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
