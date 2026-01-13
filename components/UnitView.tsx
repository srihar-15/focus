
import React from 'react';
import { Unit, LearningConcept, LCStatus } from '../types';
import { ArrowLeft, CheckCircle2, Clock, Plus, ArrowRight } from 'lucide-react';

interface UnitViewProps {
  unit: Unit;
  lcs: LearningConcept[];
  onBack: () => void;
  onSelectLC: (lcId: string) => void;
}

const UnitView: React.FC<UnitViewProps> = ({ unit, lcs, onBack, onSelectLC }) => {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Back to Curriculum
          </button>
          <h2 className="text-3xl font-bold text-gray-900">{unit.title}</h2>
          <p className="text-gray-500 mt-1">Select a concept to start studying or upload materials.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {lcs.map((lc) => (
          <button
            key={lc.id}
            onClick={() => onSelectLC(lc.id)}
            className={`
              relative p-6 rounded-2xl border text-left flex flex-col justify-between h-48 transition-all group
              ${lc.status === LCStatus.NOT_UPLOADED ? 'border-dashed border-gray-200 hover:border-indigo-300' : 'border-gray-100 bg-white hover:shadow-lg'}
            `}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className={`
                  px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                  ${lc.status === LCStatus.NOT_UPLOADED ? 'bg-gray-100 text-gray-400' : 
                    lc.status === LCStatus.UPLOADED ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}
                `}>
                  {lc.status.replace('_', ' ')}
                </span>
                
                {lc.status === LCStatus.UPLOADED && <CheckCircle2 className="text-emerald-500" size={18} />}
                {lc.status === LCStatus.NEEDS_REVISION && <Clock className="text-amber-500" size={18} />}
                {lc.status === LCStatus.NOT_UPLOADED && <Plus className="text-gray-300 group-hover:text-indigo-400 transition-colors" size={18} />}
              </div>
              <h4 className="text-lg font-bold text-gray-900 line-clamp-2">{lc.title}</h4>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {lc.revisionCount > 0 ? `${lc.revisionCount} revisions` : 'No revisions yet'}
              </span>
              <ArrowRight className="text-gray-300 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all" size={16} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UnitView;
