import React, { useState } from 'react';
import type { User } from '../types';
import Modal from './Modal';

interface UsersViewProps {
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  deleteUser: (id: string) => void;
}

const UsersView: React.FC<UsersViewProps> = ({ users, addUser, deleteUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleSaveUser = (userData: Omit<User, 'id'>) => {
    try {
        addUser(userData);
        setIsModalOpen(false);
    } catch (error) {
        if (error instanceof Error) {
            alert(error.message);
        } else {
            alert('حدث خطأ غير متوقع.');
        }
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      deleteUser(id);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">إدارة المستخدمين</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          إضافة مستخدم جديد
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="w-full table-auto text-right">
          <thead className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
            <tr>
              <th className="py-3 px-6">اسم المستخدم</th>
              <th className="py-3 px-6">الدور/الصلاحية</th>
              <th className="py-3 px-6 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm font-light">
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-6 font-semibold">{user.username}</td>
                <td className="py-3 px-6">{user.role === 'admin' ? 'مدير' : 'كاشير'}</td>
                <td className="py-3 px-6 text-center">
                  <div className="flex item-center justify-center">
                    <button
                      onClick={() => handleDelete(user.id)}
                      disabled={user.username === 'admin'}
                      className="w-8 h-8 rounded-full bg-red-200 text-red-700 flex items-center justify-center hover:bg-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إضافة مستخدم جديد"
      >
        <UserForm
          onSave={handleSaveUser}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

const UserForm: React.FC<{
  onSave: (user: Omit<User, 'id'>) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      onSave({ username, password, role });
    } else {
      alert('يرجى ملء جميع الحقول.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">اسم المستخدم</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
        />
      </div>
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">كلمة المرور</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
        />
      </div>
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">الدور/الصلاحية</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
        >
          <option value="cashier">كاشير</option>
          <option value="admin">مدير</option>
        </select>
      </div>
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

export default UsersView;