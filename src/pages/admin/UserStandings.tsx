import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Trophy, Medal, Star } from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
}

interface UserProgress {
  userId: string;
  isCorrect: boolean;
  score?: number;
}

interface UserStanding {
  user: UserProfile;
  totalScore: number;
  tasksCompleted: number;
}

export default function UserStandings() {
  const [standings, setStandings] = useState<UserStanding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProgress = () => {};

    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersMap = new Map<string, UserProfile>();
        usersSnap.docs.forEach(doc => {
          usersMap.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
        });

        unsubProgress = onSnapshot(collection(db, 'userProgress'), (progressSnap) => {
          const userStats = new Map<string, { score: number; completed: number }>();

          progressSnap.docs.forEach(doc => {
            const data = doc.data() as UserProgress;
            if (data.isCorrect) {
              const current = userStats.get(data.userId) || { score: 0, completed: 0 };
              userStats.set(data.userId, {
                score: current.score + (data.score || 0),
                completed: current.completed + 1
              });
            }
          });

          const standingsList: UserStanding[] = [];
          userStats.forEach((stats, userId) => {
            const user = usersMap.get(userId);
            if (user) {
              standingsList.push({
                user,
                totalScore: stats.score,
                tasksCompleted: stats.completed
              });
            }
          });

          standingsList.sort((a, b) => b.totalScore - a.totalScore);
          setStandings(standingsList);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error fetching standings:", error);
        setLoading(false);
      }
    };

    fetchData();

    return () => unsubProgress();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-stone-500">Loading standings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          User Standings
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
            <tr>
              <th className="px-6 py-4 font-medium w-16 text-center">Rank</th>
              <th className="px-6 py-4 font-medium">User Name</th>
              <th className="px-6 py-4 font-medium text-right">Tasks Completed</th>
              <th className="px-6 py-4 font-medium text-right">Total Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {standings.map((standing, index) => (
              <tr key={standing.user.uid} className="hover:bg-amber-50/30 transition-colors">
                <td className="px-6 py-4 text-center">
                  {index === 0 && <Medal className="w-5 h-5 text-amber-400 mx-auto" />}
                  {index === 1 && <Medal className="w-5 h-5 text-stone-400 mx-auto" />}
                  {index === 2 && <Medal className="w-5 h-5 text-amber-700 mx-auto" />}
                  {index > 2 && <span className="font-medium text-stone-500">{index + 1}</span>}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-stone-900">{standing.user.displayName}</span>
                    <span className="text-xs text-stone-500">{standing.user.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-medium text-stone-700">
                  {standing.tasksCompleted}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold">
                    {standing.totalScore} pts
                  </span>
                </td>
              </tr>
            ))}
            {standings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                  <Star className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p>No user progress found yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
