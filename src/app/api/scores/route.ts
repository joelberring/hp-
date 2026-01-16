import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, where } from "firebase/firestore";
import { getServerSession } from "next-auth/next";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const session = await getServerSession();
    const { score, total, time, percentage, guestName, mode } = await request.json();

    try {
        await addDoc(collection(db, "scores"), {
            userId: session?.user?.email || "guest",
            userName: session?.user?.name || guestName || "Anonym",
            userImage: session?.user?.image || null,
            score,
            total,
            percentage: percentage || (score / total) * 100,
            time,
            mode: mode || "stora", // Save the game mode
            createdAt: serverTimestamp()
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Score submission error:", error);
        return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode') || 'maraton';

        const scoresRef = collection(db, "scores");
        // Simple query by mode and percentage
        // Note: For multi-field ordering, an index might be needed, 
        // but started with single order to ensure it works.
        const q = query(
            scoresRef,
            where("mode", "==", mode),
            orderBy("percentage", "desc"),
            limit(20)
        );
        const querySnapshot = await getDocs(q);

        const leaderboard = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({ leaderboard });
    } catch (error: any) {
        console.error("Failed to fetch leaderboard:", error);
        return NextResponse.json({ error: "Failed to fetch leaderboard", details: error.message }, { status: 500 });
    }
}
