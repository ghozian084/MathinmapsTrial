import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Map, MapPin, ListTodo, Users, Activity, LogOut, Link, Trophy } from 'lucide-react';
import MapsManager from './MapsManager';
import PointsManager from './PointsManager';
import ConnectionsManager from './ConnectionsManager';
import TasksManager from './TasksManager';
import UsersManager from './UsersManager';
import UserStandings from './UserStandings';
import Monitoring from './Monitoring';

type Tab = 'maps' | 'points' | 'connections' | 'tasks' | 'users' | 'standings' | 'monitoring';

export default function AdminDashboard() {
  const { signOut, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('maps');

  const tabs = [
    { id: 'maps', label: 'Maps', icon: Map },
    { id: 'points', label: 'Points', icon: MapPin },
    { id: 'connections', label: 'Connections', icon: Link },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'standings', label: 'Standings', icon: Trophy },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
  ] as const;

  return (
    <div className="min-h-screen bg-stone-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-stone-200 flex flex-col">
        <div className="p-6 border-b border-stone-200">
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <MapPin className="text-blue-600" />
            Mathinmaps
          </h1>
          <p className="text-xs text-stone-500 mt-1">Admin Dashboard</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-200">
          <div className="mb-4 px-4">
            <p className="text-sm font-medium text-stone-900">{profile?.displayName}</p>
            <p className="text-xs text-stone-500 truncate">{profile?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {activeTab === 'maps' && <MapsManager />}
          {activeTab === 'points' && <PointsManager />}
          {activeTab === 'connections' && <ConnectionsManager />}
          {activeTab === 'tasks' && <TasksManager />}
          {activeTab === 'users' && <UsersManager />}
          {activeTab === 'standings' && <UserStandings />}
          {activeTab === 'monitoring' && <Monitoring />}
        </div>
      </div>
    </div>
  );
}
