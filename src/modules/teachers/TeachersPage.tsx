import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/services";
import { useAuth } from "@/store/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FormModal } from "@/components/common/FormModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { BulkImportTools } from "@/components/common/BulkImportTools";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Link2, CalendarClock, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { ListParams, Paginated } from "@/types";

interface TeacherClass {
  id: string;
  class_id: string;
  class_name: string;
  semester: number;
  branch_id: string;
  branch_name: string;
  academic_year_id?: string | null;
  academic_year_label?: string | null;
}

interface TeacherRow {
  id: string;
  user_id: string;
  employee_code: string;
  designation?: string | null;
  joined_at?: string | null;
  full_name: string;
  email: string;
  username: string;
  phone?: string | null;
  assigned_classes: TeacherClass[];
}

interface TeacherCandidate {
  user_id: string;
  institution_id: string;
  full_name: string;
  email: string;
  username: string;
  phone?: string | null;
}

interface TeacherTimetableRow {
  id: string;
  teacher_id: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  subject_id: string;
  subject_name: string;
  branch_id: string;
  branch_name: string;
  academic_year_id: string;
  academic_year_label?: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_no?: string | null;
  session_id?: string | null;
  session_status?: string | null;
  session_date?: string | null;
}

interface Option {
  id: string;
  name: string;
}

interface AcademicYearOption {
  id: string;
  label: string;
}

const dayOptions = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const emptyPage = <T,>(): Paginated<T> => ({ data: [], total: 0, page: 1, pageSize: 10 });

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function listFrom<T>(payload: any): T[] {
  return (
    (Array.isArray(payload?.data?.items) && payload.data.items) ||
    (Array.isArray(payload?.data) && payload.data) ||
    (Array.isArray(payload) && payload) ||
    []
  ) as T[];
}

function localPage<T extends Record<string, any>>(
  items: T[],
  params: ListParams,
  searchFields: (keyof T)[]
): Paginated<T> {
  let rows = [...items];
  const query = String(params.search || "").trim().toLowerCase();
  if (query) {
    rows = rows.filter((row) =>
      searchFields.some((field) => String(row[field] ?? "").toLowerCase().includes(query))
    );
  }

  if (params.sortBy) {
    const dir = params.sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      const left = a[params.sortBy as keyof T];
      const right = b[params.sortBy as keyof T];
      if (left == null) return 1;
      if (right == null) return -1;
      return left > right ? dir : left < right ? -dir : 0;
    });
  }

  const pageSize = params.pageSize ?? 10;
  const page = params.page ?? 1;
  const start = (page - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    total: rows.length,
    page,
    pageSize,
  };
}

export function TeachersPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "super_admin" || user?.role === "principal" || user?.role === "hod";

  const [params, setParams] = useState<ListParams>({ page: 1, pageSize: 10 });
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRow | null>(null);
  const [timetable, setTimetable] = useState<TeacherTimetableRow[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);

  const [candidates, setCandidates] = useState<TeacherCandidate[]>([]);
  const [years, setYears] = useState<AcademicYearOption[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [branches, setBranches] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [sections, setSections] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);

  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [timetableModalOpen, setTimetableModalOpen] = useState(false);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);

  const [teacherForm, setTeacherForm] = useState({
    user_id: "",
    employee_code: "",
    designation: "",
    joined_at: "",
  });
  const [classForm, setClassForm] = useState({
    course_id: "",
    branch_id: "",
    class_id: "",
  });
  const [timetableForm, setTimetableForm] = useState({
    id: "",
    academic_year_id: "",
    class_id: "",
    section_id: "",
    subject_id: "",
    day_of_week: "monday",
    start_time: "09:00",
    end_time: "10:00",
    room_no: "",
  });

  const teacherPage = useMemo(
    () => localPage(teachers, params, ["full_name", "email", "employee_code", "designation"]),
    [teachers, params]
  );

  const teacherColumns: Column<TeacherRow>[] = [
    {
      key: "full_name",
      header: "Teacher",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.full_name}</div>
          <div className="text-xs text-muted-foreground">{row.email}</div>
        </div>
      ),
    },
    {
      key: "employee_code",
      header: "Employee Code",
      sortable: true,
      cell: (row) => <span className="font-mono text-xs">{row.employee_code}</span>,
    },
    {
      key: "designation",
      header: "Designation",
      sortable: true,
      cell: (row) => row.designation || "-",
    },
    {
      key: "assigned_classes",
      header: "Classes",
      cell: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.assigned_classes.slice(0, 2).map((item) => (
            <Badge key={item.id} variant="outline">
              {item.class_name}
            </Badge>
          ))}
          {row.assigned_classes.length > 2 && (
            <Badge variant="secondary">+{row.assigned_classes.length - 2}</Badge>
          )}
          {row.assigned_classes.length === 0 && <span className="text-muted-foreground">No class</span>}
        </div>
      ),
    },
    {
      key: "joined_at",
      header: "Joined",
      sortable: true,
      cell: (row) => toDate(row.joined_at),
    },
  ];

  const loadTeachers = async (keepSelection = true) => {
    setTeachersLoading(true);
    try {
      const res = await api.get<any>("/teachers?page=1&page_size=100");
      const rows = listFrom<TeacherRow>(res);
      setTeachers(rows);
      const nextSelected =
        keepSelection && selectedTeacherId && rows.some((item) => item.id === selectedTeacherId)
          ? selectedTeacherId
          : rows[0]?.id || "";
      setSelectedTeacherId(nextSelected);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load teachers");
      setTeachers([]);
      setSelectedTeacherId("");
    } finally {
      setTeachersLoading(false);
    }
  };

  const loadTeacherDetail = async (teacherId: string) => {
    if (!teacherId) {
      setSelectedTeacher(null);
      setTimetable([]);
      return;
    }

    setTimetableLoading(true);
    const selectedFromList = teachers.find((t) => t.id === teacherId) || null;
    if (selectedFromList) setSelectedTeacher(selectedFromList);
    try {
      const teacherRes = await api.get<any>(`/teachers/${teacherId}`);
      setSelectedTeacher((teacherRes?.data || teacherRes) as TeacherRow);
    } catch (error: any) {
      if (!selectedFromList) {
        toast.error(error?.message || "Failed to load teacher details");
        setSelectedTeacher(null);
      }
    }
    try {
      const timetableRes = await api.get<any>(`/teachers/${teacherId}/timetable`);
      setTimetable(listFrom<TeacherTimetableRow>(timetableRes));
    } catch (error: any) {
      setTimetable([]);
      toast.error(error?.message || "Failed to load timetable");
    } finally {
      setTimetableLoading(false);
    }
  };

  const loadMeta = async () => {
    if (!user?.institution_id) return;
    const [yearsRes, courseRes, candidateRes] = await Promise.allSettled([
      api.get<any>(`/academic-years?institution_id=${user.institution_id}&page=1&page_size=100`),
      api.get<any>(`/courses?institution_id=${user.institution_id}&page=1&page_size=100`),
      canManage ? api.get<any>("/teachers/candidates") : Promise.resolve({ data: [] }),
    ]);

    if (yearsRes.status === "fulfilled") setYears(listFrom<AcademicYearOption>(yearsRes.value));
    else setYears([]);

    if (courseRes.status === "fulfilled") setCourses(listFrom<Option>(courseRes.value));
    else {
      setCourses([]);
      toast.error("Course dropdown could not be loaded. Check course permissions/data.");
    }

    if (candidateRes.status === "fulfilled") setCandidates(listFrom<TeacherCandidate>(candidateRes.value));
    else setCandidates([]);
  };

  useEffect(() => {
    loadTeachers(false).catch(() => {});
    loadMeta().catch(() => {});
  }, [user?.institution_id]);

  useEffect(() => {
    loadTeacherDetail(selectedTeacherId).catch(() => {});
  }, [selectedTeacherId]);

  useEffect(() => {
    if (!classForm.course_id) {
      setBranches([]);
      setClasses([]);
      return;
    }
    const load = async () => {
      try {
        const res = await api.get<any>(`/branches?course_id=${classForm.course_id}&page=1&page_size=100`);
        setBranches(listFrom<Option>(res));
      } catch {
        setBranches([]);
      }
      setClassForm((prev) => ({ ...prev, branch_id: "", class_id: "" }));
      setClasses([]);
    };
    load().catch(() => {});
  }, [classForm.course_id]);

  useEffect(() => {
    if (!classForm.branch_id) {
      setClasses([]);
      return;
    }
    const load = async () => {
      try {
        const res = await api.get<any>(`/classes?branch_id=${classForm.branch_id}&page=1&page_size=100`);
        setClasses(listFrom<Option>(res));
      } catch {
        setClasses([]);
      }
      setClassForm((prev) => ({ ...prev, class_id: "" }));
    };
    load().catch(() => {});
  }, [classForm.branch_id]);

  useEffect(() => {
    const selectedClass = selectedTeacher?.assigned_classes.find(
      (item) => item.class_id === timetableForm.class_id
    );
    if (!selectedClass) {
      setSections([]);
      setSubjects([]);
      return;
    }

    const load = async () => {
      try {
        const [sectionRes, subjectRes] = await Promise.all([
          api.get<any>(`/sections?class_id=${selectedClass.class_id}&page=1&page_size=100`),
          api.get<any>(`/subjects?class_id=${selectedClass.class_id}&page=1&page_size=100`),
        ]);
        setSections(listFrom<Option>(sectionRes));
        setSubjects(listFrom<Option>(subjectRes));
      } catch {
        setSections([]);
        setSubjects([]);
      }
      setTimetableForm((prev) => ({ ...prev, section_id: "", subject_id: "" }));
    };
    load().catch(() => {});
  }, [selectedTeacher?.id, timetableForm.class_id]);

  const openTeacherModal = () => {
    setTeacherForm({ user_id: candidates[0]?.user_id || "", employee_code: "", designation: "", joined_at: "" });
    setTeacherModalOpen(true);
  };

  const openClassModal = () => {
    if (!selectedTeacher) {
      toast.error("Select a teacher first");
      return;
    }
    setClassForm({ course_id: "", branch_id: "", class_id: "" });
    setClassModalOpen(true);
  };

  const openTimetableModal = (row?: TeacherTimetableRow) => {
    if (!selectedTeacher) return;
    if (!selectedTeacher.assigned_classes.length) {
      toast.error("Link at least one class before adding timetable");
      return;
    }
    setTimetableForm(
      row
        ? {
            id: row.id,
            academic_year_id: row.academic_year_id,
            class_id: row.class_id,
            section_id: row.section_id,
            subject_id: row.subject_id,
            day_of_week: row.day_of_week,
            start_time: row.start_time.slice(0, 5),
            end_time: row.end_time.slice(0, 5),
            room_no: row.room_no || "",
          }
        : {
            id: "",
            academic_year_id: years[0]?.id || "",
            class_id: selectedTeacher.assigned_classes[0]?.class_id || "",
            section_id: "",
            subject_id: "",
            day_of_week: "monday",
            start_time: "09:00",
            end_time: "10:00",
            room_no: "",
          }
    );
    setTimetableModalOpen(true);
  };

  const createTeacherProfile = async () => {
    if (!teacherForm.user_id || !teacherForm.employee_code.trim()) {
      toast.error("User and employee code are required");
      return;
    }
    try {
      await api.post("/teachers", {
        user_id: teacherForm.user_id,
        employee_code: teacherForm.employee_code.trim(),
        designation: teacherForm.designation || null,
        joined_at: teacherForm.joined_at || null,
      });
      toast.success("Teacher profile created");
      setTeacherModalOpen(false);
      await Promise.all([loadTeachers(false), loadMeta()]);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create teacher profile");
    }
  };

  const linkClass = async () => {
    if (!selectedTeacher || !classForm.class_id) {
      toast.error("Select a class to link");
      return;
    }
    try {
      await api.post(`/teachers/${selectedTeacher.id}/classes`, { class_id: classForm.class_id });
      toast.success("Class linked to teacher");
      setClassModalOpen(false);
      await loadTeachers();
    } catch (error: any) {
      toast.error(error?.message || "Failed to link class");
    }
  };

  const saveTimetable = async () => {
    if (!selectedTeacher) return;
    const payload = {
      academic_year_id: timetableForm.academic_year_id,
      class_id: timetableForm.class_id,
      section_id: timetableForm.section_id,
      subject_id: timetableForm.subject_id,
      day_of_week: timetableForm.day_of_week,
      start_time: timetableForm.start_time,
      end_time: timetableForm.end_time,
      room_no: timetableForm.room_no || null,
    };

    if (!payload.academic_year_id || !payload.class_id || !payload.section_id || !payload.subject_id) {
      toast.error("Complete the timetable fields");
      return;
    }

    try {
      if (timetableForm.id) {
        await api.patch(`/teachers/timetable/${timetableForm.id}`, payload);
        toast.success("Timetable updated");
      } else {
        await api.post(`/teachers/${selectedTeacher.id}/timetable`, payload);
        toast.success("Timetable entry created");
      }
      setTimetableModalOpen(false);
      await loadTeacherDetail(selectedTeacher.id);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save timetable");
    }
  };

  const unlinkClass = async () => {
    if (!selectedTeacher || !deleteClassId) return;
    try {
      await api.delete(`/teachers/${selectedTeacher.id}/classes/${deleteClassId}`);
      toast.success("Class unlinked");
      setDeleteClassId(null);
      await loadTeachers();
    } catch (error: any) {
      toast.error(error?.message || "Failed to unlink class");
    }
  };

  const removeTimetable = async () => {
    if (!deleteSlotId || !selectedTeacher) return;
    try {
      await api.delete(`/teachers/timetable/${deleteSlotId}`);
      toast.success("Timetable entry deleted");
      setDeleteSlotId(null);
      await loadTeacherDetail(selectedTeacher.id);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete timetable entry");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        description="Attach teacher-role users, link them to classes, and maintain their timetable."
        actions={
          canManage && (
            <>
              <BulkImportTools resource="teachers" label="Teachers" onImported={loadTeachers} />
              <Button variant="outline" onClick={() => selectedTeacher && openClassModal()} disabled={!selectedTeacher}>
                <Link2 className="mr-2 h-4 w-4" />
                Link Class
              </Button>
              <Button variant="outline" onClick={() => selectedTeacher && openTimetableModal()} disabled={!selectedTeacher}>
                <CalendarClock className="mr-2 h-4 w-4" />
                Add Timetable
              </Button>
              <Button onClick={openTeacherModal}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Teacher Profile
              </Button>
            </>
          )
        }
      />

      <Card className="p-4">
        <DataTable<TeacherRow>
          columns={teacherColumns}
          data={teacherPage}
          loading={teachersLoading}
          params={params}
          onParamsChange={setParams}
          selectable={false}
          searchPlaceholder="Search teachers by name, email or employee code…"
          rowActions={(row) => (
            <div className="inline-flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTeacherId(row.id);
                  loadTeacherDetail(row.id).catch(() => {});
                }}
              >
                View
              </Button>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTeacherId(row.id);
                    loadTeacherDetail(row.id).then(() => openClassModal()).catch(() => {});
                  }}
                >
                  Manage
                </Button>
              )}
            </div>
          )}
        />
      </Card>

      <Tabs value="classes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="classes">Teacher Details</TabsTrigger>
        </TabsList>
        <TabsContent value="classes" className="space-y-4">
          <Card className="p-5">
            {!selectedTeacher && (
              <div className="text-sm text-muted-foreground">Select a teacher to inspect classes and timetable.</div>
            )}

            {selectedTeacher && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Metric label="Teacher" value={selectedTeacher.full_name} />
                  <Metric label="Employee Code" value={selectedTeacher.employee_code} mono />
                  <Metric label="Designation" value={selectedTeacher.designation || "-"} />
                  <Metric label="Joined" value={toDate(selectedTeacher.joined_at)} />
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.1fr_1.6fr]">
                  <Card className="border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">Linked Classes</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Teachers can receive timetable slots only inside these linked classes.
                        </p>
                      </div>
                      {canManage && (
                        <Button size="sm" variant="outline" onClick={openClassModal}>
                          <Plus className="mr-2 h-4 w-4" />
                          Link
                        </Button>
                      )}
                    </div>
                    <div className="mt-4 space-y-3">
                      {selectedTeacher.assigned_classes.map((item) => (
                        <div key={item.id} className="rounded-lg border border-border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{item.class_name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {item.branch_name} · Semester {item.semester}
                                {item.academic_year_label ? ` · ${item.academic_year_label}` : ""}
                              </div>
                            </div>
                            {canManage && (
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteClassId(item.class_id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {selectedTeacher.assigned_classes.length === 0 && (
                        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                          No class linked yet.
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">Timetable</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          These slots drive teacher attendance ownership for sections and subjects.
                        </p>
                      </div>
                      {canManage && (
                        <Button size="sm" variant="outline" onClick={() => openTimetableModal()}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Slot
                        </Button>
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      {timetableLoading && <div className="text-sm text-muted-foreground">Loading timetable…</div>}
                      {!timetableLoading &&
                        timetable.map((slot) => (
                          <div key={slot.id} className="rounded-lg border border-border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium">
                                  {titleCase(slot.day_of_week)} · {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {slot.class_name} / {slot.section_name} · {slot.subject_name}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {slot.branch_name}
                                  {slot.room_no ? ` · Room ${slot.room_no}` : ""}
                                  {slot.academic_year_label ? ` · ${slot.academic_year_label}` : ""}
                                </div>
                              </div>
                              {canManage && (
                                <div className="inline-flex gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openTimetableModal(slot)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteSlotId(slot.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            {slot.session_id && (
                              <div className="mt-3">
                                <Badge variant={slot.session_status === "closed" ? "secondary" : "default"}>
                                  Attendance {slot.session_status}
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))}

                      {!timetableLoading && timetable.length === 0 && (
                        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                          No timetable assigned yet.
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <FormModal
        open={teacherModalOpen}
        onOpenChange={setTeacherModalOpen}
        title="Create Teacher Profile"
        description="Attach an existing teacher-role user to the teacher module."
        onSubmit={createTeacherProfile}
        submitLabel="Create Profile"
      >
        <div className="space-y-4">
          <FieldLabel label="Teacher User">
            <Select value={teacherForm.user_id} onValueChange={(value) => setTeacherForm((prev) => ({ ...prev, user_id: value }))}>
              <SelectTrigger><SelectValue placeholder="Select teacher user" /></SelectTrigger>
              <SelectContent>
                {candidates.map((item) => (
                  <SelectItem key={item.user_id} value={item.user_id}>
                    {item.full_name} · {item.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldLabel>
          <FieldLabel label="Employee Code">
            <Input value={teacherForm.employee_code} onChange={(e) => setTeacherForm((prev) => ({ ...prev, employee_code: e.target.value }))} />
          </FieldLabel>
          <FieldLabel label="Designation">
            <Input value={teacherForm.designation} onChange={(e) => setTeacherForm((prev) => ({ ...prev, designation: e.target.value }))} />
          </FieldLabel>
          <FieldLabel label="Joined Date">
            <Input type="date" value={teacherForm.joined_at} onChange={(e) => setTeacherForm((prev) => ({ ...prev, joined_at: e.target.value }))} />
          </FieldLabel>
          {candidates.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              No teacher-role users are waiting for a teacher profile. Create a user with the teacher role first.
            </div>
          )}
        </div>
      </FormModal>

      <FormModal
        open={classModalOpen}
        onOpenChange={setClassModalOpen}
        title="Link Class"
        description="Give this teacher ownership of a class before building timetable slots."
        onSubmit={linkClass}
        submitLabel="Link Class"
      >
        <div className="space-y-4">
          {courses.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              No courses available for your login. Ensure courses exist and your role has course/branch/class read-manage permissions.
            </div>
          )}
          <FieldLabel label="Course">
            <Select value={classForm.course_id} onValueChange={(value) => setClassForm((prev) => ({ ...prev, course_id: value }))}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {courses.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldLabel>
          <FieldLabel label="Branch">
            <Select value={classForm.branch_id} onValueChange={(value) => setClassForm((prev) => ({ ...prev, branch_id: value }))} disabled={!classForm.course_id}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {branches.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldLabel>
          <FieldLabel label="Class">
            <Select value={classForm.class_id} onValueChange={(value) => setClassForm((prev) => ({ ...prev, class_id: value }))} disabled={!classForm.branch_id}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldLabel>
        </div>
      </FormModal>

      <FormModal
        open={timetableModalOpen}
        onOpenChange={setTimetableModalOpen}
        title={timetableForm.id ? "Edit Timetable Slot" : "Add Timetable Slot"}
        description="This slot becomes the source of truth for teacher-owned attendance."
        onSubmit={saveTimetable}
        submitLabel={timetableForm.id ? "Save Slot" : "Create Slot"}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label="Academic Year">
            <Select value={timetableForm.academic_year_id} onValueChange={(value) => setTimetableForm((prev) => ({ ...prev, academic_year_id: value }))}>
              <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
              <SelectContent>
                {years.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldLabel>
          <FieldLabel label="Class">
            <Select value={timetableForm.class_id} onValueChange={(value) => setTimetableForm((prev) => ({ ...prev, class_id: value }))}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {(selectedTeacher?.assigned_classes || []).map((item) => (
                  <SelectItem key={item.class_id} value={item.class_id}>
                    {item.class_name} · {item.branch_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldLabel>
          <FieldLabel label="Section">
            <Select value={timetableForm.section_id} onValueChange={(value) => setTimetableForm((prev) => ({ ...prev, section_id: value }))} disabled={!timetableForm.class_id}>
              <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
              <SelectContent>
                {sections.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldLabel>
          <FieldLabel label="Subject">
            <Select value={timetableForm.subject_id} onValueChange={(value) => setTimetableForm((prev) => ({ ...prev, subject_id: value }))} disabled={!timetableForm.class_id}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldLabel>
          <FieldLabel label="Day">
            <Select value={timetableForm.day_of_week} onValueChange={(value) => setTimetableForm((prev) => ({ ...prev, day_of_week: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {dayOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldLabel>
          <FieldLabel label="Room">
            <Input value={timetableForm.room_no} onChange={(e) => setTimetableForm((prev) => ({ ...prev, room_no: e.target.value }))} />
          </FieldLabel>
          <FieldLabel label="Start Time">
            <Input type="time" value={timetableForm.start_time} onChange={(e) => setTimetableForm((prev) => ({ ...prev, start_time: e.target.value }))} />
          </FieldLabel>
          <FieldLabel label="End Time">
            <Input type="time" value={timetableForm.end_time} onChange={(e) => setTimetableForm((prev) => ({ ...prev, end_time: e.target.value }))} />
          </FieldLabel>
        </div>
      </FormModal>

      <ConfirmDialog
        open={!!deleteClassId}
        onOpenChange={(value) => !value && setDeleteClassId(null)}
        title="Unlink class?"
        description="This will remove the class from the teacher. Delete timetable rows for that class first."
        confirmLabel="Unlink"
        destructive
        onConfirm={unlinkClass}
      />

      <ConfirmDialog
        open={!!deleteSlotId}
        onOpenChange={(value) => !value && setDeleteSlotId(null)}
        title="Delete timetable slot?"
        description="Attendance sessions already created for this slot must be cleared before deletion."
        confirmLabel="Delete"
        destructive
        onConfirm={removeTimetable}
      />
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{label}</div>
      {children}
    </div>
  );
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm ${mono ? "font-mono" : "font-medium"}`}>{value}</div>
    </div>
  );
}
