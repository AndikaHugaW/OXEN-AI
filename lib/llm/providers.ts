// Multi-provider LLM support
// Supports: OpenAI, Groq, Hugging Face, Gemini, Ollama

interface LLMProvider {
  generateResponse(
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; model?: string; stream?: boolean }
  ): Promise<string>;
  generateStreamResponse?(
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number; model?: string },
    onChunk?: (chunk: string) => void
  ): Promise<ReadableStream<Uint8Array>>;
}

// Groq Provider (FREE, FAST, RECOMMENDED)
class GroqProvider implements LLMProvider {
  private apiKey: string;
  private baseURL = "https://api.groq.com/openai/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    options: { temperature?: number; model?: string; stream?: boolean } = {}
  ): Promise<string> {
    const model = options.model || "llama-3.1-70b-versatile";
    const temperature = options.temperature || 0.7;
    const stream = options.stream || false;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature,
        stream,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }

    if (stream && response.body) {
      // For streaming, return empty string (handled separately)
      return "";
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "Tidak ada respons";
  }

  async generateStreamResponse(
    messages: Array<{ role: string; content: string }>,
    options: { temperature?: number; model?: string } = {},
    onChunk?: (chunk: string) => void
  ): Promise<ReadableStream<Uint8Array>> {
    const model = options.model || "llama-3.1-70b-versatile";
    const temperature = options.temperature || 0.7;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }

    if (!response.body) {
      throw new Error("No response body for streaming");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.close();
                  return;
                }

                try {
                  const json = JSON.parse(data);
                  const content = json.choices?.[0]?.delta?.content || "";
                  if (content && onChunk) {
                    onChunk(content);
                  }
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(content));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });
  }
}

// Hugging Face Provider (FREE)
class HuggingFaceProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "mistralai/Mistral-7B-Instruct-v0.2") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    options: { temperature?: number; model?: string } = {}
  ): Promise<string> {
    const model = options.model || this.model;
    const temperature = options.temperature || 0.7;

    // Build prompt from messages
    // For instruction-tuned models like Mistral, format as instruction
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");
    
    let prompt = "";
    if (systemMessage) {
      prompt += `${systemMessage.content}\n\n`;
    }
    
    // Format conversation
    conversationMessages.forEach((msg) => {
      if (msg.role === "user") {
        prompt += `User: ${msg.content}\n`;
      } else if (msg.role === "assistant") {
        prompt += `Assistant: ${msg.content}\n`;
      }
    });
    prompt += "Assistant:";

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            temperature,
            max_new_tokens: 512,
            return_full_text: false,
            top_p: 0.9,
            repetition_penalty: 1.1,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        throw new Error(`Hugging Face API error: ${errorText}`);
      }
      
      // Handle model loading state
      if (errorData.error && errorData.error.includes("loading")) {
        throw new Error(
          "Model sedang dimuat di server Hugging Face. Tunggu 10-30 detik dan coba lagi."
        );
      }
      
      throw new Error(`Hugging Face API error: ${errorData.error || errorText}`);
    }

    const data = await response.json();
    
    // Handle different response formats from Hugging Face
    if (Array.isArray(data)) {
      if (data[0]?.generated_text) {
        return data[0].generated_text.trim();
      }
      if (data[0]?.summary_text) {
        return data[0].summary_text.trim();
      }
    }
    
    if (data.generated_text) {
      // Remove the original prompt if included
      const generated = data.generated_text.trim();
      if (generated.startsWith(prompt)) {
        return generated.substring(prompt.length).trim();
      }
      return generated;
    }
    
    if (data[0]?.generated_text) {
      return data[0].generated_text.trim();
    }
    
    if (data.summary_text) {
      return data.summary_text.trim();
    }
    
    // Try to extract text from any format
    const jsonStr = JSON.stringify(data);
    throw new Error(
      `Unexpected response format from Hugging Face. Response: ${jsonStr.substring(0, 200)}`
    );
  }
}

// Google Gemini Provider (FREE TIER)
class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private baseURL = "https://generativelanguage.googleapis.com/v1beta";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    options: { temperature?: number; model?: string } = {}
  ): Promise<string> {
    const model = options.model || "gemini-pro";
    const temperature = options.temperature || 0.7;

    // Separate system message and conversation
    const systemMessage = messages.find((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // Format for Gemini API
    const contents = conversationMessages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Add system instruction if present
    const systemInstruction = systemMessage
      ? { systemInstruction: { parts: [{ text: systemMessage.content }] } }
      : {};

    const response = await fetch(
      `${this.baseURL}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature,
          },
          ...systemInstruction,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada respons"
    );
  }
}

// Ollama Provider (100% FREE, LOCAL)
class OllamaProvider implements LLMProvider {
  private baseURL: string;
  private model: string;

  constructor(baseURL: string = "http://localhost:11434", model: string = "llama3") {
    this.baseURL = baseURL;
    this.model = model;
  }

  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    options: { temperature?: number; model?: string; stream?: boolean } = {}
  ): Promise<string> {
    const model = options.model || this.model;
    const temperature = options.temperature || 0.7;
    const stream = options.stream || false;

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: stream, // Support streaming
        options: {
          temperature,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      let errorMessage = `Ollama API error: ${errorText}`;
      
      // Provide helpful error messages
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.includes("not found") || errorData.error?.includes("model")) {
          errorMessage = `Model '${model}' tidak ditemukan di Ollama.\n\n` +
            `Solusi:\n` +
            `1. Download model terlebih dahulu:\n` +
            `   ollama pull ${model}\n\n` +
            `2. Atau cek model yang tersedia:\n` +
            `   ollama list\n\n` +
            `3. Pastikan nama model di .env.local sesuai dengan model yang sudah di-download.\n\n` +
            `Error detail: ${errorText}`;
        } else if (errorText.includes("connection refused") || errorText.includes("ECONNREFUSED")) {
          errorMessage = `Tidak dapat terhubung ke Ollama.\n\n` +
            `Solusi:\n` +
            `1. Pastikan Ollama sudah terinstall dan berjalan\n` +
            `2. Jalankan: ollama serve\n` +
            `3. Atau restart aplikasi Ollama\n` +
            `4. Pastikan OLLAMA_BASE_URL=http://localhost:11434 benar\n\n` +
            `Error detail: ${errorText}`;
        }
      } catch {
        // If error text is not JSON, use it as is
      }
      
      throw new Error(errorMessage);
    }

    // Handle streaming response
    if (stream && response.body) {
      // For streaming, return empty string (handled separately)
      return "";
    }

    // Handle non-streaming response - Ollama returns JSON for chat endpoint
    let data;
    try {
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from Ollama');
      }
      
      // Check if response might be incomplete (ends abruptly)
      const trimmedText = responseText.trim();
      if (!trimmedText.endsWith('}') && !trimmedText.endsWith(']')) {
        console.warn('Response might be incomplete. Full response:', responseText);
        throw new Error('Incomplete response from Ollama. Response was cut off. Make sure stream=false is set.');
      }
      
      try {
        data = JSON.parse(trimmedText);
      } catch (parseError: any) {
        console.error('Ollama JSON parse error:', parseError);
        console.error('Response text length:', responseText.length);
        console.error('Response text preview (first 300 chars):', responseText.substring(0, 300));
        console.error('Response text preview (last 100 chars):', responseText.substring(Math.max(0, responseText.length - 100)));
        throw new Error(`Invalid JSON response from Ollama: ${parseError.message}. Response length: ${responseText.length} chars`);
      }
    } catch (error: any) {
      // If it's already our custom error, re-throw it
      if (error.message.includes('Invalid JSON') || error.message.includes('Empty response')) {
        throw error;
      }
      // Otherwise, wrap it
      throw new Error(`Failed to read response from Ollama: ${error.message}`);
    }
    
    // Extract content from response
    if (data.message?.content) {
      return data.message.content;
    }
    if (data.response) {
      return data.response;
    }
    if (data.content) {
      return data.content;
    }
    
    // Log unexpected format for debugging
    console.warn('Unexpected Ollama response format:', JSON.stringify(data).substring(0, 200));
    return "Tidak ada respons";
  }

  async generateStreamResponse(
    messages: Array<{ role: string; content: string }>,
    options: { temperature?: number; model?: string } = {},
    onChunk?: (chunk: string) => void
  ): Promise<ReadableStream<Uint8Array>> {
    const model = options.model || this.model;
    const temperature = options.temperature || 0.7;

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
        options: {
          temperature,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Ollama API error: ${errorText}`);
    }

    if (!response.body) {
      throw new Error("No response body for streaming");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const data = JSON.parse(line);
                  const content = data.message?.content || "";
                  if (content && onChunk) {
                    onChunk(content);
                  }
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(content));
                  }
                } catch (e) {
                  // Skip invalid JSON lines
                }
              }
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });
  }
}

// OpenAI Provider (Original)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import OpenAI from "openai";

class OpenAIProvider implements LLMProvider {
  private client: any;

  constructor(apiKey: string) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.client = new OpenAI({ apiKey });
  }

  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    options: { temperature?: number; model?: string } = {}
  ): Promise<string> {
    const model = options.model || "gpt-4";
    const temperature = options.temperature || 0.7;

    const response = await this.client.chat.completions.create({
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature,
    });

    return response.choices[0]?.message?.content || "Tidak ada respons";
  }
}

// Factory function to get the appropriate provider
export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER?.toLowerCase() || "openai";

  switch (provider) {
    case "groq":
      if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY tidak dikonfigurasi");
      }
      return new GroqProvider(process.env.GROQ_API_KEY);

    case "huggingface":
    case "hf":
      if (!process.env.HUGGINGFACE_API_KEY) {
        throw new Error("HUGGINGFACE_API_KEY tidak dikonfigurasi");
      }
      return new HuggingFaceProvider(
        process.env.HUGGINGFACE_API_KEY,
        process.env.HUGGINGFACE_MODEL
      );

    case "gemini":
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY tidak dikonfigurasi");
      }
      return new GeminiProvider(process.env.GEMINI_API_KEY);

    case "ollama":
      return new OllamaProvider(
        process.env.OLLAMA_BASE_URL || "http://localhost:11434",
        process.env.OLLAMA_MODEL || "llama3"
      );

    case "openai":
    default:
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY tidak dikonfigurasi. Untuk alternatif gratis, gunakan LLM_PROVIDER=groq");
      }
      return new OpenAIProvider(process.env.OPENAI_API_KEY);
  }
}

export type { LLMProvider };

