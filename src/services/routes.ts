import { register, tokenStore } from "./api";
import { db, ROLE_PERMISSIONS, uid } from "@/lib/mock-db";
import type {
  AuthUser, ListParams, Paginated, Permission, Role, User, RoleDef,
  MenuItem, Student, Staff, SchoolClass, AttendanceRecord, FeeRecord, NotificationRecord,
} from "@/types";

function paginate<T extends Record<string, any>>(
  items: T[], params: ListParams = {}, searchFields: (keyof T)[] = []
): Paginated<T> {
  let arr = [...items];
  if (params.search && searchFields.length) {
    const q = params.search.toLowerCase();
    arr = arr.filter(it => searchFields.some(f => String(it[f] ?? "").toLowerCase().includes(q)));
  }
  if (params.sortBy) {
    const dir = params.sortDir === "desc" ? -1 : 1;
    arr.sort((a,b) => {
      const va = a[params.sortBy as keyof T], vb = b[params.sortBy as keyof T];
      if (va == null) return 1; if (vb == null) return -1;
      return va > vb ? dir : va < vb ? -dir : 0;
    });
  }
  const page = params.page ?? 1, pageSize = params.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  return { data: arr.slice(start, start + pageSize), total: arr.length, page, pageSize };
}

function parseQuery(q?: any): ListParams {
  return q || {};
}

/* ---------- AUTH ---------- */
const DEMO_PASSWORD = "admin123";

register("POST", "/auth/login", (body) => {
  const { email, password } = body || {};
  const user = db.users.find(u => u.email.toLowerCase() === String(email||"").toLowerCase());
  if (!user || password !== DEMO_PASSWORD) throw new Error("Invalid email or password");
  if (user.status !== "active") throw new Error("Account is inactive");
  const token = `mock.${user.id}.${Date.now()}`;
  tokenStore.set(token);
  const auth: AuthUser = { ...user, permissions: ROLE_PERMISSIONS[user.role], token };
  return auth;
});


register("GET", "/auth/me", () => {
  const t = tokenStore.get();
  if (!t) throw new Error("Not authenticated");
  const id = t.split(".")[1];
  const user = db.users.find(u => u.id === id);
  if (!user) throw new Error("User not found");
  const auth: AuthUser = { ...user, permissions: ROLE_PERMISSIONS[user.role], token: t };
  return auth;
});

/* ---------- Generic CRUD factory ---------- */
function crud<T extends { id: string }>(
  base: string,
  collection: T[],
  searchFields: (keyof T)[],
  defaults: Partial<T> = {},
) {
  register("GET", base, (_b, _p) => paginate(collection, parseQuery(_b), searchFields));
  register("POST", base + "/query", (b) => paginate(collection, parseQuery(b), searchFields));
  register("GET", `${base}/:id`, (_b, p) => {
    const item = collection.find(i => i.id === p.id);
    if (!item) throw new Error("Not found");
    return item;
  });
  register("POST", base, (b) => {
    const item = { ...defaults, ...b, id: uid() } as T;
    collection.unshift(item);
    return item;
  });
  register("PUT", `${base}/:id`, (b, p) => {
    const idx = collection.findIndex(i => i.id === p.id);
    if (idx === -1) throw new Error("Not found");
    collection[idx] = { ...collection[idx], ...b, id: p.id } as T;
    return collection[idx];
  });
  register("DELETE", `${base}/:id`, (_b, p) => {
    const idx = collection.findIndex(i => i.id === p.id);
    if (idx === -1) throw new Error("Not found");
    const [removed] = collection.splice(idx, 1);
    return removed;
  });
  register("POST", `${base}/bulk-delete`, (b: { ids: string[] }) => {
    const ids = new Set(b?.ids || []);
    for (let i = collection.length - 1; i >= 0; i--) if (ids.has(collection[i].id)) collection.splice(i,1);
    return { ok: true, removed: b?.ids?.length || 0 };
  });
}

crud<User>("/users", db.users, ["name","email","role"], { status: "active", createdAt: new Date().toISOString().slice(0,10) });
crud<RoleDef>("/roles", db.roles, ["name","key"]);
crud<MenuItem>("/menus", db.menus, ["label","path"]);
crud<Student>("/students", db.students, ["name","email","rollNo","parentName"], { status:"active", admissionDate: new Date().toISOString().slice(0,10) });
crud<Staff>("/staff", db.staff, ["name","email","department"], { status:"active", joinedAt: new Date().toISOString().slice(0,10) });
crud<SchoolClass>("/classes", db.classes, ["name"]);
crud<AttendanceRecord>("/attendance", db.attendance, []);
crud<FeeRecord>("/fees", db.fees, ["category"]);
crud<NotificationRecord>("/notifications", db.notifications, ["title","audience"]);

/* dashboard stats */
register("GET", "/stats/overview", () => {
  const totalStudents = db.students.length;
  const activeStudents = db.students.filter(s => s.status === "active").length;
  const totalStaff = db.staff.length;
  const feesPaid = db.fees.filter(f => f.status === "paid").reduce((s,f)=>s+f.amount,0);
  const feesPending = db.fees.filter(f => f.status !== "paid").reduce((s,f)=>s+f.amount,0);
  const att = db.attendance;
  const presentRate = att.length ? Math.round((att.filter(a=>a.status==="present").length / att.length) * 100) : 0;
  // Last 7 days enrollment trend (mock)
  const enrollment = Array.from({length:7}).map((_,i) => ({
    day: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
    students: 30 + Math.round(Math.sin(i)*10) + i*4,
    staff: 4 + (i%3),
  }));
  const feeTrend = Array.from({length:6}).map((_,i) => ({
    month: ["Jan","Feb","Mar","Apr","May","Jun"][i],
    paid: 8000 + i*1500 + Math.round(Math.random()*1000),
    pending: 4000 - i*300 + Math.round(Math.random()*800),
  }));
  const recent = [
    { id:"a1", text:"New student admitted to Grade 10-A", time:"2h ago" },
    { id:"a2", text:"Fee payment received: $750", time:"3h ago" },
    { id:"a3", text:"Attendance marked for Grade 9-B", time:"5h ago" },
    { id:"a4", text:"Notification sent to all parents", time:"1d ago" },
    { id:"a5", text:"New staff member onboarded", time:"2d ago" },
  ];
  return { totalStudents, activeStudents, totalStaff, feesPaid, feesPending, presentRate, enrollment, feeTrend, recent };
});

/* permission helpers exposed via api */
register("GET", "/permissions/all", () => Object.values(ROLE_PERMISSIONS).flat().filter((v,i,a)=>a.indexOf(v)===i) as Permission[]);

export {};