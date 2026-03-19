import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { format } from 'date-fns';
import { Download } from 'lucide-react';

interface UserProgress {
  id: string;
  userId: string;
  pointId: string;
  taskId: string;
  userAnswer: string;
  isCorrect: boolean;
  feedback: string;
  timestamp: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
}

export default function Monitoring() {
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const unsubProgress = onSnapshot(query(collection(db, 'userProgress'), orderBy('timestamp', 'desc')), (snapshot) => {
      setProgress(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProgress)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });
    return () => { unsubProgress(); unsubUsers(); };
  }, []);

  const exportToCSV = () => {
    const headers = ['Time', 'User Name', 'User Email', 'Task ID', 'Answer', 'Is Correct'];
    const rows = progress.map(p => {
      const user = users.find(u => u.uid === p.userId);
      return [
        p.timestamp ? format(new Date(p.timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
        user?.displayName || 'Unknown',
        user?.email || 'Unknown',
        p.taskId,
        (p.userAnswer || '').replace(/"/g, '""'),
        p.isCorrect ? 'Yes' : 'No'
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `user_progress_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900">User Activity Monitoring</h2>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-xl hover:bg-stone-900 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
            <tr>
              <th className="px-6 py-4 font-medium">Time</th>
              <th className="px-6 py-4 font-medium">User</th>
              <th className="px-6 py-4 font-medium">Task ID</th>
              <th className="px-6 py-4 font-medium">Answer</th>
              <th className="px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {progress.map((p) => {
              const user = users.find(u => u.uid === p.userId);
              return (
                <tr key={p.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4 text-stone-600 whitespace-nowrap">
                    {p.timestamp ? format(new Date(p.timestamp), 'MMM d, HH:mm') : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 font-medium text-stone-900">{user?.displayName || 'Unknown'}</td>
                  <td className="px-6 py-4 text-stone-600 font-mono text-xs">{p.taskId}</td>
                  <td className="px-6 py-4 text-stone-600 truncate max-w-xs">{p.userAnswer}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      p.isCorrect ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {p.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {progress.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-stone-500">No activity recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
