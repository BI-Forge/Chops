import React from 'react';
import { FileCode, Folder, Copy, CheckCircle } from 'lucide-react';

export function TransferGuide() {
  return (
    <div className="bg-gray-900/40 backdrop-blur-md border border-yellow-500/20 rounded-xl p-8 max-w-4xl mx-auto">
      <h2 className="text-yellow-400 mb-6 flex items-center gap-3">
        <FileCode className="w-6 h-6" />
        Файлы для переноса дизайна
      </h2>

      <div className="space-y-8">
        {/* Основные компоненты */}
        <div>
          <h3 className="text-yellow-400/90 mb-4 flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Основные компоненты (обязательные)
          </h3>
          <div className="space-y-2 ml-7">
            <FileItem name="components/ClickhouseOpsLogo.tsx" description="Логотип системы с иконкой БД, молнией и курсором" />
            <FileItem name="components/Sidebar.tsx" description="Боковое меню навигации" />
            <FileItem name="components/BackgroundPattern.tsx" description="Анимированный фоновый паттерн с нейронной сетью" />
            <FileItem name="components/MetricsCards.tsx" description="Карточки метрик с прогресс-барами" />
            <FileItem name="components/NodeSelector.tsx" description="Селектор нод БД в шапке" />
            <FileItem name="components/CustomSelect.tsx" description="Кастомный выпадающий список (используется в NodeSelector)" />
            <FileItem name="components/ServerInfo.tsx" description="Детальная информация о сервере БД" />
            <FileItem name="components/SystemCharts.tsx" description="Графики системного мониторинга" />
          </div>
        </div>

        {/* Стили */}
        <div>
          <h3 className="text-yellow-400/90 mb-4 flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Стили и конфигурация
          </h3>
          <div className="space-y-2 ml-7">
            <FileItem 
              name="styles/globals.css" 
              description="Глобальные стили (добавьте кастомный scrollbar в конец файла)" 
              note="Строки 191-209 - стили для скроллбара"
            />
          </div>
        </div>

        {/* Зависимости */}
        <div>
          <h3 className="text-yellow-400/90 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Необходимые библиотеки
          </h3>
          <div className="bg-gray-800/40 rounded-lg p-4 ml-7">
            <pre className="text-gray-300 text-sm overflow-x-auto">
              <code>{`npm install lucide-react recharts`}</code>
            </pre>
          </div>
          <div className="space-y-2 ml-7 mt-3 text-gray-400 text-sm">
            <div>• <span className="text-yellow-400">lucide-react</span> - иконки</div>
            <div>• <span className="text-yellow-400">recharts</span> - графики</div>
            <div>• <span className="text-yellow-400">tailwindcss</span> - стили (должен быть установлен)</div>
          </div>
        </div>

        {/* Пример использования */}
        <div>
          <h3 className="text-yellow-400/90 mb-4 flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Пример использования в App.tsx
          </h3>
          <div className="bg-gray-800/40 rounded-lg p-4 ml-7 overflow-x-auto">
            <pre className="text-gray-300 text-sm">
              <code>{`import { Sidebar } from './components/Sidebar';
import { BackgroundPattern } from './components/BackgroundPattern';
import { NodeSelector } from './components/NodeSelector';
import { MetricsCards } from './components/MetricsCards';
import { SystemCharts } from './components/SystemCharts';
import { ServerInfo } from './components/ServerInfo';

export default function App() {
  return (
    <div className="flex h-screen text-white overflow-hidden">
      <BackgroundPattern />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <NodeSelector />
        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          <MetricsCards />
          <SystemCharts />
          <ServerInfo />
        </main>
      </div>
    </div>
  );
}`}</code>
            </pre>
          </div>
        </div>

        {/* Структура папок */}
        <div>
          <h3 className="text-yellow-400/90 mb-4 flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Рекомендуемая структура проекта
          </h3>
          <div className="bg-gray-800/40 rounded-lg p-4 ml-7">
            <pre className="text-gray-300 text-sm">
              <code>{`src/
├── components/
│   ├── BackgroundPattern.tsx
│   ├── ClickhouseOpsLogo.tsx
│   ├── CustomSelect.tsx
│   ├── MetricsCards.tsx
│   ├── NodeSelector.tsx
│   ├── ServerInfo.tsx
│   ├── Sidebar.tsx
│   └── SystemCharts.tsx
├── styles/
│   └── globals.css
└── App.tsx`}</code>
            </pre>
          </div>
        </div>

        {/* Важные замечания */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <h4 className="text-amber-400 mb-2">⚠️ Важные замечания:</h4>
          <ul className="space-y-2 text-gray-300 text-sm ml-4">
            <li>• Все компоненты используют TypeScript - убедитесь, что ваш проект поддерживает TS</li>
            <li>• Компоненты адаптивны и работают на разных размерах экрана</li>
            <li>• Используются React Portals для дропдаунов (CustomSelect, NodeSelector)</li>
            <li>• Цветовая схема: желтые/оранжевые градиенты на темном фоне</li>
            <li>• Все анимации реализованы через Tailwind CSS классы</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

interface FileItemProps {
  name: string;
  description: string;
  note?: string;
}

function FileItem({ name, description, note }: FileItemProps) {
  return (
    <div className="bg-gray-800/20 rounded-lg p-3 border border-yellow-500/10 hover:border-yellow-500/30 transition-all">
      <div className="flex items-start gap-3">
        <FileCode className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-gray-200 text-sm font-mono">{name}</div>
          <div className="text-gray-400 text-xs mt-1">{description}</div>
          {note && (
            <div className="text-amber-400 text-xs mt-1 italic">💡 {note}</div>
          )}
        </div>
      </div>
    </div>
  );
}
