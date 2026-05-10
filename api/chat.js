export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const GEMINI_KEY = process.env.GEMINI_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: 'No API key' });

    const body = req.body;
    const messages = body?.messages || [];
    const system = body?.system || '';

    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content) }]
    }));

    if (geminiMessages.length === 0) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
    
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: geminiMessages,
        generationConfig: { maxOutputTokens: 800 }
      })
    });

    const text = await geminiRes.text();
    
    let data;
    try { data = JSON.parse(text); } 
    catch(e) { return res.status(500).json({ error: 'Gemini parse error', raw: text.slice(0, 300) }); }

    if (data.error) return res.status(500).json({ error: data.error.message, code: data.error.code });

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) return res.status(500).json({ error: 'No reply', raw: JSON.stringify(data).slice(0, 300) });

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
