"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bot, Loader2, Lock, Send, User, X } from "lucide-react";
import { toast } from "sonner";

type Message = {
  role: "user" | "model";
  text: string;
};

export default function GlobalSupportWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [ticketLoading, setTicketLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Hi there. I am Phish-Slayer AI Support. Ask me anything about scans, alerts, Sigma rules, CTEM, or SOC workflows.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const navigateToAuditLogs = useCallback(() => {
    setIsOpen(false);
    router.push("/dashboard/audit-logs");
  }, [router]);

  const openPriorityTicket = useCallback(() => {
    setIsTicketOpen(true);
  }, []);

  const submitTicket = useCallback(async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error("Subject and description are required");
      return;
    }

    setTicketLoading(true);

    try {
      const response = await fetch("/api/support/ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to create support ticket");
      }

      toast.success("Priority ticket created");
      setSubject("");
      setDescription("");
      setIsTicketOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong, try again");
    } finally {
      setTicketLoading(false);
    }
  }, [description, subject]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) {
      return;
    }

    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userText }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Something went wrong, try again");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: payload.message || "I couldn't process that. Try again.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Something went wrong, try again",
        },
      ]);
      console.error("Support chat error", error);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const liquidGlass =
    "bg-slate-900/90 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]";

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{
          scale: 1,
          boxShadow: [
            "0 0 0 0 rgba(45,212,191,0)",
            "0 0 0 10px rgba(45,212,191,0.1)",
            "0 0 0 0 rgba(45,212,191,0)",
          ],
        }}
        transition={{
          scale: { duration: 0.3 },
          boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-8 right-8 z-[100] w-14 h-14 rounded-full flex items-center justify-center text-white ${liquidGlass}`}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Bot className="w-6 h-6 text-[#2DD4BF]" />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed bottom-28 right-8 z-[100] w-[400px] h-[600px] max-h-[80vh] flex flex-col rounded-2xl overflow-hidden font-inter ${liquidGlass}`}
          >
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

            <div className="grid grid-cols-2 gap-2 p-4 border-b border-white/10">
              <button
                type="button"
                onClick={openPriorityTicket}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors"
              >
                Open Priority Ticket
              </button>
              <button
                type="button"
                onClick={navigateToAuditLogs}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors"
              >
                View Audit Logs
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === "user" ? "bg-white/10" : "bg-[#2DD4BF]/20"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-[#2DD4BF]" />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-white/5 text-white border border-white/20 rounded-tr-sm"
                        : "bg-white/5 text-white border border-[#2DD4BF]/50 shadow-[0_0_10px_rgba(45,212,191,0.2)] rounded-tl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading ? (
                <div className="flex gap-3 flex-row">
                  <div className="w-8 h-8 rounded-full bg-[#2DD4BF]/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-[#2DD4BF]" />
                  </div>
                  <div className="max-w-[75%] rounded-2xl px-4 py-2 text-sm bg-white/5 text-white border border-[#2DD4BF]/50 shadow-[0_0_10px_rgba(45,212,191,0.2)] rounded-tl-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2DD4BF]" />
                    Assistant is typing...
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className={`p-4 border-t border-white/10 ${liquidGlass}`}>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask support..."
                  className="flex-1 bg-slate-950 border border-white/20 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#2DD4BF] transition-colors"
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

      <AnimatePresence>
        {isTicketOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => {
              if (!ticketLoading) {
                setIsTicketOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-lg rounded-2xl bg-slate-950 border border-slate-800 shadow-[0_0_40px_rgba(20,184,166,0.15)] p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-xl font-bold">Open Priority Ticket</h3>
                <button
                  type="button"
                  onClick={() => setIsTicketOpen(false)}
                  disabled={ticketLoading}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Subject</label>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Incident summary"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Description</label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={6}
                    placeholder="Describe the issue in detail"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => void submitTicket()}
                  disabled={ticketLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-black hover:from-teal-400 hover:to-cyan-400 hover:shadow-[0_0_20px_rgba(20,184,166,0.4)] transition-all duration-200 disabled:opacity-60"
                >
                  {ticketLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Submit Ticket
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
