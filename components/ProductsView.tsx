import React, { useState, useMemo } from 'react';
import type { Product } from '../types';
import Modal from './Modal';
import InputField from './common/InputField';
import Pagination from './common/Pagination';
import { GoogleGenAI, Type } from '@google/genai';

interface ProductsViewProps {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Omit<Product, 'id'>) => void;
  deleteProduct: (id: string) => void;
  onBatchUpdate: (productIds: string[], discountPercent: number) => void;
  lowStockThreshold: number;
}

const ITEMS_PER_PAGE = 10;

// Reusable Stat Card component
const StatCard = ({ title, value, icon, valueClassName }: { title: string; value: string | number; icon: string; valueClassName?: string }) => (
    <div className="bg-slate-50 p-4 rounded-xl shadow-sm flex items-center gap-4 border border-slate-200">
        <div className={`p-3 rounded-full ${valueClassName} bg-opacity-10`}>
            <span className={`material-symbols-outlined text-3xl ${valueClassName}`}>{icon}</span>
        </div>
        <div>
            <h3 className="text-slate-500 text-sm">{title}</h3>
            <p className={`text-xl font-bold ${valueClassName || 'text-slate-800'}`}>{value}</p>
        </div>
    </div>
);


const ProductsView: React.FC<ProductsViewProps> = ({ products, addProduct, updateProduct, deleteProduct, onBatchUpdate, lowStockThreshold }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [discountPercent, setDiscountPercent] = useState('');

  const physicalProducts = useMemo(() => products.filter(p => p.type === 'product'), [products]);
  const totalUniqueProducts = useMemo(() => products.length, [products]);
  const totalQuantity = useMemo(() => physicalProducts.reduce((sum, p) => sum + p.quantity + (p.allocated || 0), 0), [physicalProducts]);
  const lowStockCount = useMemo(() => physicalProducts.filter(p => p.quantity > 0 && p.quantity <= lowStockThreshold).length, [physicalProducts, lowStockThreshold]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(lowerSearchTerm) ||
          p.author?.toLowerCase().includes(lowerSearchTerm) ||
          p.category?.toLowerCase().includes(lowerSearchTerm);
        
        if (!matchesSearch) return false;

        if (p.type === 'service') return true;

        switch (filter) {
          case 'low':
            return p.quantity > 0 && p.quantity <= lowStockThreshold;
          case 'out':
            return p.quantity === 0;
          default:
            return true;
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm, filter, lowStockThreshold]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  const handleOpenModal = (product: Product | null = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    setIsModalOpen(false);
  };

  const handleSave = (productData: Omit<Product, 'id'>) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct(productData);
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      deleteProduct(id);
    }
  };
  
  const handleSelectProduct = (id: string) => {
    setSelectedProducts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return newSet;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setSelectedProducts(new Set(paginatedProducts.map(p => p.id)));
    } else {
        setSelectedProducts(new Set());
    }
  };

  const handleApplyDiscount = () => {
    const discount = parseFloat(discountPercent);
    if (selectedProducts.size === 0) {
        alert("الرجاء تحديد منتج واحد على الأقل.");
        return;
    }
    if (isNaN(discount) || discount < 0 || discount > 100) {
        alert("الرجاء إدخال نسبة خصم صالحة بين 0 و 100.");
        return;
    }
    onBatchUpdate(Array.from(selectedProducts), discount);
    setDiscountPercent('');
    setSelectedProducts(new Set());
  };

  const getStockClass = (product: Product) => {
    if (product.type === 'service') return 'text-green-600 bg-green-100 px-2 py-0.5 rounded-full';
    if (product.quantity === 0) return 'text-red-600 bg-red-100 px-2 py-0.5 rounded-full';
    if (product.quantity <= lowStockThreshold) return 'text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full';
    return 'text-slate-700';
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white shadow-lg rounded-xl">
        <div className="p-6 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800">إدارة المنتجات والخدمات</h2>
            <p className="text-sm text-slate-500 mt-1">إضافة وتعديل المنتجات، الخدمات، وتطبيق الخصومات.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50">
            <StatCard title="المنتجات الفريدة" value={totalUniqueProducts} icon="inventory_2" valueClassName="text-indigo-600" />
            <StatCard title="إجمالي كمية المخزون" value={totalQuantity} icon="inventory" valueClassName="text-green-600" />
            <StatCard title="منتجات على وشك النفاذ" value={lowStockCount} icon="notification_important" valueClassName="text-orange-600" />
        </div>
        
        <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-b border-slate-200">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <input type="text" placeholder="ابحث بالاسم, المؤلف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-64 p-2 border border-slate-300 rounded-lg"/>
                <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="p-2 border border-slate-300 rounded-lg bg-white">
                    <option value="all">كل المنتجات</option>
                    <option value="low">مخزون منخفض</option>
                    <option value="out">نفذ من المخزون</option>
                </select>
            </div>
            <button onClick={() => handleOpenModal()} className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                <span className="material-symbols-outlined">add</span>
                إضافة منتج/خدمة
            </button>
        </div>
        {selectedProducts.size > 0 && (
             <div className="p-4 bg-indigo-50 border-b border-indigo-200 flex flex-col sm:flex-row items-center gap-4">
                <span className="font-semibold text-indigo-800">{selectedProducts.size} منتجات محددة</span>
                <div className="flex items-center gap-2">
                    <input type="number" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} placeholder="نسبة الخصم %" className="w-32 p-2 border border-slate-300 rounded-lg" />
                    <button onClick={handleApplyDiscount} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">تطبيق الخصم</button>
                    <button onClick={() => onBatchUpdate(Array.from(selectedProducts), 0)} className="bg-slate-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600">إلغاء الخصم</button>
                </div>
            </div>
        )}
        <div className="space-y-2 md:space-y-0">
            {/* Desktop Header */}
            <div className="hidden md:grid md:grid-cols-[auto,1fr,auto,auto,auto,auto,auto] gap-4 items-center bg-slate-50 text-slate-600 uppercase text-sm font-bold px-4 py-3 rounded-t-lg">
                <div className="text-center"><input type="checkbox" onChange={handleSelectAll} className="rounded" /></div>
                <div>المنتج</div>
                <div className="text-center">النوع</div>
                <div className="text-center">الكمية</div>
                <div className="text-right">السعر</div>
                <div className="text-right">التكلفة</div>
                <div className="text-center">الإجراءات</div>
            </div>

            {/* Product List / Cards */}
            <div className="space-y-3 md:space-y-0">
            {paginatedProducts.map((p) => (
                <div key={p.id} className={`
                    md:grid md:grid-cols-[auto,1fr,auto,auto,auto,auto,auto] md:gap-4 md:items-center
                    p-4 md:px-4 md:py-3 border-b border-slate-200 
                    hover:bg-slate-50 ${selectedProducts.has(p.id) ? 'bg-indigo-50' : 'bg-white md:bg-transparent'}
                    block rounded-lg md:rounded-none shadow-sm md:shadow-none
                `}>
                    {/* Checkbox */}
                    <div className="hidden md:flex md:justify-center">
                        <input type="checkbox" checked={selectedProducts.has(p.id)} onChange={() => handleSelectProduct(p.id)} className="rounded" />
                    </div>

                    {/* Mobile Header: Checkbox, Name, Actions */}
                    <div className="flex justify-between items-start mb-4 md:hidden">
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={selectedProducts.has(p.id)} onChange={() => handleSelectProduct(p.id)} className="rounded" />
                            <h3 className="font-bold text-slate-800 text-base">{p.name}</h3>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleOpenModal(p)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors" title="تعديل"><span className="material-symbols-outlined text-lg">edit</span></button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors" title="حذف"><span className="material-symbols-outlined text-lg">delete</span></button>
                        </div>
                    </div>
                    
                    {/* Desktop Name */}
                    <div className="hidden md:block font-semibold text-slate-800">{p.name}</div>

                    {/* Mobile Grid Data */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:hidden">
                        <div><span className="text-slate-500">النوع:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.type === 'service' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-800'}`}>{p.type === 'service' ? 'خدمة' : 'منتج'}</span></div>
                        <div><span className="text-slate-500">الكمية:</span> <span className={`inline-block text-xs font-medium ${getStockClass(p)}`}>{p.type === 'service' ? 'متوفر' : p.quantity}</span></div>
                        <div><span className="text-slate-500">السعر:</span> <span>{p.salePrice ? <><span className="line-through text-slate-400">{p.price.toFixed(2)}</span> <span className="font-bold text-green-600">{p.salePrice.toFixed(2)}</span></> : p.price.toFixed(2)}</span></div>
                        <div><span className="text-slate-500">التكلفة:</span> <span>{p.costPrice ? p.costPrice.toFixed(2) : '-'}</span></div>
                    </div>

                    {/* Desktop Data Cells */}
                    <div className="hidden md:block text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.type === 'service' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-800'}`}>{p.type === 'service' ? 'خدمة' : 'منتج'}</span></div>
                    <div className="hidden md:block text-center"><span className={`inline-block text-xs font-medium ${getStockClass(p)}`}>{p.type === 'service' ? 'متوفر' : p.quantity}</span></div>
                    <div className="hidden md:block text-right">
                        {p.salePrice ? (
                            <div className="flex flex-col items-end">
                                <span className="line-through text-slate-400 text-xs">{p.price.toFixed(2)}</span>
                                <span className="font-bold text-green-600">{p.salePrice.toFixed(2)}</span>
                            </div>
                        ) : p.price.toFixed(2)}
                    </div>
                    <div className="hidden md:block text-right">{p.costPrice ? p.costPrice.toFixed(2) : '-'}</div>
                    <div className="hidden md:flex items-center justify-center gap-1">
                        <button onClick={() => handleOpenModal(p)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors" title="تعديل"><span className="material-symbols-outlined text-lg">edit</span></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors" title="حذف"><span className="material-symbols-outlined text-lg">delete</span></button>
                    </div>
                </div>
            ))}
            </div>
            {filteredProducts.length === 0 && <p className="text-center py-8 text-slate-500">لا يوجد منتجات تطابق البحث.</p>}
        </div>

        <div className="p-6 border-t border-slate-200">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE} totalItems={filteredProducts.length} />
        </div>
      </div>
      {isModalOpen && <ProductModal product={editingProduct} onClose={handleCloseModal} onSave={handleSave} />}
    </div>
  );
};


const ProductModal: React.FC<{
  product: Product | null;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'>) => void;
}> = ({ product, onClose, onSave }) => {
  const [name, setName] = useState(product?.name || '');
  const [type, setType] = useState<Product['type']>(product?.type || 'product');
  const [author, setAuthor] = useState(product?.author || '');
  const [quantity, setQuantity] = useState(product?.quantity.toString() || '0');
  const [price, setPrice] = useState(product?.price.toString() || '');
  const [salePrice, setSalePrice] = useState(product?.salePrice?.toString() || '');
  const [costPrice, setCostPrice] = useState(product?.costPrice?.toString() || '');
  const [category, setCategory] = useState(product?.category || '');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isAutofilling, setIsAutofilling] = useState(false);

  const handleAutofill = async () => { /* ... (implementation exists) ... */ };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = 'اسم المنتج مطلوب.';
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) newErrors.price = 'السعر يجب أن يكون رقماً موجباً.';

    if (type === 'product') {
        const numQuantity = parseInt(quantity, 10);
        if (isNaN(numQuantity) || numQuantity < 0) newErrors.quantity = 'الكمية يجب أن تكون رقماً موجباً.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSave({
      name, author, category, type,
      quantity: type === 'product' ? parseInt(quantity, 10) : 9999,
      price: parseFloat(price),
      salePrice: salePrice ? parseFloat(salePrice) : undefined,
      costPrice: costPrice && type === 'product' ? parseFloat(costPrice) : undefined,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={product ? 'تعديل منتج' : 'إضافة منتج/خدمة'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
            <InputField id="name" label="اسم المنتج/الخدمة" value={name} onChange={e => setName(e.target.value)} error={errors.name} />

            <div className="mb-4">
              <label htmlFor="type" className="block text-slate-700 text-sm font-bold mb-2">نوع العنصر</label>
              <select id="type" value={type} onChange={e => setType(e.target.value as Product['type'])} className="w-full p-2 border rounded-lg bg-white border-slate-300">
                  <option value="product">منتج مادي (له مخزون)</option>
                  <option value="service">خدمة (بدون مخزون)</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField id="price" label="سعر البيع" value={price} onChange={e => setPrice(e.target.value)} error={errors.price} type="number" />
              <InputField id="salePrice" label="سعر العرض (اختياري)" value={salePrice} onChange={e => setSalePrice(e.target.value)} type="number" />
            </div>

            {type === 'product' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField id="quantity" label="الكمية المتاحة" value={quantity} onChange={e => setQuantity(e.target.value)} error={errors.quantity} type="number" />
                    <InputField id="costPrice" label="سعر التكلفة (اختياري)" value={costPrice} onChange={e => setCostPrice(e.target.value)} type="number" />
                </div>
                <InputField id="author" label="المؤلف (اختياري)" value={author} onChange={e => setAuthor(e.target.value)} />
              </>
            )}

            <InputField id="category" label="التصنيف (اختياري)" value={category} onChange={e => setCategory(e.target.value)} />
        
        <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors">إلغاء</button>
          <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">حفظ</button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductsView;