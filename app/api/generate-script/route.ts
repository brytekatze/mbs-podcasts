import OpenAI from "openai";

const systemPrompt =
  "Eres un productor de podcasts. Basado en el texto proporcionado, escribe un guion en formato de diálogo fluido, casual y entretenido entre dos presentadores (Host A y Host B) que analizan el contenido. Devuelve únicamente el diálogo.";

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

    if (!process.env.OPENWEBUI_BASE_URL || !process.env.OPENWEBUI_API_KEY) {
      return Response.json(
        {
          error:
            "Faltan configurar OPENWEBUI_BASE_URL y OPENWEBUI_API_KEY en el entorno del servidor.",
        },
        { status: 500 },
      );
    }

    const openai = new OpenAI({
      baseURL: process.env.OPENWEBUI_BASE_URL,
      apiKey: process.env.OPENWEBUI_API_KEY,
    });

    const userContent = `Texto de los archivos:\n${sourceText}`;
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();

    const requestBody = {
      model: "gemma4:26b",
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

    const script = completion.choices[0]?.message.content?.trim();

    if (!script) {
      return Response.json(
        { error: "Open WebUI no devolvió un guion." },
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
