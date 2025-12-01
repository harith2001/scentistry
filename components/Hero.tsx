import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gold-gradient p-6 sm:p-10 md:p-16 shadow-soft">
      <div className="max-w-4xl">
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-black">
          Premium Candles for a High‑End Ambience
        </h1>
        <p className="mt-4 text-black/70 max-w-2xl">
          Handcrafted fragrance blends, minimalist vessels, and a calm luxury experience.
          Discover scents curated for mood, ritual, and atmosphere.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Link href="#products" className="inline-block">
            <Button variant="gold" size="lg">Shop Now</Button>
          </Link>
          <Link href="/orders" className="inline-block">
            <Button variant="outline" size="lg">Explore Collection</Button>
          </Link>
        </div>
      </div>
      <div className="absolute inset-0 -z-10 bg-gold-soft" aria-hidden="true" />
    </section>
  );
}
