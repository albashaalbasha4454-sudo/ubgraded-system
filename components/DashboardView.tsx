import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Invoice, Product, Expense } from '../types';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const DashboardView: React.FC<{
  invoices: Invoice[];
  products: Product[];
  expenses: Expense[];
}> = ({ invoices, products, expenses }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Refs for chart canvases
  const salesChartRef = useRef<HTMLCanvasElement>(null);
  const topProductsChartRef = useRef<HTMLCanvasElement>(null);
  const expenseChartRef = useRef<HTMLCanvasElement>(null);

  // Refs for chart instances
  const salesChartInstance = useRef<Chart | null>(null);
  const topProductsChartInstance = useRef<Chart | null>(null);
  const expenseChartInstance = useRef<Chart | null>(null);

  const {
    filteredInvoices,
    filteredExpenses,
    totalRevenue,
    netProfit,
    totalExpenses,
    totalSales,
    salesByDay,
    topProductsByRevenue,
    expensesByCategory,
    averageInvoiceValue,
  } = useMemo(() => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    const dateFilter = (item: { date: string }) => {
        const itemDate = new Date(item.date);
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
    };
    
    const financiallyRelevantInvoices = invoices.filter(inv => 
        // FIX: The comparison was between 'status' and 'paid', which are from different types. Corrected to check 'paymentStatus'.
        (inv.type === 'sale' && inv.paymentStatus === 'paid') ||
        (inv.type === 'shipping' && inv.status === 'completed') ||
        inv.type === 'return'
    );

    const filteredInvoices = financiallyRelevantInvoices.filter(dateFilter);
    const filteredExpenses = expenses.filter(dateFilter);

    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalProfitFromInvoices = filteredInvoices.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalProfitFromInvoices - totalExpenses;
    
    const saleInvoices = filteredInvoices.filter(inv => inv.type === 'sale' || inv.type === 'shipping');
    const totalSales = saleInvoices.length;
    const totalRevenueFromSales = saleInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const averageInvoiceValue = totalSales > 0 ? totalRevenueFromSales / totalSales : 0;
    
    const salesByDay: { [date: string]: number } = {};
    filteredInvoices.forEach(inv => {
      if (inv.type === 'sale' || (inv.type === 'shipping' && inv.status === 'completed')) {
        const day = new Date(inv.date).toISOString().split('T')[0];
        salesByDay[day] = (salesByDay[day] || 0) + inv.total;
      }
    });

    const productSales: { [key: string]: { name: string, revenue: number } } = {};
    filteredInvoices.forEach(invoice => {
      invoice.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.productName, revenue: 0 };
        }
        const revenue = (invoice.type === 'return' ? -item.quantity : item.quantity) * (item.price - (item.discount || 0));
        productSales[item.productId].revenue += revenue;
      });
    });
    const topProductsByRevenue = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const expensesByCategory: { [category: string]: number } = {};
    filteredExpenses.forEach(exp => {
      const category = exp.category || 'غير مصنف';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + exp.amount;
    });

    return {
      filteredInvoices,
      filteredExpenses,
      totalRevenue,
      netProfit,
      totalExpenses,
      totalSales,
      salesByDay,
      topProductsByRevenue,
      expensesByCategory,
      averageInvoiceValue,
    };
  }, [invoices, expenses, startDate, endDate]);

  useEffect(() => {
    const destroyCharts = () => {
      if (salesChartInstance.current) salesChartInstance.current.destroy();
      if (topProductsChartInstance.current) topProductsChartInstance.current.destroy();
      if (expenseChartInstance.current) expenseChartInstance.current.destroy();
    };

    destroyCharts();
    
    const ctxSales = salesChartRef.current?.getContext('2d');
    if (ctxSales) {
      const sortedDates = Object.keys(salesByDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      salesChartInstance.current = new Chart(ctxSales, {
        type: 'line',
        data: {
          labels: sortedDates,
          datasets: [{
            label: 'الإيرادات اليومية',
            data: sortedDates.map(date => salesByDay[date]),
            borderColor: 'rgb(79, 70, 229)',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            fill: true,
            tension: 0.3,
          }],
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    const ctxTopProducts = topProductsChartRef.current?.getContext('2d');
    if (ctxTopProducts) {
      topProductsChartInstance.current = new Chart(ctxTopProducts, {
        type: 'bar',
        data: {
          labels: topProductsByRevenue.map(p => p.name),
          datasets: [{
            label: 'الإيرادات',
            data: topProductsByRevenue.map(p => p.revenue),
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderRadius: 4,
          }],
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
      });
    }

    const ctxExpense = expenseChartRef.current?.getContext('2d');
    if (ctxExpense) {
      expenseChartInstance.current = new Chart(ctxExpense, {
        type: 'doughnut',
        data: {
          labels: Object.keys(expensesByCategory),
          datasets: [{
            label: 'المصروفات',
            data: Object.values(expensesByCategory),
            backgroundColor: [
              'rgba(239, 68, 68, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(22, 163, 74, 0.8)',
              'rgba(139, 92, 246, 0.8)',
            ],
          }],
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    return () => {
      destroyCharts();
    };

  }, [salesByDay, topProductsByRevenue, expensesByCategory]);

  const StatCard = ({ title, value, icon, valueClassName }: { title: string, value: string | number, icon: string, valueClassName?: string }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4">
        <div className={`p-3 rounded-full ${valueClassName} bg-opacity-10`}>
            <span className={`material-symbols-outlined text-3xl ${valueClassName}`}>{icon}</span>
        </div>
        <div>
            <h3 className="text-slate-500 text-md">{title}</h3>
            <p className={`text-2xl font-bold ${valueClassName || 'text-slate-800'}`}>{value}</p>
        </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="bg-white shadow-lg rounded-xl mb-6">
        <div className="p-6 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800">لوحة التحكم والتقارير</h2>
            <p className="text-sm text-slate-500 mt-1">نظرة عامة على أداء محلك التجاري.</p>
        </div>
        <div className="p-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
                <label htmlFor="startDate" className="block text-sm font-medium text-slate-700">من تاريخ</label>
                <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"/>
            </div>
            <div className="flex-1 w-full">
                <label htmlFor="endDate" className="block text-sm font-medium text-slate-700">إلى تاريخ</label>
                <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"/>
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mb-6">
        <StatCard title="صافي الإيرادات" value={`${totalRevenue.toFixed(2)}`} icon="monitoring" valueClassName="text-indigo-600" />
        <StatCard title="إجمالي المصروفات" value={`${totalExpenses.toFixed(2)}`} icon="receipt_long" valueClassName="text-orange-600" />
        <StatCard title="صافي الربح" value={`${netProfit.toFixed(2)}`} icon="trending_up" valueClassName={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}/>
        <StatCard title="عدد المبيعات" value={totalSales} icon="shopping_cart" valueClassName="text-sky-600" />
        <StatCard title="متوسط الفاتورة" value={`${averageInvoiceValue.toFixed(2)}`} icon="payments" valueClassName="text-fuchsia-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-5 bg-white p-6 rounded-xl shadow-lg h-96">
            <h3 className="text-xl font-bold text-slate-800 mb-4">الإيرادات خلال الفترة</h3>
            <div className="relative h-72">
                <canvas ref={salesChartRef}></canvas>
            </div>
          </div>
          <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-lg h-96">
            <h3 className="text-xl font-bold text-slate-800 mb-4">أعلى 5 كتب مبيعاً (حسب الإيراد)</h3>
            <div className="relative h-72">
                <canvas ref={topProductsChartRef}></canvas>
            </div>
          </div>
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg h-96">
            <h3 className="text-xl font-bold text-slate-800 mb-4">توزيع المصروفات</h3>
             <div className="relative h-72">
                <canvas ref={expenseChartRef}></canvas>
            </div>
          </div>
      </div>
    </div>
  );
};

export default DashboardView;