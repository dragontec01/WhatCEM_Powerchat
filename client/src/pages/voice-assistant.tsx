import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Phone, PhoneCall, Clock, RefreshCw, X, ChevronRight, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const AVAILABLE_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'];

interface CallLog {
  id: number;
  phoneNumber: string;
  callSid: string;
  status: string;
  durationSeconds: number;
  transcript: string;
  summary: string;
  analysis: string;
  createdAt: string | null;
}

interface ScheduledCall {
  id: number;
  phoneNumber: string;
  contactName: string | null;
  customInstructions: string | null;
  scheduledFor: string | null;
  status: string;
  callSid: string | null;
  errorMessage: string | null;
  createdAt: string | null;
}

interface CallConfig {
  id: number;
  voiceModel: string;
  systemPrompt: string;
  greetingPrompt: string;
  twlPhoneNumber: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed:   { label: 'Completada',    className: 'bg-green-100 text-green-700 border-green-200' },
    busy:        { label: 'Ocupado',       className: 'bg-amber-100 text-amber-700 border-amber-200' },
    'no-answer': { label: 'Sin respuesta', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    no_answer:   { label: 'Sin respuesta', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    failed:      { label: 'Fallida',       className: 'bg-red-100 text-red-700 border-red-200' },
    initiated:   { label: 'Iniciando',     className: 'bg-gray-100 text-gray-600 border-gray-200' },
    'in-progress': { label: 'En curso',    className: 'bg-blue-100 text-blue-700 border-blue-200' },
    pending:     { label: 'Pendiente',     className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    called:      { label: 'Ejecutada',     className: 'bg-green-100 text-green-700 border-green-200' },
    cancelled:   { label: 'Cancelada',     className: 'bg-gray-100 text-gray-500 border-gray-200' },
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

  // Llamar ahora
  const [nowPhone, setNowPhone] = useState('');
  const [nowInstructions, setNowInstructions] = useState('');

  // Programar llamada
  const [schedPhone, setSchedPhone] = useState('');
  const [schedName, setSchedName] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedInstructions, setSchedInstructions] = useState('');

  // Configuración de voz (local edits)
  const [voice, setVoice] = useState('shimmer');
  const [systemMessage, setSystemMessage] = useState('');
  const [greetingPrompt, setGreetingPrompt] = useState('');

  // Detail modal
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);

  // Default datetime 1 min from now
  useEffect(() => {
    const dt = new Date(Date.now() + 60000);
    dt.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    setSchedTime(
      `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
    );
  }, []);

  // ── Queries ───────────────────────────────────────────────────

  // Config de la empresa (voice model + prompts + config_id)
  const { data: configRes, isLoading: loadingConfig } = useQuery({
    queryKey: ['/api/ai-calls/config'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/ai-calls/config');
      if (!res.ok) throw new Error('Error cargando configuración');
      return res.json();
    },
    retry: false,
  });

  const callConfig: CallConfig | null = configRes?.data ?? null;
  const hasCredentials: boolean = configRes?.hasCredentials ?? false;

  // Sync config into local form state
  useEffect(() => {
    if (callConfig) {
      setVoice(callConfig.voiceModel ?? 'shimmer');
      setSystemMessage(callConfig.systemPrompt ?? '');
      setGreetingPrompt(callConfig.greetingPrompt ?? '');
    }
  }, [callConfig]);

  // Historial de llamadas
  const { data: callLogsRes, isFetching: fetchingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['/api/ai-calls/call-logs'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/ai-calls/call-logs');
      if (!res.ok) throw new Error('Error cargando historial');
      return res.json();
    },
    retry: false,
    refetchInterval: 30000,
    enabled: hasCredentials,
  });
  const callLogs: CallLog[] = callLogsRes?.data ?? [];

  // Llamadas programadas
  const { data: scheduledRes, isFetching: fetchingScheduled, refetch: refetchScheduled } = useQuery({
    queryKey: ['/api/ai-calls/scheduled-calls', callConfig?.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/ai-calls/scheduled-calls/${callConfig!.id}`);
      if (!res.ok) throw new Error('Error cargando programadas');
      return res.json();
    },
    retry: false,
    refetchInterval: 30000,
    enabled: !!callConfig?.id,
  });
  const scheduledCalls: ScheduledCall[] = scheduledRes?.data ?? [];

  // ── Mutations ─────────────────────────────────────────────────

  const callNow = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/ai-calls/call', {
        phoneNumber: nowPhone,
        customInstructions: nowInstructions || null,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al iniciar llamada');
      return data;
    },
    onSuccess: (data) => {
      toast({ title: 'Llamada iniciada', description: `SID: ${data.data?.call_sid ?? '—'}` });
      setNowPhone('');
      setNowInstructions('');
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['/api/ai-calls/call-logs'] }), 3000);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const scheduleCall = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/ai-calls/scheduled-calls', {
        callConfigurationId: callConfig!.id,
        phoneNumber: schedPhone,
        contactName: schedName || null,
        scheduledFor: new Date(schedTime).toISOString(),
        customInstructions: schedInstructions || null,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al programar');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Llamada programada', description: `Para: ${schedTime.replace('T', ' ')}` });
      setSchedPhone('');
      setSchedName('');
      setSchedInstructions('');
      queryClient.invalidateQueries({ queryKey: ['/api/ai-calls/scheduled-calls', callConfig?.id] });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const saveConfig = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PATCH', '/api/ai-calls/config', {
        voiceModel: voice,
        systemPrompt: systemMessage,
        greetingPrompt: greetingPrompt,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Configuración guardada', description: 'Aplica desde la siguiente llamada.' });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-calls/config'] });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const cancelScheduled = useMutation({
    mutationFn: async (callSid: string) => {
      const res = await apiRequest('DELETE', `/api/ai-calls/scheduled-calls/${callSid}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al cancelar');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Llamada cancelada' });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-calls/scheduled-calls', callConfig?.id] });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const pendingScheduled = scheduledCalls.filter(s => s.status === 'pending' || s.status === 'failed');

  // ── Render ────────────────────────────────────────────────────
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
              <p className="text-xs text-gray-500">
                Voice AI · Gestión de llamadas salientes
                {callConfig?.twlPhoneNumber && (
                  <span className="ml-2 font-mono text-indigo-600">{callConfig.twlPhoneNumber}</span>
                )}
              </p>
            </div>
          </div>

          {/* No credentials warning */}
          {!loadingConfig && !hasCredentials && (
            <div className="mx-6 mt-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Credenciales no configuradas</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Tu administrador debe ingresar las credenciales de Twilio y OpenAI desde el panel de administración antes de poder hacer llamadas.
                </p>
              </div>
            </div>
          )}

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
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Instrucciones específicas <span className="text-gray-400 font-normal">(opcional)</span>
                    </Label>
                    <Textarea
                      className="mt-1 resize-none"
                      rows={2}
                      placeholder="Ej: Este cliente ya preguntó sobre el precio..."
                      value={nowInstructions}
                      onChange={e => setNowInstructions(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                    onClick={() => callNow.mutate()}
                    disabled={!nowPhone || callNow.isPending || !hasCredentials}
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
                      Instrucciones específicas <span className="text-gray-400 font-normal">(opcional)</span>
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
                    disabled={!schedPhone || !schedTime || scheduleCall.isPending || !hasCredentials || !callConfig?.id}
                  >
                    {scheduleCall.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Programar llamada
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Configuración de voz + Prompts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Configuración de voz y prompts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {loadingConfig ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuración...
                  </div>
                ) : (
                  <>
                    {/* Voz */}
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
                    </div>

                    {/* System message */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Mensaje del sistema (System Message)</Label>
                      <Textarea
                        className="mt-1 resize-y text-sm"
                        rows={5}
                        value={systemMessage}
                        onChange={e => setSystemMessage(e.target.value)}
                        placeholder="Eres un asistente de voz profesional..."
                        disabled={!hasCredentials}
                      />
                    </div>

                    {/* Greeting prompt */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Saludo inicial (Greeting Prompt)</Label>
                      <Textarea
                        className="mt-1 resize-y text-sm"
                        rows={6}
                        value={greetingPrompt}
                        onChange={e => setGreetingPrompt(e.target.value)}
                        placeholder="INICIO DE LLAMADA: ..."
                        disabled={!hasCredentials}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <Button
                        onClick={() => saveConfig.mutate()}
                        disabled={saveConfig.isPending || !hasCredentials}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {saveConfig.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Guardar configuración
                      </Button>
                      <span className="text-xs text-gray-400">Los cambios aplican desde la siguiente llamada.</span>
                    </div>
                  </>
                )}
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
                            {sc.contactName && <div className="font-semibold text-gray-900">{sc.contactName}</div>}
                            <div className="text-gray-600">{sc.phoneNumber}</div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{formatDate(sc.scheduledFor)}</TableCell>
                          <TableCell>
                            <StatusBadge status={sc.status} />
                            {sc.errorMessage && (
                              <div className="text-xs text-red-500 mt-1">{sc.errorMessage}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {sc.status === 'pending' && sc.callSid && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                                onClick={() => cancelScheduled.mutate(sc.callSid!)}
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
                          <TableCell className="text-sm font-medium text-gray-900">{log.phoneNumber || '-'}</TableCell>
                          <TableCell><StatusBadge status={log.status} /></TableCell>
                          <TableCell className="text-sm text-gray-600">{formatDuration(log.durationSeconds)}</TableCell>
                          <TableCell className="text-sm text-gray-600">{formatDate(log.createdAt)}</TableCell>
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
                <p className="text-sm text-gray-500">{selectedCall.phoneNumber} · {formatDate(selectedCall.createdAt)}</p>
              </div>
              <button onClick={() => setSelectedCall(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-5">
              <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                <StatusBadge status={selectedCall.status} />
                <span>Duración: <strong>{formatDuration(selectedCall.durationSeconds)}</strong></span>
                <span className="font-mono text-xs text-gray-400">{selectedCall.callSid}</span>
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
