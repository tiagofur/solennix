import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Users,
  Package,
  TrendingUp,
  Moon,
  Sun,
  CheckCircle,
  Star,
  ArrowRight,
  BarChart3,
  Shield,
  Zap,
  ChevronDown,
  Menu,
  X,
  MapPin,
  DollarSign,
  Bell,
  ArrowUp,
  Clock,
  Smartphone,
  Fingerprint,
  LayoutGrid,
  RefreshCw,
  Receipt,
  CreditCard,
  Building,
  Send,
  ClipboardList,
  FileText,
  CheckSquare,
  UsersRound,
  Warehouse,
} from "lucide-react";

const APP_STORE_URL = "https://apps.apple.com/mx/app/solennix/id6760874129";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.solennix.app";

import { useTheme } from "@/hooks/useTheme";
import { Logo } from "@/components/Logo";

export const Landing: React.FC = () => {
  const { t } = useTranslation(["public", "common"]);
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const FEATURES = useMemo(() => [
    {
      icon: FileText,
      color: "text-primary",
      bg: "bg-primary/10",
      title: t("landing.features.items.quotes.title"),
      description: t("landing.features.items.quotes.desc"),
    },
    {
      icon: CreditCard,
      color: "text-success",
      bg: "bg-success/10",
      title: t("landing.features.items.payments.title"),
      description: t("landing.features.items.payments.desc"),
    },
    {
      icon: Send,
      color: "text-info",
      bg: "bg-info/10",
      title: t("landing.features.items.portal.title"),
      description: t("landing.features.items.portal.desc"),
    },
    {
      icon: ClipboardList,
      color: "text-warning",
      bg: "bg-warning/10",
      title: t("landing.features.items.inventory.title"),
      description: t("landing.features.items.inventory.desc"),
    },
    {
      icon: UsersRound,
      color: "text-primary",
      bg: "bg-primary/10",
      title: t("landing.features.items.staff.title"),
      description: t("landing.features.items.staff.desc"),
    },
    {
      icon: Calendar,
      color: "text-success",
      bg: "bg-success/10",
      title: t("landing.features.items.calendar.title"),
      description: t("landing.features.items.calendar.desc"),
    },
    {
      icon: BarChart3,
      color: "text-info",
      bg: "bg-info/10",
      title: t("landing.features.items.reports.title"),
      description: t("landing.features.items.reports.desc"),
    },
    {
      icon: Building,
      color: "text-warning",
      bg: "bg-warning/10",
      title: t("landing.features.items.forms.title"),
      description: t("landing.features.items.forms.desc"),
    },
  ], [t]);

  const STEPS = useMemo(() => [
    {
      number: "01",
      title: t("landing.how.steps.step1.title"),
      description: t("landing.how.steps.step1.desc"),
      icon: Zap,
    },
    {
      number: "02",
      title: t("landing.how.steps.step2.title"),
      description: t("landing.how.steps.step2.desc"),
      icon: FileText,
    },
    {
      number: "03",
      title: t("landing.how.steps.step3.title"),
      description: t("landing.how.steps.step3.desc"),
      icon: CreditCard,
    },
    {
      number: "04",
      title: t("landing.how.steps.step4.title"),
      description: t("landing.how.steps.step4.desc"),
      icon: ClipboardList,
    },
  ], [t]);

  const TESTIMONIALS = useMemo(() => [
    {
      name: t("landing.testimonials.items.maria.name"),
      role: t("landing.testimonials.items.maria.role"),
      location: t("landing.testimonials.items.maria.location"),
      avatar: "MG",
      avatarColor: "bg-error",
      rating: 5,
      text: t("landing.testimonials.items.maria.text"),
    },
    {
      name: t("landing.testimonials.items.carlos.name"),
      role: t("landing.testimonials.items.carlos.role"),
      location: t("landing.testimonials.items.carlos.location"),
      avatar: "CM",
      avatarColor: "bg-info",
      rating: 5,
      text: t("landing.testimonials.items.carlos.text"),
    },
    {
      name: t("landing.testimonials.items.ana.name"),
      role: t("landing.testimonials.items.ana.role"),
      location: t("landing.testimonials.items.ana.location"),
      avatar: "AR",
      avatarColor: "bg-primary",
      rating: 5,
      text: t("landing.testimonials.items.ana.text"),
    },
  ], [t]);

  const PLANS = useMemo(() => [
    {
      name: t("landing.pricing.basic.name"),
      price: t("landing.pricing.basic.price"),
      originalPrice: null,
      period: "",
      description: t("landing.pricing.basic.desc"),
      promo: null,
      features: t("landing.pricing.basic.features", { returnObjects: true }) as string[],
      cta: t("landing.pricing.basic.cta"),
      href: "/register",
      highlighted: false,
    },
    {
      name: t("landing.pricing.pro.name"),
      price: t("landing.pricing.pro.price"),
      originalPrice: t("landing.pricing.pro.originalPrice"),
      period: t("landing.pricing.periodMonth"),
      description: t("landing.pricing.pro.desc"),
      promo: t("landing.pricing.promoLaunch"),
      features: t("landing.pricing.pro.features", { returnObjects: true }) as string[],
      cta: t("landing.pricing.pro.cta"),
      href: "/register",
      highlighted: true,
      ctaClass: "premium-gradient text-white",
    },
  ], [t]);

  const FAQS = useMemo(() => t("landing.faq.items", { returnObjects: true }) as { question: string; answer: string }[], [t]);

  const MOBILE_FEATURES = useMemo(() => [
    { icon: Fingerprint, text: t("landing.app.features.auth") },
    { icon: LayoutGrid, text: t("landing.app.features.widgets") },
    { icon: Bell, text: t("landing.app.features.notifications") },
    { icon: RefreshCw, text: t("landing.app.features.sync") },
  ], [t]);

  const MOCK_EVENTS = useMemo(() => [
    {
      name: t("landing.mockup.mockEvent1"),
      date: t("landing.mockup.mockDate1"),
      guests: 180,
      status: "confirmed",
      amount: "$45,000",
    },
    {
      name: t("landing.mockup.mockEvent2"),
      date: t("landing.mockup.mockDate2"),
      guests: 60,
      status: "quoted",
      amount: "$12,500",
    },
    {
      name: t("landing.mockup.mockEvent3"),
      date: t("landing.mockup.mockDate3"),
      guests: 250,
      status: "confirmed",
      amount: "$78,000",
    },
  ], [t]);

  const MOCK_KPIS = useMemo(() => [
    {
      label: t("landing.mockup.revenueMonth"),
      value: "$135,500",
      delta: "+18%",
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: t("landing.mockup.events"),
      value: "8",
      delta: "+3",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: t("landing.mockup.totalClients"),
      value: "47",
      delta: "+5",
      color: "text-info",
      bg: "bg-info/10",
    },
  ], [t]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const appStoreBadge = (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 bg-text text-bg px-5 py-3 rounded-2xl hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg"
      aria-label={t("landing.app.appStoreLabel")}
    >
      <svg viewBox="0 0 814 1000" className="h-7 w-auto fill-current shrink-0" aria-hidden="true">
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-148.2-91.6C93.4 747.1 22 592.4 22 440.8c0-248.2 163.2-379.2 323.4-379.2 85.5 0 156.7 56.3 210.5 56.3 51.5 0 132.2-59.8 232.2-59.8 30.4 0 108.2 2.6 159.8 96.8zM546.1 131.4c23.1-27.6 39.8-65.8 39.8-104 0-5.2-.6-10.4-1.3-15.6-37.5 1.3-82.5 25.1-109.4 55.8-21.7 24.4-42.2 62.7-42.2 101.5 0 5.8.6 11.7 1.3 13.6 2.6.6 6.5 1.3 10.4 1.3 34 0 76.9-22.5 101.4-52.6z" />
      </svg>
      <div className="text-left">
        <div className="text-xs font-medium leading-none mb-0.5 opacity-75">{t("landing.app.downloadOn")}</div>
        <div className="text-base font-black leading-none">App Store</div>
      </div>
    </a>
  );

  const googlePlayBadge = (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 bg-text text-bg px-5 py-3 rounded-2xl hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg"
      aria-label={t("landing.app.playStoreLabel")}
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current shrink-0" aria-hidden="true">
        <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z" />
      </svg>
      <div className="text-left">
        <div className="text-xs font-medium leading-none mb-0.5 opacity-75">{t("landing.app.availableOn")}</div>
        <div className="text-base font-black leading-none">Google Play</div>
      </div>
    </a>
  );

  const phoneMockup = (
    <div className="relative w-full max-w-[280px] mx-auto select-none pointer-events-none">
      <div className="relative bg-card border-[3px] border-border rounded-[44px] overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-7 bg-card border-b border-border rounded-b-2xl z-10 flex items-center justify-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-border" />
          <div className="w-12 h-2 rounded-full bg-border" />
        </div>
        <div className="pt-10 pb-6 px-4 bg-bg min-h-[520px] flex flex-col gap-3">
          <div className="flex items-center justify-between px-1 pt-2 pb-1">
            <div>
              <p className="text-xs text-text-secondary">{t("landing.mockup.greeting")}</p>
              <p className="text-sm font-black text-text">{t("landing.mockup.myBusiness")}</p>
            </div>
            <div className="w-8 h-8 rounded-full premium-gradient flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card border border-border rounded-2xl p-3">
              <p className="text-xs text-text-secondary mb-1">{t("landing.mockup.revenue")}</p>
              <p className="text-sm font-black text-text">$135,500</p>
              <p className="text-xs text-success font-bold">{t("landing.mockup.revenueDelta")}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-3">
              <p className="text-xs text-text-secondary mb-1">{t("landing.mockup.events")}</p>
              <p className="text-sm font-black text-text">{t("landing.mockup.eventsValue")}</p>
              <p className="text-xs text-primary font-bold">{t("landing.mockup.eventsDelta")}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-bold text-text-secondary">{t("landing.mockup.upcoming")}</p>
            </div>
            {MOCK_EVENTS.map((event) => (
              <div key={event.name} className="px-3 py-2.5 flex items-center gap-2.5 border-b border-border last:border-0">
                <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text truncate">{event.name}</p>
                  <p className="text-[10px] text-text-secondary">{event.date}</p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${event.status === "confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                  {event.status === "confirmed" ? t("landing.mockup.statusConfirmed") : t("landing.mockup.statusQuoted")}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto bg-card border border-border rounded-2xl px-4 py-2 flex justify-around">
            {[BarChart3, Calendar, Users, Package].map((Icon, i) => (
              <div key={i} className={`flex flex-col items-center gap-0.5 py-1 ${i === 0 ? "text-primary" : "text-text-tertiary"}`}>
                <Icon className="h-4 w-4" />
                <div className={`h-1 w-1 rounded-full ${i === 0 ? "bg-primary" : "bg-transparent"}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-primary/20 blur-2xl rounded-full" />
    </div>
  );

  const appMockup = (
    <div className="relative w-full max-w-2xl mx-auto select-none pointer-events-none">
      <div className="bg-surface-alt rounded-t-2xl px-4 py-3 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-400" />
        <span className="w-3 h-3 rounded-full bg-yellow-400" />
        <span className="w-3 h-3 rounded-full bg-green-400" />
        <div className="ml-3 flex-1 bg-surface/60 rounded-md px-3 py-1 text-xs text-text-tertiary font-mono">
          app.solennix.com/dashboard
        </div>
      </div>
      <div className="bg-surface-alt rounded-b-2xl border-x border-b border-border shadow-2xl overflow-hidden">
        <div className="flex h-[340px]">
          <div className="w-14 bg-card border-r border-border flex flex-col items-center py-4 gap-4">
            <div className="w-8 h-8 rounded-lg premium-gradient flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="mt-2 flex flex-col gap-3">
              {[BarChart3, Calendar, Users, Package].map((Icon, i) => (
                <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? "bg-primary/10 text-primary" : "text-text-tertiary"}`}>
                  <Icon className="h-4 w-4" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              {MOCK_KPIS.map((kpi) => (
                <div key={kpi.label} className="bg-card rounded-xl p-3 border border-border">
                  <div className="text-xs text-text-secondary mb-1">{kpi.label}</div>
                  <div className="text-sm font-black text-text">{kpi.value}</div>
                  <div className={`text-xs font-bold ${kpi.color} mt-0.5`}>{kpi.delta} {t("landing.mockup.deltaMonth")}</div>
                </div>
              ))}
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden flex-1">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary">{t("landing.mockup.upcoming")}</span>
                <span className="text-xs text-primary font-semibold">{t("landing.mockup.viewAll")}</span>
              </div>
              <div className="divide-y divide-border">
                {MOCK_EVENTS.map((event) => (
                  <div key={event.name} className="px-3 py-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-text truncate">{event.name}</div>
                      <div className="text-xs text-text-secondary flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {event.date} · {t("landing.mockup.eventTimePeople", { count: event.guests })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-text">{event.amount}</div>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${event.status === "confirmed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        {event.status === "confirmed" ? t("landing.mockup.statusConfirmed") : t("landing.mockup.statusQuoted")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-primary/20 blur-2xl rounded-full pointer-events-none" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg transition-colors">
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-between items-center h-20">
            <Logo size={40} />
            <div className="hidden md:flex items-center space-x-10">
              <a href="#features" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">{t("landing.nav.features")}</a>
              <a href="#how-it-works" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">{t("landing.nav.howItWorks")}</a>
              <a href="#pricing" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">{t("landing.nav.pricing")}</a>
              <a href="#app" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                {t("landing.nav.app")}
              </a>
              <a href="#faq" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">{t("landing.nav.faq")}</a>
              <Link to="/help" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">{t("landing.nav.help")}</Link>
            </div>
            <div className="flex items-center space-x-4">
              <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2.5 rounded-xl text-text-secondary hover:bg-surface-alt transition-colors border border-transparent hover:border-border" aria-label={mobileMenuOpen ? t("landing.nav.closeMenu") : t("landing.nav.openMenu")} aria-expanded={mobileMenuOpen}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <button type="button" onClick={toggleTheme} className="p-2.5 rounded-xl text-text-secondary hover:bg-surface-alt transition-colors border border-transparent hover:border-border" aria-label={theme === "dark" ? t("landing.nav.switchLight") : t("landing.nav.switchDark")}>
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <Link to="/login" className="hidden sm:inline-flex text-sm font-semibold text-text hover:text-primary transition-colors">{t("landing.nav.login")}</Link>
              <Link to="/register" className="premium-gradient text-white text-sm px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02]">{t("landing.nav.trial")}</Link>
            </div>
          </nav>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-bg px-4 py-4 animate-in slide-in-from-top-4 duration-200">
          <div className="space-y-3">
            <a href="#features" className="block text-sm text-text-secondary py-2" onClick={() => setMobileMenuOpen(false)}>{t("landing.nav.features")}</a>
            <a href="#how-it-works" className="block text-sm text-text-secondary py-2" onClick={() => setMobileMenuOpen(false)}>{t("landing.nav.howItWorks")}</a>
            <a href="#pricing" className="block text-sm text-text-secondary py-2" onClick={() => setMobileMenuOpen(false)}>{t("landing.nav.pricing")}</a>
            <a href="#app" className="block text-sm text-text-secondary py-2 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              {t("landing.nav.app")}
            </a>
            <a href="#faq" className="block text-sm text-text-secondary py-2" onClick={() => setMobileMenuOpen(false)}>{t("landing.nav.faq")}</a>
            <Link to="/help" className="block text-sm text-text-secondary py-2" onClick={() => setMobileMenuOpen(false)}>{t("landing.nav.help")}</Link>
            <Link to="/login" className="block text-sm text-text-secondary py-2" onClick={() => setMobileMenuOpen(false)}>{t("landing.nav.loginMobile")}</Link>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 z-[-1] opacity-30 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-info/10 blur-[120px]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary text-sm font-bold px-5 py-2 rounded-full mb-10 tracking-wide uppercase">
              <Zap className="h-4 w-4" />
              <span>{t("landing.hero.badge")}</span>
            </div>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-text mb-8 leading-[1.05] tracking-tight">
              {t("landing.hero.titleTop")}
              <br />
              <span className="text-transparent bg-clip-text premium-gradient animate-gradient">
                {t("landing.hero.titleBottom")}
              </span>
            </h1>
            <p className="text-lg sm:text-2xl text-text-secondary mb-12 max-w-3xl mx-auto leading-relaxed">{t("landing.hero.subtitle")}</p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center mb-12">
              <Link to="/register" className="premium-gradient text-white px-10 py-5 rounded-2xl font-black text-xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-[1.05] flex items-center justify-center gap-3">
                {t("landing.hero.start")}
                <ArrowRight className="h-6 w-6" />
              </Link>
              <Link to="/login" className="bg-card glass-card text-text px-10 py-5 rounded-2xl font-bold text-xl transition-all hover:bg-surface border border-border flex items-center justify-center">
                {t("landing.hero.haveAccount")}
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-10 text-sm font-semibold text-text-secondary opacity-80">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>{t("landing.hero.noCard")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>{t("landing.hero.setup")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>{t("landing.hero.cancel")}</span>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 text-xs text-text-tertiary font-medium uppercase tracking-widest">
                <span className="h-px w-10 bg-border" />
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                <span>{t("landing.hero.alsoOn")}</span>
                <span className="h-px w-10 bg-border" />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {appStoreBadge}
                {googlePlayBadge}
              </div>
            </div>
          </div>
          {appMockup}
        </div>
      </section>

      <section className="premium-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white mb-8">
            <h3 className="text-2xl font-extrabold mb-2">{t("landing.proof.title")}</h3>
            <p className="text-white/80">{t("landing.proof.subtitle")}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="bg-white/10 rounded-2xl p-4">
              <FileText className="h-8 w-8 mx-auto mb-2 text-white" />
              <div className="text-white font-bold text-sm">{t("landing.proof.quote")}</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-white" />
              <div className="text-white font-bold text-sm">{t("landing.proof.payments")}</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <Send className="h-8 w-8 mx-auto mb-2 text-white" />
              <div className="text-white font-bold text-sm">{t("landing.proof.portal")}</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <UsersRound className="h-8 w-8 mx-auto mb-2 text-white" />
              <div className="text-white font-bold text-sm">{t("landing.proof.staff")}</div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-surface-alt text-text-secondary text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <span>{t("landing.features.badge")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text mb-4">{t("landing.features.title")}</h2>
            <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto">{t("landing.features.desc")}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="group p-6 rounded-2xl border border-border hover:border-brand-orange/30 hover:shadow-xl transition-all duration-300 bg-card">
                <div className={`${feature.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-text mb-2">{feature.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-32 bg-surface-grouped relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary text-sm font-bold px-5 py-2 rounded-full mb-6 uppercase tracking-wider">
              <span>{t("landing.how.badge")}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-text mb-6 tracking-tight">{t("landing.how.title")}</h2>
            <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">{t("landing.how.desc")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {STEPS.map((step, index) => (
              <div key={step.number} className="relative group">
                {index < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-[44px] left-[calc(50%+40px)] w-[calc(100%-80px)] h-1 bg-border/40 rounded-full" />
                )}
                <div className="relative text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] premium-gradient text-white font-black text-2xl mb-8 shadow-xl shadow-primary/25 transform group-hover:scale-110 transition-transform">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-text mb-4 tracking-tight">{step.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="app" className="py-24 bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary text-sm font-bold px-5 py-2 rounded-full mb-8 uppercase tracking-wider">
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                <span>{t("landing.app.badge")}</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-text mb-6 tracking-tight leading-[1.1]">{t("landing.app.title")}</h2>
              <p className="text-lg text-text-secondary mb-10 leading-relaxed">{t("landing.app.desc")}</p>
              <ul className="space-y-4 mb-10">
                {MOBILE_FEATURES.map((f) => (
                  <li key={f.text} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <span className="text-text font-semibold text-sm">{f.text}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-4">
                {appStoreBadge}
                {googlePlayBadge}
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              {phoneMockup}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-surface-alt text-text-secondary text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <span>{t("landing.testimonials.badge")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text mb-4">{t("landing.testimonials.title")}</h2>
            <p className="text-base sm:text-lg text-text-secondary">{t("landing.testimonials.desc")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t_item) => (
              <div key={t_item.name} className="bg-surface-alt rounded-2xl p-6 border border-border">
                <div className="flex items-center gap-1 mb-4" role="img" aria-label={t("landing.testimonials.ariaLabel", { count: t_item.rating })}>
                  {Array.from({ length: t_item.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-6">"{t_item.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`${t_item.avatarColor} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {t_item.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-text text-sm">{t_item.name}</div>
                    <div className="text-text-secondary text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {t_item.role} · {t_item.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-32 bg-surface-grouped relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary text-sm font-bold px-5 py-2 rounded-full mb-6 uppercase tracking-wider">
              <span>{t("landing.pricing.badge")}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-text mb-6 tracking-tight">{t("landing.pricing.title")}</h2>
            <p className="text-base sm:text-xl text-text-secondary max-w-2xl mx-auto">{t("landing.pricing.desc")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-stretch max-w-4xl mx-auto">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`relative rounded-3xl p-10 flex flex-col transition-all duration-300 border-2 ${plan.highlighted ? "border-primary bg-card shadow-2xl shadow-primary/10 scale-[1.02] z-10" : "border-border bg-card shadow-sm hover:shadow-md"}`}>
                {plan.highlighted && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-2">
                    <span className="bg-primary text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-primary/30">{t("landing.pricing.popular")}</span>
                    {plan.promo && <span className="bg-success text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-success/30">{plan.promo}</span>}
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-2xl font-black text-text mb-2 tracking-tight">{plan.name}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{plan.description}</p>
                </div>
                <div className="flex items-baseline gap-2 mb-10">
                  {plan.originalPrice && <span className="text-xl line-through text-text-tertiary font-medium">{plan.originalPrice}</span>}
                  <span className="text-5xl font-black text-text tracking-tight">{plan.price}</span>
                  <span className="text-text-secondary font-medium uppercase text-xs tracking-widest">{plan.period}</span>
                </div>
                <ul className="space-y-4 mb-10 grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <div className={`p-1 rounded-full ${plan.highlighted ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}>
                        <CheckCircle className="h-4 w-4 shrink-0" />
                      </div>
                      <span className="text-text font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to={plan.href} className={`block text-center py-5 px-8 rounded-2xl font-black text-lg transition-all ${plan.highlighted ? "premium-gradient text-white shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02]" : "bg-surface-alt text-text hover:bg-border transition-colors border border-border"}`}>{plan.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 bg-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-surface-alt text-text-secondary text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <span>{t("landing.faq.badge")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text mb-4">{t("landing.faq.title")}</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <div key={index} className="border border-border rounded-xl overflow-hidden">
                <button type="button" className="w-full flex items-center justify-between p-5 text-left bg-card hover:bg-surface-alt transition-colors" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index} aria-label={t("landing.faq.ariaLabel", { question: faq.question, status: openFaq === index ? t("landing.faq.statusClose") : t("landing.faq.statusOpen") })}>
                  <span className="font-semibold text-text text-sm">{faq.question}</span>
                  <ChevronDown className={`h-4 w-4 text-text-secondary shrink-0 ml-4 transition-transform duration-300 ${openFaq === index ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-5 pt-1 bg-card animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-text-secondary text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-bg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden premium-gradient rounded-3xl sm:rounded-[3rem] px-6 py-12 sm:p-20 text-center premium-shadow mx-2 sm:mx-0">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -mr-20 -mt-20" />
            <div className="relative z-10 max-w-4xl mx-auto">
              <h2 className="text-4xl sm:text-7xl font-black text-white mb-8 tracking-tight leading-[1.1]">
                {t("landing.cta.title")} <br />
                {t("landing.cta.title2")}
              </h2>
              <p className="text-lg sm:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">{t("landing.cta.subtitle")}</p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                <Link to="/register" className="bg-white text-primary px-8 sm:px-12 py-5 sm:py-6 rounded-2xl font-black text-xl sm:text-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-[1.05] flex items-center justify-center gap-3 w-full sm:w-auto">
                  {t("landing.cta.start")}
                  <ArrowRight className="h-6 w-6 sm:h-7 sm:w-7" />
                </Link>
                <Link to="/login" className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-8 sm:px-12 py-5 sm:py-6 rounded-2xl font-black text-xl sm:text-2xl hover:bg-white/20 transition-all flex items-center justify-center w-full sm:w-auto">
                  {t("landing.cta.haveAccount")}
                </Link>
              </div>
              <div className="mt-8 sm:mt-12 flex flex-wrap justify-center gap-x-4 sm:gap-x-8 gap-y-4 text-white/80 text-xs sm:text-sm font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span>{t("landing.cta.noCard")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span>{t("landing.cta.cancel")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span>{t("landing.cta.supportEs")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-surface-grouped text-text-secondary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-8 mb-10">
            <div className="md:col-span-3 xl:col-span-2">
              <Logo size={40} className="mb-4" />
              <p className="text-sm leading-relaxed max-w-xs">{t("landing.footer.desc")}</p>
            </div>
            <div>
              <h4 className="text-text font-semibold text-sm mb-4">{t("landing.footer.product")}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-text transition-colors">{t("landing.nav.features")}</a></li>
                <li><a href="#pricing" className="hover:text-text transition-colors">{t("landing.nav.pricing")}</a></li>
                <li><a href="#how-it-works" className="hover:text-text transition-colors">{t("landing.nav.howItWorks")}</a></li>
                <li><a href="#faq" className="hover:text-text transition-colors">{t("landing.nav.faq")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-text font-semibold text-sm mb-4 flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                {t("landing.footer.download")}
              </h4>
              <ul className="space-y-2 text-sm">
                <li><a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-text transition-colors flex items-center gap-1.5">{t("landing.footer.appStore")}</a></li>
                <li><a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-text transition-colors">{t("landing.footer.playStore")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-text font-semibold text-sm mb-4">{t("landing.footer.account")}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/register" className="hover:text-text transition-colors">{t("landing.footer.register")}</Link></li>
                <li><Link to="/login" className="hover:text-text transition-colors">{t("landing.footer.login")}</Link></li>
                <li><Link to="/forgot-password" className="hover:text-text transition-colors">{t("landing.footer.forgot")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-text font-semibold text-sm mb-4">{t("landing.footer.legal")}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-text transition-colors">{t("landing.footer.about")}</Link></li>
                <li><Link to="/help" className="hover:text-text transition-colors">{t("landing.nav.help")}</Link></li>
                <li><Link to="/terms" className="hover:text-text transition-colors">{t("landing.footer.terms")}</Link></li>
                <li><Link to="/privacy" className="hover:text-text transition-colors">{t("landing.footer.privacy")}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">{t("landing.footer.rights")}</p>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-success" aria-hidden="true" />
              <span>{t("landing.footer.encryption")}</span>
            </div>
          </div>
        </div>
      </footer>

      <button type="button" onClick={scrollToTop} aria-label={t("landing.footer.scrollTop")} className={`fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full premium-gradient text-white shadow-lg shadow-primary/30 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-primary/40 ${showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  );
};
