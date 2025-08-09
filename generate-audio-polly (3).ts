"use server"

import { cleanScript } from "@/lib/utils/clean-script"
import { synthesizeSpeechWithPolly } from "@/lib/utils/polly-tts-client"

export async function generateAudioWithPolly(script: string): Promise<string> {
  try {
    // Clean the script for TTS
    const cleanedScript = cleanScript(script)
    console.log(`Sending script to Amazon Polly TTS: ${cleanedScript.length} characters`)

    // Directly call the utility function
    const { audioContent, contentType } = await synthesizeSpeechWithPolly(
      cleanedScript,
      {
        name: "Danielle",
        engine: "generative",
        languageCode: "en-US",
      },
      "premium", // You can make this configurable if needed
    )

    if (!audioContent) {
      throw new Error("No audio content received from Amazon Polly")
    }

    console.log("Successfully received audio from Amazon Polly using Danielle Generative voice")

    // Return the audio as a data URL with MP3 format
    return `data:${contentType};base64,${audioContent}`
  } catch (error: any) {
    console.error("Error generating audio with Amazon Polly:", error)
    throw error instanceof Error ? error : new Error("Failed to generate audio with Amazon Polly")
  }
}
