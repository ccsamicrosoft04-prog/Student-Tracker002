"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { v4 as uuidv4 } from "uuid"
import { 
  CheckCircle, XCircle, ScanIcon as Scanner, 
  Loader2, Camera, Keyboard, ArrowRight
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils" // Ensure you have this utility from shadcn

import {
  getStudentByStudentId,
  addTimeRecord,
  getTimeRecordsByStudentAndDate,
  type Student,
} from "@/lib/db"

export default function PublicQRScanner() {
  const [activeTab, setActiveTab] = useState("camera")
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [continuousMode, setContinuousMode] = useState(true)
  
  const [status, setStatus] = useState<{
    student: Student | null;
    type: "in" | "out" | null;
    message: string | null;
    variant: "success" | "error" | null;
    timestamp: Date | null;
  }>({
    student: null, type: null, message: null, variant: null, timestamp: null
  })

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const cooldownRef = useRef<boolean>(false)
  const scannerBuffer = useRef<string>("")
  const lastKeyTime = useRef<number>(0)

  const processData = useCallback(async (studentId: string) => {
    const cleanId = studentId.trim()
    if (!cleanId || cooldownRef.current || isProcessing) return
    
    cooldownRef.current = true
    setIsProcessing(true)
    
    try {
      const student = await getStudentByStudentId(cleanId)
      
      if (!student) {
        setStatus({
          student: null, type: null, variant: "error", timestamp: new Date(Date.now() + 8 * 60 * 60 * 1000),
          message: `UNRECOGNIZED ID: ${cleanId}`,
        })
        return
      }

      const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split("T")[0] // Get current date in YYYY-MM-DD format
      const records = await getTimeRecordsByStudentAndDate(student.studentId, today)
      const latestRecord = records?.toSorted((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0]
      
      const nextType: "in" | "out" = latestRecord?.type === "in" ? "out" : "in"

      await addTimeRecord({
        id: uuidv4(), studentId: student.studentId,
        timestamp: new Date(Date.now() + 8 * 60 * 60 * 1000), type: nextType, date: today,
      })

      setStatus({
        student, type: nextType, variant: "success", timestamp: new Date(Date.now() + 8 * 60 * 60 * 1000),
        message: `${student.firstName} ${student.lastName} matched`,
      })
    } catch (error) {
      setStatus(prev => ({ ...prev, message: "SYSTEM CONNECTION ERROR", variant: "error" }))
    } finally {
      setIsProcessing(false)
      setTimeout(() => { cooldownRef.current = false }, 2500)
    }
  }, [isProcessing])
useEffect(() => {
  if (activeTab === "manual") {
    const timer = setTimeout(() => {
      const input = document.getElementById("terminal-input");
      if (input) (input as HTMLInputElement).focus();
    }, 150); // Small delay to ensure the tab is visible
    return () => clearTimeout(timer);
  }
}, [activeTab]);
 useEffect(() => {
  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    // 1. Ignore "special" keys that aren't part of the ID
    if (e.key === "Shift" || e.key === "Control" || e.key === "Alt") return;

    const currentTime = Date.now();
    
    // 2. Increase the "patience" of the scanner to 200ms
    if (currentTime - lastKeyTime.current > 200) {
      scannerBuffer.current = ""; 
    }

    if (e.key === "Enter") {
      if (scannerBuffer.current.length > 2) {
        // 3. Clean the ID (remove non-alphanumeric characters)
        const cleanedId = scannerBuffer.current.replaceAll(/[^a-zA-Z0-9]/g, "");
        processData(cleanedId);
        scannerBuffer.current = "";
      }
    } else if (e.key.length === 1) {
      scannerBuffer.current += e.key;
    }
    lastKeyTime.current = currentTime;
  }
  
  globalThis.addEventListener("keydown", handleGlobalKeyDown);
  return () => globalThis.removeEventListener("keydown", handleGlobalKeyDown);
}, [processData]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop()
      setIsScanning(false)
    }
  }, [])

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("reader")
      scannerRef.current = html5QrCode
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 280, height: 280 } },
        (text) => {
          processData(text)
          if (!continuousMode) stopScanner()
        },
        () => {}
      )
      setIsScanning(true)
    } catch (err) { console.error(err) }
  }

  const formatTime = (date: Date | null) => 
    date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "--:--:--"

  return (
    <div className="min-h-screen  flex items-center justify-center p-4 antialiased selection:bg-indigo-100">
      <Card className="w-full max-w-6xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border-none overflow-hidden rounded-[40px]">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-1 lg:grid-cols-2 min-h-[720px]">
            
            {/* LEFT PANEL: SCANNING INTERFACE */}
            <div className="p-10 bg-white flex flex-col border-r border-slate-100">
              <header className="mb-10">
                <h1 className="text-sm font-bold tracking-[0.2em] text-slate-400 uppercase mb-1">Attendance System</h1>
                <p className="text-2xl font-semibold text-slate-900 tracking-tight">Kiosk Terminal</p>
              </header>

              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); stopScanner(); }} className="w-full flex-1">
                <TabsList className="grid grid-cols-2 mb-10 h-14 bg-slate-100/80 p-1.5 rounded-2xl">
                  <TabsTrigger value="camera" className="rounded-xl data-[state=active]:shadow-sm gap-2 font-medium text-slate-700">
                    <Camera className="w-4 h-4" /> Visual Scan
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="rounded-xl data-[state=active]:shadow-sm gap-2 font-medium text-slate-700">
                    <Keyboard className="w-4 h-4" /> Terminal Input
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="camera" className="space-y-6 animate-in fade-in duration-500">
                  <div className="relative group">
                    <div id="reader" className="w-full aspect-square rounded-[32px] overflow-hidden bg-slate-950 border-[12px] border-slate-50 shadow-inner" />
                    {!isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] rounded-[32px]">
                        <Button size="lg" onClick={startScanner} className="rounded-full h-16 px-10 text-lg font-bold shadow-2xl bg-indigo-600 hover:bg-indigo-700 transition-all scale-100 hover:scale-105 active:scale-95">
                          Activate Camera
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-6 py-4 bg-slate-50 rounded-[24px] border border-slate-100">
                    <div className="flex items-center space-x-3">
                      <Switch id="cont" checked={continuousMode} onCheckedChange={setContinuousMode} />
                      <Label htmlFor="cont" className="text-sm font-bold text-slate-600 cursor-pointer">Continuous Mode</Label>
                    </div>
                    {isScanning && (
                      <Button variant="ghost" onClick={stopScanner} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-bold">
                        Shut Down
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                  <div className="p-8 bg-indigo-50/50 rounded-[32px] border border-indigo-100/50">
                    <div className="flex items-start gap-4 text-indigo-700 mb-6">
                      <div className="mt-1 p-2 bg-indigo-100 rounded-lg"><Scanner className="w-5 h-5" /></div>
                      <p className="text-sm font-medium leading-relaxed">
                        Tap your physical ID card against the scanner. The system will auto-detect the input without manual clicks.
                      </p>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const val = new FormData(e.currentTarget).get("studentId") as string;
                      processData(val);
                      e.currentTarget.reset();
                    }}>
                      <div className="relative">
                       <Input 
  id="terminal-input"
  name="studentId" 
  autoFocus 
  placeholder="Input Student ID" 
  className="h-16 pl-6 pr-16 text-xl font-mono rounded-2xl border-slate-200 focus:ring-4 focus:ring-indigo-100 transition-all" 
/>
                        <Button type="submit" size="icon" disabled={isProcessing} className="absolute right-2 top-2 h-12 w-12 rounded-xl bg-slate-900">
                          {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                        </Button>
                      </div>
                    </form>
                  </div>
                </TabsContent>
              </Tabs>

              {status.message && (
                <div className={cn(
                  "mt-8 p-5 rounded-[24px] border-2 text-center flex items-center justify-center gap-3 animate-bounce-short",
                  status.variant === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
                )}>
                  {status.variant === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span className="font-bold tracking-tight uppercase text-xs">{status.message}</span>
                </div>
              )}
            </div>

            {/* RIGHT PANEL: PERSONALIZED FEEDBACK */}
            <div className={cn(
              "relative p-12 flex flex-col items-center justify-center transition-all duration-700",
              status.variant === "success" 
                ? (status.type === "in" ? "bg-[#059669]" : "bg-[#EA580C]") 
                : "bg-slate-950"
            )}>
              {/* Decorative Mesh Gradient Background */}
              <div className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]" />

              {status.student ? (
                <div className="w-full max-w-sm space-y-10 text-center animate-in zoom-in-95 duration-500 relative z-10">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 rounded-full blur-3xl bg-white/20 animate-pulse" />
                    <Avatar className="h-72 w-72 mx-auto border-[16px] border-white shadow-[0_32px_64px_rgba(0,0,0,0.3)]">
                      <AvatarImage src={status.student.photoUrl} className="object-cover" />
                      <AvatarFallback className="text-7xl font-black bg-slate-100 text-slate-800 italic">
                        {status.student.firstName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="text-white space-y-3">
                    <h2 className="text-6xl font-black uppercase tracking-tighter leading-[0.9]">
                      {status.student.firstName}<br />
                      <span className="opacity-80">{status.student.lastName}</span>
                    </h2>
                    <p className="text-white/60 font-mono text-xl tracking-[0.2em]">{status.student.studentId}</p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-xl rounded-[32px] p-8 text-white border border-white/20 shadow-2xl">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Check-{status.type} Confirmed</span>
                    </div>
                    <p className="text-5xl font-extralight tracking-tighter tabular-nums">{formatTime(status.timestamp)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-8 relative z-10">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full" />
                    <Scanner className="w-48 h-48 text-white/10 mx-auto transition-all duration-1000 group-hover:text-white/20" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white/40 text-3xl font-black uppercase tracking-[0.4em]">Standby</h3>
                    <p className="text-white/20 text-sm font-medium tracking-[0.1em]">Awaiting authentication...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}