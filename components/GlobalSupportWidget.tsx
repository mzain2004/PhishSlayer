'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

type Message = {
  role: 'user' | 'model';
  text: string;
};

export default function GlobalSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hi there! I am the Phish-Slayer AI assistant. How can I help you secure your digital life today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // We need to keep a chat session reference to maintain history properly with the API
  const chatRef = useRef<any>(null);

  useEffect(() => {
    if (!chatRef.current) {
      chatRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: 'You are a helpful cybersecurity assistant for Phish-Slayer, an AI threat detection platform. You help users understand phishing, cybersecurity, and how Phish-Slayer protects them. Keep your answers concise, professional, and helpful.',
        }
      });
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      if (!chatRef.current) {
        chatRef.current = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
            systemInstruction: 'You are a helpful cybersecurity assistant for Phish-Slayer, an AI threat detection platform. You help users understand phishing, cybersecurity, and how Phish-Slayer protects them. Keep your answers concise, professional, and helpful.',
          }
        });
      }

      const response = await chatRef.current.sendMessage({ message: userText });
      
      setMessages(prev => [...prev, { role: 'model', text: response.text }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const liquidGlass = "bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]";

  return (
    <>
      {/* Global Support Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ 
          scale: 1,
          boxShadow: ["0 0 0 0 rgba(45,212,191,0)", "0 0 0 10px rgba(45,212,191,0.1)", "0 0 0 0 rgba(45,212,191,0)"]
        }}
        transition={{ 
          scale: { duration: 0.3 },
          boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-8 right-8 z-[100] w-14 h-14 rounded-full flex items-center justify-center text-white ${liquidGlass}`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6 text-[#2DD4BF]" />}
      </motion.button>

      {/* Support Popover Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed bottom-28 right-8 z-[100] w-[400px] h-[600px] max-h-[80vh] flex flex-col rounded-2xl overflow-hidden font-inter ${liquidGlass}`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b border-white/10 ${liquidGlass}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Phish-Slayer AI Support</h3>
                  <p className="text-xs text-[#2DD4BF]">Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 p-4 border-b border-white/10">
              <button className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors">
                Open Priority Ticket 🎫
              </button>
              <button className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors">
                View Audit Logs 📜
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-white/10' : 'bg-[#2DD4BF]/20'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-[#2DD4BF]" />}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-white/5 text-white border border-white/20 rounded-tr-sm' 
                      : 'bg-white/5 text-white border border-[#2DD4BF]/50 shadow-[0_0_10px_rgba(45,212,191,0.2)] rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 flex-row">
                  <div className="w-8 h-8 rounded-full bg-[#2DD4BF]/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-[#2DD4BF]" />
                  </div>
                  <div className="max-w-[75%] rounded-2xl px-4 py-2 text-sm bg-white/5 text-white border border-[#2DD4BF]/50 shadow-[0_0_10px_rgba(45,212,191,0.2)] rounded-tl-sm flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2DD4BF]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-4 border-t border-white/10 ${liquidGlass}`}>
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Gemini or describe your issue..."
                  className="flex-1 bg-black/50 border border-white/20 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#2DD4BF] transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-full bg-[#2DD4BF] text-black flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-[#14B8A6]"
                >
                  <Send className="w-4 h-4 ml-[-2px]" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
