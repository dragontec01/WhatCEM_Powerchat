import { useState, useEffect, useRef } from 'react';
import { Search, X, Command } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';

interface PipelineSearchBarProps {
  onSearchChange: (searchTerm: string) => void;
  initialValue?: string;
  className?: string;
}

export default function PipelineSearchBar({ 
  onSearchChange, 
  initialValue = '', 
  className = '' 
}: PipelineSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const inputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    onSearchChange(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearchChange]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {

      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        inputRef.current?.focus();
      }
      

      if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        setSearchTerm('');
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const showClearButton = searchTerm.length > 0;

  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="relative flex-1 max-w-2xl">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search by deal title, contact name, phone, tags, description... (Ctrl+F)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-12 h-9 text-sm border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
          {showClearButton && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 w-7 p-0 hover:bg-gray-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Keyboard shortcut hint */}
      <div className="hidden md:flex items-center ml-2 text-xs text-gray-400">
        <Command className="h-3 w-3 mr-1" />
        <span>F</span>
      </div>
    </div>
  );
}
