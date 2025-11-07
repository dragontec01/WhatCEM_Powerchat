import OpenAI from 'openai';
import { Message, Contact, Conversation, ChannelConnection } from '@shared/db/schema';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import elevenLabsService, { ElevenLabsConfig } from './elevenlabs-service';
import { aiCredentialsService } from './ai-credentials-service';
import knowledgeBaseService from './knowledge-base-service';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: string | null;
}

interface AIProviderInterface {
  generateResponse(
    messages: ConversationMessage[],
    options: {
      systemPrompt?: string;
      enableFunctionCalling?: boolean;
      enableAudio?: boolean;
      enableImage?: boolean;
      enableVideo?: boolean;
      enableVoiceProcessing?: boolean;
      enableTextToSpeech?: boolean;
      ttsProvider?: string;
      ttsVoice?: string;
      voiceResponseMode?: string;
      maxAudioDuration?: number;
      functionDefinitions?: any[];
      model?: string;
      elevenLabsApiKey?: string;
      elevenLabsVoiceId?: string;
      elevenLabsCustomVoiceId?: string;
      elevenLabsModel?: string;
      elevenLabsStability?: number;
      elevenLabsSimilarityBoost?: number;
      elevenLabsStyle?: number;
      elevenLabsUseSpeakerBoost?: boolean;
    }
  ): Promise<{
    text: string;
    audioUrl?: string;
    functionCalls?: any[];
  }>;
}

function generateMessagesWithHistory(
  message: Message,
  _contact: Contact,
  systemPrompt: string,
  conversationHistory: Message[] = [],
  historyLimit: number = 5
): ConversationMessage[] {
  const messages: ConversationMessage[] = [
    { role: 'system', content: systemPrompt }
  ];

  const recentHistory = conversationHistory
    .sort((a, b) => {
      const timeA = a.sentAt ? a.sentAt.getTime() : 0;
      const timeB = b.sentAt ? b.sentAt.getTime() : 0;
      return timeA - timeB;
    })
    .slice(-historyLimit);


  recentHistory.forEach(historyMsg => {
    const role = historyMsg.direction === 'inbound' ? 'user' : 'assistant';
    if (historyMsg.content) {
      let metadata = null;

      if (historyMsg.type === 'audio') {
        if (historyMsg.metadata) {
          metadata = typeof historyMsg.metadata === 'string' ? historyMsg.metadata : JSON.stringify(historyMsg.metadata);
        } else if (historyMsg.mediaUrl) {
          metadata = JSON.stringify({
            mediaUrl: historyMsg.mediaUrl,
            mediaType: 'audio'
          });
        }
      } else if (historyMsg.mediaUrl) {
        metadata = JSON.stringify({
          mediaUrl: historyMsg.mediaUrl,
          mediaType: historyMsg.type
        });
      }

      messages.push({
        role,
        content: historyMsg.content,
        metadata
      });
    }
  });

  if (!recentHistory.find(m => m.id === message.id) && message.content) {
    let metadata = null;

    if (message.type === 'audio') {
      if (message.metadata) {
        metadata = typeof message.metadata === 'string' ? message.metadata : JSON.stringify(message.metadata);
      } else if (message.mediaUrl) {
        metadata = JSON.stringify({
          mediaUrl: message.mediaUrl,
          mediaType: 'audio'
        });
      }
    } else if (message.mediaUrl) {
      metadata = JSON.stringify({
        mediaUrl: message.mediaUrl,
        mediaType: message.type
      });
    }

    messages.push({
      role: 'user',
      content: message.content,
      metadata
    });
  }

  return messages;
}

class OpenAIProvider implements AIProviderInterface {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Convert audio file to text using OpenAI Whisper
   */
  private async transcribeAudio(audioPath: string): Promise<string> {
    try {
      const audioFile = await fs.readFile(audioPath);
      const audioBuffer = Buffer.from(audioFile);

      const fileExtension = path.extname(audioPath).toLowerCase();
      let tempFileName = `temp_audio_${Date.now()}`;

      if (fileExtension === '.ogg' || fileExtension === '.oga') {
        tempFileName += '.ogg';
      } else if (fileExtension === '.mp3') {
        tempFileName += '.mp3';
      } else if (fileExtension === '.wav') {
        tempFileName += '.wav';
      } else if (fileExtension === '.m4a') {
        tempFileName += '.m4a';
      } else {
        tempFileName += '.mp3';
      }

      const tempPath = path.join(process.cwd(), 'temp', tempFileName);

      await fs.mkdir(path.dirname(tempPath), { recursive: true });
      await fs.writeFile(tempPath, audioBuffer);

      try {
        const fs_node = await import('fs');

        let transcription = '';
        let lastError: Error | null = null;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await this.client.audio.transcriptions.create({
              file: await OpenAI.toFile(fs_node.createReadStream(tempPath), path.basename(tempPath)),
              model: 'whisper-1',
              language: 'en',
              response_format: 'text'
            });

            transcription = result;
            break;

          } catch (error) {
            lastError = error as Error;

            if (attempt === maxRetries) {
              throw lastError;
            }

            const waitTime = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }

        await fs.unlink(tempPath).catch(() => {});

        return transcription;
      } catch (error) {
        await fs.unlink(tempPath).catch(() => {});
        throw error;
      }
    } catch (error) {
      console.error('OpenAI Provider: Error transcribing audio:', error);
      throw new Error(`Audio transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert text to speech using OpenAI TTS with cross-platform optimization
   */
  private async generateSpeech(text: string, voice: string = 'alloy'): Promise<string> {
    try {
      let response: any;
      let lastError: Error | null = null;
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          response = await this.client.audio.speech.create({
            model: 'tts-1',
            voice: voice as any,
            input: text,
            response_format: 'mp3'
          });

          break;

        } catch (error) {
          lastError = error as Error;

          if (attempt === maxRetries) {
            throw lastError;
          }

          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      const audioId = crypto.randomBytes(16).toString('hex');
      const audioDir = path.join(process.cwd(), 'media', 'audio');
      await fs.mkdir(audioDir, { recursive: true });


      const mp3FileName = `tts_${audioId}.mp3`;
      const mp3Path = path.join(audioDir, mp3FileName);
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(mp3Path, audioBuffer);


      try {
        const { convertAudioForCrossPlatform } = await import('../utils/audio-converter');
        const oggResult = await convertAudioForCrossPlatform(mp3Path, audioDir, mp3FileName);

        if (oggResult.success && oggResult.audioUrl) {

          return oggResult.audioUrl;
        } else {
          console.warn('OpenAI TTS: OGG conversion failed, using MP3 fallback:', oggResult.error);
        }
      } catch (conversionError) {
        console.warn('OpenAI TTS: Audio conversion not available, using MP3:', conversionError);
      }


      return `media/audio/${mp3FileName}`;
    } catch (error) {
      console.error('OpenAI Provider: Error generating speech:', error);
      throw new Error(`Speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateResponse(
    messages: ConversationMessage[],
    options: {
      systemPrompt?: string;
      enableFunctionCalling?: boolean;
      enableAudio?: boolean;
      enableImage?: boolean;
      enableVideo?: boolean;
      enableVoiceProcessing?: boolean;
      enableTextToSpeech?: boolean;
      ttsProvider?: string;
      ttsVoice?: string;
      voiceResponseMode?: string;
      maxAudioDuration?: number;
      functionDefinitions?: any[];
      model?: string;
      elevenLabsApiKey?: string;
      elevenLabsVoiceId?: string;
      elevenLabsCustomVoiceId?: string;
      elevenLabsModel?: string;
      elevenLabsStability?: number;
      elevenLabsSimilarityBoost?: number;
      elevenLabsStyle?: number;
      elevenLabsUseSpeakerBoost?: boolean;
    }
  ): Promise<{
    text: string;
    audioUrl?: string;
    functionCalls?: any[];
  }> {
    try {


      const processedMessages = await Promise.all(messages.map(async (msg) => {
        const userMessagesWithMetadata = messages.filter(m => m.role === 'user' && m.metadata);
        const isLatestUserMessageWithMetadata = userMessagesWithMetadata.length > 0 &&
                                               userMessagesWithMetadata[userMessagesWithMetadata.length - 1] === msg;
        const shouldTranscribe = options.enableVoiceProcessing && msg.metadata && msg.role === 'user' && isLatestUserMessageWithMetadata;

        if (shouldTranscribe) {
          try {
            if (!msg.metadata) {
              throw new Error('No metadata available for transcription');
            }
            const metadata = JSON.parse(msg.metadata);

            let audioPath: string | null = null;

            const isAudioMessage = metadata.mediaType === 'audio' ||
                                 metadata.whatsappMessage?.message?.audioMessage ||
                                 metadata.audioPath ||
                                 (metadata.mediaUrl && metadata.mediaUrl.includes('/audio/')) ||
                                 (metadata.mediaUrl && metadata.mediaUrl.includes('.mp3')) ||
                                 (metadata.mediaUrl && metadata.mediaUrl.includes('.ogg')) ||
                                 (metadata.mediaUrl && metadata.mediaUrl.includes('.wav'));

            if (isAudioMessage) {
              const maxDuration = options.maxAudioDuration || 30;
              const audioDuration = metadata.whatsappMessage?.message?.audioMessage?.seconds;

              if (audioDuration && audioDuration > maxDuration) {
                return {
                  role: msg.role,
                  content: `Your audio message is too long for processing. Please send a shorter message (under ${maxDuration} seconds) or type your message instead.`,
                  metadata: msg.metadata
                };
              }

              if (metadata.mediaUrl) {
                audioPath = metadata.mediaUrl;
              } else if (metadata.audioPath) {
                audioPath = metadata.audioPath;
              }

              if (audioPath) {
                try {
                  let fullAudioPath: string;

                  if (audioPath.startsWith('/media/')) {
                    fullAudioPath = path.join(process.cwd(), 'public', audioPath.slice(1));
                  } else if (audioPath.startsWith('media/')) {
                    fullAudioPath = path.join(process.cwd(), 'public', audioPath);
                  } else if (path.isAbsolute(audioPath)) {
                    fullAudioPath = audioPath;
                  } else {
                    fullAudioPath = path.join(process.cwd(), audioPath);
                  }

                  try {
                    await fs.access(fullAudioPath);
                  } catch (fileError) {
                    throw new Error(`Audio file not found: ${fullAudioPath}`);
                  }

                  const transcribedText = await this.transcribeAudio(fullAudioPath);

                  const enhancedContent = transcribedText || 'Voice message (transcription failed)';

                  return {
                    role: msg.role,
                    content: enhancedContent,
                    metadata: msg.metadata
                  };
                } catch (transcriptionError) {
                  return {
                    role: msg.role,
                    content: `Voice message (transcription failed: ${transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error'})`,
                    metadata: msg.metadata
                  };
                }
              }
            }
          } catch (error) {
          }
        }

        return {
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata
        };
      }));

      const apiMessages = processedMessages;

      let modelToUse = options.model || "gpt-4-turbo";

      switch (modelToUse) {
        case 'gpt-4.1-nano':
          modelToUse = "gpt-4o-mini";
          break;
        case 'gpt-4.1-mini':
          modelToUse = "gpt-4o-mini";
          break;
        case 'gpt-4o':
          modelToUse = "gpt-4o";
          break;
        case 'gpt-4-turbo':
          modelToUse = "gpt-4-turbo";
          break;
        case 'gpt-3.5-turbo':
          modelToUse = "gpt-3.5-turbo";
          break;
        default:
          modelToUse = "gpt-4-turbo";
      }

      let maxTokens = 4096;
      let temperature = 0.7;

      if (modelToUse === "gpt-4o-mini") {
        maxTokens = 2048;
        temperature = 0.5;
      }

      const apiParams: any = {
        model: modelToUse,
        messages: apiMessages,
        temperature: temperature,
        max_tokens: maxTokens
      };

      if (options.enableFunctionCalling && options.functionDefinitions) {
        apiParams.tools = options.functionDefinitions.map(funcDef => ({
          type: "function",
          function: funcDef
        }));
        apiParams.tool_choice = "auto";

      }

      const response = await this.client.chat.completions.create(apiParams);

      let functionCalls: Array<{ name: string, arguments: any }> = [];

      if (response.choices[0]?.message?.tool_calls) {
        functionCalls = response.choices[0].message.tool_calls.map(tool => {
          if (tool.type === 'function') {
            try {
              return {
                name: tool.function.name,
                arguments: JSON.parse(tool.function.arguments)
              };
            } catch (e) {
              console.error(`OpenAI Provider: Error parsing function arguments:`, e);
              return {
                name: tool.function.name,
                arguments: tool.function.arguments
              };
            }
          }
          return null;
        }).filter(Boolean) as Array<{ name: string, arguments: any }>;

      }

      const text = response.choices[0]?.message?.content || "";

      let shouldGenerateTTS = false;
      const voiceResponseMode = options.voiceResponseMode || 'always';



      const userSentVoiceMessage = (() => {
        const userMessages = messages.filter(msg => msg.role === 'user');

        if (userMessages.length === 0) {
          return false;
        }

        const lastUserMessage = userMessages[userMessages.length - 1];

        let currentUserMessage = lastUserMessage;

        if (!lastUserMessage.metadata && userMessages.length >= 2) {
          const secondLastUserMessage = userMessages[userMessages.length - 2];

          if (lastUserMessage.content === secondLastUserMessage.content && secondLastUserMessage.metadata) {
            currentUserMessage = secondLastUserMessage;
          }
        }

        if (!currentUserMessage.metadata) {
          return false;
        }

        try {
          const metadata = JSON.parse(currentUserMessage.metadata);

          const hasMediaType = metadata.mediaType === 'audio';
          const hasAudioMessage = !!metadata.whatsappMessage?.message?.audioMessage;
          const hasAudioPath = !!metadata.audioPath;
          const hasAudioUrl = metadata.mediaUrl && (
            metadata.mediaUrl.includes('/audio/') ||
            metadata.mediaUrl.includes('.mp3') ||
            metadata.mediaUrl.includes('.ogg') ||
            metadata.mediaUrl.includes('.wav')
          );

          const isVoiceMessage = hasMediaType || hasAudioMessage || hasAudioPath || hasAudioUrl;

          if (isVoiceMessage) {
            const maxDuration = options.maxAudioDuration || 30;
            const audioDuration = metadata.whatsappMessage?.message?.audioMessage?.seconds;

            if (audioDuration && audioDuration > maxDuration) {
              return false;
            }
          }

          return isVoiceMessage;
        } catch (error) {
          return false;
        }
      })();

      if (options.enableTextToSpeech && text) {
        switch (voiceResponseMode) {
          case 'always':
            shouldGenerateTTS = true;
            break;

          case 'voice_only':
          case 'voice-to-voice':
            shouldGenerateTTS = userSentVoiceMessage;
            break;

          case 'never':
            shouldGenerateTTS = false;
            break;

          default:
            shouldGenerateTTS = true;
        }
      }

      let audioUrl: string | undefined;
      if (shouldGenerateTTS) {
        try {
          const ttsProvider = options.ttsProvider || 'openai';

          if (ttsProvider === 'elevenlabs') {
            if (!options.elevenLabsApiKey) {
              console.error('OpenAI Provider: ElevenLabs API key is required for ElevenLabs TTS');
            } else {
              const voiceId = options.elevenLabsCustomVoiceId && options.elevenLabsCustomVoiceId.trim()
                ? options.elevenLabsCustomVoiceId.trim()
                : options.elevenLabsVoiceId;

              if (!voiceId || voiceId === 'custom') {
                console.error('OpenAI Provider: ElevenLabs voice ID is required for ElevenLabs TTS');
              } else {
                const elevenLabsConfig: ElevenLabsConfig = {
                  apiKey: options.elevenLabsApiKey,
                  voiceId: voiceId,
                  model: options.elevenLabsModel,
                  stability: options.elevenLabsStability,
                  similarityBoost: options.elevenLabsSimilarityBoost,
                  style: options.elevenLabsStyle,
                  useSpeakerBoost: options.elevenLabsUseSpeakerBoost
                };
                audioUrl = await elevenLabsService.generateSpeech(text, elevenLabsConfig);
              }
            }
          } else {
            audioUrl = await this.generateSpeech(text, options.ttsVoice || 'alloy');
          }
        } catch (error) {
          console.error('OpenAI Provider: Error generating TTS audio:', error);
        }
      }

      return { text, audioUrl, functionCalls };
    } catch (error) {
      console.error('OpenAI Provider: Error in generateResponse', error);
      return {
        text: ""
      };
    }
  }
}

class OpenRouterProvider implements AIProviderInterface {
  private client: OpenAI;



  private static readonly FUNCTION_CALLING_SUPPORTED_MODELS = new Set([


    'openai/gpt-5',


    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'openai/gpt-4o-2024-11-20',
    'openai/gpt-4o-2024-08-06',
    'openai/gpt-4o-2024-05-13',


    'openai/gpt-4',
    'openai/gpt-4-turbo',
    'openai/gpt-4-turbo-preview',
    'openai/gpt-4-turbo-2024-04-09',
    'openai/gpt-4-1106-preview',
    'openai/gpt-4-vision-preview',


    'openai/gpt-3.5-turbo',
    'openai/gpt-3.5-turbo-0125',
    'openai/gpt-3.5-turbo-1106',


    'openai/gpt-oss-120b',  // 117B MoE model with full tool use support
    'openai/gpt-oss-20b',   // 21B model with agentic capabilities and function calling


    'anthropic/claude-3-5-sonnet',
    'anthropic/claude-3-opus',
    'anthropic/claude-3-sonnet',
    'anthropic/claude-3-haiku',
    'anthropic/claude-3-5-sonnet-20241022',
    'anthropic/claude-3-5-haiku',
    'anthropic/claude-3-5-sonnet-20240620',


    'google/gemini-2.5-pro',           // Gemini 2.5 Pro - supports function calling
    'google/gemini-2.5-flash',         // Gemini 2.5 Flash - supports function calling
    'google/gemini-2.5-flash-lite',    // Gemini 2.5 Flash-Lite - supports function calling
    'google/gemini-2.0-flash',         // Gemini 2.0 Flash - supports function calling
    'google/gemini-2.0-flash-lite',    // Gemini 2.0 Flash-Lite - supports function calling
    'google/gemini-2.0-flash-exp',     // Gemini 2.0 Flash Experimental - supports function calling
    'google/gemini-2.0-flash-thinking-exp', // Gemini 2.0 Flash Thinking Experimental - supports function calling

    'google/gemini-pro',
    'google/gemini-1.5-pro',
    'google/gemini-1.5-flash',
    'google/gemini-1.5-pro-latest',
    'google/gemini-1.5-flash-latest',


    'thudm/glm-4-32b',              // Optimized for code generation and function calling
    'thudm/glm-z1-32b',             // Enhanced reasoning with JSON tool calling
    'thudm/glm-z1-rumination-32b',  // Deep reasoning with search/navigation function calls


    '01-ai/yi-large-fc',  // Specialized model with function calling capability


    'mistralai/mistral-large',
    'mistralai/mistral-medium',
    'mistralai/mistral-small',
    'mistralai/mixtral-8x7b-instruct',
    'mistralai/mistral-7b-instruct',
    'mistralai/pixtral-12b',
    'mistralai/mistral-nemo',  // 12B multilingual model with function calling support


    'cohere/command-r-plus',
    'cohere/command-r',


    'cognitivecomputations/dolphin-llama-3-70b',     // Fine-tuned Llama 3 with improved function calling
    'cognitivecomputations/dolphin3.0-mistral-24b',  // Supports coding, math, agentic, and function calling


    'xai/grok-4',                    // Grok 4 - supports function calling
    'xai/grok-4-0709',               // Grok 4 specific version - confirmed function calling support
    'xai/grok-3',                    // Grok 3 - supports function calling
    'xai/grok-3-latest',             // Grok 3 latest - supports function calling
    'xai/grok-2',                    // Grok 2 - confirmed tool calling support
    'xai/grok-2-latest',             // Grok 2 latest - supports function calling
    'xai/grok-2-1212',               // Grok 2 specific version - supports function calling
    'xai/grok-beta',                 // Grok Beta - experimental model with function calling


    'qwen/qwen-2.5-72b-instruct',
    'qwen/qwen-2.5-coder-32b-instruct',
    'qwen/qwq-32b-preview',
    'deepseek/deepseek-chat',
    'deepseek/deepseek-coder',
    'meta-llama/llama-3.1-405b-instruct',
    'meta-llama/llama-3.1-70b-instruct',
    'perplexity/llama-3.1-sonar-large-128k-online',
    'perplexity/llama-3.1-sonar-small-128k-online'
  ]);

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://powerchat.plus',
        'X-Title': 'PowerChat Plus'
      }
    });
  }

  /**
   * Check if a model supports function calling
   */
  private supportsTools(model: string): boolean {
    return OpenRouterProvider.FUNCTION_CALLING_SUPPORTED_MODELS.has(model);
  }

  async generateResponse(
    messages: ConversationMessage[],
    options: {
      systemPrompt?: string;
      enableFunctionCalling?: boolean;
      enableAudio?: boolean;
      enableImage?: boolean;
      enableVideo?: boolean;
      enableVoiceProcessing?: boolean;
      enableTextToSpeech?: boolean;
      ttsProvider?: string;
      ttsVoice?: string;
      voiceResponseMode?: string;
      maxAudioDuration?: number;
      model?: string;
      functionDefinitions?: any[];
      elevenLabsApiKey?: string;
      elevenLabsVoiceId?: string;
      elevenLabsCustomVoiceId?: string;
      elevenLabsModel?: string;
      elevenLabsStability?: number;
      elevenLabsSimilarityBoost?: number;
      elevenLabsStyle?: number;
      elevenLabsUseSpeakerBoost?: boolean;
    }
  ): Promise<{
    text: string;
    audioUrl?: string;
    functionCalls?: any[];
  }> {
    try {

      const openAIMessages = messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      }));


      if (options.systemPrompt && !messages.find(m => m.role === 'system')) {
        openAIMessages.unshift({
          role: 'system',
          content: options.systemPrompt
        });
      }

      let modelName = options.model || 'openai/gpt-4o-mini';
      let modelSupportsTools = this.supportsTools(modelName);


      const needsTools = options.enableFunctionCalling && options.functionDefinitions && options.functionDefinitions.length > 0;
      if (needsTools && !modelSupportsTools) {
        const fallbackModel = 'openai/gpt-4o-mini'; // Reliable fallback that supports tools
        console.warn(`OpenRouter: Model ${modelName} does not support function calling. Falling back to ${fallbackModel}.`);
        modelName = fallbackModel;
        modelSupportsTools = true;
      }


      let tools: any[] = [];
      if (needsTools && modelSupportsTools) {
        tools = options.functionDefinitions!.map(func => ({
          type: 'function',
          function: {
            name: func.name,
            description: func.description,
            parameters: func.parameters
          }
        }));
      }

      const requestParams: any = {
        model: modelName,
        messages: openAIMessages,
        max_tokens: 4096,
        temperature: 0.7
      };


      if (tools.length > 0) {
        requestParams.tools = tools;
        requestParams.tool_choice = 'auto';
      }

      const response = await this.client.chat.completions.create(requestParams);

      let text = response.choices[0]?.message?.content || "";
      let functionCalls: Array<{ name: string, arguments: any }> = [];


      if (response.choices[0]?.message?.tool_calls) {
        for (const toolCall of response.choices[0].message.tool_calls) {
          if (toolCall.type === 'function') {
            functionCalls.push({
              name: toolCall.function.name,
              arguments: JSON.parse(toolCall.function.arguments || '{}')
            });
          }
        }
      }

      return { text, functionCalls: functionCalls.length > 0 ? functionCalls : undefined };
    } catch (error) {
      console.error('OpenRouter Provider: Error in generateResponse', error);
      return {
        text: ""
      };
    }
  }
}

class TranslationService {
  /**
   * Detect if text is in a foreign language (not the target language)
   */
  private async detectLanguage(text: string, provider: string, apiKey: string): Promise<string> {
    try {
      if (provider === 'openai') {
        const openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });

        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a language detection expert. Respond with only the ISO 639-1 language code (2 letters) of the given text. Examples: "en" for English, "es" for Spanish, "fr" for French, etc. If uncertain, respond with "unknown".'
            },
            {
              role: 'user',
              content: `Detect the language of this text: "${text}"`
            }
          ],
          max_tokens: 10,
          temperature: 0
        });

        return response.choices[0]?.message?.content?.trim().toLowerCase() || 'unknown';
      }


      return this.simpleLanguageDetection(text);
    } catch (error) {
      console.error('Language detection error:', error);
      return 'unknown';
    }
  }

  /**
   * Simple heuristic language detection as fallback
   */
  private simpleLanguageDetection(text: string): string {

    const patterns = {
      es: /\b(hola|gracias|por favor|buenos días|buenas tardes|cómo estás|qué tal)\b/i,
      fr: /\b(bonjour|merci|s'il vous plaît|comment allez-vous|bonsoir|salut)\b/i,
      de: /\b(hallo|danke|bitte|guten tag|wie geht es|auf wiedersehen)\b/i,
      it: /\b(ciao|grazie|prego|buongiorno|come stai|arrivederci)\b/i,
      pt: /\b(olá|obrigado|por favor|bom dia|como está|tchau)\b/i,
      ru: /[а-яё]/i,
      ar: /[ا-ي]/,
      zh: /[\u4e00-\u9fff]/,
      ja: /[\u3040-\u309f\u30a0-\u30ff]/,
      ko: /[\uac00-\ud7af]/
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return lang;
      }
    }

    return 'en'; // Default to English if no pattern matches
  }

  /**
   * Translate text using the specified provider
   */
  async translateText(
    text: string,
    targetLanguage: string,
    provider: string,
    apiKey: string
  ): Promise<string> {
    try {
      if (provider === 'openai') {
        const openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });

        const languageNames: Record<string, string> = {
          en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
          pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
          ar: 'Arabic', hi: 'Hindi', tr: 'Turkish', nl: 'Dutch', sv: 'Swedish',
          da: 'Danish', no: 'Norwegian', fi: 'Finnish', pl: 'Polish', cs: 'Czech',
          hu: 'Hungarian', ro: 'Romanian', bg: 'Bulgarian', hr: 'Croatian',
          sk: 'Slovak', sl: 'Slovenian', et: 'Estonian', lv: 'Latvian',
          lt: 'Lithuanian', mt: 'Maltese', ga: 'Irish', cy: 'Welsh'
        };

        const targetLanguageName = languageNames[targetLanguage] || targetLanguage;

        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the given text to ${targetLanguageName}. Maintain the original tone and meaning. Respond with only the translation, no additional text.`
            },
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        });

        return response.choices[0]?.message?.content?.trim() || text;
      }


      console.warn('Google Translate provider not yet implemented, using OpenAI fallback');
      return await this.translateText(text, targetLanguage, 'openai', apiKey);

    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text if translation fails
    }
  }

  /**
   * Check if translation is needed and perform translation
   */
  async processTranslation(
    text: string,
    targetLanguage: string,
    provider: string,
    apiKey: string
  ): Promise<{ needsTranslation: boolean; translatedText?: string; detectedLanguage?: string }> {
    try {

      const detectedLanguage = await this.detectLanguage(text, provider, apiKey);


      const needsTranslation = detectedLanguage !== targetLanguage && detectedLanguage !== 'unknown';

      if (!needsTranslation) {
        return { needsTranslation: false, detectedLanguage };
      }


      const translatedText = await this.translateText(text, targetLanguage, provider, apiKey);

      return {
        needsTranslation: true,
        translatedText,
        detectedLanguage
      };
    } catch (error) {
      console.error('Translation processing error:', error);
      return { needsTranslation: false };
    }
  }
}

class AIAssistantService {
  public translationService = new TranslationService();

  /**
   * Estimate token count for text (rough approximation)
   * This is a simple estimation - actual token counts may vary by provider
   */
  private estimateTokens(text: string): number {
    if (!text) return 0;



    const charCount = text.length;
    const wordCount = text.split(/\s+/).length;


    const charBasedTokens = Math.ceil(charCount / 4);
    const wordBasedTokens = Math.ceil(wordCount * 1.3); // ~1.3 tokens per word on average

    return Math.ceil((charBasedTokens + wordBasedTokens) / 2);
  }

  /**
   * Generate audio capability prompt based on configuration
   */
  private generateAudioCapabilityPrompt(config: any): string {
    const capabilities = [];

    if (config.enableVoiceProcessing) {
      capabilities.push('process and understand voice messages/audio files');
    }

    if (config.enableTextToSpeech) {
      const ttsProvider = config.ttsProvider || 'openai';
      const voiceResponseMode = config.voiceResponseMode || 'always';

      let responseMode = '';
      switch (voiceResponseMode) {
        case 'always':
          responseMode = 'You will respond with both text and voice messages for all interactions.';
          break;
        case 'voice_only':
        case 'voice-to-voice':
          responseMode = 'You will respond with voice messages only when the user sends you a voice message.';
          break;
        case 'never':
          responseMode = 'You will only respond with text messages.';
          break;
        default:
          responseMode = 'You can respond with voice messages when appropriate.';
      }

      capabilities.push(`generate voice responses using ${ttsProvider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'} text-to-speech technology`);
      capabilities.push(responseMode);
    }

    if (capabilities.length === 0) {
      return '';
    }

    const maxDuration = config.maxAudioDuration || 30;


    let capabilityDescription = '';
    if (capabilities.length === 1) {
      capabilityDescription = capabilities[0];
    } else if (capabilities.length === 2) {
      capabilityDescription = `${capabilities[0]} and ${capabilities[1]}`;
    } else if (capabilities.length > 2) {
      capabilityDescription = `${capabilities.slice(0, -1).join(', ')}, and ${capabilities[capabilities.length - 1]}`;
    }

    return `
AUDIO PROCESSING CAPABILITIES:
You have advanced audio processing capabilities and can ${capabilityDescription}

IMPORTANT AUDIO GUIDELINES:
- You CAN process voice messages and audio files that users send to you
- When users send voice messages, acknowledge that you received and understood their audio message
- You can understand speech, transcribe audio content, and respond appropriately to voice inputs
- Audio messages are limited to ${maxDuration} seconds for processing efficiency
- Never claim that you cannot process voice messages or audio files - you have full audio processing capabilities
- Respond naturally to voice messages as you would to any text message
- Be conversational. And don't tell the user that you have the ability of voice processing etc just respond to thier request directly.

${config.enableTextToSpeech && capabilities.length > 0 ? capabilities[capabilities.length - 1] : ''}`.trim();
  }

  private async getProvider(provider: string, apiKey: string, companyId?: number): Promise<AIProviderInterface> {

    if (!provider) {
      provider = 'openai';
    }


    if (apiKey) {
      return this.createProviderInstance(provider, apiKey);
    }


    if (companyId) {
      try {
        const credentialSource = await aiCredentialsService.getCredentialForCompany(companyId, provider);
        if (credentialSource) {
          return this.createProviderInstance(provider, credentialSource.apiKey);
        }
      } catch (error) {
        console.error('Error getting AI credential:', error);
      }
    }


    const envKey = this.getEnvironmentKey(provider);
    if (envKey) {
      return this.createProviderInstance(provider, envKey);
    }


    if (provider !== 'openai') {
      return this.getProvider('openai', '', companyId);
    }

    throw new Error(`No API key available for ${provider} provider. Please configure credentials in the admin panel or provide an API key in the node settings.`);
  }

  private createProviderInstance(provider: string, apiKey: string): AIProviderInterface {
    switch (provider.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(apiKey);
      case 'openrouter':
        return new OpenRouterProvider(apiKey);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  private getEnvironmentKey(provider: string): string | null {
    switch (provider.toLowerCase()) {
      case 'openai':
        return process.env.OPENAI_API_KEY || null;
      case 'openrouter':
        return process.env.OPENROUTER_API_KEY || null;
      default:
        return null;
    }
  }

  async processMessage(
    message: Message,
    _conversation: Conversation,
    contact: Contact,
    _channelConnection: ChannelConnection,
    config: {
      provider: string;
      model: string;
      apiKey: string;
      systemPrompt: string;
      enableHistory: boolean;
      historyLimit?: number;
      enableAudio: boolean;
      enableImage: boolean;
      enableVideo: boolean;
      enableVoiceProcessing?: boolean;
      enableTextToSpeech?: boolean;
      ttsProvider?: string;
      ttsVoice?: string;
      voiceResponseMode?: string;
      maxAudioDuration?: number;
      enableFunctionCalling: boolean;
      enableTaskExecution?: boolean;
      tasks?: any[];
      enableGoogleCalendar?: boolean;
      calendarFunctions?: any[];
      enableZohoCalendar?: boolean;
      zohoCalendarFunctions?: any[];
      elevenLabsApiKey?: string;
      elevenLabsVoiceId?: string;
      elevenLabsCustomVoiceId?: string;
      elevenLabsModel?: string;
      elevenLabsStability?: number;
      elevenLabsSimilarityBoost?: number;
      elevenLabsStyle?: number;
      elevenLabsUseSpeakerBoost?: boolean;

      nodeId?: string;
      knowledgeBaseEnabled?: boolean;
      knowledgeBaseConfig?: {
        maxRetrievedChunks?: number;
        similarityThreshold?: number;
        contextPosition?: 'before_system' | 'after_system' | 'before_user';
        contextTemplate?: string;
      };
    },
    conversationHistory: Message[] = [],
    companyId?: number
  ): Promise<{
    text: string;
    audioUrl?: string;
    functionCalls?: any[];
    triggeredTasks?: string[];
    triggeredCalendarFunctions?: any[];
    triggeredZohoCalendarFunctions?: any[];
  }> {
    try {

      const provider = await this.getProvider(config.provider, config.apiKey, companyId);

      let functionDefinitions: any[] = [];
      const shouldEnableTaskFunctions = config.enableTaskExecution && config.tasks && config.tasks.length > 0;
      const shouldEnableCalendarFunctions = config.enableGoogleCalendar && config.calendarFunctions && config.calendarFunctions.length > 0;
      const shouldEnableZohoCalendarFunctions = config.enableZohoCalendar && config.zohoCalendarFunctions && config.zohoCalendarFunctions.length > 0;
      const shouldEnableFunctionCalling = shouldEnableTaskFunctions || shouldEnableCalendarFunctions || shouldEnableZohoCalendarFunctions;


      if (shouldEnableTaskFunctions && config.tasks) {
        functionDefinitions = config.tasks
          .filter(task => task.enabled)
          .map(task => task.functionDefinition);
      }


      if (shouldEnableCalendarFunctions && config.calendarFunctions) {
        const calendarFunctionDefs = config.calendarFunctions
          .filter((func: any) => func.enabled)
          .map((func: any) => func.functionDefinition);
        functionDefinitions = [...functionDefinitions, ...calendarFunctionDefs];
      }


      if (shouldEnableZohoCalendarFunctions && config.zohoCalendarFunctions) {
        const zohoCalendarFunctionDefs = config.zohoCalendarFunctions
          .filter((func: any) => func.enabled)
          .map((func: any) => func.functionDefinition);
        functionDefinitions = [...functionDefinitions, ...zohoCalendarFunctionDefs];
      }


      let knowledgeBaseContext = '';
      if (config.knowledgeBaseEnabled && config.nodeId && companyId) {
        try {
          const userQuery = message.content || '';
          const kbConfig = config.knowledgeBaseConfig || {};


          const retrievalResults = await knowledgeBaseService.retrieveContext(
            companyId,
            config.nodeId,
            userQuery
          );

          if (retrievalResults && retrievalResults.length > 0) {
            const maxChunks = kbConfig.maxRetrievedChunks || 3;
            const contextTemplate = kbConfig.contextTemplate ||
              'Based on the following knowledge base information:\n\n{context}\n\nPlease answer the user\'s question using this information when relevant.';


            const contextChunks = retrievalResults
              .slice(0, maxChunks)
              .map((result, index) => {
                const similarity = (result.similarity * 100).toFixed(1);
                return `[Document: ${result.document.originalName}] (Relevance: ${similarity}%)\n${result.chunk.content}`;
              })
              .join('\n\n---\n\n');

            knowledgeBaseContext = contextTemplate.replace('{context}', contextChunks);


          }
        } catch (error) {
          console.error('[Knowledge Base] Error retrieving context:', error);

        }
      }



      let enhancedSystemPrompt = config.systemPrompt || 'You are a helpful assistant.';


      const contextPosition = config.knowledgeBaseConfig?.contextPosition || 'before_system';
      if (knowledgeBaseContext) {
        if (contextPosition === 'before_system') {
          enhancedSystemPrompt = `${knowledgeBaseContext}\n\n${enhancedSystemPrompt}`;
        } else if (contextPosition === 'after_system') {
          enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n${knowledgeBaseContext}`;
        }

      }

      const hasAudioCapabilities = config.enableVoiceProcessing || config.enableTextToSpeech;
      if (hasAudioCapabilities) {
        const audioCapabilityText = this.generateAudioCapabilityPrompt(config);
        enhancedSystemPrompt = `${enhancedSystemPrompt}

${audioCapabilityText}`;
      }

      if (shouldEnableFunctionCalling && functionDefinitions.length > 0) {
        enhancedSystemPrompt = `${enhancedSystemPrompt}

IMPORTANT FUNCTION CALLING RULES:
- Only call functions when the user explicitly requests the specific action
- Do NOT call functions for general greetings, questions, or casual conversation
- Do NOT call functions unless there is clear, unambiguous user intent
- For greetings like "Hello", "Hi", "How are you?" - respond normally without calling any functions
- Only use functions when the user specifically asks for something that matches the function's purpose
- Be conservative - when in doubt, respond normally without calling functions`;
      }


      let messages: ConversationMessage[];
      if (config.enableHistory) {
        messages = generateMessagesWithHistory(message, contact, enhancedSystemPrompt, conversationHistory, config.historyLimit || 5);
      } else {
        messages = [
          { role: 'system', content: enhancedSystemPrompt }
        ] as ConversationMessage[];


        const userContent = contextPosition === 'before_user' && knowledgeBaseContext
          ? `${knowledgeBaseContext}\n\n${message.content || ''}`
          : message.content || '';

        messages.push({ role: 'user', content: userContent });
      }

      try {
        const response = await provider.generateResponse(messages, {
          systemPrompt: enhancedSystemPrompt,
          enableFunctionCalling: shouldEnableFunctionCalling,
          enableAudio: config.enableAudio,
          enableImage: config.enableImage,
          enableVideo: config.enableVideo,
          enableVoiceProcessing: config.enableVoiceProcessing,
          enableTextToSpeech: config.enableTextToSpeech,
          ttsProvider: config.ttsProvider,
          ttsVoice: config.ttsVoice,
          voiceResponseMode: config.voiceResponseMode,
          maxAudioDuration: config.maxAudioDuration,
          functionDefinitions,
          model: config.model,
          elevenLabsApiKey: config.elevenLabsApiKey,
          elevenLabsVoiceId: config.elevenLabsVoiceId,
          elevenLabsCustomVoiceId: config.elevenLabsCustomVoiceId,
          elevenLabsModel: config.elevenLabsModel,
          elevenLabsStability: config.elevenLabsStability,
          elevenLabsSimilarityBoost: config.elevenLabsSimilarityBoost,
          elevenLabsStyle: config.elevenLabsStyle,
          elevenLabsUseSpeakerBoost: config.elevenLabsUseSpeakerBoost
        });

        const triggeredTasks: string[] = [];
        const triggeredCalendarFunctions: any[] = [];
        const triggeredZohoCalendarFunctions: any[] = [];

        if (response.functionCalls && response.functionCalls.length > 0) {



          if (config.enableTaskExecution && config.tasks) {
            for (const functionCall of response.functionCalls) {
              const matchingTask = config.tasks.find(task =>
                task.enabled && task.functionDefinition.name === functionCall.name
              );
              if (matchingTask) {

                triggeredTasks.push(matchingTask.outputHandle);
              }
            }
          }


          if (config.enableGoogleCalendar && config.calendarFunctions) {
            for (const functionCall of response.functionCalls) {
              const matchingCalendarFunction = config.calendarFunctions.find((func: any) =>
                func.enabled && func.functionDefinition.name === functionCall.name
              );
              if (matchingCalendarFunction) {

                triggeredCalendarFunctions.push({
                  ...functionCall,
                  functionConfig: matchingCalendarFunction
                });
              }
            }
          }


          if (config.enableZohoCalendar && config.zohoCalendarFunctions) {
            for (const functionCall of response.functionCalls) {
              const matchingZohoCalendarFunction = config.zohoCalendarFunctions.find((func: any) =>
                func.enabled && func.functionDefinition.name === functionCall.name
              );
              if (matchingZohoCalendarFunction) {

                triggeredZohoCalendarFunctions.push({
                  ...functionCall,
                  functionConfig: matchingZohoCalendarFunction
                });
              }
            }
          }
        }



        if (companyId && !config.apiKey) {
          try {
            const credentialSource = await aiCredentialsService.getCredentialForCompany(companyId, config.provider);
            if (credentialSource) {

              const inputTokens = this.estimateTokens(messages.map(m => m.content).join(' '));
              const outputTokens = this.estimateTokens(response.text);

              await aiCredentialsService.trackUsageWithCost({
                companyId,
                credentialType: credentialSource.type,
                credentialId: credentialSource.credential?.id || null,
                provider: config.provider,
                model: config.model,
                tokensInput: inputTokens,
                tokensOutput: outputTokens,
                tokensTotal: inputTokens + outputTokens,
                requestCount: 1
              });
            }
          } catch (trackingError) {
            console.error('Error tracking AI usage:', trackingError);

          }
        }

        return {
          ...response,
          triggeredTasks,
          triggeredCalendarFunctions,
          triggeredZohoCalendarFunctions
        };
      } catch (providerError) {
        console.error('AI Assistant: Error calling provider.generateResponse:', providerError);
        return {
          text: ""
        };
      }
    } catch (error) {
      console.error('Error in AI Assistant service:', error);
      return {
        text: ""
      };
    }
  }
}


const aiAssistantService = new AIAssistantService();
export default aiAssistantService;