
export type Priority = 'big' | 'medium' | 'small';
export type TaskLocation = 'morning' | 'evening' | 'tomorrow';

export interface Task {
  id: string;
  task_name: string;
  duration_minutes: number;
  priority: Priority;
  completed?: boolean;
  location: TaskLocation;
}

export interface BentoPlan {
  tasks: Task[];
  date: string;
}

export interface AppState {
  currentPlan: BentoPlan | null;
  loading: boolean;
  error: string | null;
  lifetimeCompletions: number;
}
