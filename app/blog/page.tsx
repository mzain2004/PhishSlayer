"use client";

import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

const BLOG_POSTS = [
  {
    category: "Tutorial",
    title: "How We Built a 3-Gate Threat Scan Pipeline in Next.js",
    readTime: "8 min read",
    date: "Mar 15, 2026",
    color: "text-[#2DD4BF]",
    bg: "bg-[#2DD4BF]/10",
  },
  {
    category: "Research",
    title: "Why Static Detection Is Losing to AI-Generated Malware",
    readTime: "12 min read",
    date: "Mar 02, 2026",
    color: "text-[#F85149]",
    bg: "bg-[#F85149]/10",
  },
  {
    category: "Product",
    title: "Building a WebSocket EDR Agent From Scratch",
    readTime: "15 min read",
    date: "Feb 18, 2026",
    color: "text-[#A78BFA]",
    bg: "bg-[#A78BFA]/10",
  },
  {
    category: "Threat Report",
    title: "The Real Cost of Threat Intelligence in 2026",
    readTime: "6 min read",
    date: "Feb 05, 2026",
    color: "text-[#E3B341]",
    bg: "bg-[#E3B341]/10",
  }
];

export default function BlogPage() {
  return (
    <div className="bg-[#0D1117] text-[#E6EDF3] font-sans min-h-screen">
      <Header />
      
      <main className="pt-24 min-h-screen">
        {/* HERO */}
        <section className="py-24 border-b border-white/10">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} 
              className="text-4xl md:text-6xl font-black text-[#E6EDF3] tracking-tight mb-6"
            >
              Threat Intelligence Insights
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-[#8B949E] leading-relaxed"
            >
              Research, analysis, and field notes from building Phish-Slayer
            </motion.p>
          </div>
        </section>

        {/* ARTICLES */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8">
              {BLOG_POSTS.map((post, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="liquid-glass rounded-[12px] overflow-hidden group hover:border-[#2DD4BF]/50 transition-colors cursor-pointer flex flex-col"
                >
                  <div className="aspect-video bg-[#0D1117] relative border-b border-white/10 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:16px_16px] opacity-20" />
                    <div className={`w-32 h-32 blur-3xl rounded-full ${post.bg} absolute opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
                    <code className="text-[#30363D] font-black text-6xl rotate-12 group-hover:scale-110 transition-transform duration-500">&lt;SYS/&gt;</code>
                  </div>
                  
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm ${post.bg} ${post.color}`}>
                        {post.category}
                      </span>
                      <span className="text-xs text-[#8B949E] font-medium">{post.date}</span>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-[#E6EDF3] mb-4 group-hover:text-[#2DD4BF] transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    
                    <div className="mt-auto flex items-center gap-2 text-xs text-[#8B949E] font-medium pt-6 border-t border-white/10">
                      <Clock className="w-4 h-4" /> {post.readTime}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-16 text-center">
              <button className="bg-transparent border border-white/10 hover:bg-[#1C2128] text-[#E6EDF3] font-bold px-8 py-3 rounded-[8px] transition-colors">
                Load More Articles
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

