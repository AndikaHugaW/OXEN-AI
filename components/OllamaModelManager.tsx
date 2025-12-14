'use client';

import { useState, useEffect } from 'react';

interface Model {
  name: string;
  size: number;
  modified_at: string;
}

export default function OllamaModelManager() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama3');

  // Popular models to download
  const popularModels = [
    { name: 'llama3', label: 'Llama 3 (Latest)', size: '~4.7 GB' },
    { name: 'llama3:8b', label: 'Llama 3 8B (Smaller)', size: '~4.7 GB' },
    { name: 'llama2', label: 'Llama 2', size: '~3.8 GB' },
    { name: 'llama2:13b', label: 'Llama 2 13B', size: '~7.3 GB' },
  ];

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/ollama/models');
      const data = await response.json().catch((parseError) => {
        console.error('JSON parse error:', parseError);
        return { success: false, message: 'Invalid response from server' };
      });
      
      if (data.success) {
        setModels(data.models || []);
      } else {
        setError(data.message || 'Failed to load models');
      }
    } catch (err: any) {
      setError('Tidak dapat terhubung ke Ollama. Pastikan Ollama sudah terinstall dan berjalan.');
      console.error('Error loading models:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadModel = async (modelName: string) => {
    setDownloading(modelName);
    setProgress('Memulai download...');
    setError('');

    try {
      const response = await fetch('/api/ollama/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: modelName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to start download' }));
        throw new Error(errorData.message || errorData.error || 'Failed to start download');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines (JSON objects are separated by newlines)
        const lines = buffer.split('\n');
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          try {
            const data = JSON.parse(trimmedLine);
            
            // Handle different response formats from Ollama
            if (data.status) {
              setProgress(data.status);
            }
            if (data.completed || data.status === 'success') {
              setProgress('Download selesai!');
              setTimeout(() => {
                loadModels();
                setDownloading(null);
                setProgress('');
              }, 1000);
              return;
            }
            // Handle progress updates
            if (data.digest || data.total) {
              const percent = data.completed && data.total 
                ? Math.round((data.completed / data.total) * 100)
                : null;
              if (percent !== null) {
                setProgress(`Downloading... ${percent}%`);
              } else if (data.status) {
                setProgress(data.status);
              }
            }
          } catch (parseError) {
            // Ignore parse errors for non-JSON lines (might be empty or partial)
            console.debug('Skipping non-JSON line:', trimmedLine);
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer.trim());
          if (data.completed || data.status === 'success') {
            setProgress('Download selesai!');
          }
        } catch {
          // Ignore if final buffer is not valid JSON
        }
      }

      // If we get here, download completed
      setProgress('Download selesai!');
      setTimeout(() => {
        loadModels();
        setDownloading(null);
        setProgress('');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Gagal download model');
      setDownloading(null);
      setProgress('');
    }
  };

  const isModelDownloaded = (modelName: string) => {
    return models.some((m) => m.name === modelName || m.name.startsWith(modelName + ':'));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📦 Kelola Model Llama
        </h3>
        <button
          onClick={loadModels}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Popular Models to Download */}
      <div>
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
          Download Model (Pilih salah satu):
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {popularModels.map((model) => {
            const isDownloaded = isModelDownloaded(model.name);
            const isDownloading = downloading === model.name;

            return (
              <div
                key={model.name}
                className={`p-3 border rounded-lg ${
                  isDownloaded
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {model.label}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {model.size}
                    </p>
                  </div>
                  {isDownloaded ? (
                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                      ✓ Terinstall
                    </span>
                  ) : (
                    <button
                      onClick={() => downloadModel(model.name)}
                      disabled={isDownloading || !!downloading}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDownloading ? 'Downloading...' : 'Download'}
                    </button>
                  )}
                </div>
                {isDownloading && progress && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {progress}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Installed Models List */}
      <div>
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
          Model yang Terinstall ({models.length}):
        </h4>
        {models.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Belum ada model yang terinstall. Download model di atas.
          </p>
        ) : (
          <div className="space-y-2">
            {models.map((model) => (
              <div
                key={model.name}
                className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {model.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(model.modified_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Catatan:</strong> Pastikan Ollama sudah terinstall dan berjalan. 
          Jika error, pastikan Ollama service aktif atau jalankan <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">ollama serve</code> di terminal.
        </p>
      </div>
    </div>
  );
}

