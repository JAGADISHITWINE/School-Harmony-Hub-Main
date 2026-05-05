import { useEffect, useMemo, useState } from "react";
import { Check, LayoutList, Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface RoleRow {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_system: boolean;
}

interface PermissionRow {
  id: string;
  code: string;
  module: string;
  action: string;
  description?: string | null;
}

interface MenuRow {
  id: string;
  parent_id: string | null;
  label: string;
  route: string | null;
  icon: string | null;
  order_no: number;
  is_active: boolean;
}

interface MenuNode extends MenuRow {
  children: MenuNode[];
}

function extractItems<T>(res: any): T[] {
  return (
    (Array.isArray(res?.data?.items) && res.data.items) ||
    (Array.isArray(res?.data) && res.data) ||
    (Array.isArray(res) && res) ||
    []
  ) as T[];
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildMenuTree(rows: MenuRow[]): MenuNode[] {
  const nodes = new Map<string, MenuNode>();
  rows.forEach((row) => nodes.set(row.id, { ...row, children: [] }));

  const roots: MenuNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parent_id ? nodes.get(node.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  const sortTree = (items: MenuNode[]) => {
    items.sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0) || a.label.localeCompare(b.label));
    items.forEach((item) => sortTree(item.children));
  };
  sortTree(roots);
  return roots;
}

function collectMenuIds(node: MenuNode): string[] {
  return [node.id, ...node.children.flatMap(collectMenuIds)];
}

function getParentIds(menuId: string, byId: Map<string, MenuRow>) {
  const ids: string[] = [];
  let current = byId.get(menuId);
  while (current?.parent_id) {
    ids.push(current.parent_id);
    current = byId.get(current.parent_id);
  }
  return ids;
}

export function PermissionsPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [accessLoading, setAccessLoading] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [savingMenus, setSavingMenus] = useState(false);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null;

  const menuById = useMemo(() => new Map(menus.map((m) => [m.id, m])), [menus]);
  const menuTree = useMemo(() => buildMenuTree(menus), [menus]);

  const groupedPermissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = permissions.filter((p) => {
      if (!q) return true;
      return [p.code, p.module, p.action, p.description || ""].some((v) =>
        String(v).toLowerCase().includes(q)
      );
    });

    return rows.reduce<Record<string, PermissionRow[]>>((acc, permission) => {
      const key = permission.module || "other";
      acc[key] = acc[key] || [];
      acc[key].push(permission);
      return acc;
    }, {});
  }, [permissions, search]);

  const loadBaseData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permissionsRes, menusRes] = await Promise.all([
        api.get<any>("/roles?page=1&page_size=100"),
        api.get<any>("/roles/permissions"),
        api.get<any>("/menus"),
      ]);

      const nextRoles = extractItems<RoleRow>(rolesRes);
      setRoles(nextRoles);
      setPermissions(extractItems<PermissionRow>(permissionsRes));
      setMenus(extractItems<MenuRow>(menusRes));

      if (!selectedRoleId && nextRoles.length > 0) {
        setSelectedRoleId(nextRoles[0].id);
      }
    } catch (error: any) {
      toast.error(error?.message || "Unable to load permissions setup");
    } finally {
      setLoading(false);
    }
  };

  const loadRoleAccess = async (roleId: string) => {
    if (!roleId) return;
    setAccessLoading(true);
    try {
      const res = await api.get<any>(`/roles/${roleId}/access`);
      setSelectedPermissionIds(new Set((res?.data?.permission_ids || []).map(String)));
      setSelectedMenuIds(new Set((res?.data?.menu_ids || []).map(String)));
    } catch (error: any) {
      setSelectedPermissionIds(new Set());
      setSelectedMenuIds(new Set());
      toast.error(error?.message || "Unable to load role access");
    } finally {
      setAccessLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (selectedRoleId) loadRoleAccess(selectedRoleId);
  }, [selectedRoleId]);

  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const toggleMenu = (node: MenuNode) => {
    const subtreeIds = collectMenuIds(node);
    const everySelected = subtreeIds.every((id) => selectedMenuIds.has(id));

    setSelectedMenuIds((prev) => {
      const next = new Set(prev);
      if (everySelected) {
        subtreeIds.forEach((id) => next.delete(id));
      } else {
        subtreeIds.forEach((id) => next.add(id));
        getParentIds(node.id, menuById).forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const savePermissions = async () => {
    if (!selectedRoleId) return;
    setSavingPermissions(true);
    try {
      await api.put(`/roles/${selectedRoleId}/permissions`, {
        permission_ids: Array.from(selectedPermissionIds),
      });
      toast.success("Permissions updated");
      await loadRoleAccess(selectedRoleId);
    } finally {
      setSavingPermissions(false);
    }
  };

  const saveMenus = async () => {
    if (!selectedRoleId) return;
    setSavingMenus(true);
    try {
      await api.put(`/roles/${selectedRoleId}/menus`, {
        menu_ids: Array.from(selectedMenuIds),
      });
      toast.success("Menus updated");
      await loadRoleAccess(selectedRoleId);
    } finally {
      setSavingMenus(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Permissions"
        description="Manage role permissions and sidebar menu access."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4">
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold">Roles</h2>
            <p className="text-xs text-muted-foreground mt-1">Select one role to manage access.</p>
          </div>
          <div className="p-2">
            {loading && (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading roles
              </div>
            )}
            {!loading && roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left transition-colors",
                  role.id === selectedRoleId
                    ? "bg-primary/10 text-foreground"
                    : "hover:bg-muted/70 text-muted-foreground"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{role.name}</span>
                  {role.is_system && <Badge variant="outline">System</Badge>}
                </div>
                <div className="mt-1 font-mono text-xs">{role.slug}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <h2 className="text-sm font-semibold">{selectedRole?.name || "Select a role"}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedRole?.description || selectedRole?.slug || "Role access settings"}
              </p>
            </div>
            {accessLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Syncing
              </div>
            )}
          </div>

          <Tabs defaultValue="permissions" className="p-4">
            <TabsList>
              <TabsTrigger value="permissions">
                <ShieldCheck className="mr-2 h-4 w-4" /> Permissions
              </TabsTrigger>
              <TabsTrigger value="menus">
                <LayoutList className="mr-2 h-4 w-4" /> Menus
              </TabsTrigger>
            </TabsList>

            <TabsContent value="permissions" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search permission code, module or action"
                  className="w-full sm:w-96"
                />
                <Button onClick={savePermissions} disabled={!selectedRoleId || savingPermissions}>
                  {savingPermissions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Permissions
                </Button>
              </div>

              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([module, rows]) => (
                  <PermissionGroup
                    key={module}
                    module={module}
                    rows={rows}
                    selectedIds={selectedPermissionIds}
                    onToggle={togglePermission}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="menus" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  Checked menus are visible in the sidebar for this role.
                </div>
                <Button onClick={saveMenus} disabled={!selectedRoleId || savingMenus}>
                  {savingMenus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Menus
                </Button>
              </div>

              <div className="rounded-lg border border-border">
                {menuTree.map((node) => (
                  <MenuTreeItem
                    key={node.id}
                    node={node}
                    selectedIds={selectedMenuIds}
                    onToggle={toggleMenu}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}

function PermissionGroup({
  module,
  rows,
  selectedIds,
  onToggle,
}: {
  module: string;
  rows: PermissionRow[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const selectedCount = rows.filter((row) => selectedIds.has(row.id)).length;

  return (
    <Card className="overflow-hidden border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">{titleCase(module)}</h3>
          <p className="text-xs text-muted-foreground">{selectedCount} of {rows.length} enabled</p>
        </div>
        {selectedCount === rows.length && rows.length > 0 && (
          <Badge variant="outline" className="text-primary">
            <Check className="mr-1 h-3 w-3" /> Full
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((permission) => (
          <label
            key={permission.id}
            className="flex cursor-pointer items-start gap-3 border-b border-r border-border p-3 last:border-b-0 hover:bg-muted/40"
          >
            <Checkbox
              checked={selectedIds.has(permission.id)}
              onCheckedChange={() => onToggle(permission.id)}
            />
            <span className="min-w-0">
              <span className="block font-mono text-xs text-foreground">{permission.code}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {permission.description || titleCase(permission.action)}
              </span>
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}

function MenuTreeItem({
  node,
  selectedIds,
  onToggle,
  level = 0,
}: {
  node: MenuNode;
  selectedIds: Set<string>;
  onToggle: (node: MenuNode) => void;
  level?: number;
}) {
  const subtreeIds = collectMenuIds(node);
  const checked = selectedIds.has(node.id);
  const partial = !checked && subtreeIds.some((id) => selectedIds.has(id));

  return (
    <div>
      <label
        className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 hover:bg-muted/40"
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={() => onToggle(node)}
          className={partial ? "border-primary/70 bg-primary/20" : undefined}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{node.label}</span>
          <span className="block font-mono text-xs text-muted-foreground">{node.route || "Group"}</span>
        </span>
        {!node.is_active && <Badge variant="outline">Inactive</Badge>}
      </label>
      {node.children.map((child) => (
        <MenuTreeItem
          key={child.id}
          node={child}
          selectedIds={selectedIds}
          onToggle={onToggle}
          level={level + 1}
        />
      ))}
    </div>
  );
}
