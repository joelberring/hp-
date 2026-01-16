import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

const BASE_URL = 'https://allarätt.nu/';

async function downloadFile(url: string, outputPath: string) {
    if (await fs.pathExists(outputPath)) {
        console.log(`Skipping ${url}, already exists.`);
        return;
    }

    console.log(`Downloading ${url}...`);
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
        });

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise<void>((resolve, reject) => {
            writer.on('finish', () => resolve());
            writer.on('error', reject);
        });
    } catch (error: any) {
        console.error(`Failed to download ${url}: ${error.message}`);
    }
}

async function main() {
    const pdfDir = path.join(process.cwd(), 'ingestion/pdfs');
    await fs.ensureDir(pdfDir);

    const manifestPath = path.join(process.cwd(), 'ingestion/manifest.json');
    const manifest = await fs.readJson(manifestPath);

    for (const item of manifest) {
        const url = `${BASE_URL}${item.file}`;
        // Replace spaces with %20 for URLs if needed, though axios might handle it
        const safeUrl = url.replace(/ /g, '%20');
        const filename = path.basename(item.file);
        const outputPath = path.join(pdfDir, filename);

        await downloadFile(safeUrl, outputPath);
    }
}

main();
