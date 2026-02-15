'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, PieChart, TrendingUp, TrendingDown, IndianRupee, Filter, X, ChevronDown } from 'lucide-react';
import { Transaction, Resident } from '@/types';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
} from 'recharts';

export default function ReportPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [residents, setResidents] = useState<Resident[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedResident, setSelectedResident] = useState('');
    const [selectedPaymentMode, setSelectedPaymentMode] = useState('');

    useEffect(() => {
        Promise.all([
            fetch('/api/transactions').then(res => res.json()),
            fetch('/api/residents').then(res => res.json())
        ]).then(([transData, resData]) => {
            setTransactions(transData);
            setResidents(resData);
            setLoading(false);
        });
    }, []);

    // Unique Categories for Dropdown
    const categories = Array.from(new Set(transactions.map(t => t.category)));

    // Unique Months for Dropdown (Data-Driven)
    const availableMonths = Array.from(new Set(transactions.map(t => t.date.substring(0, 7))))
        .sort((a, b) => b.localeCompare(a)); // Descending order (newest first)

    // Filter Logic
    const filteredTransactions = transactions.filter(t => {
        // Month Filter (YYYY-MM)
        if (selectedMonth && !t.date.startsWith(selectedMonth)) return false;

        // Category Filter
        if (selectedCategory && t.category !== selectedCategory) return false;

        // Resident Filter (Revenue only usually, or if we tracked spender ID better)
        if (selectedResident && t.residentId !== selectedResident) return false;

        // Payment Mode Filter
        if (selectedPaymentMode && t.paymentMode !== selectedPaymentMode) return false;

        return true;
    });

    const clearFilters = () => {
        setSelectedMonth('');
        setSelectedCategory('');
        setSelectedResident('');
        setSelectedPaymentMode('');
    };

    // Process data for charts
    const processData = () => {
        const monthlyData: { [key: string]: { name: string; revenue: number; expense: number; pnl: number } } = {};

        filteredTransactions.forEach((t) => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleString('default', { month: 'short', year: '2-digit' });

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { name: monthName, revenue: 0, expense: 0, pnl: 0 };
            }

            const amount = Number(t.amount);
            if (t.type === 'REVENUE') {
                monthlyData[monthKey].revenue += amount;
            } else {
                monthlyData[monthKey].expense += amount;
            }
        });

        // Calculate PnL and sort by date
        const chartData = Object.keys(monthlyData)
            .sort()
            .map((key) => {
                const item = monthlyData[key];
                item.pnl = item.revenue - item.expense;
                return item;
            });

        return chartData;
    };

    const chartData = processData();

    const totalRevenue = filteredTransactions
        .filter((t) => t.type === 'REVENUE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = filteredTransactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const netPnL = totalRevenue - totalExpense;

    // Resident Snapshot Logic
    const getResidentSnapshot = () => {
        // Use selected month, or default to current month for this calculation if not selected
        // However, if filters are clear, maybe we just show "Select a Month" or default to current.
        // Let's rely on the filtered transactions, but for Expected Maintenance we need a specific month context usually.
        // Ideally, we want to look at the dataset for the viewable period.

        return residents.map(res => {
            // Filter transactions for this resident within the current filtered view
            // Note: If 'selectedMonth' is empty, this aggregates ALL TIME.
            // If 'selectedMonth' is set, it aggregates for that month.

            const resStats = filteredTransactions.reduce((acc, t) => {
                const isResident = t.residentId === res.id;
                const isSpender = t.type === 'EXPENSE' && t.spender === res.name; // Name matching for expenses based on our new Dropdown

                if (t.type === 'REVENUE' && isResident) {
                    acc.paid += t.amount;
                }

                if (t.type === 'EXPENSE' && isSpender) {
                    acc.spent += t.amount;
                    if (t.isRefundable) {
                        acc.refundable += t.amount;
                    }
                }
                return acc;
            }, { paid: 0, spent: 0, refundable: 0 });

            // Expected Maintenance Rule
            // If we are viewing a specific month, rule applies once.
            // If we are viewing multiple months, it's ambiguous. 
            // For now, let's assume if no month selected -> Expected = 0 (or show N/A) to avoid confusion.
            // Or better, set default selectedMonth to current month on simple load.

            let expected = 0;
            if (selectedMonth) {
                expected = res.flatNumber === 'FF' ? 4500 : 3000;
            }

            const due = expected - resStats.paid;

            return {
                ...res,
                ...resStats,
                expected,
                due
            };
        });
    };

    const residentSnapshot = getResidentSnapshot();

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <header className="bg-white shadow px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-20">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-pink-600 flex items-center gap-2">
                        <PieChart className="w-6 h-6" /> Financial Reports
                    </h1>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <div className="flex flex-wrap items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500 ml-2" />

                        {/* Month Filter */}
                        <div className="relative">
                            <select
                                className="appearance-none bg-white text-sm py-2 pl-3 pr-8 rounded-md outline-none border border-gray-200 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition shadow-sm"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            >
                                <option value="">All Months</option>
                                {availableMonths.map(m => (
                                    <option key={m} value={m}>
                                        {new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Category Filter */}
                        <div className="relative">
                            <select
                                className="appearance-none bg-white text-sm py-2 pl-3 pr-8 rounded-md outline-none border border-gray-200 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition shadow-sm max-w-[140px]"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Resident Filter */}
                        <div className="relative">
                            <select
                                className="appearance-none bg-white text-sm py-2 pl-3 pr-8 rounded-md outline-none border border-gray-200 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition shadow-sm max-w-[140px]"
                                value={selectedResident}
                                onChange={(e) => setSelectedResident(e.target.value)}
                            >
                                <option value="">All Owners</option>
                                {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Payment Mode Filter */}
                        <div className="relative">
                            <select
                                className="appearance-none bg-white text-sm py-2 pl-3 pr-8 rounded-md outline-none border border-gray-200 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition shadow-sm"
                                value={selectedPaymentMode}
                                onChange={(e) => setSelectedPaymentMode(e.target.value)}
                            >
                                <option value="">All Modes</option>
                                <option value="UPI">UPI</option>
                                <option value="CASH">Cash</option>
                                <option value="CARD">Card</option>
                                <option value="NET_BANKING">Net Banking</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {(selectedMonth || selectedCategory || selectedResident || selectedPaymentMode) && (
                        <button onClick={clearFilters} className="p-2 text-gray-500 hover:text-red-500 transition">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </header>

            <main className="p-8 max-w-7xl mx-auto">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-full text-green-600">
                            <TrendingUp className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                            <h3 className="text-2xl font-bold text-gray-900 flex items-center"><IndianRupee className="w-5 h-5" />{totalRevenue.toFixed(2)}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-full text-red-600">
                            <TrendingDown className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Expenses</p>
                            <h3 className="text-2xl font-bold text-gray-900 flex items-center"><IndianRupee className="w-5 h-5" />{totalExpense.toFixed(2)}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className={`p-3 rounded-full ${netPnL >= 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                            <IndianRupee className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Net PnL</p>
                            <h3 className={`text-2xl font-bold flex items-center ${netPnL >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
                                <IndianRupee className="w-5 h-5" />{netPnL.toFixed(2)}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* Revenue vs Expense Bar Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold mb-6 text-gray-800">Monthly Revenue vs Expenses</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                    <Tooltip
                                        cursor={{ fill: '#F3F4F6' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend iconType="circle" />
                                    <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
                                    <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* User Trend Line Chart (PnL & Trend) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold mb-6 text-gray-800">MoM Net Profit Trend</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend iconType="circle" />
                                    <Line
                                        type="monotone"
                                        dataKey="pnl"
                                        name="Net Profit"
                                        stroke="#6366F1"
                                        strokeWidth={3}
                                        dot={{ fill: '#6366F1', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        name="Revenue Trend"
                                        stroke="#10B981"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Resident Snapshot Table */}
                <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center justify-between">
                        <span>Resident Snapshot {selectedMonth ? `(${new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })})` : '(All Time)'}</span>
                        {!selectedMonth && <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-1 rounded">Select a month to see Maintenance Due</span>}
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/50">
                                    <th className="p-3">Flat</th>
                                    <th className="p-3">Name</th>
                                    <th className="p-3 text-right">Maintenance Due</th>
                                    <th className="p-3 text-right">Paid</th>
                                    <th className="p-3 text-right">Balance</th>
                                    <th className="p-3 text-right text-gray-400">|</th>
                                    <th className="p-3 text-right">Total Spent</th>
                                    <th className="p-3 text-right text-orange-600">Refundable (Owed)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {residentSnapshot.map(r => (
                                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                        <td className="p-3 font-medium text-gray-900">{r.flatNumber}</td>
                                        <td className="p-3 text-gray-700">{r.name}</td>
                                        <td className="p-3 text-right text-gray-500">{selectedMonth ? `₹${r.expected}` : '-'}</td>
                                        <td className="p-3 text-right font-medium text-green-600">₹{r.paid}</td>
                                        <td className={`p-3 text-right font-bold ${r.due > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {selectedMonth ? `₹${(r.paid - r.expected).toFixed(2)}` : '-'}
                                        </td>
                                        <td className="p-3 text-right text-gray-200">|</td>
                                        <td className="p-3 text-right text-gray-600">₹{r.spent}</td>
                                        <td className="p-3 text-right font-bold text-orange-500">
                                            {r.refundable > 0 ? `₹${r.refundable}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
