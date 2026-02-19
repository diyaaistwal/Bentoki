import React, { useState, useEffect, useRef } from 'react';
import { BentoPlan, Task, TaskLocation } from '../types.ts';
import TaskCard from './TaskCard.tsx';

interface BentoLayoutProps {
  plan: BentoPlan;
  onToggleTask: (taskId: string) => void;
  onEditTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onSwitchBento: (taskId: string, target: TaskLocation) => void;
  onPackFromTomorrow: (taskId: string) => void;
  lifetimeCompletions: number;
}

const MORNING_LIMIT = 240;
const EVENING_LIMIT = 180;

export default function BentoLayout({ 
  plan, 
  onToggleTask, 
  onEditTask, 
  onDeleteTask, 
  onSwitchBento, 
  onPackFromTomorrow, 
  lifetimeCompletions
}: BentoLayoutProps) {
  const morningTasks = plan.tasks.filter(t => t.location === 'morning');
  const eveningTasks = plan.tasks.filter(t => t.location === 'evening');
  const tomorrowTasks = plan.tasks.filter(t => t.location === 'tomorrow');

  const morning_complete = morningTasks.length > 0 && morningTasks.every(t => t.completed);
  const evening_complete = eveningTasks.length > 0 && eveningTasks.every(t => t.completed);
  
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  
  const prevMorning = useRef(morning_complete);
  const prevEvening = useRef(evening_complete);
  const morningNotified = useRef(false);
  const eveningNotified = useRef(false);

  useEffect(() => {
    let message = "";

    if (morning_complete && !prevMorning.current && !morningNotified.current) {
      message = "Morning box packed! 🍱✨";
      morningNotified.current = true;
    } 
    else if (evening_complete && !prevEvening.current && !eveningNotified.current) {
      if (morning_complete) {
        message = "Full day packed. Perfect harmony! 🍱🥢";
      } else {
        message = "Evening box ready. So cute! 🍱🌙";
      }
      eveningNotified.current = true;
    }

    if (message) {
      setToastMsg(message);
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
        setTimeout(() => setToastMsg(null), 300);
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (!morning_complete) morningNotified.current = false;
    if (!evening_complete) eveningNotified.current = false;

    prevMorning.current = morning_complete;
    prevEvening.current = evening_complete;
  }, [morning_complete, evening_complete]);

  const renderBox = (tasks: Task[], title: string, limit: number, locationKey: TaskLocation) => {
    const bigTasks = tasks.filter(t => t.priority === 'big');
    const mediumTasks = tasks.filter(t => t.priority === 'medium');
    const smallTasks = tasks.filter(t => t.priority === 'small');
    const otherBento: TaskLocation = locationKey === 'morning' ? 'evening' : 'morning';

    return (
      <section className="mb-14">
        <div className="flex justify-between items-end mb-4 px-3">
          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#2D1E17]/60">{title}</h3>
          <span className="text-[9px] text-[#D68A4F] font-bold uppercase tracking-widest">{limit}m limit</span>
        </div>
        
        <div className="bento-lacquer-box group">
          <div className="wood-grain" />
          <div className="grid grid-cols-12 gap-[8px] relative z-10">
            
            {/* Main Portion (Big) */}
            <div className="col-span-8 h-[240px] flex flex-col overflow-hidden rounded-[1.8rem] compartment-recessed">
              {bigTasks.length > 0 ? (
                <div className="flex-1 overflow-y-auto">
                   {bigTasks.map(task => (
                      <TaskContainer 
                        key={task.id} 
                        task={task} 
                        onToggle={() => onToggleTask(task.id)} 
                        onEdit={(u) => onEditTask(task.id, u)} 
                        onDelete={() => onDeleteTask(task.id)}
                        onSwitchBento={(target) => onSwitchBento(task.id, target)}
                        otherBento={otherBento}
                        lifetimeCompletions={lifetimeCompletions} 
                      />
                   ))}
                </div>
              ) : <EmptyCompartment label="Rice" />}
            </div>

            {/* Protein (Medium) */}
            <div className="col-span-4 h-[240px] flex flex-col overflow-hidden rounded-[1.8rem] compartment-recessed">
              {mediumTasks.length > 0 ? (
                <div className="flex-1 overflow-y-auto">
                   {mediumTasks.map(task => (
                      <TaskContainer 
                        key={task.id} 
                        task={task} 
                        onToggle={() => onToggleTask(task.id)} 
                        onEdit={(u) => onEditTask(task.id, u)} 
                        onDelete={() => onDeleteTask(task.id)}
                        onSwitchBento={(target) => onSwitchBento(task.id, target)}
                        otherBento={otherBento}
                        lifetimeCompletions={lifetimeCompletions} 
                      />
                   ))}
                </div>
              ) : <EmptyCompartment label="Protein" />}
            </div>

            {/* Sides (Small) */}
            <div className="col-span-12 min-h-[140px] flex flex-col overflow-hidden rounded-[1.8rem] compartment-recessed">
              {smallTasks.length > 0 ? (
                <div className="grid grid-cols-2 flex-1">
                   {smallTasks.map((task, idx) => (
                      <div key={task.id} className={`${idx % 2 === 0 ? 'border-r border-[#2D1E17]/10' : ''}`}>
                        <TaskContainer 
                          task={task} 
                          onToggle={() => onToggleTask(task.id)} 
                          onEdit={(u) => onEditTask(task.id, u)} 
                          onDelete={() => onDeleteTask(task.id)}
                          onSwitchBento={(target) => onSwitchBento(task.id, target)}
                          otherBento={otherBento}
                          lifetimeCompletions={lifetimeCompletions} 
                        />
                      </div>
                   ))}
                </div>
              ) : <EmptyCompartment label="Sides" />}
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="pb-20 relative px-1">
      <div 
        aria-live="polite"
        className={`fixed inset-x-6 top-8 z-[300] transition-all duration-500 pointer-events-none ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
      >
        {toastMsg && (
          <div className="bg-[#2D1E17] text-[#F9F3E5] px-8 py-5 rounded-[2.5rem] shadow-[0_30px_70px_-10px_rgba(45,30,23,0.6)] text-center mx-auto max-w-[340px] border border-white/10">
            <p className="text-[13px] font-black uppercase tracking-[0.15em] leading-relaxed japanese-serif">
              {toastMsg}
            </p>
          </div>
        )}
      </div>

      {renderBox(morningTasks, "Morning Box", MORNING_LIMIT, 'morning')}
      {eveningTasks.length > 0 && renderBox(eveningTasks, "Evening Box", EVENING_LIMIT, 'evening')}
      
      {tomorrowTasks.length > 0 && (
        <section className="px-2 mt-12">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black tracking-[0.3em] text-slate-300 uppercase">Tomorrow Queue</h3>
            <span className="text-[9px] text-slate-200 font-black uppercase tracking-widest">{tomorrowTasks.length} items</span>
          </div>
          <div className="space-y-3">
            {tomorrowTasks.map((task) => (
              <div key={task.id} className="bg-white/40 border border-white/60 p-5 rounded-[2.2rem] flex items-center justify-between text-slate-400 shadow-sm relative group hover:bg-white/60 transition-colors">
                <div className="flex flex-col">
                  <span className={`text-[12px] font-bold uppercase tracking-tight truncate pr-4 text-slate-500`}>{task.task_name}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-1">{task.duration_minutes}m</span>
                </div>
                <div className="flex items-center gap-3">
                   <button onClick={() => onPackFromTomorrow(task.id)} className="tap-effect opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black text-slate-400 hover:text-[#546E42] uppercase tracking-widest bg-white border border-slate-100 px-4 py-2 rounded-full shadow-sm">Pack Now</button>
                   <button onClick={() => onDeleteTask(task.id)} className="tap-effect opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black text-red-300 hover:text-red-500 uppercase tracking-widest px-2">X</button>
                   <div className="px-3 py-1 rounded-full border border-slate-100 text-[8px] font-black uppercase tracking-widest opacity-30">STORED</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TaskContainer({ task, onToggle, onEdit, onDelete, onSwitchBento, otherBento, lifetimeCompletions }: any) {
  return (
    <div className="relative h-full group/card">
      <TaskCard 
        task={task} 
        onToggle={onToggle} 
        onEdit={onEdit} 
        onDelete={onDelete} 
        lifetimeCompletions={lifetimeCompletions}
      />
      {!task.completed && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity translate-x-1 group-hover/card:translate-x-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onSwitchBento(otherBento); }} 
            className="bg-[#2D1E17] text-white px-3 py-1.5 rounded-full text-[7px] font-bold uppercase tracking-widest whitespace-nowrap shadow-lg active:scale-95 transition-all"
          >
            To {otherBento === 'morning' ? 'Morning' : 'Evening'}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSwitchBento('tomorrow'); }} 
            className="bg-white/90 text-[#2D1E17] border border-[#2D1E17]/20 px-3 py-1.5 rounded-full text-[7px] font-bold uppercase tracking-widest whitespace-nowrap shadow-lg active:scale-95 transition-all"
          >
            Save Tomorrow
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyCompartment({ label }: { label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center opacity-20 select-none">
      <div className="w-8 h-[1px] bg-[#2D1E17] mb-3" />
      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#2D1E17]">{label}</span>
    </div>
  );
}