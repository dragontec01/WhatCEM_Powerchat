import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
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
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const addDealSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  stage: z.string().min(1, 'Please select a pipeline stage'),
  value: z.number().min(0).optional().nullable(),
  contactId: z.number().min(1, 'Please select a contact'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.date().optional().nullable(),
  assignedToUserId: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
});

type AddDealFormValues = z.infer<typeof addDealSchema>;

interface AddDealModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddDealModal({ isOpen, onClose }: AddDealModalProps) {
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
      .then(res => res.json())
      .then(data => {
        return data;
      }),
  });

  const form = useForm<AddDealFormValues>({
    resolver: zodResolver(addDealSchema),
    defaultValues: {
      title: '',
      stage: '',
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
    if (pipelineStages.length > 0 && !form.getValues('stage')) {
      form.setValue('stage', pipelineStages[0].id.toString());
    }
  }, [pipelineStages, form]);

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

  const createDealMutation = useMutation({
    mutationFn: async (data: AddDealFormValues) => {
      const response = await apiRequest('POST', '/api/deals', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal has been created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create deal: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: AddDealFormValues) => {
    values.tags = selectedTags;
    createDealMutation.mutate(values);
  };

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
          <DialogTitle>Add New Deal</DialogTitle>
          <DialogDescription>Create a new deal in your pipeline</DialogDescription>
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
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                        value={field.value === null ? '' : field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pipelineStages.map((stage: any) => (
                          <SelectItem key={stage.id} value={stage.id.toString()}>
                            {stage.name}
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
                name="contactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === 'none' ? null : parseInt(value))}
                      value={field.value?.toString() || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {contactsData?.contacts && Array.isArray(contactsData.contacts) ? (
                          contactsData.contacts.map((contact: any) => (
                            <SelectItem key={contact.id} value={contact.id.toString()}>
                              {contact.fullName || contact.name || contact.phoneNumber}
                            </SelectItem>
                          ))
                        ) : null}
                      </SelectContent>
                    </Select>
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                          <SelectValue placeholder="Assign to" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {teamMembers.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.fullName || user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem className="md:col-span-2">
                <FormLabel>Tags</FormLabel>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tags"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button type="button" size="sm" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <FormDescription>Press Enter or click Add to add a tag</FormDescription>
              </FormItem>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter deal description"
                        className="min-h-[100px]"
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
        </ScrollArea>

        <div className="border-t border-border mt-2">
          <DialogFooter className="px-8 py-6 flex flex-row justify-end gap-3 sm:gap-2">
            <Button type="button" variant="outline"  onClick={onClose}>
              Cancel
            </Button>
            <Button  variant="outline" className="btn-brand-primary"
              type="submit"
              disabled={createDealMutation.isPending}
              onClick={form.handleSubmit(onSubmit)}
            >
              {createDealMutation.isPending ? "Creating..." : "Create Deal"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}