import React, { useState, useEffect, useRef } from 'react';
import { Task, Priority } from '../types.ts';

interface TaskCardProps {
  task: Task;
  onToggle?: () => void;
  onEdit?: (updates: Partial<Task>) => void;
  onDelete?: () => void;
  lifetimeCompletions: number;
}

export default function TaskCard({ 
  task, 
  onToggle, 
  onEdit, 
  onDelete, 
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(task.task_name);
  const [tempDuration, setTempDuration] = useState(task.duration_minutes.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (onEdit) {
      const dur = parseInt(tempDuration);
      onEdit({ 
        task_name: tempName, 
        duration_minutes: isNaN(dur) ? task.duration_minutes : dur 
      });
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="absolute inset-0 z-50 bg-white p-5 flex flex-col justify-between">
        <div className="flex flex-col gap-3">
          <input ref={inputRef} type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className="text-base font-bold japanese-serif outline-none bg-transparent w-full border-b border-slate-100 pb-2" autoFocus />
          <div className="flex items-center gap-2">
            <div className="relative w-24">
               <input type="number" value={tempDuration} onChange={(e) => setTempDuration(e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none" />
               <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] text-slate-400 font-bold uppercase">min</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <button onClick={onDelete} className="tap-effect text-[9px] font-bold text-red-400 uppercase tracking-widest">Delete</button>
          <div className="flex gap-2">
             <button onClick={() => setIsEditing(false)} className="tap-effect text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cancel</button>
             <button onClick={handleSave} className="tap-effect px-4 py-2 bg-[#2D1E17] text-white text-[9px] font-bold uppercase tracking-widest rounded-full">Save</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`h-full w-full p-5 flex flex-col justify-between cursor-pointer tap-effect transition-all duration-300 ${task.completed ? 'opacity-30' : ''}`}
      onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${task.completed ? 'bg-emerald-500' : 'bg-[#D68A4F]'}`} />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{task.priority}</span>
          </div>
          {task.completed && (
            <div className="text-emerald-600">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          )}
        </div>
        
        <h3 className={`text-[15px] font-bold leading-snug japanese-serif flex-grow pr-6 ${task.completed ? 'line-through text-slate-300' : 'text-[#2D1E17]'}`}>
          {task.task_name}
        </h3>

        <div className="flex items-center justify-between mt-4">
          <button 
            onClick={(e) => { e.stopPropagation(); if (!task.completed) setIsEditing(true); }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all ${task.completed ? 'opacity-30' : 'bg-slate-50 hover:bg-slate-100'}`}
          >
            <span className="text-[10px] font-black text-slate-500 japanese-serif tracking-tighter">{task.duration_minutes}m</span>
          </button>
          <div className="flex items-center gap-1">
             {[...Array(3)].map((_, i) => (
               <div key={i} className={`w-0.5 h-0.5 rounded-full ${task.completed ? 'bg-emerald-200' : 'bg-[#2D1E17]/10'}`} />
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}