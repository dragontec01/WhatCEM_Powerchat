import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Eye,
  Check,
  X,
  Edit3,
  Wand2,
  ArrowRight,
  Settings,
  Info,
  AlertCircle,
  Sparkles,
  Play,
  Save,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FlowSuggestion {
  id: string;
  title: string;
  description: string;
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    data: any;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
  }>;
  confidence: number;
  reasoning: string;
}

interface FlowPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: FlowSuggestion | null;
  onApprove: (suggestion: FlowSuggestion) => void;
  onReject: () => void;
  onModify?: (modifiedSuggestion: FlowSuggestion) => void;
}

export function FlowPreviewModal({
  isOpen,
  onClose,
  suggestion,
  onApprove,
  onReject,
  onModify
}: FlowPreviewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSuggestion, setEditedSuggestion] = useState<FlowSuggestion | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { toast } = useToast();


  React.useEffect(() => {
    if (suggestion) {
      setEditedSuggestion({ ...suggestion });
      setSelectedNodeId(null);
    }
  }, [suggestion]);

  const currentSuggestion = isEditing ? editedSuggestion : suggestion;

  const nodeStats = useMemo(() => {
    if (!currentSuggestion) return { total: 0, byType: {} };

    const byType: { [key: string]: number } = {};
    currentSuggestion.nodes.forEach(node => {
      byType[node.type] = (byType[node.type] || 0) + 1;
    });

    return {
      total: currentSuggestion.nodes.length,
      byType
    };
  }, [currentSuggestion]);

  const selectedNode = useMemo(() => {
    if (!currentSuggestion || !selectedNodeId) return null;
    return currentSuggestion.nodes.find(node => node.id === selectedNodeId) || null;
  }, [currentSuggestion, selectedNodeId]);

  const handleApprove = () => {
    if (currentSuggestion) {
      onApprove(currentSuggestion);
      toast({
        title: "Flow Applied",
        description: `Successfully applied "${currentSuggestion.title}" to your flow builder.`,
      });
      onClose();
    }
  };

  const handleReject = () => {
    onReject();
    toast({
      title: "Flow Rejected",
      description: "The AI-generated flow has been rejected.",
    });
    onClose();
  };

  const handleSaveModifications = () => {
    if (editedSuggestion && onModify) {
      onModify(editedSuggestion);
      setIsEditing(false);
      toast({
        title: "Modifications Saved",
        description: "Your changes have been saved to the flow suggestion.",
      });
    }
  };

  const handleCancelEditing = () => {
    setEditedSuggestion(suggestion ? { ...suggestion } : null);
    setIsEditing(false);
    setSelectedNodeId(null);
  };

  const updateNodeData = (nodeId: string, updates: any) => {
    if (!editedSuggestion) return;

    const updatedNodes = editedSuggestion.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: { ...node.data, ...updates }
        };
      }
      return node;
    });

    setEditedSuggestion({
      ...editedSuggestion,
      nodes: updatedNodes
    });
  };

  const getNodeTypeColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      trigger: 'bg-green-100 text-green-800',
      message: 'bg-blue-100 text-blue-800',
      quickreply: 'bg-purple-100 text-purple-800',
      condition: 'bg-yellow-100 text-yellow-800',
      ai_assistant: 'bg-pink-100 text-pink-800',
      data_capture: 'bg-orange-100 text-orange-800',
      webhook: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getNodeTypeIcon = (type: string): React.ReactNode => {
    const icons: { [key: string]: React.ReactNode } = {
      trigger: <Play className="h-3 w-3" />,
      message: <Info className="h-3 w-3" />,
      quickreply: <Settings className="h-3 w-3" />,
      condition: <ArrowRight className="h-3 w-3" />,
      ai_assistant: <Sparkles className="h-3 w-3" />,
      data_capture: <Save className="h-3 w-3" />,
      webhook: <RefreshCw className="h-3 w-3" />
    };
    return icons[type] || <Settings className="h-3 w-3" />;
  };

  if (!currentSuggestion) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600">
                <Wand2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">{currentSuggestion.title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {currentSuggestion.description}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {Math.round(currentSuggestion.confidence * 100)}% match
              </Badge>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex gap-6 h-[60vh]">
          {/* Left Panel - Flow Overview */}
          <div className="flex-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Flow Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{nodeStats.total}</div>
                    <div className="text-muted-foreground">Total Nodes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{currentSuggestion.edges.length}</div>
                    <div className="text-muted-foreground">Connections</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{Object.keys(nodeStats.byType).length}</div>
                    <div className="text-muted-foreground">Node Types</div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Node Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(nodeStats.byType).map(([type, count]) => (
                      <Badge key={type} variant="outline" className={getNodeTypeColor(type)}>
                        {getNodeTypeIcon(type)}
                        <span className="ml-1">{type} ({count})</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">AI Reasoning</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentSuggestion.reasoning}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Node List */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Flow Nodes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-64">
                  <div className="space-y-2 p-4">
                    {currentSuggestion.nodes.map((node, index) => (
                      <motion.div
                        key={node.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedNodeId === node.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-border hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                        onClick={() => setSelectedNodeId(node.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getNodeTypeColor(node.type)}>
                              {getNodeTypeIcon(node.type)}
                              <span className="ml-1">{node.type}</span>
                            </Badge>
                            <span className="font-medium text-sm">{node.label}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            #{index + 1}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Node Details/Editor */}
          <div className="w-80">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {selectedNode ? 'Node Configuration' : 'Select a Node'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedNode ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-medium">Node Type</Label>
                        <Badge variant="outline" className={`mt-1 ${getNodeTypeColor(selectedNode.type)}`}>
                          {getNodeTypeIcon(selectedNode.type)}
                          <span className="ml-1">{selectedNode.type}</span>
                        </Badge>
                      </div>

                      <div>
                        <Label htmlFor="node-label" className="text-xs font-medium">Label</Label>
                        <Input
                          id="node-label"
                          value={selectedNode.label}
                          onChange={(e) => {
                            if (isEditing) {
                              updateNodeData(selectedNode.id, { label: e.target.value });
                            }
                          }}
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>

                      {selectedNode.data?.content && (
                        <div>
                          <Label htmlFor="node-content" className="text-xs font-medium">Content</Label>
                          <Textarea
                            id="node-content"
                            value={selectedNode.data.content}
                            onChange={(e) => {
                              if (isEditing) {
                                updateNodeData(selectedNode.id, { content: e.target.value });
                              }
                            }}
                            disabled={!isEditing}
                            rows={4}
                            className="mt-1"
                          />
                        </div>
                      )}

                      {selectedNode.data?.options && (
                        <div>
                          <Label className="text-xs font-medium">Quick Reply Options</Label>
                          <div className="mt-2 space-y-2">
                            {selectedNode.data.options.map((option: any, index: number) => (
                              <div key={index} className="p-2 bg-muted rounded text-sm">
                                <div className="font-medium">{option.text}</div>
                                <div className="text-xs text-muted-foreground">Value: {option.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-xs font-medium">Position</Label>
                        <div className="mt-1 text-sm text-muted-foreground">
                          X: {selectedNode.position.x}, Y: {selectedNode.position.y}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-96 text-muted-foreground">
                    <div className="text-center">
                      <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Select a node to view its configuration</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEditing}>
                  Cancel
                </Button>
                <Button onClick={handleSaveModifications}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleReject}>
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button onClick={handleApprove} className="bg-gradient-to-r from-purple-600 to-blue-600">
                  <Check className="h-4 w-4 mr-1" />
                  Apply Flow
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
