import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

type DialogueInput = {
  text: string;
  voiceId: string;
};

type GenerateAudioBody = {
  inputs?: unknown;
};

export async function POST(req: Request) {
  try {
    const { inputs } = (await req.json()) as GenerateAudioBody;

    if (
      !Array.isArray(inputs) ||
      !inputs.every(
        (input): input is DialogueInput =>
          typeof input === "object" &&
          input !== null &&
          typeof (input as { text?: unknown }).text === "string" &&
          typeof (input as { voiceId?: unknown }).voiceId === "string",
      )
    ) {
      return NextResponse.json(
        { error: "El cuerpo debe incluir un arreglo válido de inputs." },
        { status: 400 },
      );
    }

    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const audioStream = await elevenlabs.textToDialogue.convert({ inputs });

    return new NextResponse(audioStream, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("Error al generar el audio con ElevenLabs:", error);

    return NextResponse.json(
      { error: "No se pudo generar el audio. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
