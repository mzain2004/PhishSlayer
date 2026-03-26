export function CredibilityBar() {
  const techs = [
    { 
      name: "Next.js", 
      icon: (
        <svg viewBox="0 0 128 128" className="w-4 h-4 fill-current">
          <path d="M64 0C28.7 0 0 28.7 0 64s28.7 64 64 64c11.2 0 21.7-2.9 30.8-7.9L48.4 56H38v40h8V64h0.4l41 55.4C107.5 109.1 128 88.9 128 64c0-35.3-28.7-64-64-64zm30 32h8v40h-8V32z" />
        </svg>
      )
    },
    { 
      name: "Supabase", 
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#3ECF8E]">
          <path d="M21 11H15.6L18.3 2L3 13H8.4L5.7 22L21 11Z" />
        </svg>
      )
    },
    { 
      name: "Azure", 
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#0089D6]">
          <path d="M12.924 1L6.726 11.458h4.743L18.889 1z M3.864 1L0 7.37H4.074L7.545 1z M4.96 9.36L.357 16.152h4.898L11.528 1z M10.188 5.135L5.77 15.023h4.48L15.204 7.385z" />
        </svg>
      )
    },
    { 
      name: "Gemini", 
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#8B5CF6]">
          <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" />
        </svg>
      )
    },
    { 
      name: "VirusTotal", 
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#2D4BF0]">
          <path d="M12 2L4 5V11C4 16.19 7.41 20.94 12 22C16.59 20.94 20 16.19 20 11V5L12 2ZM12 11V6.5L14.5 9L15.91 7.59L12 3.68L8.09 7.59L9.5 9L12 6.5V11H7V13H12V17.5L9.5 15L8.09 16.41L12 20.32L15.91 16.41L14.5 15L12 17.5V13H17V11H12Z" />
        </svg>
      )
    },
  ];

  return (
    <section className="bg-[#0D1117] border-b border-[#1C2128] py-8">
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-8">
        <span className="font-mono text-[11px] text-[#8B949E] uppercase tracking-[0.15em] shrink-0 opacity-50">Built With</span>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {techs.map((t) => (
            <div key={t.name} className="flex items-center gap-3 transition-opacity hover:opacity-100 opacity-60">
              {t.icon}
              <span className="text-[13px] font-sans text-[#E6EDF3] tracking-tight whitespace-nowrap" style={{ fontFamily: 'Calibri, system-ui, -apple-system, sans-serif' }}>
                {t.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
