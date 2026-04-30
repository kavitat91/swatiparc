'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, PieChart, TrendingUp, TrendingDown, IndianRupee, Filter, X, ChevronDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
        return residents.map(res => {
            // For expenses, use filteredTransactions to show what they spent in this period
            const spent = filteredTransactions.reduce((acc, t) => {
                if (t.type === 'EXPENSE' && t.spender === res.name) {
                    return acc + Number(t.amount);
                }
                return acc;
            }, 0);

            // For paid maintenance, calculate strictly based on the applicable month (not cash flow date)
            const paid = transactions.reduce((acc, t) => {
                const isResident = t.residentId === res.id;
                const matchesMonth = selectedMonth 
                    ? (t.applicableMonth ? t.applicableMonth === selectedMonth : t.date.startsWith(selectedMonth))
                    : true; // If no month selected, show all-time paid

                if (t.type === 'REVENUE' && isResident && matchesMonth) {
                    return acc + Number(t.amount);
                }
                return acc;
            }, 0);

            const resStats = { paid, spent };

            // All-Time Refund Ledger
            const totalRefundable = transactions
                .filter(t => t.type === 'EXPENSE' && t.isRefundable && t.spender === res.name)
                .reduce((sum, t) => sum + Number(t.amount), 0);
                
            const totalSettled = transactions
                .filter(t => t.type === 'REVENUE' && t.paymentMode === 'ADJUSTMENT' && t.residentId === res.id)
                .reduce((sum, t) => sum + Number(t.amount), 0);
                
            const netRefundable = totalRefundable - totalSettled;

            let expected = 0;
            if (selectedMonth) {
                expected = res.flatNumber === 'FF' ? 4500 : 3000;
            }

            const due = expected - resStats.paid;

            return {
                ...res,
                ...resStats,
                expected,
                due,
                netRefundable
            };
        });
    };

    const residentSnapshot = getResidentSnapshot();

    // Additional Insights Data
    const categoryData = filteredTransactions.reduce((acc, t) => {
        if (!acc[t.category]) acc[t.category] = { revenue: 0, expense: 0 };
        if (t.type === 'REVENUE') acc[t.category].revenue += Number(t.amount);
        else acc[t.category].expense += Number(t.amount);
        return acc;
    }, {} as Record<string, { revenue: number, expense: number }>);
    const sortedCategories = Object.entries(categoryData).sort((a, b) => b[1].expense - a[1].expense);
    const highestExpenseCat = sortedCategories.filter(c => c[1].expense > 0)[0];

    const expectedThisPeriod = residents.reduce((sum, r) => sum + (r.flatNumber === 'FF' ? 4500 : 3000), 0); // Note: Simplified for insight if not exactly one month
    const maintenanceCollected = filteredTransactions.filter(t => t.type === 'REVENUE' && t.category === 'Maintenance Fee').reduce((sum, t) => sum + Number(t.amount), 0);
    const collectionPercentage = expectedThisPeriod > 0 ? Math.min(100, Math.round((maintenanceCollected / expectedThisPeriod) * 100)) : 0;
    const residentsPaidCount = residents.filter(r => {
        const paid = filteredTransactions.filter(t => t.residentId === r.id && t.type === 'REVENUE').reduce((sum, t) => sum + Number(t.amount), 0);
        return paid >= (r.flatNumber === 'FF' ? 4500 : 3000);
    }).length;

    // All-time owed logic for summary
    const totalAllTimeOwed = residentSnapshot.reduce((sum, r) => sum + r.netRefundable, 0);

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
                {/* Financial Health Banner */}
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-4 shadow-sm border ${netPnL >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className={`p-3 rounded-full ${netPnL >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {netPnL >= 0 ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className={`font-bold text-lg ${netPnL >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                            {netPnL >= 0 ? 'Positive Cash Flow' : 'Deficit This Period'}
                        </h3>
                        <p className={`text-sm ${netPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {netPnL >= 0 
                                ? `Great job! The apartment saved ₹${netPnL.toFixed(2)} in the selected period.` 
                                : `Careful! The apartment spent ₹${Math.abs(netPnL).toFixed(2)} more than it collected.`}
                        </p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                        <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-green-600 mt-2">₹{totalRevenue.toFixed(2)}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                        <p className="text-sm text-gray-500 font-medium">Total Expenses</p>
                        <h3 className="text-2xl font-bold text-red-600 mt-2">₹{totalExpense.toFixed(2)}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                        <p className="text-sm text-gray-500 font-medium">Net Balance</p>
                        <h3 className={`text-2xl font-bold mt-2 ${netPnL >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                            ₹{netPnL.toFixed(2)}
                        </h3>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex flex-col justify-center">
                        <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Refunds Owed (All-Time)</p>
                        <p className="text-2xl font-bold text-orange-600 mt-2">₹{totalAllTimeOwed.toFixed(2)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* Visual Income vs Expense Bar */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">Income vs Expense Ratio</h3>
                        {totalRevenue === 0 && totalExpense === 0 ? (
                            <p className="text-gray-400 text-sm italic">No data yet</p>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex w-full h-4 rounded-full overflow-hidden bg-gray-100">
                                    <div className="bg-green-500 h-full" style={{ width: `${(totalRevenue / (totalRevenue + totalExpense || 1)) * 100}%` }}></div>
                                    <div className="bg-red-500 h-full" style={{ width: `${(totalExpense / (totalRevenue + totalExpense || 1)) * 100}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs font-medium text-gray-500">
                                    <span className="text-green-600">{Math.round((totalRevenue / (totalRevenue + totalExpense || 1)) * 100)}% Income</span>
                                    <span className="text-red-600">{Math.round((totalExpense / (totalRevenue + totalExpense || 1)) * 100)}% Expense</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Collection Insight (Only relevant if looking at a specific month) */}
                        {selectedMonth && (
                            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                <h4 className="text-sm font-bold text-blue-900 mb-1">Maintenance Collection</h4>
                                <p className="text-xs text-blue-700 mb-2">{residentsPaidCount} out of {residents.length} residents fully paid</p>
                                <div className="w-full bg-blue-200 rounded-full h-2.5">
                                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${collectionPercentage}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Top Expense & Category Breakdown */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">Highest Expense Category</h3>
                        {highestExpenseCat ? (
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                                    <PieChart className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-gray-900">{highestExpenseCat[0]}</p>
                                    <p className="text-sm text-gray-500">₹{highestExpenseCat[1].expense.toFixed(2)} spent</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-400 text-sm italic mb-6">No expenses recorded.</p>
                        )}

                        <div className="space-y-4 border-t border-gray-100 pt-6">
                            <h4 className="text-sm font-bold text-gray-700 mb-2">Expense Breakdown</h4>
                            {sortedCategories.filter(c => c[1].expense > 0).length === 0 ? (
                                <p className="text-gray-400 text-xs italic">No expenses to break down.</p>
                            ) : (
                                sortedCategories.filter(c => c[1].expense > 0).map(([cat, data]) => (
                                    <div key={cat}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-gray-700 text-sm">{cat}</span>
                                            <span className="text-red-600 font-bold text-sm">₹{data.expense.toFixed(2)}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div className="bg-red-400 h-2 rounded-full" style={{ width: `${(data.expense / totalExpense) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ))
                            )}
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
                                            {r.netRefundable > 0 ? `₹${r.netRefundable}` : '-'}
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
