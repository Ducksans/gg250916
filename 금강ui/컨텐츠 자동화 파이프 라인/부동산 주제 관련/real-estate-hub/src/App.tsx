/**
 * title: Root App (루트 앱)
 * purpose: 페이지 컴포지션과 주요 섹션(Header/Hero/Sections/Footer)을 구성합니다.
 * created: 2025-09-18T16:22:00Z (2025-09-19T01:22:00+09:00 KST)
 * last_modified: 2025-09-18T16:22:00Z (2025-09-19T01:22:00+09:00 KST)
 * maintainer: Team GG
 */

import Header from './components/Header';
import HeroSection from './components/HeroSection';
import ValueProposition from './components/ValueProposition';
import AutomationFlow from './components/AutomationFlow';
import GrowthLoop from './components/GrowthLoop';
import PricingSection from './components/PricingSection';
import CoreThemes from './components/CoreThemes';
import InformationArchitecture from './components/InformationArchitecture';
import Milestones from './components/Milestones';
import MobileApps from './components/MobileApps';
import AutomationPipeline from './components/AutomationPipeline';
import Compliance from './components/Compliance';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-brand-950 text-white px-4 py-2 rounded-lg z-50">
        본문 바로가기
      </a>

      <Header />

      <main id="main" className="relative">
        {/* Hero와 주요 섹션들 */}
        <HeroSection />
        <ValueProposition />
        <AutomationFlow />
        <GrowthLoop />
        <PricingSection />
        <CoreThemes />
        <InformationArchitecture />
        <Milestones />
        <MobileApps />
        <AutomationPipeline />
        <Compliance />
      </main>

      <Footer />
    </div>
  );
}

export default App;
