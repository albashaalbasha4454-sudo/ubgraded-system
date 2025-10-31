import React from 'react';
import type { Invoice, User } from '../types';

interface InvoicesViewProps {
  invoices: Invoice[];
  setInvoiceToPrint: (invoice: Invoice | null) => void;
  setInvoiceForReturnRequest: (invoice: Invoice | null) => void;
  user: User;
}

const InvoicesView: React.FC<InvoicesViewProps> = ({ invoices, setInvoiceToPrint, setInvoiceForReturnRequest, user }) => {
  const sortedInvoices = [...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">سجل الفواتير</h2>
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="w-full table-auto text-right">
          <thead className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
            <tr>
              <th className="py-3 px-6">رقم الفاتورة</th>
              <th className="py-3 px-6">التاريخ والوقت</th>
              <th className="py-3 px-6">النوع</th>
              <th className="py-3 px-6">عدد الأصناف</th>
              <th className="py-3 px-6">الإجمالي</th>
              <th className="py-3 px-6 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm font-light">
            {sortedInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6">
                  لا يوجد فواتير لعرضها.
                </td>
              </tr>
            ) : (
              sortedInvoices.map((invoice) => (
                <tr key={invoice.id} className={`border-b border-gray-200 ${invoice.type === 'return' ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                  <td className="py-3 px-6 font-mono text-xs">{invoice.id.substring(0, 8)}</td>
                  <td className="py-3 px-6">{new Date(invoice.date).toLocaleString('ar-EG')}</td>
                  <td className="py-3 px-6">
                    {invoice.type === 'return' ? (
                        <span className="bg-red-200 text-red-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">مرتجع</span>
                    ) : (
                        <span className="bg-green-200 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">بيع</span>
                    )}
                  </td>
                  <td className="py-3 px-6">{invoice.items.length}</td>
                  <td className={`py-3 px-6 font-semibold ${invoice.type === 'return' ? 'text-red-600' : 'text-gray-800'}`}>{invoice.total.toFixed(2)}</td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setInvoiceToPrint(invoice)}
                          className="bg-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold hover:bg-blue-300"
                        >
                          عرض
                        </button>
                        {invoice.type === 'sale' && (
                             <button
                                onClick={() => setInvoiceForReturnRequest(invoice)}
                                className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold hover:bg-yellow-300"
                             >
                                طلب إرجاع
                            </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoicesView;