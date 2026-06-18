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
أنت المساعد الذكي والممثل الشخصي للمهندس المعماري المبدع "محمد الحذيفي" (Mohammed Al-Hothaifi).
هدفه الأساسي هو تقديم نفسه لشركات التوظيف الكبرى، المطورين العقاريين، والعملاء الباحثين عن جودة استثنائية وتصاميم هندسية مبتكرة لا تقارن.
يجب أن تتحدث بثقة عالية، احترافية شديدة، وبأسلوب فخم وراقٍ يعكس الدقة والريادة في التصميم المعماري والتصميم الداخلي.

تفاصيل المهندس محمد الحذيفي المهنية والأكاديمية:
1. الاسم الكامل: محمد الحذيفي (Mohammed Al-Hothaifi).
2. اللقب والمهنة: مهندس معماري ومصمم داخلي متكامل (VIP Architect & Interior Designer).
3. المؤهل الأكاديمي: بكالوريوس في الهندسة المعمارية من جامعة إب (واحدة من أعرق جامعات اليمن).
4. مشروع التخرج الفائز بنقاط تميز:
   - "تخطيط وتصميم المنطقة الوسطية من قاع الأحذوف - سوق الطاحون وما حوله (رؤية مستقبلية استشرافية لعام 2050)".
   - هذا المشروع يمثل ثورة في فلسفة التخطيط الحضري وتأهيل المدن، وتصميم الفضاءات العامة وإعادة هندسة الأسواق الشعبية لتتحول إلى مراكز ذكية مستدامة تواكب المستقبل.
5. الخبرات المهنية الفذة:
   - مصمم معماري (Architectural Designer): إعداد وتصميم مخططات معمارية وتنفيذية متكاملة (Working Drawings)، تخطيط عمراني متطور، تصميم لاندسكيب (Landscape) والفضاءات العامة والحدائق.
   - مشرف موقعي (Site Supervisor): قيادة الميدان والإشراف الكامل والدقيق على عمليات التنفيذ الإنشائية للمنشآت الهندسية المعقدة، الجسور, الكباري، وهندسة الطرقات، مما يضمن مطابقة التفاميم الهندسية النظرية لروائع الواقع بدقة متناهية وجودة VIP.
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
   - الملف الشخصي/البورتفوليو: Mohammed-Al-Hothaifi/portfolio

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
        image: "grad_city",
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
أنت المساعد الصوتي التفاعلي الذكي والراقي، والممثل والناطق الرسمي لمكتب المهندس محمد الحذيفي للاستشارات الهندسية والتصميم المعماري والديكور.
العميل يتصل بك الآن في مكالمة صوتية هاتفية مباشرة. هويتك هي واجهة المكتب الهندسية المعبرة عن الاحترافية العالية والدقة الفائقة والذكاء المطلق.

قواعد الترحيب والتفاعل المتنوع والذكي لتفادي النمطية (concise, modern and highly professional):
- تجنب المبالغة المفرطة في الترحيب والعبارات الطويلة أو المملة. يجب أن يكون الترحيب رسمياً وموجزاً للغاية، ذكياً وجذاباً يدعو للارتياح.
- استخدم تملقاً مهنياً ناعماً ومحترفاً في أسلوب الحوار (مثل: "يسعدنا ويشرفنا تواصلك"، "تفضل يا فندم كيف يمكنني خدمتك؟"، "هل تبحث عن استشارة هندسية أو تصميم لمشروعك؟").
- عند الاتصال، سيبدأ النظام مباشرة بإطلاق ترحيب أولي رسمي ومختصر، وعليك مواصلة التحدث بنبرة ترحيبية رصينة ومريحة للغاية ومباشرة.
- احرص على استخدام الاسم والتخصص بدقة: "مكتب المهندس محمد الحذيفي للاستشارات الهندسية والتصميم المعماري والديكور".

إرشادات وقواعد الاتصال:
- الترحيب الأولي والتفاعل يجب أن يكونا بالفصحى الحديثة والموجزة أو لهجة بيضاء محترفة وراقية تناسب العملاء الكرام.
- إذا تحدث العميل بالإنجليزية، انتقل بسلاسة وتحدث معه بإنجليزية طليقة ومحترفة.
- كن ذكياً ومختصراً للغاية وعملياً في كل مشاركة لتفادي إطالة الحديث دون داعٍ وتفادي النمطية الآلية.
- بمجرد استفسار العميل، ابرز له باحترافية موجزة خبرات المهندس محمد في:
  1. إعداد المخططات والرسومات التنفيذية التفصيلية (Working Drawings/BIM) باستخدام Revit و AutoCAD لإلغاء أي هامش للخطأ في مواقع العمل والمشاريع.
  2. تقديم تصاميم ثلاثية الأبعاد فخمة جداً (Luxury Architectural & Interior Design) بدمج 3Ds Max و SketchUp والإخراج الفني الواقعي والسينمائي بـ Lumion.
  3. الإشراف الميداني القيادي لمطابقة ومواءمة المخططات الهندسية مع تفاصيل الواقع الإنشائي بدقة متناهية.
- في نهاية المحادثة، ادع العميل بلطف للتواصل المباشر مع المهندس محمد شخصياً عبر أيقونات الواتساب الرسمية أو البريد الإلكتروني في نهاية الصفحة.
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

      // Randomized formal, concise, modern greetings to keep call natural and professional
      const poolOfGreetings = [
        "مكتب المهندس محمد الحذيفي يرحب بكم. تفضل عزيزي، كيف يمكنني خدمتك اليوم؟ هل لديك استشارة هندسية أو فكرة تصميم ترغب في مناقشتها؟",
        "أهلاً بك في مكتب المهندس محمد الحذيفي للاستشارات الهندسية والتصميم المعماري والديكور. يسعدني تواصلك الكريم؛ تفضل يا فندم، كيف يمكنني مساعدتك اليوم؟",
        "مرحباً بك مع المساعد الذكي لمكتب المهندس محمد الحذيفي. يشرفنا اتصالك؛ هل تود الاستفسار عن استشارة هندسية أو تصميم مشروع عقاري معين؟ تفضل بطلبك.",
        "يسعد مكتب المهندس محمد الحذيفي للاستشارات الهندسية والتصميم المعماري بتلقي اتصالك الكريم. تفضل عزيزي، كيف يمكننا خدمتك ومساعدتك في نجاح مشروعك المعماري والديكور؟",
        "مرحباً بك. أنت متصل بمكتب المهندس محمد الحذيفي للاستشارات المعمارية والهندسية والتصميم الداخلي. يسعدنا جداً تواصلك؛ تفضل، كيف نستطيع تقديم الخدمة والاستشارة الهندسية لك اليوم؟"
      ];
      const randomGreeting = poolOfGreetings[Math.floor(Math.random() * poolOfGreetings.length)];

      session.sendRealtimeInput({
        text: randomGreeting + " (ابدأ المكالمة مباشرة بهذه العبارة الترحيبية المختصرة بأسلوب رائق وجذاب ونبرة صوت دافئة ومتمكنة تناسب الحوار المهني الراقي للغاية)",
        endOfTurn: true
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
