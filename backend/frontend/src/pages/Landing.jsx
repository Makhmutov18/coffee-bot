import React from 'react';
import AppMockup from '../components/AppMockup';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-[#DEFF9A] selection:text-black antialiased font-sans">
      
      {/* Сетка фонового шума/градиента */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-stone-900/40 via-black to-black pointer-events-none"></div>

      {/* HEADER */}
      <header className="relative max-w-6xl mx-auto px-6 py-6 flex justify-between items-center border-b border-[#1A1A1A]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#DEFF9A] flex items-center justify-center text-black font-mono font-black text-sm shadow-[0_0_15px_#DEFF9A]">
            B
          </div>
          <span className="font-mono font-bold tracking-widest text-sm">BREW LAB</span>
        </div>
        <a
          href="https://t.me/cofffee_recipe_bot"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-mono border border-[#1A1A1A] px-4 py-2 rounded-full hover:border-[#DEFF9A] hover:text-[#DEFF9A] transition-all duration-300"
        >
          LAUNCH BOT →
        </a>
      </header>

      {/* HERO SECTION */}
      <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">
          <div className="inline-flex items-center gap-2 border border-[#DEFF9A]/20 bg-[#DEFF9A]/5 px-3 py-1 rounded-full w-fit">
            <span className="w-2 h-2 rounded-full bg-[#DEFF9A] animate-pulse"></span>
            <span className="text-[10px] font-mono tracking-widest text-[#DEFF9A] uppercase">Telegram Mini App Ecosystem</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-white">
            Экосистема кофейной <br />
            <span className="text-[#DEFF9A] filter drop-shadow-[0_0_30px_rgba(222,255,154,0.15)]">стабильности.</span>
          </h1>
          
          <p className="text-stone-400 text-sm sm:text-base max-w-xl leading-relaxed">
            Профессиональный инструмент контроля рецептов, разработанный для спешелти-индустрии и домашних энтузиастов. Управляйте техкартами, отслеживайте завары и фиксируйте стабильность вкуса в 1 клик прямо внутри Telegram.
          </p>

          <div className="pt-4">
            <a
              href="https://t.me/cofffee_recipe_bot"
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-[#DEFF9A] text-black font-mono font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-xl shadow-[0_0_30px_rgba(222,255,154,0.2)] hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all duration-300 transform hover:-translate-y-0.5"
            >
              [ Открыть Brew Lab в Telegram ]
            </a>
          </div>
        </div>

        {/* Правая колонка — Живой интерактивный скриншот */}
        <div className="lg:col-span-5 flex justify-center relative">
          <div className="absolute inset-0 bg-[#DEFF9A]/5 blur-[80px] rounded-full pointer-events-none"></div>
          <AppMockup />
        </div>
      </section>

      {/* BENTO GRID FEATURES */}
      <section className="relative max-w-6xl mx-auto px-6 py-16 border-t border-[#1A1A1A]">
        <h2 className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-12">Основные модули / Core Engine</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Карточка 1: Библиотека */}
          <div className="border border-[#1A1A1A] bg-[#050505] p-6 rounded-2xl hover:border-[#DEFF9A]/30 transition-all duration-300 group">
            <div className="text-2xl mb-4">🗂</div>
            <h3 className="text-base font-bold font-mono tracking-wide text-white group-hover:text-[#DEFF9A] transition-colors">Умная библиотека</h3>
            <p className="text-stone-400 text-xs mt-2 leading-relaxed">
              Мгновенный поиск по сорту зерна, обжарщику или методу заваривания. Закрепляйте ходовые лоты дня в «Избранное» со звёздочкой для моментального доступа на баре.
            </p>
          </div>

          {/* Карточка 2: Таймер */}
          <div className="border border-[#1A1A1A] bg-[#050505] p-6 rounded-2xl hover:border-[#DEFF9A]/30 transition-all duration-300 group">
            <div className="text-2xl mb-4">⏱</div>
            <h3 className="text-base font-bold font-mono tracking-wide text-white group-hover:text-[#DEFF9A] transition-colors">Тактильный таймер</h3>
            <p className="text-stone-400 text-xs mt-2 leading-relaxed">
              Интерфейс спроектирован под суровые условия кофейного потока. Крупная неоновая индикация времени и быстрый вызов числовой клавиатуры смартфона для ввода веса.
            </p>
          </div>

          {/* Карточка 3: Контроль брака */}
          <div className="border border-[#1A1A1A] bg-[#050505] p-6 rounded-2xl hover:border-[#DEFF9A]/30 transition-all duration-300 group">
            <div className="text-2xl mb-4">🛡</div>
            <h3 className="text-base font-bold font-mono tracking-wide text-white group-hover:text-[#DEFF9A] transition-colors">Контроль лимитов</h3>
            <p className="text-stone-400 text-xs mt-2 leading-relaxed">
              Система автоматически сопоставляет фактические параметры вливания воды и времени с эталонной техкартой шеф-бариста, мгновенно фиксируя отклонения от стандартов качества.
            </p>
          </div>

        </div>
      </section>

      {/* B2B VALUE PROPOSITION */}
      <section className="relative max-w-6xl mx-auto px-6 py-16 mb-24 border-t border-[#1A1A1A]">
        <div className="bg-[#050505] border border-[#1A1A1A] p-8 md:p-12 rounded-3xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <span className="text-[10px] font-mono tracking-widest text-stone-500 uppercase block mb-2">Для владельцев и шеф-бариста / B2B Segment</span>
            <h3 className="text-xl md:text-2xl font-bold mb-4">Управляйте стабильностью вкуса всей сети удаленно</h3>
            <p className="text-stone-400 text-xs md:text-sm leading-relaxed max-w-2xl">
              Забудьте про костыли в виде бумажных блокнотов, эксель-таблиц или закрепленных рецептов в рабочих чатах. С Brew Lab шеф-бариста контролирует актуальные профили заваривания из единой точки, а линейные сотрудники всегда имеют под рукой точные ориентиры. Идеальная чашка на любой точке сети — от первой до последней смены.
            </p>
          </div>
          <div className="lg:col-span-4 flex justify-start lg:justify-end">
            <div className="border border-[#DEFF9A]/30 bg-[#DEFF9A]/5 p-4 rounded-xl font-mono text-xs w-full text-left">
              <div className="text-[#DEFF9A] font-bold">✓ Zero Overhead</div>
              <div className="text-stone-500 mt-1">Без скачивания тяжелого софта из App Store. Работает внутри Telegram Mini App.</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative max-w-6xl mx-auto px-6 py-8 border-t border-[#1A1A1A] flex flex-col sm:flex-row justify-between items-center gap-4">
        <span className="text-xs text-stone-600 font-mono">© 2026 BREW LAB ENGINE. All rights reserved.</span>
        <span className="text-xs text-stone-600 font-mono">Designed for premium coffee management.</span>
      </footer>

    </div>
  );
}