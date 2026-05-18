import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, List, ArrowRight, BarChart3, ShieldCheck, Upload } from 'lucide-react';
import { motion } from 'motion/react';

const tools = [
  {
    id: 'calculator',
    title: 'Calculator',
    description: 'Reverse-calculate profitable selling prices across marketplaces.',
    icon: <Calculator size={22} />,
    path: '/calculator',
    meta: 'Manual model',
  },
  {
    id: 'list',
    title: 'Price List',
    description: 'Review uploaded SKUs and compare suggested channel prices.',
    icon: <List size={22} />,
    path: '/price-list',
    meta: 'CSV powered',
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'Upload and edit COGS values that drive the price list.',
    icon: <Upload size={22} />,
    path: '/admin',
    meta: 'Protected',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f3f0ea] text-[#171a16]">
      <header className="border-b border-black/10 bg-[#fffaf1]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-5 md:px-8">
          <div>
            <div className="text-xl font-black uppercase tracking-[0.2em]">Hallstatt</div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#746e64]">Pricing command center</div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-2 text-sm font-black text-[#4e5b43] md:flex">
            <ShieldCheck size={15} />
            COGS workspace
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1480px] gap-8 px-5 py-8 md:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:py-12">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[420px] flex-col justify-between rounded-lg border border-black/10 bg-[#171a16] p-6 text-[#fffaf1] shadow-2xl shadow-black/10 md:p-8"
        >
          <div>
            <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm font-black uppercase tracking-[0.16em] text-white/80">
              <BarChart3 size={15} />
              Margin engine
            </div>
            <h1 className="max-w-xl text-5xl font-black leading-[0.96] tracking-normal md:text-7xl">
              Price every SKU with fewer blind spots.
            </h1>
          </div>
          <p className="mt-8 max-w-xl text-base font-semibold leading-7 text-white/72">
            Packaging, GST, CAC, returns, RTO, marketplace commission, and uploaded COGS all flow into one focused pricing desk.
          </p>
        </motion.section>

        <section className="grid gap-4">
          {tools.map((tool, index) => (
            <motion.button
              key={tool.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => navigate(tool.path)}
              className="group grid min-h-36 grid-cols-[auto_1fr_auto] items-center gap-5 rounded-lg border border-black/10 bg-white/82 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-black/25 hover:bg-[#fffdf8] hover:shadow-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#a83e59] text-white shadow-inner">
                {tool.icon}
              </div>
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#746e64]">{tool.meta}</div>
                <h2 className="text-3xl font-black tracking-normal">{tool.title}</h2>
                <p className="mt-2 max-w-xl text-base font-semibold leading-6 text-[#615b52]">{tool.description}</p>
              </div>
              <ArrowRight size={22} className="text-[#171a16] transition group-hover:translate-x-1" />
            </motion.button>
          ))}
        </section>
      </main>
    </div>
  );
}
