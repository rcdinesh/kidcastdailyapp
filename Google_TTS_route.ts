import { type NextRequest, NextResponse } from "next/server"
import * as jose from "jose"

// Function to generate a JWT token for Google API authentication
async function generateGoogleJwt(credentials: any) {
  const now = Math.floor(Date.now() / 1000)

  // Extract the private key and prepare it for use
  const privateKey = credentials.private_key.replace(/\\n/g, "\n") // Ensure newlines are properly formatted

  // Create JWT payload
  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: "https://texttospeech.googleapis.com/",
    iat: now,
    exp: now + 3600, // Token expires in 1 hour
  }

  // Import the private key properly for RS256 algorithm
  const privateKeyImported = await jose.importPKCS8(privateKey, "RS256")

  // Create and sign the JWT
  const token = await new jose.SignJWT(payload).setProtectedHeader({ alg: "RS256" }).sign(privateKeyImported)

  return token
}

// Function to make a direct request to Google Cloud TTS API
async function callGoogleTtsApi(text: string, voice: any, token: string) {
  // Prepare request to Google Cloud TTS API with simpler config
  const requestBody = {
    input: { text },
    voice: {
      languageCode: voice?.languageCode || "en-US",
      name: voice?.name || "en-US-Chirp3-HD-Aoede",
    },
    audioConfig: {
      audioEncoding: "LINEAR16", // Keep it simple like your working project
    },
  }

  console.log("Sending request to Google TTS API with voice:", requestBody.voice)

  // Make request to Google Cloud TTS API with a longer timeout for longer scripts
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 seconds timeout

  try {
    const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Google API error:", errorText)
      throw new Error(`Google API error: ${response.status} ${response.statusText}`)
    }

    const responseData = await response.json()

    if (!responseData.audioContent) {
      throw new Error("No audio content received from Google TTS API")
    }

    return responseData.audioContent
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log("Text-to-speech API route called")

  try {
    // Parse the request body
    let text, voice
    try {
      const body = await request.json()
      text = body.text
      voice = body.voice || {
        languageCode: "en-US",
        name: "en-US-Chirp3-HD-Aoede",
      }
      console.log("Received request with text length:", text?.length)
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError)
      return NextResponse.json(
        {
          error: "Failed to parse request body",
          details: parseError instanceof Error ? parseError.message : "Invalid JSON",
        },
        { status: 400 },
      )
    }

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Use the hardcoded credentials
    const credentials = {
      type: "service_account",
      project_id: "striped-symbol-457515-k2",
      private_key_id: "e21bae58255373034e51e7800145cd9774479b62",
      private_key:
        "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC1JVBOblmd3GGL\nTmlcWEZjdXyowWaHsiChQyBA7kzi7cpZAFzknzclMu4qiRDI9kXVUVfZqe/MLTNh\nAy0gzjv2oDZ3XnFZqxuQcShEzCzeMALt72rBwHjH0gzwL0nmK3bxfAXkhhgstQe5\n0r+IiSU5d4luIJtSkL7hIglv4mGgYKJ3Uo9xjVlPvCd13QTkHPa+2KJ6Qh4zOf1D\n6dz3U6vyKwOQAODZOoL141KcEoROrEZGF08VMJpRBT9K9uJXvVIgLXkV3yPfn3PQ\n2GkCijYcoXiEekEQWIwiPekZ7eiO0MD/UwKcQr1USjumiMVTeJaZYFvfDrF5MstW\nN7rx2jmXAgMBAAECggEAC2zwwBxaZLLw0sjoVl3EWs5J8ERP7kEq/mDt2N/u/jqX\nZ75hHZPOoPcHFKxpNZ5q+zB9RQpgnf/qh1+cP2nNWG9J4C+XILEX36geLRtfvR1J\nd1ksN6T8jptOG5wv92edwfow+PVdnabxd3lhLAB9K5RsQ65PfbQJhh5lJVHMbJbF\n6lpSzMC3vDELqtEJhJaB7l/ID2u/lB1Jq/wLXUjHL04/+BJCSmafr0bBUY7VjaN+\n2qddU6JdLoW+PcMLJ4qpD2VxWj7V4DmOFt35wAO2x1B6b4p5FUk8Y2G0kSdIjEZh\nydH5nkg84sjMaQwSw0hh94EwdGtYbVdtJSDiHXCV+QKBgQDisR4GOgbrWhcY/Eem\nVXkgDLzfkcYjGrSWSHyvH1ARxiAHr7rtgNj/7RoIYPvGobu+yjj9y71S+K+R18AN\ncWbPJf2Zq3CcsOkhWikSZpgXb/GdJ1WxOOdbUlhdy2ckBmMwkG1na+oYYyzwY54F\nJK1LR/oKT0Eu5ml//Jyx8YKypQKBgQDMkL6R0g0JRCUYo9voep0966jfwVXfe7is\nXmNp6qq+hSJLRY6IBSbRLRdzX+MAXbTxNeorCNr2M9d1CpiQKXYe73ZoDcBfO8tM\nDwJemUuZ/z65sW+VPpP0L2iHw8pvWAtBhW8At+E2FbwiNgaxcSIgPfGfmQWrfM9f\n6vmw79MyiwKBgQC/8HudhhBJwhQAgcsg2Qofyuk42zLKklgJTwLTPE4NXpXMLEy3\nv/r8ZwM9yPAldNeEabDro1CAKjRt5iGkwDnudxpMvM4yvdAG/1H7VIa+gXgwOhfi\nYG3z8rsDX6/K3uWpPwCDKuohEAgC2jX34OAh96WMiSKF1W3Kglcii3zASQKBgBVv\nOTioTMtiw4xQZxN1/ZHmZnyDko7nNNOC1GHdv+RUqOJAOI4SFB4o3mMtceiw6Ou5\nXX8C34aaqgHOiWvZnFHjf4GppzWTW1rt266z21MYhqcIa4u00eXtLcPEBSsji5Ji\n+92UZtm2706aYJspIo1EUFQLwadVXZlMUrtydau/AoGBAJx8EskDP4ruvU1N0vE3\niDBoC41PvjFJfdtGg5NeJxVGR9wZwkKV0uHeFmjxzlPcy2REl2mKFKHf/pncNiiv\nf3Dqt3D5RQDCgU20WbIItkvgOyHyIqpCJVRXxj5ds+gkyHNW9vFjEKg5PyY2cASA\nqjpySl2MgpXBUpnojjPAxinI\n-----END PRIVATE KEY-----\n",
      client_email: "boltpodcast-542@striped-symbol-457515-k2.iam.gserviceaccount.com",
      client_id: "100999802631567523531",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url:
        "https://www.googleapis.com/robot/v1/metadata/x509/boltpodcast-542%40striped-symbol-457515-k2.iam.gserviceaccount.com",
      universe_domain: "googleapis.com",
    }

    // Generate JWT token for authentication
    let token
    try {
      token = await generateGoogleJwt(credentials)
      console.log("JWT token generated successfully")
    } catch (tokenError) {
      console.error("Failed to generate JWT token:", tokenError)
      return NextResponse.json(
        {
          error: "Failed to authenticate with Google Cloud",
          details: tokenError instanceof Error ? tokenError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    // Call Google TTS API
    let audioBase64
    try {
      audioBase64 = await callGoogleTtsApi(text, voice, token)
      console.log("Successfully received audio from Google TTS API")

      if (!audioBase64 || audioBase64.length === 0) {
        throw new Error("Received empty audio content from Google TTS API")
      }
    } catch (apiError) {
      console.error("Error calling Google TTS API:", apiError)
      return NextResponse.json(
        {
          error: "Failed to call Google TTS API",
          details: apiError instanceof Error ? apiError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    // Return the base64 audio data directly
    return NextResponse.json({
      success: true,
      audioContent: audioBase64,
      contentType: "audio/wav", // Changed to WAV
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
