'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { Trash2, Plus, ArrowUpRight, ArrowDownRight, Search, Users, CreditCard, ChevronDown, Check, X, FileText, Upload, Calendar, IndianRupee, Tag, BookOpen, MessageCircle, Bell, Pencil, ArrowLeft, LayoutDashboard, PieChart, Lock } from 'lucide-react';
import { Resident, Transaction } from '@/types';

export default function AdminPage() {
    // Admin Login State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminCode, setAdminCode] = useState('');
    const [codeError, setCodeError] = useState('');

    const [activeTab, setActiveTab] = useState<'residents' | 'transactions' | 'ledger' | 'reminders' | 'reports'>('residents');
    const [residents, setResidents] = useState<Resident[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingResident, setEditingResident] = useState<Resident | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [transMonth, setTransMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [viewingInvoice, setViewingInvoice] = useState<string | null>(null);

    // Transaction Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'REVENUE' | 'EXPENSE'>('ALL');

    // Form states
    const [resForm, setResForm] = useState({ name: '', flatNumber: '', contact: '', role: 'Owner' });
    const [transForm, setTransForm] = useState<{
        type: 'REVENUE' | 'EXPENSE';
        category: string;
        amount: string;
        description: string;
        date: string;
        paymentMode: 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING' | 'CHEQUE';
        spender?: string;
        isRefundable?: boolean;
        residentId?: string;
        invoiceImage?: string;
    }>({
        type: 'REVENUE',
        category: 'Maintenance Fee',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        paymentMode: 'UPI',
        isRefundable: false
    });

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated]);

    const handleLogin = (e: FormEvent) => {
        e.preventDefault();
        if (adminCode === '1234') { // Simple hardcoded check
            setIsAuthenticated(true);
            setCodeError('');
        } else {
            setCodeError('Invalid Access Code');
        }
    };

    const fetchData = async () => {
        try {
            const [resRes, transRes] = await Promise.all([
                fetch('/api/residents'),
                fetch('/api/transactions')
            ]);
            const resData = await resRes.json();
            const transData = await transRes.json();
            setResidents(resData);
            setTransactions(transData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const validatePhone = (phone: string) => {
        return /^\d{10}$/.test(phone);
    };

    const startEditResident = (resident: Resident) => {
        setEditingResident(resident);
        setResForm({
            name: resident.name,
            flatNumber: resident.flatNumber,
            contact: resident.contact,
            role: resident.role || 'Owner'
        });
    };

    const cancelEditResident = () => {
        setEditingResident(null);
        setResForm({ name: '', flatNumber: '', contact: '', role: 'Owner' });
    };

    const handleCreateResident = async (e: FormEvent) => {
        e.preventDefault();
        if (!validatePhone(resForm.contact)) {
            alert("Please enter a valid 10-digit phone number");
            return;
        }

        try {
            const url = editingResident ? '/api/residents' : '/api/residents';
            const method = editingResident ? 'PUT' : 'POST';
            const body = editingResident ? { ...resForm, id: editingResident.id } : resForm;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                setResForm({ name: '', flatNumber: '', contact: '', role: 'Owner' });
                setEditingResident(null);
                fetchData();
            }
        } catch (error) {
            console.error('Error saving resident:', error);
        }
    };

    const handleDeleteResident = async (id: string) => {
        if (!confirm('Are you sure? This will delete all associated data.')) return;
        await fetch(`/api/residents?id=${id}`, { method: 'DELETE' });
        fetchData();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setTransForm({ ...transForm, invoiceImage: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const startEditTransaction = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setTransForm({
            type: transaction.type,
            category: transaction.category,
            amount: transaction.amount.toString(),
            description: transaction.description || '',
            date: transaction.date,
            paymentMode: transaction.paymentMode,
            spender: transaction.spender,
            isRefundable: transaction.isRefundable,
            residentId: transaction.residentId,
            invoiceImage: transaction.invoiceImage
        });
        // Switch to transactions tab if not active? Actually the form is IN the transactions tab.
        // Scroll to form (optional, for better UX)
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    const cancelEditTransaction = () => {
        setEditingTransaction(null);
        setTransForm({
            type: 'REVENUE',
            category: 'Maintenance Fee',
            amount: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            paymentMode: 'UPI',
            isRefundable: false,
            residentId: '',
            spender: '',
            invoiceImage: undefined
        });
    };

    const handleCreateTransaction = async (e: FormEvent) => {
        e.preventDefault();

        // Validation
        if (transForm.type === 'REVENUE' && !transForm.residentId) {
            alert("Please select a resident for revenue entry.");
            return;
        }
        if (transForm.type === 'EXPENSE' && !transForm.spender) {
            alert("Please specify who spent the amount.");
            return;
        }

        // Invoice Mandatory Check
        if (transForm.type === 'EXPENSE') {
            if (!transForm.invoiceImage) {
                alert("An Invoice is MANDATORY for all expenses. Please upload an image.");
                return;
            }
        }

        try {
            const url = editingTransaction ? '/api/transactions' : '/api/transactions';
            const method = editingTransaction ? 'PUT' : 'POST';
            const body = editingTransaction ? { ...transForm, id: editingTransaction.id } : transForm;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                setTransForm({
                    type: transForm.type,
                    category: transForm.type === 'REVENUE' ? 'Maintenance Fee' : 'Electricity Bill',
                    amount: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    paymentMode: 'UPI',
                    isRefundable: false,
                    residentId: '',
                    spender: '',
                    invoiceImage: undefined
                });
                setEditingTransaction(null);
                fetchData();
            } else {
                alert("Failed to save transaction");
            }
        } catch (error) {
            console.error('Error creating transaction:', error);
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!confirm('Are you sure you want to delete this transaction?')) return;
        try {
            await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            console.error('Error deleting transaction:', error);
        }
    };

    // Calculate pending maintenance
    const currentMonth = new Date().toISOString().slice(0, 7);
    const residentsWithDues = residents.map(r => {
        const paidThisMonth = transactions
            .filter(t => t.residentId === r.id && t.type === 'REVENUE' && t.date.startsWith(currentMonth))
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const expected = r.flatNumber === 'FF' ? 4500 : 3000;
        return { ...r, paid: paidThisMonth, due: Number((expected - paidThisMonth).toFixed(2)) };
    }).filter(r => r.due > 0);

    const pendingCount = residentsWithDues.length;
    const isLate = new Date().getDate() > 22;

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="bg-gray-100 p-4 rounded-full w-fit mx-auto mb-6">
                        <Lock className="w-8 h-8 text-gray-700" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access</h1>
                    <p className="text-gray-500 mb-6">Please enter the access code to continue.</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={adminCode}
                            onChange={(e) => setAdminCode(e.target.value)}
                            className="w-full text-center text-2xl tracking-widest p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 outline-none bg-white text-gray-900"
                            placeholder="••••"
                            maxLength={8}
                            autoFocus
                        />
                        {codeError && <p className="text-red-500 text-sm">{codeError}</p>}
                        <button
                            type="submit"
                            className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition"
                        >
                            Unlock Dashboard
                        </button>
                    </form>
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <Link href="/" className="text-gray-500 hover:text-gray-900 text-sm">
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Filter Logic for Transactions Tab
    const filteredTransactions = transactions.filter(t => {
        const matchesMonth = t.date.startsWith(transMonth);
        const matchesType = filterType === 'ALL' || t.type === filterType;

        const residentName = residents.find(r => r.id === t.residentId)?.name.toLowerCase() || '';
        const lowerSearch = searchTerm.toLowerCase();
        const matchesSearch =
            t.description?.toLowerCase().includes(lowerSearch) ||
            t.category.toLowerCase().includes(lowerSearch) ||
            t.amount.toString().includes(lowerSearch) ||
            residentName.includes(lowerSearch) ||
            (t.spender && t.spender.toLowerCase().includes(lowerSearch));

        return matchesMonth && matchesType && matchesSearch;
    });

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
            {/* SIDEBAR */}
            <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 text-indigo-600" />
                        Admin Portal
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">Swati Parc Expense Tracker</p>
                </div>
                <nav className="mt-6 space-y-1">
                    <button onClick={() => setActiveTab('residents')} className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition ${activeTab === 'residents' ? 'bg-gray-100 text-gray-900 border-r-4 border-gray-800' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                        <Users className="w-5 h-5" /> Residents
                    </button>
                    <button onClick={() => setActiveTab('transactions')} className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition ${activeTab === 'transactions' ? 'bg-gray-100 text-gray-900 border-r-4 border-gray-800' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                        <CreditCard className="w-5 h-5" /> Transactions
                    </button>
                    <button onClick={() => setActiveTab('reminders')} className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition ${activeTab === 'reminders' ? 'bg-gray-100 text-gray-900 border-r-4 border-gray-800' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                        <Bell className="w-5 h-5" /> Reminders
                    </button>
                    <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition ${activeTab === 'reports' ? 'bg-gray-100 text-gray-900 border-r-4 border-gray-800' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                        <PieChart className="w-5 h-5" /> Reports
                    </button>
                    <div className="pt-8 px-6">
                        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-gray-700 text-sm">
                            <ArrowLeft className="w-4 h-4" /> Exit
                        </Link>
                    </div>
                </nav>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-7xl mx-auto">

                    {/* OVERDUE ALERT BANNER */}
                    {isLate && pendingCount > 0 && (
                        <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-pulse">
                            <Bell className="w-5 h-5 text-red-600 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-red-800">Maintenance Overdue!</h3>
                                <p className="text-sm text-red-700">It is past the 22nd. <span className="font-bold">{pendingCount} residents</span> have not paid maintenance this month.</p>
                            </div>
                        </div>
                    )}

                    {/* RESIDENTS TAB */}
                    {
                        activeTab === 'residents' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    <h2 className="text-xl font-bold mb-4 text-gray-800">Resident List</h2>
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                                                <tr>
                                                    <th className="p-4">Flat No</th>
                                                    <th className="p-4">Name</th>
                                                    <th className="p-4">Contact</th>
                                                    <th className="p-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {residents.map(r => (
                                                    <tr key={r.id} className="hover:bg-gray-50 transition">
                                                        <td className="p-4 font-medium text-gray-900">{r.flatNumber}</td>
                                                        <td className="p-4">
                                                            <div className="flex items-center text-gray-700 gap-2">
                                                                {r.name}
                                                                {r.role && r.role !== 'Owner' && (
                                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.role === 'President' || r.role === 'Secretary' || r.role === 'Admin' ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                        {r.role}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-gray-500 font-mono text-sm">{r.contact}</td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button onClick={() => startEditResident(r)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDeleteResident(r.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {residents.length === 0 && <p className="p-8 text-center text-gray-400">No residents added yet.</p>}
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                                    <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800 gap-2">
                                        {editingResident ? <Pencil className="w-5 h-5 text-gray-500" /> : <Plus className="w-5 h-5 text-gray-500" />}
                                        {editingResident ? 'Edit Resident' : 'Add Resident'}
                                    </h3>
                                    <form onSubmit={handleCreateResident} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Flat Number</label>
                                            <input required type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none bg-white text-gray-900" value={resForm.flatNumber} onChange={(e) => setResForm({ ...resForm, flatNumber: e.target.value })} placeholder="e.g. 101" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input required type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none bg-white text-gray-900" value={resForm.name} onChange={(e) => setResForm({ ...resForm, name: e.target.value })} placeholder="John Doe" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact (10 digits)</label>
                                            <input type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none bg-white text-gray-900" value={resForm.contact} onChange={(e) => setResForm({ ...resForm, contact: e.target.value })} placeholder="9876543210" maxLength={10} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                            <div className="relative">
                                                <select className="w-full appearance-none p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-500 bg-white pr-10 text-gray-900" value={resForm.role} onChange={(e) => setResForm({ ...resForm, role: e.target.value })}>
                                                    <option value="Owner">Owner</option>
                                                    <option value="Tenant">Tenant</option>
                                                    <option value="President">President</option>
                                                    <option value="Secretary">Secretary</option>
                                                    <option value="Admin">Admin</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="pt-2 flex gap-2">
                                            <button type="submit" className="flex-1 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition">
                                                {editingResident ? 'Update' : 'Add'}
                                            </button>
                                            {editingResident && (
                                                <button type="button" onClick={cancelEditResident} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            </div >
                        )
                    }

                    {/* TRANSACTIONS TAB */}
                    {
                        activeTab === 'transactions' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <h2 className="text-xl font-bold text-gray-800">
                                            Transactions for {new Date(transMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                                        </h2>
                                        <div className="w-48">
                                            <input
                                                type="month"
                                                value={transMonth}
                                                onChange={(e) => setTransMonth(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-900 text-center font-medium shadow-sm cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    {/* SEARCH AND FILTERS */}
                                    <div className="mb-6 flex flex-col md:flex-row gap-4">
                                        <div className="flex-1 relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search transactions..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                                            />
                                        </div>
                                        <div className="relative w-full md:w-48">
                                            <select
                                                value={filterType}
                                                onChange={(e) => setFilterType(e.target.value as "ALL" | "REVENUE" | "EXPENSE")}
                                                className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
                                            >
                                                <option value="ALL">All Types</option>
                                                <option value="REVENUE">Income</option>
                                                <option value="EXPENSE">Expense</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/50 sticky top-0 backdrop-blur-sm z-10">
                                                        <th className="p-3 w-16">#</th>
                                                        <th className="p-3">Date</th>
                                                        <th className="p-3">Info</th>
                                                        <th className="p-3">Category</th>
                                                        <th className="p-3">Mode</th>
                                                        <th className="p-3">Amount</th>
                                                        <th className="p-3 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredTransactions.length === 0 ? (
                                                        <tr><td colSpan={7} className="p-8 text-center text-gray-400">No transactions found matching your criteria.</td></tr>
                                                    ) : (
                                                        filteredTransactions.slice().reverse().map((t, index) => {
                                                            const resident = residents.find(r => r.id === t.residentId);
                                                            const dateObj = new Date(t.date);
                                                            const month = dateObj.toLocaleString('default', { month: 'long' });
                                                            const [y, m, d] = t.date.split('-');
                                                            const formattedDate = `${d}-${m}-${y}`;
                                                            const message = `Dear ${resident?.name}, we have received the maintenance fee for the month of ${month} on ${formattedDate}. Please treat this as the e-receipt of the same. Thank You\nSwati Parc Association`;

                                                            return (
                                                                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                                                    <td className="p-3 text-sm text-gray-400 font-mono">{index + 1}</td>
                                                                    <td className="p-3 text-sm text-gray-500">{t.date}</td>
                                                                    <td className="p-3">
                                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'REVENUE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                            {t.type}
                                                                        </span>
                                                                        <div className="text-xs text-gray-500 mt-1">
                                                                            {t.type === 'REVENUE'
                                                                                ? `From: ${resident?.name || 'Unknown'}`
                                                                                : `By: ${t.spender}${t.isRefundable ? ' (Refundable)' : ''}`}
                                                                            {t.invoiceImage && (
                                                                                <button onClick={() => setViewingInvoice(t.invoiceImage || null)} className="flex items-center gap-1 text-gray-600 hover:text-gray-800 mt-1">
                                                                                    <FileText className="w-3 h-3" /> View Invoice
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        {t.type === 'REVENUE' && resident && (
                                                                            <a
                                                                                href={`https://wa.me/91${resident.contact}?text=${encodeURIComponent(message)}`}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="flex items-center gap-1 text-green-600 hover:text-green-800 mt-2 bg-green-50 px-2 py-1 rounded w-fit transition-colors"
                                                                            >
                                                                                <MessageCircle className="w-3 h-3" /> Share Receipt
                                                                            </a>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 font-medium text-gray-500">{t.category}</td>
                                                                    <td className="p-3 text-sm text-gray-500">{t.paymentMode}</td>
                                                                    <td className={`p-3 font-bold ${t.type === 'REVENUE' ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {t.type === 'REVENUE' ? '+' : '-'}₹{Number(t.amount).toFixed(2)}
                                                                    </td>
                                                                    <td className="p-3 text-right">
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <button onClick={() => startEditTransaction(t)} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition" title="Edit Transaction">
                                                                                <Pencil className="w-4 h-4" />
                                                                            </button>
                                                                            <button onClick={() => handleDeleteTransaction(t.id)} className="p-1 hover:bg-red-50 rounded text-red-600 transition" title="Delete Transaction">
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                                        {editingTransaction ? <Pencil className="w-5 h-5 text-gray-800" /> : <Plus className="w-5 h-5 text-gray-800" />}
                                        {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
                                    </h3>
                                    <form onSubmit={handleCreateTransaction} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <button type="button" onClick={() => setTransForm({ ...transForm, type: 'REVENUE', category: 'Maintenance Fee' })} className={`py-2 rounded-lg font-bold transition ${transForm.type === 'REVENUE' ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Revenue</button>
                                            <button type="button" onClick={() => setTransForm({ ...transForm, type: 'EXPENSE', category: 'Electricity Bill' })} className={`py-2 rounded-lg font-bold transition ${transForm.type === 'EXPENSE' ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Expense</button>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                            <div className="w-full">
                                                <input
                                                    type="date"
                                                    value={transForm.date}
                                                    onChange={(e) => setTransForm({ ...transForm, date: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-900"
                                                />
                                            </div>
                                        </div>

                                        {transForm.type === 'REVENUE' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Resident (Payer)</label>
                                                <div className="relative">
                                                    <select required className="w-full appearance-none p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-500 bg-white pr-10 text-gray-900" value={transForm.residentId || ''} onChange={(e) => setTransForm({ ...transForm, residentId: e.target.value })}>
                                                        <option value="">Select Resident</option>
                                                        {residents.map(r => <option key={r.id} value={r.id}>{r.name} - {r.flatNumber}</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                </div>
                                            </div>
                                        )}

                                        {transForm.type === 'EXPENSE' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Spender (Resident)</label>
                                                    <div className="relative">
                                                        <select required className="w-full appearance-none p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-500 bg-white pr-10 text-gray-900" value={transForm.spender || ''} onChange={(e) => setTransForm({ ...transForm, spender: e.target.value })}>
                                                            <option value="">Select Spender</option>
                                                            {residents.map(r => <option key={r.id} value={r.name}>{r.name} - {r.flatNumber}</option>)}
                                                        </select>
                                                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" id="refundable" checked={transForm.isRefundable} onChange={(e) => setTransForm({ ...transForm, isRefundable: e.target.checked })} className="w-4 h-4 text-gray-800 focus:ring-gray-500 border-gray-300 rounded text-gray-900" />
                                                    <label htmlFor="refundable" className="text-sm font-medium text-gray-700">Refundable to Spender?</label>
                                                </div>
                                            </>
                                        )}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                            <div className="relative">
                                                <select className="w-full appearance-none p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-500 bg-white pr-10 text-gray-900" value={transForm.category} onChange={(e) => setTransForm({ ...transForm, category: e.target.value })}>
                                                    {transForm.type === 'REVENUE' ? <><option>Maintenance Fee</option><option>Donation</option><option>Fine</option><option>Other Income</option></> : <><option>Electricity Bill</option><option>Water Bill</option><option>Security</option><option>Maid Fees</option><option>Lift AMC</option><option>Lift Maintenance</option><option>CCTV</option><option>Cleaning</option><option>Plumber</option><option>Electrical Work</option><option>Painting</option><option>Repairs</option><option>Other</option></>}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                                            <div className="relative">
                                                <select className="w-full appearance-none p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-500 bg-white pr-10 text-gray-900" value={transForm.paymentMode} onChange={(e) => setTransForm({ ...transForm, paymentMode: e.target.value as "UPI" | "CASH" | "CARD" | "NET_BANKING" | "CHEQUE" })}>
                                                    <option value="UPI">UPI</option>
                                                    <option value="CASH">Cash</option>
                                                    <option value="CARD">Card</option>
                                                    <option value="NET_BANKING">Net Banking</option>
                                                    <option value="CHEQUE">Cheque</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                                            <input 
                                                required 
                                                type="number" 
                                                min="0" 
                                                step="0.01" 
                                                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-900" 
                                                value={transForm.amount} 
                                                onChange={(e) => setTransForm({ ...transForm, amount: e.target.value })} 
                                                onWheel={(e) => (e.target as HTMLElement).blur()}
                                                placeholder="0.00" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                            <input type="text" className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-900" value={transForm.description} onChange={(e) => setTransForm({ ...transForm, description: e.target.value })} placeholder="Optional notes" />
                                        </div>

                                        {transForm.type === 'EXPENSE' && (
                                            <div className="border-t border-gray-100 pt-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                                    <Upload className="w-4 h-4" /> Upload Invoice (Required)
                                                </label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transaction"
                                                />
                                                {transForm.invoiceImage && (
                                                    <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                                                        <img src={transForm.invoiceImage} alt="Invoice Preview" className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setTransForm({ ...transForm, invoiceImage: undefined })}
                                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition"
                                                            title="Remove Image"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <button type="submit" className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition shadow-md">
                                                {editingTransaction ? 'Update' : 'Record'} {transForm.type === 'REVENUE' ? 'Income' : 'Expense'}
                                            </button>
                                            {editingTransaction && (
                                                <button type="button" onClick={cancelEditTransaction} className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )
                    }

                    {/* REMINDERS TAB */}
                    {
                        activeTab === 'reminders' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Bell className="w-5 h-5" /> Maintenance Reminders
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {residentsWithDues.length === 0 ? (
                                        <p className="col-span-full text-center text-gray-500 py-8">Everyone has paid maintenance for this month!</p>
                                    ) : (
                                        residentsWithDues.map(r => (
                                            <div key={r.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                                                                {r.flatNumber}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-gray-900">{r.name}</h3>
                                                                <p className="text-sm text-gray-500">{r.role || 'Owner'}</p>
                                                            </div>
                                                        </div>
                                                        <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded font-bold">Due</span>
                                                    </div>
                                                    <p className="text-gray-600 text-sm mb-4">Pending Amount: <span className="font-bold text-gray-900">₹{r.due.toFixed(2)}</span></p>
                                                </div>
                                                <div className="mt-4 border-t border-gray-100 pt-4">
                                                    <a
                                                        href={`https://wa.me/91${r.contact}?text=${encodeURIComponent(`Dear ${r.name}, this is a gentle reminder to pay the maintenance of ₹${r.due} for ${new Date().toLocaleString('default', { month: 'long' })}. Please pay at your earliest convenience.`)}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold transition"
                                                    >
                                                        <MessageCircle className="w-4 h-4" /> Send Reminder
                                                    </a>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )
                    }

                    {/* REPORTS TAB */}
                    {
                        activeTab === 'reports' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <PieChart className="w-5 h-5" /> Financial Reports
                                    </h2>
                                    <div className="w-48">
                                        <input
                                            type="month"
                                            value={reportMonth}
                                            onChange={(e) => setReportMonth(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-900 text-center font-medium cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {(() => {
                                    const monthlyTrans = transactions.filter(t => t.date.startsWith(reportMonth));
                                    const totalIncome = monthlyTrans.filter(t => t.type === 'REVENUE').reduce((sum, t) => sum + t.amount, 0);
                                    const totalExpense = monthlyTrans.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
                                    const netBalance = totalIncome - totalExpense;

                                    // Category Breakdown
                                    const categoryData = monthlyTrans.reduce((acc, t) => {
                                        if (!acc[t.category]) acc[t.category] = { revenue: 0, expense: 0 };
                                        if (t.type === 'REVENUE') acc[t.category].revenue += Number(t.amount);
                                        else acc[t.category].expense += Number(t.amount);
                                        return acc;
                                    }, {} as Record<string, { revenue: number, expense: number }>);

                                    // Refunds Owed Logic (All-Time)
                                    const allTimeRefundableTrans = transactions.filter(t => t.type === 'EXPENSE' && t.isRefundable);
                                    const owedBySpender = allTimeRefundableTrans.reduce((acc, t) => {
                                        if (!t.spender) return acc;
                                        if (!acc[t.spender]) acc[t.spender] = 0;
                                        acc[t.spender] += Number(t.amount);
                                        return acc;
                                    }, {} as Record<string, number>);
                                    const totalOwed = Object.values(owedBySpender).reduce((sum, val) => sum + val, 0);

                                    return (
                                        <>
                                            {/* Summary Cards */}
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                                    <p className="text-sm text-gray-500 font-medium">Total Income</p>
                                                    <p className="text-2xl font-bold text-green-600 mt-2">₹{totalIncome.toFixed(2)}</p>
                                                </div>
                                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                                    <p className="text-sm text-gray-500 font-medium">Total Expenses</p>
                                                    <p className="text-2xl font-bold text-red-600 mt-2">₹{totalExpense.toFixed(2)}</p>
                                                </div>
                                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                                    <p className="text-sm text-gray-500 font-medium">Net Balance</p>
                                                    <p className={`text-2xl font-bold mt-2 ${netBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                                        ₹{netBalance.toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100">
                                                    <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Refunds Owed</p>
                                                    <p className="text-2xl font-bold text-orange-600 mt-2">₹{totalOwed.toFixed(2)}</p>
                                                </div>
                                            </div>

                                            {/* Refunds Owed Breakdown */}
                                            {Object.keys(owedBySpender).length > 0 && (
                                                <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-200 mt-6">
                                                    <h3 className="font-bold text-gray-800 mb-4">Pending Refunds by Spender (All-Time)</h3>
                                                    <div className="space-y-3">
                                                        {Object.entries(owedBySpender).map(([spender, amt]) => (
                                                            <div key={spender} className="flex justify-between items-center p-3 hover:bg-orange-50 rounded-lg transition border border-transparent hover:border-orange-100">
                                                                <span className="font-medium text-gray-700">{spender}</span>
                                                                <span className="font-bold text-orange-600">₹{amt.toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Breakdown */}
                                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6">
                                                <h3 className="font-bold text-gray-800 mb-4">Category Breakdown</h3>
                                                <div className="space-y-3">
                                                    {Object.keys(categoryData).length === 0 ? (
                                                        <p className="text-gray-500 text-center py-4">No data for this month.</p>
                                                    ) : (
                                                        Object.entries(categoryData).map(([cat, data]) => (
                                                            <div key={cat} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition">
                                                                <span className="font-medium text-gray-700">{cat}</span>
                                                                <div className="text-right">
                                                                    {data.revenue > 0 && <span className="text-green-600 font-bold block">+₹{data.revenue}</span>}
                                                                    {data.expense > 0 && <span className="text-red-600 font-bold block">-₹{data.expense}</span>}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )
                    }

                </div>
            </main >

            {/* INVOICE MODAL */}
            {viewingInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewingInvoice(null)}>
                    <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-xl shadow-2xl p-4 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Invoice Preview</h3>
                            <button onClick={() => setViewingInvoice(null)} className="p-2 hover:bg-gray-100 rounded-full transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto rounded border border-gray-200">
                            <img src={viewingInvoice} alt="Invoice" className="w-full h-auto object-contain" />
                        </div>
                        <div className="mt-4 flex justify-end">
                            <a href={viewingInvoice} download="invoice.png" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-bold transition">
                                Download
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
