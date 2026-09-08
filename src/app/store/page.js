import prisma from '@/lib/prisma';
import { CarFront, Phone, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Available Cars - Hariram Motor',
  description: 'Browse our premium collection of used cars.',
};

export default async function StorePage() {
  const cars = await prisma.vehicle.findMany({
    where: { status: 'IN_STOCK' },
    select: {
      id: true,
      make: true,
      model: true,
      registration: true,
      salePrice: true,
      isLegacy: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 w-full overflow-y-auto">
      {/* Public Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 font-black text-2xl tracking-tighter text-slate-900">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <CarFront size={22} className="text-white" />
            </div>
            HARIRAM<span className="text-indigo-600">MOTORS</span>
          </div>
          <div className="flex gap-4 items-center">
            <a
              href="https://wa.me/?text=Hello%20Hariram%20Motors%2C%20I%20would%20like%20to%20inquire%20about%20your%20available%20inventory."
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <MessageCircle size={16} /> 
              WhatsApp Us
            </a>
            <Link href="/login" className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold py-2 px-4 rounded-lg transition-colors">
              Staff Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">
          Find Your <span className="text-gradient">Dream Car</span>
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto mb-8">
          Browse our curated selection of premium used vehicles. We ensure the highest quality and best prices in town.
        </p>
      </div>

      {/* Car Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {cars.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CarFront size={24} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Cars Available Right Now</h3>
            <p className="text-slate-500">Check back later as we constantly update our inventory.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cars.map(car => (
              <div key={car.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col">
                <div className="aspect-video bg-slate-100 flex items-center justify-center relative overflow-hidden">
                  <CarFront size={48} className="text-slate-300 group-hover:scale-110 group-hover:text-indigo-200 transition-all duration-500" />
                  
                  {car.isLegacy && (
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-slate-900 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      📦 OLD STOCK
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-slate-900 mb-1 line-clamp-1">{car.make} {car.model}</h3>
                  <div className="text-sm font-medium text-slate-500 mb-4 bg-slate-100 w-fit px-2 py-0.5 rounded-md border border-slate-200">
                    {car.registration || 'UNREGISTERED'}
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Asking Price</span>
                      <div className="font-black text-2xl text-indigo-600">
                        {car.salePrice ? `₹${Number(car.salePrice).toLocaleString('en-IN')}` : 'Ask for Price'}
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Hello Hariram Motors, I am interested in the ${car.make} ${car.model} (${car.registration || 'In Stock'}). Is it still available?`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 px-3.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
                      title="Inquire on WhatsApp"
                    >
                      <MessageCircle size={15} />
                      <span>Inquire</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
