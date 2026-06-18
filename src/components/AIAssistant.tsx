import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { MessageSquare, Send, Sparkles, User, HelpCircle, Loader2, RefreshCw, Phone, PhoneOff, Mic, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage } from "../types";
import { APP_TRANSLATIONS } from "../translations";

export default function AIAssistant({ lang }: { lang: "ar" | "en" }) {
  const t = APP_TRANSLATIONS[lang];

  // Suggestions depending on language
  const suggestionsAr = [
    { text: "كيف تميزت رؤية سوق الطاحون 2050؟", prompt: "وضّح لي فلسفتك وإبداعك الهندسي في تصميم وتخطيط مشروع التخرج سوق الطاحون وقاع الأحذوف رؤية هادفة لعام 2050؟" },
    { text: "ما الذي يميزك عن بقية المهندسين؟", prompt: "ما هي نقاط القوة والمهارات الاستثنائية التي تجعل المهندس محمد خياراً لا يقارن لشركات التطوير العقاري الكبرى؟" },
    { text: "ما هي خبرات الإشراف الموقعي لديك؟", prompt: "أخبرني بالتفصيل عن خبرتك الإشرافية الميدانية في الجسور والموقع الإنشائي والكباري والطرق وكيف تضمن الجودة القصوى؟" },
    { text: "ما هي التطبيقات الهندسية المفضلة لك؟", prompt: "ما هي أدواتك المفضلة وسير العمل لتصميم وإخراج المشاريع المعمارية ثلاثية الأبعاد الفاخرة وما أهمية استخدام Revit و Lumion؟" },
  ];

  const suggestionsEn = [
    { text: "How is the 2050 plan special?", prompt: "Explain the philosophy and master planning design for your thesis project: Al-Adhuf and Al-Tahoon 2050 masterplan." },
    { text: "What makes your skills unmatchable?", prompt: "What are the unmatchable skills and qualities that make Eng. Mohamad Al-Hudaifi a perfect choice for leading developers?" },
    { text: "What about your bridge supervision?", prompt: "Tell me in detail about your hands-on construction site and highway bridge supervision experience." },
    { text: "Which software workflows do you prefer?", prompt: "Tell me about your preferred software workflows and the importance of Revit (BIM) and AutoCAD." },
  ];

  const suggestions = lang === "ar" ? suggestionsAr : suggestionsEn;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Live Voice API Connection State and Refs
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"connecting" | "ready" | "speaking" | "listening" | "error">("connecting");
  const [voiceError, setVoiceError] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const audioInputCtxRef = useRef<AudioContext | null>(null);
  const audioOutputCtxRef = useRef<AudioContext | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);

  // Auto clean audio processes on component unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch(e){}
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (micProcessorRef.current) {
        micProcessorRef.current.disconnect();
      }
      if (audioInputCtxRef.current) {
        try { audioInputCtxRef.current.close(); } catch(e){}
      }
      if (audioOutputCtxRef.current) {
        try { audioOutputCtxRef.current.close(); } catch(e){}
      }
    };
  }, []);

  const playVoiceAudioChunk = (base64Audio: string) => {
    const outputCtx = audioOutputCtxRef.current;
    if (!outputCtx) return;

    if (outputCtx.state === "suspended") {
      outputCtx.resume();
    }

    // Convert base64 PCM back to Float32 sample values
    const binary = window.atob(base64Audio);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const floats = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      floats[i] = int16Array[i] / 32768;
    }

    if (floats.length === 0) return;

    const buffer = outputCtx.createBuffer(1, floats.length, 24000); // 24kHz output
    buffer.getChannelData(0).set(floats);

    const source = outputCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(outputCtx.destination);

    const currentTime = outputCtx.currentTime;
    if (nextStartTimeRef.current < currentTime) {
      nextStartTimeRef.current = currentTime + 0.05;
    }

    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;

    audioQueueRef.current.push(source);
    
    source.onended = () => {
      const idx = audioQueueRef.current.indexOf(source);
      if (idx > -1) {
        audioQueueRef.current.splice(idx, 1);
      }
      if (audioQueueRef.current.length === 0) {
        setVoiceStatus("listening");
      }
    };
  };

  const stopVoiceAudioPlayer = () => {
    audioQueueRef.current.forEach((src) => {
      try { src.stop(); } catch (e) {}
    });
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
  };

  const endVoiceCall = () => {
    // 1. Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        try { wsRef.current.close(); } catch(e){}
      }
      wsRef.current = null;
    }

    // 2. Stop mic capture stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    // 3. Disconnect processor
    if (micProcessorRef.current) {
      try { micProcessorRef.current.disconnect(); } catch(e){}
      micProcessorRef.current = null;
    }

    // 4. Close audio contexts
    if (audioInputCtxRef.current) {
      try { audioInputCtxRef.current.close(); } catch(e){}
      audioInputCtxRef.current = null;
    }
    if (audioOutputCtxRef.current) {
      try { audioOutputCtxRef.current.close(); } catch(e){}
      audioOutputCtxRef.current = null;
    }

    // 5. Clear schedules
    stopVoiceAudioPlayer();

    setIsVoiceActive(false);
  };

  const startVoiceCall = async () => {
    setIsVoiceActive(true);
    setVoiceStatus("connecting");
    setVoiceError("");
    nextStartTimeRef.current = 0;

    try {
      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // 2. Compute location connection url with proper protocol transition
      const isHttps = window.location.protocol === "https:";
      const wsUrl = `${isHttps ? "wss" : "ws"}://${window.location.host}/api/live-call`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setVoiceStatus("ready");

        // 3. Instantiate low-latency AudioContext instances
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioInputCtxRef.current = inputCtx;
        audioOutputCtxRef.current = outputCtx;

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        micProcessorRef.current = processor;

        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const channelData = e.inputBuffer.getChannelData(0);
            
            // Convert Float32 data to PCM 16-Bit ArrayBuffer
            const buffer = new ArrayBuffer(channelData.length * 2);
            const view = new DataView(buffer);
            for (let i = 0; i < channelData.length; i++) {
              const sample = Math.max(-1, Math.min(1, channelData[i]));
              view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            }

            // Encode ArrayBuffer into base64 for transmission
            let binary = "";
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let j = 0; j < len; j++) {
              binary += String.fromCharCode(bytes[j]);
            }
            const base64 = window.btoa(binary);

            ws.send(JSON.stringify({ audio: base64 }));
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.error) {
            setVoiceError(msg.error);
            setVoiceStatus("error");
            endVoiceCall();
            return;
          }

          if (msg.interrupted) {
            // Cancel current speaker buffers instantly
            stopVoiceAudioPlayer();
            setVoiceStatus("listening");
            return;
          }

          if (msg.audio) {
            setVoiceStatus("speaking");
            playVoiceAudioChunk(msg.audio);
          }
        } catch (e) {
          console.error("Failed to parsed voice socket chunk:", e);
        }
      };

      ws.onerror = () => {
        setVoiceError(lang === "ar" ? "تعذر الاستجابة مع الخادم الصوتي." : "Could not synchronize with the voice portal.");
        setVoiceStatus("error");
      };

      ws.onclose = () => {
        endVoiceCall();
      };

    } catch (err: any) {
      console.error("Live call initialization error:", err);
      setVoiceError(lang === "ar" ? "فشل تفعيل الميكروفون. يرجى تفعيل الصلاحية والمحاولة." : "Could not activate microphone. Please grant core permissions.");
      setVoiceStatus("error");
    }
  };

  // Set initial welcome message depending on language
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: t.aiWelcome,
        timestamp: new Date().toLocaleTimeString(lang === "ar" ? "ar-YE" : "en-US", { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  }, [lang]);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString(lang === "ar" ? "ar-YE" : "en-US", { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!res.ok) {
        throw new Error("Failed to communicate with portfolio server");
      }

      const data = await res.json();
      
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "assistant",
        content: data.text || (lang === "ar" ? "أعتذر، حدث خلل أثناء الاتصال بالخادم. يرجى إعادة المحاولة." : "Pardon, a communication error occurred. Please try again."),
        timestamp: new Date().toLocaleTimeString(lang === "ar" ? "ar-YE" : "en-US", { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      
      // Standby offline answers to keep the beautiful high-end aesthetic robust
      setTimeout(() => {
        let fallbackText = lang === "ar" 
          ? "أعتذر، يبدو أن مفتاح ومستشعر الذكاء الاصطناعي يستعدان للنهوض. كبديل فوري كلي الثقة: المهندس محمد الحذيفي متاح دائماً للتواصل المباشر والتوظيف المباشر عبر البريد الإلكتروني: alqaid694@gmail.com أو الواتساب: 967779240291+ لمناقشة شراكات التنمية العقارية الفاخرة لشركتكم."
          : "Pardon, the AI engine is currently on standby calibrating. As a direct offline channel of absolute confidence, Eng. Mohamad Al-Hudaifi is readily available for contracts / recruitment via email: alqaid694@gmail.com or WhatsApp: +967779240291.";
        
        const lowerText = textToSend.toLowerCase();
        if (lowerText.includes("طاحون") || lowerText.includes("الأحذوف") || lowerText.includes("2050") || lowerText.includes("plan") || lowerText.includes("thesis")) {
          fallbackText = lang === "ar"
            ? "مشروع تخرج المهندس محمد الحذيفي (تخطيط وتصميم قاع الأحذوف وسوق الطاحون ورؤية 2050 المستقبلية بجامعة إب بتقدير ممتاز تمثيلي) يرتكز على دمج الطراز التقليدي مع التنمية المستدامة، حيث تمت هيكلة الأسواق لتضم مسارات خلوية ونظم فلترة بيئية متكاملة، وحل مشكلات الازدحامات والمرافق العامة مع عرض محاكاة 3D سينمائية مبهرة جداً تبرز دقة وجودة مخرجاته الهندسية."
            : "Eng. Mohamad Al-Hudaifi's academic thesis (Urban Reclamation of Al-Adhuf and Al-Tahoon 2050, earning an Excellent representative grade from Ibb University) integrates regional Yemeni tradition with modern climate-resilience. The grid features optimized pedestrian flow, automated market distribution zones, sustainable materials, and cinematic 3D simulations that present flawless design resolution.";
        } else if (lowerText.includes("تميز") || lowerText.includes("مقارن") || lowerText.includes("قوة") || lowerText.includes("unmatch") || lowerText.includes("skills")) {
          fallbackText = lang === "ar"
            ? "يتميز المهندس محمد الحذيفي بدمجه الفذ بين التصميم المعماري الإبداعي الفخم والتخطيط الدقيق (باستخدام Revit و AutoCAD و 3Ds Max) وبين القدرة الميدانية الصارمة على الإشراف الموقعي في مشاريع البنية التحتية والمنشآت والجسور، مما يعطيه تفوقاً شاسعاً لفهم متطلبات التنفيذ وتقليل هدر الكلفة بنسبة 15%."
            : "Eng. Mohamad is distinguished by his rare dual-mastery of creative luxurious architectural/interior designs (using Revit BIM, AutoCAD, and 3Ds Max) and his rigid on-site infrastructure supervision. This mitigates design slips and guarantees at least 15% budget protection through immaculate engineering documentation.";
        } else if (lowerText.includes("موقعي") || lowerText.includes("إشراف") || lowerText.includes("جسور") || lowerText.includes("bridge") || lowerText.includes("site") || lowerText.includes("conduc")) {
          fallbackText = lang === "ar"
            ? "عمل المهندس محمد كمشرف موقعي على تنفيذ أعمال المنشآت الهندسية والجسور والكباري والطرق، حيث أدار مطابقة التصاميم وضمان جودة الخرسانة واختبارات التربة وحساب الكميات بدقة VIP لا تسمح بأي أخطاء تنفيذية وتضمن سلامة واستدامة المنشأة هندسياً."
            : "As an on-site supervisor for complex highway projects, bridges, and pipelines, Mohamad directed quality audits, reinforcement spacer alignment, fresh concrete mix validation, and level checks. This guarantees the executed asset perfectly conforms to structural formulas without margin for site mistakes.";
        }

        const assistantMsg: ChatMessage = {
          id: Math.random().toString(),
          role: "assistant",
          content: fallbackText,
          timestamp: new Date().toLocaleTimeString(lang === "ar" ? "ar-YE" : "en-US", { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }, 800);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage(input);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: Math.random().toString(),
        role: "assistant",
        content: t.aiWelcome,
        timestamp: new Date().toLocaleTimeString(lang === "ar" ? "ar-YE" : "en-US", { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const isRtl = lang === "ar";

  return (
    <div id="ai-interviewer-widget" className="relative flex flex-col h-[580px] luxury-glass rounded-2xl border border-gold-500/20 shadow-2xl overflow-hidden">
      
      {/* Golden Highlight Border Trim */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400 to-transparent" />

      {/* Header Panel */}
      <div className={`flex justify-between items-center bg-black/60 px-5 py-4 border-b border-zinc-800 ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
        <div className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
          <button
            id="btn-reset-chat"
            onClick={resetChat}
            disabled={isVoiceActive}
            className={`p-1 px-2.5 rounded border border-zinc-800 hover:border-gold-500/30 text-xs font-mono text-zinc-400 hover:text-gold-400 transition flex items-center gap-1.5 cursor-pointer ${isVoiceActive ? "opacity-50 cursor-not-allowed" : ""}`}
            title={isRtl ? "إعادة بدء المقابلة" : "Reset chat interview"}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isRtl ? "إعادة ضبط" : "Reset"}</span>
          </button>

          {!isVoiceActive ? (
            <button
              id="btn-voice-call"
              onClick={startVoiceCall}
              className="p-1 px-2.5 rounded border border-gold-500/30 bg-gold-400/5 hover:bg-gold-400/10 text-xs font-mono text-gold-400 hover:text-gold-300 transition flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(175,134,41,0.15)] animate-pulse"
              title={isRtl ? "مكالمة صوتية مباشرة" : "Call Voice Agent live"}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{isRtl ? "مكالمة صوتية" : "Live Call"}</span>
            </button>
          ) : (
            <button
              id="btn-voice-call"
              onClick={endVoiceCall}
              className="p-1 px-2.5 rounded border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-xs font-mono text-red-400 hover:text-red-300 transition flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              title={isRtl ? "إنهاء المكالمة" : "Disconnect call"}
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>{isRtl ? "إنهاء المكالمة" : "End Call"}</span>
            </button>
          )}
        </div>

        <div className={`flex items-center gap-3 ${isRtl ? "text-right flex-row-reverse" : "text-left flex-row"}`}>
          <div className={isRtl ? "text-right" : "text-left"}>
            <h4 className={`font-display font-medium text-white text-sm sm:text-base flex items-center gap-1.5 ${isRtl ? "justify-end flex-row-reverse" : "justify-start flex-row"}`}>
              <span className="text-[11px] bg-gold-400/10 text-gold-400 px-2 py-0.5 rounded font-mono border border-gold-500/20">AGENT AVATAR</span>
              <span>{isRtl ? "المستشار الاستشاري الذكي" : "Smart CAD Counsel"}</span>
            </h4>
            <p className="text-[10px] sm:text-xs text-zinc-400 font-mono">POWERED BY GEMINI 3.1 & BIM DATA</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-gold-400 p-[1px]">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-gold-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {isVoiceActive ? (
        /* Real-Time Live Voice Controller Panel Overlay */
        <div className="flex-1 flex flex-col justify-center items-center p-6 space-y-6 bg-[#090a0f]/95 backdrop-blur-md relative blueprint-grid">
          
          {/* Animated Glowing Ring & Visualizer Core */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            <motion.div
              animate={{
                scale: voiceStatus === "speaking" ? [1, 1.25, 1] : [1, 1.08, 1],
                opacity: voiceStatus === "speaking" ? [0.15, 0.45, 0.15] : [0.05, 0.15, 0.05],
              }}
              transition={{
                repeat: Infinity,
                duration: voiceStatus === "speaking" ? 1.4 : 3.2,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full bg-gold-400/20 border border-gold-500/10"
            />
            <motion.div
              animate={{
                scale: voiceStatus === "speaking" ? [1, 1.45, 1] : [1, 1.15, 1],
                opacity: voiceStatus === "speaking" ? [0.08, 0.28, 0.08] : [0.02, 0.08, 0.02],
              }}
              transition={{
                repeat: Infinity,
                duration: voiceStatus === "speaking" ? 1.7 : 3.8,
                ease: "easeInOut"
              }}
              className="absolute inset-[-20px] rounded-full bg-amber-500/10 border border-amber-600/5"
            />

            <div className="w-28 h-28 rounded-full bg-zinc-950 border-2 border-gold-400/30 shadow-[0_0_30px_rgba(175,134,41,0.15)] flex flex-col items-center justify-center space-y-2 z-10">
              {voiceStatus === "speaking" ? (
                <Volume2 className="w-8 h-8 text-gold-400 animate-bounce" />
              ) : voiceStatus === "listening" || voiceStatus === "ready" ? (
                <Mic className="w-8 h-8 text-gold-400 animate-pulse" />
              ) : voiceStatus === "connecting" ? (
                <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
              ) : (
                <PhoneOff className="w-8 h-8 text-red-500" />
              )}
            </div>
          </div>

          {/* Connection Status Label */}
          <div className="text-center space-y-2 z-10 max-w-sm">
            <h4 className="font-display font-medium text-white text-base sm:text-lg">
              {voiceStatus === "connecting" && (isRtl ? "جاري إنشاء الاتصال الصوتي الآمن..." : "Initializing secure voice channel...")}
              {voiceStatus === "ready" && (isRtl ? "الاتصال نشط. يمكنك البدء في الحديث" : "Connected. Speak whenever ready...")}
              {voiceStatus === "listening" && (isRtl ? "نصغي إليك ميكروفونياً... تحدث الآن" : "Listening... Speak now")}
              {voiceStatus === "speaking" && (isRtl ? "المستشار يتحدث إليك..." : "Counsel is speaking...")}
              {voiceStatus === "error" && (isRtl ? "تعذر تفعيل الاتصال" : "Voice Connection Failed")}
            </h4>
            <p className="text-[11px] sm:text-xs text-zinc-400 max-w-[320px] mx-auto leading-relaxed">
              {voiceStatus === "error" ? voiceError : (isRtl ? "مكالمة صوتية ثنائية الاتجاه وفورية تعتمد على نموذج ذكاء اصطناعي فائق الاستجابة لمناقشة بورتفوليو وإمكانيات المهندس محمد." : "Enjoy a bi-directional, hands-free spoken dialogue powered by custom low-latency synthesis directly representing Mohamad's work.")}
            </p>
          </div>

          {/* Voice active equalizing waveforms */}
          <div className="flex justify-center items-center gap-1.5 h-10 z-10">
            {[...Array(12)].map((_, idx) => (
              <motion.div
                key={idx}
                animate={{
                  height: voiceStatus === "speaking"
                    ? [8, Math.random() * 32 + 12, 8]
                    : voiceStatus === "listening"
                    ? [8, Math.random() * 16 + 8, 8]
                    : [6, 6, 6]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.35 + idx * 0.05,
                  ease: "easeInOut"
                }}
                className={`w-1 rounded-full ${voiceStatus === "speaking" ? "bg-gold-500" : "bg-zinc-700"}`}
              />
            ))}
          </div>

          {/* Hang-Up Button */}
          <button
            id="btn-voice-hangup"
            onClick={endVoiceCall}
            className="px-6 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold flex items-center gap-2 transition duration-200 cursor-pointer shadow-[0_4px_15px_rgba(220,38,38,0.3)] z-10"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>{isRtl ? "قطع الاتصال" : "Disconnect Call"}</span>
          </button>
        </div>
      ) : (
        /* Regular Multi-Turn Chat messages component */
        <>
          {/* Chat Messages Body */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 blueprint-grid"
          >
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3 max-w-[85%] ${isUser ? (isRtl ? "mr-auto flex-row-reverse" : "ml-auto flex-row") : (isRtl ? "ml-auto flex-row-reverse" : "mr-auto flex-row")}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border z-10 ${
                      isUser 
                        ? "bg-zinc-800 border-zinc-700 text-white" 
                        : "bg-gold-500/10 border-gold-500/30 text-gold-400"
                    }`}>
                      {isUser ? <User className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                    </div>

                    {/* Message bubble */}
                    <div className="space-y-1">
                      <div className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed relative shadow-md ${isRtl ? "text-right" : "text-left"} ${
                        isUser
                          ? "bg-gradient-to-bl from-zinc-800 to-zinc-900 border border-zinc-700 text-zinc-100 rounded-tr-none"
                          : "bg-gradient-to-br from-[#12141c] to-[#1a1c27] border border-gold-500/15 text-zinc-200 rounded-tl-none"
                      }`}>
                        <p className="whitespace-pre-line font-sans">{m.content}</p>
                      </div>
                      <div className={`text-[9px] text-zinc-500 font-mono px-1 col-span-1 ${isUser ? (isRtl ? "text-left" : "text-right") : (isRtl ? "text-right" : "text-left")}`}>
                        {m.timestamp}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex gap-3 max-w-[85%] items-center ${isRtl ? "ml-auto" : "mr-auto"}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                  </div>
                  <div className="bg-[#12141c] border border-gold-500/10 p-3 rounded-2xl rounded-tl-none text-xs text-zinc-400 flex items-center gap-2 font-mono">
                    <span>{isRtl ? "يتم استجماع الأنماط الهندسية وتحليل المعايير..." : "Assembling structural frameworks & evaluating specs..."}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Suggested chips panel */}
          <div className={`px-4 py-2 border-t border-zinc-800 bg-black/40 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-thin ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
            <HelpCircle className="w-4 h-4 text-gold-400 shrink-0" />
            <div className={`flex gap-2 ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
              {suggestions.map((s, index) => (
                <button
                  key={index}
                  id={`chat-suggestion-${index}`}
                  onClick={() => handleSendMessage(s.prompt)}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 hover:border-gold-500/50 text-zinc-300 hover:text-gold-200 transition-all cursor-pointer font-sans"
                >
                  {s.text}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input form footer */}
          <div className={`p-4 bg-zinc-950 border-t border-zinc-800 flex gap-2 ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
            <input
              id="chat-user-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t.aiUserPlaceholder}
              className={`flex-1 bg-black text-white border border-zinc-800 rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-gold-500 font-sans ${isRtl ? "text-right" : "text-left"}`}
            />
            <button
              id="btn-chat-send"
              onClick={() => handleSendMessage(input)}
              disabled={!input.trim() || isLoading}
              className={`px-4 bg-gold-500 hover:bg-gold-400 text-black font-semibold rounded-xl flex items-center justify-center transition-all cursor-pointer ${(!input.trim() || isLoading) ? "opacity-50 cursor-not-allowed" : "shadow-[0_0_15px_rgba(175,134,41,0.35)]"}`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

    </div>
  );
}
