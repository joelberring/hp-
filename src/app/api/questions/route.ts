import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '40');

    const dataPath = path.join(process.cwd(), 'ingestion/data/all_questions.json');

    if (!await fs.pathExists(dataPath)) {
        return NextResponse.json({ questions: [] });
    }

    const fileContents = await fs.readFile(dataPath, 'utf8');
    let questions = JSON.parse(fileContents);

    // Filter out invalid questions (N/A or missing fields)
    questions = questions.filter((q: any) => {
        if (!q.word || q.word === 'N/A') return false;
        if (!q.options || Object.values(q.options).some(val => !val || val === 'N/A')) return false;
        if (!q.answer || q.answer === 'N/A') return false;
        return true;
    });

    // Shuffle and limit
    const shuffled = questions.sort(() => 0.5 - Math.random()).slice(0, limit);

    return NextResponse.json({ questions: shuffled });
}
