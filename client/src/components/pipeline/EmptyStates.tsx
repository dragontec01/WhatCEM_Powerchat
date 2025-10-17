import { PlusCircle, Search, Filter, FileSpreadsheet, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyPipelineStateProps {
  onAddDeal: () => void;
  onAddStage: () => void;
}

export function EmptyPipelineState({ onAddDeal, onAddStage }: EmptyPipelineStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-96 p-8 text-center bg-gradient-to-b from-gray-50 to-white rounded-lg border-2 border-dashed border-gray-200">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <PlusCircle className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to your Pipeline!</h3>
      <p className="text-gray-600 mb-6 max-w-md">
        Get started by creating your first pipeline stage, then add deals to track your sales opportunities.
      </p>
      <div className="flex gap-3">
        <Button onClick={onAddStage} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Create First Stage
        </Button>
        <Button variant="outline" onClick={onAddDeal} className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Add Deal
        </Button>
      </div>
    </div>
  );
}

interface EmptyDealsStateProps {
  onAddDeal: () => void;
  hasFilter: boolean;
  onClearFilters: () => void;
}

export function EmptyDealsState({ onAddDeal, hasFilter, onClearFilters }: EmptyDealsStateProps) {
  if (hasFilter) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Search className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No deals found</h3>
        <p className="text-gray-600 mb-4">
          Try adjusting your search criteria or filters to find what you're looking for.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClearFilters} className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Clear Filters
          </Button>
          <Button onClick={onAddDeal} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Deal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <PlusCircle className="h-6 w-6 text-blue-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No deals yet</h3>
      <p className="text-gray-600 mb-4">
        Start building your pipeline by adding your first deal.
      </p>
      <Button onClick={onAddDeal} className="flex items-center gap-2">
        <PlusCircle className="h-4 w-4" />
        Add Your First Deal
      </Button>
    </div>
  );
}

interface EmptyStageStateProps {
  stageName: string;
  onAddDeal: () => void;
}

export function EmptyStageState({ stageName, onAddDeal }: EmptyStageStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-32 p-4 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mb-2">
        <PlusCircle className="h-4 w-4 text-gray-500" />
      </div>
      <p className="text-sm text-gray-600 mb-2">No deals in {stageName}</p>
      <Button size="sm" variant="ghost" onClick={onAddDeal} className="text-xs">
        Add Deal
      </Button>
    </div>
  );
}
