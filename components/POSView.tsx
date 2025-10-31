import React, { useState } from 'react';
import type { Product, InvoiceItem, Invoice } from '../types';

interface POSViewProps {
  products: Product[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'type'>, cartItems: InvoiceItem[]) => void;
  setInvoiceToPrint: (invoice: Invoice | null) => void;
  lowStockThreshold: number;
}

const POSView: React.FC<POSViewProps> = ({ products, addInvoice, setInvoiceToPrint, lowStockThreshold }) => {
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      alert("هذا المنتج غير متوفر في المخزون.");
      return;
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.productId === product.id);
      if (existingItem) {
        if (existingItem.quantity < product.quantity) {
          return prevCart.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
            alert("لا يمكن إضافة كمية أكبر من المتوفر في المخزون.");
            return prevCart;
        }
      }
      return [
        ...prevCart,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.price,
        },
      ];
    });
  };
  
  const handleIncreaseQuantity = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCart(prevCart => {
        const existingItem = prevCart.find(item => item.productId === productId);
        if (existingItem) {
            if (existingItem.quantity < product.quantity) {
                return prevCart.map(item =>
                    item.productId === productId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                alert("لا يمكن إضافة كمية أكبر من المتوفر في المخزون.");
                return prevCart;
            }
        }
        return prevCart;
    });
  };

  const handleDecreaseQuantity = (productId: string) => {
      setCart(prevCart => {
          const existingItem = prevCart.find(item => item.productId === productId);
          if (existingItem) {
              if (existingItem.quantity > 1) {
                  return prevCart.map(item =>
                      item.productId === productId
                          ? { ...item, quantity: item.quantity - 1 }
                          : item
                  );
              } else {
                  return prevCart.filter(item => item.productId !== productId);
              }
          }
          return prevCart;
      });
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('السلة فارغة!');
      return;
    }
    const newInvoiceData = {
      date: new Date().toISOString(),
      items: cart,
      total: total,
    };
    addInvoice(newInvoiceData, cart);
    
    // For printing, we need a full invoice object with an ID
    const newInvoiceForPrint: Invoice = {
      ...newInvoiceData,
      id: crypto.randomUUID(), // A temporary ID for printing, the real one is in App state
      type: 'sale', 
    };
    
    setCart([]);
    setInvoiceToPrint(newInvoiceForPrint);
  };

  const categories = ['الكل', ...Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c)))];

  const filteredProducts = products
    .filter(p => selectedCategory === 'الكل' || p.category === selectedCategory)
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getProductClass = (product: Product) => {
    if (product.quantity > 0 && product.quantity <= lowStockThreshold) {
        return 'border-yellow-400 border-2';
    }
    return 'border';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-4 md:p-6 h-[calc(100vh-64px)]">
      {/* Products List */}
      <div className="lg:col-span-3 bg-white shadow-md rounded-lg p-4 flex flex-col">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">المنتجات المتوفرة</h2>
        <input 
            type="text"
            placeholder="ابحث عن منتج..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="mb-4 p-2 border border-gray-300 rounded-lg w-full"
        />
        <div className="mb-4 border-b pb-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {categories.map(category => (
                    <button key={category} onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${selectedCategory === category ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                        {category}
                    </button>
                ))}
            </div>
        </div>
        <div className="flex-grow overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.quantity === 0}
                className={`rounded-lg p-2 text-center transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-blue-50 enabled:hover:border-blue-400 ${getProductClass(product)}`}
              >
                <div className="font-semibold text-gray-800">{product.name}</div>
                <div className="text-sm text-gray-600">السعر: {product.price.toFixed(2)}</div>
                <div className="text-xs text-gray-500">المخزون: {product.quantity}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart */}
      <div className="lg:col-span-2 bg-white shadow-md rounded-lg p-4 flex flex-col">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">الفاتورة الحالية</h2>
        <div className="flex-grow overflow-y-auto border-b mb-4">
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center mt-8">السلة فارغة</p>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex-grow">
                    <p className="font-semibold">{item.productName}</p>
                    <p className="text-sm text-gray-500">{item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => handleDecreaseQuantity(item.productId)} className="w-8 h-8 rounded-full bg-red-200 text-red-700 flex items-center justify-center hover:bg-red-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <span className="w-10 text-center font-semibold">{item.quantity}</span>
                    <button onClick={() => handleIncreaseQuantity(item.productId)} className="w-8 h-8 rounded-full bg-green-200 text-green-700 flex items-center justify-center hover:bg-green-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-auto">
          <div className="flex justify-between items-center text-xl font-bold mb-4">
            <span>الإجمالي:</span>
            <span>{total.toFixed(2)}</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            إتمام البيع والطباعة
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSView;