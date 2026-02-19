import React, { useState, useEffect } from 'react';
import { AppState, BentoPlan, Task, Priority, TaskLocation } from './types.ts';
import { extractTasks } from './services/geminiService.ts';
import BentoLayout from './components/BentoLayout.tsx';

const STORAGE_KEY = 'bentoki_storage_v2';
const MORNING_LIMIT = 240; 
const EVENING_LIMIT = 180; 

const LOADING_MESSAGES = [
  "Arranging your maki.",
  "Sharpening chopsticks.",
  "Balancing your bento.",
  "Setting today’s portions.",
  "Checking kitchen capacity."
];

const BentoIcon = () => (
  <div className="relative w-48 h-48 flex items-center justify-center animate-in zoom-in duration-700">
    <svg width="192" height="192" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="0" dy="4" result="offsetblur" />
          <feComponentTransfer><feFuncA type="linear" slope="0.15" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="innerDepth">
          <feOffset dx="0" dy="1.5" />
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite operator="out" in="SourceGraphic" in2="blur" result="inverse" />
          <feFlood floodColor="black" floodOpacity="0.2" result="color" />
          <feComposite operator="in" in="color" in2="inverse" result="shadow" />
          <feComposite operator="over" in="shadow" in2="SourceGraphic" />
        </filter>
      </defs>
      <g filter="url(#logoShadow)">
        <rect x="40" y="40" width="80" height="80" rx="26" fill="#546E42" />
        <rect x="42" y="42" width="76" height="76" rx="24" fill="black" fillOpacity="0.04" />
      </g>
      <g filter="url(#logoShadow)">
        <path d="M138 42 L134 38 L28 92 L32 96 L138 42Z" fill="#F9C38A" />
        <path d="M138 42 L134 38 L28 92 L32 96 L138 42Z" fill="black" opacity="0.1" />
      </g>
      <g filter="url(#logoShadow)">
        <path d="M80 47C85.5 47 90.5 47.5 95 49.5C102 52.5 107.5 58 110.5 65C112.5 69.5 113 74.5 113 80C113 85.5 112.5 90.5 110.5 95C107.5 102 102 107.5 95 110.5C90.5 112.5 85.5 113 80 113C74.5 113 69.5 112.5 65 110.5C58 107.5 52.5 102 49.5 95C47.5 90.5 47 85.5 47 80C47 74.5 47.5 69.5 49.5 65C52.5 58 58 52.5 65 49.5C69.5 47.5 74.5 47 80 47Z" fill="white" />
        <circle cx="80" cy="80" r="19" fill="#3D5030" />
        <g transform="translate(80, 80)" filter="url(#innerDepth)">
           <path d="M-2 -15 C6 -15 15 -10 15 -2 C15 6 6 6 -2 6 C-10 6 -15 2 -15 -8 C-15 -12 -8 -15 -2 -15Z" fill="#F19A8E" stroke="#2D3A24" strokeWidth="0.5" />
           <path d="M-4 4 C-8 4 -16 10 -14 16 C-12 20 -4 18 0 16 C2 14 -1 4 -4 4Z" fill="#9CC589" stroke="#2D3A24" strokeWidth="0.5" />
           <path d="M4 4 C10 2 16 8 16 14 C16 18 10 20 6 16 C4 14 2 10 4 4Z" fill="#FFD966" stroke="#2D3A24" strokeWidth="0.5" />
        </g>
      </g>
    </svg>
  </div>
);

export default function App() {
  const [state, setState] = useState<AppState>({
    currentPlan: null,
    loading: false,
    error: null,
    lifetimeCompletions: 0
  });

  const [inputValue, setInputValue] = useState('');
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const [customDuration, setCustomDuration] = useState('');
  const [activeOverflowTask, setActiveOverflowTask] = useState<Task | null>(null);
  const [selectionModeTasks, setSelectionModeTasks] = useState<Task[] | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isRepacking, setIsRepacking] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const todayStr = new Date().toISOString().split('T')[0];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let plan: BentoPlan | null = parsed.currentPlan;
        if (plan && plan.date !== todayStr) {
          plan = migrateToNewDay(plan.tasks, todayStr);
        }
        setState(prev => ({
          ...prev,
          currentPlan: plan,
          lifetimeCompletions: parsed.lifetimeCompletions || 0
        }));
      } catch (e) { console.error("Storage load failed:", e); }
    }
  }, []);

  useEffect(() => {
    if (state.currentPlan || state.lifetimeCompletions > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentPlan: state.currentPlan,
        lifetimeCompletions: state.lifetimeCompletions
      }));
    }
  }, [state.currentPlan, state.lifetimeCompletions]);

  const migrateToNewDay = (tasks: Task[], date: string): BentoPlan => {
    const migratedTasks = tasks
      .filter(t => t.location === 'tomorrow')
      .map(t => ({ ...t, location: 'morning' as TaskLocation, completed: false }));
    return { tasks: migratedTasks, date };
  };

  const getSessionUsed = (session: TaskLocation, tasks: Task[]) => {
    return tasks.filter(t => t.location === session).reduce((s, t) => s + t.duration_minutes, 0);
  };

  const handleInitialInput = async () => {
    if (!inputValue.trim()) return;
    setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    setIsExtracting(true);
    try {
      const taskNames = await extractTasks(inputValue);
      setIsExtracting(false);
      if (taskNames.length === 0) return;
      setPendingNames(taskNames);
      setInputValue('');
    } catch (err: any) {
      setIsExtracting(false);
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  const handleDurationSubmit = () => {
    const duration = parseInt(customDuration);
    if (isNaN(duration) || duration <= 0) return;
    const taskName = pendingNames[0];
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      task_name: taskName,
      duration_minutes: duration,
      priority: duration >= 90 ? 'big' : duration >= 45 ? 'medium' : 'small',
      completed: false,
      location: 'morning'
    };

    const currentTasks = state.currentPlan?.tasks || [];
    const morningUsed = getSessionUsed('morning', currentTasks);
    const eveningUsed = getSessionUsed('evening', currentTasks);

    if (morningUsed + duration <= MORNING_LIMIT) {
      addTaskToPlan({ ...newTask, location: 'morning' });
      setPendingNames(prev => prev.slice(1));
    } else if (eveningUsed + duration <= EVENING_LIMIT) {
      addTaskToPlan({ ...newTask, location: 'evening' });
      setPendingNames(prev => prev.slice(1));
    } else {
      setActiveOverflowTask(newTask);
    }
    setCustomDuration('');
  };

  const addTaskToPlan = (task: Task) => {
    setState(prev => ({
      ...prev,
      currentPlan: {
        date: prev.currentPlan?.date || new Date().toISOString().split('T')[0],
        tasks: [...(prev.currentPlan?.tasks || []), task]
      }
    }));
    setIsRepacking(false);
  };

  const handleOverflowChoice = (choice: 'tomorrow' | 'force-morning' | 'force-evening') => {
    if (!activeOverflowTask) return;
    if (choice === 'tomorrow') {
      addTaskToPlan({ ...activeOverflowTask, location: 'tomorrow' });
      setActiveOverflowTask(null);
      setPendingNames(prev => prev.slice(1));
    } else {
      const session = choice === 'force-morning' ? 'morning' : 'evening';
      const currentTasks = state.currentPlan?.tasks || [];
      const sessionTasks = currentTasks.filter(t => t.location === (session as TaskLocation));
      setSelectionModeTasks([...sessionTasks, { ...activeOverflowTask, location: session as TaskLocation }]);
      setSelectedTaskIds(new Set());
      setActiveOverflowTask(null);
    }
  };

  const confirmSelectionMode = () => {
    if (!selectionModeTasks) return;
    const session = selectionModeTasks[0].location;
    const finalPlanTasks = (state.currentPlan?.tasks || []).filter(t => 
      !selectionModeTasks.find(sm => sm.id === t.id)
    );
    const updatedSelectionTasks = selectionModeTasks.map(t => ({
      ...t,
      location: selectedTaskIds.has(t.id) ? session : 'tomorrow' as TaskLocation
    }));
    setState(prev => ({
      ...prev,
      currentPlan: { ...prev.currentPlan!, tasks: [...finalPlanTasks, ...updatedSelectionTasks] }
    }));
    setSelectionModeTasks(null);
    setSelectedTaskIds(new Set());
    setPendingNames(prev => prev.slice(1));
  };

  const switchBento = (taskId: string, target: TaskLocation) => {
    const plan = state.currentPlan;
    if (!plan) return;
    const task = plan.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (target === 'tomorrow') { updateTask(taskId, { location: 'tomorrow' }); return; }
    const limit = target === 'morning' ? MORNING_LIMIT : EVENING_LIMIT;
    const used = getSessionUsed(target, plan.tasks.filter(t => t.id !== taskId));
    if (used + task.duration_minutes <= limit) {
      updateTask(taskId, { location: target });
    } else {
      setCapacityError(`${target.charAt(0).toUpperCase() + target.slice(1)} box is full. Move something to Tomorrow instead?`);
      setTimeout(() => setCapacityError(null), 3500);
    }
  };

  const packFromTomorrow = (taskId: string) => {
    const plan = state.currentPlan;
    if (!plan) return;
    const task = plan.tasks.find(t => t.id === taskId);
    if (!task) return;
    const morningUsed = getSessionUsed('morning', plan.tasks);
    const eveningUsed = getSessionUsed('evening', plan.tasks);
    if (morningUsed + task.duration_minutes <= MORNING_LIMIT) {
      updateTask(taskId, { location: 'morning' });
    } else if (eveningUsed + task.duration_minutes <= EVENING_LIMIT) {
      updateTask(taskId, { location: 'evening' });
    } else {
      setCapacityError(`No room left in today's boxes. Move something to tomorrow first.`);
      setTimeout(() => setCapacityError(null), 3500);
    }
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setState(prev => ({
      ...prev,
      currentPlan: prev.currentPlan ? {
        ...prev.currentPlan,
        tasks: prev.currentPlan.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
      } : null
    }));
  };

  const toggleTask = (taskId: string) => {
    const task = state.currentPlan?.tasks.find(t => t.id === taskId);
    if (!task) return;
    const nextCompleted = !task.completed;
    setState(prev => ({
      ...prev,
      currentPlan: prev.currentPlan ? {
        ...prev.currentPlan,
        tasks: prev.currentPlan.tasks.map(t => t.id === taskId ? { ...t, completed: nextCompleted } : t)
      } : null,
      lifetimeCompletions: prev.lifetimeCompletions + (nextCompleted ? 1 : -1)
    }));
  };

  const deleteTask = (taskId: string) => {
    setState(prev => ({
      ...prev,
      currentPlan: prev.currentPlan ? {
        ...prev.currentPlan,
        tasks: prev.currentPlan.tasks.filter(t => t.id !== taskId)
      } : null
    }));
  };

  return (
    <div className="mobile-container p-6 pb-20">
      <header className="flex flex-col items-center pt-16 pb-12 text-center">
        <BentoIcon />
        <div className="flex flex-col items-center mt-[-10px]">
          <h1 className="text-[48px] font-black tracking-[-0.02em] text-[#546E42] leading-none uppercase">Bentōki</h1>
          <p className="text-[14px] font-black tracking-[0.4em] text-[#D68A4F] uppercase mt-4 ml-1">Pack Your Time.</p>
        </div>
      </header>

      {capacityError && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[350] w-[90%] max-w-[400px]">
          <div className="bg-[#2D1E17] text-[#F9F3E5] px-6 py-4 rounded-[1.5rem] text-[11px] font-bold shadow-2xl text-center border border-white/10">
            {capacityError}
          </div>
        </div>
      )}

      {activeOverflowTask && (
        <div className="fixed inset-0 z-[400] bg-[#F9F3E5] p-6 flex flex-col justify-center animate-in fade-in zoom-in">
           <div className="max-w-[400px] mx-auto w-full text-center">
              <h2 className="text-2xl font-black text-[#546E42] mb-4 uppercase tracking-tight">Today's Box is Full</h2>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                <strong>'{activeOverflowTask.task_name}'</strong> ({activeOverflowTask.duration_minutes}m) won't fit in today's boxes. Which one would you like to move to tomorrow?
              </p>
              <div className="space-y-4">
                 <button onClick={() => handleOverflowChoice('tomorrow')} className="tap-effect w-full py-5 bg-[#546E42] text-white rounded-[2rem] text-sm font-bold uppercase tracking-widest shadow-xl">Store '{activeOverflowTask.task_name}' for Tomorrow</button>
                 <button onClick={() => handleOverflowChoice('force-morning')} className="tap-effect w-full py-5 bg-white border border-slate-200 text-[#546E42] rounded-[2rem] text-sm font-bold uppercase tracking-widest">Swap with Morning Activity</button>
                 <button onClick={() => handleOverflowChoice('force-evening')} className="tap-effect w-full py-5 bg-white border border-slate-200 text-[#546E42] rounded-[2rem] text-sm font-bold uppercase tracking-widest">Swap with Evening Activity</button>
              </div>
           </div>
        </div>
      )}

      {selectionModeTasks && (
        <div className="fixed inset-0 z-[400] bg-[#F9F3E5] p-6 flex flex-col animate-in slide-in-from-bottom-4">
           <div className="max-w-[400px] mx-auto w-full flex-1 flex flex-col">
              <h2 className="text-2xl font-black text-[#546E42] mb-2 text-center uppercase">Pack your Session</h2>
              <p className="text-[10px] text-slate-400 mb-8 uppercase tracking-[0.2em] text-center font-bold">Choose items to KEEP today. Others move to Tomorrow.</p>
              <div className="flex-1 overflow-y-auto space-y-3 mb-8 pr-2">
                 {selectionModeTasks.map(task => {
                   const limit = task.location === 'morning' ? MORNING_LIMIT : EVENING_LIMIT;
                   const currentlySelectedMinutes = Array.from(selectedTaskIds).reduce((sum, id) => {
                     const t = selectionModeTasks.find(sm => sm.id === id);
                     return sum + (t?.duration_minutes || 0);
                   }, 0);
                   const wouldExceed = !selectedTaskIds.has(task.id) && (currentlySelectedMinutes + task.duration_minutes > limit);
                   return (
                     <div key={task.id} onClick={() => {
                         const next = new Set(selectedTaskIds);
                         if (next.has(task.id)) next.delete(task.id);
                         else if (!wouldExceed) next.add(task.id);
                         setSelectedTaskIds(next);
                       }} 
                       className={`tap-effect p-5 rounded-[2rem] border transition-all flex justify-between items-center cursor-pointer ${selectedTaskIds.has(task.id) ? 'border-[#546E42] bg-white shadow-sm' : 'border-slate-100 bg-slate-50 opacity-40'} ${wouldExceed ? 'grayscale cursor-not-allowed' : ''}`}>
                       <div className="flex flex-col">
                         <span className="text-[14px] font-bold text-slate-700 uppercase tracking-tight">{task.task_name}</span>
                         <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mt-1">{task.duration_minutes}m</span>
                       </div>
                       <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedTaskIds.has(task.id) ? 'bg-[#546E42] border-[#546E42]' : 'border-slate-200'}`}>
                         {selectedTaskIds.has(task.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                       </div>
                     </div>
                   );
                 })}
              </div>
              <button onClick={confirmSelectionMode} className="tap-effect w-full py-6 bg-[#546E42] text-white rounded-full text-sm font-bold uppercase tracking-widest shadow-2xl">Confirm Selection</button>
           </div>
        </div>
      )}

      {pendingNames.length > 0 && !selectionModeTasks && !activeOverflowTask && (
        <div className="fixed inset-0 z-[300] bg-[#F9F3E5] p-6 flex flex-col justify-center animate-in fade-in">
          <div className="max-w-[400px] mx-auto w-full">
            <h2 className="text-2xl font-black text-[#546E42] mb-4 text-center uppercase">Define Portion</h2>
            <p className="text-sm text-slate-400 mb-8 italic text-center">How much time for "{pendingNames[0]}"?</p>
            <div className="relative mb-8">
              <input type="number" value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleDurationSubmit()} placeholder="Minutes" className="w-full p-6 bg-white border border-slate-100 rounded-[2rem] text-3xl font-black outline-none text-[#2D1E17] shadow-sm text-center" autoFocus />
            </div>
            <button onClick={handleDurationSubmit} className="tap-effect w-full py-5 bg-[#546E42] text-white rounded-full text-base font-bold uppercase tracking-widest shadow-xl">Confirm Duration</button>
          </div>
        </div>
      )}

      {!pendingNames.length && !selectionModeTasks && !activeOverflowTask && (
        <>
          {(!state.currentPlan || isRepacking || isExtracting || state.loading) ? (
            <div className="flex-1 flex flex-col justify-between animate-in fade-in slide-in-from-bottom-4">
              {isExtracting ? (
                <div className="flex-1 flex flex-col items-center justify-center animate-pulse">
                  <BentoIcon />
                  <p className="text-[10px] uppercase tracking-[0.4em] text-[#546E42] font-black">{loadingMessage}</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 flex flex-col">
                    <textarea value={inputValue} autoFocus={isRepacking} onChange={(e) => setInputValue(e.target.value)} placeholder={isRepacking ? "Add more focus..." : "What's on your plate today?"} className="w-full h-48 p-8 bg-white border border-slate-100 rounded-[2.5rem] text-lg resize-none shadow-sm outline-none font-bold text-slate-700" />
                  </div>
                  <div className="pb-8 flex flex-col items-center">
                    <button onClick={handleInitialInput} className="tap-effect bg-[#546E42] text-white rounded-full py-5 px-12 text-lg font-bold uppercase tracking-widest shadow-xl w-full max-w-[320px]">Pack my Bento</button>
                    {isRepacking && <button onClick={() => { setIsRepacking(false); setInputValue(''); }} className="tap-effect mt-6 text-[10px] uppercase tracking-[0.2em] text-[#D68A4F] text-center font-black">Cancel</button>}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 relative">
              <div className="flex justify-between items-center mb-8">
                <button onClick={() => setIsRepacking(true)} className="text-[10px] font-black text-[#D68A4F] uppercase tracking-[0.2em] flex items-center gap-2 tap-effect"><span>➕</span> Add Activities</button>
              </div>
              <BentoLayout plan={state.currentPlan!} onToggleTask={toggleTask} onEditTask={updateTask} onDeleteTask={deleteTask} onSwitchBento={switchBento} onPackFromTomorrow={packFromTomorrow} lifetimeCompletions={state.lifetimeCompletions} />
            </div>
          )}
        </>
      )}
    </div>
  );
}