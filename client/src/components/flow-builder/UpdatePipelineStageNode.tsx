import React, { useCallback, useEffect, useState } from "react";
import {
  NodeProps,
  Handle,
  Position,
  useReactFlow
} from "reactflow";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Trash2,
  Copy,
  ArrowRightCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  HelpCircle,
  Target,
  DollarSign,
  Tag,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Loader2,
  Variable,
  Phone,
  Mail,
  Building,
  Hash,
  Type,
  MessageSquare
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useFlowContext } from "@/pages/flow-builder";
import { PipelineStage } from "@shared/db/schema";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { standardHandleStyle } from './StyledHandle';
import { useTranslation } from '@/hooks/use-translation';


interface VariableOption {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'contact' | 'message' | 'system' | 'deal';
}

const AVAILABLE_VARIABLES: VariableOption[] = [

  {
    value: 'contact.id',
    label: 'Contact ID',
    description: 'Unique identifier for the contact',
    icon: <Hash className="w-4 h-4" />,
    category: 'contact'
  },
  {
    value: 'contact.phone',
    label: 'Contact Phone',
    description: 'Phone number of the contact',
    icon: <Phone className="w-4 h-4" />,
    category: 'contact'
  },
  {
    value: 'contact.name',
    label: 'Contact Name',
    description: 'Full name of the contact',
    icon: <User className="w-4 h-4" />,
    category: 'contact'
  },
  {
    value: 'contact.email',
    label: 'Contact Email',
    description: 'Email address of the contact',
    icon: <Mail className="w-4 h-4" />,
    category: 'contact'
  },

  {
    value: 'message.content',
    label: 'Message Content',
    description: 'Content of the received message',
    icon: <MessageSquare className="w-4 h-4" />,
    category: 'message'
  },
  {
    value: 'message.type',
    label: 'Message Type',
    description: 'Type of the message (text, image, etc.)',
    icon: <Type className="w-4 h-4" />,
    category: 'message'
  },

  {
    value: 'date.today',
    label: 'Current Date',
    description: 'Today\'s date',
    icon: <Calendar className="w-4 h-4" />,
    category: 'system'
  },
  {
    value: 'time.now',
    label: 'Current Time',
    description: 'Current time',
    icon: <Calendar className="w-4 h-4" />,
    category: 'system'
  }
];


interface VariablePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function VariablePicker({ value, onChange, placeholder, className }: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredVariables = AVAILABLE_VARIABLES.filter(variable =>
    variable.label.toLowerCase().includes(searchValue.toLowerCase()) ||
    variable.value.toLowerCase().includes(searchValue.toLowerCase()) ||
    variable.description.toLowerCase().includes(searchValue.toLowerCase())
  );

  const groupedVariables = filteredVariables.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {} as Record<string, VariableOption[]>);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart || 0);
  };


  const handleInputSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    setCursorPosition(target.selectionStart || 0);
  };

  const insertVariable = (variableValue: string) => {
    const variableText = `{{${variableValue}}}`;
    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    const newValue = beforeCursor + variableText + afterCursor;

    onChange(newValue);
    setOpen(false);


    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPosition = cursorPosition + variableText.length;
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'contact': return 'Contact';
      case 'message': return 'Message';
      case 'system': return 'System';
      case 'deal': return 'Deal';
      default: return category;
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onSelect={handleInputSelect}
        onKeyUp={handleInputSelect}
        onClick={handleInputSelect}
        placeholder={placeholder}
        className={cn("font-mono text-xs", className)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 flex items-center gap-1"
          >
            <Variable className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search variables..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No variables found.</CommandEmpty>

              {Object.entries(groupedVariables).map(([category, variables]) => (
                <CommandGroup
                  key={category}
                  heading={getCategoryLabel(category)}
                >
                  {variables.map((variable) => (
                    <CommandItem
                      key={variable.value}
                      value={variable.value}
                      onSelect={() => insertVariable(variable.value)}
                      className="flex items-center gap-3 p-3"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {variable.icon}
                        <div className="flex-1">
                          <div className="font-medium text-xs">{variable.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {variable.description}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {`{{${variable.value}}}`}
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export type UpdatePipelineStageData = {
  id: string;
  type: "update_pipeline_stage";

  operation: 'update_stage' | 'create_stage' | 'create_deal' | 'update_deal' | 'manage_tags';
  stageId?: string | null;
  stageName?: string;
  stageColor?: string;

  dealIdVariable?: string;
  createDealIfNotExists?: boolean;
  dealTitle?: string;
  dealValue?: string;
  dealPriority?: 'low' | 'medium' | 'high' | '';
  dealDueDate?: string;
  dealDescription?: string;
  dealAssignedToUserId?: string;

  tagsToAdd?: string[];
  tagsToRemove?: string[];
  tagInput?: string;

  enableAdvancedOptions?: boolean;
  createStageIfNotExists?: boolean;
  errorHandling?: 'continue' | 'stop';

  showAdvanced?: boolean;
  showTagManagement?: boolean;
  showDealCreation?: boolean;
};

function UpdatePipelineStageNode({
  id,
  data,
  selected,
  isConnectable
}: NodeProps<UpdatePipelineStageData>) {
  const { onDeleteNode, onDuplicateNode } = useFlowContext();
  const { getNodes, setNodes } = useReactFlow();
  const [showToolbar, setShowToolbar] = useState(false);

  const { data: pipelineStages, isLoading } = useQuery<PipelineStage[]>({
    queryKey: ['/api/pipeline/stages'],
    staleTime: 60 * 1000,
  });

  const { data: dealTags } = useQuery<string[]>({
    queryKey: ['/api/deals/tags'],
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (data && (!data.operation || !data.dealIdVariable)) {
      const updatedData = {
        ...data,
        operation: data.operation || 'update_stage',
        dealIdVariable: data.dealIdVariable || "{{contact.phone}}",
        dealPriority: data.dealPriority || 'medium',
        errorHandling: data.errorHandling || 'continue',
        tagsToAdd: data.tagsToAdd || [],
        tagsToRemove: data.tagsToRemove || [],
        enableAdvancedOptions: data.enableAdvancedOptions || false,
        createDealIfNotExists: data.createDealIfNotExists || false,
        createStageIfNotExists: data.createStageIfNotExists || false
      };

      updateNodeData(updatedData);
    }
  }, [data, id, getNodes, setNodes]);

  const updateNodeData = useCallback((updates: Partial<UpdatePipelineStageData>) => {
    const nodes = getNodes();
    const updatedNodes = nodes.map((node: any) => {
      if (node.id === id) {
        return {
          ...node,
          data: { ...node.data, ...updates }
        };
      }
      return node;
    });
    setNodes(updatedNodes);
  }, [id, getNodes, setNodes]);

  const handleDelete = useCallback(() => {
    onDeleteNode(id);
  }, [id, onDeleteNode]);

  const handleDuplicate = useCallback(() => {
    onDuplicateNode(id);
  }, [id, onDuplicateNode]);

  const handleOperationChange = useCallback((value: string) => {
    updateNodeData({ operation: value as any });
  }, [updateNodeData]);

  const handleStageChange = useCallback((value: string) => {
    updateNodeData({ stageId: value });
  }, [updateNodeData]);

  const handleInputChange = useCallback((field: keyof UpdatePipelineStageData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateNodeData({ [field]: e.target.value });
    }, [updateNodeData]);

  const handleSelectChange = useCallback((field: keyof UpdatePipelineStageData) =>
    (value: string) => {
      const actualValue = value === 'keep_current' ? '' : value;
      updateNodeData({ [field]: actualValue });
    }, [updateNodeData]);

  const handleSwitchChange = useCallback((field: keyof UpdatePipelineStageData) =>
    (checked: boolean) => {
      updateNodeData({ [field]: checked });
    }, [updateNodeData]);

  const handleAddTag = useCallback((tag: string) => {
    if (tag.trim() && !data.tagsToAdd?.includes(tag.trim())) {
      const newTags = [...(data.tagsToAdd || []), tag.trim()];
      updateNodeData({ tagsToAdd: newTags, tagInput: '' });
    }
  }, [data.tagsToAdd, updateNodeData]);

  const handleRemoveTag = useCallback((tag: string, isAddTag: boolean = true) => {
    if (isAddTag) {
      const newTags = data.tagsToAdd?.filter(t => t !== tag) || [];
      updateNodeData({ tagsToAdd: newTags });
    } else {
      const newTags = data.tagsToRemove?.filter(t => t !== tag) || [];
      updateNodeData({ tagsToRemove: newTags });
    }
  }, [data.tagsToAdd, data.tagsToRemove, updateNodeData]);

  const handleAddRemoveTag = useCallback((tag: string) => {
    if (tag.trim() && !data.tagsToRemove?.includes(tag.trim())) {
      const newTags = [...(data.tagsToRemove || []), tag.trim()];
      updateNodeData({ tagsToRemove: newTags });
    }
  }, [data.tagsToRemove, updateNodeData]);

  const getOperationIcon = () => {
    switch (data.operation) {
      case 'create_stage': return <Plus className="w-4 h-4" />;
      case 'create_deal': return <DollarSign className="w-4 h-4" />;
      case 'update_deal': return <Target className="w-4 h-4" />;
      case 'manage_tags': return <Tag className="w-4 h-4" />;
      default: return <ArrowRightCircle className="w-4 h-4" />;
    }
  };

  const getOperationTitle = () => {
    switch (data.operation) {
      case 'create_stage': return 'Create Pipeline Stage';
      case 'create_deal': return 'Create Deal';
      case 'update_deal': return 'Update Deal';
      case 'manage_tags': return 'Manage Tags';
      default: return 'Update Pipeline Stage';
    }
  };

  const getOperationDescription = () => {
    switch (data.operation) {
      case 'create_stage': return 'Create a new pipeline stage';
      case 'create_deal': return 'Create a new deal in pipeline';
      case 'update_deal': return 'Update existing deal properties';
      case 'manage_tags': return 'Add or remove tags from deals';
      default: return 'Move contact/deal to pipeline stage';
    }
  };

  return (
    <TooltipProvider>
      <div
        className="group relative"
        onMouseEnter={() => setShowToolbar(true)}
        onMouseLeave={() => setShowToolbar(false)}
      >
        {showToolbar && (
          <div className="absolute -top-10 right-0 flex space-x-2 z-50 bg-background p-1 rounded-md shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDuplicate}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Handle
          type="target"
          position={Position.Left}
          style={standardHandleStyle}
          isConnectable={isConnectable}
        />

        <Card className={cn(
          "min-w-[380px] max-w-[480px] transition-all duration-200",
          selected ? 'border-primary border-2 shadow-lg' : 'border-border',
          "bg-gradient-to-br from-background to-muted/20"
        )}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/20">
                  {getOperationIcon()}
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    {getOperationTitle()}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {getOperationDescription()}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                Pipeline
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Target className="w-3 h-3" />
                Operation Type
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Choose what action to perform in the pipeline</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select
                value={data.operation || 'update_stage'}
                onValueChange={handleOperationChange}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="update_stage">
                    <div className="flex items-center gap-2">
                      <ArrowRightCircle className="w-3 h-3" />
                      Update Stage
                    </div>
                  </SelectItem>
                  <SelectItem value="create_stage">
                    <div className="flex items-center gap-2">
                      <Plus className="w-3 h-3" />
                      Create Stage
                    </div>
                  </SelectItem>
                  <SelectItem value="create_deal">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3 h-3" />
                      Create Deal
                    </div>
                  </SelectItem>
                  <SelectItem value="update_deal">
                    <div className="flex items-center gap-2">
                      <Target className="w-3 h-3" />
                      Update Deal
                    </div>
                  </SelectItem>
                  <SelectItem value="manage_tags">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3 h-3" />
                      Manage Tags
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {data.operation === 'update_stage' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <ArrowRightCircle className="w-3 h-3" />
                  Target Stage
                </Label>
                <Select
                  value={data.stageId || ''}
                  onValueChange={handleStageChange}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <SelectItem value="loading">Loading stages...</SelectItem>
                    ) : (
                      pipelineStages?.map((stage) => (
                        <SelectItem
                          key={stage.id}
                          value={stage.id.toString()}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {data.operation === 'create_stage' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Stage Name</Label>
                  <Input
                    value={data.stageName || ''}
                    onChange={handleInputChange('stageName')}
                    placeholder="Enter stage name"
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Stage Color</Label>
                  <Input
                    type="color"
                    value={data.stageColor || '#3a86ff'}
                    onChange={handleInputChange('stageColor')}
                    className="h-8 w-20"
                  />
                </div>
              </div>
            )}

            {(data.operation === 'update_stage' || data.operation === 'update_deal' || data.operation === 'manage_tags') && (
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Deal/Contact ID Variable
                </Label>
                <VariablePicker
                  value={data.dealIdVariable || ''}
                  onChange={(value) => updateNodeData({ dealIdVariable: value })}
                  placeholder="{{contact.phone}}"
                  className="h-8"
                />
                <p className="text-xs text-muted-foreground">
                  Variable containing the deal ID or contact phone number
                </p>
              </div>
            )}

            {data.operation === 'create_deal' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Deal Title</Label>
                  <VariablePicker
                    value={data.dealTitle || ''}
                    onChange={(value) => updateNodeData({ dealTitle: value })}
                    placeholder="{{contact.name}} - New Deal"
                    className="h-8"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Value</Label>
                    <VariablePicker
                      value={data.dealValue || ''}
                      onChange={(value) => updateNodeData({ dealValue: value })}
                      placeholder="{{deal.amount}}"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Priority</Label>
                    <Select
                      value={data.dealPriority || 'medium'}
                      onValueChange={handleSelectChange('dealPriority')}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Target Stage</Label>
                  <Select
                    value={data.stageId || ''}
                    onValueChange={handleStageChange}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select initial stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelineStages?.map((stage) => (
                        <SelectItem
                          key={stage.id}
                          value={stage.id.toString()}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Description</Label>
                  <VariablePicker
                    value={data.dealDescription || ''}
                    onChange={(value) => updateNodeData({ dealDescription: value })}
                    placeholder="Deal description..."
                    className="h-16"
                  />
                </div>
              </div>
            )}

            {data.operation === 'update_deal' && (
              <div className="space-y-3">
                <Collapsible
                  open={data.showDealCreation}
                  onOpenChange={(open) => updateNodeData({ showDealCreation: open })}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                      <span className="text-xs">Deal Update Options</span>
                      {data.showDealCreation ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 mt-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">New Title</Label>
                      <VariablePicker
                        value={data.dealTitle || ''}
                        onChange={(value) => updateNodeData({ dealTitle: value })}
                        placeholder="Leave empty to keep current"
                        className="h-8"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">New Value</Label>
                        <VariablePicker
                          value={data.dealValue || ''}
                          onChange={(value) => updateNodeData({ dealValue: value })}
                          placeholder="Leave empty to keep current"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">New Priority</Label>
                        <Select
                          value={data.dealPriority || 'keep_current'}
                          onValueChange={(value) => {
                            const actualValue = value === 'keep_current' ? '' : value as 'low' | 'medium' | 'high';
                            updateNodeData({ dealPriority: actualValue });
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Keep current" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="keep_current">Keep current</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium">New Stage</Label>
                      <Select
                        value={data.stageId || 'keep_current'}
                        onValueChange={(value) => {
                          const actualValue = value === 'keep_current' ? '' : value;
                          updateNodeData({ stageId: actualValue });
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Keep current stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keep_current">Keep current</SelectItem>
                          {pipelineStages?.map((stage) => (
                            <SelectItem
                              key={stage.id}
                              value={stage.id.toString()}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: stage.color }}
                                />
                                {stage.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {data.operation === 'manage_tags' && (
              <div className="space-y-3">
                <Collapsible
                  open={data.showTagManagement}
                  onOpenChange={(open) => updateNodeData({ showTagManagement: open })}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                      <span className="text-xs flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Tag Management
                      </span>
                      {data.showTagManagement ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 mt-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-green-600">Tags to Add</Label>
                      <div className="flex gap-1">
                        <Input
                          value={data.tagInput || ''}
                          onChange={handleInputChange('tagInput')}
                          placeholder="Enter tag name"
                          className="h-8 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag(data.tagInput || '');
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2"
                          onClick={() => handleAddTag(data.tagInput || '')}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      {data.tagsToAdd && data.tagsToAdd.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {data.tagsToAdd.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs bg-green-100 text-green-700 dark:bg-green-900/20"
                            >
                              {tag}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-3 w-3 p-0 ml-1"
                                onClick={() => handleRemoveTag(tag, true)}
                              >
                                <X className="w-2 h-2" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {dealTags && dealTags.length > 0 && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Quick Add:</Label>
                          <div className="flex flex-wrap gap-1">
                            {dealTags.slice(0, 6).map((tag) => (
                              <Button
                                key={tag}
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleAddTag(tag)}
                                disabled={data.tagsToAdd?.includes(tag)}
                              >
                                {tag}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-red-600">Tags to Remove</Label>
                      <div className="flex gap-1">
                        <Select onValueChange={handleAddRemoveTag}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select tag to remove" />
                          </SelectTrigger>
                          <SelectContent>
                            {dealTags?.map((tag) => (
                              <SelectItem key={tag} value={tag}>
                                {tag}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {data.tagsToRemove && data.tagsToRemove.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {data.tagsToRemove.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs bg-red-100 text-red-700 dark:bg-red-900/20"
                            >
                              {tag}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-3 w-3 p-0 ml-1"
                                onClick={() => handleRemoveTag(tag, false)}
                              >
                                <X className="w-2 h-2" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            <Collapsible
              open={data.showAdvanced}
              onOpenChange={(open) => updateNodeData({ showAdvanced: open })}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-muted-foreground">
                  <span className="text-xs">Advanced Options</span>
                  {data.showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-2">
                {(data.operation === 'update_stage' || data.operation === 'update_deal') && (
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Create deal if not exists</Label>
                    <Switch
                      checked={data.createDealIfNotExists || false}
                      onCheckedChange={handleSwitchChange('createDealIfNotExists')}
                    />
                  </div>
                )}

                {data.operation === 'update_stage' && (
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Create stage if not exists</Label>
                    <Switch
                      checked={data.createStageIfNotExists || false}
                      onCheckedChange={handleSwitchChange('createStageIfNotExists')}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Error Handling</Label>
                  <Select
                    value={data.errorHandling || 'continue'}
                    onValueChange={handleSelectChange('errorHandling')}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continue">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          Continue on error
                        </div>
                      </SelectItem>
                      <SelectItem value="stop">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-3 h-3 text-red-500" />
                          Stop on error
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

export default UpdatePipelineStageNode;