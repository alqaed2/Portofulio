import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { MessageSquare, Send, Sparkles, User, HelpCircle, Loader2, RefreshCw } from "lucide-react";
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
        <button
          id="btn-reset-chat"
          onClick={resetChat}
          className="p-1 px-2.5 rounded border border-zinc-800 hover:border-gold-500/30 text-xs font-mono text-zinc-400 hover:text-gold-400 transition flex items-center gap-1.5 cursor-pointer"
          title={isRtl ? "إعادة بدء المقابلة" : "Reset chat interview"}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{isRtl ? "إعادة ضبط" : "Reset"}</span>
        </button>

        <div className={`flex items-center gap-3 ${isRtl ? "text-right flex-row-reverse" : "text-left flex-row"}`}>
          <div className={isRtl ? "text-right" : "text-left"}>
            <h4 className={`font-display font-medium text-white text-sm sm:text-base flex items-center gap-1.5 ${isRtl ? "justify-end flex-row-reverse" : "justify-start flex-row"}`}>
              <span className="text-[11px] bg-gold-400/10 text-gold-400 px-2 py-0.5 rounded font-mono border border-gold-500/20">AGENT AVATAR</span>
              <span>{isRtl ? "المستشار الاستشاري الذكي" : "Smart CAD Counsel"}</span>
            </h4>
            <p className="text-[10px] sm:text-xs text-zinc-400 font-mono">POWERED BY GEMINI 2.0 & BIM DATA</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-gold-400 p-[1px]">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-gold-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

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

    </div>
  );
}
