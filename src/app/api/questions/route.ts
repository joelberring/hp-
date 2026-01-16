import { NextResponse } from 'next/server';
import questionsData from '../../../../ingestion/data/all_questions.json';

// Pre-filter questions at module load time (only runs once)
const validQuestions = (questionsData as any[]).filter((q: any) => {
    if (!q.word || q.word === 'N/A') return false;
    if (!q.options || Object.values(q.options).some(val => !val || val === 'N/A')) return false;
    if (!q.answer || q.answer === 'N/A') return false;
    return true;
});

// Fisher-Yates shuffle for better randomization
function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limitStr = searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr) : 40;

        // Shuffle and limit from the pre-filtered cache
        const shuffled = shuffle(validQuestions).slice(0, limit);

        return NextResponse.json({ questions: shuffled });
    } catch (error) {
        console.error("Questions API Error:", error);
        return NextResponse.json({ questions: [], error: "Failed to load questions" }, { status: 500 });
    }
}
