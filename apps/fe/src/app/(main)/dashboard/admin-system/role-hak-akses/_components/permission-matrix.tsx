"use client";

import { useCallback, useEffect, useState } from "react";

import { RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

type Permission = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
};

type RoleRow = {
  id: string;
  code: string;
  name: string;
  rolePermissions: Array<{ permissionId: string }>;
};

export function PermissionMatrix() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesData, permissionsData] = await Promise.all([
        apiBrowserFetch<RoleRow[]>("/rbac/roles"),
        apiBrowserFetch<Permission[]>("/rbac/permissions"),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
      const next = new Set<string>();
      for (const role of rolesData) {
        for (const rp of role.rolePermissions) next.add(`${role.id}:${rp.permissionId}`);
      }
      setGranted(next);
    } catch {
      toast.error("Gagal memuat data permission.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (role: RoleRow, permission: Permission) => {
    const key = `${role.id}:${permission.id}`;
    const currentIds = role.rolePermissions.map((rp) => rp.permissionId);
    const willGrant = !granted.has(key);
    const nextIds = willGrant ? [...currentIds, permission.id] : currentIds.filter((id) => id !== permission.id);

    setGranted((prev) => {
      const next = new Set(prev);
      if (willGrant) next.add(key);
      else next.delete(key);
      return next;
    });

    try {
      setBusyKey(key);
      await apiBrowserMutation("PUT", `/rbac/roles/${role.id}/permissions`, { permissionIds: nextIds });
      toast.success(`Permission ${permission.name} untuk ${role.name} diperbarui.`);
      void load();
    } catch {
      toast.error("Gagal memperbarui permission.");
      void load();
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-cyan-600 dark:text-cyan-400" />
          <CardTitle>Permission per Role</CardTitle>
        </div>
        <CardDescription>
          Permission dikelola dinamis dari database. Centang untuk memberikan akses pada role.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 py-2">
          <Badge variant="outline">{permissions.length} permission</Badge>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
            Muat ulang
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-muted/35 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Permission</th>
                {roles.map((role) => (
                  <th key={role.id} className="px-3 py-3 text-center font-semibold">
                    <div className="truncate">{role.name}</div>
                    <div className="font-mono font-normal text-xs">{role.code}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={roles.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                    Memuat permission...
                  </td>
                </tr>
              ) : permissions.length === 0 ? (
                <tr>
                  <td colSpan={roles.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada permission. Jalankan seed:rbac-foundation.
                  </td>
                </tr>
              ) : (
                permissions.map((permission) => (
                  <tr key={permission.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{permission.name}</div>
                      <div className="font-mono text-muted-foreground text-xs">{permission.code}</div>
                    </td>
                    {roles.map((role) => {
                      const key = `${role.id}:${permission.id}`;
                      const checked = granted.has(key);
                      return (
                        <td key={role.id} className="px-3 py-2.5 text-center">
                          <Checkbox
                            checked={checked}
                            disabled={busyKey === key}
                            onCheckedChange={() => void toggle(role, permission)}
                            className={cn("size-4", checked && "data-[state=checked]:bg-cyan-600")}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
