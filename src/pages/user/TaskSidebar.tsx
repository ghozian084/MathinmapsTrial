import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { X, CheckCircle, XCircle, HelpCircle, Lightbulb, RotateCcw } from 'lucide-react';

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

interface TaskSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  point: { id: string; title: string } | null;
  mapName: string;
}

export default function TaskSidebar({ isOpen, onClose, point, mapName }: TaskSidebarProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState<Record<string, UserProgress>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!point || !isOpen) return;

    const qTasks = query(collection(db, 'tasks'), where('pointId', '==', point.id));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)).sort((a, b) => a.taskNumber - b.taskNumber));
    });

    if (user) {
      const qProgress = query(
        collection(db, 'userProgress'),
        where('userId', '==', user.uid),
        where('pointId', '==', point.id)
      );
      const unsubProgress = onSnapshot(qProgress, (snapshot) => {
        const progMap: Record<string, UserProgress> = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data() as UserProgress;
          // Keep the most recent or correct progress
          if (!progMap[data.taskId] || data.isCorrect) {
            progMap[data.taskId] = { id: doc.id, ...data };
          }
        });
        setProgress(progMap);
      });
      return () => { unsubTasks(); unsubProgress(); };
    }

    return () => unsubTasks();
  }, [point, isOpen, user]);

  const handleSubmit = async (taskId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !point) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const answer = answers[taskId] || '';
    if (!answer.trim()) return;

    // Simple Regex matching
    let isCorrect = false;
    try {
      const regex = new RegExp(task.answerKeyRegex);
      isCorrect = regex.test(answer.trim());
    } catch (err) {
      console.error('Invalid regex in task:', err);
    }

    // Parse feedback logic (simple simulation)
    // IF MATCH THEN 'Msg A' ELSE IF PARTIAL THEN 'Msg B' ELSE 'Msg C'
    let feedbackMsg = isCorrect ? 'Correct! Well done.' : 'Incorrect. Try again.';
    if (task.feedbackLogic) {
      if (isCorrect && task.feedbackLogic.includes('IF MATCH THEN')) {
        const match = task.feedbackLogic.match(/IF MATCH THEN '([^']+)'/);
        if (match) feedbackMsg = match[1];
      } else if (!isCorrect && task.feedbackLogic.includes('ELSE')) {
        const match = task.feedbackLogic.match(/ELSE '([^']+)'/);
        if (match) feedbackMsg = match[1];
      }
    }

    try {
      await addDoc(collection(db, 'userProgress'), {
        userId: user.uid,
        pointId: point.id,
        taskId: taskId,
        userAnswer: answer,
        isCorrect,
        feedback: feedbackMsg,
        timestamp: new Date().toISOString()
      });
      
      // Clear answer input if correct
      if (isCorrect) {
        setAnswers(prev => ({ ...prev, [taskId]: '' }));
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleRetake = async (taskId: string) => {
    const taskProgress = progress[taskId];
    if (taskProgress && taskProgress.id) {
      try {
        await deleteDoc(doc(db, 'userProgress', taskProgress.id));
        setProgress(prev => {
          const newProg = { ...prev };
          delete newProg[taskId];
          return newProg;
        });
        setAnswers(prev => ({ ...prev, [taskId]: '' }));
        setShowHint(prev => ({ ...prev, [taskId]: false }));
      } catch (error) {
        console.error('Error deleting progress:', error);
      }
    }
  };

  if (!isOpen || !point) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-2xl border-l border-stone-200 flex flex-col z-20 transform transition-transform duration-300">
      <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-stone-50 shrink-0">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">{mapName}</p>
          <h2 className="text-xl font-bold text-stone-900">{point.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {tasks.length === 0 ? (
          <div className="text-center text-stone-500 py-8">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 text-stone-300" />
            <p>No tasks available for this location yet.</p>
          </div>
        ) : (
          tasks.map((task, index) => {
            const taskProgress = progress[task.id];
            const isCompleted = taskProgress?.isCorrect;

            return (
              <div key={task.id} className={`bg-white rounded-2xl border ${isCompleted ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-200'} overflow-hidden shadow-sm`}>
                <div className={`px-4 py-3 border-b ${isCompleted ? 'border-emerald-100 bg-emerald-50' : 'border-stone-100 bg-stone-50'} flex items-center justify-between`}>
                  <h3 className="font-semibold text-stone-800">Task {task.taskNumber}</h3>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    task.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                    task.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {task.difficulty}
                  </span>
                </div>

                <div className="p-4 space-y-4">
                  {task.imageUrl && (
                    <img src={task.imageUrl} alt={`Task ${task.taskNumber}`} className="w-full h-40 object-cover rounded-xl" />
                  )}
                  
                  {task.objectDescription && (
                    <p className="text-sm text-stone-500 italic border-l-2 border-stone-300 pl-3">{task.objectDescription}</p>
                  )}

                  <p className="text-stone-800 font-medium">{task.question}</p>

                  {isCompleted ? (
                    <div className="space-y-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-emerald-900">Completed!</p>
                          <p className="text-sm text-emerald-700 mt-1">Your answer: <span className="font-semibold">{taskProgress.userAnswer}</span></p>
                          {taskProgress.feedback && <p className="text-sm text-emerald-600 mt-2 italic">{taskProgress.feedback}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRetake(task.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-stone-300 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Retake Task
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleSubmit(task.id, e)} className="space-y-3">
                      <input
                        type="text"
                        placeholder="Your answer..."
                        value={answers[task.id] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [task.id]: e.target.value }))}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      />
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={!answers[task.id]?.trim()}
                          className="flex-1 bg-emerald-600 text-white font-medium py-2 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Submit Answer
                        </button>
                        {task.hintText && (
                          <button
                            type="button"
                            onClick={() => setShowHint(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                            className={`p-2 rounded-xl transition-colors ${showHint[task.id] ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                            title="Show Hint"
                          >
                            <Lightbulb className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      {showHint[task.id] && task.hintText && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                          <span className="font-semibold">Hint:</span> {task.hintText}
                        </div>
                      )}

                      {taskProgress && !taskProgress.isCorrect && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-sm text-red-800">
                          <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">Incorrect</p>
                            {taskProgress.feedback && <p className="mt-1 opacity-90">{taskProgress.feedback}</p>}
                          </div>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-stone-200 bg-stone-50 shrink-0">
        <button
          onClick={onClose}
          className="w-full py-3 bg-white border border-stone-300 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors"
        >
          Return to Map
        </button>
      </div>
    </div>
  );
}
