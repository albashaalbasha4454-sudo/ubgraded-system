import React, { useState } from 'react';
import type { Expense } from '../types';
import Modal from './Modal';

interface ExpensesViewProps {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
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

const ExpenseForm: React.FC<{
  expense: Expense | null;
  onSave: (expense: Omit<Expense, 'id'> | Expense) => void;
  onCancel: () => void;
}> = ({ expense, onSave, onCancel }) => {
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const [category, setCategory] = useState(expense?.category || '');
  const [date, setDate] = useState(expense?.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<{description?: string, amount?: string}>({});

  const validate = () => {
    const newErrors: {description?: string, amount?: string} = {};
    if (!description.trim()) newErrors.description = 'الوصف مطلوب.';
    const numAmount = Number(amount);
    if (!amount.trim() || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'المبلغ يجب أن يكون رقمًا موجبًا.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const expenseData = {
        description: description.trim(),
        amount: parseFloat(amount),
        category: category.trim(),
        date: new Date(date).toISOString(),
      };
      if (expense) {
        onSave({ ...expense, ...expenseData });
      } else {
        onSave(expenseData);
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <InputField id="description" label="الوصف" value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} />
      <InputField id="amount" label="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} type="number" />
      <InputField id="category" label="التصنيف (اختياري)" value={category} onChange={(e) => setCategory(e.target.value)} />
      <InputField id="date" label="التاريخ" value={date} onChange={(e) => setDate(e.target.value)} type="date" />
      <div className="flex items-center justify-end gap-2 mt-6">
        <button type="button" onClick={onCancel} className="bg-gray-500 text-white font-bold py-2 px-4 rounded hover:bg-gray-600">إلغاء</button>
        <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700">حفظ</button>
      </div>
    </form>
  );
};


const ExpensesView: React.FC<ExpensesViewProps> = ({ expenses, addExpense, updateExpense, deleteExpense }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleAddExpense = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleSaveExpense = (expenseData: Omit<Expense, 'id'> | Expense) => {
    if ('id' in expenseData) {
      updateExpense(expenseData);
    } else {
      addExpense(expenseData as Omit<Expense, 'id'>);
    }
    setIsModalOpen(false);
    setEditingExpense(null);
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
        deleteExpense(id);
    }
  }
  
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">إدارة المصروفات</h2>
        <button
          onClick={handleAddExpense}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          إضافة مصروف جديد
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="w-full table-auto text-right">
          <thead className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
            <tr>
              <th className="py-3 px-6">التاريخ</th>
              <th className="py-3 px-6">الوصف</th>
              <th className="py-3 px-6">التصنيف</th>
              <th className="py-3 px-6">المبلغ</th>
              <th className="py-3 px-6 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm font-light">
            {sortedExpenses.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-6">لم يتم تسجيل أي مصروفات بعد.</td></tr>
            ) : (
              sortedExpenses.map((expense) => (
                <tr key={expense.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-6">{new Date(expense.date).toLocaleDateString('ar-EG')}</td>
                  <td className="py-3 px-6 font-semibold">{expense.description}</td>
                  <td className="py-3 px-6">{expense.category || '-'}</td>
                  <td className="py-3 px-6">{expense.amount.toFixed(2)}</td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex item-center justify-center gap-2">
                      <button onClick={() => handleEditExpense(expense)} className="w-8 h-8 rounded-full bg-green-200 text-green-700 flex items-center justify-center hover:bg-green-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                          <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                        </svg>
                      </button>
                       <button onClick={() => handleDelete(expense.id)} className="w-8 h-8 rounded-full bg-red-200 text-red-700 flex items-center justify-center hover:bg-red-300">
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
        title={editingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}
      >
        <ExpenseForm
          expense={editingExpense}
          onSave={handleSaveExpense}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default ExpensesView;