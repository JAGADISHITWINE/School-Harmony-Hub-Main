import type {
  User, RoleDef, MenuItem, Student, Staff, SchoolClass,
  AttendanceRecord, FeeRecord, NotificationRecord, Permission, Role,
} from "@/types";

const ALL_PERMS: Permission[] = [
  "users.view","users.manage","roles.view","roles.manage","menus.view","menus.manage",
  "students.view","students.manage","staff.view","staff.manage","classes.view","classes.manage",
  "attendance.view","attendance.manage","fees.view","fees.manage","notifications.view","notifications.manage",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ALL_PERMS,
  admin: ALL_PERMS.filter(p => !p.startsWith("roles.") && !p.startsWith("menus.")),
  principal: ALL_PERMS.filter(p => !p.startsWith("roles.") && !p.startsWith("menus.")),
  hod: ["students.view","classes.view","classes.manage","attendance.view","attendance.manage","notifications.view"],
  teacher: ["students.view","classes.view","attendance.view","attendance.manage","notifications.view"],
  accountant: ["students.view","fees.view","fees.manage","notifications.view"],
  student: ["classes.view","attendance.view","fees.view"],
};

const uid = () => Math.random().toString(36).slice(2, 10);

const seedUsers: User[] = [
  { id: "u1", name: "Alex Morgan", email: "admin@school.io", role: "super_admin", status: "active", createdAt: "2024-01-15" },
  { id: "u2", name: "Priya Sharma", email: "priya@school.io", role: "admin", status: "active", createdAt: "2024-02-10" },
  { id: "u3", name: "John Carter", email: "john@school.io", role: "teacher", status: "active", createdAt: "2024-03-01" },
  { id: "u4", name: "Maria Lopez", email: "maria@school.io", role: "accountant", status: "active", createdAt: "2024-03-12" },
  { id: "u5", name: "Sam Lee", email: "sam@school.io", role: "teacher", status: "inactive", createdAt: "2024-04-22" },
];

const seedRoles: RoleDef[] = (Object.keys(ROLE_PERMISSIONS) as Role[]).map((k, i) => ({
  id: `r${i+1}`,
  key: k,
  name: k.replace("_"," ").replace(/\b\w/g, c => c.toUpperCase()),
  permissions: ROLE_PERMISSIONS[k],
  description: `${k} default role`,
}));

const seedMenus: MenuItem[] = [
  { id: "m1", label: "Dashboard", path: "/dashboard", icon: "LayoutDashboard", order: 1, roles: ["super_admin","admin","teacher","accountant"] },
  { id: "m2", label: "Users", path: "/users", icon: "Users", order: 2, roles: ["super_admin","admin"], permission: "users.view" },
  { id: "m3", label: "Roles", path: "/roles", icon: "ShieldCheck", order: 3, roles: ["super_admin"], permission: "roles.view" },
  { id: "m4", label: "Menus", path: "/menus", icon: "Menu", order: 4, roles: ["super_admin"], permission: "menus.view" },
  { id: "m5", label: "Students", path: "/students", icon: "GraduationCap", order: 5, roles: ["super_admin","admin","teacher"], permission: "students.view" },
  { id: "m6", label: "Staff", path: "/staff", icon: "UserCog", order: 6, roles: ["super_admin","admin"], permission: "staff.view" },
  { id: "m7", label: "Classes", path: "/classes", icon: "School", order: 7, roles: ["super_admin","admin"], permission: "classes.view" },
  { id: "m8", label: "Attendance", path: "/attendance", icon: "CalendarCheck", order: 8, roles: ["super_admin","admin","teacher"], permission: "attendance.view" },
  { id: "m9", label: "Timetable", path: "/timetable", icon: "CalendarDays", order: 9, roles: ["super_admin","admin","teacher"], permission: "classes.view" },
  { id: "m10", label: "Fees", path: "/fees", icon: "Wallet", order: 10, roles: ["super_admin","admin","accountant"], permission: "fees.view" },
  { id: "m11", label: "Notifications", path: "/notifications", icon: "Bell", order: 11, roles: ["super_admin","admin","teacher","accountant"], permission: "notifications.view" },
];

const seedClasses: SchoolClass[] = [
  { id: "c1", name: "Grade 9", grade: 9, sections: [{id:"s1",name:"A",capacity:35},{id:"s2",name:"B",capacity:35}] },
  { id: "c2", name: "Grade 10", grade: 10, sections: [{id:"s3",name:"A",capacity:35},{id:"s4",name:"B",capacity:35},{id:"s5",name:"C",capacity:30}] },
  { id: "c3", name: "Grade 11", grade: 11, sections: [{id:"s6",name:"Science",capacity:40},{id:"s7",name:"Commerce",capacity:40}] },
  { id: "c4", name: "Grade 12", grade: 12, sections: [{id:"s8",name:"Science",capacity:40},{id:"s9",name:"Commerce",capacity:40}] },
];

const firstNames = ["Aarav","Diya","Ethan","Fatima","Liam","Sophia","Noah","Mia","Lucas","Aisha","Zayn","Emma","Ravi","Anya","Kai","Leah","Omar","Nora","Ivan","Maya"];
const lastNames = ["Patel","Khan","Singh","Garcia","Smith","Wong","Kumar","Brown","Park","Hall","Reyes","Cho","Mehta","Stone","Roy"];
const pick = <T,>(arr:T[]) => arr[Math.floor(Math.random()*arr.length)];

const seedStudents: Student[] = Array.from({length:48}).map((_,i) => {
  const cls = pick(seedClasses);
  const sec = pick(cls.sections);
  const fn = pick(firstNames), ln = pick(lastNames);
  return {
    id: `st${i+1}`,
    name: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@school.io`,
    rollNo: `${cls.grade}${sec.name}${(i+1).toString().padStart(2,"0")}`,
    classId: cls.id,
    sectionId: sec.id,
    parentName: `${pick(firstNames)} ${ln}`,
    parentPhone: `+1 555 ${(1000+i).toString()}`,
    status: i % 9 === 0 ? "inactive" : "active",
    admissionDate: `2023-${((i%12)+1).toString().padStart(2,"0")}-15`,
  };
});

const seedStaff: Staff[] = Array.from({length:18}).map((_,i) => {
  const fn = pick(firstNames), ln = pick(lastNames);
  const role: Role = (["teacher","admin","accountant"] as Role[])[i%3];
  return {
    id: `sf${i+1}`,
    name: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@staff.school.io`,
    phone: `+1 555 ${(2000+i).toString()}`,
    role,
    department: pick(["Math","Science","English","Finance","Operations","Arts"]),
    status: "active",
    joinedAt: `2022-${((i%12)+1).toString().padStart(2,"0")}-01`,
  };
});

const today = new Date();
const isoDate = (d: Date) => d.toISOString().slice(0,10);
const seedAttendance: AttendanceRecord[] = [];
for (let d=0; d<7; d++) {
  const date = new Date(today); date.setDate(today.getDate() - d);
  seedStudents.slice(0,20).forEach((s,i) => {
    seedAttendance.push({
      id: uid(), studentId: s.id, classId: s.classId, date: isoDate(date),
      status: i % 7 === 0 ? "absent" : i % 11 === 0 ? "late" : "present",
    });
  });
}

const seedFees: FeeRecord[] = seedStudents.map((s,i) => ({
  id: `f${i+1}`,
  studentId: s.id,
  amount: 500 + (i%5)*150,
  dueDate: `2025-${((i%12)+1).toString().padStart(2,"0")}-10`,
  paidDate: i%3===0 ? `2025-${((i%12)+1).toString().padStart(2,"0")}-08` : undefined,
  status: i%3===0 ? "paid" : i%5===0 ? "overdue" : "pending",
  category: pick(["Tuition","Lab","Library","Sports","Transport"]),
}));

const seedNotifications: NotificationRecord[] = Array.from({length:12}).map((_,i) => ({
  id: `n${i+1}`,
  title: pick(["Holiday Notice","Fee Reminder","Exam Schedule","PTM Invitation","Sports Day"]),
  message: "Please refer to the attached circular for full details.",
  channel: (["email","sms","both"] as const)[i%3],
  audience: pick(["All Parents","Grade 10","Grade 12","Staff","All Students"]),
  sentAt: `2025-0${(i%9)+1}-1${i%9}`,
  status: i%6===0 ? "draft" : "sent",
}));

export const db = {
  users: [...seedUsers],
  roles: [...seedRoles],
  menus: [...seedMenus],
  classes: [...seedClasses],
  students: [...seedStudents],
  staff: [...seedStaff],
  attendance: [...seedAttendance],
  fees: [...seedFees],
  notifications: [...seedNotifications],
};

export { uid };
