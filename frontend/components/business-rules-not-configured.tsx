import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type BusinessRulesNotConfiguredProps = {
  isSuperadmin: boolean;
  missingFields: string[];
};

export function BusinessRulesNotConfigured({
  isSuperadmin,
  missingFields,
}: BusinessRulesNotConfiguredProps) {
  if (missingFields.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">
            Business Rules Not Configured
          </h3>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            The following required fields are not configured:{" "}
            <span className="font-medium">{missingFields.join(", ")}</span>
          </p>
          {isSuperadmin && (
            <p className="mt-2 text-sm">
              <Link
                href="/dashboard/business-rules"
                className="font-medium text-amber-900 underline hover:text-amber-700 dark:text-amber-100 dark:hover:text-amber-300"
              >
                Configure now →
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
