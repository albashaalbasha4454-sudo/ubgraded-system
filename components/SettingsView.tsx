import React from 'react';
import type { Product, Invoice, User } from '../types';

interface SettingsViewProps {
  products: Product[];
  invoices: Invoice[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  lowStockThreshold: number;
  setLowStockThreshold: React.Dispatch<React.SetStateAction<number>>;
}

const SettingsView: React.FC<SettingsViewProps> = ({ products, invoices, setProducts, setInvoices, lowStockThreshold, setLowStockThreshold }) => {
  
  const handleExport = () => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const dataToExport = {
        products,
        invoices,
        users,
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(dataToExport, null, 2)
      )}`;
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.href = jsonString;
      link.download = `pos-backup-${date}.json`;
      link.click();
    } catch (error) {
      console.error("Error exporting data:", error);
      alert('حدث خطأ أثناء تصدير البيانات.');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm('تحذير: سيؤدي استيراد البيانات إلى استبدال جميع المنتجات والفواتير والمستخدمين الحاليين. هل تريد المتابعة؟')) {
      event.target.value = ''; // Reset file input
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("File content is not valid text.");
        }
        const data = JSON.parse(text);

        // Basic validation
        if (Array.isArray(data.products) && Array.isArray(data.invoices) && Array.isArray(data.users)) {
          setProducts(data.products);
          setInvoices(data.invoices);
          localStorage.setItem('users', JSON.stringify(data.users));
          alert('تم استيراد البيانات بنجاح! يرجى تسجيل الخروج والدخول مرة أخرى لتطبيق تغييرات المستخدمين بشكل كامل.');
        } else {
          throw new Error('الملف غير صالح أو لا يحتوي على الصيغة الصحيحة (products, invoices, users).');
        }
      } catch (error) {
        console.error("Error importing data:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        alert(`فشل استيراد البيانات. يرجى التأكد من أن الملف صحيح.\nالخطأ: ${errorMessage}`);
      } finally {
        event.target.value = ''; // Reset file input
      }
    };
    reader.onerror = () => {
        alert('فشل في قراءة الملف.');
        event.target.value = '';
    }
    reader.readAsText(file);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">الإعدادات</h2>
      
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-3">المزامنة اليدوية و النسخ الاحتياطي</h3>
          <p className="text-gray-600 mb-6">
            استخدم هذه الأدوات لإنشاء نسخة احتياطية من بياناتك أو لنقلها يدوياً بين أجهزتك المختلفة (مثل الكمبيوتر والجوال).
          </p>

          <div className="space-y-6">
            
            {/* Step 1: Export */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white font-bold rounded-full">1</span>
                <h4 className="text-lg font-semibold text-gray-700">تصدير البيانات (نسخ احتياطي)</h4>
              </div>
              <p className="text-gray-600 mb-3 pl-11">
                اضغط على الزر لحفظ نسخة من جميع بياناتك (المنتجات، الفواتير، المستخدمين) في ملف واحد على هذا الجهاز.
              </p>
              <div className="pl-11">
                <button
                    onClick={handleExport}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                    تصدير نسخة احتياطية
                </button>
              </div>
            </div>
            
            {/* Step 2: Import */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 bg-green-600 text-white font-bold rounded-full">2</span>
                <h4 className="text-lg font-semibold text-gray-700">استيراد البيانات</h4>
              </div>
              <p className="text-gray-600 mb-3 pl-11">
                اختر ملف النسخة الاحتياطية لاستعادة بياناتك أو نقلها لجهاز جديد. 
                <strong className="text-red-600"> تحذير: سيتم مسح جميع البيانات الحالية على هذا الجهاز واستبدالها بالبيانات الموجودة في الملف.</strong>
              </p>
               <div className="pl-11">
                 <label htmlFor="import-file" className="cursor-pointer bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors inline-block">
                    اختر ملف للاستيراد
                  </label>
                  <input
                    id="import-file"
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
               </div>
            </div>

          </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-6">
        <h3 className="text-xl font-bold text-gray-800 mb-3">إعدادات المخزون</h3>
        <div className="mb-4">
          <label htmlFor="lowStockThreshold" className="block text-gray-700 text-sm font-bold mb-2">حد المخزون المنخفض</label>
          <p className="text-gray-600 text-sm mb-2">سيتم تنبيهك عندما تصل كمية المنتج إلى هذا الحد.</p>
          <input
            type="number"
            id="lowStockThreshold"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 0)}
            className="shadow appearance-none border rounded w-full md:w-1/3 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
      </div>

    </div>
  );
};

export default SettingsView;