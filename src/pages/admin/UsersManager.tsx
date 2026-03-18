import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Shield, ShieldAlert, RotateCcw } from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  displayName: string;
}

export default function UsersManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });
    return () => unsubscribe();
  }, []);

  const toggleRole = async (user: UserProfile) => {
    if (window.confirm(`Change role for ${user.email} to ${user.role === 'admin' ? 'user' : 'admin'}?`)) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          role: user.role === 'admin' ? 'user' : 'admin'
        });
      } catch (error) {
        console.error('Error updating role:', error);
        alert('Error updating role. You might not have permission.');
      }
    }
  };

  const resetSession = async (user: UserProfile) => {
    if (window.confirm(`Are you sure you want to reset the session for ${user.email}? This will erase all their progress and answers.`)) {
      try {
        const q = query(collection(db, 'userProgress'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(docSnapshot => deleteDoc(doc(db, 'userProgress', docSnapshot.id)));
        await Promise.all(deletePromises);
        alert(`Session reset successfully for ${user.email}.`);
      } catch (error) {
        console.error('Error resetting session:', error);
        alert('Error resetting session.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900">Manage Users</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {users.map((user) => (
              <tr key={user.uid} className="hover:bg-stone-50">
                <td className="px-6 py-4 font-medium text-stone-900">{user.displayName}</td>
                <td className="px-6 py-4 text-stone-600">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-stone-100 text-stone-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => resetSession(user)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    <RotateCcw className="w-4 h-4 text-red-500" />
                    Reset Session
                  </button>
                  <button
                    onClick={() => toggleRole(user)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50"
                  >
                    {user.role === 'admin' ? <ShieldAlert className="w-4 h-4 text-amber-500" /> : <Shield className="w-4 h-4 text-blue-500" />}
                    Toggle Role
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-stone-500">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
