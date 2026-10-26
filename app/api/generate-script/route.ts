import OpenAI from "openai";

const systemPrompt = `Eres un productor de podcasts. Basado en el texto proporcionado, escribe un guion en formato de diálogo fluido y casual entre dos presentadores.
DEBES devolver ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta:
{
  "inputs": [
    { "text": "[etiqueta de emoción] Texto del presentador 1", "voiceId": "${process.env.VOICE_ID_A}" },
    { "text": "[etiqueta de emoción] Texto del presentador 2", "voiceId": "${process.env.VOICE_ID_B}" }
  ]
}
Usa exactamente el ID ${process.env.VOICE_ID_A} para el Host A y el ID ${process.env.VOICE_ID_B} para el Host B. Puedes usar etiquetas de emoción en inglés entre corchetes al inicio del texto, como [cheerfully], [excited], o [thoughtful].`;

type GeneratedScript = {
  inputs: Array<{
    text: string;
    voiceId: string;
  }>;
};

type UploadedFile = {
  name?: unknown;
  text?: unknown;
};

type GenerateScriptBody = {
  text?: unknown;
  files?: UploadedFile[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateScriptBody;
    let sourceText = typeof body.text === "string" ? body.text.trim() : "";

    if (!sourceText && Array.isArray(body.files) && body.files.length > 0) {
      sourceText = body.files
        .filter(
          (file): file is { name: string; text: string } =>
            typeof file.name === "string" && typeof file.text === "string",
        )
        .map((file) => `\n--- ${file.name} ---\n${file.text}`)
        .join("\n")
        .trim();
    }

    if (!sourceText) {
      return Response.json(
        { error: "Debes seleccionar al menos un archivo." },
        { status: 400 },
      );
    }

    if (!process.env.ABACUS_BASE_URL || !process.env.ABACUS_API_KEY) {
      return Response.json(
        {
          error:
            "Faltan configurar ABACUS_BASE_URL y ABACUS_API_KEY en el entorno del servidor.",
        },
        { status: 500 },
      );
    }

    const openai = new OpenAI({
      baseURL: process.env.ABACUS_BASE_URL,
      apiKey: process.env.ABACUS_API_KEY,
    });

    const userContent = `Texto de los archivos:\n${sourceText}`;
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();

    const requestBody = {
      model: "gpt-5.6-luna",
      temperature: 0.7,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: userContent,
        },
      ],
      chat_id: crypto.randomUUID(),
      id: assistantMessageId,
      user_message: {
        id: userMessageId,
        role: "user",
        content: userContent,
      },
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
      chat_id: string;
      id: string;
      user_message: {
        id: string;
        role: "user";
        content: string;
      };
    };

    const completion = await openai.chat.completions.create(requestBody);

    const scriptText = completion.choices[0]?.message.content?.trim();

    if (!scriptText) {
      return Response.json(
        { error: "Open WebUI no devolvió un guion." },
        { status: 502 },
      );
    }

    let script: GeneratedScript;

    try {
      const parsedScript: unknown = JSON.parse(scriptText);

      if (
        typeof parsedScript !== "object" ||
        parsedScript === null ||
        !Array.isArray((parsedScript as { inputs?: unknown }).inputs) ||
        !(parsedScript as { inputs: unknown[] }).inputs.every(
          (input) =>
            typeof input === "object" &&
            input !== null &&
            typeof (input as { text?: unknown }).text === "string" &&
            typeof (input as { voiceId?: unknown }).voiceId === "string",
        )
      ) {
        throw new Error("La respuesta no tiene la estructura esperada.");
      }

      script = parsedScript as GeneratedScript;
    } catch (error) {
      console.error("La respuesta del LLM no es JSON válido:", error);
      return Response.json(
        { error: "El modelo devolvió un guion con formato inválido." },
        { status: 502 },
      );
    }

    return Response.json({ script });
  } catch (error) {
    console.error("Error al generar el guion:", error);
    return Response.json(
      { error: "No se pudo generar el guion. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
