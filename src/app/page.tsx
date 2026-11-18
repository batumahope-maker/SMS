
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  UserCheck,
  Users,
  Shield,
  ArrowRight,
  BookOpen,
  BarChart3,
  Lock,
  ChevronRight,
  School,
  ClipboardCheck,
  Sparkles,
} from 'lucide-react';

import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type PortalCard = {
  key: string;
  title: string;
  description: string;
  icon: typeof Shield;
  href: string;
  color: string;
  bg: string;
  border: string;
  features: string[];
  badge: string;
  comingSoon?: boolean;
};

const portals: PortalCard[] = [
  {
    key: 'admin',
    title: 'Admin Portal',
    description: 'Manage the entire school — students, teachers, fees, reports, and all settings',
    icon: Shield,
    href: '/login',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    features: [
      'All student & teacher records',
      'Fee & payment management',
      'Reports & AI analytics',
      'System settings & SMS',
    ],
    badge: 'Admin only',
  },
  {
    key: 'teacher',
    title: 'Teacher Portal',
    description: 'Take attendance, enter marks, assign homework, and manage your classes',
    icon: UserCheck,
    href: '/login',
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    features: [
      'Mark attendance daily',
      'Enter student marks',
      'Assign & track homework',
      'Lesson planning',
    ],
    badge: 'Teachers',
  },
  {
    key: 'student',
    title: 'Student Portal',
    description: 'Check your grades, attendance, homework and download your report card',
    icon: GraduationCap,
    href: '/login',
    color: 'from-purple-500 to-pink-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    features: [
      'View grades & report card',
      'Check attendance record',
      'See homework & due dates',
      'Fee payment history',
    ],
    badge: 'Students',
  },
  {
    key: 'parent',
    title: 'Parent Portal',
    description:
      'Parent accounts are not issued yet. Contact the school office about your child’s progress.',
    icon: Users,
    href: '/login',
    color: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    features: [],
    badge: 'Parents',
    comingSoon: true,
  },
];

export default function HomePage() {
  const { t } = useLanguage();

  const [schoolName, setSchoolName] = useState('');
  const [schoolLogo, setSchoolLogo] = useState('');
  const [schoolMotto, setSchoolMotto] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/school-info')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSchoolName(data.name || '');
          setSchoolLogo(data.logo || '');
          setSchoolMotto(data.motto || '');
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const displayName = schoolName || 'School Management System';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">

      {/* Header */}
      <header className="border-b bg-background/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt="School logo"
                className="w-10 h-10 rounded-lg object-contain"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <School className="w-5 h-5 text-white" />
              </div>
            )}

            <div className="min-w-0">
              <p className="font-bold text-base leading-tight truncate">
                {displayName}
              </p>
              {schoolMotto && (
                <p className="text-xs text-muted-foreground italic truncate">
                  {schoolMotto}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <LanguageSwitcher />

            <Link href="/login">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Lock className="w-4 h-4 mr-2" />
                {t('auth.login')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-14 pb-10 text-center">
        <Badge className="mb-4 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Sparkles className="w-3 h-3 mr-1" />
          {t('landing.badge')}
        </Badge>

        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          {t('landing.title')}
          <br />
          <span className="text-emerald-600">
            {t('landing.title_highlight')}
          </span>
        </h1>

        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
          {t('landing.description')}
        </p>

        <Link href="/login">
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
          >
            {t('landing.get_started')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </section>

      {/* Four Portal Cards */}
      <section className="container mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-2">
          {t('landing.portals_title')}
        </h2>

        <p className="text-muted-foreground text-center text-sm mb-8">
          {t('landing.portals_description')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {portals.map((p) => {
            const card = (
              <Card
                className={`h-full border-2 ${p.border} ${p.bg} ${
                  p.comingSoon
                    ? 'opacity-95'
                    : 'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                <CardHeader className="pb-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center mb-3 shadow-md ${
                      p.comingSoon ? '' : 'group-hover:scale-105 transition-transform'
                    }`}
                  >
                    <p.icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {t(`portal.${p.key}`)}
                    </CardTitle>

                    {p.comingSoon ? (
                      <Lock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                    )}
                  </div>

                  <CardDescription className="text-xs leading-relaxed">
                    {t(`landing.${p.key}_description`)}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-1.5">
                    {p.features.map((f, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4">
                    <Badge variant="outline" className="text-xs">
                      {p.comingSoon ? t('landing.coming_soon') : p.badge}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );

            return p.comingSoon ? (
              <div key={p.key} className="block cursor-default">
                {card}
              </div>
            ) : (
              <Link key={p.key} href={p.href} className="group block">
                {card}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick Feature Row */}
      <section className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              Icon: ClipboardCheck,
              label: 'Attendance tracking',
              desc: 'Daily, by class or student',
            },
            {
              Icon: BarChart3,
              label: 'Reports & analytics',
              desc: 'Charts, exports, AI insights',
            },
            {
              Icon: BookOpen,
              label: 'Homework & marks',
              desc: 'Full academic workflow',
            },
            {
              Icon: Sparkles,
              label: 'AI analysis',
              desc: 'Identify at-risk students',
            },
          ].map(({ Icon, label, desc }) => (
            <div
              key={label}
              className="text-center p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow"
            >
              <Icon className="w-7 h-7 mx-auto mb-2 text-emerald-600" />
              <p className="font-semibold text-sm mb-0.5">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4" />
            <span>{displayName}</span>
          </div>

          <p>
            © {new Date().getFullYear()} School Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
