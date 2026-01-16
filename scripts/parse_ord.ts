import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function parsePdf(pdfPath: string, year: number, term: string, type: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const pdfData = await fs.readFile(pdfPath);
    const pdfBase64 = pdfData.toString('base64');

    const prompt = `
    Extract all "ORD" (Vocabulary) questions from this Högskoleprov PDF. 
    The ORD section usually has 10 questions where you have a word and 5 options (A-E).
    
    For each question, also identify the correct answer based on your knowledge of Swedish and Högskoleprovet.
    
    Return the result as a JSON array of objects:
    {
      "word": "string",
      "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "answer": "A" | "B" | "C" | "D" | "E",
      "questionNumber": number,
      "year": ${year},
      "term": "${term}"
    }
    
    Only return the JSON array, no other text. 
    IMPORTANT: If you cannot find valid word or options for a question, do not include it in the JSON array. Do not use placeholders like "N/A" or "Unknown".
    `;

    const result = await model.generateContent([
        {
            inlineData: {
                data: pdfBase64,
                mimeType: "application/pdf"
            }
        },
        { text: prompt }
    ]);

    const response = await result.response;
    const text = response.text();

    // Clean JSON if needed
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(jsonStr);

    // Filter out invalid items immediately
    return Array.isArray(questions) ? questions.filter((q: any) =>
        q.word && q.word !== 'N/A' &&
        q.options && Object.values(q.options).every(v => v && v !== 'N/A')
    ) : [];
}

async function main() {
    if (!process.env.GEMINI_API_KEY) {
        console.error("Missing GEMINI_API_KEY in .env");
        process.exit(1);
    }

    const outputDir = path.join(process.cwd(), 'ingestion/data');
    await fs.ensureDir(outputDir);

    const pdfDir = path.join(process.cwd(), 'ingestion/pdfs');
    const manifestPath = path.join(process.cwd(), 'ingestion/manifest.json');
    const manifest = await fs.readJson(manifestPath);

    const allQuestions: any[] = [];
    const verbalFiles = manifest.filter((m: any) => m.type === 'verbal');

    console.log(`Found ${verbalFiles.length} verbal files to process.`);

    for (const item of verbalFiles) {
        const filename = path.basename(item.file);
        const filePath = path.join(pdfDir, filename);

        if (!await fs.pathExists(filePath)) {
            console.warn(`File ${filename} not found, skipping.`);
            continue;
        }

        console.log(`Parsing ${filename} (${item.year} ${item.term})...`);
        try {
            const questions = await parsePdf(filePath, item.year, item.term, 'verbal');
            allQuestions.push(...questions.map((q: any) => ({ ...q, source: filename })));
            console.log(`  Added ${questions.length} questions.`);

            // Save intermediate results
            await fs.writeJson(path.join(outputDir, 'all_questions.json'), allQuestions, { spaces: 2 });

            // Wait a bit to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error: any) {
            console.error(`  Error parsing ${filename}: ${error.message}`);
        }
    }

    console.log(`Total questions collected: ${allQuestions.length}`);
}

main();
