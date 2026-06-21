import BattleSocketProvider from "./BattleSocketProvider";



export default function BattleLayout({children}: Readonly<{children: React.ReactNode}>) {

    return (
        <BattleSocketProvider>
            {children}
        </BattleSocketProvider>
    )
}