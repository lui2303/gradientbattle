import { auth } from "@/auth";
import BattleScreen from "./BattleScreen";

export default async function Page() {
    const session = await auth()

    if(!session || !session.user || !session.user.name || !session.user.id) return
    console.log(session)

    return (
        <main className="min-h-screen p-8">
            <BattleScreen username={session.user.name} userID={session.user.id}></BattleScreen>
        </main>
    );
}