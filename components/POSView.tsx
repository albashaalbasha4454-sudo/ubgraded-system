import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Product, InvoiceItem, Customer } from '../types';
import ShippingOrderModal from './ShippingOrderModal';
import ReservationModal from './ReservationModal';
import Modal from './Modal';
import InputField from './common/InputField';


const RequestBookModal: React.FC<{
  productName: string;
  onClose: () => void;
  onConfirm: (customerName: string, customerPhone: string) => void;
}> = ({ productName, onClose, onConfirm }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('اسم العميل ورقم هاتفه مطلوبان.');
      return;
    }
    onConfirm(customerName, customerPhone);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`طلب توفير المنتج: ${productName}`}>
      <form onSubmit={handleSubmit}>
        <p className="mb-4 text-sm text-slate-600">سيتم إرسال طلب للمدير لتوفير هذا المنتج. الرجاء إدخال بيانات العميل.</p>
        <InputField id="customerName" label="اسم العميل" value={customerName} onChange={e => setCustomerName(e.target.value)} />
        <InputField id="customerPhone" label="رقم هاتف العميل" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" />
        {error && <p className="text-red-500 text-xs italic">{error}</p>}
        <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors">إلغاء</button>
          <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">إرسال الطلب</button>
        </div>
      </form>
    </Modal>
  );
};


interface POSViewProps {
  products: Product[];
  customers: Customer[];
  onCompleteSale: (items: InvoiceItem[]) => void;
  onCreateShippingOrder: (cart: InvoiceItem[], customerInfo: any, shippingFee: number, source: any) => void;
  onCreateReservation: (cart: InvoiceItem[], customerInfo: any) => void;
  onAddRequestedBook: (bookName: string, customerName: string, customerPhone: string) => void;
  lowStockThreshold: number;
}

const POSView: React.FC<POSViewProps> = ({ products, customers, onCompleteSale, onCreateShippingOrder, onCreateReservation, onAddRequestedBook, lowStockThreshold }) => {
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [productToRequest, setProductToRequest] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    return products.filter(p => 
        (p.name.toLowerCase().includes(lowerSearchTerm) || p.author?.toLowerCase().includes(lowerSearchTerm)) 
    ).slice(0, 10); // Limit results for performance
  }, [products, searchTerm]);

  const addToCart = (product: Product) => {
    if (product.type === 'product' && product.quantity <= 0) {
        setProductToRequest(product.name);
        setIsRequestModalOpen(true);
        return;
    }
    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      if (product.type === 'service' || existingItem.quantity < product.quantity) {
        setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      } else {
        alert('الكمية المطلوبة غير متوفرة في المخزون.');
      }
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.salePrice ?? product.price,
        costPrice: product.costPrice,
      }]);
    }
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const updateCartItem = (productId: string, newQuantity: number, newDiscount: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.type === 'product' && newQuantity > product.quantity) {
        alert('الكمية المطلوبة غير متوفرة في المخزون.');
        newQuantity = product.quantity;
    }
    
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId));
    } else {
      setCart(cart.map(item => item.productId === productId ? { ...item, quantity: newQuantity, discount: newDiscount } : item));
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.quantity, 0);

  const handleCompleteSale = () => {
    if (cart.length === 0) return;
    onCompleteSale(cart);
    setCart([]);
  };

  const handleCreateShippingOrder = (customerInfo: any, shippingFee: number, source: any) => {
      onCreateShippingOrder(cart, customerInfo, shippingFee, source);
      setIsShippingModalOpen(false);
      setCart([]);
  }
  
  const handleCreateReservation = (customerInfo: any) => {
      onCreateReservation(cart, customerInfo);
      setIsReservationModalOpen(false);
      setCart([]);
  }

  const handleRequestProductClick = () => {
    if(searchTerm.trim()) {
        setProductToRequest(searchTerm.trim());
        setIsRequestModalOpen(true);
    }
  }

  const handleConfirmRequest = (customerName: string, customerPhone: string) => {
    onAddRequestedBook(productToRequest, customerName, customerPhone);
    setIsRequestModalOpen(false);
    setSearchTerm('');
    searchInputRef.current?.focus();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-4 sm:p-6 h-[calc(100vh-76px)]">
      {/* Product Search Area */}
      <div className="lg:col-span-3 bg-white shadow-lg rounded-xl flex flex-col p-6">
        <h3 className="text-2xl font-bold text-slate-800 mb-4">إضافة منتج للفاتورة</h3>
        <div className="relative mb-4">
          <span className="material-symbols-outlined absolute top-1/2 -translate-y-1/2 right-4 text-slate-400">search</span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="ابحث عن منتج بالاسم أو المؤلف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 ps-12 border border-slate-300 rounded-lg text-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          {searchTerm && (
            <div className="absolute z-10 w-full bg-white border border-slate-300 rounded-md mt-1 max-h-96 overflow-y-auto shadow-lg">
              {filteredProducts.map(p => {
                const isOutOfStock = p.type === 'product' && p.quantity <= 0;
                const isLowStock = p.type === 'product' && p.quantity > 0 && p.quantity <= lowStockThreshold;
                
                return (
                  <div key={p.id} onClick={() => !isOutOfStock && addToCart(p)} className={`p-4 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition-colors ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}>
                    <div className="flex-1">
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        <p className="text-sm text-slate-500">{p.author || p.category}</p>
                        <div className="flex gap-2 mt-1">
                            {isOutOfStock && <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">نفذ من المخزون</span>}
                            {isLowStock && <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-bold">مخزون منخفض</span>}
                            {p.type === 'service' && <span className="bg-sky-100 text-sky-700 text-[10px] px-2 py-0.5 rounded-full font-bold">خدمة</span>}
                        </div>
                    </div>
                    <div className="text-left flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                           {p.salePrice && <span className="line-through text-slate-400 text-sm">{p.price.toFixed(2)}</span>}
                           <p className="font-bold text-indigo-600">{(p.salePrice ?? p.price).toFixed(2)}</p>
                        </div>
                        {p.type === 'product' && <p className={`text-xs ${isOutOfStock ? 'text-red-500 font-bold' : 'text-slate-400'}`}>المخزون: {p.quantity}</p>}
                        {isOutOfStock && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setProductToRequest(p.name); setIsRequestModalOpen(true); }}
                                className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition-colors mt-1"
                            >
                                طلب توفير
                            </button>
                        )}
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="p-4 text-center text-slate-500">
                    <p>المنتج غير موجود أو غير متوفر.</p>
                    <button onClick={handleRequestProductClick} className="text-indigo-600 hover:underline font-semibold mt-1">هل تريد طلبه؟</button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-lg">
            <div className="text-center text-slate-400">
                <span className="material-symbols-outlined text-6xl">search</span>
                <p>ابحث عن منتج لإضافته إلى السلة</p>
            </div>
        </div>
      </div>

      {/* Cart Area */}
      <div className="lg:col-span-2 bg-white shadow-lg rounded-xl flex flex-col h-full">
        <h3 className="text-2xl font-bold p-4 border-b border-slate-200 flex-shrink-0">سلة المشتريات</h3>
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <span className="material-symbols-outlined text-6xl">shopping_cart_off</span>
                <p>السلة فارغة</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="mb-3 p-3 border-b border-slate-200 bg-white rounded-lg shadow-sm">
                <p className="font-bold text-slate-800">{item.productName}</p>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-bold">الكمية</label>
                      <input type="number" value={item.quantity} onChange={e => updateCartItem(item.productId, parseInt(e.target.value) || 1, item.discount || 0)} className="w-full p-1.5 border border-slate-200 rounded text-center text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-bold">خصم (مبلغ)</label>
                      <input type="number" placeholder="0.00" value={item.discount || ''} onChange={e => updateCartItem(item.productId, item.quantity, parseFloat(e.target.value) || 0)} className="w-full p-1.5 border border-slate-200 rounded text-center text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1 items-end justify-end">
                      <span className="text-[10px] text-slate-500 font-bold">المجموع</span>
                      <span className="font-bold text-base text-indigo-700">{((item.price - (item.discount || 0)) * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-slate-200 mt-auto flex-shrink-0 bg-slate-50 rounded-b-xl">
          <div className="text-3xl font-bold flex justify-between mb-4 text-slate-800">
            <span>الإجمالي:</span>
            <span>{cartTotal.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button onClick={handleCompleteSale} disabled={cart.length === 0} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-lg flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              إتمام البيع
            </button>
            <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setIsReservationModalOpen(true)} disabled={cart.length === 0} className="w-full bg-indigo-100 text-indigo-700 font-bold py-3 px-4 rounded-lg hover:bg-indigo-200 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">event_available</span>
                    حجز
                </button>
                <button onClick={() => setIsShippingModalOpen(true)} disabled={cart.length === 0} className="w-full bg-sky-100 text-sky-700 font-bold py-3 px-4 rounded-lg hover:bg-sky-200 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">local_shipping</span>
                    شحن
                </button>
            </div>
            <button 
                onClick={() => { if(window.confirm('هل أنت متأكد من إفراغ السلة؟')) setCart([]); }} 
                disabled={cart.length === 0} 
                className="w-full bg-slate-100 text-slate-500 font-bold py-2 px-4 rounded-lg hover:bg-red-50 hover:text-red-600 disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
            >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                إفراغ السلة
            </button>
          </div>
        </div>
      </div>
       {isShippingModalOpen && <ShippingOrderModal cart={cart} customers={customers} onClose={() => setIsShippingModalOpen(false)} onConfirm={handleCreateShippingOrder} />}
       {isReservationModalOpen && <ReservationModal cart={cart} customers={customers} onClose={() => setIsReservationModalOpen(false)} onConfirm={handleCreateReservation} />}
       {isRequestModalOpen && <RequestBookModal productName={productToRequest} onClose={() => setIsRequestModalOpen(false)} onConfirm={handleConfirmRequest} />}
    </div>
  );
};

export default POSView;