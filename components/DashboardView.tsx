import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Invoice, Product, Expense, Customer } from '../types';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const StatCard = ({ title, value, icon, valueClassName, subtext }: { title: string, value: string | number, icon: string, valueClassName?: string, subtext?: string }) => {
    // Extract the color part from valueClassName (e.g., "text-indigo-600" -> "indigo-600")
    const colorClass = valueClassName?.replace('text-', '') || 'slate-600';
    
    return (
        <div className="bg-white p-4 rounded-xl shadow-lg flex items-center gap-4 border border-slate-100">
            <div className={`p-3 rounded-full bg-${colorClass} bg-opacity-10`}>
                <span className={`material-symbols-outlined text-3xl text-${colorClass}`}>{icon}</span>
            </div>
            <div>
                <h3 className="text-slate-500 text-sm">{title}</h3>
                <p className={`text-xl font-bold text-${colorClass}`}>{value}</p>
                {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
            </div>
        </div>
    );
};

const InfoListCard: React.FC<{ title: string; icon: string; children: React.ReactNode; }> = ({ title, icon, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg h-full">
        <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-slate-600">{icon}</span>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        </div>
        <div className="space-y-3 text-sm max-h-64 overflow-y-auto">
            {children}
        </div>
    </div>
);


const DashboardView: React.FC<{
  invoices: Invoice[];
  products: Product[];
  expenses: Expense[];
  customers: Customer[];
  lowStockThreshold: number;
}> = ({ invoices, products, expenses, customers, lowStockThreshold }) => {
  const [dateRange, setDateRange] = useState<'all' | '7' | '30'>('30');

  const profitExpenseChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<{ [key: string]: Chart | null }>({});

  const {
    netSales, grossProfit, totalExpenses, netProfit, 
    pendingOrders, recentSales, lowStockProducts, dailyData,
    todayNetSales, todayProfit, totalCapital, grandTotal
  } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const rangeStart = new Date();
    if (dateRange !== 'all') {
        rangeStart.setDate(today.getDate() - parseInt(dateRange));
    } else {
        rangeStart.setFullYear(1970);
    }
    rangeStart.setHours(0,0,0,0);
    
    const dateFilter = (itemDateStr: string | undefined) => {
        if (!itemDateStr) return false;
        const itemDate = new Date(itemDateStr);
        return itemDate >= rangeStart;
    };

    const isToday = (dateStr: string | undefined) => {
        if (!dateStr) return false;
        return dateStr.split('T')[0] === todayStr;
    };
    
    const completedSales = invoices.filter(inv => 
        (inv.type === 'sale' || (inv.type === 'shipping' && inv.status === 'completed' && inv.paymentStatus === 'paid')) && dateFilter(inv.paidDate)
    );

    const returns = invoices.filter(inv => inv.type === 'return' && dateFilter(inv.date));
    const filteredExpenses = expenses.filter(exp => dateFilter(exp.date));

    const totalSalesValue = completedSales.reduce((sum, inv) => sum + inv.total, 0);
    const totalReturnsValue = returns.reduce((sum, inv) => sum + inv.total, 0); 
    const netSales = totalSalesValue + totalReturnsValue;

    const cogs = completedSales.reduce((sum, inv) => sum + (inv.totalCost || 0), 0);
    const grossProfit = netSales - cogs;
    
    const totalExpensesValue = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = grossProfit - totalExpensesValue;

    // Today's metrics
    const todaySales = invoices.filter(inv => 
        (inv.type === 'sale' || (inv.type === 'shipping' && inv.status === 'completed' && inv.paymentStatus === 'paid')) && isToday(inv.paidDate)
    );
    const todayReturns = invoices.filter(inv => inv.type === 'return' && isToday(inv.date));
    const todayNetSales = todaySales.reduce((sum, inv) => sum + inv.total, 0) + todayReturns.reduce((sum, inv) => sum + inv.total, 0);
    const todayProfit = todaySales.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0) + todayReturns.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0);

    // Capital
    const totalCapital = products.reduce((sum, p) => sum + (p.costPrice || 0) * p.quantity, 0);
    
    // Grand Total (Capital + Net Profit for the selected range)
    const grandTotal = totalCapital + netProfit;
    
    const pendingOrders = invoices.filter(inv => inv.status === 'pending' && (inv.type === 'shipping' || inv.type === 'reservation')).length;

    const recentSales = invoices
        .filter(i => i.type === 'sale' || (i.type === 'shipping' && i.status === 'completed'))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
        
    const lowStockProducts = products
        .filter(p => p.quantity > 0 && p.quantity <= lowStockThreshold)
        .sort((a, b) => a.quantity - b.quantity);

    const dailyData: { [date: string]: { profit: number, expense: number } } = {};
     [...completedSales, ...returns].forEach(inv => {
        const day = new Date(inv.date).toISOString().split('T')[0];
        if (!dailyData[day]) dailyData[day] = { profit: 0, expense: 0 };
        dailyData[day].profit += inv.totalProfit || 0;
    });
    filteredExpenses.forEach(exp => {
        const day = new Date(exp.date).toISOString().split('T')[0];
        if (!dailyData[day]) dailyData[day] = { profit: 0, expense: 0 };
        dailyData[day].expense += exp.amount;
    });

    return {
        netSales, grossProfit, totalExpenses: totalExpensesValue, netProfit, 
        pendingOrders, recentSales, lowStockProducts,
        dailyData, todayNetSales, todayProfit, totalCapital, grandTotal
    };
  }, [invoices, expenses, products, lowStockThreshold, dateRange]);

  const [printContent, setPrintContent] = useState<{ title: string, items: any[], type: 'sales' | 'profit' | 'expenses' } | null>(null);

  const handlePrint = (type: 'sales' | 'profit' | 'expenses') => {
      let title = "";
      let items: any[] = [];
      
      if (type === 'sales') {
          title = `تقرير المبيعات - ${dateRangeText}`;
          items = invoices.filter(inv => (inv.type === 'sale' || (inv.type === 'shipping' && inv.status === 'completed')) && (dateRange === 'all' || new Date(inv.date) >= new Date(new Date().setDate(new Date().getDate() - parseInt(dateRange)))));
      } else if (type === 'profit') {
          title = `تقرير الأرباح اليومي - ${new Date().toLocaleDateString()}`;
          items = invoices.filter(inv => (inv.type === 'sale' || (inv.type === 'shipping' && inv.status === 'completed')) && inv.date.split('T')[0] === new Date().toISOString().split('T')[0]);
      } else if (type === 'expenses') {
          title = `تقرير المصروفات - ${dateRangeText}`;
          items = expenses.filter(exp => (dateRange === 'all' || new Date(exp.date) >= new Date(new Date().setDate(new Date().getDate() - parseInt(dateRange)))));
      }

      setPrintContent({ title, items, type });
      setTimeout(() => {
          window.print();
          setPrintContent(null);
      }, 100);
  };

  useEffect(() => {
    // FIX: Using Object.keys to iterate and destroy charts to ensure proper type inference.
    Object.keys(chartInstances.current).forEach(key => chartInstances.current[key]?.destroy());
    
    const ctx = profitExpenseChartRef.current?.getContext('2d');
    if (ctx) {
        const sortedDays = Object.keys(dailyData).sort();
        chartInstances.current['profitExpense'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDays.map(d => new Date(d).toLocaleDateString('ar-EG', {month: 'short', day: 'numeric'})),
                datasets: [
                {
                    label: 'إجمالي الربح',
                    data: sortedDays.map(day => dailyData[day].profit),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.3,
                },
                {
                    label: 'المصروفات',
                    data: sortedDays.map(day => dailyData[day].expense),
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.3,
                }
                ],
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }
    
    return () => {
        // FIX: Using Object.keys to iterate and destroy charts to ensure proper type inference.
        Object.keys(chartInstances.current).forEach(key => chartInstances.current[key]?.destroy());
    }
  }, [dailyData]);
  
  const dateRangeText = dateRange === 'all' ? 'كل الأوقات' : `آخر ${dateRange} يوم`;

  return (
    <div className="p-4 sm:p-6 bg-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">لوحة التحكم</h2>
            <p className="text-sm text-slate-500 mt-1">نظرة شاملة ودقيقة على أداء محلك التجاري.</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm mt-4 md:mt-0">
              <button onClick={() => setDateRange('7')} className={`px-3 py-1 rounded-md text-sm font-semibold ${dateRange === '7' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>آخر 7 أيام</button>
              <button onClick={() => setDateRange('30')} className={`px-3 py-1 rounded-md text-sm font-semibold ${dateRange === '30' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>آخر 30 يوم</button>
              <button onClick={() => setDateRange('all')} className={`px-3 py-1 rounded-md text-sm font-semibold ${dateRange === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>كل الأوقات</button>
          </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
        <StatCard title="صافي مبيعات اليوم" value={`${todayNetSales.toFixed(2)}`} icon="today" valueClassName="text-emerald-600" subtext="اليوم فقط" />
        <StatCard title="ربح اليوم" value={`${todayProfit.toFixed(2)}`} icon="payments" valueClassName="text-green-600" subtext="اليوم فقط" />
        <StatCard title="صافي المبيعات" value={`${netSales.toFixed(2)}`} icon="monitoring" valueClassName="text-indigo-600" subtext={dateRangeText} />
        <StatCard title="إجمالي الربح" value={`${grossProfit.toFixed(2)}`} icon="account_balance" valueClassName="text-sky-600" subtext={dateRangeText} />
        <StatCard title="المصروفات" value={`${totalExpenses.toFixed(2)}`} icon="receipt_long" valueClassName="text-red-500" subtext={dateRangeText} />
        <StatCard title="صافي الربح" value={`${netProfit.toFixed(2)}`} icon="trending_up" valueClassName={netProfit >= 0 ? 'text-green-600' : 'text-red-600'} subtext={dateRangeText}/>
        <StatCard title="رأس المال" value={`${totalCapital.toFixed(2)}`} icon="inventory_2" valueClassName="text-amber-600" subtext="قيمة المخزون" />
        <StatCard title="إجمالي الكل" value={`${grandTotal.toFixed(2)}`} icon="stars" valueClassName="text-purple-600" subtext="رأس المال + الربح" />
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
          <button onClick={() => handlePrint('sales')} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-slate-700 font-medium">
              <span className="material-symbols-outlined text-indigo-600">print</span>
              طباعة المبيعات
          </button>
          <button onClick={() => handlePrint('profit')} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-slate-700 font-medium">
              <span className="material-symbols-outlined text-green-600">print</span>
              طباعة الربح اليومي
          </button>
          <button onClick={() => handlePrint('expenses')} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-slate-700 font-medium">
              <span className="material-symbols-outlined text-red-600">print</span>
              طباعة المصروفات
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-lg h-96">
            <h3 className="text-xl font-bold text-slate-800 mb-4">الأرباح والمصروفات ({dateRangeText})</h3>
            <div className="relative h-72"><canvas ref={profitExpenseChartRef}></canvas></div>
          </div>
          <div className="lg:col-span-2">
             <InfoListCard title="تنبيهات المخزون" icon="notification_important">
                 {lowStockProducts.length > 0 ? lowStockProducts.map(p => (
                     <div key={p.id} className="flex justify-between items-center p-2 rounded-md hover:bg-slate-50">
                         <span>{p.name}</span>
                         <span className="font-bold text-red-600">الكمية: {p.quantity}</span>
                     </div>
                 )) : <p className="text-slate-500 p-2">لا يوجد كتب على وشك النفاذ حالياً.</p>}
             </InfoListCard>
          </div>
           <div className="lg:col-span-1">
             <InfoListCard title="آخر المبيعات" icon="receipt_long">
                 {recentSales.map(inv => (
                     <div key={inv.id} className="flex justify-between items-center p-2 rounded-md hover:bg-slate-50">
                         <div>
                            <p className="font-semibold">{inv.customerInfo?.name || "بيع مباشر"}</p>
                            <p className="text-xs text-slate-400">{new Date(inv.date).toLocaleDateString()}</p>
                         </div>
                         <span className="font-bold text-green-600">{inv.total.toFixed(2)}</span>
                     </div>
                 ))}
             </InfoListCard>
          </div>
      </div>
      {/* Printable Area */}
      {printContent && (
          <div id="print-area" className="p-8 bg-white text-right" dir="rtl">
              <h1 className="text-2xl font-bold mb-4 text-center border-b pb-4">{printContent.title}</h1>
              <p className="mb-6 text-slate-500 text-center">تاريخ التقرير: {new Date().toLocaleString('ar-EG')}</p>
              
              <table className="w-full border-collapse border border-slate-300">
                  <thead>
                      <tr className="bg-slate-100">
                          <th className="border border-slate-300 p-2">التاريخ</th>
                          <th className="border border-slate-300 p-2">البيان / الوصف</th>
                          <th className="border border-slate-300 p-2">المبلغ</th>
                          {printContent.type === 'profit' && <th className="border border-slate-300 p-2">الربح</th>}
                      </tr>
                  </thead>
                  <tbody>
                      {printContent.items.map((item, idx) => (
                          <tr key={idx}>
                              <td className="border border-slate-300 p-2">{new Date(item.date).toLocaleDateString()}</td>
                              <td className="border border-slate-300 p-2">
                                  {printContent.type === 'expenses' ? item.description : (item.customerInfo?.name || "بيع مباشر")}
                              </td>
                              <td className="border border-slate-300 p-2">{(item.total ?? item.amount ?? 0).toFixed(2)}</td>
                              {printContent.type === 'profit' && <td className="border border-slate-300 p-2">{item.totalProfit?.toFixed(2)}</td>}
                          </tr>
                      ))}
                  </tbody>
                  <tfoot>
                      <tr className="font-bold bg-slate-50">
                          <td colSpan={2} className="border border-slate-300 p-2 text-left">الإجمالي:</td>
                          <td className="border border-slate-300 p-2">
                              {printContent.items.reduce((sum, i) => sum + (i.total ?? i.amount ?? 0), 0).toFixed(2)}
                          </td>
                          {printContent.type === 'profit' && (
                              <td className="border border-slate-300 p-2">
                                  {printContent.items.reduce((sum, i) => sum + (i.totalProfit || 0), 0).toFixed(2)}
                              </td>
                          )}
                      </tr>
                  </tfoot>
              </table>
          </div>
      )}
    </div>
  );
};

export default DashboardView;