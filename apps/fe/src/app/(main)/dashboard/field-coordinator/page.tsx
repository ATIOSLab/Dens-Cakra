import { CommandIntelligencePage } from "@/app/(main)/dashboard/_components/command-intelligence/command-intelligence-page";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export const dynamic = "force-dynamic";

export default function Page() {
  return <CommandIntelligencePage role={SYSTEM_ROLES.FIELD_COORDINATOR} />;
}
