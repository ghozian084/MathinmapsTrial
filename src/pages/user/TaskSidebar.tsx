import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { X, CheckCircle, XCircle, HelpCircle, Lightbulb, RotateCcw, Loader2, GripVertical, ChevronRight, Wrench } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import stringSimilarity from 'string-similarity';

interface Task {
  id: string;
  pointId: string;
  taskNumber: number;
  question: string;
  answerKeyRegex: string;
  minAnswer?: number;
  maxAnswer?: number;
  feedbackLogic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  imageUrl: string;
  objectDescription: string;
  hintText: string;
  hintText2: string;
  tools: string[];
  type?: 'short_answer' | 'multiple_choice' | 'drag_drop' | 'interval';
  options?: string[];
  dragItems?: { id: string; content: string }[];
  dropTargets?: { id: string; label: string; correctItemId: string }[];
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
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
  const [selectedItem, setSelectedItem] = useState<Record<string, string>>({});

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

    setIsSubmitting(prev => ({ ...prev, [taskId]: true }));

    let isCorrect = false;
    const taskType = task.type || 'short_answer';

    if (taskType === 'short_answer') {
      const studentAnswer = answer.trim().toLowerCase();
      const correctAnswers = (task.answerKeyRegex || '').split(';').map(a => a.trim().toLowerCase());
      
      // Check for exact match first (case-insensitive)
      isCorrect = correctAnswers.some(correct => studentAnswer === correct);

      // If not exact, try fuzzy matching for each possible correct answer
      if (!isCorrect) {
        isCorrect = correctAnswers.some(correct => {
          const similarity = stringSimilarity.compareTwoStrings(studentAnswer, correct);
          return similarity > 0.85; // 85% similarity threshold for typos
        });
      }

      // Legacy Regex Fallback (in case some tasks still use it)
      if (!isCorrect && (task.answerKeyRegex.includes('/') || task.answerKeyRegex.includes('('))) {
        try {
          let regexStr = task.answerKeyRegex;
          let flags = 'i'; // Default to case-insensitive
          
          const match = regexStr.match(/^\/(.*)\/([a-z]*)$/);
          if (match) {
            regexStr = match[1];
            flags = match[2] || 'i';
          }
          const regex = new RegExp(regexStr, flags);
          isCorrect = regex.test(answer.trim());
        } catch (e) {
          // Ignore regex errors
        }
      }
    } else if (taskType === 'multiple_choice') {
      const studentAnswer = answer.trim().toLowerCase();
      const correctKey = (task.answerKeyRegex || '').trim().toLowerCase();
      
      if (correctKey.startsWith('/') && correctKey.includes('/', 1)) {
        try {
          const match = correctKey.match(/^\/(.*)\/([a-z]*)$/);
          const regexStr = match ? match[1] : correctKey.replace(/^\/|\/$/g, '');
          const flags = (match && match[2]) ? match[2] : 'i';
          const regex = new RegExp(regexStr, flags);
          isCorrect = regex.test(answer.trim());
        } catch (e) {
          isCorrect = studentAnswer === correctKey;
        }
      } else {
        // Exact match (case-insensitive)
        isCorrect = studentAnswer === correctKey;
      }
    } else if (taskType === 'drag_drop') {
      // For drag_drop, answer is expected to be a JSON string of { targetId: itemId }
      try {
        const mapping = JSON.parse(answer);
        isCorrect = task.dropTargets?.every(target => mapping[target.id] === target.correctItemId) ?? false;
      } catch (e) {
        isCorrect = false;
      }
    } else if (taskType === 'interval') {
      const studentAnswer = parseFloat(answer);
      if (!isNaN(studentAnswer)) {
        const min = task.minAnswer ?? -Infinity;
        const max = task.maxAnswer ?? Infinity;
        isCorrect = studentAnswer >= min && studentAnswer <= max;
      } else {
        isCorrect = false;
      }
    }

    let feedbackMsg = isCorrect ? 'Correct! Well done.' : 'Incorrect. Try again.';

    try {
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are a helpful math tutor. 
Context/Logic to follow: ${task.feedbackLogic || 'Provide constructive, encouraging feedback without revealing the answer.'}
The student is answering: "${task.question}". 
The correct answer is: "${task.answerKeyRegex}".
The student answered: "${answer}".
The student's answer is evaluated as ${isCorrect ? 'CORRECT' : 'INCORRECT'}.
Provide a short, constructive, and encouraging feedback message (max 2 sentences). 
Do not reveal the exact answer if they are incorrect, but give a small hint or encouragement based on the context provided.`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
        
        if (response.text) {
          feedbackMsg = response.text.trim();
        }
      }
    } catch (error) {
      console.error('Error generating AI feedback:', error);
      // Fallback to basic logic if AI fails
      if (task.feedbackLogic) {
        if (isCorrect && task.feedbackLogic.includes('IF MATCH THEN')) {
          const match = task.feedbackLogic.match(/IF MATCH THEN '([^']+)'/);
          if (match) feedbackMsg = match[1];
        } else if (!isCorrect && task.feedbackLogic.includes('ELSE')) {
          const match = task.feedbackLogic.match(/ELSE '([^']+)'/);
          if (match) feedbackMsg = match[1];
        }
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
    } finally {
      setIsSubmitting(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleRetake = async (taskId: string) => {
    if (!user || !point) return;
    
    try {
      // Find all progress documents for this user and task
      const q = query(
        collection(db, 'userProgress'),
        where('userId', '==', user.uid),
        where('pointId', '==', point.id),
        where('taskId', '==', taskId)
      );
      
      const snapshot = await getDocs(q);
      
      // Delete all found documents
      const deletePromises = snapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, 'userProgress', docSnapshot.id))
      );
      
      await Promise.all(deletePromises);

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
  };

  if (!isOpen || !point) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-2xl border-l border-stone-200 flex flex-col z-20 transform transition-transform duration-300">
      <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-stone-50 shrink-0">
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">{mapName}</p>
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
              <div key={task.id} className={`bg-white rounded-2xl border ${isCompleted ? 'border-blue-200 bg-blue-50/30' : 'border-stone-200'} overflow-hidden shadow-sm`}>
                <div className={`px-4 py-3 border-b ${isCompleted ? 'border-blue-100 bg-blue-50' : 'border-stone-100 bg-stone-50'} flex items-center justify-between`}>
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

                  {task.tools && task.tools.length > 0 && (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Wrench className="w-3 h-3" /> Tools Needed
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {task.tools.map((tool, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[11px] text-stone-600 font-medium">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {isCompleted ? (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Completed!</p>
                          {task.type === 'drag_drop' ? (
                            <p className="text-sm text-blue-700 mt-1">Successfully matched all items!</p>
                          ) : (
                            <p className="text-sm text-blue-700 mt-1">Your answer: <span className="font-semibold">{taskProgress.userAnswer}</span></p>
                          )}
                          {taskProgress.feedback && <p className="text-sm text-blue-600 mt-2 italic">{taskProgress.feedback}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRetake(task.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-stone-300 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Erase Answer
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleSubmit(task.id, e)} className="space-y-4">
                      {/* Task Content based on Type */}
                      {(!task.type || task.type === 'short_answer') && (
                        <input
                          type="text"
                          placeholder="Your answer..."
                          value={answers[task.id] || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [task.id]: e.target.value }))}
                          className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      )}

                      {task.type === 'multiple_choice' && (
                        <div className="space-y-2">
                          {task.options?.map((option, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setAnswers(prev => ({ ...prev, [task.id]: option }))}
                              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                                answers[task.id] === option
                                  ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                                  : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}

                      {task.type === 'drag_drop' && (
                        <div className="space-y-4">
                          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Items to match</p>
                            <div className="flex flex-wrap gap-2">
                              {task.dragItems?.map(item => {
                                // Check if this item is already placed
                                const currentMapping = JSON.parse(answers[task.id] || '{}');
                                const isPlaced = Object.values(currentMapping).includes(item.id);
                                
                                return (
                                  <motion.div
                                    key={item.id}
                                    layoutId={`${task.id}-${item.id}`}
                                    className={`px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all ${
                                      isPlaced 
                                        ? 'bg-stone-200 border-stone-300 text-stone-400 opacity-50' 
                                        : 'bg-white border-stone-200 text-stone-700 shadow-sm hover:border-blue-300'
                                    }`}
                                    onClick={() => {
                                      if (!isPlaced) {
                                        setSelectedItem(prev => ({ ...prev, [task.id]: item.id }));
                                      }
                                    }}
                                  >
                                    {item.content}
                                    {selectedItem[task.id] === item.id && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm" />
                                    )}
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="space-y-2">
                            {task.dropTargets?.map(target => {
                              const currentMapping = JSON.parse(answers[task.id] || '{}');
                              const matchedItemId = currentMapping[target.id];
                              const matchedItem = task.dragItems?.find(i => i.id === matchedItemId);

                              return (
                                <div key={target.id} className="flex items-center gap-3">
                                  <div className="flex-1 p-3 bg-stone-100 border border-stone-200 rounded-xl text-sm font-medium text-stone-600">
                                    {target.label}
                                  </div>
                                  <div className="w-8 flex justify-center text-stone-300">
                                    <ChevronRight className="w-5 h-5" />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const selectedId = selectedItem[task.id];
                                      if (selectedId) {
                                        const newMapping = { ...currentMapping, [target.id]: selectedId };
                                        setAnswers(prev => ({ ...prev, [task.id]: JSON.stringify(newMapping) }));
                                        setSelectedItem(prev => {
                                          const next = { ...prev };
                                          delete next[task.id];
                                          return next;
                                        });
                                      } else if (matchedItemId) {
                                        // Remove mapping
                                        const newMapping = { ...currentMapping };
                                        delete newMapping[target.id];
                                        setAnswers(prev => ({ ...prev, [task.id]: JSON.stringify(newMapping) }));
                                      }
                                    }}
                                    className={`flex-1 p-3 rounded-xl border-2 border-dashed transition-all min-h-[46px] flex items-center justify-center text-sm ${
                                      matchedItem
                                        ? 'bg-blue-50 border-blue-200 text-blue-700 border-solid'
                                        : 'bg-stone-50 border-stone-200 text-stone-400 hover:bg-stone-100'
                                    }`}
                                  >
                                    {matchedItem ? matchedItem.content : 'Click to place'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-stone-400 italic">Click an item above, then click a target box to match them.</p>
                        </div>
                      )}

                      {task.type === 'interval' && (
                        <div className="space-y-2">
                          <input
                            type="number"
                            step="any"
                            placeholder="Enter numerical value..."
                            value={answers[task.id] || ''}
                            onChange={(e) => setAnswers(prev => ({ ...prev, [task.id]: e.target.value }))}
                            className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          />
                          <p className="text-[10px] text-stone-400 italic">Enter your measurement or calculated value.</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={!answers[task.id]?.trim() || isSubmitting[task.id]}
                          className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isSubmitting[task.id] ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Answer'}
                        </button>
                        {(task.hintText || task.hintText2) && (
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

                      {showHint[task.id] && (
                        <div className="space-y-2">
                          {task.hintText && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                              <span className="font-semibold">Hint 1:</span> {task.hintText}
                            </div>
                          )}
                          {task.hintText2 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                              <span className="font-semibold">Hint 2:</span> {task.hintText2}
                            </div>
                          )}
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
