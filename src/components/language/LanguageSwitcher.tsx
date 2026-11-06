
'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  languages,
  type LanguageCode,
} from '@/lib/i18n/translations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  const current = languages.find((l) => l.code === lang) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 h-8 px-2 text-sm font-medium"
        >
          <span className="text-base">{current.flag}</span>
          <span className="hidden sm:inline">{current.nativeName}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setLang(language.code as LanguageCode)}
            className={`flex items-center gap-3 cursor-pointer ${
              lang === language.code ? 'bg-accent font-medium' : ''
            }`}
          >
            <span className="text-lg">{language.flag}</span>
            <div>
              <p className="text-sm font-medium">{language.nativeName}</p>
              <p className="text-xs text-muted-foreground">
                {language.name}
              </p>
            </div>

            {lang === language.code && (
              <span className="ml-auto text-emerald-600 text-xs font-bold">
                ✓
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
