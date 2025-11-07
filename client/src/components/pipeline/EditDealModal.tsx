import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { Deal } from '@shared/db/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const editDealSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  stageId: z.string().min(1, 'Please select a pipeline stage'),
  value: z.number().min(0).optional().nullable(),
  contactId: z.number().min(1, 'Please select a contact'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.date().optional().nullable(),
  assignedToUserId: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
});

type EditDealFormValues = z.infer<typeof editDealSchema>;

interface EditDealModalProps {
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditDealModal({ deal, isOpen, onClose }: EditDealModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');

  const { data: contactsData } = useQuery({
    queryKey: ['/api/contacts'],
    queryFn: () => apiRequest('GET', '/api/contacts')
      .then(res => res.json()),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['/api/team-members'],
    queryFn: () => apiRequest('GET', '/api/team-members')
      .then(res => res.json()),
  });

  const { data: pipelineStages = [] } = useQuery({
    queryKey: ['/api/pipeline/stages'],
    queryFn: () => apiRequest('GET', '/api/pipeline/stages')
      .then(res => res.json()),
  });

  const form = useForm<EditDealFormValues>({
    resolver: zodResolver(editDealSchema),
    defaultValues: {
      title: '',
      stageId: '',
      value: null,
      contactId: undefined,
      priority: 'medium',
      dueDate: null,
      assignedToUserId: null,
      description: '',
      tags: [],
    },
  });

  useEffect(() => {
    if (deal && isOpen) {
      form.reset({
        title: deal.title || '',
        stageId: deal.stageId?.toString() || '',
        value: deal.value || null,
        contactId: deal.contactId || undefined,
        priority: deal.priority || 'medium',
        dueDate: deal.dueDate ? new Date(deal.dueDate) : null,
        assignedToUserId: deal.assignedToUserId || null,
        description: deal.description || '',
        tags: deal.tags || [],
      });
      setSelectedTags(deal.tags || []);
    }
  }, [deal, isOpen, form]);

  const resetForm = () => {
    form.reset();
    setSelectedTags([]);
    setTagInput('');
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
      const newTags = [...selectedTags, tagInput.trim()];
      setSelectedTags(newTags);
      form.setValue('tags', newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    const newTags = selectedTags.filter(t => t !== tag);
    setSelectedTags(newTags);
    form.setValue('tags', newTags);
  };

  const updateDealMutation = useMutation({
    mutationFn: async (data: EditDealFormValues) => {
      if (!deal) throw new Error('No deal to update');
      const response = await apiRequest('PATCH', `/api/deals/${deal.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update deal: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: EditDealFormValues) => {
    const submitData = {
      ...values,
      tags: selectedTags,
    };
    updateDealMutation.mutate(submitData);
  };

  const contacts = contactsData?.contacts || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
      if (open) {
        resetForm();
      }
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] md:max-h-[80vh] p-0 flex flex-col">
        <DialogHeader className="px-8 pt-6 pb-4">
          <DialogTitle>Edit Deal</DialogTitle>
          <DialogDescription>Update the deal information</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-4 py-6 overflow-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 m-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Deal Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter deal title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

                <FormField
                  control={form.control}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a contact" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contacts.map((contact: any) => (
                            <SelectItem key={contact.id} value={contact.id.toString()}>
                              {contact.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pipeline Stage</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pipelineStages.map((stage: any) => (
                            <SelectItem key={stage.id} value={stage.id.toString()}>
                              <div className="flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-2"
                                  style={{ backgroundColor: stage.color }}
                                />
                                {stage.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Value ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedToUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === 'unassigned' ? null : parseInt(value))}
                        value={field.value?.toString() || 'unassigned'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {teamMembers.map((member: any) => (
                            <SelectItem key={member.id} value={member.id.toString()}>
                              {member.fullName || member.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter deal description..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Tags</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter className="px-8 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateDealMutation.isPending}
          >
            {updateDealMutation.isPending ? 'Updating...' : 'Update Deal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

