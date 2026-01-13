
import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  PlusCircle,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import AIAssistant from './AIAssistant';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string, params?: any) => void;
  onLogout: () => void;
  aiContext?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate, onLogout, aiContext }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'units', label: 'Curriculum', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 relative">
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-4 right-20 z-50 p-3 bg-indigo-600 text-white rounded-full shadow-lg"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="h-full flex flex-col">
          <div className="px-6 py-8">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-mono text-sm">F</span>
              FocusStudy
            </h1>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                  ${activePage === item.id 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>

      {/* Global AI Assistant */}
      <AIAssistant context={aiContext} />
    </div>
  );
};

export default Layout;
