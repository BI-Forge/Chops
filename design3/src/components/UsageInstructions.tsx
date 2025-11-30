import React from 'react';

export function UsageInstructions() {
  return (
    <div className="bg-gray-900/60 backdrop-blur-md rounded-2xl p-8 border border-yellow-500/20 text-gray-300">
      <h2 className="text-yellow-400 mb-6">Инструкция по использованию фонового паттерна</h2>
      
      <div className="space-y-6">
        <section>
          <h3 className="text-yellow-400 mb-3">1. Файлы для переноса</h3>
          <p className="mb-2">Скопируйте следующий файл в ваш проект:</p>
          <div className="bg-gray-800/80 rounded-lg p-4 border border-yellow-500/10">
            <code className="text-yellow-300">
              /components/BackgroundPattern.tsx
            </code>
          </div>
        </section>

        <section>
          <h3 className="text-yellow-400 mb-3">2. Базовое использование</h3>
          <p className="mb-2">Импортируйте компонент и добавьте его на страницу:</p>
          <div className="bg-gray-800/80 rounded-lg p-4 border border-yellow-500/10 overflow-x-auto">
            <pre className="text-sm text-green-400">
{`import { BackgroundPattern } from './components/BackgroundPattern';

export default function MyPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Фоновый паттерн */}
      <BackgroundPattern />
      
      {/* Ваш контент */}
      <div className="relative z-10 p-8">
        <h1>Ваш контент здесь</h1>
      </div>
    </div>
  );
}`}
            </pre>
          </div>
        </section>

        <section>
          <h3 className="text-yellow-400 mb-3">3. Важные моменты</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Родительский контейнер должен иметь <code className="text-yellow-300 bg-gray-800 px-2 py-1 rounded">relative</code> и <code className="text-yellow-300 bg-gray-800 px-2 py-1 rounded">overflow-hidden</code></li>
            <li>BackgroundPattern имеет <code className="text-yellow-300 bg-gray-800 px-2 py-1 rounded">absolute inset-0</code> - занимает весь контейнер</li>
            <li>Ваш контент должен быть в элементе с <code className="text-yellow-300 bg-gray-800 px-2 py-1 rounded">relative z-10</code></li>
            <li>Для карточек используйте: <code className="text-yellow-300 bg-gray-800 px-2 py-1 rounded">bg-gray-900/60 backdrop-blur-md</code></li>
            <li>Для границ используйте: <code className="text-yellow-300 bg-gray-800 px-2 py-1 rounded">border border-yellow-500/20</code></li>
          </ul>
        </section>

        <section>
          <h3 className="text-yellow-400 mb-3">4. Стилизация контента</h3>
          <p className="mb-2">Рекомендуемые Tailwind классы для элементов на темном фоне:</p>
          <div className="bg-gray-800/80 rounded-lg p-4 border border-yellow-500/10 space-y-2">
            <div><span className="text-yellow-300">Заголовки:</span> <code className="text-green-400">text-yellow-400</code></div>
            <div><span className="text-yellow-300">Основной текст:</span> <code className="text-green-400">text-gray-300</code></div>
            <div><span className="text-yellow-300">Второстепенный текст:</span> <code className="text-green-400">text-gray-400</code></div>
            <div><span className="text-yellow-300">Карточки:</span> <code className="text-green-400">bg-gray-900/60 backdrop-blur-md border border-yellow-500/20</code></div>
            <div><span className="text-yellow-300">Кнопки:</span> <code className="text-green-400">bg-gradient-to-r from-amber-500 to-yellow-500</code></div>
          </div>
        </section>

        <section>
          <h3 className="text-yellow-400 mb-3">5. Адаптивность</h3>
          <p>Фон автоматически адаптируется под любой размер экрана. Паттерн повторяется и анимация работает на всех устройствах.</p>
        </section>

        <section>
          <h3 className="text-yellow-400 mb-3">6. Производительность</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Анимация использует CSS transforms - аппаратное ускорение</li>
            <li>SVG паттерн легковесный и быстро отрисовывается</li>
            <li>Эффект blur может быть отключен на слабых устройствах</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
