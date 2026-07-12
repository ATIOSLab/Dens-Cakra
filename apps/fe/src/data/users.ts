import { SYSTEM_ROLES, type SystemRole } from "@/navigation/sidebar/system-roles";

export interface DashboardUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  role: SystemRole;
}

export const users: DashboardUser[] = [
  {
    id: "1",
    name: "Deputi II Demo",
    username: "kabinda-demo",
    email: "executive@denscakra.local",
    avatar: "",
    role: SYSTEM_ROLES.EXECUTIVE,
  },
  {
    id: "2",
    name: "Direktur Wilayah Demo",
    username: "regional-demo",
    email: "regional.commander@denscakra.local",
    avatar: "",
    role: SYSTEM_ROLES.REGIONAL_COMMANDER,
  },
  {
    id: "3",
    name: "Kasubdit Demo",
    username: "oim-demo",
    email: "oim@denscakra.local",
    avatar: "",
    role: SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER,
  },
  {
    id: "4",
    name: "Korwil Demo",
    username: "korwil-demo",
    email: "field.coordinator@denscakra.local",
    avatar: "",
    role: SYSTEM_ROLES.FIELD_COORDINATOR,
  },
  {
    id: "5",
    name: "Petugas Organik Demo",
    username: "field-officer-demo",
    email: "field.officer@denscakra.local",
    avatar: "",
    role: SYSTEM_ROLES.FIELD_OFFICER,
  },
  {
    id: "6",
    name: "Admin Sistem Demo",
    username: "admin-sistem-demo",
    email: "admin.system@denscakra.local",
    avatar: "",
    role: SYSTEM_ROLES.ADMIN_SYSTEM,
  },
];
