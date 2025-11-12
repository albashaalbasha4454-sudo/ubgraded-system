
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, Chat, Part } from '@google/genai';
import type { Product, Invoice, Expense } from '../types';

interface AIChatAssistantProps {
  products: Product[];
  invoices: Invoice[];
  expenses: Expense[];
  lowStockThreshold: number;
  addProduct: (product: Omit<Product, 'id'>) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
}

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    const renderText = () => {
        // 1. Sanitize to prevent XSS
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        // 2. Process block elements (lists)
        html = html.replace(/(?:^\s*\*[ \t].*$\r?\n?)+/gm, (match) => {
            const items = match.trim().split('\n').map(item =>
                `<li>${item.replace(/^\s*\*[ \t]/, '').trim()}</li>`
            ).join('');
            return `<ul class="list-disc list-inside space-y-1 my-2">${items}</ul>`;
        });

        // 3. Process inline elements (bold)
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
        
        // 4. Process paragraphs (wrap remaining lines in <p> tags)
        html = html.split('\n').filter(line => line.trim() !== '').map(line => {
             return line.trim().startsWith('<ul') ? line : `<p>${line}</p>`;
        }).join('');

        return { __html: html };
    };

    return <div className="space-y-2" dangerouslySetInnerHTML={renderText()} />;
};


const ChatInput: React.FC<{ onSend: (text: string) => void, isLoading: boolean }> = ({ onSend, isLoading }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-white rounded-b-lg">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اسأل أو أضف كتابًا..."
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          disabled={isLoading}
          dir="auto"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white p-2 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          disabled={isLoading || !text.trim()}
          aria-label="إرسال"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        </button>
      </div>
    </form>
  );
};

const isWithinLastDays = (dateString: string, days: number) => {
    const date = new Date(dateString);
    const now = new Date();
    const pastDate = new Date();
    pastDate.setDate(now.getDate() - days);
    return date >= pastDate && date <= now;
};

// --- Function Declarations for the AI model ---
const addProductFunctionDeclaration: FunctionDeclaration = {
  name: 'addProduct',
  description: 'إضافة كتاب جديد إلى المخزون',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'عنوان الكتاب' },
      quantity: { type: Type.INTEGER, description: 'الكمية المتوفرة في المخزون' },
      price: { type: Type.NUMBER, description: 'سعر بيع النسخة الواحدة' },
      costPrice: { type: Type.NUMBER, description: 'سعر تكلفة شراء النسخة (اختياري)' },
      author: { type: Type.STRING, description: 'اسم المؤلف (اختياري)' },
      category: { type: Type.STRING, description: 'التصنيف أو القسم (اختياري)' },
    },
    required: ['name', 'quantity', 'price'],
  },
};

const addExpenseFunctionDeclaration: FunctionDeclaration = {
  name: 'addExpense',
  description: 'تسجيل مصروف جديد',
  parameters: {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING, description: 'وصف أو بيان للمصروف' },
      amount: { type: Type.NUMBER, description: 'المبلغ المدفوع' },
      category: { type: Type.STRING, description: 'تصنيف المصروف (اختياري)' },
    },
    required: ['description', 'amount'],
  },
};


const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ products, invoices, expenses, lowStockThreshold, addProduct, addExpense }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<Chat | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);
  
  const generateDataSummary = () => {
    const recentInvoices = invoices.filter(inv => isWithinLastDays(inv.date, 30));
    const totalRecentRevenue = recentInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const recentExpenses = expenses.filter(exp => isWithinLastDays(exp.date, 30));
    const totalRecentExpenses = recentExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= lowStockThreshold).length;
    const outOfStockCount = products.filter(p => p.quantity === 0).length;

    return {
      totalProducts: products.length,
      lowStockCount,
      outOfStockCount,
      totalRecentRevenue: totalRecentRevenue.toFixed(2),
      recentInvoiceCount: recentInvoices.length,
      totalRecentExpenses: totalRecentExpenses.toFixed(2),
      recentExpenseCount: recentExpenses.length,
    };
  };

  const handleSendMessage = async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    const newMessages = [...messages, { role: 'user' as const, content: prompt }];
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);

    try {
      if (!process.env.API_KEY) {
        throw new Error("API key is not configured.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      if (!chatRef.current) {
        const systemInstruction = `
          أنت مساعد ذكي متخصص في تحليل بيانات المكتبات والمحلات التجارية باللغة العربية. 
          مهمتك هي الإجابة على أسئلة المستخدم وأيضاً تنفيذ الأوامر مثل إضافة الكتب والمصروفات باستخدام الأدوات المتاحة.
          عندما تنجح في تنفيذ أمر، قم بتأكيد ذلك للمستخدم بأسلوب ودود.
          استخدم هذه البيانات فقط للإجابة على الأسئلة. 
          كن دقيقًا ومختصرًا. قدم الإجابات باللغة العربية ونسقها جيداً باستخدام الماركداون البسيط.
          إذا كان السؤال غير مرتبط بالبيانات أو الأوامر، أجب بأنك متخصص فقط في تحليل بيانات المتجر.
        `;
        chatRef.current = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: systemInstruction,
            tools: [{ functionDeclarations: [addProductFunctionDeclaration, addExpenseFunctionDeclaration] }],
          },
        });
      }
      
      const dataContext = `
          سياق البيانات الحالي (لا تعرضه للمستخدم):
          - ملخص آخر 30 يومًا: ${JSON.stringify(generateDataSummary())}
          - أحدث 50 فاتورة: ${JSON.stringify(invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50))}
          - أحدث 50 مصروف: ${JSON.stringify(expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50))}
      `;

      let response = await chatRef.current.sendMessage({ message: `${prompt}\n\n${dataContext}` });

      while(response.functionCalls && response.functionCalls.length > 0) {
        const functionResponseParts: Part[] = [];
        for (const funcCall of response.functionCalls) {
            let result;
            try {
                if (funcCall.name === 'addProduct') {
                    const args = funcCall.args as Omit<Product, 'id'>;
                    addProduct(args);
                    result = { success: true, message: `تمت إضافة الكتاب ${args.name} بنجاح.` };
                } else if (funcCall.name === 'addExpense') {
                    const args = funcCall.args as Omit<Expense, 'id'>;
                    const expenseData = { ...args, date: new Date().toISOString() };
                    addExpense(expenseData);
                    result = { success: true, message: `تم تسجيل المصروف ${args.description} بنجاح.` };
                } else {
                    throw new Error(`Function ${funcCall.name} not found.`);
                }
            } catch (e) {
                result = { success: false, message: e instanceof Error ? e.message : 'Unknown error' };
            }
            
            functionResponseParts.push({
                functionResponse: {
                    name: funcCall.name,
                    response: result,
                },
            });
        }
        
        // FIX: The `sendMessage` method expects an object with a `message` property for sending structured data like function responses, not `parts`.
        response = await chatRef.current.sendMessage({ message: functionResponseParts });
      }

      const text = response.text;
      setMessages(prev => [...prev, { role: 'model', content: text }]);

    } catch (err) {
      console.error(err);
      setError('عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى لاحقاً.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 end-4 w-full max-w-md h-[70vh] max-h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col transition-transform transform-gpu animate-[slide-up_0.3s_ease-out]">
          <header className="flex items-center justify-between p-4 bg-gray-800 text-white rounded-t-lg flex-shrink-0">
            <h3 className="font-bold text-lg">المساعد الذكي</h3>
            <button onClick={() => setIsOpen(false)} className="hover:bg-gray-700 rounded-full p-1 transition-colors" aria-label="إغلاق">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>
          <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-100">
            {messages.length === 0 && !isLoading && (
                 <div className="flex justify-start">
                    <div className="max-w-full p-3 rounded-xl bg-gray-200 text-gray-800 space-y-3 animate-[fade-in_0.5s_ease-out]">
                        <p className="font-semibold">أهلاً بك! يمكنك سؤالي أو إعطائي أوامر مثل:</p>
                        <div className="flex flex-col items-start gap-2">
                            <button onClick={() => handleSendMessage('ما هو الكتاب الأكثر مبيعاً؟')} className="text-blue-600 hover:underline text-sm text-right">"ما هو الكتاب الأكثر مبيعاً؟"</button>
                            <button onClick={() => handleSendMessage("أضف كتاب 'المحاسبة للجميع' سعره 120 والكمية 15")} className="text-blue-600 hover:underline text-sm text-right">"أضف كتاب 'المحاسبة للجميع' سعره 120 والكمية 15"</button>
                            <button onClick={() => handleSendMessage("سجل مصروف 'فاتورة كهرباء' بقيمة 300")} className="text-blue-600 hover:underline text-sm text-right">"سجل مصروف 'فاتورة كهرباء' بقيمة 300"</button>
                        </div>
                    </div>
                </div>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fade-in_0.5s_ease-out]`}>
                <div className={`max-w-[85%] p-3 rounded-xl shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}`}>
                  {msg.role === 'model' ? <SimpleMarkdown text={msg.content} /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-[fade-in_0.5s_ease-out]">
                  <div className="max-w-[80%] p-3 rounded-xl bg-white text-gray-800 shadow-sm">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                         <span>المساعد يعمل...</span>
                         <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                         <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></span>
                         <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></span>
                      </div>
                  </div>
              </div>
            )}
            {error && (
                <div className="p-3 rounded-xl bg-red-100 text-red-700 border border-red-200 animate-[fade-in_0.5s_ease-out]">
                  <p>{error}</p>
                </div>
            )}
          </div>
          <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 end-6 w-16 h-16 bg-gray-800 text-white rounded-full shadow-lg flex items-center justify-center z-50 hover:bg-gray-900 transition-all transform hover:scale-110"
        aria-label="افتح المساعد الذكي"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
      </button>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default AIChatAssistant;
