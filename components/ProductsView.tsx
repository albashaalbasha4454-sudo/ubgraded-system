import React, { useState } from 'react';
import type { Product } from '../types';
import Modal from './Modal';

interface ProductsViewProps {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  lowStockThreshold: number;
}

const InputField = ({id, label, value, onChange, error, type = "text"}: {id:string, label:string, value:string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, error?: string, type?: string}) => (
    <div className="mb-4">
      <label htmlFor={id} className="block text-gray-700 text-sm font-bold mb-2">{label}</label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        dir="auto"
        className={`shadow appearance-none border rounded w-full py-2 px-3 text-black font-medium text-base leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 ${error ? 'border-red-500' : 'border-gray-300'}`}
      />
      {error && <p className="text-red-500 text-xs italic mt-1">{error}</p>}
    </div>
);

const ProductForm: React.FC<{
  product: Product | null;
  onSave: (product: Omit<Product, 'id'> | Product) => void;
  onCancel: () => void;
}> = ({ product, onSave, onCancel }) => {
  const [name, setName] = useState(product?.name || '');
  const [quantity, setQuantity] = useState(product?.quantity.toString() || '');
  const [price, setPrice] = useState(product?.price.toString() || '');
  const [category, setCategory] = useState(product?.category || '');
  const [errors, setErrors] = useState<{name?: string, quantity?: string, price?: string}>({});

  const validate = () => {
    const newErrors: {name?: string, quantity?: string, price?: string} = {};
    if (!name.trim()) newErrors.name = 'اسم المنتج مطلوب.';
    const numQuantity = Number(quantity);
    if (!quantity.trim() || isNaN(numQuantity) || numQuantity < 0 || !Number.isInteger(numQuantity)) {
      newErrors.quantity = 'الكمية يجب أن تكون رقمًا صحيحًا موجبًا.';
    }
    const numPrice = Number(price);
    if (!price.trim() || isNaN(numPrice) || numPrice < 0) {
      newErrors.price = 'السعر يجب أن يكون رقمًا موجبًا.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const productData = {
        name,
        quantity: parseInt(quantity, 10),
        price: parseFloat(price),
        category: category.trim(),
      };
      if (product) {
        onSave({ ...product, ...productData });
      } else {
        onSave(productData);
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <InputField id="name" label="اسم المنتج" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <InputField id="category" label="التصنيف (اختياري)" value={category} onChange={(e) => setCategory(e.target.value)} />
      <InputField id="quantity" label="الكمية" value={quantity} onChange={(e) => setQuantity(e.target.value)} error={errors.quantity} type="number" />
      <InputField id="price" label="السعر" value={price} onChange={(e) => setPrice(e.target.value)} error={errors.price} type="number" />
      <div className="flex items-center justify-end gap-2 mt-6">
        <button type="button" onClick={onCancel} className="bg-gray-500 text-white font-bold py-2 px-4 rounded hover:bg-gray-600">
          إلغاء
        </button>
        <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700">
          حفظ
        </button>
      </div>
    </form>
  );
};

const ProductsView: React.FC<ProductsViewProps> = ({ products, addProduct, updateProduct, deleteProduct, lowStockThreshold }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSaveProduct = (productData: Omit<Product, 'id'> | Product) => {
    if ('id' in productData) {
      updateProduct(productData);
    } else {
      addProduct(productData);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.')) {
        deleteProduct(id);
    }
  }

  const getRowClass = (product: Product) => {
    if (product.quantity === 0) {
        return 'bg-red-100 text-gray-500';
    }
    if (product.quantity <= lowStockThreshold) {
        return 'bg-yellow-100';
    }
    return 'hover:bg-gray-50';
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">إدارة البضاعة</h2>
        <button
          onClick={handleAddProduct}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          إضافة منتج جديد
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="w-full table-auto text-right">
          <thead className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
            <tr>
              <th className="py-3 px-6">اسم المنتج</th>
              <th className="py-3 px-6">التصنيف</th>
              <th className="py-3 px-6">الكمية</th>
              <th className="py-3 px-6">السعر</th>
              <th className="py-3 px-6 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm font-light">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6">
                  لم يتم إضافة أي منتجات بعد.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className={`border-b border-gray-200 ${getRowClass(product)}`}>
                  <td className="py-3 px-6 font-semibold">{product.name}</td>
                  <td className="py-3 px-6">{product.category || '-'}</td>
                  <td className="py-3 px-6">{product.quantity}</td>
                  <td className="py-3 px-6">{product.price.toFixed(2)}</td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex item-center justify-center gap-2">
                      <button onClick={() => handleEditProduct(product)} className="w-8 h-8 rounded-full bg-green-200 text-green-700 flex items-center justify-center hover:bg-green-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                          <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                        </svg>
                      </button>
                       <button onClick={() => handleDelete(product.id)} className="w-8 h-8 rounded-full bg-red-200 text-red-700 flex items-center justify-center hover:bg-red-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
      >
        <ProductForm
          product={editingProduct}
          onSave={handleSaveProduct}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default ProductsView;