import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  AlertTriangle,
  HelpCircle,
  Trash2,
  Lock,
} from 'lucide-react';
import { ChatMessage, DerivedValues } from '../types';
import { formatKobo } from '../utils/calculations';

interface ConversationLayerProps {
  derived: DerivedValues;
  onSendMessage: (text: string) => Promise<{ reply: string; is_escalation?: boolean }>;
  onOpenMemory: () => void;
}

export const ConversationLayer = ({
  derived,
  onSendMessage,
  onOpenMemory,
}: ConversationLayerProps) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content:
        `Hello! I am Ramine, your salary cash flow planning companion.\n\n` +
        `All calculations are computed deterministically in application code with kobo precision. Your current baseline realised income is **${formatKobo(derived.realised_income)}**, your typical monthly cost is **${formatKobo(derived.cost_typical)}**, and your commitment headroom is **${formatKobo(derived.commitment_headroom)}**.\n\n` +
        `How can I help you plan your cash flow today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await onSendMessage(text);
      const assistantMsg: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        is_escalation: response.is_escalation,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);
    } catch {
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: 'I had trouble connecting to the conversation engine. All your numbers remain safe in application code.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setIsLoading(false);
    }
  };

  const sampleQueries = [
    {
      label: 'Investment check',
      query: 'Should I buy treasury bills or mutual funds with my extra ₦50,000?',
    },
    {
      label: 'Memory explanation',
      query: 'Why do you think my buffer is ₦900,000?',
    },
    {
      label: 'Headroom status',
      query: 'How much headroom do I have after all my fixed commitments?',
    },
    {
      label: 'Forget command',
      query: 'Forget that',
    },
    {
      label: 'Crisis escalation test',
      query: 'I am drowning in debt from loan apps and loan sharks',
    },
  ];

  return (
    <div id="conversation-layer-container" className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Ramine Assistant
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic kobo precision • Hard safety guard rails • Strict refusal of investment advice
            </p>
          </div>
        </div>

        <button
          onClick={onOpenMemory}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold shadow-2xs transition cursor-pointer self-start sm:self-auto"
        >
          View Stored Facts & Origins
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="text-slate-400 shrink-0 font-bold uppercase text-[10px]">Test queries:</span>
        {sampleQueries.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleSend(sq.query)}
            className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium whitespace-nowrap transition cursor-pointer border border-slate-200 shadow-2xs text-xs"
          >
            {sq.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Window */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 h-[460px] flex flex-col justify-between shadow-sm">
        <div className="overflow-y-auto pr-2 space-y-3.5 flex-1">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 text-xs ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div
                    className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white ${m.is_escalation ? 'bg-rose-600' : 'bg-blue-600'}`}
                  >
                    {m.is_escalation ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <Bot className="w-3.5 h-3.5" />
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                      : m.is_escalation
                        ? 'bg-rose-50 border border-rose-200 text-rose-950 font-medium rounded-bl-xs shadow-xs'
                        : 'bg-slate-50 text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-2xs'
                  }`}
                >
                  {m.content}
                  <div
                    className={`text-[10px] mt-1.5 text-right ${isUser ? 'text-blue-100' : 'text-slate-400'}`}
                  >
                    {m.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white shrink-0 flex items-center justify-center">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 text-xs items-center text-slate-500">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white shrink-0 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-2.5 text-slate-600 italic border border-slate-200">
                Ramine is evaluating your cash flow numbers...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="pt-3 border-t border-slate-100 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask Ramine about your surplus, headroom, buffer, or say 'Forget that'..."
            className="flex-1 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-blue-600 bg-slate-50/50 focus:bg-white text-slate-900"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="px-4 py-2.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
