import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Variable,
  User,
  MessageSquare,
  Settings,
  Workflow,
  Database,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useFlowVariables, getCategoryLabel, getCategoryIcon, type FlowVariable } from '@/hooks/useFlowVariables';

interface EnhancedVariablePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  flowId?: number;
  disabled?: boolean;
}

const getCategoryIconComponent = (category: FlowVariable['category']) => {
  switch (category) {
    case 'contact': return <User className="w-3 h-3" />;
    case 'message': return <MessageSquare className="w-3 h-3" />;
    case 'system': return <Settings className="w-3 h-3" />;
    case 'flow': return <Workflow className="w-3 h-3" />;
    case 'captured': return <Database className="w-3 h-3" />;
    default: return <Variable className="w-3 h-3" />;
  }
};

export function EnhancedVariablePicker({ 
  value, 
  onChange, 
  placeholder, 
  className, 
  flowId,
  disabled = false 
}: EnhancedVariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const {
    variables,
    capturedVariables,
    loading,
    error,
    fetchCapturedVariables,
    getVariablesByCategory
  } = useFlowVariables(flowId);

  const filteredVariables = variables.filter(variable =>
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
  }, {} as Record<string, FlowVariable[]>);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart || 0);
  };

  const handleInputSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    setCursorPosition(target.selectionStart || 0);
  };

  const insertVariable = (variableValue: string) => {
    const currentValue = value || '';
    const beforeCursor = currentValue.substring(0, cursorPosition);
    const afterCursor = currentValue.substring(cursorPosition);
    const newValue = `${beforeCursor}{{${variableValue}}}${afterCursor}`;

    onChange(newValue);
    setOpen(false);

    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPosition = beforeCursor.length + variableValue.length + 4;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        setCursorPosition(newCursorPosition);
      }
    }, 0);
  };

  const handleRefresh = () => {
    fetchCapturedVariables();
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
        disabled={disabled}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 flex items-center gap-1"
            title="Insert variable"
            disabled={disabled}
          >
            <Variable className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <div className="flex items-center gap-2 p-2 border-b">
              <CommandInput
                placeholder="Search variables..."
                value={searchValue}
                onValueChange={setSearchValue}
                className="flex-1"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={handleRefresh}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Refresh captured variables</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <CommandList>
              <CommandEmpty>
                {error ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-red-600">Error loading variables</p>
                    <p className="text-xs text-muted-foreground">{error}</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs">No variables found.</p>
                  </div>
                )}
              </CommandEmpty>

              {Object.entries(groupedVariables).map(([category, categoryVariables]) => (
                <CommandGroup
                  key={category}
                  heading={
                    <div className="flex items-center gap-2">
                      <span>{getCategoryIcon(category as FlowVariable['category'])}</span>
                      <span>{getCategoryLabel(category as FlowVariable['category'])}</span>
                      {category === 'captured' && capturedVariables.length > 0 && (
                        <Badge variant="secondary" className="text-[9px] px-1">
                          {capturedVariables.length}
                        </Badge>
                      )}
                    </div>
                  }
                >
                  {categoryVariables.map((variable) => (
                    <CommandItem
                      key={variable.value}
                      value={variable.value}
                      onSelect={() => insertVariable(variable.value)}
                      className="flex items-center gap-3 p-3"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {getCategoryIconComponent(variable.category)}
                        <div className="flex-1">
                          <div className="font-medium text-xs">{variable.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {variable.description}
                          </div>
                          {variable.dataType && (
                            <div className="text-[10px] text-blue-600 font-mono">
                              {variable.dataType}
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs font-mono">
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
