import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function ModuleUnavailable({
  title,
  detail,
  homeHref = '/',
}: {
  title: string;
  detail: string;
  homeHref?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <Card className="border-2 border-amber-200 dark:border-amber-900">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium">Not available in this build</span>
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{detail}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This module has not been connected yet because the live
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">essjt_school_system</code>
            database does not contain the tables it depends on. Nothing was
            created, altered or dropped in the live database.
          </p>
          <Link href={homeHref}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
