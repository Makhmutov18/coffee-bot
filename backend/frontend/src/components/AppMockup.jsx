import React from 'react';

export default function AppMockup() {
  return (
    <div className="relative mx-auto max-w-[300px] h-[600px] bg-[#0A0A0A] border-4 border-[#1A1A1A] rounded-[40px] shadow-2xl p-4 overflow-hidden flex flex-col justify-between select-none">
      {/* Динамик / Камера смартфона */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-28 h-4 bg-[#1A1A1A] rounded-full"></div>
      
      {/* Шапка Mini App */}
      <div className="mt-4 flex justify-between items-center border-b border-[#1A1A1A] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#DEFF9A] flex items-center justify-center text-black text-xs font-bold">B</div>
          <span className="text-sm font-mono tracking-wider text-white">BREW LAB</span>
        </div>
        <span className="text-xs text-stone-500 font-mono">v1.0_main</span>
      </div>

      {/* Контент (Имитация Bento-карточки рецепта) */}
      <div className="flex-1 my-4 flex flex-col gap-3 justify-center">
        <div className="border border-[#DEFF9A] bg-[#0E0E0E] rounded-xl p-4 relative shadow-[0_0_15px_rgba(222,255,154,0.05)]">
          <div className="absolute top-3 right-3 text-[#DEFF9A] text-lg cursor-pointer filter drop-shadow-[0_0_5px_#DEFF9A]">
            ★
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#DEFF9A] bg-[#DEFF9A]/10 px-2 py-0.5 rounded">
            ИЗБРАННОЕ
          </span>
          <h4 className="text-white font-bold mt-2 text-base">Эфиопия Гуджи</h4>
          <p className="text-xs text-stone-400 mt-1">Метод: V60 / Пуровер</p>
          
          {/* Параметры завара с моноширинными цифрами */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#1A1A1A]">
            <div>
              <span className="text-[10px] text-stone-500 block font-mono">ВОДА (IN)</span>
              <span className="text-sm font-mono text-white font-bold">250г</span>
            </div>
            <div>
              <span className="text-[10px] text-stone-500 block font-mono">ВРЕМЯ</span>
              <span className="text-sm font-mono text-white font-bold">02:30</span>
            </div>
          </div>
        </div>

        {/* Индикатор Таймера */}
        <div className="border border-[#1A1A1A] bg-[#050505] rounded-xl p-3 text-center">
          <div className="text-xs text-stone-500 font-mono uppercase tracking-wider">Статус пролива</div>
          <div className="text-xl font-mono text-[#DEFF9A] font-bold mt-1 tracking-widest">01:42</div>
          <div className="text-[10px] text-emerald-400 font-mono mt-1">🟢 В рамках техкарты</div>
        </div>
      </div>

      {/* Кнопка управления */}
      <div className="w-full bg-[#DEFF9A] text-black text-center py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(222,255,154,0.2)]">
        Запустить Таймер
      </div>
    </div>
  );
}