import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import useAuth from './hooks/useAuth';
import { initialUsers, initialProducts, initialCustomers, initialSuppliers, initialAccounts } from './initialData';

import type { Product, Invoice, InvoiceItem, User, Expense, ReturnRequest, RequestedBook, Customer, Supplier, Purchase, FinancialAccount, FinancialTransaction, OrderType, OrderStatus, PaymentStatus, Budget, TillCloseout } from './types';

import LoginView from './components/LoginView';
import Header from './components/Header';
import POSView from './components/POSView';
import ProductsView from './components/ProductsView';
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import UsersView from './components/UsersView';
import ReturnRequestsView from './components/ReturnRequestsView';
import ExpensesView from './components/ExpensesView';
import AIChatAssistant from './components/AIChatAssistant';
import RequestedBooksView from './components/RequestedBooksView';
import PurchasesView from './components/PurchasesView';
import CustomersView from './components/CustomersView';
import SuppliersView from './components/SuppliersView';
import FinanceView from './components/FinanceView';
import OrdersView from './components/OrdersView';
import CloseTillModal from './components/CloseTillModal';
import TillCloseoutsView from './components/TillCloseoutsView';
import CashierToolsView from './components/CashierToolsView';
import ReportsView from './components/ReportsView';
import FinancialSummaryView from './components/FinancialSummaryView';


const simpleHash = (password: string, salt: string) => `hashed_${password}_with_${salt}`;

const App: React.FC = () => {
    // --- STATE MANAGEMENT ---
    const [users, setUsers] = useLocalStorage<User[]>('users', initialUsers);
    const { currentUser, login, logout } = useAuth(users);

    const [products, setProducts] = useLocalStorage<Product[]>('products', initialProducts);
    const [invoices, setInvoices] = useLocalStorage<Invoice[]>('invoices', []);
    const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', []);
    const [returnRequests, setReturnRequests] = useLocalStorage<ReturnRequest[]>('returnRequests', []);
    const [requestedBooks, setRequestedBooks] = useLocalStorage<RequestedBook[]>('requestedBooks', []);
    const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', initialCustomers);
    const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('suppliers', initialSuppliers);
    const [purchases, setPurchases] = useLocalStorage<Purchase[]>('purchases', []);
    const [accounts, setAccounts] = useLocalStorage<FinancialAccount[]>('financialAccounts', initialAccounts);
    const [transactions, setTransactions] = useLocalStorage<FinancialTransaction[]>('financialTransactions', []);
    const [budgets, setBudgets] = useLocalStorage<Budget[]>('budgets', []);
    const [tillCloseouts, setTillCloseouts] = useLocalStorage<TillCloseout[]>('tillCloseouts', []);
    
    const [currentView, setCurrentView] = useState(currentUser?.role === 'admin' ? 'dashboard' : 'pos');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [lowStockThreshold] = useLocalStorage<number>('lowStockThreshold', 5);
    const [shopName] = useLocalStorage<string>('shopName', 'اسم المحل');
    const [shopAddress] = useLocalStorage<string>('shopAddress', 'تفاصيل العنوان ورقم الهاتف');
    const [isCloseTillModalOpen, setIsCloseTillModalOpen] = useState(false);
    
    // --- COMPUTED VALUES ---
    const accountBalances = useMemo(() => {
        const balances = new Map<string, number>();
        accounts.forEach(acc => balances.set(acc.id, 0));
        transactions.forEach(tx => {
            if (tx.fromAccountId) {
                balances.set(tx.fromAccountId, (balances.get(tx.fromAccountId) || 0) - tx.amount);
            }
            if (tx.toAccountId) {
                balances.set(tx.toAccountId, (balances.get(tx.toAccountId) || 0) + tx.amount);
            }
        });
        return balances;
    }, [accounts, transactions]);

    // --- CENTRALIZED HANDLERS ---
    const addFinancialTransaction = useCallback((tx: Omit<FinancialTransaction, 'id' | 'date'>) => {
        const newTransaction: FinancialTransaction = {
            id: `tx-${Date.now()}`,
            date: new Date().toISOString(),
            ...tx
        };
        setTransactions(prev => [...prev, newTransaction]);
    }, [setTransactions]);

    const updateStock = useCallback((items: {
        productId: string;
        quantityChange: number;
        allocatedChange?: number;
    }[]) => {
        setProducts(prevProds => {
            const newProds = prevProds.map(p => ({...p}));
            
            items.forEach(item => {
                const prodIndex = newProds.findIndex(p => p.id === item.productId);
                if (prodIndex !== -1) {
                    const product = newProds[prodIndex];
                    // Only update quantity for physical products
                    if (product.type === 'product') {
                        product.quantity = Math.max(0, product.quantity + item.quantityChange);
                        if (item.allocatedChange) {
                            product.allocated = Math.max(0, (product.allocated || 0) + item.allocatedChange);
                        }
                        newProds[prodIndex] = product;
                    }
                }
            });
            return newProds;
        });
    }, [setProducts]);

    // --- CORE BUSINESS LOGIC ---
    // Products
    const addProduct = (product: Omit<Product, 'id'>) => {
        const newProduct = { ...product, id: `prod-${Date.now()}` };
        setProducts(prev => [...prev, newProduct]);
        return newProduct;
    };
    const updateProduct = (id: string, updatedProduct: Omit<Product, 'id'>) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updatedProduct, id } : p));
    };
    const deleteProduct = (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
        setProducts(prev => prev.filter(p => p.id !== id));
    };
    
    const updatePricesBatch = (operation: 'multiply' | 'divide', factor: number) => {
        if (isNaN(factor) || factor <= 0) {
            alert("المعامل يجب أن يكون رقمًا موجبًا.");
            return;
        }
        setProducts(prev => prev.map(p => ({
            ...p,
            price: operation === 'multiply' ? p.price * factor : p.price / factor,
            costPrice: p.costPrice ? (operation === 'multiply' ? p.costPrice * factor : p.costPrice / factor) : undefined
        })));
        alert("تم تحديث الأسعار بنجاح.");
    };

    const batchUpdateProducts = (productIds: string[], discountPercent: number) => {
        if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
            alert("الرجاء إدخال نسبة خصم صالحة بين 0 و 100.");
            return;
        }
        const factor = 1 - (discountPercent / 100);
        setProducts(prev => prev.map(p => {
            if (productIds.includes(p.id)) {
                // Set salePrice to null or undefined if discount is 0 to remove it
                const newSalePrice = discountPercent === 0 ? undefined : parseFloat((p.price * factor).toFixed(2));
                return {
                    ...p,
                    salePrice: newSalePrice
                };
            }
            return p;
        }));
        alert(`تم تطبيق خصم ${discountPercent}% على ${productIds.length} منتج.`);
    };


    // Orders (Sales, Shipping, Reservations)
    const createOrder = (type: OrderType, items: InvoiceItem[], customerInfo?: Invoice['customerInfo'], shippingFee: number = 0, source?: Invoice['source']) => {
        if (!currentUser) throw new Error("No user is logged in.");

        const total = items.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.quantity, 0) + shippingFee;
        const totalCost = items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
        
        const newOrder: Invoice = {
            id: `${type.slice(0,3)}-${Date.now()}`,
            date: new Date().toISOString(),
            type,
            items: items.map(item => ({...item})),
            total,
            totalCost,
            totalProfit: total - totalCost - shippingFee,
            customerInfo,
            shippingFee,
            source,
            status: type === 'sale' ? 'completed' : 'pending',
            paymentStatus: type === 'sale' ? 'paid' : 'unpaid',
            processedBy: currentUser.username,
        };
        
        setInvoices(prev => [...prev, newOrder]);
        
        const itemsToUpdate = items.map(i => ({
            productId: i.productId,
            quantityChange: -i.quantity,
            allocatedChange: (type === 'shipping' || type === 'reservation') ? i.quantity : 0
        }));
        updateStock(itemsToUpdate);

        if (type === 'sale') { // Quick sale is paid immediately
            const targetAccountId = 'cash-default';

            addFinancialTransaction({
                description: `إيراد من فاتورة بيع رقم ${newOrder.id.substring(0,8)} (بواسطة ${currentUser.username})`,
                amount: newOrder.total,
                type: 'sale_income',
                toAccountId: targetAccountId,
                relatedInvoiceId: newOrder.id
            });
            newOrder.paidDate = new Date().toISOString();
        }
        return newOrder;
    };

    const onCompleteSale = (items: InvoiceItem[]) => {
        if (!window.confirm('هل أنت متأكد من إتمام عملية البيع؟')) return;
        createOrder('sale', items);
    };
    const onCreateShippingOrder = (cart: InvoiceItem[], customerInfo: any, shippingFee: number, source: any) => {
        if (!window.confirm('هل أنت متأكد من إنشاء طلب الشحن؟')) return;
        createOrder('shipping', cart, customerInfo, shippingFee, source);
    };
    const onCreateReservation = (cart: InvoiceItem[], customerInfo: any) => {
        if (!window.confirm('هل أنت متأكد من إنشاء هذا الحجز؟')) return;
        createOrder('reservation', cart, customerInfo);
    };

    const updateOrderStatus = (orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) => {
        if (!window.confirm(`هل أنت متأكد من تغيير حالة الطلب إلى "${status}"؟`)) return;
        setInvoices(prev => prev.map(inv => {
            if (inv.id === orderId) {
                const wasCancelled = inv.status !== 'cancelled' && status === 'cancelled';
                const wasCompleted = inv.status !== 'completed' && status === 'completed' && inv.type === 'shipping';
                
                if (wasCancelled) {
                    const itemsToUpdate = inv.items.map(i => ({
                        productId: i.productId,
                        quantityChange: i.quantity,
                        allocatedChange: (inv.type === 'shipping' || inv.type === 'reservation') ? -i.quantity : 0
                    }));
                    updateStock(itemsToUpdate);
                }
                if (wasCompleted) {
                    const itemsToUpdate = inv.items.map(i => ({
                        productId: i.productId,
                        quantityChange: 0,
                        allocatedChange: -i.quantity
                    }));
                    updateStock(itemsToUpdate);
                }
                
                const updatedInvoice = { ...inv, status };
                if (paymentStatus) {
                    updatedInvoice.paymentStatus = paymentStatus;
                    if(paymentStatus === 'paid' && !inv.paidDate) {
                        updatedInvoice.paidDate = new Date().toISOString();
                         addFinancialTransaction({
                            description: `تحصيل فاتورة ${inv.type} رقم ${inv.id.substring(0,8)} (بواسطة ${inv.processedBy || 'غير معروف'})`,
                            amount: inv.total,
                            type: 'sale_income',
                            toAccountId: 'cash-default',
                            relatedInvoiceId: inv.id
                        });
                    }
                }
                return updatedInvoice;
            }
            return inv;
        }));
    };
    
    const onConvertToSale = (reservation: Invoice) => {
        if (!currentUser) return;
        if (!window.confirm(`هل أنت متأكد من تحويل الحجز رقم ${reservation.id.substring(0,8)} إلى عملية بيع؟ سيتم تحصيل مبلغ ${reservation.total}.`)) return;
        setInvoices(prev => prev.map(inv => inv.id === reservation.id ? { ...inv, type: 'sale', status: 'completed', paymentStatus: 'paid', paidDate: new Date().toISOString(), processedBy: currentUser.username } : inv));
        
        const itemsToUpdate = reservation.items.map(i => ({
            productId: i.productId,
            quantityChange: 0,
            allocatedChange: -i.quantity
        }));
        updateStock(itemsToUpdate);

        const targetAccountId = 'cash-default';
        
        addFinancialTransaction({
            description: `إيراد من تحويل الحجز ${reservation.id.substring(0,8)} (بواسطة ${currentUser.username})`,
            amount: reservation.total,
            type: 'sale_income',
            toAccountId: targetAccountId,
            relatedInvoiceId: reservation.id
        });
    };

    // Returns
    const processReturn = (originalInvoiceId: string, returnItems: InvoiceItem[]) => {
        if (!currentUser) return;
        if (!window.confirm('هل أنت متأكد من إتمام عملية الإرجاع؟ سيتم استرداد المبلغ وتحديث المخزون.')) return;
        const total = returnItems.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.quantity, 0);
        const totalProfit = returnItems.reduce((sum, item) => sum + ((item.price - (item.discount || 0)) - (item.costPrice || 0)) * item.quantity, 0);
        const newReturnInvoice: Invoice = {
            id: `ret-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'return',
            items: returnItems,
            total: -total,
            totalProfit: -totalProfit,
            status: 'completed',
            paymentStatus: 'paid', // Refund is considered a 'paid' transaction
            processedBy: currentUser.username,
        };
        setInvoices(prev => [...prev, newReturnInvoice]);
        updateStock(returnItems.map(i => ({ productId: i.productId, quantityChange: i.quantity })));
        
        const sourceAccountId = 'cash-default';

        addFinancialTransaction({
            description: `مرتجع من فاتورة ${originalInvoiceId.substring(0, 8)} (بواسطة ${currentUser.username})`,
            amount: total,
            type: 'return_refund',
            fromAccountId: sourceAccountId,
            relatedInvoiceId: newReturnInvoice.id,
            category: 'مرتجعات'
        });
    };

    const sendReturnRequest = (originalInvoice: Invoice, returnItems: InvoiceItem[]) => {
        if (!currentUser) return;
        const newRequest: ReturnRequest = {
            id: `req-ret-${Date.now()}`,
            requestDate: new Date().toISOString(),
            originalInvoiceId: originalInvoice.id,
            requestedBy: currentUser.username,
            status: 'pending',
            items: returnItems,
        };
        setReturnRequests(prev => [...prev, newRequest]);
        alert('تم إرسال طلب الإرجاع للمراجعة.');
    };

    const approveRequest = (requestId: string) => {
        if (!currentUser) return;
        if (!window.confirm('هل أنت متأكد من الموافقة على طلب الإرجاع؟ سيتم معالجة العملية مالياً وفي المخزون.')) return;
        const request = returnRequests.find(r => r.id === requestId);
        if (request && request.status === 'pending') {
            processReturn(request.originalInvoiceId, request.items);
            setReturnRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved', processedBy: currentUser.username, processedDate: new Date().toISOString() } : r));
        }
    };

    const rejectRequest = (requestId: string) => {
        if (!currentUser) return;
        if (!window.confirm('هل أنت متأكد من رفض طلب الإرجاع؟')) return;
        setReturnRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected', processedBy: currentUser.username, processedDate: new Date().toISOString() } : r));
    };

    const addTillCloseout = (data: Omit<TillCloseout, 'id'>) => {
        setTillCloseouts(prev => [...prev, { ...data, id: `closeout-${Date.now()}` }]);
    };

    const onAddRequestedBook = (bookName: string, customerName: string, customerPhone: string) => {
        setRequestedBooks(prev => {
            const existing = prev.find(b => b.name.toLowerCase() === bookName.toLowerCase());
            if (existing) {
                return prev.map(b => b.id === existing.id ? { ...b, requestedCount: b.requestedCount + 1, lastRequestedDate: new Date().toISOString() } : b);
            } else {
                return [...prev, {
                    id: `req-${Date.now()}`,
                    name: bookName,
                    requestedCount: 1,
                    lastRequestedDate: new Date().toISOString(),
                    status: 'pending',
                    customerName,
                    customerPhone,
                }];
            }
        });
        alert(`تم تسجيل طلب للمنتج "${bookName}" باسم العميل ${customerName}.`);
    };

    const updateRequestedBookStatus = (id: string, status: 'fulfilled' | 'pending') => {
        setRequestedBooks(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    };
    
    // Purchases
    const onAddPurchase = (purchaseData: Omit<Purchase, 'id'>) => {
        if (!window.confirm('هل أنت متأكد من إنشاء فاتورة الشراء هذه؟ سيتم تحديث المخزون والحسابات المالية.')) return;
        const newPurchase: Purchase = {
            id: `pur-${Date.now()}`,
            ...purchaseData,
            isStockedIn: true, // Auto stock-in
        };
        setPurchases(p => [...p, newPurchase]);

        // Immediately update stock levels
        const stockUpdates = newPurchase.items.map(item => ({
            productId: item.productId,
            quantityChange: item.quantity
        }));
        updateStock(stockUpdates);
    };
    const onUpdatePurchase = (id: string, purchase: Purchase) => setPurchases(p => p.map(pu => pu.id === id ? purchase : pu));
    const onDeletePurchase = (id: string) => setPurchases(p => p.filter(pu => pu.id !== id));
    
    const addPurchasePayment = (purchaseId: string, amount: number, accountId: string) => {
        if (!window.confirm(`هل أنت متأكد من دفع مبلغ ${amount}؟ سيتم خصم المبلغ من الحساب المختار.`)) return;
        const purchase = purchases.find(p => p.id === purchaseId);
        if (!purchase) return;

        const newPayments = [...purchase.payments, { date: new Date().toISOString(), amount, accountId }];
        const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        
        let paymentStatus: PaymentStatus = 'partial';
        if (totalPaid >= purchase.totalCost) paymentStatus = 'paid';
        else if (totalPaid === 0) paymentStatus = 'unpaid';

        onUpdatePurchase(purchaseId, { ...purchase, payments: newPayments, paymentStatus });
        addFinancialTransaction({
            description: `دفعة للمورد ${purchase.supplierName} عن فاتورة ${purchase.id.substring(0,8)}`,
            amount,
            type: 'supplier_payment',
            fromAccountId: accountId,
            relatedPurchaseId: purchase.id
        });
    };
    
    // Expenses
    const addExpense = (expense: Omit<Expense, 'id'>) => {
        if (!window.confirm(`هل أنت متأكد من تسجيل مصروف بمبلغ ${expense.amount}؟`)) return;
        const newExpense = { ...expense, id: `exp-${Date.now()}` };
        setExpenses(prev => [...prev, newExpense]);
        addFinancialTransaction({
            description: newExpense.description,
            amount: newExpense.amount,
            type: 'expense',
            fromAccountId: newExpense.accountId,
            category: newExpense.category
        });
    };

    const deleteExpense = (id: string) => {
        const expenseToDelete = expenses.find(e => e.id === id);
        if (expenseToDelete) {
            if (!window.confirm('هل أنت متأكد من إلغاء هذا المصروف؟ سيتم استرداد المبلغ للحساب.')) return;
            setExpenses(prev => prev.filter(e => e.id !== id));
            addFinancialTransaction({
                description: `إلغاء المصروف: ${expenseToDelete.description}`,
                amount: expenseToDelete.amount,
                type: 'expense_reversal',
                toAccountId: expenseToDelete.accountId,
                category: expenseToDelete.category
            });
        }
    };

    // Financial Accounts
    const onSaveAccount = (data: Omit<FinancialAccount, 'id'>) => {
        setAccounts(prev => [...prev, {...data, id: `acc-${Date.now()}`}]);
    };
    
    // FIX: Implement missing user management functions.
    const addUser = (userData: Omit<User, 'id' | 'passwordHash' | 'salt'> & { password: string }): User => {
        const salt = `salt_${Date.now()}_${Math.random()}`;
        const newUser: User = {
            id: `user-${Date.now()}`,
            username: userData.username,
            role: userData.role,
            salt,
            passwordHash: simpleHash(userData.password, salt)
        };
        setUsers(prev => [...prev, newUser]);
        return newUser;
    };

    const updateUser = (id: string, userData: Partial<Omit<User, 'id' | 'passwordHash' | 'salt'>> & { password?: string }) => {
        setUsers(prev => prev.map(u => {
            if (u.id === id) {
                const updatedUser: User = { ...u };
                if (userData.username) updatedUser.username = userData.username;
                if (userData.role) updatedUser.role = userData.role;

                if (userData.password) {
                    const newSalt = `salt_${Date.now()}_${Math.random()}`;
                    updatedUser.salt = newSalt;
                    updatedUser.passwordHash = simpleHash(userData.password, newSalt);
                }
                return updatedUser;
            }
            return u;
        }));
    };

    const deleteUser = (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        setUsers(prev => prev.filter(u => u.id !== id));
    };

    // Other
    const addCustomer = (customer: Omit<Customer, 'id'>) => { const newCust = {id: `cust-${Date.now()}`, ...customer}; setCustomers(c => [...c, newCust]); return newCust; };
    const updateCustomer = (id: string, customer: Omit<Customer, 'id'>) => { setCustomers(c => c.map(cu => cu.id === id ? {id, ...customer} : cu)) };
    const deleteCustomer = (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
        setCustomers(c => c.filter(cu => cu.id !== id));
    };
    const onAddSupplier = (supplier: Omit<Supplier, 'id'>): Supplier => { const newSup = {...supplier, id: `sup-${Date.now()}`}; setSuppliers(p => [...p, newSup]); return newSup;};
    const updateSupplier = (id: string, supplier: Omit<Supplier, 'id'>) => { setSuppliers(s => s.map(su => su.id === id ? {id, ...supplier} : su)) };
    const deleteSupplier = (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
        setSuppliers(s => s.filter(su => su.id !== id));
    };

    // --- RENDER LOGIC ---
    if (!currentUser) {
        return <LoginView onLogin={login} />;
    }

    const views: { [key: string]: {element: React.ReactNode, label: string, icon: string, roles: Array<'admin' | 'cashier'>} } = {
        dashboard: { element: <DashboardView invoices={invoices} expenses={expenses} products={products} customers={customers} lowStockThreshold={lowStockThreshold} />, label: "لوحة التحكم", icon: "dashboard", roles: ['admin'] },
        reports: { element: <ReportsView invoices={invoices} products={products} expenses={expenses} />, label: "التقارير", icon: "analytics", roles: ['admin'] },
        financialSummary: { element: <FinancialSummaryView invoices={invoices} expenses={expenses} transactions={transactions} purchases={purchases} accountBalances={accountBalances} />, label: "الملخص المالي", icon: "summarize", roles: ['admin'] },
        pos: { element: <POSView products={products} customers={customers} onCompleteSale={onCompleteSale} onCreateShippingOrder={onCreateShippingOrder} onCreateReservation={onCreateReservation} onAddRequestedBook={onAddRequestedBook} lowStockThreshold={lowStockThreshold} />, label: "نقطة البيع", icon: "point_of_sale", roles: ['admin', 'cashier'] },
        orders: { element: <OrdersView invoices={invoices} users={users} onUpdateStatus={updateOrderStatus} onConvertToSale={onConvertToSale} processReturn={processReturn} sendReturnRequest={sendReturnRequest} currentUser={currentUser} shopName={shopName} shopAddress={shopAddress} />, label: "الطلبات", icon: "receipt_long", roles: ['admin', 'cashier'] },
        returnRequests: { element: <ReturnRequestsView requests={returnRequests} approveRequest={approveRequest} rejectRequest={rejectRequest} />, label: "طلبات الإرجاع", icon: "rule", roles: ['admin'] },
        products: { element: <ProductsView products={products} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} lowStockThreshold={lowStockThreshold} onBatchUpdate={batchUpdateProducts} />, label: "المخزون", icon: "inventory_2", roles: ['admin'] },
        requestedBooks: { element: <RequestedBooksView requestedBooks={requestedBooks} updateRequestedBookStatus={updateRequestedBookStatus} />, label: "المنتجات المطلوبة", icon: "checklist", roles: ['admin'] },
        purchases: { element: <PurchasesView purchases={purchases} products={products} suppliers={suppliers} accounts={accounts} accountBalances={accountBalances} onAddPurchase={onAddPurchase} onUpdatePurchase={onUpdatePurchase} onDeletePurchase={onDeletePurchase} onAddSupplier={onAddSupplier} onAddPayment={addPurchasePayment} createProduct={addProduct} updateProduct={updateProduct} />, label: "المشتريات", icon: "shopping_bag", roles: ['admin'] },
        expenses: { element: <ExpensesView expenses={expenses} addExpense={addExpense} accounts={accounts} />, label: "المصروفات", icon: "payments", roles: ['admin'] },
        customers: { element: <CustomersView customers={customers} addCustomer={addCustomer} updateCustomer={updateCustomer} deleteCustomer={deleteCustomer} />, label: "العملاء", icon: "groups", roles: ['admin'] },
        suppliers: { element: <SuppliersView suppliers={suppliers} addSupplier={onAddSupplier} updateSupplier={updateSupplier} deleteSupplier={deleteSupplier} />, label: "الموردون", icon: "store", roles: ['admin'] },
        finance: { element: <FinanceView accounts={accounts} accountBalances={accountBalances} transactions={transactions} budgets={budgets} onSaveAccount={onSaveAccount} onSaveTransaction={addFinancialTransaction} onSaveBudget={(b) => setBudgets(p=>[...p, {...b, id: `budget-${Date.now()}`}])} />, label: "الخزينة", icon: "account_balance", roles: ['admin'] },
        tillCloseouts: { element: <TillCloseoutsView tillCloseouts={tillCloseouts} />, label: "تقارير الصناديق", icon: "archive", roles: ['admin'] },
        users: { element: <UsersView users={users} addUser={addUser} updateUser={updateUser} deleteUser={deleteUser} currentUser={currentUser} />, label: "المستخدمون", icon: "manage_accounts", roles: ['admin'] },
        cashierTools: { element: <CashierToolsView currentUser={currentUser} />, label: "إدارة البيانات", icon: "database", roles: ['cashier'] },
        settings: { element: <SettingsView onUpdatePrices={updatePricesBatch} />, label: "الإعدادات", icon: "settings", roles: ['admin'] },
    };

    const SidebarLink: React.FC<{viewKey: string}> = ({viewKey}) => {
        const view = views[viewKey];
        if (!view || !view.roles.includes(currentUser.role)) return null;
        return (
            <button onClick={() => { setCurrentView(viewKey); setIsSidebarOpen(false); }} className={`w-full text-right flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${currentView === viewKey ? 'bg-indigo-600 text-white' : 'hover:bg-gray-200 text-gray-700'}`}>
                <span className="material-symbols-outlined">{view.icon}</span>
                <span>{view.label}</span>
            </button>
        );
    };
    
    const adminSidebarOrder = ['dashboard', 'reports', 'financialSummary', 'pos', 'orders', 'returnRequests', 'products', 'requestedBooks', 'purchases', 'expenses', 'customers', 'suppliers', 'finance', 'tillCloseouts', 'users', 'settings'];
    const cashierSidebarOrder = ['pos', 'orders', 'cashierTools'];

    const sidebarOrder = currentUser.role === 'admin' ? adminSidebarOrder : cashierSidebarOrder;


    return (
        <div className="flex h-screen bg-gray-100" dir="rtl">
            <aside className={`bg-gray-50 border-l border-gray-200 h-full transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out w-64 fixed md:static right-0 z-30 md:flex-shrink-0`}>
                 <div className="p-4">
                    <h2 className="text-2xl font-bold text-indigo-700 text-center">المكتبة</h2>
                </div>
                <nav className="p-4 space-y-2">
                    {sidebarOrder.map(key => <SidebarLink key={key} viewKey={key} />)}
                </nav>
            </aside>
             {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"></div>}

            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    currentUser={currentUser} 
                    onLogout={logout} 
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    onOpenCloseTillModal={() => setIsCloseTillModalOpen(true)}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                    {views[currentView]?.element || views[currentUser.role === 'admin' ? 'dashboard' : 'pos'].element}
                </main>
            </div>
            {currentUser.role === 'admin' && 
                <AIChatAssistant 
                    products={products}
                    invoices={invoices}
                    expenses={expenses}
                    customers={customers}
                    lowStockThreshold={lowStockThreshold}
                    addProduct={addProduct}
                    updateProduct={updateProduct}
                    deleteProduct={deleteProduct}
                    addExpense={(exp) => addExpense({...exp, accountId: 'cash-default'})}
                    deleteExpense={deleteExpense}
                    addCustomer={addCustomer}
                    updateCustomer={updateCustomer}
                    deleteCustomer={deleteCustomer}
                    onCompleteSale={onCompleteSale}
                />
            }
            {isCloseTillModalOpen && currentUser && (
                <CloseTillModal
                    invoices={invoices}
                    currentUser={currentUser}
                    onClose={() => setIsCloseTillModalOpen(false)}
                    onConfirmCloseout={addTillCloseout}
                />
            )}
        </div>
    );
};

export default App;