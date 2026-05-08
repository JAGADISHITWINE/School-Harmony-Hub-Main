export type ID = string;

export type Role = "super_admin" | "admin" | "principal" | "hod" | "teacher" | "accountant" | "student";

export type Permission =
  | "users.view" | "users.manage"
  | "roles.view" | "roles.manage"
  | "menus.view" | "menus.manage"
  | "students.view" | "students.manage"
  | "staff.view" | "staff.manage"
  | "classes.view" | "classes.manage"
  | "attendance.view" | "attendance.manage"
  | "fees.view" | "fees.manage"
  | "notifications.view" | "notifications.manage";

export interface User {
  id: ID;
  name: string;
  email: string;
  role: Role;
  status: "active" | "inactive";
  createdAt: string;
}

export interface RoleDef {
  id: ID;
  name: string;
  key: Role;
  permissions: Permission[];
  description?: string;
}

export interface MenuItem {
  id: ID;
  label: string;
  path: string;
  icon: string;
  order: number;
  roles: Role[];
  permission?: Permission;
}

export interface Student {
  id: ID;
  name: string;
  email: string;
  rollNo: string;
  classId: ID;
  sectionId: ID;
  parentName: string;
  parentPhone: string;
  status: "active" | "inactive";
  admissionDate: string;
}

export interface Staff {
  id: ID;
  name: string;
  email: string;
  phone: string;
  role: Role;
  department: string;
  status: "active" | "inactive";
  joinedAt: string;
}

export interface SchoolClass {
  id: ID;
  name: string;
  grade: number;
  sections: Section[];
}

export interface Section {
  id: ID;
  name: string;
  capacity: number;
}

export interface AttendanceRecord {
  id: ID;
  studentId: ID;
  classId: ID;
  date: string;
  status: "present" | "absent" | "late";
}

export interface FeeRecord {
  id: ID;
  studentId: ID;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: "paid" | "pending" | "overdue";
  category: string;
}

export interface NotificationRecord {
  id: ID;
  title: string;
  message: string;
  channel: "email" | "sms" | "both";
  audience: string;
  sentAt: string;
  status: "sent" | "draft" | "failed";
}

export interface AuthUser extends User {
  institution_id?: string;
  organization_id?: string;
  permissions: Permission[];
  token: string;
  menus?: MenuItem[];
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}
