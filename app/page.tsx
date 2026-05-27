"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
};

type Filter = "all" | "active" | "completed";

type UndoAction =
  | { type: "single"; todo: Todo; index: number }
  | { type: "bulk"; todos: Todo[] };

const MAX_TODO_LENGTH = 200;
const UNDO_TIMEOUT_MS = 5000;

function loadTodosFromStorage(): Todo[] {
  try {
    const saved = localStorage.getItem("todos");
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Todo =>
        item &&
        typeof item.id === "string" &&
        typeof item.text === "string" &&
        typeof item.completed === "boolean"
    );
  } catch {
    return [];
  }
}

function PageSkeleton() {
  return (
    <main className="min-h-screen py-12 px-4" aria-busy="true" aria-label="読み込み中">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="h-10 w-48 bg-gray-200 rounded-lg mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded mx-auto animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl shadow-md p-4 mb-4 flex gap-2">
          <div className="flex-1 h-10 bg-gray-100 rounded-lg animate-pulse" />
          <div className="w-16 h-10 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl shadow-md mb-4 h-11 animate-pulse" />
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-5 py-4 ${
                i !== 3 ? "border-b border-gray-100" : ""
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
              <div className="flex-1 h-5 bg-gray-100 rounded animate-pulse" />
              <div className="w-7 h-7 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);

  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }, []);

  const dismissUndo = useCallback(() => {
    clearUndoTimer();
    setUndoAction(null);
  }, [clearUndoTimer]);

  const scheduleUndo = useCallback(
    (action: UndoAction) => {
      clearUndoTimer();
      setUndoAction(action);
      undoTimerRef.current = setTimeout(() => {
        setUndoAction(null);
        undoTimerRef.current = null;
      }, UNDO_TIMEOUT_MS);
    },
    [clearUndoTimer]
  );

  useEffect(() => {
    // localStorage はクライアントのみ。SSR と一致させるためマウント後に読み込む
    const loaded = loadTodosFromStorage();
    queueMicrotask(() => {
      setTodos(loaded);
      setMounted(true);
    });
    return () => clearUndoTimer();
  }, [clearUndoTimer]);

  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem("todos", JSON.stringify(todos));
      } catch {
        // ストレージ容量超過などは無視
      }
    }
  }, [todos, mounted]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const addTodo = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: trimmed.slice(0, MAX_TODO_LENGTH),
      completed: false,
      createdAt: Date.now(),
    };
    setTodos((prev) => [newTodo, ...prev]);
    setInputText("");
  };

  const toggleTodo = (id: string) => {
    if (editingId === id) return;
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    dismissUndo();
    setTodos((prev) => {
      const index = prev.findIndex((todo) => todo.id === id);
      if (index === -1) return prev;
      const removed = prev[index];
      scheduleUndo({ type: "single", todo: removed, index });
      if (editingId === id) {
        setEditingId(null);
        setEditText("");
      }
      return prev.filter((todo) => todo.id !== id);
    });
  };

  const clearCompleted = () => {
    dismissUndo();
    setTodos((prev) => {
      const completed = prev.filter((todo) => todo.completed);
      if (completed.length === 0) return prev;
      scheduleUndo({ type: "bulk", todos: completed });
      return prev.filter((todo) => !todo.completed);
    });
  };

  const handleUndo = () => {
    if (!undoAction) return;
    if (undoAction.type === "single") {
      const { todo, index } = undoAction;
      setTodos((prev) => {
        if (prev.some((t) => t.id === todo.id)) return prev;
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, todo);
        return next;
      });
    } else {
      setTodos((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const toRestore = undoAction.todos.filter((t) => !existingIds.has(t.id));
        return [...prev, ...toRestore];
      });
    }
    dismissUndo();
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEditing = (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed) {
      deleteTodo(id);
      return;
    }
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id
          ? { ...todo, text: trimmed.slice(0, MAX_TODO_LENGTH) }
          : todo
      )
    );
    cancelEditing();
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  if (!mounted) return <PageSkeleton />;

  const undoMessage =
    undoAction?.type === "single"
      ? "タスクを削除しました"
      : undoAction
        ? `${undoAction.todos.length} 件の完了タスクを削除しました`
        : "";

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-700 mb-1">Todo リスト</h1>
          <p className="text-gray-500 text-sm">タスクを管理しよう</p>
        </div>

        <form
          onSubmit={addTodo}
          className="bg-white rounded-2xl shadow-md p-4 mb-4 flex gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="新しいタスクを入力..."
            maxLength={MAX_TODO_LENGTH}
            className="flex-1 outline-none text-gray-700 placeholder-gray-400 text-base"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-5 py-2 rounded-xl transition-colors"
          >
            追加
          </button>
        </form>

        <div className="bg-white rounded-2xl shadow-md mb-4 flex overflow-hidden">
          {(["all", "active", "completed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "すべて" : f === "active" ? "未完了" : "完了済み"}
              <span className="ml-1.5 text-xs opacity-70">
                ({f === "all" ? todos.length : f === "active" ? activeCount : completedCount})
              </span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {filteredTodos.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-sm">
                {filter === "completed"
                  ? "完了済みのタスクはありません"
                  : filter === "active"
                    ? "未完了のタスクはありません"
                    : "タスクを追加してください"}
              </p>
            </div>
          ) : (
            <ul>
              {filteredTodos.map((todo, index) => (
                <li
                  key={todo.id}
                  className={`flex items-center gap-3 px-5 py-4 transition-colors hover:bg-gray-50 ${
                    index !== filteredTodos.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    disabled={editingId === todo.id}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50 ${
                      todo.completed
                        ? "bg-green-500 border-green-500"
                        : "border-gray-300 hover:border-indigo-400"
                    }`}
                    aria-label={todo.completed ? "未完了に戻す" : "完了にする"}
                  >
                    {todo.completed && (
                      <svg
                        className="w-3.5 h-3.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>

                  {editingId === todo.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing(todo.id);
                        if (e.key === "Escape") cancelEditing();
                      }}
                      onBlur={() => saveEditing(todo.id)}
                      maxLength={MAX_TODO_LENGTH}
                      className="flex-1 outline-none text-base text-gray-700 border-b-2 border-indigo-400 pb-0.5"
                      aria-label="タスクを編集"
                    />
                  ) : (
                    <span
                      onDoubleClick={() => !todo.completed && startEditing(todo)}
                      className={`flex-1 text-base leading-snug break-words cursor-default ${
                        todo.completed
                          ? "line-through text-gray-400"
                          : "text-gray-700"
                      }`}
                      title={todo.completed ? undefined : "ダブルクリックで編集"}
                    >
                      {todo.text}
                    </span>
                  )}

                  {editingId !== todo.id && (
                    <button
                      onClick={() => startEditing(todo)}
                      disabled={todo.completed}
                      className="text-gray-300 hover:text-indigo-500 transition-colors p-2 rounded-lg hover:bg-indigo-50 disabled:opacity-30 disabled:pointer-events-none"
                      aria-label="編集"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  )}

                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-50"
                    aria-label="削除"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {todos.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-400 px-1">
            <span>{activeCount} 件の未完了タスク</span>
            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="hover:text-red-400 transition-colors"
              >
                完了済みを削除
              </button>
            )}
          </div>
        )}
      </div>

      {undoAction && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-gray-800 text-white text-sm px-5 py-3 rounded-xl shadow-lg max-w-[calc(100vw-2rem)]"
        >
          <span className="truncate">{undoMessage}</span>
          <button
            onClick={handleUndo}
            className="font-semibold text-indigo-300 hover:text-indigo-200 whitespace-nowrap shrink-0"
          >
            元に戻す
          </button>
          <button
            onClick={dismissUndo}
            className="text-gray-400 hover:text-white shrink-0"
            aria-label="閉じる"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </main>
  );
}
