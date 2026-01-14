"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import PromptForm from "./components/PromptForm";
import {
  wrapWithMxFile,
  extractMxCellContent,
  generateSessionId,
  parseStreamResponse,
} from "./lib/diagram-utils";

const DiagramEditor = dynamic(() => import("./components/DiagramEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <p className="text-gray-500">エディタを読み込み中...</p>
    </div>
  ),
});

interface Diagram {
  id: string;
  title: string;
  description: string | null;
  xml: string;
  tags: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

type TabType = "generate" | "saved";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("generate");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveTags, setSaveTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => generateSessionId());
  const [currentXml, setCurrentXml] = useState("");
  const [editorXml, setEditorXml] = useState("");  // エディタに表示するXML
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(null);

  // 保存済み一覧用のstate
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [isLoadingDiagrams, setIsLoadingDiagrams] = useState(false);

  // 保存済み一覧を取得
  const fetchDiagrams = useCallback(async () => {
    setIsLoadingDiagrams(true);
    try {
      const response = await fetch("/api/diagrams");
      if (response.ok) {
        const data = await response.json();
        setDiagrams(data);
      }
    } catch (err) {
      console.error("Failed to fetch diagrams:", err);
    } finally {
      setIsLoadingDiagrams(false);
    }
  }, []);

  // アプリ起動時に保存済み件数を取得
  useEffect(() => {
    fetchDiagrams();
  }, [fetchDiagrams]);

  // タブが「保存済み」に切り替わったら一覧を再取得
  useEffect(() => {
    if (activeTab === "saved") {
      fetchDiagrams();
    }
  }, [activeTab, fetchDiagrams]);

  const handleSubmit = useCallback(
    async (prompt: string) => {
      setIsLoading(true);
      setError(null);

      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

      if (!apiKey) {
        setError(
          "NEXT_PUBLIC_OPENAI_API_KEYが設定されていません。.env.localファイルを確認してください。"
        );
        setIsLoading(false);
        return;
      }

      try {
        const xmlForApi = extractMxCellContent(currentXml);

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ai-provider": "openai",
            "x-ai-api-key": apiKey,
            "x-ai-model": "gpt-4o",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                parts: [{ type: "text", text: prompt }],
              },
            ],
            xml: xmlForApi,
            previousXml: "",
            sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("レスポンスボディが空です");
        }

        const reader = response.body.getReader();

        // edit_diagram用にcurrentXmlを渡す
        for await (const event of parseStreamResponse(reader, xmlForApi)) {
          if (event.type === "diagram" && event.xml) {
            const wrappedXml = wrapWithMxFile(event.xml);
            setCurrentXml(event.xml);
            setEditorXml(wrappedXml);
          } else if (event.type === "error") {
            setError(event.error || "不明なエラーが発生しました");
          }
        }
      } catch (err) {
        console.error("API通信エラー:", err);
        setError(
          err instanceof Error ? err.message : "不明なエラーが発生しました"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentXml, sessionId]
  );

  // 新規保存
  const handleSave = async () => {
    if (!saveTitle.trim()) {
      alert("タイトルを入力してください");
      return;
    }

    if (!currentXml) {
      alert("保存する図形がありません。先に図形を生成してください。");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/diagrams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: saveTitle.trim(),
          description: saveDescription.trim() || null,
          xml: currentXml,
          tags: saveTags.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("保存に失敗しました");
      }

      const saved = await response.json();
      setShowSaveDialog(false);
      setSaveTitle("");
      setSaveDescription("");
      setSaveTags("");
      setCurrentDiagramId(saved.id);

      // 保存済み一覧を更新
      fetchDiagrams();
      alert("保存しました");
    } catch (err) {
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  // 既存データの更新
  const handleUpdate = async () => {
    if (!currentDiagramId || !currentXml) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/diagrams/${currentDiagramId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml: currentXml }),
      });

      if (!response.ok) {
        throw new Error("更新に失敗しました");
      }

      fetchDiagrams();
      alert("更新しました");
    } catch {
      alert("更新に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  // 保存済みデータを読み込み
  const handleLoadDiagram = async (diagram: Diagram) => {
    try {
      const response = await fetch(`/api/diagrams/${diagram.id}`);
      if (!response.ok) throw new Error("Failed to load");

      const data = await response.json();
      setCurrentXml(data.xml);
      setCurrentDiagramId(data.id);

      if (data.xml) {
        const wrappedXml = wrapWithMxFile(data.xml);
        setEditorXml(wrappedXml);
      }

      setActiveTab("generate");
    } catch {
      alert("読み込みに失敗しました");
    }
  };

  // 削除
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return;

    try {
      const response = await fetch(`/api/diagrams/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("削除に失敗しました");

      if (currentDiagramId === id) {
        setCurrentDiagramId(null);
      }

      fetchDiagrams();
    } catch (err) {
      alert("削除に失敗しました");
    }
  };

  // 新規作成
  const handleNewDiagram = () => {
    setCurrentXml("");
    setCurrentDiagramId(null);
    setActiveTab("generate");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* 左ペイン: draw.ioエディタ */}
      <div className="flex-1 h-full border-r border-gray-200 relative">
        <DiagramEditor
          xml={editorXml}
          onChange={(xml) => {
            setCurrentXml(xml);
          }}
        />
      </div>

      {/* 右ペイン */}
      <div className="w-96 h-full bg-white flex flex-col">
        {/* タブヘッダー */}
        <div className="flex border-b border-gray-200 shrink-0">
          <button
            onClick={() => setActiveTab("generate")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "generate"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            AI図形生成
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "saved"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            保存済み ({diagrams.length})
          </button>
        </div>

        {/* タブコンテンツ */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === "generate" ? (
            /* AI生成タブ */
            <div className="flex-1 flex flex-col p-4 min-h-0">
              {currentDiagramId && (
                <div className="mb-3 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700 shrink-0">
                  編集中: {diagrams.find((d) => d.id === currentDiagramId)?.title || "..."}
                </div>
              )}

              <PromptForm onSubmit={handleSubmit} isLoading={isLoading} />

              {/* 保存ボタン */}
              {currentXml && (
                <div className="flex gap-2 mt-4 shrink-0">
                  {currentDiagramId ? (
                    <>
                      <button
                        onClick={handleUpdate}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm"
                      >
                        {isSaving ? "保存中..." : "上書き保存"}
                      </button>
                      <button
                        onClick={() => setShowSaveDialog(true)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        別名保存
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowSaveDialog(true)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      この図を保存
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg shrink-0">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          ) : (
            /* 保存済み一覧タブ */
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3 border-b border-gray-100 shrink-0">
                <button
                  onClick={handleNewDiagram}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  + 新規作成
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoadingDiagrams ? (
                  <div className="p-4 text-center text-gray-500">読み込み中...</div>
                ) : diagrams.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    保存されたデータがありません
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {diagrams.map((diagram) => (
                      <div
                        key={diagram.id}
                        className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                          currentDiagramId === diagram.id ? "bg-blue-50" : ""
                        }`}
                        onClick={() => handleLoadDiagram(diagram)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-800 truncate">
                              {diagram.title}
                            </h3>
                            {diagram.description && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {diagram.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(diagram.updatedAt)} · v{diagram.version}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(diagram.id, diagram.title);
                            }}
                            className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="削除"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-3 border-t border-gray-200 shrink-0">
          <p className="text-xs text-gray-400 text-center">
            Powered by OpenAI & draw.io
          </p>
        </div>
      </div>

      {/* 保存ダイアログ */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
            <h2 className="text-lg font-bold mb-4">業務フロー図を保存</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイトル *
                </label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="例: 受注処理フロー"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="この業務フローの説明..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タグ（カンマ区切り）
                </label>
                <input
                  type="text"
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  placeholder="例: 受注, 営業, 重要"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !saveTitle.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
