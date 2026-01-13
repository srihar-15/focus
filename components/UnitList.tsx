
import React from 'react';
import { Unit, LearningConcept, LCStatus } from '../types';
import { ChevronRight, Layers, FileCheck, AlertCircle } from 'lucide-react';

interface UnitListProps {
  units: Unit[];
  lcs: LearningConcept[];
  onSelectUnit: (unitId: string) => void;
}

const UnitList: React.FC<UnitListProps> = ({ units, lcs, onSelectUnit }) => {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-2xl font-bold text-gray-900">Curriculum</h2>
        <p className="text-gray-500">Explore and manage your 5 core units.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {units.map((unit) => {
          const unitLCs = lcs.filter(lc => lc.unitId === unit.id);
          const uploadedCount = unitLCs.filter(lc => lc.status !== LCStatus.NOT_UPLOADED).length;
          const revisionNeededCount = unitLCs.filter(lc => lc.status === LCStatus.NEEDS_REVISION).length;
          const progress = (uploadedCount / unitLCs.length) * 100;

          return (
            <button
              key={unit.id}
              onClick={() => onSelectUnit(unit.id)}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all text-left group flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <span className="text-xl font-bold font-mono">{unit.order}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{unit.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Layers size={14} />
                      {unitLCs.length} Concepts
                    </span>
                    <span className="flex items-center gap-1">
                      <FileCheck size={14} className={uploadedCount > 0 ? 'text-indigo-500' : ''} />
                      {uploadedCount} Uploaded
                    </span>
                    {revisionNeededCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                        <AlertCircle size={14} />
                        {revisionNeededCount} Revision Needed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden md:block w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default UnitList;
