// FallbackLayout.jsx (Chat with Friends)
import { X, LayoutDashboard, Lightbulb, MessageCircleMore } from "lucide-react";
import Link from "next/link";

export default function FallbackLayout({ isSidebarOpen, setIsSidebarOpen }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F3EDE1] relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=swap');
        .serif { font-family: 'Fraunces', serif; }
        .nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:8px; font-size:0.875rem; color:#7A7568; text-decoration:none; transition:background .15s,color .15s; }
        .nav-item:hover { background:#EDE7DA; color:#1C1F1A; }
        .nav-item.active { background:#EDE7DA; color:#1C1F1A; font-weight:500; }
      `}</style>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-[rgba(28,31,26,0.3)] z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-60 bg-[#FDFAF5] border-r border-[#D6CFBF] z-50 flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[#D6CFBF] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md overflow-hidden border border-[#D6CFBF] flex-shrink-0">
              <img src="/chatterly_logo.png" alt="logo" className="w-full h-full object-cover" />
            </div>
            <span className="serif text-[1.05rem] text-[#1C1F1A]">ChatterlyAI</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#EDE7DA] transition-colors bg-transparent border-none cursor-pointer text-[#7A7568]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-0.5 flex-1">
          <p className="text-[0.62rem] font-medium tracking-[0.1em] uppercase text-[#C4BDB0] px-3 mb-2">Menu</p>
          <Link href="/dashboard" className="nav-item"><LayoutDashboard size={15} /> Dashboard</Link>
          <Link href="/ask-doubt" className="nav-item"><Lightbulb size={15} /> AI Chatbot</Link>
          <Link href="/chat"      className="nav-item active"><MessageCircleMore size={15} /> Chat with Friends</Link>
        </nav>

        {/* Shimmer */}
        <div className="px-5 pb-6 pt-2 border-t border-[#D6CFBF] flex-shrink-0">
          <div className="h-2.5 w-24 bg-[#E8E2D6] rounded animate-pulse mb-2" />
          <div className="h-2.5 w-16 bg-[#E8E2D6] rounded animate-pulse" />
        </div>
      </div>

      {/* Main shimmer */}
      <div className="lg:ml-60 flex flex-col flex-1">
        <div className="bg-[#F3EDE1]/90 border-b border-[#D6CFBF] px-5 py-3.5 flex items-center justify-between">
          <div className="h-5 w-36 bg-[#E8E2D6] rounded animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-[#E8E2D6] animate-pulse" />
        </div>
        <div className="flex-1 px-5 py-8 space-y-4 max-w-3xl">
          <div className="h-4 w-48 bg-[#E8E2D6] rounded animate-pulse" />
          <div className="h-4 w-full bg-[#E8E2D6] rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-[#E8E2D6] rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-[#E8E2D6] rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}