

import React, { useEffect } from 'react';
import type { Invoice } from './types';
import { Logo } from './components/Logo';

interface PrintInvoiceProps {
  invoice: Invoice;
  onClose: () => void;
  shopName: string;
  shopAddress: string;
}

const PrintInvoice: React.FC<PrintInvoiceProps> = ({ invoice, onClose, shopName, shopAddress }) => {
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const subtotal = invoice.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscount = invoice.items.reduce((sum, item) => sum + ((item.discount || 0) * item.quantity), 0);

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 p-4 sm:p-8 overflow-y-auto print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto bg-white shadow-lg p-8 sm:p-12 relative print:shadow-none print:p-0">
        <div id="print-area" className="text-right" dir="rtl">
          {/* Logo Section - Top Center */}
          <div className="flex flex-col items-center mb-8 border-b-2 border-slate-800 pb-8">
            <Logo className="h-32 w-40" />
            <div className="text-center mt-4">
                <h1 className="text-4xl font-black text-slate-800">سوق الكتاب</h1>
                <p className="text-slate-500 font-medium tracking-widest">SOQQ ALKETAB</p>
                <p className="text-sm text-slate-400 mt-1">@soqalketab</p>
            </div>
          </div>

          {/* Invoice Details Section */}
          <div className="flex justify-between items-end mb-10 bg-slate-50 p-6 rounded-xl border border-slate-100">
            <div className="text-right">
                <h2 className="text-5xl font-black text-slate-200 uppercase tracking-widest mb-4">INVOICE</h2>
                <div className="space-y-2 text-base">
                    <p><span className="text-slate-400 ml-2">رقم الفاتورة:</span> <span className="font-mono font-bold text-slate-800 text-lg">#{invoice.id.substring(0,8).toUpperCase()}</span></p>
                </div>
            </div>
            <div className="text-left space-y-1 text-sm">
                <p><span className="text-slate-400 ml-2">التاريخ:</span> <span className="font-bold text-slate-800">{new Date(invoice.date).toLocaleDateString('ar-EG')}</span></p>
                <p><span className="text-slate-400 ml-2">الوقت:</span> <span className="font-bold text-slate-800">{new Date(invoice.date).toLocaleTimeString('ar-EG')}</span></p>
            </div>
          </div>

          {/* Customer & Shop Info */}
          <div className="grid grid-cols-2 gap-10 mb-10">
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">معلومات العميل</h3>
                {invoice.customerInfo ? (
                    <div className="space-y-1">
                        <p className="font-bold text-lg text-slate-800">{invoice.customerInfo.name}</p>
                        {invoice.customerInfo.phone && <p className="text-slate-600">هاتف: {invoice.customerInfo.phone}</p>}
                        {invoice.customerInfo.address && <p className="text-slate-600">العنوان: {invoice.customerInfo.address}</p>}
                    </div>
                ) : (
                    <p className="text-slate-600">بيع مباشر</p>
                )}
            </div>
            <div className="text-left">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1 text-left">من</h3>
                <div className="space-y-1">
                    <p className="font-bold text-lg text-slate-800">{shopName}</p>
                    <p className="text-slate-600">{shopAddress}</p>
                    <p className="text-slate-500 text-xs">نظام إدارة سوق الكتاب</p>
                </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-10">
            <table className="w-full text-right border-collapse">
                <thead>
                    <tr className="bg-slate-800 text-white">
                        <th className="p-3 text-sm font-bold rounded-tr-lg">#</th>
                        <th className="p-3 text-sm font-bold">الصنف / الكتاب</th>
                        <th className="p-3 text-sm font-bold text-center">الكمية</th>
                        <th className="p-3 text-sm font-bold text-left">سعر الوحدة</th>
                        <th className="p-3 text-sm font-bold text-left">الخصم</th>
                        <th className="p-3 text-sm font-bold text-left rounded-tl-lg">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items.map((item, index) => (
                        <tr key={item.productId} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} page-break-inside-avoid`}>
                            <td className="p-3 text-slate-400 text-xs">{index + 1}</td>
                            <td className="p-3 font-bold text-slate-800">{item.productName}</td>
                            <td className="p-3 text-center text-slate-700">{item.quantity}</td>
                            <td className="p-3 text-left text-slate-700">{item.price.toFixed(2)}</td>
                            <td className="p-3 text-left text-red-500">{(item.discount || 0).toFixed(2)}</td>
                            <td className="p-3 text-left font-bold text-slate-800">{((item.price - (item.discount || 0)) * item.quantity).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-between items-start gap-10">
            <div className="flex-1">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">ملاحظات وتواصل</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        شكراً لتعاملكم مع سوق الكتاب. يرجى الاحتفاظ بهذه الفاتورة للمراجعة. 
                    </p>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded-lg shadow-sm">
                                    <i className="material-symbols-outlined text-lg">call</i>
                                </div>
                                <span className="font-bold text-slate-700">واتساب</span>
                            </div>
                            <span className="font-mono text-slate-500">0940392619</span>
                        </div>
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg shadow-sm">
                                    <i className="material-symbols-outlined text-lg">facebook</i>
                                </div>
                                <span className="font-bold text-slate-700">فيسبوك</span>
                            </div>
                            <span className="text-slate-500">SooqAlketab</span>
                        </div>
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white rounded-lg shadow-sm">
                                    <i className="material-symbols-outlined text-lg">photo_camera</i>
                                </div>
                                <span className="font-bold text-slate-700">انستقرام</span>
                            </div>
                            <span className="text-slate-500">Sooq_alketab</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm p-2">
                    <span className="text-slate-500">المجموع الفرعي:</span>
                    <span className="font-medium text-slate-800">{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm p-2 text-red-500">
                    <span>إجمالي الخصم:</span>
                    <span>-{totalDiscount.toFixed(2)}</span>
                </div>
                {invoice.shippingFee > 0 && (
                    <div className="flex justify-between text-sm p-2">
                        <span className="text-slate-500">رسوم الشحن:</span>
                        <span className="font-medium text-slate-800">{invoice.shippingFee.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between text-xl font-black p-3 bg-slate-800 text-white rounded-lg shadow-md">
                    <span>الإجمالي:</span>
                    <span>{invoice.total.toFixed(2)}</span>
                </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-20 text-center border-t border-slate-100 pt-6">
            <p className="text-slate-400 text-xs">تم إنشاء هذه الفاتورة بواسطة نظام سوق الكتاب الذكي</p>
          </div>
        </div>

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 print:hidden flex gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/20 z-50">
           <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-900 transition-all hover:scale-105 active:scale-95 shadow-lg"
          >
            <span className="material-symbols-outlined">print</span>
            طباعة الفاتورة
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-white text-slate-600 px-8 py-3 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">close</span>
            إغلاق
          </button>
        </div>
      </div>
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .page-break-inside-avoid { page-break-inside: avoid; }
          @page { margin: 2cm; }
        }
      `}</style>
    </div>
  );
};

export default PrintInvoice;