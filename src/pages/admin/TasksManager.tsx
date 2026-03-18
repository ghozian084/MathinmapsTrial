import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import ImageUploader from '../../components/ImageUploader';

interface Task {
  id: string;
  pointId: string;
  taskNumber: number;
  question: string;
  answerKeyRegex: string;
  feedbackLogic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  imageUrl: string;
  objectDescription: string;
  hintText: string;
}

interface MapPoint {
  id: string;
  title: string;
}

export default function TasksManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Omit<Task, 'id'>>({
    pointId: '',
    taskNumber: 1,
    question: '',
    answerKeyRegex: '',
    feedbackLogic: '',
    difficulty: 'Medium',
    imageUrl: '',
    objectDescription: '',
    hintText: '',
  });

  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });
    const unsubPoints = onSnapshot(collection(db, 'mapPoints'), (snapshot) => {
      setPoints(snapshot.docs.map(doc => ({ id: doc.id, title: doc.data().title } as MapPoint)));
    });
    return () => { unsubTasks(); unsubPoints(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), formData);
      } else {
        await addDoc(collection(db, 'tasks'), formData);
      }
      setIsModalOpen(false);
      setEditingTask(null);
      setFormData({ pointId: '', taskNumber: 1, question: '', answerKeyRegex: '', feedbackLogic: '', difficulty: 'Medium', imageUrl: '', objectDescription: '', hintText: '' });
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error saving task');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteDoc(doc(db, 'tasks', id));
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      pointId: task.pointId,
      taskNumber: task.taskNumber,
      question: task.question,
      answerKeyRegex: task.answerKeyRegex,
      feedbackLogic: task.feedbackLogic || '',
      difficulty: task.difficulty || 'Medium',
      imageUrl: task.imageUrl || '',
      objectDescription: task.objectDescription || '',
      hintText: task.hintText || '',
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900">Manage Tasks</h2>
        <button
          onClick={() => {
            setEditingTask(null);
            setFormData({ pointId: points[0]?.id || '', taskNumber: 1, question: '', answerKeyRegex: '', feedbackLogic: '', difficulty: 'Medium', imageUrl: '', objectDescription: '', hintText: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Task
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
            <tr>
              <th className="px-6 py-4 font-medium">Point</th>
              <th className="px-6 py-4 font-medium">#</th>
              <th className="px-6 py-4 font-medium">Question</th>
              <th className="px-6 py-4 font-medium">Difficulty</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-stone-50">
                <td className="px-6 py-4 text-stone-600">{points.find(p => p.id === task.pointId)?.title || 'Unknown'}</td>
                <td className="px-6 py-4 text-stone-600">{task.taskNumber}</td>
                <td className="px-6 py-4 font-medium text-stone-900 truncate max-w-xs">{task.question}</td>
                <td className="px-6 py-4 text-stone-600">{task.difficulty}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(task)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-stone-500">No tasks found. Add one to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-200 shrink-0">
              <h3 className="text-lg font-bold text-stone-900">{editingTask ? 'Edit Task' : 'Add New Task'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Select Map Point</label>
                    <select
                      required
                      value={formData.pointId}
                      onChange={(e) => setFormData({ ...formData, pointId: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      <option value="" disabled>Select a point</option>
                      {points.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Task Number</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.taskNumber}
                      onChange={(e) => setFormData({ ...formData, taskNumber: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Question</label>
                  <textarea
                    required
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Answer Key Regex</label>
                  <input
                    type="text"
                    required
                    value={formData.answerKeyRegex}
                    onChange={(e) => setFormData({ ...formData, answerKeyRegex: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-sm"
                    placeholder="e.g., ^(?i)apple$"
                  />
                  <p className="text-xs text-stone-500 mt-1">Use standard regular expressions. Example: ^(?i)answer$ for case-insensitive exact match.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Feedback Logic</label>
                  <textarea
                    value={formData.feedbackLogic}
                    onChange={(e) => setFormData({ ...formData, feedbackLogic: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-sm"
                    rows={3}
                    placeholder="IF MATCH THEN 'Correct!' ELSE 'Try again.'"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Difficulty</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Task Image (Optional)</label>
                  <ImageUploader 
                    value={formData.imageUrl} 
                    onChange={(url) => setFormData({ ...formData, imageUrl: url })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Object Description</label>
                  <textarea
                    value={formData.objectDescription}
                    onChange={(e) => setFormData({ ...formData, objectDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Hint Text</label>
                  <textarea
                    value={formData.hintText}
                    onChange={(e) => setFormData({ ...formData, hintText: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    rows={2}
                  />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-stone-200 shrink-0 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="task-form"
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
              >
                {editingTask ? 'Save Changes' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
