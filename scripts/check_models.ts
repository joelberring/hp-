import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function main() {
    try {
        // The SDK doesn't have a direct "listModels" on genAI anymore in some versions, 
        // but we can try the REST API directly or just try common names.
        // Actually, let's try 'gemini-2.0-flash-exp' or 'gemini-1.5-flash-latest'
        console.log("Testing model names...");
        const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-2.0-flash-exp'];

        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("test");
                console.log(`Model ${m} works!`);
                break;
            } catch (e: any) {
                console.log(`Model ${m} failed: ${e.message}`);
            }
        }
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
    }
}

main();
