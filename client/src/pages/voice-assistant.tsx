import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Phone, PhoneCall, Clock, RefreshCw, X, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const VOICE_BOT_URL = import.meta.env.VITE_VOICE_BOT_URL || 'http://localhost:5050';
const AVAILABLE_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'];

interface CallLog {
  id: number;
  phone_number: string;
  call_sid: string;
  status: string;
  duration_seconds: number;
  transcript: string;
  summary: string;
  analysis: string;
  created_at: string | null;
}

interface ScheduledCall {
  id: number;
  phone_number: string;
  contact_name: string | null;
  custom_instructions: string | null;
  scheduled_for: string | null;
  status: string;
  call_sid: string | null;
  error_message: string | null;
  created_at: string | null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed:  { label: 'Completada',    className: 'bg-green-100 text-green-700 border-green-200' },
    busy:       { label: 'Ocupado',       className: 'bg-amber-100 text-amber-700 border-amber-200' },
    no_answer:  { label: 'Sin respuesta', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    failed:     { label: 'Fallida',       className: 'bg-red-100 text-red-700 border-red-200' },
    initiated:  { label: 'Iniciando',     className: 'bg-gray-100 text-gray-600 border-gray-200' },
    pending:    { label: 'Pendiente',     className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    called:     { label: 'Ejecutada',     className: 'bg-green-100 text-green-700 border-green-200' },
    cancelled:  { label: 'Cancelada',     className: 'bg-gray-100 text-gray-500 border-gray-200' },
  };
  const c = config[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.className}`}>
      {c.label}
    </span>
  );
}

function formatDate(isoStr: string | null): string {
  if (!isoStr) return '-';
  try {
    return format(parseISO(isoStr), 'dd/MM/yyyy HH:mm', { locale: es });
  } catch {
    return isoStr;
  }
}

export default function VoiceAssistant() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state — Llamar ahora
  const [nowPhone, setNowPhone] = useState('');

  // Form state — Programar llamada
  const [schedPhone, setSchedPhone] = useState('');
  const [schedName, setSchedName] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedInstructions, setSchedInstructions] = useState('');

  // Form state — Configuración de voz
  const [voice, setVoice] = useState('shimmer');
  const [temperature, setTemperature] = useState(0.95);

  // Form state — Prompts
  const [systemMessage, setSystemMessage] = useState('');
  const [greetingPrompt, setGreetingPrompt] = useState('');

  // Detail modal
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);

  // Default datetime to 1 min from now
  useEffect(() => {
    const dt = new Date(Date.now() + 60000);
    dt.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    setSchedTime(
      `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
    );
  }, []);

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['voice-settings'],
    queryFn: async () => {
      const res = await fetch(`${VOICE_BOT_URL}/settings`);
      if (!res.ok) throw new Error('No se pudo conectar al servicio de voz');
      return res.json();
    },
    retry: false,
  });

  const { data: promptSettings } = useQuery({
    queryKey: ['voice-prompt-settings'],
    queryFn: async () => {
      const res = await fetch(`${VOICE_BOT_URL}/api/prompt-settings`);
      if (!res.ok) throw new Error('Error cargando prompts');
      return res.json();
    },
    retry: false,
  });

  const { data: callLogs = [], isFetching: fetchingLogs, refetch: refetchLogs } = useQuery<CallLog[]>({
    queryKey: ['voice-call-logs'],
    queryFn: async () => {
      const res = await fetch(`${VOICE_BOT_URL}/api/call-logs`);
      if (!res.ok) throw new Error('Error cargando historial');
      return res.json();
    },
    retry: false,
    refetchInterval: 30000,
  });

  const { data: scheduledCalls = [], isFetching: fetchingScheduled, refetch: refetchScheduled } = useQuery<ScheduledCall[]>({
    queryKey: ['voice-scheduled-calls'],
    queryFn: async () => {
      const res = await fetch(`${VOICE_BOT_URL}/api/scheduled-calls`);
      if (!res.ok) throw new Error('Error cargando programadas');
      return res.json();
    },
    retry: false,
    refetchInterval: 30000,
  });

  // Sync settings into form state when loaded
  useEffect(() => {
    if (settings) {
      setVoice(settings.voice ?? 'shimmer');
      setTemperature(settings.temperature ?? 0.95);
    }
  }, [settings]);

  useEffect(() => {
    if (promptSettings) {
      setSystemMessage(promptSettings.system_message ?? '');
      setGreetingPrompt(promptSettings.greeting_prompt ?? '');
    }
  }, [promptSettings]);

  // ── Mutations ─────────────────────────────────────────────────────────
  const callNow = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${VOICE_BOT_URL}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: nowPhone }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Error al iniciar llamada');
      return data;
    },
    onSuccess: (data) => {
      toast({ title: 'Llamada iniciada', description: `SID: ${data.sid}` });
      setNowPhone('');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['voice-call-logs'] });
      }, 3000);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const scheduleCall = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${VOICE_BOT_URL}/schedule-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: schedPhone,
          contact_name: schedName || undefined,
          scheduled_for: schedTime,
          custom_instructions: schedInstructions || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Error al programar');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Llamada programada', description: `Para: ${schedTime.replace('T', ' ')}` });
      setSchedPhone('');
      setSchedName('');
      setSchedInstructions('');
      queryClient.invalidateQueries({ queryKey: ['voice-scheduled-calls'] });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const saveVoiceSettings = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${VOICE_BOT_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice, temperature }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Error al guardar');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Configuración guardada' });
      queryClient.invalidateQueries({ queryKey: ['voice-settings'] });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const savePrompts = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${VOICE_BOT_URL}/prompt-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_message: systemMessage, greeting_prompt: greetingPrompt }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Error al guardar prompts');
      return data;
    },
    onSuccess: () => toast({ title: 'Prompts guardados', description: 'Aplican desde la siguiente llamada.' }),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const cancelScheduled = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${VOICE_BOT_URL}/scheduled-calls/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Error al cancelar');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Llamada cancelada' });
      queryClient.invalidateQueries({ queryKey: ['voice-scheduled-calls'] });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const pendingScheduled = scheduledCalls.filter(s => s.status === 'pending' || s.status === 'failed');

  return (
    <div className="h-screen flex flex-col overflow-hidden font-sans text-gray-800">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">

          {/* Page header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Phone className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">Asistente de Llamadas</h1>
              <p className="text-xs text-gray-500">Voice AI · Gestión de llamadas salientes</p>
            </div>
          </div>

          <div className="p-6 space-y-6">

            {/* Row 1: Llamar ahora + Programar llamada */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Llamar ahora */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <PhoneCall className="h-3.5 w-3.5" />
                    Llamar ahora
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Número de teléfono</Label>
                    <Input
                      className="mt-1"
                      placeholder="+52XXXXXXXXXX"
                      value={nowPhone}
                      onChange={e => setNowPhone(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                    onClick={() => callNow.mutate()}
                    disabled={!nowPhone || callNow.isPending}
                  >
                    {callNow.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PhoneCall className="h-4 w-4 mr-2" />}
                    Llamar ahora
                  </Button>
                  <p className="text-xs text-gray-400">
                    Formato internacional. Cuenta Trial: el número destino debe estar verificado en Twilio.
                  </p>
                </CardContent>
              </Card>

              {/* Programar llamada */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Programar llamada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Número de teléfono</Label>
                    <Input className="mt-1" placeholder="+52XXXXXXXXXX" value={schedPhone} onChange={e => setSchedPhone(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Nombre del contacto</Label>
                    <Input className="mt-1" placeholder="Ej: Mauricio" value={schedName} onChange={e => setSchedName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Fecha y hora</Label>
                    <Input className="mt-1" type="datetime-local" value={schedTime} onChange={e => setSchedTime(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Instrucciones específicas{' '}
                      <span className="text-gray-400 font-normal">(opcional)</span>
                    </Label>
                    <Textarea
                      className="mt-1 resize-none"
                      rows={3}
                      placeholder="Ej: Este cliente ya vio el desarrollo. Enfócate en resolver dudas sobre financiamiento..."
                      value={schedInstructions}
                      onChange={e => setSchedInstructions(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    onClick={() => scheduleCall.mutate()}
                    disabled={!schedPhone || !schedTime || scheduleCall.isPending}
                  >
                    {scheduleCall.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Programar llamada
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Configuración de voz */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Configuración de voz
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSettings ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuración...
                  </div>
                ) : (
                  <div className="flex flex-wrap items-end gap-6">
                    <div className="min-w-[200px]">
                      <Label className="text-sm font-medium text-gray-700">Voz del asistente</Label>
                      <Select value={voice} onValueChange={setVoice}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_VOICES.map(v => (
                            <SelectItem key={v} value={v}>
                              {v.charAt(0).toUpperCase() + v.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-[260px]">
                      <Label className="text-sm font-medium text-gray-700">
                        Temperatura:{' '}
                        <span className="font-bold">{temperature.toFixed(2)}</span>{' '}
                        <span className="text-gray-400 font-normal text-xs">(0.6 = precisa · 1.2 = creativa)</span>
                      </Label>
                      <input
                        type="range"
                        min={0.6}
                        max={1.2}
                        step={0.05}
                        value={temperature}
                        onChange={e => setTemperature(parseFloat(e.target.value))}
                        className="mt-2 w-full accent-indigo-600 h-2 cursor-pointer"
                      />
                    </div>
                    <Button
                      onClick={() => saveVoiceSettings.mutate()}
                      disabled={saveVoiceSettings.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {saveVoiceSettings.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Guardar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Editor de prompts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Editor de prompts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Mensaje del sistema (System Message)</Label>
                  <Textarea
                    className="mt-1 resize-y text-sm"
                    rows={5}
                    value={systemMessage}
                    onChange={e => setSystemMessage(e.target.value)}
                    placeholder="Eres un asistente de voz profesional..."
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Saludo inicial (Greeting Prompt)</Label>
                  <Textarea
                    className="mt-1 resize-y text-sm"
                    rows={6}
                    value={greetingPrompt}
                    onChange={e => setGreetingPrompt(e.target.value)}
                    placeholder="INICIO DE LLAMADA: ..."
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => savePrompts.mutate()}
                    disabled={savePrompts.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {savePrompts.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Guardar prompts
                  </Button>
                  <span className="text-xs text-gray-400">Los cambios aplican desde la siguiente llamada, sin reiniciar el servidor.</span>
                </div>
              </CardContent>
            </Card>

            {/* Llamadas programadas pendientes */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Llamadas programadas pendientes
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => refetchScheduled()} disabled={fetchingScheduled} className="text-indigo-600 hover:text-indigo-700 text-xs">
                    <RefreshCw className={`h-3 w-3 mr-1 ${fetchingScheduled ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs">Número</TableHead>
                      <TableHead className="text-xs">Fecha programada</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                      <TableHead className="text-xs"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingScheduled.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-gray-400 py-8">
                          Sin llamadas programadas pendientes
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingScheduled.map(sc => (
                        <TableRow key={sc.id}>
                          <TableCell className="text-sm">
                            {sc.contact_name && <div className="font-semibold text-gray-900">{sc.contact_name}</div>}
                            <div className="text-gray-600">{sc.phone_number}</div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{formatDate(sc.scheduled_for)}</TableCell>
                          <TableCell>
                            <StatusBadge status={sc.status} />
                            {sc.error_message && (
                              <div className="text-xs text-red-500 mt-1">{sc.error_message}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {sc.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                                onClick={() => cancelScheduled.mutate(sc.id)}
                                disabled={cancelScheduled.isPending}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancelar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Historial de llamadas */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Historial de llamadas
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => refetchLogs()} disabled={fetchingLogs} className="text-indigo-600 hover:text-indigo-700 text-xs">
                    <RefreshCw className={`h-3 w-3 mr-1 ${fetchingLogs ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs">Número</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                      <TableHead className="text-xs">Duración</TableHead>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-gray-400 py-8">
                          Sin llamadas registradas aún
                        </TableCell>
                      </TableRow>
                    ) : (
                      callLogs.map(log => (
                        <TableRow
                          key={log.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedCall(log)}
                        >
                          <TableCell className="text-sm font-medium text-gray-900">{log.phone_number || '-'}</TableCell>
                          <TableCell><StatusBadge status={log.status} /></TableCell>
                          <TableCell className="text-sm text-gray-600">{formatDuration(log.duration_seconds)}</TableCell>
                          <TableCell className="text-sm text-gray-600">{formatDate(log.created_at)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 text-xs">
                              Ver detalle <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>

      {/* Call detail modal */}
      {selectedCall && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedCall(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Detalle de llamada</h2>
                <p className="text-sm text-gray-500">{selectedCall.phone_number} · {formatDate(selectedCall.created_at)}</p>
              </div>
              <button onClick={() => setSelectedCall(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-5">
              <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                <StatusBadge status={selectedCall.status} />
                <span>Duración: <strong>{formatDuration(selectedCall.duration_seconds)}</strong></span>
                <span className="font-mono text-xs text-gray-400">{selectedCall.call_sid}</span>
              </div>

              {selectedCall.summary && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Resumen</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
                    {selectedCall.summary}
                  </div>
                </div>
              )}

              {selectedCall.analysis && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Análisis</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {selectedCall.analysis}
                  </div>
                </div>
              )}

              {selectedCall.transcript && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Transcripción</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line max-h-64 overflow-y-auto">
                    {selectedCall.transcript}
                  </div>
                </div>
              )}

              {!selectedCall.transcript && !selectedCall.summary && (
                <p className="text-sm text-gray-400 italic">Sin transcripción disponible — la llamada puede haber finalizado sin audio.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
