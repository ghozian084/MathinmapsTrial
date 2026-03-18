import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

interface GuideBoxProps {
  title: string;
  children: React.ReactNode;
}

export default function GuideBox({ title, children }: GuideBoxProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left focus:outline-none hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-blue-900">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-blue-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-blue-600" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 text-sm text-blue-800 border-t border-blue-200/50 bg-blue-50/50">
          {children}
        </div>
      )}
    </div>
  );
}
