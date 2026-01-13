
import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  BrainCircuit, 
  User, 
  Bot,
  Loader2,
  ChevronDown,
  Minimize2
} from 'lucide-react';
import { aiService, ChatMessage } from '../services/aiService';

interface AIAssistantProps {
  context?: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Hello! I'm your FocusStudy tutor. How can I help you master your curriculum today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      let fullResponse = "";
      const assistantMessageIndex = messages.length + 1;
      
      // Initialize assistant message
      setMessages(prev => [...prev, { role: 'model', content: '' }]);

      for await (const chunk of aiService.streamStudyHelp(userMessage, context)) {
        fullResponse += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[assistantMessageIndex] = { role: 'model', content: fullResponse };
          return updated;
        });
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I had trouble processing that request." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50 group"
      >
        <Sparkles className="group-hover:rotate-12 transition-transform" />
        <span className="absolute right-16 bg-white text-indigo-600 px-3 py-1 rounded-lg text-sm font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-indigo-50">
          Ask Tutor
        </span>
      </button>
    );
  }

  return (
    <div className={`
      fixed bottom-6 right-6 w-full max-w-[400px] bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col border border-gray-100 transition-all
      ${isMinimized ? 'h-16' : 'h-[600px]'}
    `}>
      {/* Header */}
      <header className="bg-indigo-600 px-6 py-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <BrainCircuit size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm">FocusStudy AI</h3>
            <p className="text-[10px] opacity-80 font-medium">Powered by Gemini 3 Pro</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            {isMinimized ? <ChevronDown size={18} /> : <Minimize2 size={18} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
      </header>

      {!isMinimized && (
        <>
          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-gray-100 text-gray-400'}`}>
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div className={`
                    p-4 rounded-2xl text-sm leading-relaxed
                    ${msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-sm'}
                  `}>
                    {msg.content || (isLoading && i === messages.length - 1 ? (
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    ) : null)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white">
            <div className="relative">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your units..."
                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                disabled={isLoading}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2">
               <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider flex items-center gap-1">
                 <BrainCircuit size={10} /> Deep Reasoning Enabled
               </span>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default AIAssistant;
