import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const count = parseInt(searchParams.get('count') || '10');

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const prompt = `Du är en expert på Högskoleprovet (HP) i Sverige. Din uppgift är att generera ${count} helt nya ord-frågor i exakt samma stil och svårighetsgrad som ORD-delen på HP.

Regler:
1. Välj ovanliga men riktiga svenska ord (substantiv, verb, adjektiv, adverb).
2. Orden ska INTE vara vanliga vardagsord utan mer akademiska/litterära ord.
3. Varje fråga ska ha 5 alternativ (A-E).
4. Exakt ETT alternativ ska vara rätt (synonymen eller närmaste betydelsen).
5. De andra 4 alternativen ska vara trovärdiga distraktorer.
6. Svara ENDAST med giltig JSON utan markdown-formatering.

Returnera exakt detta format (en JSON-array):
[
  {
    "word": "exemplum",
    "options": {
      "A": "alternativ 1",
      "B": "alternativ 2",
      "C": "alternativ 3",
      "D": "alternativ 4",
      "E": "alternativ 5"
    },
    "answer": "C",
    "year": "AI",
    "term": "genererad",
    "source": "gemini"
  }
]

Generera ${count} frågor nu:`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse the JSON from the response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('Could not parse AI response');
        }

        const questions = JSON.parse(jsonMatch[0]);

        return NextResponse.json({ questions });
    } catch (error: any) {
        console.error("AI Questions Error:", error);
        return NextResponse.json({
            questions: [],
            error: "Failed to generate AI questions",
            details: error.message
        }, { status: 500 });
    }
}
