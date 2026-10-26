"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";

const acceptedExtensions = /\.(pdf|doc|docx|txt|md|rtf)$/i;

type GeneratedScript = {
  inputs: Array<{
    text: string;
    voiceId: string;
  }>;
};

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [error, setError] = useState("");

  const addFiles = (selectedFiles: FileList | File[]) => {
    const documents = Array.from(selectedFiles).filter((file) =>
      acceptedExtensions.test(file.name),
    );

    setFiles((currentFiles) => {
      const mergedFiles = [...currentFiles, ...documents];

      return mergedFiles.filter(
        (file, index, allFiles) =>
          index === allFiles.findIndex((item) => item.name === file.name),
      );
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(event.target.files);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const removeFile = (fileName: string) => {
    setFiles((currentFiles) =>
      currentFiles.filter((file) => file.name !== fileName),
    );
  };

  const generateScript = async () => {
    if (files.length === 0 || isGenerating) return;

    setIsGenerating(true);
    setScript(null);
    setError("");

    try {
      const extractedText = (
        await Promise.all(files.map((file) => file.text()))
      ).join("\n\n");

      const requestBody = { text: extractedText };

      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data: { script?: GeneratedScript; error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo generar el guion.");
      }

      setScript(data.script ?? null);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Ocurrió un error al generar el guion.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-8 sm:px-10 sm:py-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-sm font-medium text-violet-200">
              <span className="h-2 w-2 rounded-full bg-violet-400" />
              Conversor de documentos a podcast
            </div>

            <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
              Convierte tus documentos en conversaciones que puedes escuchar.
            </h1>

            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Sube uno o varios documentos y prepara el contenido para generar
              un episodio de podcast.
            </p>
          </div>

          <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
            <label
              htmlFor="document-upload"
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
                isDragging
                  ? "border-violet-400 bg-violet-400/10"
                  : "border-slate-600 bg-slate-900/40 hover:border-violet-400/70 hover:bg-slate-900/70"
              }`}
            >
              <input
                id="document-upload"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md,.rtf"
                onChange={handleFileChange}
                className="sr-only"
              />

              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-7 w-7"
                  aria-hidden="true"
                >
                  <path d="M12 16V4m0 0L8 8m4-4 4 4" />
                  <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
                </svg>
              </div>

              <p className="text-lg font-semibold text-white">
                Arrastra tus documentos aquí
              </p>
              <p className="mt-2 text-sm text-slate-400">
                o haz clic para explorar archivos
              </p>
              <span className="mt-4 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-slate-300">
                PDF, DOC, DOCX, TXT, MD o RTF
              </span>
            </label>

            {files.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-200">
                    Documentos seleccionados
                  </h2>
                  <span className="text-xs text-slate-400">
                    {files.length} {files.length === 1 ? "archivo" : "archivos"}
                  </span>
                </div>

                <ul className="space-y-3">
                  {files.map((file) => (
                    <li
                      key={file.name}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6M8 13h8M8 17h6" />
                          </svg>
                        </div>

                        <span className="truncate text-sm text-slate-200">
                          {file.name}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(file.name)}
                        aria-label={`Eliminar ${file.name}`}
                        className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5"
                          aria-hidden="true"
                        >
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={generateScript}
                disabled={files.length === 0 || isGenerating}
                className="rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
              >
                {isGenerating ? "Generando guion..." : "Generar Podcast"}
              </button>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            )}

            {script && (
              <section
                aria-labelledby="generated-script-title"
                className="rounded-2xl border border-violet-400/20 bg-slate-950/60 p-5 sm:p-6"
              >
                <h2
                  id="generated-script-title"
                  className="mb-4 text-lg font-semibold text-white"
                >
                  Guion generado
                </h2>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-200">
                  {JSON.stringify(script, null, 2)}
                </pre>
              </section>
            )}

          </div>
        </section>
      </div>
    </main>
  );
}
