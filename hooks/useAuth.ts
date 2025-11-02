import { useState, useEffect } from 'react';
import useLocalStorage from './useLocalStorage';
import type { User } from '../types';

// In a real app, don't store passwords in plaintext. This is for demonstration.
const defaultAdmin: User = {
  id: 'admin-001',
  username: 'admin',
  password: 'albasha.1234',
  role: 'admin',
};

const defaultCashier: User = {
  id: 'cashier-001',
  username: 'cashier',
  password: 'albasha.1234',
  role: 'cashier',
};

function useAuth() {
  const [users, setUsers] = useLocalStorage<User[]>('users', []);
  // باستخدام useLocalStorage هنا، ستتم مزامنة حالة تسجيل الدخول الآن عبر علامات التبويب.
  // كما أنه يحافظ على الجلسة عبر عمليات إعادة تشغيل المتصفح.
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('currentUser', null);

  useEffect(() => {
    // If no users exist in localStorage, create the default admin and cashier users.
    if (users.length === 0) {
      setUsers([defaultAdmin, defaultCashier]);
    }
  }, [users, setUsers]);

  const login = (username: string, password: string): boolean => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const addUser = (user: Omit<User, 'id'>) => {
    if (users.some(u => u.username === user.username)) {
      throw new Error('اسم المستخدم موجود بالفعل.');
    }
    setUsers(prev => [...prev, { ...user, id: crypto.randomUUID() }]);
  };
  
  const deleteUser = (id: string) => {
    if (id === defaultAdmin.id) {
        alert('لا يمكن حذف حساب المدير الافتراضي.');
        return;
    }
    if (id === defaultCashier.id) {
      alert('لا يمكن حذف حساب الكاشير الافتراضي.');
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
  };


  return {
    currentUser,
    users,
    login,
    logout,
    addUser,
    deleteUser,
  };
}

export default useAuth;