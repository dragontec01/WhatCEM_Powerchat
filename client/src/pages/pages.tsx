import React from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { PagesManagement } from '../components/pages/PagesManagement';

export default function PagesPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden font-sans text-gray-800">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-y-auto p-6">
          <PagesManagement />
        </div>
      </div>
    </div>
  );
}
