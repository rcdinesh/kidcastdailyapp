"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Wand2,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  Loader2,
  Download,
  SkipBack,
  SkipForward,
  ChevronDown,
  ChevronUp,
  FileText,
  Gamepad2,
  ClubIcon as Football,
  Dices,
  ShoppingBasketIcon as Basketball,
  Skull,
  HelpCircle,
  BookIcon,
  Check,
  Newspaper,
  LightbulbIcon,
  Pencil,
  Save,
  X,
  CheckCircle,
  Clock,
  Copy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { cleanScript } from "@/lib/utils/clean-script"
import { generateAudio } from "@/lib/actions/generate-audio"
import { generateAudioWithPolly } from "@/lib/actions/generate-audio-polly"

// Helper to estimate words from tokens (approx 0.75 words per token)
const estimateWords = (tokens: number) => Math.floor(tokens * 0.75)

// Prompt templates for different podcast types
const PROMPT_TEMPLATES = {
  news: (
    maxTokens: number,
  ) => `Create a fun and educational podcast news script for kids aged 7-10 about recent news related to {topic}. The script should be around ${estimateWords(maxTokens * 0.8)}-${estimateWords(maxTokens)} words.

The script should be a continuous, flowing narrative, strictly plain text. Do not include any markdown formatting (like #, *, etc.), notes, or bracketed text (like [host], [music]).

The podcast should:
1. Start with "Welcome to Kidcast Daily, where we bring news, trivia, fun-facts and more—just for curious kids like you".
2. Include 2-3 interesting recent news items about {topic} and provide details.
3. End with a brief conclusion that summarizes what was learned.`,

  explanatory: (
    maxTokens: number,
  ) => `Create an explanatory podcast script for kids aged 7-10 that teaches them about {topic} in a fun and engaging way. The script should be around ${estimateWords(maxTokens * 0.8)}-${estimateWords(maxTokens)} words.

The script should be a continuous, flowing narrative, strictly plain text. Do not include any markdown formatting (like #, *, etc.), notes, or bracketed text (like [host], [music]).

The podcast should:
1. Start with "Welcome to Kidcast Daily, where we bring news, trivia, fun-facts and more—just for curious kids like you".
2. Break down complex concepts about {topic} into simple, easy-to-understand explanations.
3. Use analogies, metaphors, and examples that kids can relate to.
4. Cover the fundamental aspects of {topic} in a logical progression.
5. Include interesting facts and "did you know" moments throughout.
6. End with a recap of the main points learned.`,

  trivia: (
    maxTokens: number,
  ) => `Create a fun trivia podcast script for kids aged 7-10 about {topic}. The script should be around ${estimateWords(maxTokens * 0.8)}-${estimateWords(maxTokens)} words.

The script should be a continuous, flowing narrative, strictly plain text. Do not include any markdown formatting (like #, *, etc.), notes, or bracketed text (like [host], [music]).

The podcast should:
1. Start with "Welcome to Kidcast Daily, where we bring news, trivia, fun-facts and more—just for curious kids like you".
2. Include 10-15 interesting trivia facts about {topic} that kids would find fascinating.
3. Structure the trivia as questions followed by detailed answers.
4. Include a mix of easy, medium, and challenging questions.
5. End with a fun "super challenge" question.`,

  story: (
    maxTokens: number,
  ) => `Create an entertaining story podcast script for kids aged 7-10 featuring {topic} as the main theme or character. The script should be around ${estimateWords(maxTokens * 0.8)}-${estimateWords(maxTokens)} words.

The script should be a continuous, flowing narrative, strictly plain text. Do not include any markdown formatting (like #, *, etc.), notes, or bracketed text (like [narrator], [sound effect]).

The podcast should:
1. Start with "Welcome to Kidcast Daily, where we bring news, trivia, fun-facts and more—just for curious kids like you".
2. Tell a complete, original story with a beginning, middle, and end.
3. Include interesting characters, dialogue, and a clear plot.
4. Incorporate educational elements about {topic} within the story.
5. End with a positive message or lesson learned.`,
}

// Prompt templates for general audience
const GENERAL_AUDIENCE_TEMPLATES = {
  news: (
    maxTokens: number,
  ) => `Create an informative podcast news script about recent news related to {topic}. The script should be around ${estimateWords(maxTokens * 0.8)}-${estimateWords(maxTokens)} words.

The script should be a continuous, flowing narrative, strictly plain text. Do not include any markdown formatting (like #, *, etc.), notes, or bracketed text (like [host], [music]).

The podcast should:
1. Start with "Welcome to Kidcast Daily, where we bring news, trivia, fun-facts and more—just for curious kids like you".
2. Include 3-5 interesting and relevant facts or news items about {topic}.
3. Explain current events in details with context and background information.
4. End with a summary of the key points.`,

  explanatory: (
    maxTokens: number,
  ) => `Create an explanatory podcast script that teaches listeners about {topic} in a clear and engaging way. The script should be around ${estimateWords(maxTokens * 0.8)}-${estimateWords(maxTokens)} words.

The script should be a continuous, flowing narrative, strictly plain text. Do not include any markdown formatting (like #, *, etc.), notes, or bracketed text (like [host], [music]).

The podcast should:
1. Start with "Welcome to Kidcast Daily, where we bring news, trivia, fun-facts and more—just for curious kids like you".
2. Break down complex concepts about {topic} into accessible explanations.
3. Use relevant examples and analogies to illustrate key points.
4. Cover the fundamental aspects of {topic} in a logical progression.
5. Include interesting facts and insights throughout.
6. End with a recap of the main points learned.`,

  trivia: (
    maxTokens: number,
  ) => `Create an entertaining trivia podcast script about {topic}. The script should be around ${estimateWords(maxTokens * 0.8)}-${estimateWords(maxTokens)} words.

The script should be a continuous, flowing narrative, strictly plain text. Do not include any markdown formatting (like #, *, etc.), notes, or bracketed text (like [host], [music]).

The podcast should:
1. Start with "Welcome to Kidcast Daily, where we bring news, trivia, fun-facts and more—just for curious kids like you".
2. Include 10-15 interesting trivia facts about {topic} that would fascinate listeners.
3. Structure the trivia as questions followed by detailed answers.
4. Include a mix of easy, medium, and challenging questions.
5. End with a particularly interesting or surprising fact.`,

  story: (
    maxTokens: number,
  ) => `Create an entertaining story podcast script featuring {topic} as the main theme or character. The script should be around ${estimateWords(maxTokens * 0.8)}-${estimateWords(maxTokens)} words.

The script should be a continuous, flowing narrative, strictly plain text. Do not include any markdown formatting (like #, *, etc.), notes, or bracketed text (like [narrator], [sound effect]).

The podcast should:
1. Start with "Welcome to Kidcast Daily, where we bring news, trivia, fun-facts and more—just for curious kids like you".
2. Tell a complete, original story with a beginning, middle, and end.
3. Include interesting characters, dialogue, and a clear plot.
4. Incorporate elements about {topic} within the story.
5. End with a satisfying conclusion or thought-provoking message.`,
}

const PREDEFINED_TOPICS = [
  {
    id: "sonic",
    name: "Sonic the Hedgehog",
    emoji: "💙",
    icon: Gamepad2,
    color: "bg-blue-500",
    lightColor: "bg-blue-100",
    textColor: "text-blue-700",
  },
  {
    id: "soccer",
    name: "Soccer",
    emoji: "⚽",
    icon: Football,
    color: "bg-green-500",
    lightColor: "bg-green-100",
    textColor: "text-green-700",
  },
  {
    id: "pokemon",
    name: "Pokémon",
    emoji: "⚡",
    icon: Dices,
    color: "bg-yellow-500",
    lightColor: "bg-yellow-100",
    textColor: "text-yellow-700",
  },
  {
    id: "basketball",
    name: "Basketball",
    emoji: "🏀",
    icon: Basketball,
    color: "bg-orange-500",
    lightColor: "bg-orange-100",
    textColor: "text-orange-700",
  },
  {
    id: "dinosaurs",
    name: "Dinosaurs",
    emoji: "🦕",
    icon: Skull,
    color: "bg-red-500",
    lightColor: "bg-red-100",
    textColor: "text-red-700",
  },
]

const PODCAST_TYPES = [
  {
    id: "news",
    name: "Recent News",
    description: "Latest updates and developments",
    icon: Newspaper,
  },
  {
    id: "explanatory",
    name: "Explanatory",
    description: "Learn how things work",
    icon: LightbulbIcon,
  },
  {
    id: "trivia",
    name: "Trivia",
    description: "Fun questions and answers",
    icon: HelpCircle,
  },
  {
    id: "story",
    name: "Story",
    description: "Exciting tales and adventures",
    icon: BookIcon,
  },
]

const PLAYBACK_SPEEDS = [
  { value: "0.9", label: "0.9x" },
  { value: "1", label: "1x (Default)" },
  { value: "1.1", label: "1.1x" },
]

const TTS_PROVIDERS = [
  {
    id: "google",
    name: "Google TTS",
    description: "Chirp3 HD voice - Natural and expressive",
    icon: Volume2,
  },
  {
    id: "amazon",
    name: "Amazon Polly",
    description: "Danielle Generative voice - Highly natural and engaging",
    icon: Volume2,
  },
]

const MAX_TOKEN_OPTIONS = [
  { value: 1000, label: "1000 Tokens (~750 words)" },
  { value: 2000, label: "2000 Tokens (~1500 words)" },
  { value: 4000, label: "4000 Tokens (~3000 words)" },
  { value: 6000, label: "6000 Tokens (~4500 words)" },
]

const GOOGLE_TTS_MAX_CHARS = 4950 // Google TTS API limit for text input

interface PodcastCreatorProps {
  userId: string
}

function getModelLabel(model: string) {
  if (model === "sonar") return "Sonar"
  if (model === "grok-3-mini") return "Grok 3 Mini"
  if (model === "gpt-5") return "GPT‑5"
  return model
}

export default function PodcastCreator({ userId }: PodcastCreatorProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [lastGeneratedTopic, setLastGeneratedTopic] = useState<string | null>(null)
  const [customTopic, setCustomTopic] = useState("")
  const [lastCustomTopic, setLastCustomTopic] = useState("")
  const [podcastType, setPodcastType] = useState("news")
  const [lastPodcastType, setLastPodcastType] = useState("news")
  const [isForKids, setIsForKids] = useState(true)
  const [lastIsForKids, setLastIsForKids] = useState(true)
  const [selectedModel, setSelectedModel] = useState("sonar")
  const [lastGeneratedModelForAudioRef, setLastGeneratedModelForAudioRef] = useState("sonar")
  const [selectedMaxTokens, setSelectedMaxTokens] = useState(4000)
  const [lastSelectedMaxTokens, setLastSelectedMaxTokens] = useState(4000)
  const [prompt, setPrompt] = useState(PROMPT_TEMPLATES.news(4000))
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [generatedScript, setGeneratedScript] = useState("")
  const [cleanedScript, setCleanedScript] = useState("")
  const [editableScript, setEditableScript] = useState("")
  const [isEditingScript, setIsEditingScript] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState("1")
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false)
  const [isDataUrl, setIsDataUrl] = useState(false)
  const [isScriptVisible, setIsScriptVisible] = useState(false)
  const [isScriptGenerated, setIsScriptGenerated] = useState(false)
  const [isAudioGenerated, setIsAudioGenerated] = useState(false)
  const [hasEditedScript, setHasEditedScript] = useState(false)
  const [audioGenerationAttempts, setAudioGenerationAttempts] = useState(0)
  const [scriptGenerationComplete, setScriptGenerationComplete] = useState(false)
  const [showAudioPlayer, setShowAudioPlayer] = useState(false)
  const [selectedTTSProvider, setSelectedTTSProvider] = useState("google")
  const [scriptLength, setScriptLength] = useState(0) // New state for script length
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const supabase = createClient()
  const { toast } = useToast()

  const getCurrentTopic = () => {
    if (selectedTopic === "custom") {
      return customTopic
    }
    return PREDEFINED_TOPICS.find((topic) => topic.id === selectedTopic)?.name || ""
  }

  const getCurrentTopicColor = () => {
    if (selectedTopic === "custom") {
      return "bg-gray-500"
    }
    return PREDEFINED_TOPICS.find((topic) => topic.id === selectedTopic)?.color || "bg-purple-500"
  }

  const getCurrentTopicLightColor = () => {
    if (selectedTopic === "custom") {
      return "bg-gray-100"
    }
    return PREDEFINED_TOPICS.find((topic) => topic.id === selectedTopic)?.lightColor || "bg-purple-100"
  }

  const getCurrentTopicTextColor = () => {
    if (selectedTopic === "custom") {
      return "text-gray-700"
    }
    return PREDEFINED_TOPICS.find((topic) => topic.id === selectedTopic)?.textColor || "text-purple-700"
  }

  // Update prompt when podcast type, audience, or max tokens changes
  useEffect(() => {
    const templateFunction = isForKids
      ? PROMPT_TEMPLATES[podcastType as keyof typeof PROMPT_TEMPLATES]
      : GENERAL_AUDIENCE_TEMPLATES[podcastType as keyof typeof GENERAL_AUDIENCE_TEMPLATES]
    setPrompt(templateFunction(selectedMaxTokens))

    // Reset script generation state when relevant parameters change
    if (podcastType !== lastPodcastType || isForKids !== lastIsForKids || selectedMaxTokens !== lastSelectedMaxTokens) {
      resetScriptState()
      setLastPodcastType(podcastType)
      setLastIsForKids(isForKids)
      setLastSelectedMaxTokens(selectedMaxTokens)
    }
  }, [podcastType, isForKids, selectedMaxTokens, lastPodcastType, lastIsForKids, lastSelectedMaxTokens])

  const resetScriptState = () => {
    setIsScriptGenerated(false)
    setIsAudioGenerated(false)
    setIsScriptVisible(false)
    setGeneratedScript("")
    setCleanedScript("")
    setEditableScript("")
    setIsEditingScript(false)
    setHasEditedScript(false)
    setAudioUrl(null)
    setAudioGenerationAttempts(0)
    setScriptGenerationComplete(false)
    setLastGeneratedModelForAudioRef("sonar")
    setIsPlaying(false)
    setShowAudioPlayer(false)
    setSelectedTTSProvider("google") // Reset TTS provider to default Google
    setScriptLength(0) // Reset script length
    // Do NOT reset selectedMaxTokens here, as it's a user preference for the next generation
  }

  // Effect to handle audio element events
  useEffect(() => {
    // Only add listeners if audioUrl is present and audioRef.current exists
    if (audioUrl && audioRef.current) {
      const audio = audioRef.current

      const handleLoadedMetadata = () => {
        setDuration(audio.duration || 0)
        console.log("Audio loaded, duration:", audio.duration)
      }

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime || 0)
      }

      const handleEnded = () => {
        setIsPlaying(false)
      }

      const handleError = (e: ErrorEvent) => {
        console.error("Audio playback error:", e)
        setError("Failed to load audio. Please try regenerating.")
      }

      audio.addEventListener("loadedmetadata", handleLoadedMetadata)
      audio.addEventListener("timeupdate", handleTimeUpdate)
      audio.addEventListener("ended", handleEnded)
      audio.addEventListener("error", handleError as EventListener)

      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
        audio.removeEventListener("timeupdate", handleTimeUpdate)
        audio.removeEventListener("ended", handleEnded)
        audio.removeEventListener("error", handleError as EventListener)
      }
    }
  }, [audioUrl])

  // Effect to set playback speed
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      // Only set playbackRate if audio element exists AND has a source
      audioRef.current.playbackRate = Number.parseFloat(playbackSpeed)
    }
  }, [playbackSpeed, audioUrl]) // Added audioUrl to dependencies

  // Clean the script whenever generatedScript changes and update scriptLength
  useEffect(() => {
    if (generatedScript) {
      const cleaned = cleanScript(generatedScript)
      console.log("Cleaned script:", cleaned)

      // --- ADDED VALIDATION HERE ---
      if (!cleaned.trim() && generatedScript.trim()) {
        console.warn("Cleaned script is empty, but raw script had content. Cleaning might be too aggressive.")
        setError(
          "The generated script was too short or contained only unreadable content after cleaning. Please try again with a different topic or prompt.",
        )
      } else {
        setError(null) // Clear error if cleaning was successful
      }
      // --- END ADDED VALIDATION ---

      setCleanedScript(cleaned)
      setEditableScript(cleaned)
      setScriptLength(cleaned.length) // Update script length

      // Set default TTS provider based on script length
      if (cleaned.length >= GOOGLE_TTS_MAX_CHARS) {
        setSelectedTTSProvider("amazon")
        toast({
          title: "Script too long for Google TTS",
          description: "Defaulting to Amazon Polly for audio generation.",
          variant: "default",
        })
      } else {
        setSelectedTTSProvider("google")
      }
    } else {
      setCleanedScript("")
      setEditableScript("")
      setScriptLength(0) // Reset script length
      console.log("generatedScript is empty, cleanedScript reset.")
    }
  }, [generatedScript])

  const handleGenerateAudio = async () => {
    if (!cleanedScript && !editableScript) {
      toast({
        title: "No script",
        description: "Please generate a script first",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingAudio(true)
    setError(null)
    setAudioGenerationAttempts((prev) => prev + 1)

    try {
      // Use the edited script if available, otherwise use the cleaned script
      const scriptToUse = hasEditedScript ? editableScript : cleanedScript

      console.log(`Generating audio for script with ${scriptToUse.length} characters using ${selectedTTSProvider}`)

      let generatedAudioUrl: string

      if (selectedTTSProvider === "amazon") {
        generatedAudioUrl = await generateAudioWithPolly(scriptToUse)
      } else {
        // Ensure Google TTS is not used for long scripts
        if (scriptToUse.length >= GOOGLE_TTS_MAX_CHARS) {
          throw new Error(
            `Google TTS cannot process scripts longer than ${GOOGLE_TTS_MAX_CHARS} characters. Please use Amazon Polly.`,
          )
        }
        generatedAudioUrl = await generateAudio(scriptToUse)
      }

      setAudioUrl(generatedAudioUrl)
      setIsAudioGenerated(true)

      // Check if it's a data URL or a regular URL
      const isDataUrl = generatedAudioUrl.startsWith("data:")
      setIsDataUrl(isDataUrl)

      // Show the audio player after successful audio generation
      setShowAudioPlayer(true)

      toast({
        title: "Audio generated",
        description: `Your podcast audio has been created successfully with ${
          selectedTTSProvider === "google" ? "Google TTS" : "Amazon Polly"
        }`,
      })
    } catch (error: any) {
      console.error("Error generating audio:", error)

      const providerName = selectedTTSProvider === "google" ? "Google TTS" : "Amazon Polly"
      setError(`Failed to generate audio with ${providerName}: ${error.message}`)
      toast({
        title: "Generation failed",
        description: error.message || `Failed to generate audio with ${providerName}. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  const handleGenerateScript = async () => {
    const topic = getCurrentTopic()
    setError(null)

    if (!topic) {
      toast({
        title: "Topic required",
        description: "Please select a topic or enter a custom one",
        variant: "destructive",
      })
      return
    }

    // Immediately hide the audio player to unmount the audio element
    setShowAudioPlayer(false)

    // Clear previous script content and hide it immediately
    setGeneratedScript("")
    setCleanedScript("")
    setEditableScript("")
    setHasEditedScript(false)
    setIsScriptVisible(false)
    setIsEditingScript(false)
    setScriptGenerationComplete(false)

    // Clear audio-related states
    setAudioUrl(null)
    setIsPlaying(false)
    setIsAudioGenerated(false)
    setAudioGenerationAttempts(0)
    setScriptLength(0) // Reset script length before new generation

    setIsGenerating(true)
    setIsScriptGenerated(false) // Reset this state immediately

    console.log("Starting script generation for topic:", topic, "model:", selectedModel)

    try {
      const finalPrompt = prompt.replace(/\{topic\}/g, topic)

      // --- NEW FETCH LOGIC ---
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/plain; charset=utf-8",
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          modelName: selectedModel,
          podcastType: podcastType,
          maxTokens: selectedMaxTokens,
        }),
      })

      if (!response.ok) {
        // Try JSON first, fall back to text to avoid "Invalid JSON response" errors.
        let errorMessage = "Failed to generate podcast script from API."
        const contentType = response.headers.get("content-type") || ""
        try {
          if (contentType.includes("application/json")) {
            const errorData = await response.json()
            errorMessage = errorData?.error || errorData?.message || errorMessage
          } else {
            const text = await response.text()
            if (text && text.trim().length > 0) errorMessage = text
          }
        } catch {
          // Final fallback if body can't be parsed
          try {
            const text = await response.text()
            if (text && text.trim().length > 0) errorMessage = text
          } catch {
            /* ignore */
          }
        }
        throw new Error(errorMessage)
      }

      const receivedText = await response.text()

      if (!receivedText || !receivedText.trim()) {
        throw new Error("AI generated an empty or invalid script. Please try again or adjust your prompt.")
      }

      setGeneratedScript(receivedText)
      const cleaned = cleanScript(receivedText)
      setCleanedScript(cleaned)
      setEditableScript(cleaned)

      // Update the last generated topic and model
      setLastGeneratedTopic(selectedTopic)
      if (selectedTopic === "custom") {
        setLastCustomTopic(customTopic)
      }
      setLastGeneratedModelForAudioRef(selectedModel)
      setLastSelectedMaxTokens(selectedMaxTokens)

      // Mark script as generated
      setIsScriptGenerated(true)
      setScriptGenerationComplete(true)
      // Show the script automatically
      setIsScriptVisible(true)
      console.log("isScriptVisible after generation:", true)

      toast({
        title: "Script generated",
        description: "Your podcast script has been created successfully!",
      })
    } catch (error: any) {
      console.error("Error generating script:", error)
      const errorMessage = error.message || "Failed to generate podcast script. Please try again."
      const userFriendlyMessage = errorMessage.includes("API key")
        ? "There was an issue with your AI API key. Please ensure it's configured correctly."
        : errorMessage.includes("Unsupported AI model")
          ? "The selected AI model is not supported. Please choose another."
          : errorMessage.includes("credit") || errorMessage.includes("spending limit")
            ? "Your AI account has reached its spending limit or used all credits. Please check your billing."
            : errorMessage // Fallback for other errors

      setError(userFriendlyMessage)
      toast({
        title: "Generation failed",
        description: userFriendlyMessage,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCancelEdit = () => {
    // Restore the original script
    setEditableScript(cleanedScript)
    setIsEditingScript(false)
  }

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableScript(e.target.value)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  console.log("Rendering script section. cleanedScript:", cleanedScript, "isScriptVisible:", isScriptVisible)

  const handleCustomTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTopic(e.target.value)
  }

  const handleCustomTopicSubmit = () => {
    if (customTopic.trim()) {
      setSelectedTopic("custom")
      setLastCustomTopic(customTopic)
      setIsCustomDialogOpen(false)
      if (isScriptGenerated) {
        resetScriptState()
      }
    } else {
      toast({
        title: "Topic required",
        description: "Please enter a custom topic",
        variant: "destructive",
      })
    }
  }

  const toggleScriptVisibility = () => {
    setIsScriptVisible(!isScriptVisible)
  }

  const handleEditScript = () => {
    setIsEditingScript(true)
  }

  const handleSaveScript = () => {
    setCleanedScript(editableScript)
    setIsEditingScript(false)
    setHasEditedScript(true)
  }

  const handleSkipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime -= 10
    }
  }

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSkipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime += 10
    }
  }

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleSpeedChange = (value: string) => {
    setPlaybackSpeed(value)
  }

  const handleDownload = () => {
    if (audioUrl) {
      const link = document.createElement("a")
      link.href = audioUrl
      link.download = `${getCurrentTopic()}-kidcast.mp3`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      toast({
        title: "No audio generated",
        description: "Please generate audio first",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container bg-white/95 backdrop-blur-lg rounded-3xl p-6 sm:p-10 shadow-2xl max-w-3xl w-full text-center border border-white/20 animate-slideUp">
      <header className="mb-8">
        <div className="logo flex items-center justify-center gap-3 mb-2">
          <span className="text-5xl animate-bounce">🎙️</span>
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
            Kidcast Daily
          </h1>
        </div>
        <p className="subtitle text-gray-600 text-lg font-medium mb-10">Create engaging podcasts for kids in minutes</p>
      </header>

      <h2 className="section-title text-2xl font-bold text-gray-800 mb-6">Choose Your Adventure</h2>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="topics-grid grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {PREDEFINED_TOPICS.map((topic) => {
          const TopicIcon = topic.icon
          return (
            <div
              key={topic.id}
              className={`topic-card rounded-2xl overflow-hidden cursor-pointer transition-all transform hover:scale-105 hover:shadow-lg relative group ${
                selectedTopic === topic.id
                  ? "selected bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-500"
                  : "bg-gradient-to-br from-gray-50 to-gray-200 border-2 border-transparent shadow-md"
              }`}
              onClick={() => {
                if (selectedTopic !== topic.id && isScriptGenerated) {
                  resetScriptState()
                }
                setSelectedTopic(topic.id)
              }}
            >
              <div
                className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-10 ${
                  selectedTopic === topic.id ? "opacity-100" : ""
                }`}
                style={{
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                }}
              />
              <span className={`topic-emoji text-4xl mb-3 block animate-pulse relative z-10`}>{topic.emoji}</span>
              <p
                className={`topic-name font-semibold text-base relative z-10 ${selectedTopic === topic.id ? "text-white" : "text-gray-800"}`}
              >
                {topic.name}
              </p>
            </div>
          )
        })}

        <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
          <DialogTrigger asChild>
            <div
              className={`topic-card rounded-2xl overflow-hidden cursor-pointer transition-all transform hover:scale-105 hover:shadow-lg relative group ${
                selectedTopic === "custom"
                  ? "selected bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-500"
                  : "bg-gradient-to-br from-gray-50 to-gray-200 border-2 border-transparent shadow-md"
              }`}
            >
              <div
                className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-10 ${
                  selectedTopic === "custom" ? "opacity-100" : ""
                }`}
                style={{
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                }}
              />
              <span className="topic-emoji text-4xl mb-3 block animate-pulse relative z-10">✨</span>
              <p
                className={`topic-name font-semibold text-base relative z-10 ${selectedTopic === "custom" ? "text-white" : "text-gray-800"}`}
              >
                Custom Topic
              </p>
            </div>
          </DialogTrigger>
          <DialogContent className="bg-white/95 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-white/20">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">Enter Custom Topic</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="What would you like your podcast to be about?"
                value={customTopic}
                onChange={handleCustomTopicChange}
                className="custom-input w-full p-4 border-2 border-gray-300 rounded-xl text-base bg-white/80 transition-all focus:border-purple-500 focus:shadow-outline-purple"
              />
              <Button
                onClick={handleCustomTopicSubmit}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:opacity-90"
              >
                Use This Topic
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedTopic && (
        <div className="space-y-6">
          {/* Topic indicator */}
          <div
            className={`p-4 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-between border border-gray-200 shadow-sm`}
          >
            <div className="flex items-center">
              <span className={`font-bold text-lg text-gray-800`}>Selected: {getCurrentTopic()}</span>
            </div>
            {(selectedTopic !== lastGeneratedTopic ||
              (selectedTopic === "custom" ? customTopic !== lastCustomTopic : true) ||
              podcastType !== lastPodcastType ||
              isForKids !== lastIsForKids ||
              selectedMaxTokens !== lastSelectedMaxTokens) &&
              lastGeneratedTopic && (
                <span className="text-xs text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200">
                  {selectedTopic !== lastGeneratedTopic
                    ? "New topic"
                    : podcastType !== lastPodcastType
                      ? "New type"
                      : isForKids !== lastIsForKids
                        ? "Audience changed"
                        : selectedMaxTokens !== lastSelectedMaxTokens
                          ? "Length changed"
                          : "Topic changed"}
                </span>
              )}
          </div>

          {/* For Kids Toggle */}
          <div className="flex items-center p-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="for-kids-toggle"
                checked={isForKids}
                onChange={(e) => {
                  if (e.target.checked !== isForKids && isScriptGenerated) {
                    resetScriptState()
                  }
                  setIsForKids(e.target.checked)
                }}
                className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="for-kids-toggle" className="ml-3 text-base font-medium text-gray-800">
                For Kids
              </label>
            </div>
            <div className="ml-auto text-sm text-gray-600">
              {isForKids ? "Content for ages 7-10" : "General audience"}
            </div>
          </div>

          {/* Podcast Type Selection */}
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Choose Podcast Type</h3>
            <RadioGroup
              value={podcastType}
              onValueChange={(value) => {
                if (value !== podcastType && isScriptGenerated) {
                  resetScriptState()
                }
                setPodcastType(value)
              }}
              className="grid grid-cols-2 gap-3"
            >
              {PODCAST_TYPES.map((type) => {
                const TypeIcon = type.icon
                const getTypeColors = () => {
                  switch (type.id) {
                    case "news":
                      return {
                        gradient: "from-blue-400 to-cyan-400",
                        iconBg: "bg-blue-100 text-blue-600",
                      }
                    case "explanatory":
                      return {
                        gradient: "from-emerald-400 to-green-400",
                        iconBg: "bg-emerald-100 text-emerald-600",
                      }
                    case "trivia":
                      return {
                        gradient: "from-yellow-400 to-orange-400",
                        iconBg: "bg-yellow-100 text-yellow-600",
                      }
                    case "story":
                      return {
                        gradient: "from-purple-400 to-pink-400",
                        iconBg: "bg-purple-100 text-purple-600",
                      }
                    default:
                      return {
                        gradient: "from-gray-400 to-gray-500",
                        iconBg: "bg-gray-100 text-gray-600",
                      }
                  }
                }

                const { gradient, iconBg } = getTypeColors()

                return (
                  <div
                    key={type.id}
                    className={`relative overflow-hidden flex items-start space-x-2 p-3 rounded-xl border transition-all group ${
                      podcastType === type.id ? "border-purple-500 shadow-md" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* Background styling */}
                    <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${gradient}`} />

                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-5">
                      {type.id === "news" && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: "radial-gradient(circle, #3B82F6 1px, transparent 1px)",
                            backgroundSize: "20px 20px",
                          }}
                        />
                      )}
                      {type.id === "explanatory" && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: "radial-gradient(circle, #10B981 1px, transparent 1px)",
                            backgroundSize: "15px 15px",
                          }}
                        />
                      )}
                      {type.id === "trivia" && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage:
                              "repeating-linear-gradient(45deg, #F59E0B 0, #F59E0B 2px, transparent 2px, transparent 10px)",
                            backgroundSize: "20px 20px",
                          }}
                        />
                      )}
                      {type.id === "story" && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage:
                              "repeating-radial-gradient(circle at 10px 10px, #8B5CF6 0, #8B5CF6 1px, transparent 1px, transparent 10px)",
                            backgroundSize: "20px 20px",
                          }}
                        />
                      )}
                    </div>

                    <RadioGroupItem value={type.id} id={type.id} className="mt-1 z-10 h-4 w-4" />
                    <Label htmlFor={type.id} className="flex-1 cursor-pointer z-10 text-left">
                      <div className="flex items-center mb-1">
                        <div className={`rounded-full p-1.5 mr-2 ${iconBg}`}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-base text-gray-800">{type.name}</span>
                      </div>
                      <p className="text-sm text-gray-700">{type.description}</p>
                    </Label>

                    {/* Visual indicator for selected state */}
                    {podcastType === type.id && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[24px] border-r-[24px] border-t-transparent border-r-purple-500"></div>
                    )}
                  </div>
                )
              })}
            </RadioGroup>
          </div>

          {/* Model Selection */}
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Choose AI Model</h3>
            <RadioGroup
              value={selectedModel}
              onValueChange={(value) => {
                if (value !== selectedModel && isScriptGenerated) {
                  resetScriptState()
                }
                setSelectedModel(value)
              }}
              className="grid grid-cols-2 gap-3"
            >
              <div
                className={`relative overflow-hidden flex items-start space-x-2 p-3 rounded-xl border transition-all group ${
                  selectedModel === "sonar" ? "border-purple-500 shadow-md" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <RadioGroupItem value="sonar" id="sonar" className="mt-1 z-10 h-4 w-4" />
                <Label htmlFor="sonar" className="flex-1 cursor-pointer z-10 text-left">
                  <div className="flex items-center mb-1">
                    <span className="font-medium text-base text-gray-800">Sonar</span>
                  </div>
                  <p className="text-sm text-gray-700">Best for up-to-date information (online access)</p>
                </Label>
                {selectedModel === "sonar" && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[24px] border-r-[24px] border-t-transparent border-r-purple-500"></div>
                )}
              </div>
              <div
                className={`relative overflow-hidden flex items-start space-x-2 p-3 rounded-xl border transition-all group ${
                  selectedModel === "grok-3-mini"
                    ? "border-purple-500 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <RadioGroupItem value="grok-3-mini" id="grok-3-mini" className="mt-1 z-10 h-4 w-4" />
                <Label htmlFor="grok-3-mini" className="flex-1 cursor-pointer z-10 text-left">
                  <div className="flex items-center mb-1">
                    <span className="font-medium text-base text-gray-800">Grok 3 Mini</span>
                  </div>
                  <p className="text-sm text-gray-700">Creative and engaging content generation</p>
                </Label>
                {selectedModel === "grok-3-mini" && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[24px] border-r-[24px] border-t-transparent border-r-purple-500"></div>
                )}
              </div>
              <div
                className={`relative overflow-hidden flex items-start space-x-2 p-3 rounded-xl border transition-all group ${
                  selectedModel === "gpt-5" ? "border-purple-500 shadow-md" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <RadioGroupItem value="gpt-5" id="gpt-5" className="mt-1 z-10 h-4 w-4" />
                <Label htmlFor="gpt-5" className="flex-1 cursor-pointer z-10 text-left">
                  <div className="flex items-center mb-1">
                    <span className="font-medium text-base text-gray-800">GPT‑5</span>
                  </div>
                  <p className="text-sm text-gray-700">OpenAI (requires OPENAI_API_KEY)</p>
                </Label>
                {selectedModel === "gpt-5" && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[24px] border-r-[24px] border-t-transparent border-r-purple-500"></div>
                )}
              </div>
            </RadioGroup>
          </div>

          {/* Max Tokens Selection */}
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Podcast Length (Max Tokens)</h3>
            <Select
              value={selectedMaxTokens.toString()}
              onValueChange={(value) => {
                const newMaxTokens = Number(value)
                if (newMaxTokens !== selectedMaxTokens && isScriptGenerated) {
                  resetScriptState()
                }
                setSelectedMaxTokens(newMaxTokens)
              }}
            >
              <SelectTrigger className="w-full h-12 text-base rounded-xl border-gray-300">
                <SelectValue placeholder="Select max tokens" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {MAX_TOKEN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()} className="text-base">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-2 text-left">
              Higher token limits allow for longer and more detailed podcast scripts.
            </p>
          </div>

          {/* Progress Steps */}
          {isGenerating && (
            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md border border-gray-200">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Generation Progress</h3>
              <div className="space-y-3">
                {/* Step 1: Script Generation */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {isGenerating ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    ) : scriptGenerationComplete ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <Clock className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-base font-medium ${
                          scriptGenerationComplete
                            ? "text-green-700"
                            : isGenerating
                              ? "text-indigo-700"
                              : "text-gray-500"
                        }`}
                      >
                        Generate Script with {getModelLabel(selectedModel)}
                      </span>
                      {scriptGenerationComplete && <span className="text-sm text-green-600 font-medium">Complete</span>}
                      {isGenerating && <span className="text-sm text-indigo-600 font-medium">In Progress</span>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Creating your podcast script with the selected AI model
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleGenerateScript}
              disabled={isGenerating || !selectedTopic || (selectedTopic === "custom" && !customTopic.trim())}
              className={`generate-btn w-full py-4 text-lg font-semibold rounded-full relative overflow-hidden group ${
                isGenerating || !selectedTopic || (selectedTopic === "custom" && !customTopic.trim())
                  ? "opacity-60 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 shadow-xl hover:shadow-2xl"
              }`}
            >
              <span className="relative z-10 flex items-center justify-center">
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    <span>Generating script...</span>
                  </>
                ) : isScriptGenerated &&
                  selectedTopic === lastGeneratedTopic &&
                  (selectedTopic === "custom" ? customTopic === lastCustomTopic : true) &&
                  podcastType === lastPodcastType &&
                  isForKids === lastIsForKids &&
                  selectedModel === lastGeneratedModelForAudioRef &&
                  selectedMaxTokens === lastSelectedMaxTokens ? (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Podcast Script Generated
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5 mr-2" />
                    Generate Podcast Script
                  </>
                )}
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 transform -translate-x-full group-hover:translate-x-full"></span>
            </Button>
          </div>

          {cleanedScript && (
            <div className="space-y-6">
              {/* TTS Provider Selection */}
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Choose Voice Provider</h3>
                <RadioGroup
                  value={selectedTTSProvider}
                  onValueChange={setSelectedTTSProvider}
                  className="grid grid-cols-2 gap-3"
                >
                  {TTS_PROVIDERS.map((provider) => {
                    const ProviderIcon = provider.icon
                    const isDisabled = provider.id === "google" && scriptLength >= GOOGLE_TTS_MAX_CHARS

                    return (
                      <div
                        key={provider.id}
                        className={`relative overflow-hidden flex items-start space-x-2 p-3 rounded-xl border transition-all group ${
                          selectedTTSProvider === provider.id
                            ? "border-purple-500 shadow-md"
                            : "border-gray-200 hover:border-gray-300"
                        } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <RadioGroupItem
                          value={provider.id}
                          id={provider.id}
                          className="mt-1 z-10 h-4 w-4"
                          disabled={isDisabled}
                        />
                        <Label
                          htmlFor={provider.id}
                          className={`flex-1 cursor-pointer z-10 text-left ${isDisabled ? "cursor-not-allowed" : ""}`}
                        >
                          <div className="flex items-center mb-1">
                            <div className="rounded-full p-1.5 mr-2 bg-purple-100 text-purple-600">
                              <ProviderIcon className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-base text-gray-800">{provider.name}</span>
                          </div>
                          <p className="text-sm text-gray-700">{provider.description}</p>
                          {isDisabled && (
                            <p className="text-sm text-red-500 mt-1">(Script too long for this provider)</p>
                          )}
                        </Label>
                        {selectedTTSProvider === provider.id && (
                          <div className="absolute top-0 right-0 w-0 h-0 border-t-[24px] border-r-[24px] border-t-transparent border-r-purple-500"></div>
                        )}
                      </div>
                    )
                  })}
                </RadioGroup>
              </div>

              <Button
                onClick={handleGenerateAudio}
                disabled={isGeneratingAudio || !cleanedScript || isEditingScript}
                className={`generate-btn w-full py-4 text-lg font-semibold rounded-full relative overflow-hidden group ${
                  isGeneratingAudio || !cleanedScript || isEditingScript
                    ? "opacity-60 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-500 to-purple-600 shadow-xl hover:shadow-2xl"
                }`}
              >
                <span className="relative z-10 flex items-center justify-center">
                  {isGeneratingAudio ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                      <span>
                        Generating audio with {selectedTTSProvider === "google" ? "Chirp3 HD voice" : "Amazon Polly"}
                        ...
                      </span>
                    </>
                  ) : isAudioGenerated ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Audio Generated
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-5 w-5 mr-2" />
                      Generate Audio with {selectedTTSProvider === "google" ? "Chirp3 HD Voice" : "Amazon Polly"}
                    </>
                  )}
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 transform -translate-x-full group-hover:translate-x-full"></span>
              </Button>
            </div>
          )}
        </div>
      )}

      {cleanedScript && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <Button
              onClick={toggleScriptVisibility}
              variant="outline"
              className="flex items-center justify-center py-2 rounded-xl border-2 border-gray-300 bg-white/80 text-gray-700 hover:bg-gray-100"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isScriptVisible ? "Hide Script" : "Show Script"}
              {isScriptVisible ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>

            {isScriptVisible && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 font-mono">
                  {isEditingScript ? editableScript.length : cleanedScript.length} characters
                </span>
                {!isEditingScript ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()

                        const scriptToCopy = hasEditedScript ? editableScript : cleanedScript

                        console.log("Copy button clicked, attempting to copy script...")

                        navigator.clipboard
                          .writeText(scriptToCopy)
                          .then(() => {
                            console.log("Script copied successfully to clipboard")

                            // Try the toast notification
                            try {
                              toast({
                                title: "Script copied!",
                                description: "The script has been copied to your clipboard",
                              })
                              console.log("Toast notification called successfully")
                            } catch (toastError) {
                              console.error("Toast error:", toastError)
                              // Fallback to alert if toast fails
                              alert("Script copied to clipboard!")
                            }

                            // Create temporary visual feedback on the button
                            const button = e.currentTarget as HTMLButtonElement
                            if (button) {
                              const originalText = button.innerHTML
                              button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-4 w-4 mr-2"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied!`
                              button.classList.add("bg-green-100", "text-green-700", "border-green-300")
                              button.disabled = true

                              setTimeout(() => {
                                button.innerHTML = originalText
                                button.classList.remove("bg-green-100", "text-green-700", "border-green-300")
                                button.disabled = false
                              }, 2000)
                            }
                          })
                          .catch((error) => {
                            console.error("Copy failed:", error)

                            // Try the toast notification for error
                            try {
                              toast({
                                title: "Copy failed",
                                description:
                                  "Failed to copy script to clipboard. Please try selecting and copying manually.",
                                variant: "destructive",
                              })
                            } catch (toastError) {
                              console.error("Toast error:", toastError)
                              // Fallback to alert if toast fails
                              alert("Failed to copy script to clipboard. Please try selecting and copying manually.")
                            }
                          })
                      }}
                      variant="outline"
                      className="flex items-center justify-center py-2 rounded-xl border-2 border-gray-300 bg-white/80 text-gray-700 hover:bg-gray-100"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Script
                    </Button>
                    <Button
                      onClick={handleEditScript}
                      variant="outline"
                      className="flex items-center justify-center py-2 rounded-xl border-2 border-gray-300 bg-white/80 text-gray-700 hover:bg-gray-100"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Script
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {isScriptVisible && (
            <div className="border-2 border-gray-300 rounded-xl p-4 bg-white/90 backdrop-blur-sm mt-2 text-left">
              {isEditingScript ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">Edit Your Script</label>
                      <span className="text-sm text-gray-600 font-mono">{editableScript.length} characters</span>
                    </div>
                    <Textarea
                      value={editableScript}
                      onChange={handleScriptChange}
                      className="min-h-[300px] font-mono text-sm rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      placeholder="Edit your podcast script here..."
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      className="flex items-center bg-transparent border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveScript}
                      className="flex items-center bg-green-600 hover:bg-green-700 rounded-xl"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                  {isAudioGenerated && (
                    <Alert className="bg-amber-50 border border-amber-200 text-left">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="text-amber-700 text-sm">
                        Saving changes will require regenerating the audio.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="prose prose-sm max-w-none max-h-80 overflow-y-auto">
                  {cleanedScript.split("\n").map((line, i) => (
                    <p key={i} className="mb-2">
                      {line}
                    </p>
                  ))}
                  {hasEditedScript && (
                    <div className="mt-2 text-xs text-gray-500 italic">Script has been edited manually</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showAudioPlayer && audioUrl && (
        <div className="mt-8 bg-white/90 backdrop-blur-sm border-2 border-gray-300 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Listen to Your Podcast: {getCurrentTopic()}</h3>
          <audio ref={audioRef} src={audioUrl} className="hidden" data-model={selectedModel} key={audioUrl} />

          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <Button
                onClick={handleSkipBackward}
                size="icon"
                variant="outline"
                className="h-12 w-12 rounded-full p-0 flex items-center justify-center border-2 border-gray-300 bg-white/80 text-gray-700 hover:bg-gray-100"
              >
                <SkipBack className="h-5 w-5" />
              </Button>

              <Button
                onClick={togglePlayPause}
                size="icon"
                className={`h-16 w-16 rounded-full p-0 flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg hover:shadow-xl`}
              >
                {isPlaying ? <Pause className="h-6 w-6 text-white" /> : <Play className="h-6 w-6 ml-1 text-white" />}
              </Button>

              <Button
                onClick={handleSkipForward}
                size="icon"
                variant="outline"
                className="h-12 w-12 rounded-full p-0 flex items-center justify-center border-2 border-gray-300 bg-white/80 text-gray-700 hover:bg-gray-100"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>

            <div className="w-full px-2">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSliderChange}
                className="w-full [&>span:first-child]:h-2 [&>span:first-child]:bg-gradient-to-r [&>span:first-child]:from-indigo-500 [&>span:first-child]:to-purple-600 [&>span:first-child]:rounded-full [&>span:first-child>span]:bg-white [&>span:first-child>span]:border-2 [&>span:first-child>span]:border-purple-500"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Speed:</span>
                <Select value={playbackSpeed} onValueChange={handleSpeedChange}>
                  <SelectTrigger className="w-24 h-9 text-sm rounded-lg border-gray-300">
                    <SelectValue placeholder="Speed" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <SelectItem key={speed.value} value={speed.value} className="text-sm">
                        {speed.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="border-2 border-gray-300 flex items-center h-9 bg-white/80 text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="text-sm">Save Audio</span>
              </Button>
            </div>
          </div>

          {hasEditedScript && (
            <Alert className="mt-4 bg-yellow-50 border border-yellow-200 py-2 text-left">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              <AlertDescription className="text-yellow-700 text-sm">
                Using edited script for audio generation.
              </AlertDescription>
            </Alert>
          )}

          <Alert className="mt-4 bg-blue-50 border border-blue-200 py-2 text-left">
            <AlertCircle className="h-3 w-3 text-blue-500" />
            <AlertDescription className="text-blue-700 text-xs">
              On mobile devices, tap "Save Audio" to share the file to your Files app or other apps.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <footer className="footer mt-8 pt-6 border-t border-gray-200 text-gray-600 text-sm">
        <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} PlayPulse Media. All rights reserved.</p>
      </footer>
    </div>
  )
}
