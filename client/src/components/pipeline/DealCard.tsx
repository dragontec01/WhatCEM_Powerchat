import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, User, Clock, Calendar, Tag } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import HighlightedText from '@/components/ui/highlighted-text';
import { Deal } from '@shared/db/schema';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ContactAvatar } from '@/components/contacts/ContactAvatar';
import EditDealModal from './EditDealModal';
import DealDetailsModal from './DealDetailsModal';
import ContactDetailsModal from './ContactDetailsModal';

interface DealCardProps {
  deal: Deal;
  isSelected?: boolean;
  onSelect?: (deal: Deal, selected: boolean) => void;
  showSelectionMode?: boolean;
  searchTerm?: string;
}

export default function DealCard({ 
  deal, 
  isSelected = false, 
  onSelect, 
  showSelectionMode = false,
  searchTerm = ''
}: DealCardProps) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDealModalOpen, setIsEditDealModalOpen] = useState(false);
  const [isDealDetailsModalOpen, setIsDealDetailsModalOpen] = useState(false);
  const [isContactDetailsModalOpen, setIsContactDetailsModalOpen] = useState(false);

  const { data: contact } = useQuery({
    queryKey: ['/api/contacts', deal.contactId],
    queryFn: () => apiRequest('GET', `/api/contacts/${deal.contactId}`)
      .then(res => res.json()),
    enabled: !!deal.contactId,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['/api/team-members'],
    queryFn: () => apiRequest('GET', '/api/team-members')
      .then(res => res.json()),
  });

  const assignedUser = teamMembers.find((member: any) => member.id === deal.assignedToUserId);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/deals/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });

      if (deal.stage) {
        queryClient.invalidateQueries({ queryKey: [`/api/deals/stage/${deal.stage}`] });
      }

      if (deal.stageId) {
        queryClient.invalidateQueries({ queryKey: [`/api/deals/stageId/${deal.stageId}`] });
      }
    },
    onError: (error: Error) => {
      console.error('Error deleting deal:', error);
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate(deal.id);
    setIsDeleteDialogOpen(false);
  };

  const handleEditDeal = () => {
    setIsEditDealModalOpen(true);
  };

  const handleViewDetails = () => {
    setIsDealDetailsModalOpen(true);
  };

  const handleViewContact = () => {
    setIsContactDetailsModalOpen(true);
  };

  const handleContactClick = () => {
    if (!contact?.id || !contact?.identifierType) return;

    localStorage.setItem('selectedContactId', contact.id.toString());
    localStorage.setItem('selectedChannelType', contact.identifierType);

    setLocation('/');

    toast({
      title: "Redirecting to inbox",
      description: `Opening conversation with ${contact.name}`,
    });
  };

  const handleCardClick = () => {
    if (showSelectionMode && onSelect) {
      onSelect(deal, !isSelected);
    }
  };

  const priorityColors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500',
  };

  const priorityColor = priorityColors[deal.priority as keyof typeof priorityColors] || 'bg-gray-500';

  return (
    <div 
      className={`bg-card border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-grab group relative hover:border-blue-300 mb-3 ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Selection Checkbox */}
      {showSelectionMode && (
        <div className="absolute top-2 left-2 z-20">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect?.(deal, !!checked)}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-2 border-gray-300 shadow-sm"
          />
        </div>
      )}
      {/* Quick Actions Overlay */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-white/90 hover:bg-white border shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditDeal();
                }}
              >
                <i className="ri-edit-line text-xs" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Quick Edit</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-white/90 hover:bg-white border shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails();
                }}
              >
                <i className="ri-eye-line text-xs" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>View Details</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bg-white/90 hover:bg-white border shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>More Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleViewContact}>
              <i className="ri-user-line mr-2 h-4 w-4" />
              View Contact
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleContactClick}>
              <i className="ri-message-3-line mr-2 h-4 w-4" />
              Open Chat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setIsDeleteDialogOpen(true)} 
              className="text-destructive focus:text-destructive"
            >
              <i className="ri-delete-bin-line mr-2 h-4 w-4" />
              Delete Deal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Header Section */}
      <div className="p-3 pb-2">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-medium text-sm leading-tight truncate text-gray-900 group-hover:text-blue-600 transition-colors">
              <HighlightedText 
                text={deal.title} 
                searchTerm={searchTerm}
              />
            </h3>
            {deal.value && (
              <div className="text-lg font-semibold text-green-600 mt-1">
                ${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(deal.value)}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Priority Indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`h-3 w-3 rounded-full border-2 border-white shadow-sm ${priorityColor}`} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="capitalize">{deal.priority} priority</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Description */}
        {deal.description && (
          <p className="text-xs text-gray-600 line-clamp-2 mb-2 leading-relaxed">
            <HighlightedText 
              text={deal.description} 
              searchTerm={searchTerm}
            />
          </p>
        )}

        {/* Assigned User */}
        {assignedUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded-md">
              <User className="h-3 w-3" />
              <span className="font-medium">
                {assignedUser.fullName || assignedUser.username}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Contact Section */}
      {contact && (
        <div 
          className="px-3 py-2 border-t border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors"
          onClick={handleContactClick}
          title={`Open conversation with ${contact.name}`}
        >
          <div className="flex items-center gap-2">
            <ContactAvatar contact={contact} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-900 truncate">
                  <HighlightedText 
                    text={contact.name} 
                    searchTerm={searchTerm}
                  />
                </span>
                {contact.identifierType && (
                  <div className="flex-shrink-0">
                    {contact.identifierType === 'whatsapp' && <i className="ri-whatsapp-line text-green-500 text-xs" />}
                    {contact.identifierType === 'whatsapp_unofficial' && <i className="ri-whatsapp-line text-green-500 text-xs" />}
                    {contact.identifierType === 'messenger' && <i className="ri-messenger-line text-blue-500 text-xs" />}
                    {contact.identifierType === 'instagram' && <i className="ri-instagram-line text-pink-500 text-xs" />}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Section */}
      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/30">
        <div className="flex items-center justify-between text-xs text-gray-500">
          {/* Left side - Assignment */}
          <div className="flex items-center gap-3">
            {assignedUser && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className="truncate max-w-16">
                        {assignedUser.fullName?.split(' ')[0] || assignedUser.username}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Assigned to: {assignedUser.fullName || assignedUser.username}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {deal.dueDate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(deal.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Due: {new Date(deal.dueDate).toLocaleDateString()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Right side - Activity */}
          {deal.lastActivityAt && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(deal.lastActivityAt), { addSuffix: true })}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Last activity: {new Date(deal.lastActivityAt).toLocaleString()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Tags */}
        {deal.tags && deal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {deal.tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs px-1.5 py-0.5 h-auto font-normal bg-blue-50 text-blue-700 border-blue-200"
              >
                {tag}
              </Badge>
            ))}
            {deal.tags.length > 3 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className="text-xs px-1.5 py-0.5 h-auto font-normal text-gray-500"
                    >
                      +{deal.tags.length - 3}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{deal.tags.slice(3).join(', ')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the deal "{deal.title}" from your pipeline. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditDealModal
        deal={deal}
        isOpen={isEditDealModalOpen}
        onClose={() => setIsEditDealModalOpen(false)}
      />

      <DealDetailsModal
        deal={deal}
        isOpen={isDealDetailsModalOpen}
        onClose={() => setIsDealDetailsModalOpen(false)}
      />

      <ContactDetailsModal
        contactId={deal.contactId}
        isOpen={isContactDetailsModalOpen}
        onClose={() => setIsContactDetailsModalOpen(false)}
      />
    </div>
  );
}