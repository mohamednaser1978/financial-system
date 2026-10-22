'use client'

import React, { useState, useEffect } from 'react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard, Building2, ArrowLeftRight, Plus, Settings, Users,
  DollarSign, TrendingUp, TrendingDown, BarChart3, PieChart, CreditCard,
  AlertTriangle, CheckCircle2, XCircle, Clock, LogOut, ChevronLeft, ChevronRight, Menu, X,
  FileText, Wallet, ArrowUpRight, ArrowDownLeft, UserPlus, Trash2, Edit, Edit2,
  Eye, Printer, MoreVertical, Search, RefreshCw, Home, Banknote,
  CircleDollarSign, UserCheck, UserMinus, Receipt, Shield, ChevronDown, ChevronUp, Globe, Globe2, MapPin,
  ClipboardList, Download, HardDrive, Lock, User, HandCoins, CheckSquare, Coins
} from 'lucide-react'
import { format } from 'date-fns'
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// ===================== TYPES =====================
interface User {
  id: string
  username: string
  fullName: string
  role: string
  officeId: string | null
  isActive: boolean
  office?: { id: string; name: string; code: string } | null
}

interface Office {
  id: string
  name: string
  code: string
  type: string
  region: string | null
  address: string | null
  phone: string | null
  openingBalance: number
  currentBalance: number
  isActive: boolean
  _count?: { sentTransfers: number; receivedTransfers: number }
}

interface Transfer {
  id: string
  transferNo: string
  senderOfficeId: string
  receiverOfficeId: string
  intermediaryOfficeId: string | null
  amount: number
  commissionAmount: number
  transferType: string
  status: string
  senderName: string
  senderPhone: string | null
  senderType?: 'normal' | 'creditor' | 'debtor'
  receiverName: string
  receiverPhone: string | null
  receiverType?: 'normal' | 'creditor' | 'debtor'
  location: string | null
  notes: string | null
  adminNote?: string | null
  isVerified: boolean
  verifiedBy?: string | null
  createdBy: string
  completedAt: string | null
  createdAt: string
  senderOffice: { id: string; name: string; code: string }
  receiverOffice: { id: string; name: string; code: string }
  intermediaryOffice?: { id: string; name: string; code: string } | null
  commissionDistributions?: { id: string; officeId: string; partyType: string; amount: number; office: { id: string; name: string } }[]
}

interface Expense {
  id: string
  officeId: string | null
  description: string
  amount: number
  expenseDate: string
  category: string | null
  notes: string | null
  office?: { id: string; name: string } | null
}

interface Creditor {
  id: string
  name: string
  phone: string | null
  totalDeposit: number
  currentBalance: number
  officeId: string
  notes: string | null
  transactions?: CreditorTransaction[]
}

interface Debtor {
  id: string
  name: string
  phone: string | null
  totalDebt: number
  currentBalance: number
  officeId: string
  notes: string | null
  transactions?: DebtorTransaction[]
}

interface CreditorTransaction {
  id: string
  creditorId: string
  amount: number
  type: string
  description: string
  createdAt: string
}

interface DebtorTransaction {
  id: string
  debtorId: string
  amount: number
  type: string
  description: string
  createdAt: string
}

interface CommissionRule {
  id: string
  name: string
  type: string
  transferType: string // "internal" | "external"
  value: number
  minAmount: number | null
  maxAmount: number | null
  isActive: boolean
  distributionRules: { id: string; partyType: string; percentage: number }[]
}

type Screen =
  | 'login'
  | 'dashboard'
  | 'offices'
  | 'transfers'
  | 'new-transfer'
  | 'between-offices'
  | 'commissions'
  | 'expenses'
  | 'creditors'
  | 'debtors'
  | 'reports'
  | 'settings'
  | 'audit-log'
  | 'reconciliation'
  | 'payout'

interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string | null
  entityName: string | null
  description: string
  userId: string | null
  userFullName: string | null
  createdAt: string
}

// ===================== HELPERS =====================
const API_BASE =
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? 'https://api.top1.ly'
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

const formatMoney = (amount: number | undefined | null) => {
  const val = typeof amount === 'number' ? amount : 0
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
  return formatted + ' د.ل'
}

// تحويل الأرقام الإنجليزية إلى عربية
const toArabicNumerals = (str: string) => {
  const arabicDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  return str.replace(/[0-9]/g, (d) => arabicDigits[parseInt(d)])
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">مكتمل</Badge>
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">ملغي</Badge>
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">بانتظار الاعتماد</Badge>
    case 'approved':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">تم الاعتماد (جاهز للصرف)</Badge>
    case 'rejected':
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100">مرفوض</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const typeBadge = (type: string) => {
  switch (type) {
    case 'internal':
      return <Badge variant="outline" className="border-blue-300 text-blue-700">داخلي</Badge>
    case 'external':
      return <Badge variant="outline" className="border-purple-300 text-purple-700">خارجي</Badge>
    case 'intermediary':
      return <Badge variant="outline" className="border-orange-300 text-orange-700">عبر وسيط</Badge>
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

const Switch = ({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ring-offset-2 focus:ring-2 focus:ring-blue-500 ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? '-translate-x-6' : '-translate-x-1'}`} />
  </button>
)

// ===================== MAIN APP =====================
export default function FinanceApp() {
  const [screen, setScreen] = useState<Screen>('login')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [companyName, setCompanyName] = useState('نظام التحويلات')
  const [adminPhone, setAdminPhone] = useState('')
  const [transferType, setTransferType] = useState<{ type: 'creditor' | 'debtor', action: 'send' | 'receive', name: string } | null>(null)
  const { toast } = useToast()

  // جلب اسم الشركة من الإعدادات
  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`)
      if (res.ok) {
        const settings = await res.json()
        if (settings.companyName) setCompanyName(settings.companyName)
        if (settings.adminPhone) setAdminPhone(settings.adminPhone)
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleLogin = async (username: string, password: string) => {
    setLoading(true)
    try {
      // Connect to Python Backend instead of Next.js API
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'خطأ في تسجيل الدخول')
      setUser(data.user)
      localStorage.setItem('financeUser', JSON.stringify(data.user))
      setScreen('dashboard')
      loadSettings()
      toast({ title: 'مرحباً!', description: `تم تسجيل الدخول بنجاح - ${data.user.fullName}` })
    } catch (error) {
      toast({ title: 'خطأ', description: error instanceof Error ? error.message : 'حدث خطأ', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    // نسخة احتياطية تلقائية عند خروج المدير
    if (user && user.role === 'admin') {
      try {
        await fetch(`${API_BASE}/backup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, userFullName: user.fullName }),
        })
      } catch { /* تجاهل أخطاء النسخ الاحتياطي */ }
    }
    setUser(null)
    localStorage.removeItem('financeUser')
    setScreen('login')
    setSidebarOpen(false)
  }

  if (screen === 'login' || !user) {
    return <LoginScreen onLogin={handleLogin} loading={loading} />
  }

  const isAdmin = user.role === 'admin'

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-[var(--sidebar-border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/icon.png" alt="Logo" className="w-full h-full object-contain p-1" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm leading-tight truncate">{companyName}</h2>
                {user && !isAdmin && user.office && (
                  <p className="text-xs text-white/90 font-medium mt-0.5 truncate">📍 {user.office.name}</p>
                )}
                {user && isAdmin && (
                  <p className="text-xs text-white/60 mt-0.5">إدارة مالية متكاملة</p>
                )}
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {isAdmin ? (
              <>
                <NavItem icon={<LayoutDashboard className="w-5 h-5" />} label="لوحة التحكم" active={screen === 'dashboard'} onClick={() => { setScreen('dashboard'); setSidebarOpen(false) }} />
                <NavItem icon={<CheckSquare className="w-5 h-5" />} label="مطابقة العمليات" active={screen === 'reconciliation'} onClick={() => { setScreen('reconciliation'); setSidebarOpen(false) }} />
                <NavItem icon={<Building2 className="w-5 h-5" />} label="إدارة المكاتب" active={screen === 'offices'} onClick={() => { setScreen('offices'); setSidebarOpen(false) }} />
                <NavItem icon={<ArrowLeftRight className="w-5 h-5" />} label="التحويلات" active={screen === 'transfers'} onClick={() => { setScreen('transfers'); setSidebarOpen(false) }} />
                <NavItem icon={<Plus className="w-5 h-5" />} label="توثيق إرسال" active={screen === 'new-transfer'} onClick={() => { setScreen('new-transfer'); setSidebarOpen(false) }} />
                <NavItem icon={<Banknote className="w-5 h-5" />} label="شحن بين الفروع" active={screen === 'between-offices'} onClick={() => { setScreen('between-offices'); setSidebarOpen(false) }} />
                <NavItem icon={<CircleDollarSign className="w-5 h-5" />} label="العمولات" active={screen === 'commissions'} onClick={() => { setScreen('commissions'); setSidebarOpen(false) }} />
                <NavItem icon={<Receipt className="w-5 h-5" />} label="المصروفات" active={screen === 'expenses'} onClick={() => { setScreen('expenses'); setSidebarOpen(false) }} />
                <NavItem icon={<UserCheck className="w-5 h-5" />} label="الدائنون" active={screen === 'creditors'} onClick={() => { setScreen('creditors'); setSidebarOpen(false) }} />
                <NavItem icon={<UserMinus className="w-5 h-5" />} label="المدينون" active={screen === 'debtors'} onClick={() => { setScreen('debtors'); setSidebarOpen(false) }} />
                <NavItem icon={<BarChart3 className="w-5 h-5" />} label="التقارير" active={screen === 'reports'} onClick={() => { setScreen('reports'); setSidebarOpen(false) }} />
                <NavItem icon={<ClipboardList className="w-5 h-5" />} label="سجل الأنشطة" active={screen === 'audit-log'} onClick={() => { setScreen('audit-log'); setSidebarOpen(false) }} />
                <NavItem icon={<Settings className="w-5 h-5" />} label="الإعدادات" active={screen === 'settings'} onClick={() => { setScreen('settings'); setSidebarOpen(false) }} />
              </>
            ) : (
              <>
                <NavItem icon={<Home className="w-5 h-5" />} label="الرئيسية" active={screen === 'dashboard'} onClick={() => { setScreen('dashboard'); setSidebarOpen(false) }} />
                <NavItem icon={<HandCoins className="w-5 h-5" />} label="صرف حوالة" active={screen === 'payout'} onClick={() => { setScreen('payout'); setSidebarOpen(false) }} />
                <NavItem icon={<Plus className="w-5 h-5" />} label="توثيق إرسال" active={screen === 'new-transfer'} onClick={() => { setScreen('new-transfer'); setSidebarOpen(false) }} />
                <NavItem icon={<Banknote className="w-5 h-5" />} label="شحن بين الفروع" active={screen === 'between-offices'} onClick={() => { setScreen('between-offices'); setSidebarOpen(false) }} />
                <NavItem icon={<ArrowLeftRight className="w-5 h-5" />} label="التحويلات" active={screen === 'transfers'} onClick={() => { setScreen('transfers'); setSidebarOpen(false) }} />
                <NavItem icon={<Wallet className="w-5 h-5" />} label="الأرصدة" active={screen === 'offices'} onClick={() => { setScreen('offices'); setSidebarOpen(false) }} />
                <NavItem icon={<Receipt className="w-5 h-5" />} label="المصروفات" active={screen === 'expenses'} onClick={() => { setScreen('expenses'); setSidebarOpen(false) }} />
                <NavItem icon={<UserCheck className="w-5 h-5" />} label="الدائنون" active={screen === 'creditors'} onClick={() => { setScreen('creditors'); setSidebarOpen(false) }} />
                <NavItem icon={<UserMinus className="w-5 h-5" />} label="المدينون" active={screen === 'debtors'} onClick={() => { setScreen('debtors'); setSidebarOpen(false) }} />
              </>
            )}
          </nav>

          <div className="p-3 border-t border-[var(--sidebar-border)]">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.fullName}</p>
                <p className="text-xs text-white/60 truncate">
                  {user.role === 'admin' ? 'مدير النظام' : (user.office?.name || 'موظف فرع')}
                </p>
              </div>
              <button onClick={handleLogout} className="text-white/60 hover:text-white" title="تسجيل الخروج">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800">
              {screen === 'dashboard' && (isAdmin ? 'لوحة التحكم' : 'الرئيسية')}
              {screen === 'offices' && (isAdmin ? 'إدارة المكاتب' : 'الأرصدة')}
              {screen === 'transfers' && 'التحويلات'}
              {screen === 'new-transfer' && 'توثيق إرسال حوالة'}
              {screen === 'between-offices' && 'شحن أموال بين الفروع'}
              {screen === 'commissions' && 'إدارة العمولات'}
              {screen === 'expenses' && 'المصروفات'}
              {screen === 'creditors' && 'الدائنون'}
              {screen === 'debtors' && 'المدينون'}
              {screen === 'reports' && 'التقارير'}
              {screen === 'audit-log' && 'سجل الأنشطة'}
              {screen === 'settings' && 'الإعدادات'}
              {screen === 'reconciliation' && 'مطابقة العمليات اليومية'}
              {screen === 'payout' && 'صرف حوالة واردة'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{user.fullName}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 ml-1" />
              خروج
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 md:p-6">
          {screen === 'dashboard' && <DashboardScreen user={user} isAdmin={isAdmin} />}
          {screen === 'offices' && <OfficesScreen user={user} isAdmin={isAdmin} />}
          {screen === 'transfers' && <TransfersScreen user={user} isAdmin={isAdmin} adminPhone={adminPhone} />}
          {screen === 'new-transfer' && <NewTransferScreen user={user} isAdmin={isAdmin} onCreated={() => { setScreen('transfers'); setTransferType(null) }} transferType={transferType} adminPhone={adminPhone} />}
          {screen === 'between-offices' && <BetweenOfficesScreen user={user} isAdmin={isAdmin} />}
          {screen === 'commissions' && <CommissionsScreen user={user} isAdmin={isAdmin} />}
          {screen === 'expenses' && <ExpensesScreen user={user} isAdmin={isAdmin} />}
          {screen === 'creditors' && <CreditorsScreen user={user} isAdmin={isAdmin} setTransferType={setTransferType} setScreen={setScreen} />}
          {screen === 'debtors' && <DebtorsScreen user={user} isAdmin={isAdmin} setTransferType={setTransferType} setScreen={setScreen} />}
          {screen === 'reports' && <ReportsScreen user={user} isAdmin={isAdmin} />}
          {screen === 'audit-log' && isAdmin && <AuditLogScreen user={user} />}
          {screen === 'settings' && isAdmin && <SettingsScreen user={user} isAdmin={isAdmin} />}
          {screen === 'reconciliation' && isAdmin && <ReconciliationScreen user={user} />}
          {screen === 'payout' && <PayoutScreen user={user} />}
        </div>
      </main>
    </div>
  )
}

// ===================== BETWEEN OFFICES SCREEN =====================
function BetweenOfficesScreen({ user, isAdmin }: { user: User; isAdmin: boolean }) {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const schema = z.object({
    senderOfficeId: z.string().min(1, "يجب اختيار المكتب المرسل"),
    receiverOfficeId: z.string().min(1, "يجب اختيار المكتب المستلم"),
    amount: z.number().min(0.01, "يجب أن يكون المبلغ أكبر من 0"),
    notes: z.string().optional(),
  });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const senderOfficeId = watch("senderOfficeId");
  const receiverOfficeId = watch("receiverOfficeId");

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    try {
      const response = await fetch(`${API_BASE}/offices`);
      if (response.ok) {
        const data = await response.json();
        setOffices(data);
      }
    } catch (error) {
      console.error("Error fetching offices:", error);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (data.senderOfficeId === data.receiverOfficeId) {
      toast({
        title: "خطأ",
        description: "لا يمكن التحويل لنفس المكتب",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/offices/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, userId: user.id, userFullName: user.fullName }),
      });

      if (response.ok) {
        toast({
          title: "نجح",
          description: "تم إنشاء التحويل بنجاح",
        });
        reset();
        fetchOffices(); // تحديث الأرصدة
      } else {
        const error = await response.json();
        toast({
          title: "خطأ",
          description: error.message || "حدث خطأ أثناء إنشاء التحويل",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating transfer:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء التحويل",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedSender = offices.find(o => o.id === senderOfficeId);
  const selectedReceiver = offices.find(o => o.id === receiverOfficeId);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>شحن أموال بين الفروع</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="senderOfficeId">المكتب المرسل</Label>
                <Select onValueChange={(value) => setValue("senderOfficeId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المكتب المرسل" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name} ({office.code}) - رصيد: {office.currentBalance.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.senderOfficeId && (
                  <p className="text-red-500 text-sm">{errors.senderOfficeId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="receiverOfficeId">المكتب المستلم</Label>
                <Select onValueChange={(value) => setValue("receiverOfficeId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المكتب المستلم" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name} ({office.code}) - رصيد: {office.currentBalance.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.receiverOfficeId && (
                  <p className="text-red-500 text-sm">{errors.receiverOfficeId.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="amount">المبلغ</Label>
              <Input
                id="amount"
                type="text"
                step="0.01"
                {...register("amount", { valueAsNumber: true })}
                placeholder="أدخل المبلغ"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="أدخل ملاحظات إضافية (اختياري)"
              />
            </div>

            {selectedSender && selectedReceiver && (
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">معاينة التحويل:</h3>
                <p>من: {selectedSender.name} (رصيد حالي: {selectedSender.currentBalance.toFixed(2)})</p>
                <p>إلى: {selectedReceiver.name} (رصيد حالي: {selectedReceiver.currentBalance.toFixed(2)})</p>
                <p>المبلغ: {watch("amount") || 0}</p>
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? "جاري الإنشاء..." : "إنشاء التحويل"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== NAV ITEM =====================
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-white/20 text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
    >
      {icon}
      {label}
    </button>
  )
}

// ===================== LOGIN SCREEN =====================
function LoginScreen({ onLogin, loading }: { onLogin: (u: string, p: string) => void; loading: boolean }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username && password) onLogin(username, password)
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Right Side: Form (Full width on mobile, half on desktop) */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 bg-opacity-50">
        <div className="w-full max-w-md">
          <div className="md:hidden text-center mb-8">
            <div className="w-20 h-20 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-inner">
              <img src="/icon.png" alt="Logo" className="w-full h-full object-contain p-2" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">نظام إدارة التحويلات</h1>
          </div>

          <Card className="shadow-2xl border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
              <CardDescription>أدخل بيانات الدخول للمتابعة</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">اسم المستخدم</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    className="text-right"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    className="text-right"
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full h-11 text-md font-semibold bg-primary hover:bg-primary/90 transition-all" disabled={loading || !username || !password}>
                  {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              نظام إدارة التحويلات المالية الذكي
            </p>
          </div>
        </div>
      </div>

      {/* Left Side: Brand Image/Gradient (Hidden on mobile) */}
      <div className="hidden md:flex flex-1 login-split-gradient items-center justify-center p-12 relative animate-blur-in">
        <div className="relative z-20 text-center max-w-lg">
          <div className="w-64 h-64 bg-white/10 backdrop-blur-xl rounded-[3rem] flex items-center justify-center mx-auto mb-10 overflow-hidden shadow-2xl border border-white/20 transform hover:scale-105 transition-transform duration-700">
            <img src="/icon.png" alt="Institutional Logo" className="w-full h-full object-contain p-8" />
          </div>
          <h2 className="text-4xl font-black text-white mb-6 leading-tight drop-shadow-lg">
            نظام إدارة التحويلات المالية
          </h2>
          <div className="h-1.5 w-24 bg-white/50 mx-auto rounded-full mb-8 shadow-glow"></div>
          <p className="text-xl text-blue-100/90 leading-relaxed font-light backdrop-blur-sm px-4 py-2 rounded-full inline-block">
            حلول تقنية متكاملة للإدارة المالية والتحويلات المباشرة
          </p>
        </div>
      </div>
    </div>
  )
}

// ===================== DASHBOARD SCREEN =====================
function DashboardScreen({ user, isAdmin }: { user: User; isAdmin: boolean }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const isBranch = !isAdmin && !!user.officeId

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isBranch) params.set('officeId', user.officeId!)
      const url = `${API_BASE}/dashboard/stats?${params}`
      const res = await fetch(url)
      const json = await res.json()
      setData(json)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const params = new URLSearchParams()
        if (isBranch) params.set('officeId', user.officeId!)
        const url = `${API_BASE}/dashboard/stats?${params}`
        const res = await fetch(url)
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [isBranch, user.officeId])

  if (loading || !data) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </div>
  }

  const now = new Date()
  const dayName = now.toLocaleDateString('ar-LY', { weekday: 'long' })
  const dayNum = now.getDate()
  const monthName = now.toLocaleDateString('ar-LY', { month: 'long' })
  const yearNum = now.getFullYear()
  const fullDate = now.toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' })

  // بطاقات الإحصائيات - تختلف بحسب نوع المستخدم
  const adminStats = [
    { title: 'تحويلات اليوم', value: data.todayTransfers, icon: <ArrowLeftRight className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'تحويلات الشهر', value: data.monthTransfers, icon: <BarChart3 className="w-5 h-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'معلقة', value: data.pendingTransfers, icon: <Clock className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { title: 'النقدية بالخزائن', value: formatMoney(data.totalInternalBalance), icon: <Wallet className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'إجمالي العمولات', value: formatMoney(data.totalCommissions), icon: <CircleDollarSign className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'إجمالي المصروفات', value: formatMoney(data.totalExpenses), icon: <Receipt className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  const branchStats = [
    { title: 'رصيد الفرع الحالي', value: formatMoney(data.officeData?.currentBalance || 0), icon: <Wallet className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'تحويلات اليوم', value: data.todayTransfers, icon: <ArrowLeftRight className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'تحويلات الشهر', value: data.monthTransfers, icon: <BarChart3 className="w-5 h-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'معلقة', value: data.pendingTransfers, icon: <Clock className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { title: 'عمولات الفرع', value: formatMoney(data.totalCommissions), icon: <CircleDollarSign className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'مصروفات الفرع', value: formatMoney(data.totalExpenses), icon: <Receipt className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  const stats = isBranch ? branchStats : adminStats

  return (
    <div className="space-y-6">
      {/* Date Banner */}
      <div className={`rounded-2xl p-6 text-white shadow-lg ${isBranch ? 'bg-gradient-to-l from-teal-700 to-teal-900' : 'bg-gradient-to-l from-blue-700 to-blue-900'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center min-w-[80px]">
              <p className="text-4xl font-black leading-none">{dayNum}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{dayName}</p>
              <p className={`text-lg mt-1 ${isBranch ? 'text-teal-200' : 'text-blue-200'}`}>{monthName} {yearNum}</p>
              {isBranch && data.officeData && (
                <p className="text-sm mt-1 opacity-80">
                  📍 {data.officeData.name}
                  {data.officeData.region ? ` — ${data.officeData.region}` : ''}
                </p>
              )}
              {isAdmin && (
                <p className="text-blue-200 text-sm mt-1 opacity-80">🏢 لوحة تحكم المدير</p>
              )}
            </div>
          </div>
          <div className="text-left">
            <p className={`text-sm ${isBranch ? 'text-teal-200' : 'text-blue-200'}`}>التاريخ الكامل</p>
            <p className="text-lg font-semibold mt-1">{fullDate}</p>
          </div>
        </div>
      </div>

      {/* Branch Balance Highlight */}
      {isBranch && data.officeData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-500 to-teal-700 text-white col-span-1 md:col-span-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-sm">رصيد الفرع</p>
                  <p className="text-3xl font-black mt-2">{formatMoney(data.officeData.currentBalance || 0)}</p>
                  <p className="text-teal-200 text-xs mt-2">الافتتاحي: {formatMoney(data.officeData.openingBalance || 0)}</p>
                </div>
                <Wallet className="w-12 h-12 text-teal-200 opacity-70" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm col-span-1 md:col-span-2">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-3">إحصائيات شهر {monthName}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500">المبالغ المحولة</p>
                  <p className="text-lg font-bold text-blue-700 mt-1">{formatMoney(data.monthStats?.totalAmount || 0)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500">العمولات المحققة</p>
                  <p className="text-lg font-bold text-emerald-700 mt-1">{formatMoney(data.monthStats?.totalCommission || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Cards - للأدمن نعرض 5 فقط (بدون الأرصدة لأنها في البطاقة البارزة) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(isAdmin
          ? [adminStats[0], adminStats[1], adminStats[2], adminStats[4], adminStats[5]]
          : isBranch ? [stats[1], stats[2], stats[3], stats[4], stats[5]] : stats
        ).map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin Balance Highlight */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Internal Cash */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-bold">إجمالي النقدية المتوفرة</p>
                  <p className="text-3xl font-black mt-2">{formatMoney(data.totalInternalBalance || 0)}</p>
                  <p className="text-emerald-200 text-[10px] mt-2 opacity-80 italic">سيولة نقدية في الفروع الداخلية</p>
                </div>
                <div className="bg-white/20 p-3 rounded-2xl">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* External Debts */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-600 to-amber-800 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-bold">أرصدة المكاتب الخارجية</p>
                  <p className="text-3xl font-black mt-2">{formatMoney(data.totalExternalBalance || 0)}</p>
                  <p className="text-amber-200 text-[10px] mt-2 opacity-80 italic">ديون والتزامات (مطالبات خارجية)</p>
                </div>
                <div className="bg-white/20 p-3 rounded-2xl">
                  <ArrowLeftRight className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Stats */}
          <Card className="border-0 shadow-xl bg-white border-2 border-slate-50">
            <CardContent className="p-6">
              <p className="text-sm font-black text-slate-400 mb-4 uppercase tracking-tighter">إحصائيات شهر {monthName}</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <span className="text-xs text-slate-500 font-bold">المبالغ المحولة</span>
                  <span className="text-lg font-black text-blue-700">{formatMoney(data.monthStats?.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">العمولات المحققة</span>
                  <span className="text-lg font-black text-emerald-700">{formatMoney(data.monthStats?.totalCommission || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Transfers */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold">
              {isBranch ? `آخر تحويلات الفرع` : 'آخر التحويلات'}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchDashboard}>
              <RefreshCw className="w-4 h-4 ml-1" /> تحديث
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الحوالة</TableHead>
                  <TableHead>المرسل</TableHead>
                  <TableHead>المستلم</TableHead>
                  <TableHead>المكتب المرسل</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                    <TableHead>المطابقة</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentTransfers?.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">لا توجد تحويلات</TableCell></TableRow>
                )}
                {data.recentTransfers?.map((t: Transfer) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">{t.transferNo}</TableCell>
                    <TableCell>{t.senderName}</TableCell>
                    <TableCell>{t.receiverName}</TableCell>
                    <TableCell className="text-sm">{t.senderOffice?.name || '-'}</TableCell>
                    <TableCell className="font-medium">{formatMoney(t.amount)}</TableCell>
                    <TableCell>{statusBadge(t.status)}</TableCell>
                      <TableCell>{t.isVerified ? <Badge className="bg-green-100 text-green-700 border-green-200">مطابقة</Badge> : <Badge variant="outline" className="text-orange-600 border-orange-200">غير مراجعة</Badge>}</TableCell>
                    <TableCell className="text-sm text-gray-500">{t.createdAt ? format(new Date(t.createdAt), 'yyyy/MM/dd HH:mm') : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ===================== OFFICES SCREEN =====================
function OfficesScreen({ user, isAdmin }: { user: User; isAdmin: boolean }) {
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editOffice, setEditOffice] = useState<Office | null>(null)
  const [form, setForm] = useState({ name: '', code: '', type: 'internal', region: '', address: '', phone: '', openingBalance: '0' })
  const { toast } = useToast()

  const fetchOffices = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/offices`)
      setOffices(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/offices`)
        if (!cancelled) setOffices(await res.json())
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const openCreate = () => {
    setEditOffice(null)
    setForm({ name: '', code: '', type: 'internal', region: '', address: '', phone: '', openingBalance: '0' })
    setShowDialog(true)
  }

  const openEdit = (office: Office) => {
    setEditOffice(office)
    setForm({
      name: office.name, code: office.code, type: office.type, region: office.region || '',
      address: office.address || '', phone: office.phone || '', openingBalance: String(office.openingBalance),
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.code) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المكتب والرمز', variant: 'destructive' })
      return
    }
    try {
      if (editOffice) {
        const res = await fetch(`${API_BASE}/offices/${editOffice.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, userId: user.id }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast({ title: 'خطأ', description: data.detail || 'فشل تحديث المكتب', variant: 'destructive' })
          return
        }
        toast({ title: 'تم التحديث', description: 'تم تحديث بيانات المكتب' })
      } else {
        const res = await fetch(`${API_BASE}/offices`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, userId: user.id, userFullName: user.fullName }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast({ title: 'خطأ', description: data.detail || 'فشل إنشاء المكتب', variant: 'destructive' })
          return
        }
        toast({ title: '✅ تم الإنشاء', description: `تم إنشاء مكتب "${form.name}" بنجاح` })
      }
      setShowDialog(false)
      await fetchOffices()
    } catch {
      toast({ title: 'خطأ', description: 'تعذر الاتصال بالخادم', variant: 'destructive' })
    }
  }


  if (!isAdmin && user.officeId) {
    // Branch user: show their office balance only
    return <BranchBalanceScreen officeId={user.officeId} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <Card className="border-0 shadow-sm px-4 py-2">
            <p className="text-sm text-gray-500">إجمالي الأرصدة</p>
            <p className="text-lg font-bold text-green-600">{formatMoney(offices.reduce((s, o) => s + o.currentBalance, 0))}</p>
          </Card>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="bg-blue-700 hover:bg-blue-800">
            <Plus className="w-4 h-4 ml-1" /> إضافة مكتب
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الرمز</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المنطقة</TableHead>
                    <TableHead>الرصيد الافتتاحي</TableHead>
                    <TableHead>الرصيد الحالي</TableHead>
                    <TableHead>الحالة</TableHead>
                    {isAdmin && <TableHead>إجراءات</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offices.map(office => (
                    <TableRow key={office.id}>
                      <TableCell className="font-mono text-sm">{office.code}</TableCell>
                      <TableCell className="font-medium">{office.name}</TableCell>
                      <TableCell>
                        {office.type === 'internal' ? (
                          <Badge variant="outline" className="border-blue-300 text-blue-700">داخلي</Badge>
                        ) : office.type === 'external_foreign' ? (
                          <Badge variant="outline" className="border-green-300 text-green-700">خارجي (عملة أجنبية)</Badge>
                        ) : (
                          <Badge variant="outline" className="border-purple-300 text-purple-700">خارجي</Badge>
                        )}
                      </TableCell>
                      <TableCell>{office.region || '-'}</TableCell>
                      <TableCell>{formatMoney(office.openingBalance)}</TableCell>
                      <TableCell className={`font-bold ${office.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(office.currentBalance)}</TableCell>
                      <TableCell>{office.isActive ? <Badge className="bg-green-100 text-green-800">نشط</Badge> : <Badge className="bg-gray-100 text-gray-600">معطل</Badge>}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(office)}><Edit className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editOffice ? 'تعديل مكتب' : 'إضافة مكتب جديد'}</DialogTitle>
            <DialogDescription>{editOffice ? 'قم بتعديل بيانات المكتب' : 'أدخل بيانات المكتب الجديد'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>اسم المكتب</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div><Label>الرمز</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="mt-1" disabled={!!editOffice} /></div>
            <div>
              <Label>النوع</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as 'percentage' | 'fixed_per_amount' })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">داخلي</SelectItem>
                  <SelectItem value="external">خارجي (عملة محلية)</SelectItem>
                  <SelectItem value="external_foreign">خارجي (عملة أجنبية)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>المنطقة</Label><Input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} className="mt-1" /></div>
            <div><Label>العنوان</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="mt-1" /></div>
            <div><Label>الهاتف</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
            <div><Label>الرصيد الافتتاحي</Label><Input type="text" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} className="bg-blue-700 hover:bg-blue-800">{editOffice ? 'تحديث' : 'إنشاء'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BranchBalanceScreen({ officeId }: { officeId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!officeId) {
      setError("لم يتم تحديد مكتب لهذا المستخدم")
      setLoading(false)
      return
    }
    setError(null)
    fetch(`${API_BASE}/offices/${officeId}/balance`)
      .then(async r => {
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.detail || "حدث خطأ أثناء جلب البيانات")
        }
        return r.json()
      })
      .then(setData)
      .catch((err) => { 
        console.error("Balance Fetch Error:", err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [officeId])

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
  
  if (error) return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-700">عذراً، حدث خطأ</h3>
        <p className="text-red-600 mt-2">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4 border-red-300 text-red-700 hover:bg-red-100">إعادة المحاولة</Button>
      </CardContent>
    </Card>
  )

  if (!data || !data.stats) return <div className="text-center py-10 text-gray-500">لا توجد بيانات متاحة لهذا المكتب حالياً</div>

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-gradient-to-l from-blue-700 to-blue-800 text-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold">{data.name}</h3>
          <p className="text-blue-200 text-sm">{data.code} - {data.region}</p>
          <div className="mt-4">
            <p className="text-blue-200 text-sm">الرصيد الحالي</p>
            <p className="text-3xl font-bold">{formatMoney(data.currentBalance)}</p>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2"><ArrowUpRight className="w-5 h-5 text-green-600" /><span className="text-sm text-gray-500">إجمالي المرسل</span></div>
            <p className="text-xl font-bold text-green-600">{formatMoney(data.stats.totalSent)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2"><ArrowDownLeft className="w-5 h-5 text-blue-600" /><span className="text-sm text-gray-500">إجمالي المستلم</span></div>
            <p className="text-xl font-bold text-blue-600">{formatMoney(data.stats.totalReceived)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2"><CircleDollarSign className="w-5 h-5 text-emerald-600" /><span className="text-sm text-gray-500">إجمالي العمولات</span></div>
            <p className="text-xl font-bold text-emerald-600">{formatMoney(data.stats.totalCommission)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2"><Receipt className="w-5 h-5 text-red-600" /><span className="text-sm text-gray-500">إجمالي المصروفات</span></div>
            <p className="text-xl font-bold text-red-600">{formatMoney(data.stats.totalExpenses)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ===================== PRINT RECEIPT DIALOG =====================
function PrintReceiptDialog({ transfer, onClose }: { transfer: Transfer | null; onClose: () => void }) {
  const [creatorName, setCreatorName] = useState('')

  useEffect(() => {
    if (transfer?.createdBy) {
      let mounted = true
      fetch(`${API_BASE}/users/${transfer.createdBy}`).then(r => r.json()).then(u => { if (mounted) setCreatorName(u.fullName || '') }).catch(() => { })
      return () => { mounted = false }
    }
  }, [transfer])

  const handlePrint = () => {
    window.print()
  }

  if (!transfer) return null

  return (
    <Dialog open={!!transfer} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>إيصال الحوالة</DialogTitle>
          <DialogDescription>معاينة وطباعة إيصال الحوالة</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-2 px-2">
          <div id="print-receipt" className="print-receipt" dir="rtl">
            <div className="border-2 border-blue-800 rounded-lg p-6 space-y-4">
              <div className="text-center border-b-2 border-blue-800 pb-3">
                <h2 className="text-xl font-bold text-blue-800">إيصال حوالة مالية</h2>
                <p className="text-sm text-gray-500">نظام إدارة التحويلات المالية</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">رقم الإيصال:</span> <span className="font-mono font-bold">{transfer.transferNo}</span></div>
                <div><span className="text-gray-500">التاريخ:</span> <span className="font-bold">{format(new Date(transfer.createdAt), 'yyyy/MM/dd HH:mm')}</span></div>
                <div><span className="text-gray-500">الحالة:</span> {statusBadge(transfer.status)}</div>
                <div><span className="text-gray-500">النوع:</span> {typeBadge(transfer.transferType)}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                <p className="text-sm text-gray-600">المبلغ المحوّل</p>
                <p className="text-2xl font-bold text-blue-800">{formatMoney(transfer.amount)}</p>
                <div className="flex justify-center gap-4 mt-2 text-sm">
                  <span>العمولة: <strong className="text-green-600">{formatMoney(transfer.commissionAmount)}</strong></span>
                  <span>الإجمالي: <strong className="text-blue-800">{formatMoney(transfer.amount + transfer.commissionAmount)}</strong></span>
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-sm font-bold text-blue-700 mb-1">بيانات المرسل</p>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <div><span className="text-gray-500">الاسم:</span> {transfer.senderName}</div>
                  {transfer.senderPhone && <div><span className="text-gray-500">الهاتف:</span> {transfer.senderPhone}</div>}
                  <div className="col-span-2"><span className="text-gray-500">المكتب:</span> {transfer.senderOffice?.name || 'غير معروف'}</div>
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-sm font-bold text-green-700 mb-1">بيانات المستلم</p>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <div><span className="text-gray-500">الاسم:</span> {transfer.receiverName}</div>
                  {transfer.receiverPhone && <div><span className="text-gray-500">الهاتف:</span> {transfer.receiverPhone}</div>}
                  <div className="col-span-2"><span className="text-gray-500">المكتب:</span> {transfer.receiverOffice?.name || 'غير معروف'}</div>
                  {transfer.location && <div className="col-span-2"><span className="text-gray-500">مكان الاستلام:</span> <strong className="text-teal-700">{transfer.location}</strong></div>}
                </div>
              </div>
              {transfer.intermediaryOffice && (
                <div className="border rounded-lg p-3 bg-yellow-50">
                  <p className="text-sm font-bold text-yellow-700 mb-1">المكتب الوسيط</p>
                  <p className="text-sm">{transfer.intermediaryOffice?.name || 'غير معروف'}</p>
                </div>
              )}
              {creatorName && (
                <div className="text-sm text-gray-500 text-center border-t pt-2">
                  <span>تم الإنشاء بواسطة: <strong>{creatorName}</strong></span>
                </div>
              )}
              <div className="text-center border-t-2 border-blue-800 pt-3">
                <p className="text-sm text-gray-500">شكراً لتعاملكم معنا</p>
                <p className="text-xs text-gray-400 mt-1">نظام إدارة التحويلات المالية</p>
              </div>
              <div className="grid grid-cols-2 gap-8 mt-4 pt-4">
                <div className="text-center border-t"><p className="text-xs text-gray-500 mt-1">توقيع المرسل</p></div>
                <div className="text-center border-t"><p className="text-xs text-gray-500 mt-1">ختم المكتب</p></div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="shrink-0 print-hide">
          <Button variant="outline" onClick={onClose}>إغلاق</Button>
          <Button onClick={handlePrint} className="bg-blue-700 hover:bg-blue-800">
            <Printer className="w-4 h-4 ml-1" /> طباعة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===================== TRANSFERS SCREEN =====================
function TransfersScreen({ user, isAdmin, adminPhone }: { user: User; isAdmin: boolean; adminPhone?: string }) {
  const [data, setData] = useState<{ transfers: Transfer[]; total: number }>({ transfers: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', type: '', search: '' })
  
  useEffect(() => { setCurrentPage(1) }, [filters])
  const [receiptTransfer, setReceiptTransfer] = useState<Transfer | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editTransfer, setEditTransfer] = useState<Transfer | null>(null)
  const [editForm, setEditForm] = useState({ amount: '', senderName: '', senderPhone: '', receiverName: '', receiverPhone: '', location: '', notes: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const { toast } = useToast()

  const handleVerify = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/transfers/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userFullName: user.fullName })
      })
      if (res.ok) {
        toast({ title: 'تمت المطابقة', description: 'تم وسم العملية كمراجعة' })
        fetchTransfers()
      }
    } catch { toast({ title: 'خطأ', variant: 'destructive' }) }
  }

  const fetchTransfers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.type) params.set('type', filters.type)
      if (filters.search) params.set('search', filters.search)
      if (!isAdmin && user.officeId) params.set('officeId', user.officeId)
      const res = await fetch(`${API_BASE}/transfers?${params}`)
      const json = await res.json()
      setData({ transfers: json, total: json.length })
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const params = new URLSearchParams()
        if (filters.status) params.set('status', filters.status)
        if (filters.type) params.set('type', filters.type)
        if (filters.search) params.set('search', filters.search)
        if (!isAdmin && user.officeId) params.set('officeId', user.officeId)
        const res = await fetch(`${API_BASE}/transfers?${params}`)
        const json = await res.json()
        if (!cancelled) setData({ transfers: json, total: json.length })
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [filters, isAdmin, user.officeId])

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/transfers/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userFullName: user.fullName }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'تم التنفيذ', description: 'تم تنفيذ الحوالة بنجاح' })
      fetchTransfers()
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء تنفيذ الحوالة', variant: 'destructive' })
    }
  }

  const handleCancel = async (id: string) => {
    const t = data.transfers.find(x => x.id === id)
    const msg = t?.status === 'completed' 
      ? 'هذه الحوالة مكتملة ومقيدة مالياً، هل أنت متأكد من إلغائها وعكس العمليات المالية؟'
      : 'هل أنت متأكد من إلغاء هذه الحوالة؟'
      
    if (!confirm(msg)) return

    try {
      const res = await fetch(`${API_BASE}/transfers/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userFullName: user.fullName }),
      })
      if (res.ok) {
        toast({ title: 'تم الإلغاء', description: 'تم إلغاء الحوالة وعكس العمليات المالية بنجاح' })
        fetchTransfers()
      } else {
        const err = await res.json()
        toast({ title: 'خطأ', description: err.detail || 'فشل في إلغاء الحوالة', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const handleShareWhatsApp = (t: Transfer) => {
    if (!adminPhone) {
      toast({ title: 'تنبيه', description: 'يرجى ضبط رقم هاتف المدير في الإعدادات أولاً' })
      return
    }

    let cleanPhone = adminPhone.replace(/[^\d]/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '218' + cleanPhone.substring(1)
    } else if (!cleanPhone.startsWith('218')) {
      cleanPhone = '218' + cleanPhone
    }

    const msg = `آلَآسِم👤《 ${t.receiverName || 'غير معروف'}\n` +
                `آلَهّآtٌفُ 📞《${t.receiverPhone || 'غير معروف'}\n` +
                `آلَمًبًلَغُ  💵《${t.amount} د.ل\n` +
                `آلَمًدٍيَنِه🏙《 ${t.location || t.receiverOffice?.name || 'غير معروف'}\n` +
                ` المرسل👤《${t.senderName || 'غير معروف'}\n` +
                `    هاتف المرسل《 ${t.senderPhone || 'غير معروف'}\n\n` +
                `من مكتب ${t.senderOffice?.name || 'غير معروف'}..`

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank')
  }

  const openEdit = (transfer: Transfer) => {
    setEditTransfer(transfer)
    setEditForm({
      amount: String(transfer.amount),
      senderName: transfer.senderName,
      senderPhone: transfer.senderPhone || '',
      receiverName: transfer.receiverName,
      receiverPhone: transfer.receiverPhone || '',
      location: transfer.location || '',
      notes: transfer.notes || '',
    })
    setShowEditDialog(true)
  }

  const handleUpdate = async () => {
    if (!editTransfer) return
    try {
      const res = await fetch(`${API_BASE}/transfers/${editTransfer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(editForm.amount),
          senderName: editForm.senderName,
          senderPhone: editForm.senderPhone || null,
          receiverName: editForm.receiverName,
          receiverPhone: editForm.receiverPhone || null,
          location: editForm.location || null,
          notes: editForm.notes || null,
          senderOfficeId: editTransfer.senderOfficeId,
          receiverOfficeId: editTransfer.receiverOfficeId,
          intermediaryOfficeId: editTransfer.intermediaryOfficeId,
          createdBy: editTransfer.createdBy,
          userId: user.id,
          userFullName: user.fullName,
          isVerified: editTransfer.isVerified
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'حدث خطأ أثناء تحديث الحوالة')
      toast({ title: 'تم التحديث', description: `تم تعديل الحوالة ${data.transferNo}` })
      setShowEditDialog(false)
      setEditTransfer(null)
      fetchTransfers()
    } catch (error) {
      toast({ title: 'خطأ', description: error instanceof Error ? error.message : 'حدث خطأ', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Input placeholder="بحث برقم الحوالة أو الاسم..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="w-64" />
          <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-32"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="pending">معلق</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.type} onValueChange={v => setFilters({ ...filters, type: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-32"><SelectValue placeholder="النوع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="internal">داخلي</SelectItem>
              <SelectItem value="external">خارجي</SelectItem>
              <SelectItem value="intermediary">عبر وسيط</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchTransfers}><Search className="w-4 h-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الحوالة</TableHead>
                    <TableHead>المرسل</TableHead>
                    <TableHead>المستلم</TableHead>
                    <TableHead>من مكتب</TableHead>
                    <TableHead>إلى مكتب</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>العمولة</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transfers.length === 0 && (
                    <TableRow><TableCell colSpan={12} className="text-center text-gray-400 py-8">لا توجد تحويلات</TableCell></TableRow>
                  )}
                  {data.transfers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.transferNo}</TableCell>
                      <TableCell className="text-sm">{t.senderName}</TableCell>
                      <TableCell className="text-sm">{t.receiverName}</TableCell>
                      <TableCell className="text-xs">{t.senderOffice?.name || 'غير معروف'}</TableCell>
                      <TableCell className="text-xs">{t.receiverOffice?.name || 'غير معروف'}</TableCell>
                      <TableCell className="font-medium">{formatMoney(t.amount)}</TableCell>
                      <TableCell className="text-sm text-green-600">{formatMoney(t.commissionAmount)}</TableCell>
                      <TableCell>{typeBadge(t.transferType)}</TableCell>
                      <TableCell>{statusBadge(t.status)}</TableCell>
                      <TableCell>{t.isVerified ? <Badge className="bg-green-100 text-green-700 border-green-200">مطابقة</Badge> : <Badge variant="outline" className="text-orange-600 border-orange-200">غير مراجعة</Badge>}</TableCell>
                      <TableCell className="text-xs text-teal-600 font-medium">{t.location || '-'}</TableCell>
                      <TableCell className="text-xs text-gray-500">{format(new Date(t.createdAt), 'yyyy/MM/dd')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setReceiptTransfer(t)} title="طباعة الإيصال">
                            <Printer className="w-4 h-4 text-blue-600" />
                          </Button>
                          {t.status !== 'cancelled' ? (
                            <div className="flex items-center gap-1">
                              {t.status === 'pending' && (
                                <>
                                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEdit(t)} title="تعديل">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleComplete(t.id)} title="اعتماد">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {isAdmin && !t.isVerified && <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => handleVerify(t.id)} title="مطابقة مراجعة"><CheckSquare className="w-4 h-4" /></Button>}
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleCancel(t.id)} title="إلغاء">
                                <XCircle className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleShareWhatsApp(t)} title="إرسال للمدير (واتساب)">
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">ملغاة</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <div className="p-4 border-t flex items-center justify-between bg-gray-50/50">
            <div className="text-xs text-gray-500 font-bold">
              عرض {Math.min(data.transfers.length, (currentPage - 1) * pageSize + 1)} - {Math.min(data.transfers.length, currentPage * pageSize)} من أصل {data.total} حوالة
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="bg-white border rounded px-3 py-1 text-xs font-bold shadow-sm">
                صفحة {currentPage} من {Math.ceil(data.total / pageSize) || 1}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(data.total / pageSize), p + 1))} 
                disabled={currentPage >= Math.ceil(data.total / pageSize)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
      <p className="text-sm text-gray-400 text-center">إجمالي: {data.total} حوالة</p>
      <PrintReceiptDialog transfer={receiptTransfer} onClose={() => setReceiptTransfer(null)} />
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تعديل الحوالة</DialogTitle>
            <DialogDescription>يمكن تعديل بيانات الحوالة طالما أنها لا تزال معلقة.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>المبلغ</Label>
                <Input type="text" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>الحالة الحالية</Label>
                <Input value={editTransfer?.status || ''} className="mt-1 bg-gray-100" disabled />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>اسم المرسل</Label>
                <Input value={editForm.senderName} onChange={e => setEditForm({ ...editForm, senderName: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>هاتف المرسل</Label>
                <Input value={editForm.senderPhone} onChange={e => setEditForm({ ...editForm, senderPhone: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>اسم المستلم</Label>
                <Input value={editForm.receiverName} onChange={e => setEditForm({ ...editForm, receiverName: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>هاتف المستلم</Label>
                <Input value={editForm.receiverPhone} onChange={e => setEditForm({ ...editForm, receiverPhone: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>المكان</Label>
                <Input value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} className="mt-1" placeholder="مثال: طرابلس - قرقارش" />
              </div>
              <div></div>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>إلغاء</Button>
            <Button onClick={handleUpdate} className="bg-blue-700 hover:bg-blue-800">حفظ التعديلات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===================== NEW TRANSFER SCREEN =====================
function NewTransferScreen({ user, isAdmin, onCreated, transferType, adminPhone }: { user: User; isAdmin: boolean; onCreated: () => void; transferType?: { type: 'creditor' | 'debtor', action: 'send' | 'receive', name: string } | null, adminPhone?: string }) {
  const [offices, setOffices] = useState<Office[]>([])
  const [isVerified, setIsVerified] = useState(isAdmin)
  const [form, setForm] = useState({
    senderOfficeId: '',
    receiverOfficeId: '',
    intermediaryOfficeId: '',
    amount: '',
    senderName: '',
    senderPhone: '',
    senderType: '' as '' | 'creditor' | 'debtor',
    receiverName: '',
    receiverPhone: '',
    receiverType: '' as '' | 'creditor' | 'debtor',
    location: '',
    notes: '',
    commissionAmount: '',
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successCode, setSuccessCode] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [rules, setRules] = useState<any[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/offices`).then(r => r.json()).then(data => setOffices(data)).catch(() => { })
    fetch(`${API_BASE}/commissions/rules`).then(r => r.json()).then(data => setRules(data)).catch(() => { })
  }, [])

  useEffect(() => {
    if (transferType) {
      if (transferType.action === 'send') {
        setForm(f => ({ ...f, senderName: transferType.name, senderType: transferType.type, receiverType: '' }))
      } else {
        setForm(f => ({ ...f, receiverName: transferType.name, receiverType: transferType.type, senderType: '' }))
      }
    }
  }, [transferType])
  
  useEffect(() => {
    if (!isAdmin && user.officeId) {
      setForm(f => ({ ...f, senderOfficeId: user.officeId || '' }))
    }
  }, [isAdmin, user.officeId])

  const getCommissionFromTotal = (totalVal: number, officeId: string) => {
    const office = offices.find(o => o.id === officeId)
    const officeType = office ? office.type : 'internal'
    
    const activeRules = rules.filter(r => r.isActive && r.transferType === officeType).sort((a,b) => (a.minAmount || 0) - (b.minAmount || 0))
    for (const rule of activeRules) {
        if (rule.type === 'percentage') {
             const net = totalVal / (1 + (rule.value / 100))
             const minOk = rule.minAmount === null || net >= rule.minAmount
             const maxOk = rule.maxAmount === null || net <= rule.maxAmount
             if (minOk && maxOk) return totalVal - net
        } else if (rule.type === 'fixed_per_amount') {
             const buckets = Math.ceil(totalVal / 1000)
             let comm = buckets * rule.value
             let net = totalVal - comm
             if (Math.ceil(net / 1000) < buckets) {
                 comm = (buckets - 1) * rule.value
                 net = totalVal - comm
             }
             const minOk = rule.minAmount === null || net >= rule.minAmount
             const maxOk = rule.maxAmount === null || net <= rule.maxAmount
             if (minOk && maxOk) return comm
        }
    }
    return 0
  }

  const [isForeign, setIsForeign] = useState(false)
  const [foreignForm, setForeignForm] = useState({
    amount: '',
    ourRate: '',
    marketRate: '',
    currency: 'سيفا',
    multiplier: '10'
  })
  const [sendMessageToAdmin, setSendMessageToAdmin] = useState(false)

  const updateCalculations = (total: string) => {
    const totalVal = parseFloat(total) || 0
    setTotalAmount(total)
    
    if (totalVal > 0) {
      const commission = getCommissionFromTotal(totalVal, form.senderOfficeId)
      const net = totalVal - commission
      
      setForm(f => ({
        ...f,
        amount: net.toFixed(2),
        commissionAmount: commission.toFixed(2)
      }))
    } else {
      setForm(f => ({ ...f, amount: '', commissionAmount: '' }))
    }
  }

  const updateForeignCalculations = (field: string, value: string) => {
    const newForeign = { ...foreignForm, [field]: value }
    setForeignForm(newForeign)
    
    const fAmt = parseFloat(newForeign.amount) || 0
    const oRate = parseFloat(newForeign.ourRate) || 0
    const mRate = parseFloat(newForeign.marketRate) || 0
    const mult = parseFloat(newForeign.multiplier) || 1
    
    if (fAmt > 0 && oRate > 0 && mRate > 0) {
      const totalLYD = (fAmt / mult) * oRate
      const costLYD = (fAmt / mult) * mRate
      const profit = totalLYD - costLYD
      
      setTotalAmount(totalLYD.toFixed(2))
      setForm(f => ({
        ...f,
        amount: costLYD.toFixed(2),
        commissionAmount: profit.toFixed(2),
        notes: `تحويل ${fAmt} ${newForeign.currency} - سعر الصرف: ${oRate}/${mult}`
      }))
    }
  }

  const updateByNet = (net: string) => {
    const netVal = parseFloat(net) || 0
    const totalVal = parseFloat(totalAmount) || 0
    if (totalVal > 0) {
      const commission = totalVal - netVal
      setForm(f => ({
        ...f,
        amount: net,
        commissionAmount: commission.toFixed(2)
      }))
    } else {
      setForm(f => ({ ...f, amount: net }))
    }
  }

  const updateByCommission = (comm: string) => {
    const commVal = parseFloat(comm) || 0
    const totalVal = parseFloat(totalAmount) || 0
    if (totalVal > 0) {
      const net = totalVal - commVal
      setForm(f => ({
        ...f,
        amount: net.toFixed(2),
        commissionAmount: comm
      }))
    } else {
      setForm(f => ({ ...f, commissionAmount: comm }))
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    // Validate phones (mandatory and >= 9 digits)
    const phoneRegex = /^\d{9,}$/
    if (!form.senderPhone || !phoneRegex.test(form.senderPhone.replace(/\s/g, ''))) {
      toast({ title: 'خطأ', description: 'رقم هاتف المرسل مطلوب ويجب ألا يقل عن 9 أرقام', variant: 'destructive' })
      return
    }
    if (!form.receiverPhone || !phoneRegex.test(form.receiverPhone.replace(/\s/g, ''))) {
      toast({ title: 'خطأ', description: 'رقم هاتف المستلم مطلوب ويجب ألا يقل عن 9 أرقام', variant: 'destructive' })
      return
    }

    if (!form.senderOfficeId || !form.receiverOfficeId || !form.amount) {
      toast({ title: 'خطأ', description: 'يرجى إدخال جميع البيانات المالية والمكاتب', variant: 'destructive' })
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          commissionAmount: parseFloat(form.commissionAmount) || 0,
          createdBy: user.id,
          userId: user.id,
          userFullName: user.fullName,
          isVerified: isVerified,
          sendMessageToAdmin: sendMessageToAdmin
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'خطأ')
      
      // WhatsApp Direct Link Logic
      if (sendMessageToAdmin && adminPhone) {
        let cleanPhone = adminPhone.replace(/[^\d]/g, '')
        if (cleanPhone.startsWith('0')) {
          cleanPhone = '218' + cleanPhone.substring(1)
        } else if (!cleanPhone.startsWith('218')) {
          cleanPhone = '218' + cleanPhone
        }
        
        const receiverOfficeName = offices.find(o => o.id === form.receiverOfficeId)?.name || 'غير معروف'
        const senderOfficeName = offices.find(o => o.id === form.senderOfficeId)?.name || 'غير معروف'
        
        const msg = `آلَآسِم👤《 ${form.receiverName || 'غير معروف'}\n` +
                    `آلَهّآتٌفُ 📞《${form.receiverPhone || 'غير معروف'}\n` +
                    `آلَمًبًلَغُ  💵《${form.amount} د.ل\n` +
                    `آلَمًدٍيَنِه🏙《 ${form.location || receiverOfficeName}\n` +
                    ` المرسل👤《${form.senderName || 'غير معروف'}\n` +
                    `    هاتف المرسل《 ${form.senderPhone || 'غير معروف'}\n\n` +
                    `من مكتب ${senderOfficeName}..`
                    
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
        window.open(waUrl, '_blank')
      }
      
      toast({ title: 'تم بنجاح!', description: `تم إنشاء الحوالة ${data.transferNo}` })
      setSuccessCode(data.transferNo)
      setShowSuccessModal(true)
    } catch (error) {
      toast({ title: 'خطأ', description: error instanceof Error ? error.message : 'حدث خطأ', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const resetAll = () => {
    setForm({ 
      senderOfficeId: user.role === 'branch' ? (user.officeId || '') : '', 
      receiverOfficeId: '', 
      intermediaryOfficeId: '', 
      amount: '', 
      senderName: '', 
      senderPhone: '', 
      senderType: '', 
      receiverName: '', 
      receiverPhone: '', 
      receiverType: '', 
      location: '', 
      notes: '', 
      commissionAmount: '' 
    })
    setTotalAmount('')
  }

  const availableSenderOffices = isAdmin ? offices : (user.officeId ? offices.filter(o => o.id === user.officeId) : offices.filter(o => o.type === 'internal'))
  const availableReceiverOffices = offices.filter(o => o.id !== form.senderOfficeId)
  const hasIntermediary = !!form.intermediaryOfficeId

  return (
    <div className="max-w-[1100px] mx-auto p-0 sm:p-4 font-tajawal rtl" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: `
        .font-tajawal { font-family: 'Tajawal', sans-serif; }
        .split-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
            overflow: hidden;
            border: 1px solid #e5e7eb;
        }
        .side { padding: 35px; position: relative; }
        .side-green { background: linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%); border-left: 1px solid #d1fae5; }
        .side-red { background: linear-gradient(225deg, #fef2f2 0%, #ffffff 100%); border-right: 1px solid #fee2e2; }
        .big-sign {
            width: 80px; height: 80px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 40px; font-weight: 900; margin: 0 auto 20px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }
        .sign-green { background: linear-gradient(135deg, #059669, #047857); color: white; border: 4px solid #d1fae5; }
        .sign-red { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; border: 4px solid #fee2e2; }
        .side-title { text-align: center; font-size: 20px; font-weight: 900; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid; }
        .side-green .side-title { color: #047857; border-color: #059669; }
        .side-red .side-title { color: #b91c1c; border-color: #dc2626; }
        .amount-field {
            width: 100%; padding: 12px 14px; padding-left: 55px;
            border: 2px solid #e5e7eb; border-radius: 10px;
            font-size: 20px; font-weight: 900; outline: none;
        }
        .side-green .amount-field { color: #047857; border-color: #059669; background: #ecfdf5; }
        .side-red .amount-field { color: #b91c1c; border-color: #dc2626; background: #fef2f2; }
        .side-amount { background: white; border: 2px dashed #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; margin-top: 10px; }
        .side-green .side-amount { border-color: #059669; }
        .side-red .side-amount { border-color: #dc2626; }
        .center-connector {
            position: absolute; top: 50%; left: 0; transform: translate(-50%, -50%);
            width: 44px; height: 44px; background: white; border: 3px solid #e5e7eb;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 18px; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        @media (max-width: 768px) {
            .split-layout { grid-template-columns: 1fr; }
            .center-connector { display: none; }
        }
      ` }} />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-blue-900">🔄 توثيق إرسال حوالة</h1>
        <p className="text-gray-400 mt-2 font-bold">أدخل بيانات الطرفين وسيتم إنشاء القيد المحاسبي المزدوج تلقائياً</p>
      </div>

      <div className="split-layout">
        {/* GREEN SIDE: RECEIVING */}
        <div className="side side-green">
          <div className="big-sign sign-green">+</div>
          <div className="side-title">تسجيل استلام قيمة مالية</div>
          
          <div className="space-y-4">
            <div>
              <Label className="font-extrabold text-gray-600 text-xs mb-1 block">المكتب المستلم للنقود <span className="text-red-500">*</span></Label>
              <Select value={form.senderOfficeId} onValueChange={v => setForm({ ...form, senderOfficeId: v })} disabled={!isAdmin}>
                <SelectTrigger className="bg-white border-2 border-green-200 h-12 font-bold"><SelectValue placeholder="اختر المكتب..." /></SelectTrigger>
                <SelectContent>
                  {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-extrabold text-gray-600 text-xs mb-1 block">اسم المرسل (اختياري)</Label>
              <Input value={form.senderName} onChange={e => setForm({ ...form, senderName: e.target.value })} className="h-12 border-2 font-bold" placeholder="محمد أحمد..." />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="font-extrabold text-gray-600 text-xs mb-1 block">رقم الهاتف (إلزامي) <span className="text-red-500">*</span></Label>
                <Input value={form.senderPhone} onChange={e => setForm({ ...form, senderPhone: e.target.value })} className="h-12 border-2 font-bold" placeholder="09XXXXXXXX" />
              </div>
            </div>
            
            <div>
              <Label className="font-extrabold text-gray-600 text-xs mb-1 block">مكان التسليم (اختياري)</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="h-12 border-2 font-bold" />
            </div>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-black text-blue-900">تحويل عملة أجنبية (صرف)</span>
                </div>
                <Switch checked={isForeign} onCheckedChange={setIsForeign} />
              </div>

              {isForeign && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-black text-blue-600 mb-1 block">المبلغ بالأجنبي (سيفا..)</Label>
                      <Input 
                        type="text" 
                        value={foreignForm.amount} 
                        onChange={e => updateForeignCalculations('amount', e.target.value)} 
                        className="h-10 border-blue-200 focus:border-blue-400 font-bold"
                        placeholder="مثلاً 5000"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-black text-blue-600 mb-1 block">العملة / الوحدة</Label>
                      <div className="flex gap-1">
                        <Input 
                          value={foreignForm.currency} 
                          onChange={e => updateForeignCalculations('currency', e.target.value)}
                          className="h-10 border-blue-200 text-xs px-2"
                        />
                        <Input 
                          type="text"
                          value={foreignForm.multiplier} 
                          onChange={e => updateForeignCalculations('multiplier', e.target.value)}
                          className="h-10 border-blue-200 w-16 text-xs px-2"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-black text-green-600 mb-1 block">سعر البيع للزبون (لنا)</Label>
                      <Input 
                        type="text" 
                        value={foreignForm.ourRate} 
                        onChange={e => updateForeignCalculations('ourRate', e.target.value)} 
                        className="h-10 border-green-200 focus:border-green-400 font-bold"
                        placeholder="مثلاً 150"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-black text-red-600 mb-1 block">سعر السوق (للمكتب)</Label>
                      <Input 
                        type="text" 
                        value={foreignForm.marketRate} 
                        onChange={e => updateForeignCalculations('marketRate', e.target.value)} 
                        className="h-10 border-red-200 focus:border-red-400 font-bold"
                        placeholder="مثلاً 148"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-white p-2 rounded border border-blue-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-500">ربح الصرف المتوقع:</span>
                    <span className="text-sm font-black text-emerald-600">
                      {formatMoney((parseFloat(totalAmount) || 0) - (parseFloat(form.amount) || 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-black text-orange-900">إرسال تنبيه فوري لمدير النظام</span>
                </div>
                <Switch checked={sendMessageToAdmin} onCheckedChange={setSendMessageToAdmin} />
              </div>
            </div>

            {!isForeign && (
              <div>
                <Label className="font-extrabold text-gray-600 text-xs mb-1 block">قيمة الحوالة المستلمة (شامل العمولة) <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={totalAmount} 
                    onChange={e => updateCalculations(e.target.value)} 
                    className="amount-field" 
                    placeholder="0.00"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 bg-gray-100 px-2 py-1 rounded text-xs font-black text-gray-500">د.ل</span>
                </div>
              </div>
            )}

            <div className="side-amount">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">المبلغ المستلم لهذا المكتب (+)</p>
              <p className="text-3xl font-black text-green-600">{formatMoney(parseFloat(totalAmount) || 0)}</p>
            </div>
          </div>
        </div>

        {/* RED SIDE: PAYING */}
        <div className="side side-red">
          <div className="center-connector">⇄</div>
          <div className="big-sign sign-red">−</div>
          <div className="side-title">بيانات صرف الحوالة</div>

          <div className="space-y-4">
            <div>
              <Label className="font-extrabold text-gray-600 text-xs mb-1 block">المكتب الدافع <span className="text-red-500">*</span></Label>
              <Select value={form.receiverOfficeId} onValueChange={v => setForm({ ...form, receiverOfficeId: v })}>
                <SelectTrigger className="bg-white border-2 border-red-200 h-12 font-bold"><SelectValue placeholder="اختر المكتب..." /></SelectTrigger>
                <SelectContent>
                  {offices.filter(o => o.id !== form.senderOfficeId).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-extrabold text-gray-600 text-xs mb-1 block">اسم المستلم النهائي (اختياري)</Label>
              <Input value={form.receiverName} onChange={e => setForm({ ...form, receiverName: e.target.value })} className="h-12 border-2 font-bold" placeholder="خالد محمود..." />
            </div>

            <div>
              <Label className="font-extrabold text-gray-600 text-xs mb-1 block">رقم هاتف المستلم (إلزامي) <span className="text-red-500">*</span></Label>
              <Input value={form.receiverPhone} onChange={e => setForm({ ...form, receiverPhone: e.target.value })} className="h-12 border-2 font-bold" placeholder="09XXXXXXXX" />
            </div>

            <div>
              <Label className="font-extrabold text-gray-600 text-xs mb-1 block">صافي قيمة الحوالة (المبلغ المسجل للمستلم)</Label>
              <div className="relative">
                <input 
                  type="text" 
                  value={form.amount} 
                  onChange={e => updateByNet(e.target.value)} 
                  className="amount-field" 
                  placeholder="0.00"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 bg-gray-100 px-2 py-1 rounded text-xs font-black text-gray-500">د.ل</span>
              </div>
            </div>

            <div className="side-amount">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">المبلغ المستحق الدفع من هذا المكتب (-)</p>
              <p className="text-3xl font-black text-red-600">{formatMoney(parseFloat(form.amount) || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-xl p-8">
        <h3 className="text-center font-black text-blue-900 mb-6 uppercase tracking-widest text-sm">⚙️ تفاصيل العملية المالية</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-50 border-2 border-gray-100 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">المبلغ الإجمالي (المستلم)</p>
            <p className="text-2xl font-black text-green-600">{formatMoney(parseFloat(totalAmount) || 0)}</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center ring-2 ring-blue-100">
            <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">الصافي (يدوي ✍️)</p>
            <input 
              type="text" 
              value={form.amount} 
              onChange={e => updateByNet(e.target.value)}
              className="w-full bg-transparent text-center text-2xl font-black text-blue-700 outline-none"
            />
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center ring-2 ring-red-100 relative group">
            <p className="text-[10px] font-bold text-red-400 uppercase mb-1">العمولة (يدوي ✍️)</p>
            <input 
              type="text" 
              value={form.commissionAmount} 
              onChange={e => updateByCommission(e.target.value)}
              className="w-full bg-transparent text-center text-2xl font-black text-red-600 outline-none"
            />
            <button 
              onClick={() => updateCalculations(totalAmount)}
              className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity font-bold"
              title="إعادة الحساب تلقائياً (1%)"
            >
              🔄 تلقائي
            </button>
          </div>
        </div>

        <div className="mb-6">
          <Label className="font-bold text-xs text-gray-500 mb-2 block">ملاحظات إضافية</Label>
          <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="h-12 border-2 font-bold" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            className="flex-1 h-16 text-xl font-black bg-gradient-to-r from-blue-900 to-blue-700 hover:scale-[1.02] transition-transform shadow-xl"
            disabled={loading || !totalAmount || !form.senderOfficeId || !form.receiverOfficeId || !form.senderPhone || !form.receiverPhone}
            onClick={() => handleSubmit()}
          >
            {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : '✅ تأكيد إنشاء الحوالة'}
          </Button>
          <Button variant="outline" className="h-16 px-8 font-bold border-2 hover:bg-gray-50" onClick={resetAll}>
            🗑️ إلغاء
          </Button>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[24px] shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black">✓</div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">تم إنشاء الحوالة بنجاح</h2>
            <p className="text-gray-400 text-sm mb-6 font-bold">رقم العملية المرجعي:</p>
            <div className="bg-blue-900 text-white py-3 px-6 rounded-xl font-black text-2xl tracking-widest inline-block mb-6 shadow-lg">{successCode}</div>
            <p className="text-xs text-gray-400 font-medium mb-8">تم تحديث رصيد المكتب المستلم (+) وخفض رصيد المكتب الدافع (-)</p>
            <Button className="w-full h-12 bg-gray-900 hover:bg-black text-white font-black" onClick={() => { setShowSuccessModal(false); onCreated() }}>حسناً</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ===================== COMMISSIONS SCREEN =====================
function CommissionsScreen({ user, isAdmin }: { user: User; isAdmin: boolean }) {
  const [rules, setRules] = useState<CommissionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editRule, setEditRule] = useState<CommissionRule | null>(null)
  const [form, setForm] = useState({
    name: '',
    type: 'percentage' as 'percentage' | 'fixed_per_amount',
    transferType: 'internal' as 'internal' | 'external' | 'external_foreign',
    value: '',
    minAmount: '',
    maxAmount: '',
    isActive: 'true',
  })
  const [distRules, setDistRules] = useState<{ partyType: string; percentage: string }[]>([
    { partyType: 'sender', percentage: '100' },
  ])
  const [distPreset, setDistPreset] = useState('sender_only')
  const { toast } = useToast()

  const fetchRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/commissions/rules`)
      const data = await res.json()
      setRules(data)
    } catch { }
  }

  useEffect(() => {
    fetchRules().finally(() => setLoading(false))
  }, [])

  const openCreate = (transferType: 'internal' | 'external' | 'external_foreign') => {
    setEditRule(null)
    setForm({
      name: '',
      type: 'percentage',
      transferType,
      value: '',
      minAmount: '',
      maxAmount: '',
      isActive: 'true',
    })
    setDistRules(transferType === 'external' ? [
      { partyType: 'sender', percentage: '40' },
      { partyType: 'intermediary', percentage: '20' },
      { partyType: 'receiver', percentage: '40' },
    ] : [{ partyType: 'sender', percentage: '100' }])
    setDistPreset(transferType === 'external' ? 'three_party' : 'sender_only')
    setShowDialog(true)
  }

  const openEdit = (rule: CommissionRule) => {
    setEditRule(rule)
    setForm({
      name: rule.name,
      type: rule.type as 'percentage' | 'fixed_per_amount',
      transferType: (rule.transferType || 'internal') as 'internal' | 'external' | 'external_foreign',
      value: String(rule.value),
      minAmount: String(rule.minAmount || ''),
      maxAmount: String(rule.maxAmount || ''),
      isActive: rule.isActive ? 'true' : 'false',
    })
    setDistRules(rule.distributionRules.map(dr => ({
      partyType: dr.partyType,
      percentage: String(dr.percentage),
    })))
    setDistPreset('custom')
    setShowDialog(true)
  }

  const applyPreset = (key: string) => {
    setDistPreset(key)
    if (key === 'sender_only') {
      setDistRules([{ partyType: 'sender', percentage: '100' }])
    } else if (key === 'sender_receiver') {
      setDistRules([
        { partyType: 'sender', percentage: '50' },
        { partyType: 'receiver', percentage: '50' },
      ])
    } else if (key === 'three_party') {
      setDistRules([
        { partyType: 'sender', percentage: '40' },
        { partyType: 'intermediary', percentage: '20' },
        { partyType: 'receiver', percentage: '40' },
      ])
    } else if (key === 'sender_hq') {
      setDistRules([
        { partyType: 'sender', percentage: '50' },
        { partyType: 'hq', percentage: '50' },
      ])
    } else if (key === 'sender_hq_receiver') {
      setDistRules([
        { partyType: 'sender', percentage: '40' },
        { partyType: 'hq', percentage: '20' },
        { partyType: 'receiver', percentage: '40' },
      ])
    } else if (key === 'hq_only') {
      setDistRules([{ partyType: 'hq', percentage: '100' }])
    }
  }

  const handleSave = async () => {
    const totalPerc = distRules.reduce((s, dr) => s + (parseFloat(dr.percentage) || 0), 0)
    if (totalPerc !== 100) { toast({ title: 'خطأ', description: 'مجموع نسب التوزيع يجب أن يساوي 100%', variant: 'destructive' }); return }
    try {
      const body = { name: form.name, type: form.type, transferType: form.transferType, value: parseFloat(form.value), minAmount: form.minAmount ? parseFloat(form.minAmount) : null, maxAmount: form.maxAmount ? parseFloat(form.maxAmount) : null, isActive: form.isActive === 'true', distributionRules: distRules.map(dr => ({ partyType: dr.partyType, percentage: parseFloat(dr.percentage) })), userId: user.id, userFullName: user.fullName }
      let response: Response
      if (editRule) {
        response = await fetch(`${API_BASE}/commissions/rules/${editRule.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        response = await fetch(`${API_BASE}/commissions/rules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'خطأ غير معروف' }))
        toast({ title: 'خطأ', description: errData.error || 'فشل في حفظ القاعدة', variant: 'destructive' }); return
      }
      toast({ title: editRule ? 'تم التحديث' : 'تم الإنشاء' })
      setShowDialog(false)
      await fetchRules()
    } catch (err) { console.error('خطأ في الحفظ:', err); toast({ title: 'خطأ', description: 'فشل في حفظ القاعدة', variant: 'destructive' }) }
  }

  const handleDelete = async (id: string) => { try { const r = await fetch(`${API_BASE}/commissions/rules/${id}`, { method: 'DELETE' }); if (r.ok) { toast({ title: 'تم الحذف' }); await fetchRules() } else { toast({ title: 'خطأ', variant: 'destructive' }) } } catch { toast({ title: 'خطأ', variant: 'destructive' }) } }

  const toggleActive = async (rule: CommissionRule) => {
    try {
      const r = await fetch(`${API_BASE}/commissions/rules/${rule.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...rule, isActive: !rule.isActive, distributionRules: rule.distributionRules }) })
      if (r.ok) { toast({ title: rule.isActive ? 'تم تعطيل القاعدة' : 'تم تفعيل القاعدة' }); await fetchRules() } else { toast({ title: 'خطأ', variant: 'destructive' }) }
    } catch { toast({ title: 'خطأ', variant: 'destructive' }) }
  }

  if (!isAdmin) return <Card className="border-0 shadow-sm p-6"><p className="text-center text-gray-400">ليس لديك صلاحية الوصول</p></Card>

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>

  const totalPerc = distRules.reduce((s, dr) => s + (parseFloat(dr.percentage) || 0), 0)
  const rulesArray = Array.isArray(rules) ? rules : []
  const internalRules = rulesArray.filter(r => (r.transferType || 'internal') === 'internal')
  const externalRules = rulesArray.filter(r => (r.transferType || 'internal') === 'external')
  const foreignRules = rulesArray.filter(r => r.transferType === 'external_foreign')

  // التوزيعات المقترحة حسب نوع التحويل
  const currentPresets = form.transferType === 'external' || form.transferType === 'external_foreign' ? [
    { key: 'sender_only', label: 'للمرسل فقط', desc: '100%' },
    { key: 'sender_receiver', label: 'مناصفة', desc: '50-50' },
    { key: 'three_party', label: '3 أطراف (مع وسيط)', desc: '40-20-40' },
    { key: 'sender_hq', label: 'مرسل + مركز', desc: '50-50' },
    { key: 'custom', label: 'تخصيص', desc: 'يدوي' },
  ] : [
    { key: 'sender_only', label: 'للمرسل فقط', desc: '100%' },
    { key: 'sender_receiver', label: 'مناصفة', desc: '50-50' },
    { key: 'sender_hq_receiver', label: '3 أطراف (مع مركز)', desc: '40-20-40' },
    { key: 'hq_only', label: 'للمركز', desc: '100%' },
    { key: 'sender_hq', label: 'مرسل + مركز', desc: '50-50' },
    { key: 'custom', label: 'تخصيص', desc: 'يدوي' },
  ]

  const partyLabel = (t: string) => t === 'sender' ? 'المكتب المرسل' : t === 'receiver' ? 'المكتب المستلم' : t === 'intermediary' ? 'المكتب الوسيط' : t === 'hq' ? 'المركز الرئيسي' : t

  const renderRuleCard = (rule: CommissionRule) => (
    <Card key={rule.id} className={`border-0 shadow-sm ${rule.isActive ? '' : 'opacity-60'}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold">{rule.name}</h3>
            <Badge className={rule.transferType === 'internal' ? 'bg-blue-100 text-blue-800 text-xs' : rule.transferType === 'external_foreign' ? 'bg-green-100 text-green-800 text-xs' : 'bg-orange-100 text-orange-800 text-xs'}>
              {rule.transferType === 'internal' ? '🔄 داخلي' : rule.transferType === 'external_foreign' ? '💵 خارجي (أجنبي)' : '🌐 خارجي'}
            </Badge>
            {rule.isActive ? <Badge className="bg-green-100 text-green-800 text-xs">نشط</Badge> : <Badge className="bg-gray-100 text-gray-600 text-xs">معطل</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => toggleActive(rule)} title={rule.isActive ? 'تعطيل' : 'تفعيل'}>
              {rule.isActive ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}><Edit className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(rule.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="space-y-1 text-sm">
          <p>طريقة الحساب: {rule.type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت لكل 1,000'}</p>
          <p className="font-medium">القيمة: {rule.type === 'percentage' ? `${toArabicNumerals(String(rule.value))}%` : `${toArabicNumerals(String(rule.value))} د.ل لكل 1,000 د.ل`}</p>
          {rule.minAmount && <p>الحد الأدنى: {formatMoney(rule.minAmount)}</p>}
          {rule.maxAmount && <p>الحد الأقصى: {formatMoney(rule.maxAmount)}</p>}
          <div className="mt-3 pt-3 border-t">
            <p className="text-gray-500 mb-2 font-medium">توزيع العمولة:</p>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="border-b"><th className="text-right p-2 font-medium">الجهة</th><th className="text-center p-2 font-medium">النسبة</th></tr></thead>
                <tbody>
                  {rule.distributionRules.map(dr => (
                    <tr key={dr.id} className="border-b last:border-0">
                      <td className="p-2">{partyLabel(dr.partyType)}</td>
                      <td className="p-2 text-center font-bold text-purple-700">{toArabicNumerals(String(dr.percentage))}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="mt-3 bg-blue-50 rounded-lg p-3 text-xs text-blue-700 border border-blue-100">
          <p className="font-medium mb-1">أمثلة حسابية:</p>
          {[1000, 1500, 2500].map(amt => { let comm = 0; if (rule.type === 'fixed_per_amount') { comm = Math.ceil(amt / 1000) * rule.value } else { comm = Math.ceil((amt * rule.value) / 100) }; return <p key={amt}>{formatMoney(amt)} ← العمولة: {formatMoney(comm)}</p> })}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* ===== قسم التحويلات الداخلية ===== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-800 rounded-xl p-2"><Building2 className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-blue-800">تحويلات داخلية</h3>
              <p className="text-xs text-gray-500">بين مكاتب وفروع المؤسسة</p>
            </div>
            <Badge className="bg-blue-100 text-blue-800">{toArabicNumerals(String(internalRules.length))} قاعدة</Badge>
          </div>
          <Button onClick={() => openCreate('internal')} className="bg-blue-700 hover:bg-blue-800"><Plus className="w-4 h-4 ml-1" /> إضافة قاعدة</Button>
        </div>
        {internalRules.length === 0 ? (
          <Card className="border-0 shadow-sm p-6 text-center border-2 border-dashed border-blue-200 bg-blue-50/30">
            <p className="text-blue-400 text-sm">لا توجد قواعد عمولة للتحويلات الداخلية</p>
            <Button onClick={() => openCreate('internal')} variant="outline" className="mt-3 text-blue-700 border-blue-300"><Plus className="w-4 h-4 ml-1" /> إنشاء قاعدة</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{internalRules.map(renderRuleCard)}</div>
        )}
      </div>

      <Separator />

      {/* ===== قسم التحويلات الخارجية (عملة أجنبية) ===== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 text-green-800 rounded-xl p-2"><Coins className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-green-800">تحويلات خارجية (عملة أجنبية)</h3>
              <p className="text-xs text-gray-500">خاصة بالمكاتب التي تتعامل بالعملات الأجنبية</p>
            </div>
            <Badge className="bg-green-100 text-green-800">{toArabicNumerals(String(foreignRules.length))} قاعدة</Badge>
          </div>
          <Button onClick={() => openCreate('external_foreign')} className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 ml-1" /> إضافة قاعدة</Button>
        </div>
        {foreignRules.length === 0 ? (
          <Card className="border-0 shadow-sm p-6 text-center border-2 border-dashed border-green-200 bg-green-50/30">
            <p className="text-green-400 text-sm">لا توجد قواعد عمولة للتحويلات الخارجية (عملة أجنبية)</p>
            <Button onClick={() => openCreate('external_foreign')} variant="outline" className="mt-3 text-green-700 border-green-300"><Plus className="w-4 h-4 ml-1" /> إنشاء قاعدة</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{foreignRules.map(renderRuleCard)}</div>
        )}
      </div>

      <Separator />

      {/* ===== قسم التحويلات الخارجية ===== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 text-orange-800 rounded-xl p-2"><Globe className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-orange-800">تحويلات خارجية</h3>
              <p className="text-xs text-gray-500">بين مكتب داخل المؤسسة ومكتب خارجي (قد يشارك وسيط داخلي)</p>
            </div>
            <Badge className="bg-orange-100 text-orange-800">{toArabicNumerals(String(externalRules.length))} قاعدة</Badge>
          </div>
          <Button onClick={() => openCreate('external')} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 ml-1" /> إضافة قاعدة</Button>
        </div>
        {externalRules.length === 0 ? (
          <Card className="border-0 shadow-sm p-6 text-center border-2 border-dashed border-orange-200 bg-orange-50/30">
            <p className="text-orange-400 text-sm">لا توجد قواعد عمولة للتحويلات الخارجية</p>
            <Button onClick={() => openCreate('external')} variant="outline" className="mt-3 text-orange-700 border-orange-300"><Plus className="w-4 h-4 ml-1" /> إنشاء قاعدة</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{externalRules.map(renderRuleCard)}</div>
        )}
      </div>

      {/* ===== نافذة إضافة/تعديل ===== */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRule ? 'تعديل قاعدة العمولة' : 'إضافة قاعدة عمولة جديدة'}</DialogTitle>
            <DialogDescription>{editRule ? 'قم بتعديل بيانات قاعدة العمولة' : 'أدخل بيانات قاعدة العمولة الجديدة'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* نوع التحويل */}
            <div>
              <Label className="text-base font-medium">نوع التحويل <span className="text-red-500">*</span></Label>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <button type="button" onClick={() => setForm({ ...form, transferType: 'internal' })} className={`p-4 rounded-xl border-2 text-center transition-all ${form.transferType === 'internal' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                  <div className="text-2xl mb-1">🔄</div>
                  <p className={`font-bold text-sm ${form.transferType === 'internal' ? 'text-blue-700' : 'text-gray-700'}`}>داخلي</p>
                </button>
                <button type="button" onClick={() => setForm({ ...form, transferType: 'external' })} className={`p-4 rounded-xl border-2 text-center transition-all ${form.transferType === 'external' ? 'border-orange-600 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-300'}`}>
                  <div className="text-2xl mb-1">🌐</div>
                  <p className={`font-bold text-sm ${form.transferType === 'external' ? 'text-orange-700' : 'text-gray-700'}`}>خارجي</p>
                </button>
                <button type="button" onClick={() => setForm({ ...form, transferType: 'external_foreign' })} className={`p-4 rounded-xl border-2 text-center transition-all ${form.transferType === 'external_foreign' ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300'}`}>
                  <div className="text-2xl mb-1">💵</div>
                  <p className={`font-bold text-sm ${form.transferType === 'external_foreign' ? 'text-green-700' : 'text-gray-700'}`}>أجنبي</p>
                </button>
              </div>
            </div>
            <Separator />
            <div><Label>اسم القاعدة *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="مثال: العمولة القياسية" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>طريقة الحساب</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v as 'percentage' | 'fixed_per_amount' })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">نسبة مئوية</SelectItem><SelectItem value="fixed_per_amount">مبلغ ثابت لكل 1,000</SelectItem></SelectContent></Select></div>
              <div><Label>القيمة *</Label><Input type="text" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الحد الأدنى</Label><Input type="text" value={form.minAmount} onChange={e => setForm({ ...form, minAmount: e.target.value })} className="mt-1" placeholder="0" /></div>
              <div><Label>الحد الأقصى</Label><Input type="text" value={form.maxAmount} onChange={e => setForm({ ...form, maxAmount: e.target.value })} className="mt-1" placeholder="بدون حد" /></div>
            </div>
            <div><Label>الحالة</Label><Select value={form.isActive} onValueChange={v => setForm({ ...form, isActive: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">نشط</SelectItem><SelectItem value="false">معطل</SelectItem></SelectContent></Select></div>
            <Separator />
            <div className="space-y-3">
              <Label className="text-base font-medium text-purple-700">توزيع العمولة بين الأطراف</Label>
              {form.transferType === 'external' && (
                <div className="bg-orange-50 rounded-lg p-3 text-xs text-orange-700 border border-orange-200">
                  💡 في التحويل الخارجي قد يشارك مكتب وسيط داخلي. القاعدة ثلاثية الأطراف تخصص جزءاً للوسيط.
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {currentPresets.map(p => (
                  <button key={p.key} type="button" onClick={() => applyPreset(p.key)} className={`p-2 rounded-lg border text-xs text-center transition-all ${distPreset === p.key ? 'bg-purple-700 text-white border-purple-700' : 'bg-white hover:border-purple-300'}`}>
                    <p className="font-medium">{p.label}</p><p className="opacity-75">{p.desc}</p>
                  </button>
                ))}
              </div>
              <div className="bg-gray-50 rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100"><tr><th className="text-right p-2 font-medium text-xs">الجهة</th><th className="text-center p-2 font-medium text-xs">النسبة %</th><th className="text-center p-2 font-medium text-xs">حذف</th></tr></thead>
                  <tbody>
                    {distRules.map((dr, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2"><Select value={dr.partyType} onValueChange={v => { const u = [...distRules]; u[i] = { ...u[i], partyType: v }; setDistRules(u); setDistPreset('custom') }}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sender">المكتب المرسل</SelectItem><SelectItem value="receiver">المكتب المستلم</SelectItem><SelectItem value="intermediary">المكتب الوسيط</SelectItem><SelectItem value="hq">المركز الرئيسي</SelectItem></SelectContent></Select></td>
                        <td className="p-2"><Input type="text" value={dr.percentage} onChange={e => { const u = [...distRules]; u[i] = { ...u[i], percentage: e.target.value }; setDistRules(u) }} className="w-16 text-center mx-auto h-8 text-xs" /></td>
                        <td className="p-2 text-center">{distRules.length > 1 && <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => { setDistRules(distRules.filter((_, idx) => idx !== i)); setDistPreset('custom') }}><X className="w-3 h-3" /></Button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-2 border-t bg-gray-100 flex items-center justify-between">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setDistRules([...distRules, { partyType: 'sender', percentage: '0' }]); setDistPreset('custom') }}><Plus className="w-3 h-3 ml-1" /> إضافة جهة</Button>
                  <span className={`text-xs font-bold ${totalPerc === 100 ? 'text-green-600' : 'text-red-600'}`}>المجموع: {toArabicNumerals(String(totalPerc))}%{totalPerc !== 100 && ' ⚠ يجب 100%'}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} className="bg-blue-700 hover:bg-blue-800" disabled={!form.name || totalPerc !== 100}>{editRule ? 'تحديث' : 'إنشاء'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===================== EXPENSES SCREEN =====================
function ExpensesScreen({ user, isAdmin }: { user: User; isAdmin: boolean }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({ officeId: '', description: '', amount: '', category: '', notes: '' })
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (!isAdmin && user.officeId) params.set('officeId', user.officeId)
    const [expRes, offRes] = await Promise.all([
      fetch(`${API_BASE}/expenses?${params}`),
      isAdmin ? fetch(`${API_BASE}/offices`) : Promise.resolve(null),
    ])
    setExpenses(await expRes.json())
    if (offRes) setOffices(await offRes.json())
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const params = new URLSearchParams()
      if (!isAdmin && user.officeId) params.set('officeId', user.officeId)
      const [expRes, offRes] = await Promise.all([
        fetch(`${API_BASE}/expenses?${params}`),
        isAdmin ? fetch(`${API_BASE}/offices`) : Promise.resolve(null),
      ])
      if (!cancelled) {
        setExpenses(await expRes.json())
        if (offRes) setOffices(await offRes.json())
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [isAdmin, user.officeId])

  const handleCreate = async () => {
    if (!form.description || !form.amount) return
    try {
      await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          officeId: form.officeId || null,
          createdBy: user.id,
          userId: user.id,
          userFullName: user.fullName,
        }),
      })
      toast({ title: 'تم الإنشاء', description: 'تم إنشاء المصروف بنجاح' })
      setShowDialog(false)
      setForm({ officeId: '', description: '', amount: '', category: '', notes: '' })
      fetchData()
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' })
      toast({ title: 'تم الحذف' })
      fetchData()
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Card className="border-0 shadow-sm px-4 py-2">
          <p className="text-sm text-gray-500">إجمالي المصروفات</p>
          <p className="text-lg font-bold text-red-600">{formatMoney(totalExpenses)}</p>
        </Card>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-700 hover:bg-blue-800">
          <Plus className="w-4 h-4 ml-1" /> إضافة مصروف
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>المكتب</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">لا توجد مصروفات</TableCell></TableRow>
                  )}
                  {expenses.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{format(new Date(e.expenseDate), 'yyyy/MM/dd')}</TableCell>
                      <TableCell>{e.description}</TableCell>
                      <TableCell className="text-sm">{e.office?.name || 'المركز الرئيسي'}</TableCell>
                      <TableCell>{e.category || '-'}</TableCell>
                      <TableCell className="font-medium text-red-600">{formatMoney(e.amount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(e.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مصروف جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {isAdmin && (
              <div>
                <Label>المكتب (اختياري)</Label>
                <Select value={form.officeId} onValueChange={v => setForm({ ...form, officeId: v === 'hq' ? '' : v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="المركز الرئيسي" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hq">المركز الرئيسي</SelectItem>
                    {offices.filter(o => o.type === 'internal').map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>الوصف *</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
            <div><Label>المبلغ *</Label><Input type="text" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="mt-1" /></div>
            <div><Label>التصنيف</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="mt-1" placeholder="مثال: إيجار، رواتب..." /></div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleCreate} className="bg-blue-700 hover:bg-blue-800">إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===================== CREDITORS SCREEN =====================
function CreditorsScreen({ user, isAdmin, setTransferType, setScreen }: { user: User; isAdmin: boolean; setTransferType: (type: { type: 'creditor' | 'debtor', action: 'send' | 'receive', name: string } | null) => void; setScreen: (screen: Screen) => void }) {
  const [creditors, setCreditors] = useState<Creditor[]>([])
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [selectedCreditor, setSelectedCreditor] = useState<Creditor | null>(null)
  const [actionType, setActionType] = useState<'deposit' | 'withdraw'>('deposit')
  const [createForm, setCreateForm] = useState({ name: '', phone: '', initialDeposit: '', officeId: '', notes: '' })
  const [actionAmount, setActionAmount] = useState('')
  const [actionDesc, setActionDesc] = useState('')
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (!isAdmin && user.officeId) params.set('officeId', user.officeId)
    const [credRes, offRes] = await Promise.all([
      fetch(`${API_BASE}/creditors?${params}`),
      isAdmin ? fetch(`${API_BASE}/offices`) : Promise.resolve(null),
    ])
    setCreditors(await credRes.json())
    if (offRes) setOffices(await offRes.json())
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const params = new URLSearchParams()
      if (!isAdmin && user.officeId) params.set('officeId', user.officeId)
      const [credRes, offRes] = await Promise.all([
        fetch(`${API_BASE}/creditors?${params}`),
        isAdmin ? fetch(`${API_BASE}/offices`) : Promise.resolve(null),
      ])
      if (!cancelled) {
        setCreditors(await credRes.json())
        if (offRes) setOffices(await offRes.json())
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [isAdmin, user.officeId])

  const handleCreate = async () => {
    if (!createForm.name) return
    try {
      if (selectedCreditor) {
        // Update mode
        const res = await fetch(`${API_BASE}/creditors/${selectedCreditor.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...createForm, initialDeposit: parseFloat(createForm.initialDeposit) || 0, userId: user.id, userFullName: user.fullName }),
        })
        if (res.ok) {
          toast({ title: 'تم التحديث' })
        } else {
          throw new Error()
        }
      } else {
        // Create mode
        await fetch(`${API_BASE}/creditors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...createForm, initialDeposit: parseFloat(createForm.initialDeposit) || 0, userId: user.id, userFullName: user.fullName }),
        })
        toast({ title: 'تم الإنشاء' })
      }
      setShowCreateDialog(false)
      setSelectedCreditor(null)
      setCreateForm({ name: '', phone: '', initialDeposit: '', officeId: '', notes: '' })
      fetchData()
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const openEdit = (c: Creditor) => {
    setSelectedCreditor(c)
    setCreateForm({
      name: c.name,
      phone: c.phone || '',
      initialDeposit: String(c.totalDeposit),
      officeId: c.officeId || '',
      notes: c.notes || '',
    })
    setShowCreateDialog(true)
  }

  const handleAction = async () => {
    if (!selectedCreditor || !actionAmount) return
    try {
      const url = actionType === 'deposit'
        ? `${API_BASE}/creditors/${selectedCreditor.id}/deposit`
        : `${API_BASE}/creditors/${selectedCreditor.id}/withdraw`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(actionAmount), description: actionDesc, userId: user.id, userFullName: user.fullName }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'خطأ')
      }
      toast({ title: actionType === 'deposit' ? 'تم الإيداع' : 'تم السحب' })
      setShowActionDialog(false)
      setActionAmount('')
      setActionDesc('')
      fetchData()
    } catch (error) {
      toast({ title: 'خطأ', description: error instanceof Error ? error.message : 'حدث خطأ', variant: 'destructive' })
    }
  }

  const openAction = (creditor: Creditor, type: 'deposit' | 'withdraw') => {
    setSelectedCreditor(creditor)
    setActionType(type)
    setActionAmount('')
    setActionDesc('')
    setShowActionDialog(true)
  }

  const totalDeposits = creditors.reduce((s, c) => s + c.totalDeposit, 0)
  const totalBalance = creditors.reduce((s, c) => s + c.currentBalance, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-3">
          <Card className="border-0 shadow-sm px-4 py-2">
            <p className="text-sm text-gray-500">إجمالي الإيداعات</p>
            <p className="text-lg font-bold text-green-600">{formatMoney(totalDeposits)}</p>
          </Card>
          <Card className="border-0 shadow-sm px-4 py-2">
            <p className="text-sm text-gray-500">إجمالي الأرصدة</p>
            <p className="text-lg font-bold text-blue-600">{formatMoney(totalBalance)}</p>
          </Card>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-700 hover:bg-blue-800">
          <Plus className="w-4 h-4 ml-1" /> إضافة دائن
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>إجمالي الإيداعات</TableHead>
                    <TableHead>الرصيد</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditors.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">لا يوجد دائنون</TableCell></TableRow>
                  )}
                  {creditors.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.phone || '-'}</TableCell>
                      <TableCell>{formatMoney(c.totalDeposit)}</TableCell>
                      <TableCell className="font-bold text-green-600">{formatMoney(c.currentBalance)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button variant="ghost" size="sm" className="text-green-600" onClick={() => openAction(c, 'deposit')}><ArrowUpRight className="w-4 h-4 ml-1" /> إيداع</Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => openAction(c, 'withdraw')}><ArrowDownLeft className="w-4 h-4 ml-1" /> سحب</Button>
                          <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => { setTransferType({ type: 'creditor', action: 'send', name: c.name }); setScreen('new-transfer') }}><ArrowUpRight className="w-4 h-4 ml-1" /> إرسال حوالة</Button>
                          <Button variant="ghost" size="sm" className="text-purple-600" onClick={() => { setTransferType({ type: 'creditor', action: 'receive', name: c.name }); setScreen('new-transfer') }}><ArrowDownLeft className="w-4 h-4 ml-1" /> استلام حوالة</Button>
                          {isAdmin && <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Edit2 className="w-4 h-4 text-blue-600" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if(!open) setSelectedCreditor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selectedCreditor ? 'تعديل بيانات دائن' : 'إضافة دائن جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم *</Label><Input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} className="mt-1" /></div>
            <div><Label>الهاتف</Label><Input value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} className="mt-1" /></div>
            <div><Label>{selectedCreditor ? 'إجمالي الإيداعات (الرصيد الافتتاحي)' : 'مبلغ الإيداع الأولي'}</Label><Input type="text" value={createForm.initialDeposit} onChange={e => setCreateForm({ ...createForm, initialDeposit: e.target.value })} className="mt-1" /></div>
            {isAdmin && (
              <div>
                <Label>المكتب *</Label>
                <Select value={createForm.officeId} onValueChange={v => setCreateForm({ ...createForm, officeId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="اختر المكتب" /></SelectTrigger>
                  <SelectContent>
                    {offices.filter(o => o.type === 'internal').map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>ملاحظات</Label><Textarea value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })} className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setSelectedCreditor(null); }}>إلغاء</Button>
            <Button onClick={handleCreate} className="bg-blue-700 hover:bg-blue-800">{selectedCreditor ? 'تحديث' : 'إنشاء'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{actionType === 'deposit' ? 'إيداع' : 'سحب'} - {selectedCreditor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">الرصيد الحالي</p>
              <p className="text-lg font-bold text-green-600">{formatMoney(selectedCreditor?.currentBalance || 0)}</p>
            </div>
            <div><Label>المبلغ *</Label><Input type="text" value={actionAmount} onChange={e => setActionAmount(e.target.value)} className="mt-1" /></div>
            <div><Label>الوصف</Label><Input value={actionDesc} onChange={e => setActionDesc(e.target.value)} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>إلغاء</Button>
            <Button onClick={handleAction} className={actionType === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
              {actionType === 'deposit' ? 'إيداع' : 'سحب'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===================== DEBTORS SCREEN =====================
function DebtorsScreen({ user, isAdmin, setTransferType, setScreen }: { user: User; isAdmin: boolean; setTransferType: (type: { type: 'creditor' | 'debtor', action: 'send' | 'receive', name: string } | null) => void; setScreen: (screen: Screen) => void }) {
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null)
  const [actionType, setActionType] = useState<'debt' | 'payment'>('debt')
  const [createForm, setCreateForm] = useState({ name: '', phone: '', initialDebt: '', officeId: '', notes: '' })
  const [actionAmount, setActionAmount] = useState('')
  const [actionDesc, setActionDesc] = useState('')
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (!isAdmin && user.officeId) params.set('officeId', user.officeId)
    const [debRes, offRes] = await Promise.all([
      fetch(`${API_BASE}/debtors?${params}`),
      isAdmin ? fetch(`${API_BASE}/offices`) : Promise.resolve(null),
    ])
    setDebtors(await debRes.json())
    if (offRes) setOffices(await offRes.json())
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const params = new URLSearchParams()
      if (!isAdmin && user.officeId) params.set('officeId', user.officeId)
      const [debRes, offRes] = await Promise.all([
        fetch(`${API_BASE}/debtors?${params}`),
        isAdmin ? fetch(`${API_BASE}/offices`) : Promise.resolve(null),
      ])
      if (!cancelled) {
        setDebtors(await debRes.json())
        if (offRes) setOffices(await offRes.json())
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [isAdmin, user.officeId])

  const handleCreate = async () => {
    if (!createForm.name) return
    try {
      if (selectedDebtor) {
        // Update mode
        const res = await fetch(`${API_BASE}/debtors/${selectedDebtor.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...createForm, initialDebt: parseFloat(createForm.initialDebt) || 0, userId: user.id, userFullName: user.fullName }),
        })
        if (res.ok) {
          toast({ title: 'تم التحديث' })
        } else {
          throw new Error()
        }
      } else {
        // Create mode
        await fetch(`${API_BASE}/debtors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...createForm, initialDebt: parseFloat(createForm.initialDebt) || 0, userId: user.id, userFullName: user.fullName }),
        })
        toast({ title: 'تم الإنشاء' })
      }
      setShowCreateDialog(false)
      setSelectedDebtor(null)
      setCreateForm({ name: '', phone: '', initialDebt: '', officeId: '', notes: '' })
      fetchData()
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const openEdit = (d: Debtor) => {
    setSelectedDebtor(d)
    setCreateForm({
      name: d.name,
      phone: d.phone || '',
      initialDebt: String(d.totalDebt),
      officeId: d.officeId || '',
      notes: d.notes || '',
    })
    setShowCreateDialog(true)
  }

  const handleAction = async () => {
    if (!selectedDebtor || !actionAmount) return
    try {
      const url = actionType === 'debt'
        ? `${API_BASE}/debtors/${selectedDebtor.id}/debt`
        : `${API_BASE}/debtors/${selectedDebtor.id}/payment`
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(actionAmount), description: actionDesc, userId: user.id, userFullName: user.fullName }),
      })
      toast({ title: actionType === 'debt' ? 'تم إضافة الدين' : 'تم تسجيل الدفعة' })
      setShowActionDialog(false)
      setActionAmount('')
      setActionDesc('')
      fetchData()
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const openAction = (debtor: Debtor, type: 'debt' | 'payment') => {
    setSelectedDebtor(debtor)
    setActionType(type)
    setActionAmount('')
    setActionDesc('')
    setShowActionDialog(true)
  }

  const totalDebts = debtors.reduce((s, d) => s + d.totalDebt, 0)
  const totalBalance = debtors.reduce((s, d) => s + d.currentBalance, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-3">
          <Card className="border-0 shadow-sm px-4 py-2">
            <p className="text-sm text-gray-500">إجمالي الديون</p>
            <p className="text-lg font-bold text-red-600">{formatMoney(totalDebts)}</p>
          </Card>
          <Card className="border-0 shadow-sm px-4 py-2">
            <p className="text-sm text-gray-500">المتبقي</p>
            <p className="text-lg font-bold text-orange-600">{formatMoney(totalBalance)}</p>
          </Card>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-700 hover:bg-blue-800">
          <Plus className="w-4 h-4 ml-1" /> إضافة مدين
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>إجمالي الديون</TableHead>
                    <TableHead>المتبقي</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtors.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">لا يوجد مدينون</TableCell></TableRow>
                  )}
                  {debtors.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.phone || '-'}</TableCell>
                      <TableCell>{formatMoney(d.totalDebt)}</TableCell>
                      <TableCell className={`font-bold ${d.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatMoney(d.currentBalance)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => openAction(d, 'debt')}><Plus className="w-4 h-4 ml-1" /> دين</Button>
                          <Button variant="ghost" size="sm" className="text-green-600" onClick={() => openAction(d, 'payment')}><CheckCircle2 className="w-4 h-4 ml-1" /> دفع</Button>
                          <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => { setTransferType({ type: 'debtor', action: 'send', name: d.name }); setScreen('new-transfer') }}><ArrowUpRight className="w-4 h-4 ml-1" /> إرسال حوالة</Button>
                          <Button variant="ghost" size="sm" className="text-purple-600" onClick={() => { setTransferType({ type: 'debtor', action: 'receive', name: d.name }); setScreen('new-transfer') }}><ArrowDownLeft className="w-4 h-4 ml-1" /> استلام حوالة</Button>
                          {isAdmin && <Button variant="ghost" size="sm" onClick={() => openEdit(d)}><Edit2 className="w-4 h-4 text-blue-600" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if(!open) setSelectedDebtor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selectedDebtor ? 'تعديل بيانات مدين' : 'إضافة مدين جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم *</Label><Input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} className="mt-1" /></div>
            <div><Label>الهاتف</Label><Input value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} className="mt-1" /></div>
            <div><Label>{selectedDebtor ? 'إجمالي الديون (الرصيد الافتتاحي)' : 'مبلغ الدين الأولي'}</Label><Input type="text" value={createForm.initialDebt} onChange={e => setCreateForm({ ...createForm, initialDebt: e.target.value })} className="mt-1" /></div>
            {isAdmin && (
              <div>
                <Label>المكتب *</Label>
                <Select value={createForm.officeId} onValueChange={v => setCreateForm({ ...createForm, officeId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="اختر المكتب" /></SelectTrigger>
                  <SelectContent>
                    {offices.filter(o => o.type === 'internal').map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>ملاحظات</Label><Textarea value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })} className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setSelectedDebtor(null); }}>إلغاء</Button>
            <Button onClick={handleCreate} className="bg-blue-700 hover:bg-blue-800">{selectedDebtor ? 'تحديث' : 'إنشاء'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{actionType === 'debt' ? 'إضافة دين' : 'تسجيل دفعة'} - {selectedDebtor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">الديون المتبقية</p>
              <p className="text-lg font-bold text-red-600">{formatMoney(selectedDebtor?.currentBalance || 0)}</p>
            </div>
            <div><Label>المبلغ *</Label><Input type="text" value={actionAmount} onChange={e => setActionAmount(e.target.value)} className="mt-1" /></div>
            <div><Label>الوصف</Label><Input value={actionDesc} onChange={e => setActionDesc(e.target.value)} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>إلغاء</Button>
            <Button onClick={handleAction} className={actionType === 'debt' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}>
              {actionType === 'debt' ? 'إضافة دين' : 'تسجيل دفعة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===================== REPORTS SCREEN =====================
const handlePrintReport = (title: string, content: string) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; color: #333; }
      h1 { text-align: center; color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 10px; font-size: 22px; }
      h2 { color: #1e3a8a; margin-top: 20px; }
      .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
      .period { text-align: center; background: #f0f9ff; padding: 8px; border-radius: 8px; margin-bottom: 15px; color: #1e40af; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }
      th { background: #1e3a8a; color: white; padding: 10px 8px; text-align: right; }
      td { padding: 8px; border-bottom: 1px solid #ddd; }
      tr:nth-child(even) { background: #f9fafb; }
      .stat-card { display: inline-block; background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 20px; margin: 5px; text-align: center; }
      .stat-value { font-size: 20px; font-weight: bold; color: #1e40af; }
      .stat-label { font-size: 12px; color: #666; }
      .total-row { font-weight: bold; background: #eff6ff !important; border-top: 2px solid #1e3a8a; }
      .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 2px solid #ddd; color: #999; font-size: 11px; }
      .positive { color: #16a34a; font-weight: bold; }
      .negative { color: #dc2626; font-weight: bold; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
      .badge-green { background: #dcfce7; color: #16a34a; }
      .badge-red { background: #fee2e2; color: #dc2626; }
      .badge-yellow { background: #fef9c3; color: #854d0e; }
      .badge-blue { background: #dbeafe; color: #1e40af; }
      .badge-gray { background: #f3f4f6; color: #6b7280; }
      @media print { body { padding: 10px; } }
    </style>
  </head><body>
    <h1>نظام إدارة التحويلات المالية</h1>
    <p class="subtitle">تقرير: ${title}</p>
    ${content}
    <div class="footer">تم الطباعة في: ${new Date().toLocaleString('ar-LY')} | نظام إدارة التحويلات المالية</div>
  </body></html>`
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => { printWindow.print() }
}

const statusHtml = (status: string) => {
  switch (status) {
    case 'completed': return '<span class="badge badge-green">مكتمل</span>'
    case 'cancelled': return '<span class="badge badge-red">ملغي</span>'
    case 'pending': return '<span class="badge badge-yellow">معلق</span>'
    default: return status
  }
}

const typeHtml = (type: string) => {
  switch (type) {
    case 'internal': return '<span class="badge badge-blue">داخلي</span>'
    case 'external': return '<span class="badge badge-blue" style="background:#f3e8ff;color:#7c3aed">خارجي</span>'
    case 'intermediary': return '<span class="badge badge-yellow">عبر وسيط</span>'
    default: return type
  }
}

function ReportsScreen({ user, isAdmin }: { user: User; isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState('status')
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [offices, setOffices] = useState<Office[]>([])
  const [expandedCreditor, setExpandedCreditor] = useState<string | null>(null)
  const [expandedDebtor, setExpandedDebtor] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterOfficeId, setFilterOfficeId] = useState('all')

  useEffect(() => {
    if (isAdmin) {
      fetch(`${API_BASE}/offices`).then(r => r.json()).then(setOffices).catch(() => { })
    }
  }, [isAdmin])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (dateFrom) params.set('fromDate', dateFrom)
        if (dateTo) params.set('toDate', dateTo)
        if (filterOfficeId && filterOfficeId !== 'all') params.set('officeId', filterOfficeId)
        if (!isAdmin && user.officeId) params.set('officeId', user.officeId)

        let endpoint = `reports/${activeTab}`
        if (activeTab === 'status') {
          endpoint = `reports/transfers`
        }

        const res = await fetch(`${API_BASE}/${endpoint}?${params}`)
        const json = await res.json()
        if (!cancelled) setReportData(json)
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [activeTab, dateFrom, dateTo, filterOfficeId, isAdmin, user.officeId])

  const getTodayStr = () => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  }

  const getMonthStartStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  }

  const periodStr = () => {
    const from = dateFrom || getMonthStartStr()
    const to = dateTo || getTodayStr()
    return `من: ${from} إلى: ${to}`
  }

  // Print handlers
  const printStatusReport = () => {
    if (!reportData) return
    const transfers = reportData.transfers || []
    const completed = transfers.filter((t: Transfer) => t.status === 'completed')
    const cancelled = transfers.filter((t: Transfer) => t.status === 'cancelled')
    const pending = transfers.filter((t: Transfer) => t.status === 'pending')
    let html = `<p class="period">${periodStr()}</p>`
    html += `<div style="text-align:center;margin:15px 0;">`
    html += `<span class="stat-card"><div class="stat-value positive">${completed.length}</div><div class="stat-label">ناجحة (مكتملة)</div></span>`
    html += `<span class="stat-card"><div class="stat-value negative">${cancelled.length}</div><div class="stat-label">فاشلة (ملغية)</div></span>`
    html += `<span class="stat-card"><div class="stat-value" style="color:#854d0e">${pending.length}</div><div class="stat-label">معلقة</div></span>`
    html += `</div>`
    html += `<table><thead><tr><th>رقم الحوالة</th><th>المرسل</th><th>المستلم</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>`
    transfers.forEach((t: Transfer) => {
      html += `<tr><td>${t.transferNo}</td><td>${t.senderName}</td><td>${t.receiverName}</td><td>${formatMoney(t.amount)}</td><td>${statusHtml(t.status)}</td><td>${format(new Date(t.createdAt), 'yyyy/MM/dd HH:mm')}</td></tr>`
    })
    html += `</tbody></table>`
    handlePrintReport('حالة العمليات', html)
  }

  const printTransfersReport = () => {
    if (!reportData) return
    const transfers = reportData.transfers || []
    let html = `<p class="period">${periodStr()}</p>`
    html += `<div style="text-align:center;margin:15px 0;">`
    html += `<span class="stat-card"><div class="stat-value">${reportData.stats?.totalTransfers || 0}</div><div class="stat-label">عدد التحويلات</div></span>`
    html += `<span class="stat-card"><div class="stat-value">${formatMoney(reportData.stats?.totalAmount || 0)}</div><div class="stat-label">إجمالي المبالغ</div></span>`
    html += `<span class="stat-card"><div class="stat-value positive">${formatMoney(reportData.stats?.totalCommission || 0)}</div><div class="stat-label">إجمالي العمولات</div></span>`
    html += `</div>`
    html += `<table><thead><tr><th>رقم الحوالة</th><th>المرسل</th><th>المستلم</th><th>من</th><th>إلى</th><th>المبلغ</th><th>العمولة</th><th>الحالة</th></tr></thead><tbody>`
    transfers.forEach((t: Transfer) => {
      html += `<tr><td>${t.transferNo}</td><td>${t.senderName}</td><td>${t.receiverName}</td><td>${t.senderOffice?.name || ''}</td><td>${t.receiverOffice?.name || ''}</td><td>${formatMoney(t.amount)}</td><td>${formatMoney(t.commissionAmount)}</td><td>${statusHtml(t.status)}</td></tr>`
    })
    html += `</tbody></table>`
    handlePrintReport('تقرير التحويلات', html)
  }

  const printCommissionsReport = () => {
    if (!reportData) return
    let html = `<p class="period">${periodStr()}</p>`
    html += `<div style="text-align:center;margin:15px 0;">`
    html += `<span class="stat-card"><div class="stat-value positive">${formatMoney(reportData.totalCommission || 0)}</div><div class="stat-label">إجمالي العمولات</div></span>`
    html += `</div>`
    html += `<h2>العمولات حسب المكتب</h2>`
    html += `<table><thead><tr><th>المكتب</th><th>إجمالي العمولات</th></tr></thead><tbody>`
    reportData.officeCommissions?.forEach((o: any) => {
      html += `<tr><td>${o.officeName}</td><td class="positive">${formatMoney(o.totalCommission)}</td></tr>`
    })
    html += `<tr class="total-row"><td>الإجمالي</td><td class="positive">${formatMoney(reportData.totalCommission || 0)}</td></tr>`
    html += `</tbody></table>`
    handlePrintReport('تقرير العمولات', html)
  }

  const printBalancesReport = () => {
    if (!reportData) return
    let html = `<p class="period">${periodStr()}</p>`
    html += `<div style="text-align:center;margin:15px 0;">`
    html += `<span class="stat-card"><div class="stat-value">${reportData.summary?.totalOffices || 0}</div><div class="stat-label">عدد المكاتب</div></span>`
    html += `<span class="stat-card"><div class="stat-value">${formatMoney(reportData.summary?.totalOpening || 0)}</div><div class="stat-label">الأرصدة الافتتاحية</div></span>`
    html += `<span class="stat-card"><div class="stat-value positive">${formatMoney(reportData.summary?.totalBalance || 0)}</div><div class="stat-label">الأرصدة الحالية</div></span>`
    html += `</div>`
    html += `<table><thead><tr><th>الرمز</th><th>الاسم</th><th>النوع</th><th>الرصيد الافتتاحي</th><th>الرصيد الحالي</th><th>التغير</th></tr></thead><tbody>`
    reportData.offices?.forEach((o: any) => {
      const change = o.currentBalance - o.openingBalance
      html += `<tr><td>${o.code}</td><td>${o.name}</td><td>${o.type === 'internal' ? 'داخلي' : 'خارجي'}</td><td>${formatMoney(o.openingBalance)}</td><td>${formatMoney(o.currentBalance)}</td><td class="${change >= 0 ? 'positive' : 'negative'}">${formatMoney(change)}</td></tr>`
    })
    html += `</tbody></table>`
    handlePrintReport('تقرير الأرصدة', html)
  }

  const printExpensesReport = () => {
    if (!reportData) return
    const expenses = reportData.expenses || []
    let html = `<p class="period">${periodStr()}</p>`
    html += `<div style="text-align:center;margin:15px 0;">`
    html += `<span class="stat-card"><div class="stat-value">${reportData.stats?.totalExpenses || 0}</div><div class="stat-label">عدد المصروفات</div></span>`
    html += `<span class="stat-card"><div class="stat-value negative">${formatMoney(reportData.stats?.totalAmount || 0)}</div><div class="stat-label">إجمالي المصروفات</div></span>`
    html += `</div>`
    // Group by month
    const byMonth: Record<string, any[]> = {}
    expenses.forEach((e: any) => {
      const m = format(new Date(e.expenseDate), 'yyyy-MM')
      if (!byMonth[m]) byMonth[m] = []
      byMonth[m].push(e)
    })
    Object.keys(byMonth).sort().forEach(month => {
      const monthTotal = byMonth[month].reduce((s: number, e: any) => s + e.amount, 0)
      html += `<h2>شهر ${month}</h2>`
      html += `<table><thead><tr><th>الوصف</th><th>المكتب</th><th>التصنيف</th><th>التاريخ</th><th>المبلغ</th></tr></thead><tbody>`
      byMonth[month].forEach((e: any) => {
        html += `<tr><td>${e.description}</td><td>${e.office?.name || '-'}</td><td>${e.category || '-'}</td><td>${format(new Date(e.expenseDate), 'yyyy/MM/dd')}</td><td class="negative">${formatMoney(e.amount)}</td></tr>`
      })
      html += `<tr class="total-row"><td colspan="4">إجمالي الشهر</td><td class="negative">${formatMoney(monthTotal)}</td></tr>`
      html += `</tbody></table>`
    })
    handlePrintReport('تقرير المصروفات', html)
  }

  const printCreditorsReport = () => {
    if (!reportData) return
    const creditors = reportData.creditors || []
    let html = `<p class="period">${periodStr()}</p>`
    html += `<div style="text-align:center;margin:15px 0;">`
    html += `<span class="stat-card"><div class="stat-value">${reportData.stats?.totalCreditors || 0}</div><div class="stat-label">عدد الدائنين</div></span>`
    html += `<span class="stat-card"><div class="stat-value positive">${formatMoney(reportData.stats?.totalDeposits || 0)}</div><div class="stat-label">إجمالي الإيداعات</div></span>`
    html += `<span class="stat-card"><div class="stat-value">${formatMoney(reportData.stats?.totalBalance || 0)}</div><div class="stat-label">إجمالي الأرصدة</div></span>`
    html += `</div>`
    html += `<table><thead><tr><th>الاسم</th><th>الهاتف</th><th>إجمالي الإيداعات</th><th>الرصيد الحالي</th></tr></thead><tbody>`
    creditors.forEach((c: any) => {
      html += `<tr><td>${c.name}</td><td>${c.phone || '-'}</td><td class="positive">${formatMoney(c.totalDeposit)}</td><td>${formatMoney(c.currentBalance)}</td></tr>`
    })
    html += `</tbody></table>`
    handlePrintReport('تقرير الدائنون', html)
  }

  const printDebtorsReport = () => {
    if (!reportData) return
    const debtors = reportData.debtors || []
    let html = `<p class="period">${periodStr()}</p>`
    html += `<div style="text-align:center;margin:15px 0;">`
    html += `<span class="stat-card"><div class="stat-value">${reportData.stats?.totalDebtors || 0}</div><div class="stat-label">عدد المدينين</div></span>`
    html += `<span class="stat-card"><div class="stat-value negative">${formatMoney(reportData.stats?.totalDebts || 0)}</div><div class="stat-label">إجمالي الديون</div></span>`
    html += `<span class="stat-card"><div class="stat-value" style="color:#ea580c">${formatMoney(reportData.stats?.totalBalance || 0)}</div><div class="stat-label">المتبقي</div></span>`
    html += `</div>`
    html += `<table><thead><tr><th>الاسم</th><th>الهاتف</th><th>إجمالي الديون</th><th>المتبقي</th></tr></thead><tbody>`
    debtors.forEach((d: any) => {
      html += `<tr><td>${d.name}</td><td>${d.phone || '-'}</td><td class="negative">${formatMoney(d.totalDebt)}</td><td style="color:#ea580c">${formatMoney(d.currentBalance)}</td></tr>`
    })
    html += `</tbody></table>`
    handlePrintReport('تقرير المدينون', html)
  }

  const printDebtsReport = () => {
    if (!reportData) return
    let html = `<p class="period">${periodStr()}</p>`
    html += `<div style="text-align:center;margin:15px 0;">`
    html += `<span class="stat-card"><div class="stat-value">${reportData.summary?.totalExternalOffices || 0}</div><div class="stat-label">عدد المكاتب الخارجية</div></span>`
    html += `<span class="stat-card"><div class="stat-value negative">${formatMoney(reportData.summary?.totalDebt || 0)}</div><div class="stat-label">إجمالي الديون</div></span>`
    html += `<span class="stat-card"><div class="stat-value positive">${formatMoney(reportData.summary?.totalReceivable || 0)}</div><div class="stat-label">إجمالي المستحقات</div></span>`
    html += `</div>`
    html += `<table><thead><tr><th>المكتب</th><th>المنطقة</th><th>المرسل</th><th>المستلم</th><th>الرصيد</th><th>الحالة</th></tr></thead><tbody>`
    reportData.debts?.forEach((d: any) => {
      const balanceClass = d.balance >= 0 ? 'positive' : 'negative'
      const statusLabel = d.balance >= 0 ? '<span class="badge badge-green">مستحق لنا</span>' : '<span class="badge badge-red">علينا دين</span>'
      html += `<tr><td>${d.officeName}</td><td>${d.region || '-'}</td><td>${formatMoney(d.totalSent)}</td><td>${formatMoney(d.totalReceived)}</td><td class="${balanceClass}">${formatMoney(Math.abs(d.balance))}</td><td>${statusLabel}</td></tr>`
    })
    html += `</tbody></table>`
    handlePrintReport('تقرير الديون الخارجية', html)
  }

  const renderPrintBtn = (onPrint: () => void) => (
    <Button variant="outline" size="sm" onClick={onPrint} className="gap-1">
      <Printer className="w-4 h-4" /> طباعة
    </Button>
  )

  const getStatusStats = () => {
    if (!reportData?.transfers) return { completed: 0, cancelled: 0, pending: 0 }
    const transfers = reportData.transfers as Transfer[]
    return {
      completed: transfers.filter(t => t.status === 'completed').length,
      cancelled: transfers.filter(t => t.status === 'cancelled').length,
      pending: transfers.filter(t => t.status === 'pending').length,
    }
  }

  const getExpensesByMonth = () => {
    if (!reportData?.expenses) return {}
    const byMonth: Record<string, Expense[]> = {}
    reportData.expenses.forEach((e: Expense) => {
      const m = format(new Date(e.expenseDate), 'yyyy-MM')
      if (!byMonth[m]) byMonth[m] = []
      byMonth[m].push(e)
    })
    return byMonth
  }

  const renderStatusBar = () => {
    const stats = getStatusStats()
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-green-500" /><div><p className="text-sm text-gray-500">ناجحة (مكتملة)</p><p className="text-xl font-bold text-green-600">{toArabicNumerals(String(stats.completed))}</p></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-red-500" /><div><p className="text-sm text-gray-500">فاشلة (ملغية)</p><p className="text-xl font-bold text-red-600">{toArabicNumerals(String(stats.cancelled))}</p></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-yellow-500" /><div><p className="text-sm text-gray-500">معلقة</p><p className="text-xl font-bold text-yellow-600">{toArabicNumerals(String(stats.pending))}</p></div></CardContent></Card>
      </div>
    )
  }

  const renderStatusTable = () => {
    const transfers = (reportData?.transfers || []) as Transfer[]
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader><TableRow><TableHead>رقم الحوالة</TableHead><TableHead>المرسل</TableHead><TableHead>المستلم</TableHead><TableHead>المبلغ</TableHead><TableHead>الحالة</TableHead><TableHead>المطابقة</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
              <TableBody>
                {transfers.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">لا توجد بيانات</TableCell></TableRow>}
                {transfers.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.transferNo}</TableCell>
                    <TableCell className="text-sm">{t.senderName}</TableCell>
                    <TableCell className="text-sm">{t.receiverName}</TableCell>
                    <TableCell className="font-medium">{formatMoney(t.amount)}</TableCell>
                    <TableCell>{statusBadge(t.status)}</TableCell>
                      <TableCell>{t.isVerified ? <Badge className="bg-green-100 text-green-700 border-green-200">مطابقة</Badge> : <Badge variant="outline" className="text-orange-600 border-orange-200">غير مراجعة</Badge>}</TableCell>
                    <TableCell className="text-xs text-gray-500">{format(new Date(t.createdAt), 'yyyy/MM/dd HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderTransfersTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">عدد التحويلات</p><p className="text-xl font-bold">{toArabicNumerals(String(reportData?.stats?.totalTransfers || 0))}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">إجمالي المبالغ</p><p className="text-xl font-bold text-blue-600">{formatMoney(reportData?.stats?.totalAmount || 0)}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">إجمالي العمولات</p><p className="text-xl font-bold text-green-600">{formatMoney(reportData?.stats?.totalCommission || 0)}</p></CardContent></Card>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader><TableRow><TableHead>رقم الحوالة</TableHead><TableHead>المرسل</TableHead><TableHead>المستلم</TableHead><TableHead>من</TableHead><TableHead>إلى</TableHead><TableHead>المبلغ</TableHead><TableHead>العمولة</TableHead><TableHead>الحالة</TableHead><TableHead>المطابقة</TableHead></TableRow></TableHeader>
              <TableBody>
                {(reportData?.transfers || []).length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-400">لا توجد بيانات</TableCell></TableRow>}
                {reportData?.transfers?.map((t: Transfer) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.transferNo}</TableCell>
                    <TableCell className="text-sm">{t.senderName}</TableCell>
                    <TableCell className="text-sm">{t.receiverName}</TableCell>
                    <TableCell className="text-xs">{t.senderOffice?.name}</TableCell>
                    <TableCell className="text-xs">{t.receiverOffice?.name}</TableCell>
                    <TableCell className="font-medium">{formatMoney(t.amount)}</TableCell>
                    <TableCell className="text-sm text-green-600">{formatMoney(t.commissionAmount)}</TableCell>
                    <TableCell>{statusBadge(t.status)}</TableCell>
                      <TableCell>{t.isVerified ? <Badge className="bg-green-100 text-green-700 border-green-200">مطابقة</Badge> : <Badge variant="outline" className="text-orange-600 border-orange-200">غير مراجعة</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderCommissionsTab = () => (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">إجمالي العمولات</p><p className="text-2xl font-bold text-green-600">{formatMoney(reportData?.totalCommission || 0)}</p></CardContent></Card>
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">العمولات حسب المكتب</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>المكتب</TableHead><TableHead>إجمالي العمولات</TableHead></TableRow></TableHeader>
            <TableBody>
              {reportData?.officeCommissions?.map((o: any) => (
                <TableRow key={o.officeId}><TableCell>{o.officeName}</TableCell><TableCell className="font-bold text-green-600">{formatMoney(o.totalCommission)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )

  const renderBalancesTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">عدد المكاتب</p><p className="text-xl font-bold">{toArabicNumerals(String(reportData?.summary?.totalOffices || 0))}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">إجمالي الأرصدة الافتتاحية</p><p className="text-xl font-bold text-blue-600">{formatMoney(reportData?.summary?.totalOpening || 0)}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">إجمالي الأرصدة الحالية</p><p className="text-xl font-bold text-green-600">{formatMoney(reportData?.summary?.totalBalance || 0)}</p></CardContent></Card>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>الرمز</TableHead><TableHead>الاسم</TableHead><TableHead>النوع</TableHead><TableHead>الرصيد الافتتاحي</TableHead><TableHead>الرصيد الحالي</TableHead><TableHead>التغير</TableHead></TableRow></TableHeader>
              <TableBody>
                {reportData?.offices?.map((o: any) => {
                  const change = o.currentBalance - o.openingBalance
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-sm">{o.code}</TableCell>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell>{o.type === 'internal' ? 'داخلي' : 'خارجي'}</TableCell>
                      <TableCell>{formatMoney(o.openingBalance)}</TableCell>
                      <TableCell className="font-bold">{formatMoney(o.currentBalance)}</TableCell>
                      <TableCell className={change >= 0 ? 'text-green-600' : 'text-red-600'}>{formatMoney(change)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderExpensesTab = () => {
    const byMonth = getExpensesByMonth()
    const months = Object.keys(byMonth).sort()
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">عدد المصروفات</p><p className="text-xl font-bold">{toArabicNumerals(String(reportData?.stats?.totalExpenses || 0))}</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">إجمالي المصروفات</p><p className="text-xl font-bold text-red-600">{formatMoney(reportData?.stats?.totalAmount || 0)}</p></CardContent></Card>
        </div>
        {months.map(month => {
          const monthTotal = byMonth[month].reduce((s: number, e: Expense) => s + e.amount, 0)
          return (
            <Card key={month} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">شهر {month}</CardTitle>
                  <Badge className="bg-red-100 text-red-700">الإجمالي: {formatMoney(monthTotal)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>الوصف</TableHead><TableHead>المكتب</TableHead><TableHead>التصنيف</TableHead><TableHead>التاريخ</TableHead><TableHead>المبلغ</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {byMonth[month].map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{e.description}</TableCell>
                        <TableCell className="text-xs">{e.office?.name || '-'}</TableCell>
                        <TableCell>{e.category || '-'}</TableCell>
                        <TableCell className="text-xs">{format(new Date(e.expenseDate), 'yyyy/MM/dd')}</TableCell>
                        <TableCell className="font-bold text-red-600">{formatMoney(e.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-red-50 font-bold"><TableCell colSpan={4}>إجمالي الشهر</TableCell><TableCell className="text-red-700">{formatMoney(monthTotal)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  const renderCreditorsTab = () => {
    const creditors = (reportData?.creditors || []) as Creditor[]
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">عدد الدائنين</p><p className="text-xl font-bold">{toArabicNumerals(String(reportData?.stats?.totalCreditors || 0))}</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">إجمالي الإيداعات</p><p className="text-xl font-bold text-green-600">{formatMoney(reportData?.stats?.totalDeposits || 0)}</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">إجمالي الأرصدة</p><p className="text-xl font-bold text-blue-600">{formatMoney(reportData?.stats?.totalBalance || 0)}</p></CardContent></Card>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>الهاتف</TableHead><TableHead>إجمالي الإيداعات</TableHead><TableHead>الرصيد الحالي</TableHead><TableHead>تفاصيل</TableHead></TableRow></TableHeader>
                <TableBody>
                  {creditors.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">لا توجد بيانات</TableCell></TableRow>}
                  {creditors.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm">{c.phone || '-'}</TableCell>
                      <TableCell className="text-green-600">{formatMoney(c.totalDeposit)}</TableCell>
                      <TableCell className="font-bold text-blue-600">{formatMoney(c.currentBalance)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedCreditor(expandedCreditor === c.id ? null : c.id)}>
                          {expandedCreditor === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        {expandedCreditor && (() => {
          const c = creditors.find(cr => cr.id === expandedCreditor)
          if (!c) return null
          return (
            <Card className="border-0 shadow-sm border-r-4 border-r-blue-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">كشف حساب: {c.name}</CardTitle>
                  {renderPrintBtn(() => {
                    let html = `<p class="period">كشف حساب دائن: ${c.name}</p>`
                    html += `<table><thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الوصف</th></tr></thead><tbody>`
                    c.transactions?.forEach(tr => {
                      html += `<tr><td>${format(new Date(tr.createdAt), 'yyyy/MM/dd HH:mm')}</td><td>${tr.type === 'deposit' ? '<span class="badge badge-green">إيداع</span>' : '<span class="badge badge-red">سحب</span>'}</td><td class="${tr.type === 'deposit' ? 'positive' : 'negative'}">${formatMoney(tr.amount)}</td><td>${tr.description || '-'}</td></tr>`
                    })
                    html += `<tr class="total-row"><td colspan="2">الرصيد الحالي</td><td class="positive">${formatMoney(c.currentBalance)}</td><td></td></tr>`
                    html += `</tbody></table>`
                    handlePrintReport(`كشف حساب دائن - ${c.name}`, html)
                  })}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>النوع</TableHead><TableHead>المبلغ</TableHead><TableHead>الوصف</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(!c.transactions || c.transactions.length === 0) && <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-400">لا توجد معاملات</TableCell></TableRow>}
                    {c.transactions?.map(tr => (
                      <TableRow key={tr.id}>
                        <TableCell className="text-xs">{format(new Date(tr.createdAt), 'yyyy/MM/dd HH:mm')}</TableCell>
                        <TableCell>{tr.type === 'deposit' ? <Badge className="bg-green-100 text-green-700">إيداع</Badge> : <Badge className="bg-red-100 text-red-700">سحب</Badge>}</TableCell>
                        <TableCell className={tr.type === 'deposit' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{formatMoney(tr.amount)}</TableCell>
                        <TableCell className="text-sm text-gray-500">{tr.description || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        })()}
      </div>
    )
  }

  const renderDebtorsTab = () => {
    const debtors = (reportData?.debtors || []) as Debtor[]
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">عدد المدينين</p><p className="text-xl font-bold">{toArabicNumerals(String(reportData?.stats?.totalDebtors || 0))}</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">إجمالي الديون</p><p className="text-xl font-bold text-red-600">{formatMoney(reportData?.stats?.totalDebts || 0)}</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">المتبقي</p><p className="text-xl font-bold text-orange-600">{formatMoney(reportData?.stats?.totalBalance || 0)}</p></CardContent></Card>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>الهاتف</TableHead><TableHead>إجمالي الديون</TableHead><TableHead>المتبقي</TableHead><TableHead>تفاصيل</TableHead></TableRow></TableHeader>
                <TableBody>
                  {debtors.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">لا توجد بيانات</TableCell></TableRow>}
                  {debtors.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-sm">{d.phone || '-'}</TableCell>
                      <TableCell className="text-red-600">{formatMoney(d.totalDebt)}</TableCell>
                      <TableCell className="font-bold text-orange-600">{formatMoney(d.currentBalance)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedDebtor(expandedDebtor === d.id ? null : d.id)}>
                          {expandedDebtor === d.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        {expandedDebtor && (() => {
          const d = debtors.find(dr => dr.id === expandedDebtor)
          if (!d) return null
          return (
            <Card className="border-0 shadow-sm border-r-4 border-r-red-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">كشف حساب: {d.name}</CardTitle>
                  {renderPrintBtn(() => {
                    let html = `<p class="period">كشف حساب مدين: ${d.name}</p>`
                    html += `<table><thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الوصف</th></tr></thead><tbody>`
                    d.transactions?.forEach(tr => {
                      html += `<tr><td>${format(new Date(tr.createdAt), 'yyyy/MM/dd HH:mm')}</td><td>${tr.type === 'debt' ? '<span class="badge badge-red">دين</span>' : '<span class="badge badge-green">سداد</span>'}</td><td class="${tr.type === 'debt' ? 'negative' : 'positive'}">${formatMoney(tr.amount)}</td><td>${tr.description || '-'}</td></tr>`
                    })
                    html += `<tr class="total-row"><td colspan="2">المتبقي</td><td style="color:#ea580c;font-weight:bold">${formatMoney(d.currentBalance)}</td><td></td></tr>`
                    html += `</tbody></table>`
                    handlePrintReport(`كشف حساب مدين - ${d.name}`, html)
                  })}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>النوع</TableHead><TableHead>المبلغ</TableHead><TableHead>الوصف</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(!d.transactions || d.transactions.length === 0) && <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-400">لا توجد معاملات</TableCell></TableRow>}
                    {d.transactions?.map(tr => (
                      <TableRow key={tr.id}>
                        <TableCell className="text-xs">{format(new Date(tr.createdAt), 'yyyy/MM/dd HH:mm')}</TableCell>
                        <TableCell>{tr.type === 'debt' ? <Badge className="bg-red-100 text-red-700">دين</Badge> : <Badge className="bg-green-100 text-green-700">سداد</Badge>}</TableCell>
                        <TableCell className={tr.type === 'debt' ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{formatMoney(tr.amount)}</TableCell>
                        <TableCell className="text-sm text-gray-500">{tr.description || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        })()}
      </div>
    )
  }

  const renderDebtsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">عدد المكاتب الخارجية</p><p className="text-xl font-bold">{toArabicNumerals(String(reportData?.summary?.totalExternalOffices || 0))}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">إجمالي الديون</p><p className="text-xl font-bold text-red-600">{formatMoney(reportData?.summary?.totalDebt || 0)}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-gray-500">إجمالي المستحقات</p><p className="text-xl font-bold text-green-600">{formatMoney(reportData?.summary?.totalReceivable || 0)}</p></CardContent></Card>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>المكتب</TableHead><TableHead>المنطقة</TableHead><TableHead>المرسل</TableHead><TableHead>المستلم</TableHead><TableHead>الرصيد</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
              <TableBody>
                {reportData?.debts?.map((d: any) => (
                  <TableRow key={d.officeId}>
                    <TableCell className="font-medium">{d.officeName}</TableCell>
                    <TableCell>{d.region || '-'}</TableCell>
                    <TableCell>{formatMoney(d.totalSent)}</TableCell>
                    <TableCell>{formatMoney(d.totalReceived)}</TableCell>
                    <TableCell className={`font-bold ${d.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(Math.abs(d.balance))}</TableCell>
                    <TableCell>{d.balance >= 0 ? <Badge className="bg-green-100 text-green-800">مستحق لنا</Badge> : <Badge className="bg-red-100 text-red-800">علينا دين</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">من:</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">إلى:</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">المكتب:</Label>
                <Select value={filterOfficeId} onValueChange={v => setFilterOfficeId(v)}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="الكل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="status">حالة العمليات</TabsTrigger>
          <TabsTrigger value="transfers">التحويلات</TabsTrigger>
          <TabsTrigger value="commissions">العمولات</TabsTrigger>
          <TabsTrigger value="balances">الأرصدة</TabsTrigger>
          <TabsTrigger value="expenses">المصروفات</TabsTrigger>
          <TabsTrigger value="creditors">الدائنون</TabsTrigger>
          <TabsTrigger value="debtors">المدينون</TabsTrigger>
          {isAdmin && <TabsTrigger value="debts">ديون خارجية</TabsTrigger>}
        </TabsList>

        <TabsContent value="status">
          <div className="flex justify-end mb-2">{renderPrintBtn(printStatusReport)}</div>
          {loading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div> : <>{renderStatusBar()}{renderStatusTable()}</>}
        </TabsContent>

        <TabsContent value="transfers">
          <div className="flex justify-end mb-2">{renderPrintBtn(printTransfersReport)}</div>
          {loading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div> : renderTransfersTab()}
        </TabsContent>

        <TabsContent value="commissions">
          <div className="flex justify-end mb-2">{renderPrintBtn(printCommissionsReport)}</div>
          {loading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div> : renderCommissionsTab()}
        </TabsContent>

        <TabsContent value="balances">
          <div className="flex justify-end mb-2">{renderPrintBtn(printBalancesReport)}</div>
          {loading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div> : renderBalancesTab()}
        </TabsContent>

        <TabsContent value="expenses">
          <div className="flex justify-end mb-2">{renderPrintBtn(printExpensesReport)}</div>
          {loading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div> : renderExpensesTab()}
        </TabsContent>

        <TabsContent value="creditors">
          <div className="flex justify-end mb-2">{renderPrintBtn(printCreditorsReport)}</div>
          {loading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div> : renderCreditorsTab()}
        </TabsContent>

        <TabsContent value="debtors">
          <div className="flex justify-end mb-2">{renderPrintBtn(printDebtorsReport)}</div>
          {loading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div> : renderDebtorsTab()}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="debts">
            <div className="flex justify-end mb-2">{renderPrintBtn(printDebtsReport)}</div>
            {loading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div> : renderDebtsTab()}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// ===================== SETTINGS SCREEN =====================
function SettingsScreen({ user, isAdmin }: { user: User; isAdmin: boolean }) {
  const [users, setUsers] = useState<User[]>([])
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({ username: '', password: '', fullName: '', role: 'branch', officeId: '', isActive: true })
  const { toast } = useToast()

  // إعدادات الشركة
  const [companyName, setCompanyName] = useState('')
  const [backupPath, setBackupPath] = useState('')
  const [adminPhone, setAdminPhone] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const [usersRes, officesRes, settingsRes] = await Promise.all([
      fetch(`${API_BASE}/users`),
      fetch(`${API_BASE}/offices`),
      fetch(`${API_BASE}/settings`),
    ])
    setUsers(await usersRes.json())
    setOffices(await officesRes.json())
    const settings = await settingsRes.json()
    setCompanyName(settings.companyName || '')
    setBackupPath(settings.backupPath || '')
    setAdminPhone(settings.adminPhone || '')
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [usersRes, officesRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/users`),
        fetch(`${API_BASE}/offices`),
        fetch(`${API_BASE}/settings`),
      ])
      const settings = await settingsRes.json()
      if (!cancelled) {
        setUsers(await usersRes.json())
        setOffices(await officesRes.json())
        setCompanyName(settings.companyName || '')
        setBackupPath(settings.backupPath || '')
        setAdminPhone(settings.adminPhone || '')
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, backupPath, adminPhone, userId: user.id, userFullName: user.fullName }),
      })
      if (res.ok) {
        toast({ title: '✅ تم الحفظ', description: 'تم حفظ إعدادات الشركة بنجاح' })
      } else {
        toast({ title: 'خطأ', description: 'فشل في حفظ الإعدادات', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
    setSavingSettings(false)
  }

  const handleSaveUser = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (!form.username || (!editUser && !form.password) || !form.fullName) {
      toast({ title: 'تنبيه', description: 'يرجى إكمال الحقول المطلوبة', variant: 'destructive' })
      return
    }
    try {
      const url = editUser ? `${API_BASE}/users/${editUser.id}/update` : `${API_BASE}/users`
      const reqMethod = 'POST'
      console.log('Saving user:', { url, reqMethod, editUser })
      
      const res = await fetch(url, {
        method: reqMethod,
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          officeId: form.officeId || null,
          isActive: form.isActive,
          userId: user.id,
          userFullName: user.fullName,
        }),
      })
      
      if (res.ok) {
        toast({ title: editUser ? 'تم التحديث' : 'تم الإنشاء' })
        setShowDialog(false)
        setEditUser(null)
        setForm({ username: '', password: '', fullName: '', role: 'branch', officeId: '', isActive: true })
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'خطأ', description: data.detail || 'فشل في العملية', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setForm({
      username: u.username,
      password: '', // Keep empty unless updating password
      fullName: u.fullName,
      role: u.role,
      officeId: u.officeId || '',
      isActive: u.isActive
    })
    setShowDialog(true)
  }

  return (
    <div className="space-y-6">

      {/* ===== إعدادات الشركة ===== */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            إعدادات الشركة
          </CardTitle>
          <CardDescription>تخصيص اسم الشركة ومسار النسخ الاحتياطية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">اسم الشركة / المنظمة</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="مثال: النجع للحوالات المالية"
                className="text-right"
              />
              <p className="text-xs text-gray-400">يظهر في الشريط الجانبي وتقارير النظام</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="backupPath">مسار حفظ النسخ الاحتياطية</Label>
              <Input
                id="backupPath"
                value={backupPath}
                onChange={e => setBackupPath(e.target.value)}
                placeholder="مثال: C:\Backups\AlNajaa"
                className="text-right font-mono text-sm"
                dir="ltr"
              />
              <p className="text-xs text-gray-400">
                اتركه فارغاً للحفظ في المجلد الافتراضي داخل البرنامج
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPhone">رقم هاتف مدير النظام (للإشعارات)</Label>
              <Input
                id="adminPhone"
                value={adminPhone}
                onChange={e => setAdminPhone(e.target.value)}
                placeholder="مثال: 091XXXXXXXX"
                className="text-right font-mono"
              />
              <p className="text-xs text-gray-400">سيتم إرسال رسائل SMS لهذا الرقم عند تفعيل الخيار في الحوالات</p>
            </div>
          </div>

          {backupPath && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
              <HardDrive className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">مسار النسخ الاحتياطية المحدد:</p>
                <p className="font-mono text-xs mt-0.5" dir="ltr">{backupPath}</p>
                <p className="text-xs mt-1 text-amber-700">تأكد من وجود صلاحيات الكتابة لهذا المسار</p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="bg-blue-700 hover:bg-blue-800"
            >
              {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== إدارة الأرصدة ===== */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-600" />
            إدارة الأرصدة
          </CardTitle>
          <CardDescription>إعادة حساب أرصدة المكاتب بناءً على جميع العمليات التاريخية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2 shrink-0">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">إعادة حساب الأرصدة</h4>
                <p className="text-sm text-blue-700 mb-3">
                  يقوم هذا الإجراء بإعادة حساب أرصدة جميع المكاتب بناءً على جميع العمليات التاريخية
                  (الحوالات، المدينون، الدائنون، المصروفات، والعمولات).
                </p>
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-2">ما يتم حسابه:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• رصيد افتتاحي المكتب</li>
                    <li>• + دفعات المدينين المرتبطين بالمكتب</li>
                    <li>• + إيداعات الدائنين المرتبطين بالمكتب</li>
                    <li>• + التحويلات المستلمة (مكتملة)</li>
                    <li>• + العمولات المستلمة</li>
                    <li>• - إضافة ديون للمدينين</li>
                    <li>• - سحوبات الدائنين</li>
                    <li>• - التحويلات المرسلة (مكتملة)</li>
                    <li>• - المصروفات المرتبطة بالمكتب</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">تحذير مهم</p>
                <p className="text-xs text-amber-700 mt-1">
                  هذا الإجراء يستغرق وقتاً حسب حجم البيانات وقد يؤثر على الأداء أثناء التشغيل.
                  تأكد من عدم وجود مستخدمين آخرين يعملون على النظام.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={async () => {
                if (!confirm('هل أنت متأكد من إعادة حساب جميع الأرصدة؟ هذا الإجراء قد يستغرق وقتاً.')) return
                try {
                  const res = await fetch(`${API_BASE}/offices/recalculate-balances`, { method: 'POST' })
                  const data = await res.json()
                  if (res.ok) {
                    toast({ title: '✅ تم بنجاح', description: data.message })
                  } else {
                    toast({ title: 'خطأ', description: data.error || 'فشل في إعادة الحساب', variant: 'destructive' })
                  }
                } catch {
                  toast({ title: 'خطأ', description: 'حدث خطأ أثناء إعادة الحساب', variant: 'destructive' })
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <RefreshCw className="w-4 h-4 ml-1" /> إعادة حساب الأرصدة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== إدارة المستخدمين ===== */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                إدارة المستخدمين
              </CardTitle>
              <CardDescription>{users.length} مستخدم مسجل</CardDescription>
            </div>
            <Button onClick={() => { setEditUser(null); setForm({ username: '', password: '', fullName: '', role: 'branch', officeId: '', isActive: true }); setShowDialog(true); }} className="bg-blue-700 hover:bg-blue-800">
              <UserPlus className="w-4 h-4 ml-1" /> إضافة مستخدم
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المستخدم</TableHead>
                    <TableHead>الاسم الكامل</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>المكتب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-sm">{u.username}</TableCell>
                      <TableCell className="font-medium">{u.fullName}</TableCell>
                      <TableCell>{u.role === 'admin' ? <Badge className="bg-blue-100 text-blue-800">مدير</Badge> : <Badge variant="outline">فرع</Badge>}</TableCell>
                      <TableCell>{u.office?.name || '-'}</TableCell>
                      <TableCell>{u.isActive ? <Badge className="bg-green-100 text-green-800">نشط</Badge> : <Badge className="bg-gray-100 text-gray-600">معطل</Badge>}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={(open) => { if(!open) { setEditUser(null); } setShowDialog(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>اسم المستخدم *</Label><Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="mt-1" /></div>
            <div>
              <Label>{editUser ? 'كلمة المرور (اتركها فارغة لعدم التغيير)' : 'كلمة المرور *'}</Label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="mt-1" />
            </div>
            <div><Label>الاسم الكامل *</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="mt-1" /></div>
            <div>
              <Label>الدور</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير النظام</SelectItem>
                  <SelectItem value="branch">موظف فرع</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === 'branch' && (
              <div>
                <Label>المكتب</Label>
                <Select value={form.officeId} onValueChange={v => setForm({ ...form, officeId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="اختر المكتب" /></SelectTrigger>
                  <SelectContent>
                    {offices.filter(o => o.type === 'internal').map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="isActive" 
                checked={form.isActive} 
                onChange={e => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="cursor-pointer">حساب نشط</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditUser(null); }}>إلغاء</Button>
            <Button onClick={handleSaveUser} className="bg-blue-700 hover:bg-blue-800">{editUser ? 'تحديث' : 'إنشاء'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===================== AUDIT LOG SCREEN =====================
function AuditLogScreen({ user }: { user: User }) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('all')
  const [filterEntity, setFilterEntity] = useState('all')
  const { toast } = useToast()

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (filterAction !== 'all') params.set('action', filterAction)
      if (filterEntity !== 'all') params.set('entity', filterEntity)
      const res = await fetch(`${API_BASE}/audit-logs?${params}`)
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ في جلب السجل', variant: 'destructive' })
    }
    setLoading(false)
  }

  const handleManualBackup = async () => {
    try {
      const res = await fetch(`${API_BASE}/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userFullName: user.fullName }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: '✅ تم الحفظ', description: data.message })
        fetchLogs()
      } else {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'تعذر إنشاء النسخة الاحتياطية', variant: 'destructive' })
    }
  }

  useEffect(() => { fetchLogs() }, [filterAction, filterEntity])

  const actionLabel = (action: string) => {
    const map: Record<string, { label: string; color: string }> = {
      CREATE: { label: 'إضافة', color: 'bg-green-100 text-green-800' },
      UPDATE: { label: 'تعديل', color: 'bg-blue-100 text-blue-800' },
      DELETE: { label: 'حذف', color: 'bg-red-100 text-red-800' },
      LOGIN: { label: 'دخول', color: 'bg-purple-100 text-purple-800' },
      LOGOUT: { label: 'خروج', color: 'bg-gray-100 text-gray-800' },
      BACKUP: { label: 'نسخة احتياطية', color: 'bg-amber-100 text-amber-800' },
    }
    const m = map[action] || { label: action, color: 'bg-gray-100 text-gray-700' }
    return <Badge className={`${m.color} border-0 hover:${m.color}`}>{m.label}</Badge>
  }

  const entityLabel = (entity: string) => {
    const map: Record<string, string> = {
      Office: 'مكتب', Transfer: 'حوالة', Expense: 'مصروف',
      Creditor: 'دائن', Debtor: 'مدين', User: 'مستخدم',
      Commission: 'عمولة', System: 'النظام',
    }
    return map[entity] || entity
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter Action */}
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-40"><SelectValue placeholder="نوع العملية" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع العمليات</SelectItem>
              <SelectItem value="CREATE">إضافة</SelectItem>
              <SelectItem value="UPDATE">تعديل</SelectItem>
              <SelectItem value="DELETE">حذف</SelectItem>
              <SelectItem value="LOGIN">دخول</SelectItem>
              <SelectItem value="LOGOUT">خروج</SelectItem>
              <SelectItem value="BACKUP">نسخة احتياطية</SelectItem>
            </SelectContent>
          </Select>
          {/* Filter Entity */}
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-40"><SelectValue placeholder="نوع السجل" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع السجلات</SelectItem>
              <SelectItem value="Office">مكاتب</SelectItem>
              <SelectItem value="Transfer">حوالات</SelectItem>
              <SelectItem value="Expense">مصروفات</SelectItem>
              <SelectItem value="Creditor">دائنون</SelectItem>
              <SelectItem value="Debtor">مدينون</SelectItem>
              <SelectItem value="User">مستخدمين</SelectItem>
              <SelectItem value="System">النظام</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="w-4 h-4 ml-1" /> تحديث
          </Button>
        </div>
        <Button onClick={handleManualBackup} className="bg-amber-600 hover:bg-amber-700">
          <HardDrive className="w-4 h-4 ml-1" /> نسخة احتياطية الآن
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'BACKUP'].map(a => (
          <Card key={a} className="border-0 shadow-sm text-center p-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilterAction(filterAction === a ? 'all' : a)}>
            <p className="text-xs text-gray-500 mb-1">{a === 'CREATE' ? 'إضافة' : a === 'UPDATE' ? 'تعديل' : a === 'DELETE' ? 'حذف' : a === 'LOGIN' ? 'دخول' : a === 'LOGOUT' ? 'خروج' : 'نسخ'}</p>
            <p className="text-xl font-bold">{logs.filter(l => l.action === a).length}</p>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العملية</TableHead>
                  <TableHead>نوع السجل</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>التاريخ والوقت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                  </TableCell></TableRow>
                )}
                {!loading && logs.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">لا توجد سجلات</TableCell></TableRow>
                )}
                {!loading && logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>{actionLabel(log.action)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{entityLabel(log.entity)}</span>
                      {log.entityName && <p className="text-xs text-gray-400 truncate max-w-[120px]">{log.entityName}</p>}
                    </TableCell>
<TableCell className="text-sm max-w-xs">
                      <p className="truncate" title={log.description}>{log.description}</p>
                    </TableCell>
                    <TableCell className="text-sm">{log.userFullName || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm:ss')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ===================== RECONCILIATION SCREEN (ADMIN) =====================
function ReconciliationScreen({ user }: { user: User }) {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [tRes, oRes] = await Promise.all([
        fetch(`${API_BASE}/transfers?isVerified=false`),
        fetch(`${API_BASE}/offices`)
      ])
      const tData = await tRes.json()
      const oData = await oRes.json()
      setTransfers(tData.filter((t: Transfer) => t.status === 'completed' && !t.isVerified))
      setOffices(oData)
    } catch {
      toast({ title: 'خطأ', description: 'فشل جلب البيانات', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  const handleVerify = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/transfers/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userFullName: user.fullName })
      })
      if (res.ok) {
        toast({ title: 'تمت المطابقة', description: 'تم وسم العملية كمراجعة ومطابقة' })
        fetchData()
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل عملية المطابقة', variant: 'destructive' })
    }
  }

  const startEdit = (t: Transfer) => {
    setEditingTransfer(t)
    setEditForm({
      amount: t.amount,
      commissionAmount: t.commissionAmount,
      notes: t.notes || '',
      senderName: t.senderName,
      receiverName: t.receiverName,
      senderOfficeId: t.senderOfficeId,
      receiverOfficeId: t.receiverOfficeId,
      location: t.location || '',
      createdBy: t.createdBy,
      senderPhone: t.senderPhone || '',
      receiverPhone: t.receiverPhone || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingTransfer) return
    try {
      const res = await fetch(`${API_BASE}/transfers/${editingTransfer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          userId: user.id,
          userFullName: user.fullName
        })
      })
      if (res.ok) {
        toast({ title: 'تم التحديث', description: 'تم تعديل بيانات الحوالة بنجاح' })
        setEditingTransfer(null)
        fetchData()
      } else {
        const err = await res.json()
        toast({ title: 'خطأ', description: err.detail || 'فشل التعديل', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ غير متوقع', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Office Balance Summary Table */}
      <Card className="border-blue-100 shadow-md">
        <CardHeader className="bg-blue-50/50">
          <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
            <Wallet className="w-5 h-5" /> ملخص أرصدة المكاتب الحالية للمطابقة
          </CardTitle>
          <CardDescription>قارن هذه الأرصدة مع كشوفات WhatsApp في نهاية اليوم</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المكتب</TableHead>
                <TableHead>المنطقة</TableHead>
                <TableHead className="text-left">الرصيد الدفتري (في النظام)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offices.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-bold">{o.name}</TableCell>
                  <TableCell className="text-sm text-gray-500">{o.region}</TableCell>
                  <TableCell className={`text-left font-mono font-bold text-lg ${o.currentBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatMoney(o.currentBalance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><CheckSquare className="w-6 h-6 text-orange-600" /> مراجعة العمليات اليومية</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}><RefreshCw className={`w-4 h-4 ml-1 ${loading ? 'animate-spin' : ''}`} /> تحديث</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : transfers.length === 0 ? (
        <Card className="p-12 text-center text-gray-500 border-dashed bg-gray-50">
           <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
           <p className="text-lg font-medium">جميع العمليات مطابقة ومراجعة!</p>
           <p className="text-sm">لا توجد عمليات معلقة للمراجعة المسائية حالياً</p>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">يوجد {transfers.length} عملية بانتظار المراجعة والتدقيق</p>
          {transfers.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">رقم الحوالة</span>
                    <span className="font-mono font-bold text-blue-700">{t.transferNo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">من مكتب</span>
                    <span className="text-sm">{t.senderOffice?.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">إلى مكتب</span>
                    <span className="text-sm font-medium">{t.receiverOffice?.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">المبلغ</span>
                    <span className="font-bold">{formatMoney(t.amount)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(t)}>
                    <Edit2 className="w-4 h-4 ml-1" /> تعديل
                  </Button>
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => handleVerify(t.id)}>
                    طابق وتأكد
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingTransfer} onOpenChange={(open) => !open && setEditingTransfer(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" /> تعديل بيانات الحوالة ({editingTransfer?.transferNo})
            </DialogTitle>
            <DialogDescription>يمكنك تصحيح المبالغ أو الأسماء قبل التأكيد النهائي</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>المبلغ الصافي (المرسل)</Label>
              <Input type="text" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>العمولة</Label>
              <Input type="text" value={editForm.commissionAmount} onChange={e => setEditForm({...editForm, commissionAmount: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>اسم المرسل</Label>
              <Input value={editForm.senderName} onChange={e => setEditForm({...editForm, senderName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>اسم المستلم</Label>
              <Input value={editForm.receiverName} onChange={e => setEditForm({...editForm, receiverName: e.target.value})} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>ملاحظات</Label>
              <Textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingTransfer(null)}>إلغاء</Button>
            <Button className="bg-blue-600" onClick={handleSaveEdit}>حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===================== PAYOUT SCREEN (DOCUMENTATION MODE) =====================
function PayoutScreen({ user }: { user: User }) {
  const isAdmin = user.role === 'admin'
  const [offices, setOffices] = useState<Office[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    senderOfficeId: '',
    receiverOfficeId: user.officeId || '',
    amount: '',
    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',
    notes: '',
    commissionAmount: '0',
  })
  const [totalAmount, setTotalAmount] = useState('')
  const { toast } = useToast()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successCode, setSuccessCode] = useState('')
  const [rules, setRules] = useState<any[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/offices`).then(r => r.json()).then(data => setOffices(data)).catch(() => { })
    fetch(`${API_BASE}/commissions/rules`).then(r => r.json()).then(data => setRules(data)).catch(() => { })
  }, [])

  const getCommissionFromTotal = (totalVal: number, officeId: string) => {
    const office = offices.find(o => o.id === officeId)
    const officeType = office ? office.type : 'internal'
    
    const activeRules = rules.filter(r => r.isActive && r.transferType === officeType).sort((a,b) => (a.minAmount || 0) - (b.minAmount || 0))
    for (const rule of activeRules) {
        if (rule.type === 'percentage') {
             const net = totalVal / (1 + (rule.value / 100))
             const minOk = rule.minAmount === null || net >= rule.minAmount
             const maxOk = rule.maxAmount === null || net <= rule.maxAmount
             if (minOk && maxOk) return totalVal - net
        } else if (rule.type === 'fixed_per_amount') {
             const buckets = Math.ceil(totalVal / 1000)
             let comm = buckets * rule.value
             let net = totalVal - comm
             if (Math.ceil(net / 1000) < buckets) {
                 comm = (buckets - 1) * rule.value
                 net = totalVal - comm
             }
             const minOk = rule.minAmount === null || net >= rule.minAmount
             const maxOk = rule.maxAmount === null || net <= rule.maxAmount
             if (minOk && maxOk) return comm
        }
    }
    return 0
  }

  const updateCalculations = (total: string) => {
    const totalVal = parseFloat(total) || 0
    setTotalAmount(total)
    
    if (totalVal > 0) {
      const commission = getCommissionFromTotal(totalVal, form.senderOfficeId)
      const net = totalVal - commission
      
      setForm(f => ({
        ...f,
        amount: net.toFixed(2),
        commissionAmount: commission.toFixed(2)
      }))
    } else {
      setForm(f => ({ ...f, amount: '', commissionAmount: '0' }))
    }
  }

  const updateByNet = (net: string) => {
    const netVal = parseFloat(net) || 0
    const totalVal = parseFloat(totalAmount) || 0
    if (totalVal > 0) {
      const commission = totalVal - netVal
      setForm(f => ({ ...f, amount: net, commissionAmount: commission.toFixed(2) }))
    } else {
      setForm(f => ({ ...f, amount: net }))
    }
  }

  const updateByCommission = (comm: string) => {
    const commVal = parseFloat(comm) || 0
    const totalVal = parseFloat(totalAmount) || 0
    if (totalVal > 0) {
      const net = totalVal - commVal
      setForm(f => ({ ...f, amount: net.toFixed(2), commissionAmount: comm }))
    } else {
      setForm(f => ({ ...f, commissionAmount: comm }))
    }
  }

  const handleSubmit = async () => {
    const phoneRegex = /^\d{9,}$/
    if (!form.senderPhone || !phoneRegex.test(form.senderPhone.replace(/\s/g, ''))) {
      toast({ title: 'خطأ', description: 'رقم هاتف المرسل مطلوب ويجب ألا يقل عن 9 أرقام', variant: 'destructive' })
      return
    }
    if (!form.receiverPhone || !phoneRegex.test(form.receiverPhone.replace(/\s/g, ''))) {
      toast({ title: 'خطأ', description: 'رقم هاتف المستلم مطلوب ويجب ألا يقل عن 9 أرقام', variant: 'destructive' })
      return
    }
    if (!form.senderOfficeId || !form.receiverOfficeId || !form.amount) {
      toast({ title: 'خطأ', description: 'يرجى إدخال جميع البيانات المالية والمكاتب', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          commissionAmount: parseFloat(form.commissionAmount) || 0,
          status: 'completed',
          createdBy: user.id,
          userId: user.id,
          userFullName: user.fullName,
          isVerified: isAdmin
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'خطأ')
      toast({ title: 'تم التوثيق', description: `تم توثيق صرف الحوالة بنجاح` })
      setSuccessCode(data.transferNo)
      setShowSuccessModal(true)
    } catch (error) {
      toast({ title: 'خطأ', description: error instanceof Error ? error.message : 'حدث خطأ', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const resetAll = () => {
    setForm({
      senderOfficeId: '',
      receiverOfficeId: user.officeId || '',
      amount: '',
      senderName: '',
      senderPhone: '',
      receiverName: '',
      receiverPhone: '',
      notes: '',
      commissionAmount: '0',
    })
    setTotalAmount('')
  }

  return (
    <div className="min-h-screen bg-slate-50/50 -m-6 p-6 font-tajawal rtl" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: `
        .font-tajawal { font-family: 'Tajawal', sans-serif; }
        .split-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px -10px rgba(0,0,0,0.05);
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        .side { padding: 40px; position: relative; }
        .side-green { background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%); border-left: 1px solid #dcfce7; }
        .side-red { background: linear-gradient(225deg, #fff1f2 0%, #ffffff 100%); border-right: 1px solid #ffe4e6; }
        .big-sign {
            width: 70px; height: 70px; border-radius: 24px;
            display: flex; align-items: center; justify-content: center;
            font-size: 32px; font-weight: 900; margin: 0 auto 24px;
            box-shadow: 0 12px 24px -6px rgba(0,0,0,0.1);
        }
        .sign-green { background: linear-gradient(135deg, #22c55e, #15803d); color: white; }
        .sign-red { background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; }
        .side-title { text-align: center; font-size: 22px; font-weight: 900; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 4px solid; }
        .side-green .side-title { color: #15803d; border-color: #22c55e; }
        .side-red .side-title { color: #991b1b; border-color: #ef4444; }
        .amount-field {
            width: 100%; padding: 14px 18px; padding-left: 60px;
            border: 3px solid #cbd5e1; border-radius: 12px;
            font-size: 24px; font-weight: 900; outline: none; transition: all 0.2s;
        }
        .amount-field:focus { border-color: #94a3b8; box-shadow: 0 0 0 4px rgba(148,163,184,0.1); }
        .side-green .amount-field { color: #15803d; border-color: #22c55e; background: #f0fdf4; }
        .side-red .amount-field { color: #991b1b; border-color: #ef4444; background: #fff1f2; }
        .side-amount { background: white; border: 2px dashed #e2e8f0; border-radius: 16px; padding: 20px; text-align: center; margin-top: 15px; }
        .side-green .side-amount { border-color: #22c55e; }
        .side-red .side-amount { border-color: #ef4444; }
        .center-connector {
            position: absolute; top: 50%; left: 0; transform: translate(-50%, -50%);
            width: 50px; height: 50px; background: white; border: 4px solid #f1f5f9;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 20px; z-index: 10; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1);
        }
        @media (max-width: 768px) {
            .split-layout { grid-template-columns: 1fr; }
            .center-connector { display: none; }
        }
      ` }} />

      <div className="text-center mb-10 pt-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-3">
          <span className="bg-red-100 p-3 rounded-2xl">💵</span>
          صرف حوالة واردة
        </h1>
        <p className="text-slate-500 mt-3 font-bold text-lg">توثيق تسليم المبالغ النقدية للمستفيدين من حوالات واردة للمكتب</p>
      </div>

      <div className="max-w-[1050px] mx-auto">
        <div className="split-layout">
          {/* SOURCE SIDE (Greenish/Incoming Credit) */}
          <div className="side side-green opacity-90">
            <div className="big-sign sign-green">↙</div>
            <div className="side-title">مصدر الحوالة (المكتب المرسل)</div>
            
            <div className="space-y-5">
              <div>
                <Label className="font-extrabold text-slate-700 text-sm mb-2 block">المكتب الذي استلم الحوالة أصلاً <span className="text-red-500">*</span></Label>
                <Select value={form.senderOfficeId} onValueChange={v => setForm({ ...form, senderOfficeId: v })}>
                  <SelectTrigger className="bg-white border-2 border-slate-200 h-14 font-bold text-lg rounded-xl"><SelectValue placeholder="اختر المكتب المصدر..." /></SelectTrigger>
                  <SelectContent>
                    {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-extrabold text-slate-700 text-sm mb-2 block">اسم المرسل الأصلي (اختياري)</Label>
                <Input value={form.senderName} onChange={e => setForm({ ...form, senderName: e.target.value })} className="h-14 border-2 font-bold text-lg rounded-xl" placeholder="اسم صاحب الحوالة..." />
              </div>

              <div>
                <Label className="font-extrabold text-slate-700 text-sm mb-2 block">رقم هاتف المرسل (إلزامي) <span className="text-red-500">*</span></Label>
                <Input value={form.senderPhone} onChange={e => setForm({ ...form, senderPhone: e.target.value })} className="h-14 border-2 font-bold text-lg rounded-xl" placeholder="09XXXXXXXX" />
              </div>

              <div>
                <Label className="font-extrabold text-slate-700 text-sm mb-2 block text-green-700">المبلغ الإجمالي المستلم في المصدر (الإجمالي) <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={totalAmount} 
                    onChange={e => updateCalculations(e.target.value)} 
                    className="amount-field shadow-md border-green-300" 
                    placeholder="0.00" 
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 bg-green-100 px-3 py-1.5 rounded-lg text-sm font-black text-green-600">د.ل</span>
                </div>
                <p className="text-[10px] text-green-600 font-bold mt-2">سيتم خصم العمولة تلقائياً من هذا المبلغ</p>
              </div>
            </div>
          </div>

          {/* PAYOUT SIDE (Reddish/Cash Out) */}
          <div className="side side-red">
            <div className="center-connector">⇄</div>
            <div className="big-sign sign-red">−</div>
            <div className="side-title">بيانات الصرف للمستلم</div>

            <div className="space-y-5">
              <div>
                <Label className="font-extrabold text-slate-700 text-sm mb-2 block">المكتب الصارف (الحالي) <span className="text-red-500">*</span></Label>
                <Select value={form.receiverOfficeId} onValueChange={v => setForm({ ...form, receiverOfficeId: v })} disabled={!isAdmin}>
                  <SelectTrigger className="bg-white border-2 border-slate-200 h-14 font-bold text-lg rounded-xl"><SelectValue placeholder="المكتب الحالي..." /></SelectTrigger>
                  <SelectContent>
                    {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-extrabold text-slate-700 text-sm mb-2 block">اسم المستلم الفعلي (اختياري)</Label>
                <Input value={form.receiverName} onChange={e => setForm({ ...form, receiverName: e.target.value })} className="h-14 border-2 font-bold text-lg rounded-xl" placeholder="اسم الشخص الذي استلم..." />
              </div>

              <div>
                <Label className="font-extrabold text-slate-700 text-sm mb-2 block">رقم هاتف المستلم (إلزامي) <span className="text-red-500">*</span></Label>
                <Input value={form.receiverPhone} onChange={e => setForm({ ...form, receiverPhone: e.target.value })} className="h-14 border-2 font-bold text-lg rounded-xl" placeholder="09XXXXXXXX" />
              </div>

              <div>
                <Label className="font-extrabold text-slate-700 text-sm mb-2 block text-red-700">المبلغ الصافي المسلم للمستفيد (كاش) <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <input type="text" value={form.amount} onChange={e => updateByNet(e.target.value)} className="amount-field shadow-md border-red-300" placeholder="0.00" />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 bg-red-100 px-3 py-1.5 rounded-lg text-sm font-black text-red-600">د.ل</span>
                </div>
                <p className="text-[10px] text-red-600 font-bold mt-2">المبلغ الذي سيخرج فعلياً من رصيدك</p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Details Section */}
        <div className="mt-8 bg-white border-2 border-slate-100 rounded-[24px] shadow-2xl p-10">
          <h3 className="text-center font-black text-slate-900 mb-8 uppercase tracking-widest text-sm bg-slate-50 py-3 rounded-xl border border-slate-100">⚙️ تفاصيل القيد المالي والعمولة</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-center ring-4 ring-white shadow-sm">
              <p className="text-xs font-black text-slate-400 uppercase mb-2">المبلغ الإجمالي (للتوثيق ✍️)</p>
              <input 
                type="text" 
                value={totalAmount} 
                onChange={e => updateCalculations(e.target.value)}
                className="w-full bg-transparent text-center text-3xl font-black text-green-700 outline-none placeholder:text-green-200"
                placeholder="0.00"
              />
            </div>
            
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center ring-4 ring-blue-50 shadow-sm relative">
              <p className="text-xs font-black text-blue-400 uppercase mb-2">الصافي للمستفيد (تلقائي)</p>
              <input 
                type="text" 
                value={form.amount} 
                onChange={e => updateByNet(e.target.value)}
                className="w-full bg-transparent text-center text-3xl font-black text-blue-700 outline-none"
              />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-3 py-1 rounded-full font-bold">صرف نقدي</div>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center ring-4 ring-red-50 shadow-sm relative group">
              <p className="text-xs font-black text-red-400 uppercase mb-2">العمولة المستقطعة</p>
              <input 
                type="text" 
                value={form.commissionAmount} 
                onChange={e => updateByCommission(e.target.value)}
                className="w-full bg-transparent text-center text-3xl font-black text-red-600 outline-none"
              />
              <button 
                onClick={() => updateCalculations(totalAmount)}
                className="absolute -top-3 right-4 bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity font-bold"
              >
                إعادة الحساب (1%)
              </button>
            </div>
          </div>

          <div className="mb-8">
            <Label className="font-bold text-slate-500 mb-3 block">ملاحظات الصرف (مثل: رقم الحوالة من WhatsApp)</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="min-h-[100px] border-2 font-bold text-lg rounded-2xl" placeholder="أدخل تفاصيل إضافية أو أرقام مراجعة..." />
          </div>
          
          <div className="flex flex-col md:flex-row gap-5">
            <Button 
              className="flex-1 h-20 text-2xl font-black bg-gradient-to-r from-red-800 to-red-600 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl rounded-2xl" 
              disabled={loading || !form.amount || !form.senderOfficeId || !form.receiverOfficeId || !form.senderPhone || !form.receiverPhone} 
              onClick={handleSubmit}
            >
              {loading ? <RefreshCw className="w-8 h-8 animate-spin" /> : '🚀 توثيق صرف الحوالة والعمولة'}
            </Button>
            <Button variant="outline" className="h-20 px-10 text-xl font-bold border-2 rounded-2xl hover:bg-slate-50" onClick={resetAll}>🗑️ إلغاء</Button>
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl p-10 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 text-5xl font-black shadow-inner">✓</div>
            <h2 className="text-3xl font-black text-slate-900 mb-3">تم الصرف بنجاح</h2>
            <p className="text-slate-400 text-sm mb-8 font-bold">تم خفض رصيدك وتوثيق الحوالة</p>
            <div className="bg-slate-900 text-white py-4 px-8 rounded-2xl font-black text-3xl tracking-widest inline-block mb-10 shadow-xl">{successCode}</div>
            <Button className="w-full h-14 bg-red-600 hover:bg-red-700 text-white text-xl font-black rounded-2xl transition-all" onClick={() => { setShowSuccessModal(false); resetAll() }}>إغلاق</Button>
          </div>
        </div>
      )}
    </div>
  )
}
