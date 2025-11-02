import React from 'react';
import type { View, User, Product } from '../types';

interface HeaderProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  user: User;
  onLogout: () => void;
  products: Product[];
  lowStockThreshold: number;
  pendingReturnRequests: number;
}

const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView, user, onLogout, products, lowStockThreshold, pendingReturnRequests }) => {
  
  const allNavItems: { key: View; label: string; roles: ('admin' | 'cashier')[] }[] = [
    { key: 'pos', label: 'نقطة البيع', roles: ['admin', 'cashier'] },
    { key: 'products', label: 'البضاعة', roles: ['admin'] },
    { key: 'invoices', label: 'الفواتير', roles: ['admin', 'cashier'] },
    { key: 'expenses', label: 'المصروفات', roles: ['admin'] },
    { key: 'return-requests', label: 'طلبات الإرجاع', roles: ['admin'] },
    { key: 'reports', label: 'التقارير', roles: ['admin'] },
    { key: 'settings', label: 'الإعدادات', roles: ['admin'] },
    { key: 'users', label: 'المستخدمون', roles: ['admin'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(user.role));
  
  const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= lowStockThreshold).length;

  return (
    <header className="bg-gray-800 text-white p-4 print:hidden">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold">برنامج المحاسبة</h1>
        
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setCurrentView(item.key)}
                className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === item.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {item.label}
                {item.key === 'return-requests' && pendingReturnRequests > 0 && (
                   <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                    {pendingReturnRequests}
                   </span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
             {user.role === 'admin' && lowStockCount > 0 && (
                <button onClick={() => setCurrentView('products')} className="relative text-gray-300 hover:text-white" aria-label="تنبيهات المخزون المنخفض">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    {lowStockCount}
                    </span>
                </button>
             )}
             <div className="text-sm text-gray-300">
                مرحباً, <span className="font-bold">{user.username}</span>
             </div>
             <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-3 rounded-md transition-colors"
                aria-label="تسجيل الخروج"
             >
                خروج
             </button>
          </div>
        </div>

        <div className="md:hidden">
           <select 
              onChange={(e) => setCurrentView(e.target.value as View)} 
              value={currentView}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            >
            {navItems.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};

export default Header;