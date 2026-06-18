import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";

dotenv.config();

const PORT = 3000;

// Lazy initialization of GoogleGenAI
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API endpoint for AI Recruiter Chatbot
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "Invalid messages array" });
        return;
      }

      const client = getGeminiClient();

      const systemInstruction = `
أنت المساعد الذكي والممثل الشخصي للمهندس المعماري المبدع "محمد الحذيفي" (Mohamad Kaid Al-Hudaifi).
هدفه الأساسي هو تقديم نفسه لشركات التوظيف الكبرى، المطورين العقاريين، والعملاء الباحثين عن جودة استثنائية وتصاميم هندسية مبتكرة لا تقارن.
يجب أن تتحدث بثقة عالية، احترافية شديدة، وبأسلوب فخم وراقٍ يعكس الدقة والريادة في التصميم المعماري والتصميم الداخلي.

تفاصيل المهندس محمد الحذيفي المهنية والأكاديمية:
1. الاسم الكامل: محمد الحذيفي (Mohamad Kaid Al-Hudaifi).
2. اللقب والمهنة: مهندس معماري ومصمم داخلي متكامل (VIP Architect & Interior Designer).
3. المؤهل الأكاديمي: بكالوريوس في الهندسة المعمارية من جامعة إب (واحدة من أعرق جامعات اليمن).
4. مشروع التخرج الفائز بنقاط تميز:
   - "تخطيط وتصميم المنطقة الوسطية من قاع الأحذوف - سوق الطاحون وما حوله (رؤية مستقبلية استشرافية لعام 2050)".
   - هذا المشروع يمثل ثورة في فلسفة التخطيط الحضري وتأهيل المدن، وتصميم الفضاءات العامة وإعادة هندسة الأسواق الشعبية لتتحول إلى مراكز ذكية مستدامة تواكب المستقبل.
5. الخبرات المهنية الفذة:
   - مصمم معماري (Architectural Designer): إعداد وتصميم مخططات معمارية وتنفيذية متكاملة (Working Drawings)، تخطيط عمراني متطور، تصميم لاندسكيب (Landscape) والفضاءات العامة والحدائق.
   - مشرف موقعي (Site Supervisor): قيادة الميدان والإشراف الكامل والدقيق على عمليات التنفيذ الإنشائية للمنشآت الهندسية المعقدة، الجسور، الكباري، وهندسة الطرقات، مما يضمن مطابقة التفاميم الهندسية النظرية لروائع الواقع بدقة متناهية وجودة VIP.
6. البرامج الهندسية المحترفة التي يتقنها كأدوات في يده:
   - AutoCAD للتخطيط الهندسي الميكانيكي والدقيق.
   - 3Ds Max و SketchUp للنمذجة ثلاثية الأبعاد المعقدة والتفصيلية.
   - Revit للتصميم الذكي وإدارة مشاريع البناء (BIM).
   - Lumion و Twinmotion للإخراج المعماري (Rendering) والمحاكاة المتحركة والسينمائية فائقة الواقعية.
7. مهارات القوة (Core Powers):
   - دقة التفاصيل المعمارية الاستثنائية والحلول الإبداعية الذكية للمساحات الصعبة.
   - دمج الاستدامة مع الفخامة الحديثة (Eco-luxury).
   - الالتزام الصارم بالوقت والمواعيد (Zero delay policy).
   - التواصل الفعّال والدائم وبناء علاقات قائمة على الإخلاص والموثوقية المطلقة مع العملاء والمستثمرين.
8. معلومات الاتصال الرسمية:
   - البريد الإلكتروني: alqaid694@gmail.com
   - الهاتف والواتساب: 967779240291+
   - الملف الشخصي/البورتفوليو: MohamadKaid/portfolio

قواعد الإجابة للذكاء الاصطناعي:
- أجب باللغة العربية بأسلوب راقٍ، واثق، وعلمي هندسي. وإذا سألك السائل بالإنجليزية فأجب بالإنجليزية مباشرة.
- أظهر مدى تميز محمد مقارنة بالآخرين: "تصاميم مخصصة مدروسة فيزيائياً وجمالياً، دقة هندسية في المخططات التنفيذية تقصي هامش الخطأ في البناء، إدارة مواقع ميدانية تضمن الجودة الفائقة".
- عند سؤاله عن تصاميم هندسية، اعط نصائح معمارية ثرية توحي بعمق فهمه الفني والعملي.
- ادعُ شركات التوظيف دائماً للتواصل مع المهندس محمد مباشرة عبر الواتساب أو البريد الإلكتروني المذكورين.
      `;

      // Structure contents for gemini-3.5-flash
      // Translate messages into Gemini chat format
      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: m.content }],
      }));

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text || "" });
    } catch (err: any) {
      console.error("Gemini API Error in server.ts:", err);
      res.status(500).json({ error: err?.message || "Internal Server Error" });
    }
  });

  // Mock endpoint to deliver structured, high-quality projects metadata to client
  app.get("/api/projects", (req, res) => {
    res.json([
      {
        id: "grad-2050",
        title: "تخطيط وتصميم قاع الأحذوف وسوق الطاحون 2050",
        category: "التخطيط الحضري وتأهيل المدن",
        desc: "رؤية مستقبلية استباقية لعام 2050 لإعادة إحياء وتخطيط المنطقة الوسطية وتحويلها لقطاع مستدام صديق للبيئة يدمج الأصالة بالتكنولوجيا مع الحفاظ على الهوية المعمارية.",
        image: "grad_city", // Will resolve client-side to future_city_2050 template variable
        details: {
          location: "اليمن - قاع الأحذوف",
          area: "420,000 م²",
          scope: "تخطيط إقليمي، تصميم عمراني مستدام، إعادة إحياء الأسواق التاريخية، وتصميم البنية التحتية الذكية.",
          tech: "AutoCAD, Civil 3D, Lumion, SketchUp",
        },
        highlights: [
          "تخفيض الانبعاثات الكربونية بنسبة 40% عبر ممرات المشاة الخضراء",
          "إيجاد حلول جذرية للازدحام المروري وتدفق السلع بسوق الطاحون",
          "دمج التغذية البصرية المعمارية مع الحداثة المستدامة"
        ]
      },
      {
        id: "luxury-villa",
        title: "تصميم داخلي لفيلا سكنية فاخرة (Double Height)",
        category: "التصميم الداخلي والسكني الحديث",
        desc: "فيلا مودرن VIP تركز على الانسيابية البصرية، استخدام الجدران الخرسانية اللوحية الأنيقة المدمجة بالخشب الجوزي الطبيعي الفخم، مع تسليط إضاءة غائرة مدروسة ومطلة بفتحات زجاجية عملاقة على مسبح خارجي متماهٍ مع الأفق.",
        image: "villa_interior",
        details: {
          location: "الخليج العربي (مشروع افتراضي لصالح مطور عقاري)",
          area: "1,200 م²",
          scope: "تفصيل فراغات المعيشة، تصميم الأثاث والمواد مسبقة الصنع، توزيع الإضاءة الذكية والتحكم البيئي الحراري.",
          tech: "3Ds Max, V-Ray, Twinmotion, Photoshop",
        },
        highlights: [
          "مراعاة الخصوصية الكاملة مع الحفاظ على الفتحات الزجاجية الواسعة",
          "اختيار مواد VIP فاخرة تجمع بين صلابة الخرسانة ودفء خشب الجوز",
          "نظام إضاءة مخفية يحاكي حركة الشمس الطبيعية بداخل الفراغ"
        ]
      },
      {
        id: "commercial-hub",
        title: "مجمع تجاري وإداري زجاجي ريادي",
        category: "التصميم المعماري الإبداعي والتنفيذي",
        desc: "مبنى تجاري بملامح مستقبلية يعتمد على هياكل معمارية منحنية ممتدة وحساب دقيق للأحمال الهيكلية مع توفير تفاصيل تنفيذية (Working Drawings) متكاملة تضمن دقة وسرعة الإنشاء.",
        image: "commercial_hub",
        details: {
          location: "المنطقة التجارية الرقمية",
          area: "25,000 م²",
          scope: "إخراج معمار متطور، مخططات تنفيذية إنشائية وصحية وكهربائية كاملة، ومراعاة تدفق حركة الجماهير.",
          tech: "Revit (BIM), AutoCAD, Lumion",
        },
        highlights: [
          "توفير مخططات تنفيذية بدقة 100% لتوفير 15% من ميزانية الهدر الإنشائي",
          "بناء أنظمة تكييف وتهوية طبيعية متكاملة مغطاة بواجهات زجاجية عازلة للحرارة",
          "إطلالات كانتيليفر (Cantilever) بارزة تضفي رونقاً بصرياً فريداً"
        ]
      },
      {
        id: "eco-landscaping",
        title: "مشروع لاندسكيب وتنسيق حديقة عامة تفاعلية",
        category: "تنسيق المواقع والمساحات المفتوحة",
        desc: "تصميم حديقة عامة ذكية تدمج بين الجداول المائية الطبيعية ومناطق الجلوس النحاسية المصمتة، مع استخدام ممرات حجرية جرانيتية ممتصة للحرارة وجلسات دافئة في أوقات الغروب.",
        image: "landscape_park",
        details: {
          location: "المنطقة الوسطى",
          area: "85,000 م²",
          scope: "توزيع المسطحات الخضراء، شبكة تصريف المياه والري الأوتوماتيكية، وتوزيع الإضاءة الخارجية التجميلية.",
          tech: "SketchUp, AutoCAD, Twinmotion",
        },
        highlights: [
          "تنسيق هندسي ذكي لتقليل متطلبات ري المزروعات بنسبة 30%",
          "توزيع مدروس للأكشاك الترفيهية والمناطق الخدمية دون تشويه بصري",
          "إضاءة ليلية ذهبية دافئة تبرز معالم العناصر المادية الخرسانية والنحاسية"
        ]
      }
    ]);
  });

  // Serve static files and setup Vite in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve source assets folder directly as fallback for absolute string paths used in translation configurations
    app.use("/src/assets", express.static(path.join(process.cwd(), "src/assets")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });

  const wss = new WebSocketServer({ server, path: "/api/live-call" });

  wss.on("connection", async (ws) => {
    console.log("Client connected for live voice call");
    let session: any = null;
    try {
      const client = getGeminiClient();
      session = await client.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `
You are the interactive, elite, real-time voice assistant of Architect Mohamad Kaid Al-Hudaifi.
Your goal is to represent Eng. Mohamad to recruiters, prospective clients, and other engineers in a highly sophisticated, professional, and friendly manner.
Eng. Mohamad Al-Hudaifi is a highly competent VIP Architect & Interior Designer who graduated from Ibb University with an Excellent grade (acclaimed thesis: Al-Adhuf and Al-Tahoon 2050 planning project).

Guidelines:
- Match the caller's spoken language fluidly:
  - If they speak Arabic, answer them in fluent, elite, professional Arabic ("الأستاذ الفاضل ... المهندس محمد يرحب بكم ...").
  - If they speak English, answer in flawless, fluent English.
- Be articulate, premium, and concise. Don't speak excessively in one turn (since it's a voice call).
- Highlight Mohamad's unmatchable skills including high-end interior rendering (Lumion & Twinmotion), full production-ready working designs (Revit BIM & AutoCAD), and site execution supervision.
`,
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              ws.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              ws.send(JSON.stringify({ interrupted: true }));
            }
          },
          onclose: () => {
            console.log("Gemini Live session closed");
            ws.close();
          },
          onerror: (err) => {
            console.error("Gemini Live session error:", err);
            ws.send(JSON.stringify({ error: err.message }));
          }
        },
      });

      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.audio) {
            session.sendRealtimeInput({
              audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" }
            });
          }
        } catch (e) {
          console.error("Error parsing user audio on server:", e);
        }
      });

      ws.on("close", () => {
        if (session) {
          session.close();
        }
      });
    } catch (err: any) {
      console.error("Live call handshake failed:", err);
      ws.send(JSON.stringify({ error: "Failed to initialize Live Voice connection: " + err.message }));
      ws.close();
    }
  });
}

startServer();
