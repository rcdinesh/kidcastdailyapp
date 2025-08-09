"use server"

// Import necessary modules from AI SDK
import { generateText } from "ai"
import { perplexity } from "@ai-sdk/perplexity"
import { xai } from "@ai-sdk/xai"

// Update the function signature and logic
export async function generatePodcastScript(
  prompt: string,
  modelName: string, // "sonar" or "grok-3-mini"
  podcastType: string, // "news", "explanatory", "trivia", "story"
  maxTokens: number, // New parameter for maxTokens
): Promise<string> {
  try {
    let modelInstance: any
    let apiKey: string | undefined
    const providerOptions: any = {}

    if (modelName === "sonar") {
      // Changed from "sonar-pro" to "sonar"
      apiKey = process.env.PERPLEXITY_API_KEY
      if (!apiKey) {
        throw new Error("PERPLEXITY_API_KEY environment variable is not set.")
      }
      modelInstance = perplexity(modelName, { apiKey: apiKey }) // Use "sonar" model

      // Add date filtering for Sonar and news type
      if (podcastType === "news") {
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const now = new Date()

        providerOptions.perplexity = {
          createdAfter: Math.floor(oneWeekAgo.getTime() / 1000),
          createdBefore: Math.floor(now.getTime() / 1000),
        }
        console.log(
          `Applying date filter for Sonar news: createdAfter=${providerOptions.perplexity.createdAfter}, createdBefore=${providerOptions.perplexity.createdBefore}`,
        )
      }
    } else if (modelName === "grok-3-mini") {
      // Changed model name to "grok-3-mini"
      apiKey = process.env.GROK_API_KEY
      if (!apiKey) {
        throw new Error("GROK_API_KEY environment variable is not set.")
      }
      modelInstance = xai(modelName, { apiKey: apiKey })
    } else {
      throw new Error(`Unsupported model: ${modelName}`)
    }

    console.log(`Calling AI SDK with model: ${modelName}, prompt length: ${prompt.length}, maxTokens: ${maxTokens}`)

    const { text } = await generateText({
      model: modelInstance,
      prompt: prompt,
      maxTokens: maxTokens, // Use the passed maxTokens
      temperature: 0.7,
      providerOptions: providerOptions,
    })

    console.log("AI SDK response received")
    return text
  } catch (error: any) {
    console.error("Error generating script:", error)
    throw error instanceof Error ? error : new Error("Failed to generate podcast script")
  }
}
