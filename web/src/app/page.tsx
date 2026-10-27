import { About, BuiltWith, Cta, Hero, HowItWorks, OpenMarkets, RecentlySettled, Stats, TopCallers } from "@/components/landing";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Stats />
      <OpenMarkets />
      <BuiltWith />
      <HowItWorks />
      <RecentlySettled />
      <TopCallers />
      <Cta />
    </main>
  );
}
