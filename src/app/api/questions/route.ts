import { NextResponse } from 'next/server';
import questionsData from '../../../../ingestion/data/all_questions.json';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limitStr = searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr) : 40;

        // Filter out invalid questions (N/A or missing fields)
        let questions = (questionsData as any[]).filter((q: any) => {
            if (!q.word || q.word === 'N/A') return false;
            if (!q.options || Object.values(q.options).some(val => !val || val === 'N/A')) return false;
            if (!q.answer || q.answer === 'N/A') return false;
            return true;
        });

        // Shuffle and limit
        const shuffled = [...questions].sort(() => 0.5 - Math.random()).slice(0, limit);

        return NextResponse.json({ questions: shuffled });
    } catch (error) {
        console.error("Questions API Error:", error);
        return NextResponse.json({ questions: [], error: "Failed to load questions" }, { status: 500 });
    }
}
