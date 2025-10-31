import React, { useMemo, useState } from 'react';
import type { Invoice, Product } from '../types';

interface ReportsViewProps {
  invoices: Invoice[];
  products: Product[];
}

const ReportsView: React.FC<ReportsViewProps> = ({ invoices, products }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredInvoices = useMemo(() => {
    if (!startDate && !endDate) {
      return invoices;
    }
    return invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if(start) start.setHours(0,0,0,0);
      if(end) end.setHours(23,59,59,999);

      if (start && invoiceDate < start) return false;
      if (end && invoiceDate > end) return false;
      return true;
    });
  }, [invoices, startDate, endDate]);

  const reportData = useMemo(() => {
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalSales = filteredInvoices.filter(inv => inv.type === 'sale').length;

    const productSales: { [key: string]: { name: string, quantitySold: number; revenue: number } } = {};

    filteredInvoices.forEach(invoice => {
      invoice.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.productName, quantitySold: 0, revenue: 0 };
        }
        const quantity = invoice.type === 'return' ? -item.quantity : item.quantity;
        productSales[item.productId].quantitySold += quantity;
        productSales[item.productId].revenue += quantity * item.price;
      });
    });

    const bestSellingByQuantity = Object.values(productSales).sort((a, b) => b.quantitySold - a.quantitySold);
    const bestSellingByRevenue = [...Object.values(productSales)].sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      totalSales,
      totalProducts: products.length,
      bestSellingByQuantity,
      bestSellingByRevenue,
    };
  }, [filteredInvoices, products]);

  const StatCard = ({ title, value, subtext }: { title: string, value: string | number, subtext?: string }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-gray-500 text-lg">{title}</h3>
      <p className="text-3xl font-bold text-gray-800 my-2">{value}</p>
      {subtext && <p className="text-gray-400 text-sm">{subtext}</p>}
    </div>
  );

  const SalesTable = ({ title, data }: { title: string, data: { name: string, quantitySold: number; revenue: number }[] }) => (
     <div className="bg-white shadow-md rounded-lg p-4 md:p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
        <div className="overflow-x-auto">
            <table className="w-full table-auto text-right">
                <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
                    <tr>
                        <th className="py-3 px-6">المنتج</th>
                        <th className="py-3 px-6">صافي الكمية المباعة</th>
                        <th className="py-3 px-6">صافي الإيرادات</th>
                    </tr>
                </thead>
                <tbody className="text-gray-700 text-sm">
                    {data.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-4">لا توجد بيانات لعرضها.</td></tr>
                    ) : (
                       data.slice(0, 10).map(item => (
                            <tr key={item.name} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-3 px-6 font-semibold">{item.name}</td>
                                <td className="py-3 px-6">{item.quantitySold}</td>
                                <td className="py-3 px-6">{item.revenue.toFixed(2)}</td>
                            </tr>
                       ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );


  return (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">تقرير المبيعات</h2>

       <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-semibold mb-2">تصفية حسب التاريخ</h3>
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">من تاريخ</label>
                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"/>
                </div>
                <div className="flex-1 w-full">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">إلى تاريخ</label>
                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"/>
                </div>
            </div>
       </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="صافي الإيرادات" value={`${reportData.totalRevenue.toFixed(2)}`} />
        <StatCard title="إجمالي فواتير البيع" value={reportData.totalSales} subtext="فاتورة" />
        <StatCard title="عدد المنتجات" value={reportData.totalProducts} subtext="منتج في المخزون" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <SalesTable title="أكثر 10 منتجات مبيعًا (حسب صافي الكمية)" data={reportData.bestSellingByQuantity} />
         <SalesTable title="أكثر 10 منتجات مبيعًا (حسب صافي الإيرادات)" data={reportData.bestSellingByRevenue} />
      </div>
    </div>
  );
};
export default ReportsView;