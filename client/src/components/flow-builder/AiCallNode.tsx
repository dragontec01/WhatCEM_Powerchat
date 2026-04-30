import React, { useCallback, useMemo, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Phone, PhoneCall, Trash2, Copy, ChevronDown, ChevronRight,
  AlertTriangle, Variable, User, MessageSquare, CheckCircle, Plus, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { standardHandleStyle } from './StyledHandle';
import { useFlowContext } from '@/pages/flow-builder';
import { useTranslation } from '@/hooks/use-translation';

// ── Types ────────────────────────────────────────────────────────────────────

interface PhoneEntry {
  id: string;
  phone: string;
  contactName: string;
}

interface VariableOption {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

// ── Constants ────────────────────────────────────────────────────────────────

const PHONE_VARIABLES: VariableOption[] = [
  { value: 'contact.phone', label: 'Contact Phone', description: 'Phone number of the contact', icon: <Phone className="w-3.5 h-3.5" /> },
  { value: 'contact.name',  label: 'Contact Name',  description: 'Full name of the contact',    icon: <User className="w-3.5 h-3.5" /> },
];

const ALL_VARIABLES: VariableOption[] = [
  { value: 'contact.phone',   label: 'Contact Phone',   description: 'Phone number of the contact', icon: <Phone className="w-3.5 h-3.5" /> },
  { value: 'contact.name',    label: 'Contact Name',    description: 'Full name of the contact',    icon: <User className="w-3.5 h-3.5" /> },
  { value: 'message.content', label: 'Message Content', description: 'Last message received',       icon: <MessageSquare className="w-3.5 h-3.5" /> },
];

// ── VariableInput ────────────────────────────────────────────────────────────

interface VariableInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options?: VariableOption[];
  multiline?: boolean;
  rows?: number;
}

function VariableInput({ value, onChange, placeholder, options = ALL_VARIABLES, multiline = false, rows = 3 }: VariableInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState(0);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.value.toLowerCase().includes(search.toLowerCase())
  );

  const insert = (variable: string) => {
    const tag = `{{${variable}}}`;
    const before = value.substring(0, cursor);
    const after = value.substring(cursor);
    onChange(before + tag + after);
    setOpen(false);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const pos = cursor + tag.length;
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const trackCursor = (e: React.SyntheticEvent) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    setCursor(target.selectionStart || 0);
  };

  const sharedProps = {
    value,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onSelect: trackCursor,
    onClick: trackCursor,
    onKeyUp: trackCursor,
  };

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          rows={rows}
          {...sharedProps}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none pr-8 nodrag"
        />
      ) : (
        <input
          ref={inputRef as React.Ref<HTMLInputElement>}
          type="text"
          {...sharedProps}
          className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-8 nodrag"
        />
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 text-muted-foreground hover:text-violet-600 nodrag"
            tabIndex={-1}
          >
            <Variable className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" side="right" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar variable..."
              value={search}
              onValueChange={setSearch}
              className="h-8 text-xs"
            />
            <CommandList>
              <CommandEmpty className="text-xs py-2 px-3 text-muted-foreground">Sin resultados</CommandEmpty>
              <CommandGroup>
                {filtered.map(opt => (
                  <CommandItem
                    key={opt.value}
                    onSelect={() => insert(opt.value)}
                    className="text-xs cursor-pointer"
                  >
                    <span className="mr-2 text-muted-foreground">{opt.icon}</span>
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-muted-foreground text-[10px]">{opt.description}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AiCallNode({ data, isConnectable, id }: any) {
  const { t } = useTranslation();
  const { setNodes, getNodes } = useReactFlow();
  const { onDeleteNode } = useFlowContext();
  const [expanded, setExpanded] = useState(true);

  const { data: configRes } = useQuery({
    queryKey: ['/api/ai-calls/config'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/ai-calls/config');
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 60000,
  });
  const hasCredentials: boolean = configRes?.hasCredentials ?? false;
  const twlPhone: string = configRes?.data?.twlPhoneNumber ?? '';

  const updateData = useCallback(
    (updates: Record<string, any>) => {
      setNodes(nodes =>
        nodes.map(node =>
          node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
        )
      );
    },
    [id, setNodes]
  );

  // Supports new array format and legacy single-phone field
  const phoneEntries: PhoneEntry[] = useMemo(() => {
    if (data.phoneEntries && Array.isArray(data.phoneEntries) && data.phoneEntries.length > 0) {
      return data.phoneEntries;
    }
    return [{ id: 'entry_default', phone: data.phoneNumber ?? '', contactName: data.contactName ?? '' }];
  }, [data.phoneEntries, data.phoneNumber, data.contactName]);

  const customInstructions: string = data.customInstructions ?? '';

  const updateEntry = useCallback((entryId: string, field: 'phone' | 'contactName', value: string) => {
    const updated = phoneEntries.map(e => e.id === entryId ? { ...e, [field]: value } : e);
    updateData({ phoneEntries: updated });
  }, [phoneEntries, updateData]);

  const addEntry = useCallback(() => {
    updateData({ phoneEntries: [...phoneEntries, { id: `entry_${Date.now()}`, phone: '', contactName: '' }] });
  }, [phoneEntries, updateData]);

  const removeEntry = useCallback((entryId: string) => {
    if (phoneEntries.length <= 1) return;
    updateData({ phoneEntries: phoneEntries.filter(e => e.id !== entryId) });
  }, [phoneEntries, updateData]);

  const handleDuplicate = () => {
    const nodes = getNodes();
    const current = nodes.find(n => n.id === id);
    if (!current) return;
    setNodes(prev => [...prev, {
      ...current,
      id: `ai_call_${Date.now()}`,
      position: { x: current.position.x + 20, y: current.position.y + 20 },
      data: { ...current.data },
      selected: false,
    }]);
  };

  const configuredCount = phoneEntries.filter(e => e.phone.trim()).length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm w-72 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-indigo-100 flex items-center justify-center">
            <PhoneCall className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <span className="text-xs font-semibold text-indigo-800">Llamada IA</span>
          {twlPhone && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-indigo-600 border-indigo-200 font-mono">
              {twlPhone}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 nodrag" onClick={handleDuplicate}>
                  <Copy className="h-3 w-3 text-gray-400 hover:text-indigo-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Duplicar nodo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 nodrag" onClick={() => onDeleteNode(id)}>
                  <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Eliminar nodo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button className="nodrag text-gray-400 hover:text-gray-600" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* No credentials warning */}
      {!hasCredentials && (
        <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-700 leading-tight">
            El administrador debe configurar las credenciales de Twilio y OpenAI antes de poder hacer llamadas.
          </p>
        </div>
      )}

      {/* Body */}
      {expanded && (
        <div className="px-3 pt-2 pb-3 space-y-3">

          {/* Phone entries */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-600 mb-2 block">
              Números a llamar <span className="text-red-500">*</span>
              {phoneEntries.length > 1 && (
                <span className="ml-1.5 text-[10px] font-normal text-indigo-600">
                  · {phoneEntries.length} llamadas en paralelo
                </span>
              )}
            </Label>

            <div className="space-y-2">
              {phoneEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                      #{idx + 1}
                    </span>
                    {phoneEntries.length > 1 && (
                      <button
                        className="nodrag text-gray-300 hover:text-red-400 transition-colors"
                        onClick={() => removeEntry(entry.id)}
                        title="Eliminar"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <VariableInput
                    value={entry.phone}
                    onChange={v => updateEntry(entry.id, 'phone', v)}
                    placeholder="+52XXXXXXXXXX  o  {{contact.phone}}"
                    options={PHONE_VARIABLES}
                  />

                  <VariableInput
                    value={entry.contactName}
                    onChange={v => updateEntry(entry.id, 'contactName', v)}
                    placeholder="Nombre (ej. {{contact.name}})"
                    options={PHONE_VARIABLES}
                  />
                </div>
              ))}
            </div>

            <button
              className="nodrag mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-indigo-300 py-1.5 text-[11px] font-medium text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              onClick={addEntry}
            >
              <Plus className="h-3 w-3" />
              Agregar número
            </button>
          </div>

          {/* Global custom instructions */}
          <div>
            <Label className="text-[11px] font-semibold text-gray-600 mb-1 block">
              Instrucciones específicas{' '}
              <span className="text-gray-400 font-normal">
                (opcional{phoneEntries.length > 1 ? ' · aplica a todas' : ''})
              </span>
            </Label>
            <VariableInput
              value={customInstructions}
              onChange={v => updateData({ customInstructions: v })}
              placeholder="Ej: Este contacto ya revisó la propuesta. Habla sobre los términos de pago."
              multiline
              rows={3}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">
              Se añaden al prompt base configurado en el asistente.
            </p>
          </div>

          {/* Summary */}
          {configuredCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-2.5 py-1.5">
              <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
              <span className="text-[10px] text-green-700 font-medium">
                {configuredCount === 1
                  ? `Llamará a: ${phoneEntries[0].phone}`
                  : `Iniciará ${configuredCount} llamadas en paralelo`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Collapsed summary */}
      {!expanded && (
        <div className="px-3 py-2 text-[11px] text-gray-500">
          {configuredCount === 0
            ? <span className="italic text-gray-400">Sin números configurados</span>
            : configuredCount === 1
              ? <span className="font-mono text-indigo-700">{phoneEntries[0].phone}</span>
              : <span className="text-indigo-700 font-medium">{configuredCount} llamadas en paralelo</span>}
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={standardHandleStyle}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={standardHandleStyle}
      />
    </div>
  );
}
