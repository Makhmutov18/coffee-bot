import React, { useState } from 'react';
import AppMockup from '../components/AppMockup';

export default function Landing() {
  const [calcVolume, setCalcVolume] = useState(1300);
  const [calcRatio, setCalcRatio] = useState(16.5);

  const coffeeWeight = calcVolume > 0 && calcRatio > 0
    ? +(calcVolume / calcRatio).toFixed(1)
    : 0;
  const waterInTank = coffeeWeight > 0
    ? Math.round(calcVolume + coffeeWeight * 2)
    : 0;

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
              href="https://t.me/cofffee_recipe_bot/brew"
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
          <div className="border border-[#1A1A1A] bg-[#050505] p-6 rounded-2xl hover:border-[#DEFF9A]/30 hover:shadow-[0_0_15px_rgba(222,255,154,0.15)] transition-all duration-300 group">
            <div className="text-2xl mb-4">🗂</div>
            <h3 className="text-base font-bold font-mono tracking-wide text-white group-hover:text-[#DEFF9A] transition-colors">Умная библиотека</h3>
            <p className="text-stone-400 text-xs mt-2 leading-relaxed">
              Мгновенный поиск по сорту зерна, обжарщику или методу заваривания. Закрепляйте ходовые лоты дня в «Избранное» со звёздочкой для моментального доступа на баре.
            </p>
          </div>

          {/* Карточка 2: Таймер */}
          <div className="border border-[#1A1A1A] bg-[#050505] p-6 rounded-2xl hover:border-[#DEFF9A]/30 hover:shadow-[0_0_15px_rgba(222,255,154,0.15)] transition-all duration-300 group">
            <div className="text-2xl mb-4">⏱</div>
            <h3 className="text-base font-bold font-mono tracking-wide text-white group-hover:text-[#DEFF9A] transition-colors">Тактильный таймер</h3>
            <p className="text-stone-400 text-xs mt-2 leading-relaxed">
              Интерфейс спроектирован под суровые условия кофейного потока. Крупная неоновая индикация времени и быстрый вызов числовой клавиатуры смартфона для ввода веса.
            </p>
          </div>

          {/* Карточка 3: Контроль брака */}
          <div className="border border-[#1A1A1A] bg-[#050505] p-6 rounded-2xl hover:border-[#DEFF9A]/30 hover:shadow-[0_0_15px_rgba(222,255,154,0.15)] transition-all duration-300 group">
            <div className="text-2xl mb-4">🛡</div>
            <h3 className="text-base font-bold font-mono tracking-wide text-white group-hover:text-[#DEFF9A] transition-colors">Контроль лимитов</h3>
            <p className="text-stone-400 text-xs mt-2 leading-relaxed">
              Система автоматически сопоставляет фактические параметры вливания воды и времени с эталонной техкартой шеф-бариста, мгновенно фиксируя отклонения от стандартов качества.
            </p>
          </div>

        </div>
      </section>

      {/* INTERACTIVE BATCH CALCULATOR */}
      <section className="relative max-w-6xl mx-auto px-6 py-16 border-t border-[#1A1A1A]">
        <h2 className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-12">Калькулятор батча / Batch Brew Simulator</h2>

        <div className="border border-[#1A1A1A] bg-[#050505] p-8 md:p-12 rounded-3xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

            {/* Левая колонка: Inputs */}
            <div className="space-y-6">
              <div>
                <label className="text-xs font-mono text-stone-400 mb-2 block">Объём готового напитка (мл)</label>
                <input
                  type="range"
                  min="500"
                  max="3000"
                  step="50"
                  value={calcVolume}
                  onChange={(e) => setCalcVolume(Number(e.target.value))}
                  className="w-full h-2 bg-[#1A1A1A] rounded-full appearance-none cursor-pointer accent-[#DEFF9A]"
                />
                <div className="flex justify-between text-xs font-mono text-stone-600 mt-1">
                  <span>500 мл</span>
                  <span className="text-[#DEFF9A] font-bold">{calcVolume} мл</span>
                  <span>3000 мл</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-stone-400 mb-2 block">Коэффициент (Brew Ratio)</label>
                <input
                  type="range"
                  min="14"
                  max="19"
                  step="0.5"
                  value={calcRatio}
                  onChange={(e) => setCalcRatio(Number(e.target.value))}
                  className="w-full h-2 bg-[#1A1A1A] rounded-full appearance-none cursor-pointer accent-[#DEFF9A]"
                />
                <div className="flex justify-between text-xs font-mono text-stone-600 mt-1">
                  <span>1:14</span>
                  <span className="text-[#DEFF9A] font-bold">1:{calcRatio}</span>
                  <span>1:19</span>
                </div>
              </div>

              <div className="pt-4">
                <a
                  href="https://t.me/cofffee_recipe_bot/brew"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block w-full text-center bg-[#DEFF9A] text-black font-mono font-bold text-sm uppercase tracking-wider px-6 py-3 rounded-xl shadow-[0_0_30px_rgba(222,255,154,0.2)] hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all duration-300"
                >
                  Попробовать в деле →
                </a>
              </div>
            </div>

            {/* Правая колонка: Результат */}
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="text-center">
                <div className="text-[10px] font-mono tracking-widest text-stone-500 uppercase mb-4">Расчётные параметры</div>
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                  <div className="border border-[#DEFF9A]/20 bg-[#0A0A0A] p-5 rounded-2xl text-center">
                    <div className="text-3xl font-bold font-mono text-[#DEFF9A] filter drop-shadow-[0_0_15px_rgba(222,255,154,0.3)]">
                      {coffeeWeight}
                    </div>
                    <div className="text-xs text-stone-500 font-mono mt-2">Зерно (г)</div>
                  </div>
                  <div className="border border-[#DEFF9A]/20 bg-[#0A0A0A] p-5 rounded-2xl text-center">
                    <div className="text-3xl font-bold font-mono text-[#DEFF9A] filter drop-shadow-[0_0_15px_rgba(222,255,154,0.3)]">
                      {waterInTank}
                    </div>
                    <div className="text-xs text-stone-500 font-mono mt-2">Вода в бак (мл)</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* GRIND CALIBRATION BENTO */}
      <section className="relative max-w-6xl mx-auto px-6 py-16 border-t border-[#1A1A1A]">
        <h2 className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-12">Калибровка помола / Grind Calibration</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Левая карточка: Проблема */}
          <div className="border border-[#1A1A1A] bg-[#050505] p-8 rounded-3xl hover:border-[#DEFF9A]/30 hover:shadow-[0_0_15px_rgba(222,255,154,0.15)] transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-lg">⚠️</div>
              <div>
                <div className="text-sm font-mono font-bold text-white">Проблема</div>
                <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Разная калибровка нуля</div>
              </div>
            </div>

            <p className="text-stone-400 text-sm leading-relaxed mb-6">
              Одна и та же модель кофемолки на разных точках сети может иметь разную калибровку нуля.
              Например, <span className="text-white font-mono">Lagom P64</span> на точке «Спот Ленина» показывает помол <span className="text-[#DEFF9A] font-mono">3.2</span>,
              а на «Спот Пушкина» — <span className="text-[#DEFF9A] font-mono">2.8</span> для идентичного результата.
            </p>

            <div className="flex items-center gap-3 p-3 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl">
              <div className="text-lg">🔧</div>
              <div className="text-xs text-stone-500 font-mono">
                Без Brew Lab бариста приходится каждый раз подбирать помол заново при переезде между точками.
              </div>
            </div>
          </div>

          {/* Правая карточка: Решение */}
          <div className="border border-[#DEFF9A]/20 bg-[#050505] p-8 rounded-3xl hover:border-[#DEFF9A]/40 hover:shadow-[0_0_15px_rgba(222,255,154,0.15)] transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#DEFF9A]/10 border border-[#DEFF9A]/20 flex items-center justify-center text-lg">✅</div>
              <div>
                <div className="text-sm font-mono font-bold text-white">Решение Brew Lab</div>
                <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Привязка помола к девайсу</div>
              </div>
            </div>

            <p className="text-stone-400 text-sm leading-relaxed mb-6">
              Brew Lab сохраняет уникальный шаг помола для каждого девайса в отдельности.
              Вы указываете модель кофемолки и её серийный номер — система запоминает калибровку
              и автоматически подставляет корректные значения при выборе оборудования.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl text-center">
                <div className="text-xs text-stone-500 font-mono">Спот Ленина</div>
                <div className="text-lg font-mono font-bold text-[#DEFF9A] mt-1">3.2</div>
                <div className="text-[10px] text-stone-600 font-mono">Lagom P64 #001</div>
              </div>
              <div className="p-3 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl text-center">
                <div className="text-xs text-stone-500 font-mono">Спот Пушкина</div>
                <div className="text-lg font-mono font-bold text-[#DEFF9A] mt-1">2.8</div>
                <div className="text-[10px] text-stone-600 font-mono">Lagom P64 #002</div>
              </div>
            </div>
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