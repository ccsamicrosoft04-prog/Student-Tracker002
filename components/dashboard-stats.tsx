"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getStudentStatistics, type StudentStats } from "@/lib/db"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import { Loader2, Users, GraduationCap, School, Activity } from "lucide-react"
import { HIGHER_EDUCATION_PROGRAMS } from "@/lib/education-programs"

const COLORS = [
  "#6366f1", "#06b6d4", "#14b8a6", "#10b981", "#f59e0b", 
  "#f97316", "#ef4444", "#d946ef", "#a855f7", "#3b82f6"
];

export default function DashboardStats() {
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const studentStats = await getStudentStatistics()
        setStats(studentStats)
      } catch (error) {
        console.error("Error loading statistics:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadStats()
  }, [])

  // Memoize data processing to improve performance
  const programData = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats.programCounts)
      .map(([program, count], index) => {
        const programInfo = HIGHER_EDUCATION_PROGRAMS.find((p) => p.code === program)
        return {
          name: programInfo ? programInfo.code : program,
          fullName: programInfo ? programInfo.name : program,
          students: count,
          fill: COLORS[index % COLORS.length],
        }
      })
      .sort((a, b) => b.students - a.students)
  }, [stats])

  const schoolDistData = useMemo(() => [
    { name: "Higher Ed", value: stats?.higherEducationCount || 0 },
    { name: "Basic Ed", value: stats?.basicEducationCount || 0 },
  ], [stats])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Syncing Analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatSummaryCard title="Total Students" value={stats?.totalStudents} icon={<Users />} color="text-slate-900" />
        <StatSummaryCard title="Currently Active" value={stats?.activeStudents} icon={<Activity />} color="text-emerald-600" />
        <StatSummaryCard title="Higher Education" value={stats?.higherEducationCount} icon={<GraduationCap />} color="text-indigo-600" />
        <StatSummaryCard title="Basic Education" value={stats?.basicEducationCount} icon={<School />} color="text-fuchsia-600" />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-slate-100 p-1 rounded-xl h-auto">
          <TabsTrigger value="overview" className="rounded-lg py-2.5 font-bold text-xs uppercase tracking-wider">Overview</TabsTrigger>
          <TabsTrigger value="programs" className="rounded-lg py-2.5 font-bold text-xs uppercase tracking-wider">Programs</TabsTrigger>
          <TabsTrigger value="levels" className="rounded-lg py-2.5 font-bold text-xs uppercase tracking-wider">Levels</TabsTrigger>
          <TabsTrigger value="details" className="rounded-lg py-2.5 font-bold text-xs uppercase tracking-wider">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Program Distribution</CardTitle>
                <CardDescription>Student count per academic program</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={programData.slice(0, 8)} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="students" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg">Enrollment Mix</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={schoolDistData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {schoolDistData.map((_, i) => <Cell key={i} fill={COLORS[i]} stroke="none" />)}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Additional TabsContent sections follow similar optimized patterns... */}
      </Tabs>
    </div>
  )
}

/**
 * Reusable Stat Card Component
 */
function StatSummaryCard({ title, value, icon, color }: Readonly<{ title: string, value?: number, icon: React.ReactNode, color: string }>) {
  return (
    <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{title}</p>
            <h3 className={`text-3xl font-black ${color}`}>{value?.toLocaleString() || "0"}</h3>
          </div>
          <div className={`p-3 rounded-2xl bg-slate-50 ${color} opacity-80`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}