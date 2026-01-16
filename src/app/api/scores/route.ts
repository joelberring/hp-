import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { getServerSession } from "next-auth/next";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const session = await getServerSession();
    const { score, total, time, percentage, guestName } = await request.json();

    try {
        await addDoc(collection(db, "scores"), {
            userId: session?.user?.email || "guest",
            userName: session?.user?.name || guestName || "Anonym",
            userImage: session?.user?.image || null,
            score,
            total,
            percentage: percentage || (score / total) * 100,
            time,
            createdAt: serverTimestamp()
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Score submission error:", error);
        return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const scoresRef = collection(db, "scores");
        // Prioritize accuracy percentage, then total volume
        const q = query(scoresRef, orderBy("percentage", "desc"), orderBy("total", "desc"), limit(20));
        const querySnapshot = await getDocs(q);

        const leaderboard = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({ leaderboard });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }
}
