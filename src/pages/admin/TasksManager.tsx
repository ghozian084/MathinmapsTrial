import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Edit2, Trash2, X, Wrench } from 'lucide-react';
import ImageUploader from '../../components/ImageUploader';
import GuideBox from '../../components/GuideBox';
import { useAuth } from '../../context/AuthContext';

interface Task {
  id: string;
  pointId: string;
  taskNumber: number;
  question: string;
  type: 'short_answer' | 'multiple_choice' | 'drag_drop' | 'interval';
  answerKeyRegex: string;
  minAnswer?: number;
  maxAnswer?: number;
  options?: string[];
  dragItems?: { id: string; content: string }[];
  dropTargets?: { id: string; label: string; correctItemId: string }[];
  feedbackLogic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  imageUrl: string;
  objectDescription: string;
  hintText: string;
  hintText2: string;
  tools: string[];
  creatorId: string;
  creatorName: string;
}

interface MapPoint {
  id: string;
  title: string;
}

export default function TasksManager() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPointModalOpen, setIsPointModalOpen] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [customTool, setCustomTool] = useState('');
  
  const [formData, setFormData] = useState<Omit<Task, 'id'>>({
    pointId: '',
    taskNumber: 1,
    question: '',
    type: 'short_answer',
    answerKeyRegex: '',
    minAnswer: 0,
    maxAnswer: 0,
    options: [],
    dragItems: [],
    dropTargets: [],
    feedbackLogic: '',
    difficulty: 'Medium',
    imageUrl: '',
    objectDescription: '',
    hintText: '',
    hintText2: '',
    tools: [],
    creatorId: '',
    creatorName: '',
  });

  const PRESET_TOOLS = ['Measuring Tape', 'Ruler', 'Clinometer'];

  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)).sort((a, b) => a.taskNumber - b.taskNumber));
    });
    const unsubPoints = onSnapshot(collection(db, 'mapPoints'), (snapshot) => {
      setPoints(snapshot.docs.map(doc => ({ id: doc.id, title: doc.data().title } as MapPoint)));
    });
    return () => { unsubTasks(); unsubPoints(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = { 
        ...formData,
        creatorId: profile?.uid || 'unknown',
        creatorName: profile?.displayName || 'Unknown Admin'
      };
      
      // Clean up data based on type
      if (dataToSave.type !== 'multiple_choice') delete dataToSave.options;
      if (dataToSave.type !== 'drag_drop') {
        delete dataToSave.dragItems;
        delete dataToSave.dropTargets;
      }
      if (dataToSave.type !== 'interval') {
        delete dataToSave.minAnswer;
        delete dataToSave.maxAnswer;
      }
      if (dataToSave.type === 'interval') {
        delete dataToSave.answerKeyRegex;
      }

      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), dataToSave);
      } else {
        await addDoc(collection(db, 'tasks'), dataToSave);
      }
      setIsModalOpen(false);
      setEditingTask(null);
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

  const openAddModal = (pointId: string) => {
    const pointTasks = tasks.filter(t => t.pointId === pointId);
    const nextNumber = pointTasks.length > 0 ? Math.max(...pointTasks.map(t => t.taskNumber)) + 1 : 1;
    
    setEditingTask(null);
    setFormData({ 
      pointId, 
      taskNumber: nextNumber, 
      question: '', 
      type: 'short_answer', 
      answerKeyRegex: '', 
      minAnswer: 0,
      maxAnswer: 0,
      options: [], 
      dragItems: [], 
      dropTargets: [], 
      feedbackLogic: '', 
      difficulty: 'Medium', 
      imageUrl: '', 
      objectDescription: '', 
      hintText: '',
      hintText2: '',
      tools: [],
      creatorId: profile?.uid || '',
      creatorName: profile?.displayName || ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      pointId: task.pointId,
      taskNumber: task.taskNumber,
      question: task.question,
      type: task.type || 'short_answer',
      answerKeyRegex: task.answerKeyRegex || '',
      minAnswer: task.minAnswer || 0,
      maxAnswer: task.maxAnswer || 0,
      options: task.options || [],
      dragItems: task.dragItems || [],
      dropTargets: task.dropTargets || [],
      feedbackLogic: task.feedbackLogic || '',
      difficulty: task.difficulty || 'Medium',
      imageUrl: task.imageUrl || '',
      objectDescription: task.objectDescription || '',
      hintText: task.hintText || '',
      hintText2: task.hintText2 || '',
      tools: task.tools || [],
      creatorId: task.creatorId || '',
      creatorName: task.creatorName || '',
    });
    setIsModalOpen(true);
  };

  const addOption = () => {
    setFormData(prev => ({ ...prev, options: [...(prev.options || []), ''] }));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(formData.options || [])];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({ ...prev, options: (prev.options || []).filter((_, i) => i !== index) }));
  };

  const addDragItem = () => {
    setFormData(prev => ({ ...prev, dragItems: [...(prev.dragItems || []), { id: crypto.randomUUID(), content: '' }] }));
  };

  const updateDragItem = (index: number, content: string) => {
    const newItems = [...(formData.dragItems || [])];
    newItems[index] = { ...newItems[index], content };
    setFormData(prev => ({ ...prev, dragItems: newItems }));
  };

  const removeDragItem = (index: number) => {
    setFormData(prev => ({ ...prev, dragItems: (prev.dragItems || []).filter((_, i) => i !== index) }));
  };

  const addDropTarget = () => {
    setFormData(prev => ({ ...prev, dropTargets: [...(prev.dropTargets || []), { id: crypto.randomUUID(), label: '', correctItemId: '' }] }));
  };

  const updateDropTarget = (index: number, field: string, value: string) => {
    const newTargets = [...(formData.dropTargets || [])];
    newTargets[index] = { ...newTargets[index], [field]: value };
    setFormData(prev => ({ ...prev, dropTargets: newTargets }));
  };

  const removeDropTarget = (index: number) => {
    setFormData(prev => ({ ...prev, dropTargets: (prev.dropTargets || []).filter((_, i) => i !== index) }));
  };

  const selectedPoint = points.find(p => p.id === selectedPointId);
  const pointTasks = tasks.filter(t => t.pointId === selectedPointId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900">Manage Tasks by Point</h2>
      </div>

      <GuideBox title="Admin Guide: Creating Tasks & AI Feedback">
        <div className="space-y-4">
          <div className="bg-white p-3 rounded border border-blue-100 shadow-sm">
            <h4 className="font-bold text-blue-900 mb-1">1. Simplified Answer Key</h4>
            <p className="text-sm">No need for complex regex! Just type the plain correct answer. The system automatically handles:</p>
            <ul className="list-disc pl-5 mt-1 text-xs space-y-1">
              <li><strong>Case Insensitivity:</strong> "Apple" matches "apple" or "APPLE".</li>
              <li><strong>Typo Tolerance:</strong> Small mistakes (e.g., "aple") are automatically accepted.</li>
            </ul>
          </div>
          
          <div className="bg-white p-3 rounded border border-blue-100 shadow-sm">
            <h4 className="font-bold text-blue-900 mb-1">2. AI Feedback Template</h4>
            <p className="text-sm mb-2">Use these templates in the "Feedback Logic" field to guide the AI tutor:</p>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-stone-50 rounded border border-stone-200">
                <p className="font-semibold">Standard Template:</p>
                <code>You are a helpful tutor. If the student is wrong, don't give the answer, but point them to the [Object Description]. Encourage them to look closer at [Specific Detail].</code>
              </div>
              <div className="p-2 bg-stone-50 rounded border border-stone-200">
                <p className="font-semibold">Math/Logic Template:</p>
                <code>You are a math expert. Guide the student through the steps of [Concept] without revealing the final number. Ask them "What happens if you [Step]?"</code>
              </div>
            </div>
          </div>
        </div>
      </GuideBox>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {points.map((point) => {
          const count = tasks.filter(t => t.pointId === point.id).length;
          return (
            <div key={point.id} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 hover:border-blue-300 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-stone-900 group-hover:text-blue-600 transition-colors">{point.title}</h3>
                  <p className="text-sm text-stone-500">{count} {count === 1 ? 'task' : 'tasks'} configured</p>
                </div>
                <div className="p-2 bg-stone-50 rounded-lg text-stone-400">
                  <Plus className="w-5 h-5" />
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPointId(point.id);
                  setIsPointModalOpen(true);
                }}
                className="w-full py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors text-sm font-medium"
              >
                Manage Tasks
              </button>
            </div>
          );
        })}
      </div>

      {/* Point Tasks Modal */}
      {isPointModalOpen && selectedPoint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-stone-50">
              <div>
                <h3 className="text-xl font-bold text-stone-900">Tasks for: {selectedPoint.title}</h3>
                <p className="text-sm text-stone-500">Add, edit, or remove tasks for this location.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openAddModal(selectedPoint.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
                <button onClick={() => setIsPointModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {pointTasks.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
                  <p className="text-stone-500">No tasks configured for this point yet.</p>
                  <button
                    onClick={() => openAddModal(selectedPoint.id)}
                    className="mt-4 text-blue-600 font-medium hover:underline"
                  >
                    Create the first task
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {pointTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 bg-white border border-stone-200 rounded-xl hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center font-bold text-stone-500">
                          {task.taskNumber}
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900">{task.question}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full capitalize">
                              {(task.type || 'short_answer').replace('_', ' ')}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              task.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                              task.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {task.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(task)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(task.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-stone-200 bg-stone-50 flex justify-end">
              <button
                onClick={() => setIsPointModalOpen(false)}
                className="px-6 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Task Number</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={Number.isNaN(formData.taskNumber) ? '' : formData.taskNumber}
                      onChange={(e) => setFormData({ ...formData, taskNumber: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Difficulty</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Question Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="short_answer">Short Answer</option>
                    <option value="multiple_choice">Multiple Choice (Single Answer)</option>
                    <option value="multiple_select">Multiple Select (Multiple Answers)</option>
                    <option value="drag_drop">Drag and Drop</option>
                    <option value="interval">Interval (Range)</option>
                    <option value="open_ended">Open Ended (Text Response)</option>
                  </select>
                </div>

                {formData.type === 'interval' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Min Value</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={Number.isNaN(formData.minAnswer) ? '' : formData.minAnswer}
                        onChange={(e) => setFormData({ ...formData, minAnswer: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Max Value</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={Number.isNaN(formData.maxAnswer) ? '' : formData.maxAnswer}
                        onChange={(e) => setFormData({ ...formData, maxAnswer: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg outline-none"
                      />
                    </div>
                    <p className="col-span-2 text-[10px] text-stone-400 mt-1 italic">
                      Student's answer must be between these two values (inclusive).
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Question</label>
                  <textarea
                    required
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows={2}
                  />
                </div>

                {(formData.type === 'multiple_choice' || formData.type === 'multiple_select') && (
                  <div className="space-y-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <label className="block text-sm font-bold text-stone-700">Options</label>
                    {formData.options?.map((option, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(idx, e.target.value)}
                          className="flex-1 px-3 py-2 border border-stone-300 rounded-lg outline-none"
                          placeholder={`Option ${idx + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-sm text-blue-600 font-medium hover:underline"
                    >
                      + Add Option
                    </button>
                  </div>
                )}

                {formData.type === 'drag_drop' && (
                  <div className="space-y-6 p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-stone-700">Drag Items</label>
                      {formData.dragItems?.map((item, idx) => (
                        <div key={item.id} className="flex gap-2">
                          <input
                            type="text"
                            value={item.content}
                            onChange={(e) => updateDragItem(idx, e.target.value)}
                            className="flex-1 px-3 py-2 border border-stone-300 rounded-lg outline-none"
                            placeholder="Item content..."
                          />
                          <button
                            type="button"
                            onClick={() => removeDragItem(idx)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addDragItem}
                        className="text-sm text-blue-600 font-medium hover:underline"
                      >
                        + Add Drag Item
                      </button>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-stone-700">Drop Targets</label>
                      {formData.dropTargets?.map((target, idx) => (
                        <div key={target.id} className="space-y-2 p-3 bg-white rounded-lg border border-stone-200">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={target.label}
                              onChange={(e) => updateDropTarget(idx, 'label', e.target.value)}
                              className="flex-1 px-3 py-2 border border-stone-300 rounded-lg outline-none"
                              placeholder="Target label (e.g., 'Place here')"
                            />
                            <button
                              type="button"
                              onClick={() => removeDropTarget(idx)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <select
                            value={target.correctItemId}
                            onChange={(e) => updateDropTarget(idx, 'correctItemId', e.target.value)}
                            className="w-full px-3 py-2 border border-stone-300 rounded-lg outline-none text-sm"
                          >
                            <option value="">Select correct item...</option>
                            {formData.dragItems?.map(item => (
                              <option key={item.id} value={item.id}>{item.content || '(Empty item)'}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addDropTarget}
                        className="text-sm text-blue-600 font-medium hover:underline"
                      >
                        + Add Drop Target
                      </button>
                    </div>
                  </div>
                )}

                {formData.type !== 'interval' && formData.type !== 'open_ended' && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      {formData.type === 'drag_drop' ? 'Answer Key (Internal)' : 'Correct Answer'}
                    </label>
                    <input
                      type="text"
                      required={formData.type !== 'drag_drop'}
                      value={formData.answerKeyRegex}
                      onChange={(e) => setFormData({ ...formData, answerKeyRegex: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                      placeholder={formData.type === 'drag_drop' ? 'Not used for drag/drop' : formData.type === 'multiple_select' ? 'e.g., Option A; Option C' : 'e.g., Apple; Red Apple'}
                    />
                    {formData.type === 'short_answer' && (
                      <p className="text-[10px] text-stone-400 mt-1 italic">
                        Just type the plain text. Use ";" to separate multiple correct answers. Case and small typos are handled automatically.
                      </p>
                    )}
                    {formData.type === 'multiple_select' && (
                      <p className="text-[10px] text-stone-400 mt-1 italic">
                        Use ";" to separate the exact text of correct options (e.g., "Option 1; Option 3").
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">AI Feedback Prompt / Logic</label>
                  <textarea
                    value={formData.feedbackLogic}
                    onChange={(e) => setFormData({ ...formData, feedbackLogic: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                    rows={3}
                    placeholder="Describe how the AI should guide the student..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Task Image (Optional)</label>
                  <ImageUploader 
                    value={formData.imageUrl} 
                    onChange={(url) => setFormData({ ...formData, imageUrl: url })} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tools Needed</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {PRESET_TOOLS.map(tool => (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => {
                          const currentTools = formData.tools || [];
                          if (currentTools.includes(tool)) {
                            setFormData({ ...formData, tools: currentTools.filter(t => t !== tool) });
                          } else {
                            setFormData({ ...formData, tools: [...currentTools, tool] });
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          formData.tools?.includes(tool)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-blue-300'
                        }`}
                      >
                        {tool}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTool}
                      onChange={(e) => setCustomTool(e.target.value)}
                      placeholder="Add custom tool..."
                      className="flex-1 px-3 py-2 border border-stone-300 rounded-lg outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customTool.trim()) {
                          setFormData({ ...formData, tools: [...(formData.tools || []), customTool.trim()] });
                          setCustomTool('');
                        }
                      }}
                      className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.tools?.filter(t => !PRESET_TOOLS.includes(t)).map(tool => (
                      <span key={tool} className="px-2 py-1 bg-stone-100 border border-stone-200 rounded-lg text-xs flex items-center gap-1">
                        {tool}
                        <button 
                          type="button" 
                          onClick={() => setFormData({ ...formData, tools: formData.tools.filter(t => t !== tool) })}
                          className="text-stone-400 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Hint Text 1</label>
                    <textarea
                      value={formData.hintText}
                      onChange={(e) => setFormData({ ...formData, hintText: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Hint Text 2</label>
                    <textarea
                      value={formData.hintText2}
                      onChange={(e) => setFormData({ ...formData, hintText2: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                  <span className="text-xs text-stone-500 font-medium">Creator: {formData.creatorName || 'Current User'}</span>
                  <span className="text-[10px] text-stone-400 italic">Automatically generated</span>
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
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
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
