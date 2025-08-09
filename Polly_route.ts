import { type NextRequest, NextResponse } from "next/server"
import { synthesizeSpeechWithPolly } from "@/lib/utils/polly-tts-client" // Correct import

export async function POST(request: NextRequest) {
  console.log("Amazon Polly high-quality text-to-speech API route called")

  try {
    // Parse request body
    const body = await request.json().catch((error) => {
      console.error("Error parsing request body:", error)
      return null
    })

    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { text, voice, quality = "premium" } = body

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    console.log(`Processing with quality: ${quality}`)

    // Call the centralized utility function for speech synthesis
    const { audioContent, contentType } = await synthesizeSpeechWithPolly(text, voice, quality)

    return NextResponse.json({
      success: true,
      audioContent: audioContent,
      contentType: contentType,
      quality: quality,
    })
  } catch (error) {
    console.error("Unhandled error in text-to-speech conversion:", error)
    return NextResponse.json(
      {
        error: "Failed to convert text to speech",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
