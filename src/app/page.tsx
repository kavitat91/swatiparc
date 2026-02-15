import Link from 'next/link';
import Image from 'next/image';
import { Building2, PieChart } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 text-gray-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <Image
          src="/swati-parc-hero.jpeg"
          alt="Swati Parc Apartments"
          fill
          priority
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-gray-100/40 to-gray-200/40"></div>
      </div>

      <div className="z-10 text-center mb-12 relative">
        <h1 className="mb-6 drop-shadow-sm">
          <span className="block text-6xl md:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-700 to-gray-900 mb-2 tracking-tight">
            SWATI PARC
          </span>
          <span className="block text-2xl md:text-3xl text-gray-600 font-light tracking-[0.2em] uppercase">
            Expense Tracker
          </span>
        </h1>
        <p className="text-xl text-gray-700 drop-shadow-sm font-medium">
          Manage residents, track revenue, and monitor expenses effortlessly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 z-10 w-full max-w-4xl relative">
        <Link
          href="/admin"
          className="group relative p-8 rounded-2xl bg-white/80 backdrop-blur-lg border border-gray-200 shadow-xl hover:bg-white transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl"
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-4 rounded-full bg-gray-200 mb-6 group-hover:scale-110 transition-transform">
              <Building2 className="w-12 h-12 text-gray-700" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-gray-900">Admin Portal</h2>
            <p className="text-gray-600">
              Manage residents, log collected revenue, and record maintenance expenses.
            </p>
          </div>
        </Link>

        <Link
          href="/report"
          className="group relative p-8 rounded-2xl bg-white/80 backdrop-blur-lg border border-gray-200 shadow-xl hover:bg-white transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl"
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-4 rounded-full bg-gray-200 mb-6 group-hover:scale-110 transition-transform">
              <PieChart className="w-12 h-12 text-gray-700" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-gray-900">View Reports</h2>
            <p className="text-gray-600">
              Analyze monthly profit & loss (PnL) and view month-over-month trends.
            </p>
          </div>
        </Link>
      </div>

    </main>
  );
}
