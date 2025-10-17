import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import KanbanBoard from '@/components/pipeline/KanbanBoard';
import AddDealModal from '@/components/pipeline/AddDealModal';
import PipelineSearchBar from '@/components/pipeline/PipelineSearchBar';

export default function PipelineView() {
  const { user, isLoading } = useAuth();
  const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  const handleSearchChange = (searchTerm: string) => {
    setSearchTerm(searchTerm);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden font-sans text-gray-800">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            {/* Pipeline Header with Search */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-semibold text-gray-900 flex-shrink-0">Pipeline</h1>
                <PipelineSearchBar 
                  onSearchChange={handleSearchChange}
                  initialValue={searchTerm}
                  className="w-[550px]"
                />
              </div>
            </div>

            <KanbanBoard
              onAddDeal={() => setIsAddDealModalOpen(true)}
              searchTerm={searchTerm}
            />
            
            <AddDealModal
              isOpen={isAddDealModalOpen}
              onClose={() => setIsAddDealModalOpen(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}