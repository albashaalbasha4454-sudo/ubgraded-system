import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ProductsView from './components/ProductsView';
import POSView from './components/POSView';
import InvoicesView from './components/InvoicesView';
import PrintInvoice from './components/PrintInvoice';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import LoginView from './components/LoginView';
import UsersView from './components/UsersView';
import RequestReturnModal from './components/RequestReturnModal';
import ReturnRequestsView from './components/ReturnRequestsView';
import ExpensesView from './components/ExpensesView';
import useLocalStorage from './hooks/useLocalStorage';
import useAuth from './hooks/useAuth';
import type { Product, Invoice, InvoiceItem, View, User, ReturnRequest, Expense } from './types';

// تم تعريف صلاحيات الوصول لكل شاشة بشكل مركزي وواضح
// هذا يضمن أن كل دور (مدير أو كاشير) يمكنه الوصول فقط إلى الشاشات المسموح بها
const VIEW_PERMISSIONS: { [key in View]: ('admin' | 'cashier')[] } = {
  'pos': ['admin', 'cashier'],
  'products': ['admin'],
  'invoices': ['admin', 'cashier'],
  'reports': ['admin'],
  'settings': ['admin'],
  'users': ['admin'],
  'return-requests': ['admin'],
  'expenses': ['admin'],
};


const App: React.FC = () => {
  const { currentUser, login, logout, users, addUser, deleteUser } = useAuth();
  const [products, setProducts] = useLocalStorage<Product[]>('products', []);
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>('invoices', []);
  const [returnRequests, setReturnRequests] = useLocalStorage<ReturnRequest[]>('returnRequests', []);
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', []);
  const [currentView, setCurrentView] = useState<View>('pos');
  const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
  const [invoiceForReturnRequest, setInvoiceForReturnRequest] = useState<Invoice | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useLocalStorage<number>('lowStockThreshold', 5);

  // هذا الـ hook يعمل كحارس أمني للشاشات
  // يتأكد في كل مرة يتغير فيها المستخدم أو الشاشة المعروضة من أن المستخدم لديه الصلاحية الكافية
  // إذا حاول كاشير الوصول لشاشة المدير، يتم إعادة توجيهه فوراً إلى شاشة نقطة البيع
  useEffect(() => {
    if (currentUser) {
      const allowedRoles = VIEW_PERMISSIONS[currentView];
      if (!allowedRoles || !allowedRoles.includes(currentUser.role)) {
        // إعادة التوجيه إلى الشاشة الافتراضية الآمنة
        setCurrentView('pos');
      }
    }
  }, [currentView, currentUser]);


  const addProduct = (product: Omit<Product, 'id'>) => {
    setProducts((prev) => [...prev, { ...product, id: crypto.randomUUID() }]);
  };

  const updateProduct = (updatedProduct: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };
  
  const addInvoice = (invoice: Omit<Invoice, 'id' | 'type'>, cartItems: InvoiceItem[]) => {
    const newInvoice: Invoice = { ...invoice, id: crypto.randomUUID(), type: 'sale' };
    setInvoices((prev) => [...prev, newInvoice]);

    setProducts(prevProducts => {
        const updatedProducts = [...prevProducts];
        cartItems.forEach(item => {
            const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
            if(productIndex !== -1) {
                updatedProducts[productIndex].quantity -= item.quantity;
            }
        });
        return updatedProducts;
    });
  };

  const addReturnRequest = (originalInvoice: Invoice, returnItems: InvoiceItem[]) => {
    if (!currentUser) return;

    const newRequest: ReturnRequest = {
      id: crypto.randomUUID(),
      originalInvoiceId: originalInvoice.id,
      originalInvoiceDate: originalInvoice.date,
      requestedBy: currentUser.username,
      requestDate: new Date().toISOString(),
      items: returnItems,
      status: 'pending',
    };
    setReturnRequests(prev => [newRequest, ...prev]);
    setInvoiceForReturnRequest(null);
    alert('تم إرسال طلب الإرجاع بنجاح وسيقوم المدير بمراجعته.');
  };

  const approveReturnRequest = (requestId: string) => {
    const request = returnRequests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending' || !currentUser) return;
    
    const totalReturned = request.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    const returnInvoice: Invoice = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      items: request.items,
      total: -totalReturned,
      type: 'return',
      originalInvoiceId: request.originalInvoiceId,
    };
    
    setInvoices(prev => [...prev, returnInvoice]);

    setProducts(prevProducts => {
      const updatedProducts = [...prevProducts];
      request.items.forEach(item => {
        const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
          updatedProducts[productIndex].quantity += item.quantity;
        }
      });
      return updatedProducts;
    });

    setReturnRequests(prev => prev.map(r => r.id === requestId 
      ? { ...r, status: 'approved', processedBy: currentUser.username, processedDate: new Date().toISOString() } 
      : r
    ));

    alert("تم قبول طلب المرتجع وتسجيله بنجاح.");
  };
  
  const rejectReturnRequest = (requestId: string) => {
    if (!currentUser) return;
    setReturnRequests(prev => prev.map(r => r.id === requestId
      ? { ...r, status: 'rejected', processedBy: currentUser.username, processedDate: new Date().toISOString() }
      : r
    ));
    alert("تم رفض طلب المرتجع.");
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    setExpenses((prev) => [...prev, { ...expense, id: crypto.randomUUID() }]);
  };

  const updateExpense = (updatedExpense: Expense) => {
    setExpenses((prev) => prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)));
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };


  if (!currentUser) {
    return <LoginView onLogin={login} />;
  }

  const renderView = () => {
    if (currentUser.role === 'admin') {
      switch (currentView) {
        case 'pos':
          return <POSView products={products} addInvoice={addInvoice} setInvoiceToPrint={setInvoiceToPrint} lowStockThreshold={lowStockThreshold} />;
        case 'products':
          return <ProductsView products={products} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} lowStockThreshold={lowStockThreshold} />;
        case 'invoices':
          return <InvoicesView invoices={invoices} setInvoiceToPrint={setInvoiceToPrint} setInvoiceForReturnRequest={setInvoiceForReturnRequest} user={currentUser} />;
        case 'reports':
          return <ReportsView invoices={invoices} products={products} expenses={expenses} />;
        case 'expenses':
          return <ExpensesView expenses={expenses} addExpense={addExpense} updateExpense={updateExpense} deleteExpense={deleteExpense} />;
        case 'settings':
          return <SettingsView products={products} invoices={invoices} setProducts={setProducts} setInvoices={setInvoices} lowStockThreshold={lowStockThreshold} setLowStockThreshold={setLowStockThreshold} />;
        case 'users':
          return <UsersView users={users} addUser={addUser} deleteUser={deleteUser} />;
        case 'return-requests':
          return <ReturnRequestsView requests={returnRequests} approveRequest={approveReturnRequest} rejectRequest={rejectReturnRequest} />;
        default:
          return <POSView products={products} addInvoice={addInvoice} setInvoiceToPrint={setInvoiceToPrint} lowStockThreshold={lowStockThreshold} />;
      }
    }

    if (currentUser.role === 'cashier') {
        switch (currentView) {
            case 'pos':
              return <POSView products={products} addInvoice={addInvoice} setInvoiceToPrint={setInvoiceToPrint} lowStockThreshold={lowStockThreshold} />;
            case 'invoices':
              return <InvoicesView invoices={invoices} setInvoiceToPrint={setInvoiceToPrint} setInvoiceForReturnRequest={setInvoiceForReturnRequest} user={currentUser} />;
            default:
              setCurrentView('pos');
              return <POSView products={products} addInvoice={addInvoice} setInvoiceToPrint={setInvoiceToPrint} lowStockThreshold={lowStockThreshold} />;
        }
    }
    
    return <div>وصول غير مصرح به.</div>;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        user={currentUser}
        onLogout={logout}
        products={products}
        lowStockThreshold={lowStockThreshold}
        pendingReturnRequests={returnRequests.filter(r => r.status === 'pending').length}
      />
      <main>
        {renderView()}
      </main>
      {invoiceToPrint && <PrintInvoice invoice={invoiceToPrint} onClose={() => setInvoiceToPrint(null)}/>}
      {invoiceForReturnRequest && (
        <RequestReturnModal 
          invoice={invoiceForReturnRequest} 
          onClose={() => setInvoiceForReturnRequest(null)}
          onSendRequest={addReturnRequest}
        />
      )}
      <footer className="text-center p-4 text-gray-500 text-sm print:hidden">
          <p>جميع البيانات محفوظة على هذا الجهاز فقط. قم بأخذ نسخة احتياطية من بياناتك بانتظام.</p>
          <p>&copy; {new Date().getFullYear()} برنامج محاسبة. كل الحقوق محفوظة.</p>
      </footer>
    </div>
  );
};

export default App;