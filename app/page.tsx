"use client";

import { useState, useEffect } from "react";

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
};

type Filter = "all" | "active" | "completed";

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("todos");
    if (saved) {
      setTodos(JSON.parse(saved));
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("todos", JSON.stringify(todos));
    }
  }, [todos, mounted]);

  const addTodo = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    };
    setTodos((prev) => [newTodo, ...prev]);
    setInputText("");
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos((prev) => prev.filter((todo) => !todo.completed));
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  if (!mounted) return null;

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-700 mb-1">Todo リスト</h1>
          <p className="text-gray-500 text-sm">タスクを管理しよう</p>
        </div>

        {/* 入力フォーム */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-4 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="新しいタスクを入力..."
            className="flex-1 outline-none text-gray-700 placeholder-gray-400 text-base"
          />
          <button
            onClick={addTodo}
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-5 py-2 rounded-xl transition-colors"
          >
            追加
          </button>
        </div>

        {/* フィルタータブ */}
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

        {/* Todoリスト */}
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
                  {/* チェックボックス */}
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      todo.completed
                        ? "bg-green-500 border-green-500"
                        : "border-gray-300 hover:border-indigo-400"
                    }`}
                    aria-label={todo.completed ? "未完了に戻す" : "完了にする"}
                  >
                    {todo.completed && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* テキスト */}
                  <span
                    className={`flex-1 text-base leading-snug ${
                      todo.completed ? "line-through text-gray-400" : "text-gray-700"
                    }`}
                  >
                    {todo.text}
                  </span>

                  {/* 削除ボタン */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50"
                    aria-label="削除"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* フッター */}
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
    </main>
  );
}
