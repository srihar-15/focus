
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText 
} from 'lucide-react';
import { StudyStats, LCStatus, LearningConcept } from '../types';

interface DashboardProps {
  stats: StudyStats;
  recentLCs: LearningConcept[];
  onViewLC: (lcId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, recentLCs, onViewLC }) => {
  const chartData = [
    { name: 'Completed', value: stats.uploadedCount - stats.needsRevisionCount, color: '#4f46e5' },
    { name: 'Pending Revision', value: stats.needsRevisionCount, color: '#f59e0b' },
    { name: 'Remaining', value: stats.remainingCount, color: '#e5e7eb' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-gray-900">Study Overview</h2>
        <p className="text-gray-500">Track your progress and stay on top of your revision schedule.</p>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileText size={20} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.uploadedCount}</p>
          <p className="text-sm text-gray-500">Concepts Uploaded</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={20} />
            </div>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Action Needed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.needsRevisionCount}</p>
          <p className="text-sm text-gray-500">Awaiting Revision</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {Math.round((stats.uploadedCount / stats.totalLCs) * 100)}%
          </p>
          <p className="text-sm text-gray-500">Total Completion</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
              <AlertCircle size={20} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.remainingCount}</p>
          <p className="text-sm text-gray-500">Not Started</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Revision Progress</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Recently Viewed</h3>
          <div className="space-y-4">
            {recentLCs.length > 0 ? (
              recentLCs.map(lc => (
                <button
                  key={lc.id}
                  onClick={() => onViewLC(lc.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-gray-900 truncate">{lc.title}</p>
                    <p className="text-xs text-gray-500">Unit {lc.unitId.replace('u', '')}</p>
                  </div>
                  <div className={`
                    w-2 h-2 rounded-full flex-shrink-0
                    ${lc.status === LCStatus.UPLOADED ? 'bg-indigo-500' : 
                      lc.status === LCStatus.NEEDS_REVISION ? 'bg-amber-500' : 'bg-gray-300'}
                  `} />
                </button>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No active concepts yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
